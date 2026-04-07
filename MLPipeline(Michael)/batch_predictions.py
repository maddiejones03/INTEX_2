"""
batch_predictions.py — Early Warning Batch Pipeline

Reads resident data from the database, computes cooperation trajectories,
risk alerts, and early warning scores using the trained model, then writes
results back to 3 new tables.

Usage:
    # Against SQL Server (production — uses same connection as .NET app):
    DB_CONNECTION_STRING="Server=...;Database=...;..." python batch_predictions.py

    # Against local SQLite (testing):
    python batch_predictions.py --sqlite cleaned/lighthouse.db

    # With a custom model path:
    python batch_predictions.py --sqlite cleaned/lighthouse.db --model cleaned/early_warning_model.pkl
"""

import argparse
import os
from datetime import datetime, timedelta, timezone, UTC
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy import stats

COOPERATION_MAP = {
    "Uncooperative": 1, "Neutral": 2, "Cooperative": 3, "Highly Cooperative": 4,
}
VISIT_OUTCOME_MAP = {"Unfavorable": 1, "Needs Improvement": 2, "Favorable": 3}
POSITIVE_STATES = {"Calm", "Hopeful", "Happy"}
NEGATIVE_STATES = {"Angry", "Sad", "Anxious", "Withdrawn", "Distressed"}
RISK_MAP = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}

MODEL_FEATURE_COLS = [
    "cooperation_slope", "cooperation_mean",
    "health_slope", "health_mean",
    "session_count_mean", "pct_concerns_mean", "pct_emotional_imp_mean",
    "attendance_mean", "pct_safety_mean",
    "incident_total", "initial_risk_numeric",
]


def get_engine(args):
    """Create a SQLAlchemy engine from CLI args or environment."""
    from sqlalchemy import create_engine

    if args.sqlite:
        return create_engine(f"sqlite:///{args.sqlite}")

    conn_str = os.environ.get("DB_CONNECTION_STRING")
    if not conn_str:
        raise ValueError(
            "Set DB_CONNECTION_STRING env var or use --sqlite for local testing."
        )
    # .NET-style connection string → SQLAlchemy pyodbc URL
    sa_url = f"mssql+pyodbc:///?odbc_connect={conn_str}"
    return create_engine(sa_url)


def load_tables(engine) -> dict[str, pd.DataFrame]:
    """Read the source tables needed for predictions."""
    tables = {}
    queries = {
        "residents": "SELECT resident_id, safehouse_id, current_risk_level, "
                     "initial_risk_level, case_status FROM residents",
        "home_visitations": "SELECT visitation_id, resident_id, visit_date, "
                           "family_cooperation_level, safety_concerns_noted, "
                           "visit_outcome FROM home_visitations",
        "health_records": "SELECT health_record_id, resident_id, record_date, "
                         "general_health_score FROM health_wellbeing_records",
        "process_recordings": "SELECT recording_id, resident_id, session_date, "
                             "concerns_flagged, emotional_state_observed, "
                             "emotional_state_end FROM process_recordings",
        "education_records": "SELECT education_record_id, resident_id, record_date, "
                            "attendance_rate FROM education_records",
        "incident_reports": "SELECT incident_id, resident_id, incident_date, "
                           "severity FROM incident_reports",
    }
    for name, query in queries.items():
        tables[name] = pd.read_sql(query, engine)
        print(f"  Loaded {name}: {tables[name].shape}")
    return tables


def ols_slope(values: np.ndarray) -> float:
    if len(values) < 3:
        return 0.0
    x = np.arange(len(values), dtype=float)
    return stats.linregress(x, values.astype(float)).slope


def compute_cooperation_trajectories(
    residents: pd.DataFrame, visits: pd.DataFrame
) -> pd.DataFrame:
    """Table 1: one row per resident with cooperation trend metrics."""
    vis = visits.copy()
    vis["visit_date"] = pd.to_datetime(vis["visit_date"])
    vis["cooperation_numeric"] = vis["family_cooperation_level"].map(COOPERATION_MAP)
    vis["outcome_numeric"] = vis["visit_outcome"].map(VISIT_OUTCOME_MAP)
    vis["safety_flag"] = vis["safety_concerns_noted"].astype(bool).astype(int)
    vis["month"] = vis["visit_date"].dt.to_period("M")
    vis = vis.sort_values(["resident_id", "visit_date"])

    rows = []
    for rid in residents["resident_id"].unique():
        rv = vis[vis["resident_id"] == rid]
        if rv.empty:
            rows.append({
                "resident_id": rid,
                "current_cooperation_score": None,
                "cooperation_slope_3m": 0.0,
                "cooperation_slope_all": 0.0,
                "trend_direction": "Stable",
                "total_visits": 0,
                "pct_favorable_outcomes": 0.0,
                "pct_safety_concerns": 0.0,
                "computed_at": datetime.now(UTC).replace(tzinfo=None),
            })
            continue

        monthly = rv.groupby("month").agg(
            coop_mean=("cooperation_numeric", "mean"),
        ).sort_index()
        coop_values = monthly["coop_mean"].values

        slope_all = ols_slope(coop_values)
        slope_3m = ols_slope(coop_values[-3:]) if len(coop_values) >= 3 else slope_all

        if slope_3m > 0.05:
            direction = "Improving"
        elif slope_3m < -0.05:
            direction = "Declining"
        else:
            direction = "Stable"

        fav_count = (rv["outcome_numeric"] == 3).sum()
        total = len(rv)

        rows.append({
            "resident_id": rid,
            "current_cooperation_score": float(coop_values[-1]),
            "cooperation_slope_3m": float(slope_3m),
            "cooperation_slope_all": float(slope_all),
            "trend_direction": direction,
            "total_visits": total,
            "pct_favorable_outcomes": float(fav_count / total) if total > 0 else 0.0,
            "pct_safety_concerns": float(rv["safety_flag"].mean()),
            "computed_at": datetime.now(UTC).replace(tzinfo=None),
        })

    return pd.DataFrame(rows)


def compute_risk_alerts(
    residents: pd.DataFrame,
    trajectories: pd.DataFrame,
    health: pd.DataFrame,
    sessions: pd.DataFrame,
    incidents: pd.DataFrame,
) -> pd.DataFrame:
    """Table 2: one row per triggered alert."""
    now = datetime.now(UTC)
    now_naive = now.replace(tzinfo=None)  # for comparing with tz-naive pandas dates
    alerts = []

    health = health.copy()
    health["record_date"] = pd.to_datetime(health["record_date"])
    health = health.sort_values(["resident_id", "record_date"])

    sessions = sessions.copy()
    sessions["session_date"] = pd.to_datetime(sessions["session_date"])
    sessions = sessions.sort_values(["resident_id", "session_date"])

    incidents = incidents.copy()
    incidents["incident_date"] = pd.to_datetime(incidents["incident_date"])

    for _, res in residents.iterrows():
        rid = res["resident_id"]
        risk = res["current_risk_level"]

        # Rule 1: CooperationDecline
        traj = trajectories[trajectories["resident_id"] == rid]
        if not traj.empty:
            slope_3m = traj.iloc[0]["cooperation_slope_3m"]
            if slope_3m < -0.1 and risk in ("High", "Critical"):
                alerts.append({
                    "resident_id": rid,
                    "alert_type": "CooperationDecline",
                    "severity": "High",
                    "detail": f"Cooperation declining (slope={slope_3m:.2f}) "
                              f"with {risk} risk level",
                    "current_risk_level": risk,
                    "computed_at": now,
                })

        # Rule 2: HealthDecline
        rh = health[health["resident_id"] == rid]
        if len(rh) >= 3:
            recent = rh.tail(3)["general_health_score"].dropna().values
            if len(recent) >= 3:
                h_slope = ols_slope(recent)
                if h_slope < -0.05:
                    sev = "High" if h_slope < -0.15 else "Medium"
                    alerts.append({
                        "resident_id": rid,
                        "alert_type": "HealthDecline",
                        "severity": sev,
                        "detail": f"Health score declining over last 3 months "
                                  f"(slope={h_slope:.3f})",
                        "current_risk_level": risk,
                        "computed_at": now,
                    })

        # Rule 3: HighConcerns
        rs = sessions[sessions["resident_id"] == rid]
        if not rs.empty:
            rs_recent_month = rs[
                rs["session_date"] >= rs["session_date"].max() - pd.Timedelta(days=31)
            ]
            if len(rs_recent_month) > 0:
                pct = rs_recent_month["concerns_flagged"].astype(bool).mean()
                if pct > 0.5:
                    alerts.append({
                        "resident_id": rid,
                        "alert_type": "HighConcerns",
                        "severity": "Medium",
                        "detail": f"{pct:.0%} of sessions in most recent month "
                                  f"had concerns flagged",
                        "current_risk_level": risk,
                        "computed_at": now,
                    })

        # Rule 4: RecentIncident
        ri = incidents[incidents["resident_id"] == rid]
        if not ri.empty:
            cutoff = now_naive - timedelta(days=60)
            recent_inc = ri[
                (ri["incident_date"] >= cutoff)
                & (ri["severity"].isin(["Medium", "High"]))
            ]
            if len(recent_inc) > 0:
                max_sev = "High" if "High" in recent_inc["severity"].values else "Medium"
                alerts.append({
                    "resident_id": rid,
                    "alert_type": "RecentIncident",
                    "severity": max_sev,
                    "detail": f"{len(recent_inc)} incident(s) with severity >= Medium "
                              f"in last 60 days",
                    "current_risk_level": risk,
                    "computed_at": now,
                })

    result = pd.DataFrame(alerts)
    if not result.empty:
        result.insert(0, "alert_id", range(1, len(result) + 1))
    return result


def compute_early_warning_scores(
    residents: pd.DataFrame,
    visits: pd.DataFrame,
    health: pd.DataFrame,
    sessions: pd.DataFrame,
    education: pd.DataFrame,
    incidents: pd.DataFrame,
    model_path: Path,
) -> pd.DataFrame:
    """Table 3: one row per resident with model-predicted risk probability."""
    artifact = joblib.load(model_path)
    pipeline = artifact["model"]
    model_name = artifact["model_name"]
    feature_cols = artifact["feature_cols"]

    # Extract global feature importances from the fitted estimator
    estimator = pipeline.named_steps.get(
        "gradientboostingclassifier",
        pipeline.named_steps.get("xgbclassifier", pipeline[-1]),
    )
    global_importances = getattr(estimator, "feature_importances_", np.ones(len(feature_cols)))
    feat_importance_ranked = sorted(
        zip(feature_cols, global_importances), key=lambda x: x[1], reverse=True
    )

    vis = visits.copy()
    vis["visit_date"] = pd.to_datetime(vis["visit_date"])
    vis["cooperation_numeric"] = vis["family_cooperation_level"].map(COOPERATION_MAP)
    vis["safety_flag"] = vis["safety_concerns_noted"].astype(bool).astype(int)
    vis["month"] = vis["visit_date"].dt.to_period("M")
    vis = vis.sort_values(["resident_id", "visit_date"])

    hlth = health.copy()
    hlth["record_date"] = pd.to_datetime(hlth["record_date"])
    hlth = hlth.sort_values(["resident_id", "record_date"])

    sess = sessions.copy()
    sess["session_date"] = pd.to_datetime(sess["session_date"])
    sess["concerns_flag"] = sess["concerns_flagged"].astype(bool).astype(int)
    start_valence = sess["emotional_state_observed"].apply(
        lambda x: "negative" if x in NEGATIVE_STATES else (
            "positive" if x in POSITIVE_STATES else "neutral"
        )
    )
    end_valence = sess["emotional_state_end"].apply(
        lambda x: "positive" if x in POSITIVE_STATES else (
            "negative" if x in NEGATIVE_STATES else "neutral"
        )
    )
    sess["emotional_improvement"] = (
        (start_valence == "negative") & (end_valence == "positive")
    ).astype(int)
    sess["month"] = sess["session_date"].dt.to_period("M")
    sess = sess.sort_values(["resident_id", "session_date"])

    edu = education.copy()
    edu["record_date"] = pd.to_datetime(edu["record_date"])
    edu = edu.sort_values(["resident_id", "record_date"])

    inc = incidents.copy()
    inc["incident_date"] = pd.to_datetime(inc["incident_date"])

    rows = []
    for _, res in residents.iterrows():
        rid = res["resident_id"]
        risk_numeric = RISK_MAP.get(res.get("initial_risk_level", "Medium"), 2)

        # Cooperation features
        rv = vis[vis["resident_id"] == rid]
        if not rv.empty:
            monthly_coop = rv.groupby("month")["cooperation_numeric"].mean().values
            coop_slope = ols_slope(monthly_coop)
            coop_mean = float(monthly_coop.mean())
            safety_mean = float(rv["safety_flag"].mean())
        else:
            coop_slope, coop_mean, safety_mean = 0.0, 0.0, 0.0

        # Health features
        rh = hlth[hlth["resident_id"] == rid]["general_health_score"].dropna().values
        health_slope_val = ols_slope(rh) if len(rh) >= 3 else 0.0
        health_mean_val = float(rh.mean()) if len(rh) > 0 else 0.0

        # Session features
        rs = sess[sess["resident_id"] == rid]
        if not rs.empty:
            monthly_sess = rs.groupby("month").size()
            sess_count_mean = float(monthly_sess.mean())
            concerns_mean = float(rs["concerns_flag"].mean())
            emotional_imp_mean = float(rs["emotional_improvement"].mean())
        else:
            sess_count_mean, concerns_mean, emotional_imp_mean = 0.0, 0.0, 0.0

        # Education features
        re = edu[edu["resident_id"] == rid]["attendance_rate"].dropna()
        attendance_mean_val = float(re.mean()) if len(re) > 0 else 0.0

        # Incident features
        ri_count = len(inc[inc["resident_id"] == rid])

        feature_vector = np.array([[
            coop_slope, coop_mean,
            health_slope_val, health_mean_val,
            sess_count_mean, concerns_mean, emotional_imp_mean,
            attendance_mean_val, safety_mean,
            ri_count, risk_numeric,
        ]])

        prob = pipeline.predict_proba(feature_vector)[0][1]

        if prob >= 0.75:
            category = "Critical"
        elif prob >= 0.50:
            category = "High"
        elif prob >= 0.25:
            category = "Moderate"
        else:
            category = "Low"

        # Top risk factors: use global feature importances weighted by
        # scaled deviation from zero (the direction that indicates risk)
        scaled = pipeline.named_steps["standardscaler"].transform(feature_vector)[0]
        contributions = {
            name: imp * abs(scaled[i])
            for i, (name, imp) in enumerate(zip(feature_cols, global_importances))
        }
        sorted_factors = sorted(contributions.items(), key=lambda x: x[1], reverse=True)

        rows.append({
            "resident_id": rid,
            "risk_regression_probability": float(prob),
            "risk_category": category,
            "top_risk_factor_1": sorted_factors[0][0] if len(sorted_factors) > 0 else "",
            "top_risk_factor_2": sorted_factors[1][0] if len(sorted_factors) > 1 else "",
            "top_risk_factor_3": sorted_factors[2][0] if len(sorted_factors) > 2 else "",
            "model_name": model_name,
            "computed_at": datetime.now(UTC).replace(tzinfo=None),
        })

    return pd.DataFrame(rows)


def write_tables(engine, cooperation: pd.DataFrame, alerts: pd.DataFrame,
                 scores: pd.DataFrame) -> None:
    """Write output tables to the database, replacing any existing data."""
    cooperation.to_sql("cooperation_trajectories", engine, if_exists="replace", index=False)
    print(f"  cooperation_trajectories: {len(cooperation)} rows written")

    alerts.to_sql("risk_alerts", engine, if_exists="replace", index=False)
    print(f"  risk_alerts: {len(alerts)} rows written")

    scores.to_sql("early_warning_scores", engine, if_exists="replace", index=False)
    print(f"  early_warning_scores: {len(scores)} rows written")


def run(args) -> None:
    print("=" * 60)
    print("EARLY WARNING BATCH PIPELINE")
    print("=" * 60)

    model_path = Path(args.model)
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model not found at {model_path}. "
            "Run q2c_early_warning_model.ipynb first to train and export."
        )

    print("\n[1/5] Connecting to database...")
    engine = get_engine(args)

    print("\n[2/5] Loading source tables...")
    tables = load_tables(engine)

    print("\n[3/5] Computing cooperation trajectories...")
    trajectories = compute_cooperation_trajectories(
        tables["residents"], tables["home_visitations"]
    )
    declining = (trajectories["trend_direction"] == "Declining").sum()
    print(f"  {len(trajectories)} residents processed, {declining} declining")

    print("\n[4/5] Computing risk alerts...")
    alerts = compute_risk_alerts(
        tables["residents"], trajectories,
        tables["health_records"], tables["process_recordings"],
        tables["incident_reports"],
    )
    if not alerts.empty:
        severity_counts = alerts["severity"].value_counts().to_dict()
        print(f"  {len(alerts)} alerts generated: {severity_counts}")
    else:
        print("  0 alerts generated")

    print("\n[5/5] Computing early warning scores...")
    scores = compute_early_warning_scores(
        tables["residents"], tables["home_visitations"],
        tables["health_records"], tables["process_recordings"],
        tables["education_records"], tables["incident_reports"],
        model_path,
    )
    cat_counts = scores["risk_category"].value_counts().to_dict()
    print(f"  {len(scores)} scores computed: {cat_counts}")

    print("\nWriting results to database...")
    write_tables(engine, trajectories, alerts, scores)

    print("\nDone.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Early Warning Batch Pipeline")
    parser.add_argument(
        "--sqlite", type=str, default=None,
        help="Path to SQLite database (for local testing instead of SQL Server)"
    )
    parser.add_argument(
        "--model", type=str, default="cleaned/early_warning_model.pkl",
        help="Path to the trained model .pkl file"
    )
    args = parser.parse_args()
    run(args)
