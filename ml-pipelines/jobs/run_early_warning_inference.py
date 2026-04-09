"""
run_early_warning_inference.py — Pipeline 3: Resident Early Warning
Loads the trained early_warning_model.pkl, re-engineers features from live
Azure SQL data, computes cooperation trajectories + risk alerts + ML scores,
and writes results to resident_early_warning and risk_alerts tables.

This is what the C# API reads from. The app never touches ML code —
it just queries these tables like any other table.

Chapter 17 pattern:
    load model → load live data → feature engineering → predict → write to DB

Run after training is complete:
    cd ml-pipelines/jobs
    python run_early_warning_inference.py
"""

import joblib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

from config import EARLY_WARNING_MODEL_PATH
from utils_db import azure_sql_conn, read_query

# ── Constants ─────────────────────────────────────────────────────────────────
COOPERATION_MAP    = {"Uncooperative": 1, "Neutral": 2, "Cooperative": 3, "Highly Cooperative": 4}
VISIT_OUTCOME_MAP  = {"Unfavorable": 1, "Needs Improvement": 2, "Favorable": 3}
POSITIVE_STATES    = {"Calm", "Hopeful", "Happy"}
NEGATIVE_STATES    = {"Angry", "Sad", "Anxious", "Withdrawn", "Distressed"}
RISK_MAP           = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
SEVERITY_MAP       = {"Low": 1, "Medium": 2, "High": 3}

RESIDENT_EW_TABLE  = "resident_early_warning"
RISK_ALERTS_TABLE  = "risk_alerts"


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Load trained model
# ─────────────────────────────────────────────────────────────────────────────

def load_model():
    if not EARLY_WARNING_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found at {EARLY_WARNING_MODEL_PATH}. "
            "Run q2c_early_warning_model.ipynb first."
        )
    artifact = joblib.load(EARLY_WARNING_MODEL_PATH)
    print(f"[EW] Loaded model: {artifact['model_name']} (CV AUC: {artifact['cv_roc_auc']:.3f})")
    return artifact


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Load live data from Azure SQL
# ─────────────────────────────────────────────────────────────────────────────

def load_live_data() -> dict[str, pd.DataFrame]:
    print("[EW] Loading live data from Azure SQL...")
    tables = {}

    tables["residents"] = read_query(
        "SELECT resident_id, safehouse_id, current_risk_level, initial_risk_level, "
        "case_status FROM residents"
    )
    tables["home_visitations"] = read_query(
        "SELECT visitation_id, resident_id, visit_date, family_cooperation_level, "
        "safety_concerns_noted, visit_outcome FROM home_visitations"
    )
    tables["health_records"] = read_query(
        "SELECT health_record_id, resident_id, record_date, general_health_score "
        "FROM health_wellbeing_records"
    )
    tables["process_recordings"] = read_query(
        "SELECT recording_id, resident_id, session_date, concerns_flagged, "
        "emotional_state_observed, emotional_state_end FROM process_recordings"
    )
    tables["education_records"] = read_query(
        "SELECT education_record_id, resident_id, record_date, attendance_rate "
        "FROM education_records"
    )
    tables["incident_reports"] = read_query(
        "SELECT incident_id, resident_id, incident_date, severity FROM incident_reports"
    )

    for name, df in tables.items():
        print(f"  {name}: {len(df)} rows")

    return tables


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Feature engineering
# ─────────────────────────────────────────────────────────────────────────────

def ols_slope(values: np.ndarray) -> float:
    if len(values) < 3:
        return 0.0
    x = np.arange(len(values), dtype=float)
    return stats.linregress(x, values.astype(float)).slope


def compute_cooperation_trajectories(residents, visits) -> pd.DataFrame:
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
                "resident_id": rid, "current_cooperation_score": None,
                "cooperation_slope_3m": 0.0, "cooperation_slope_all": 0.0,
                "trend_direction": "Stable", "total_visits": 0,
                "pct_favorable_outcomes": 0.0, "pct_safety_concerns": 0.0,
            })
            continue

        monthly = rv.groupby("month").agg(coop_mean=("cooperation_numeric", "mean")).sort_index()
        coop_values = monthly["coop_mean"].values
        slope_all = ols_slope(coop_values)
        slope_3m  = ols_slope(coop_values[-3:]) if len(coop_values) >= 3 else slope_all

        direction = "Improving" if slope_3m > 0.05 else ("Declining" if slope_3m < -0.05 else "Stable")
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
        })

    return pd.DataFrame(rows)


def compute_risk_alerts(residents, trajectories, health, sessions, incidents) -> pd.DataFrame:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    alerts = []

    health = health.copy()
    health["record_date"] = pd.to_datetime(health["record_date"])
    health = health.sort_values(["resident_id", "record_date"])

    sessions = sessions.copy()
    sessions["session_date"] = pd.to_datetime(sessions["session_date"])

    incidents = incidents.copy()
    incidents["incident_date"] = pd.to_datetime(incidents["incident_date"])

    for _, res in residents.iterrows():
        rid  = res["resident_id"]
        risk = res["current_risk_level"]

        # CooperationDecline
        traj = trajectories[trajectories["resident_id"] == rid]
        if not traj.empty:
            slope_3m = traj.iloc[0]["cooperation_slope_3m"]
            if slope_3m < -0.1 and risk in ("High", "Critical"):
                alerts.append({
                    "resident_id": rid, "alert_type": "CooperationDecline",
                    "severity": "High",
                    "detail": f"Cooperation declining (slope={slope_3m:.2f}) with {risk} risk level",
                    "current_risk_level": risk, "computed_at": now,
                })

        # HealthDecline
        rh = health[health["resident_id"] == rid]
        if len(rh) >= 3:
            recent = rh.tail(3)["general_health_score"].dropna().values
            if len(recent) >= 3:
                h_slope = ols_slope(recent)
                if h_slope < -0.05:
                    alerts.append({
                        "resident_id": rid, "alert_type": "HealthDecline",
                        "severity": "High" if h_slope < -0.15 else "Medium",
                        "detail": f"Health score declining over last 3 months (slope={h_slope:.3f})",
                        "current_risk_level": risk, "computed_at": now,
                    })

        # HighConcerns
        rs = sessions[sessions["resident_id"] == rid]
        if not rs.empty:
            rs_recent = rs[rs["session_date"] >= rs["session_date"].max() - pd.Timedelta(days=31)]
            if len(rs_recent) > 0:
                pct = rs_recent["concerns_flagged"].astype(bool).mean()
                if pct > 0.5:
                    alerts.append({
                        "resident_id": rid, "alert_type": "HighConcerns",
                        "severity": "Medium",
                        "detail": f"{pct:.0%} of sessions in most recent month had concerns flagged",
                        "current_risk_level": risk, "computed_at": now,
                    })

        # RecentIncident
        ri = incidents[incidents["resident_id"] == rid]
        if not ri.empty:
            cutoff = now - timedelta(days=60)
            recent_inc = ri[
                (ri["incident_date"] >= cutoff) &
                (ri["severity"].isin(["Medium", "High"]))
            ]
            if len(recent_inc) > 0:
                alerts.append({
                    "resident_id": rid, "alert_type": "RecentIncident",
                    "severity": "High" if "High" in recent_inc["severity"].values else "Medium",
                    "detail": f"{len(recent_inc)} incident(s) with severity >= Medium in last 60 days",
                    "current_risk_level": risk, "computed_at": now,
                })

    result = pd.DataFrame(alerts)
    if not result.empty:
        result.insert(0, "alert_id", range(1, len(result) + 1))
    return result


def compute_ml_scores(residents, visits, health, sessions, education, incidents, artifact) -> pd.DataFrame:
    pipeline    = artifact["model"]
    model_name  = artifact["model_name"]
    feature_cols = artifact["feature_cols"]

    estimator = pipeline.named_steps.get(
        "gradientboostingclassifier",
        pipeline.named_steps.get("xgbclassifier", pipeline[-1]),
    )
    global_importances = getattr(estimator, "feature_importances_", np.ones(len(feature_cols)))

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
    start_val = sess["emotional_state_observed"].apply(
        lambda x: "negative" if x in NEGATIVE_STATES else ("positive" if x in POSITIVE_STATES else "neutral")
    )
    end_val = sess["emotional_state_end"].apply(
        lambda x: "positive" if x in POSITIVE_STATES else ("negative" if x in NEGATIVE_STATES else "neutral")
    )
    sess["emotional_improvement"] = ((start_val == "negative") & (end_val == "positive")).astype(int)
    sess["month"] = sess["session_date"].dt.to_period("M")

    edu = education.copy()
    edu["record_date"] = pd.to_datetime(edu["record_date"])

    inc = incidents.copy()
    inc["incident_date"] = pd.to_datetime(inc["incident_date"])

    rows = []
    for _, res in residents.iterrows():
        rid          = res["resident_id"]
        risk_numeric = RISK_MAP.get(res.get("initial_risk_level", "Medium"), 2)

        rv = vis[vis["resident_id"] == rid]
        if not rv.empty:
            monthly_coop = rv.groupby("month")["cooperation_numeric"].mean().values
            coop_slope   = ols_slope(monthly_coop)
            coop_mean    = float(monthly_coop.mean())
            safety_mean  = float(rv["safety_flag"].mean())
        else:
            coop_slope = coop_mean = safety_mean = 0.0

        rh = hlth[hlth["resident_id"] == rid]["general_health_score"].dropna().values
        health_slope = ols_slope(rh) if len(rh) >= 3 else 0.0
        health_mean  = float(rh.mean()) if len(rh) > 0 else 0.0

        rs = sess[sess["resident_id"] == rid]
        if not rs.empty:
            sess_count_mean    = float(rs.groupby("month").size().mean())
            concerns_mean      = float(rs["concerns_flag"].mean())
            emotional_imp_mean = float(rs["emotional_improvement"].mean())
        else:
            sess_count_mean = concerns_mean = emotional_imp_mean = 0.0

        re = edu[edu["resident_id"] == rid]["attendance_rate"].dropna()
        attendance_mean = float(re.mean()) if len(re) > 0 else 0.0
        ri_count = len(inc[inc["resident_id"] == rid])

        feature_vector = np.array([[
            coop_slope, coop_mean, health_slope, health_mean,
            sess_count_mean, concerns_mean, emotional_imp_mean,
            attendance_mean, safety_mean, ri_count, risk_numeric,
        ]])

        prob = pipeline.predict_proba(feature_vector)[0][1]
        category = (
            "Critical" if prob >= 0.75 else
            "High"     if prob >= 0.50 else
            "Moderate" if prob >= 0.25 else "Low"
        )

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
        })

    return pd.DataFrame(rows)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Write to Azure SQL via MERGE upsert
# ─────────────────────────────────────────────────────────────────────────────

def write_resident_early_warning(df: pd.DataFrame) -> None:
    with azure_sql_conn() as conn:
        cursor = conn.cursor()
        cursor.execute(f"""
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = '{RESIDENT_EW_TABLE}'
            )
            BEGIN
                CREATE TABLE [{RESIDENT_EW_TABLE}] (
                    resident_id                   INT PRIMARY KEY,
                    trend_direction               NVARCHAR(20),
                    cooperation_slope_3m          FLOAT,
                    cooperation_slope_all         FLOAT,
                    current_cooperation_score     FLOAT,
                    total_visits                  INT,
                    pct_favorable_outcomes        FLOAT,
                    pct_safety_concerns           FLOAT,
                    risk_regression_probability   FLOAT,
                    risk_category                 NVARCHAR(20),
                    top_risk_factor_1             NVARCHAR(100),
                    top_risk_factor_2             NVARCHAR(100),
                    top_risk_factor_3             NVARCHAR(100),
                    model_name                    NVARCHAR(100),
                    computed_at                   DATETIME2
                )
            END
        """)
        conn.commit()

        merge_sql = f"""
            MERGE [{RESIDENT_EW_TABLE}] AS target
            USING (VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)) AS source (
                resident_id, trend_direction, cooperation_slope_3m, cooperation_slope_all,
                current_cooperation_score, total_visits, pct_favorable_outcomes,
                pct_safety_concerns, risk_regression_probability, risk_category,
                top_risk_factor_1, top_risk_factor_2, top_risk_factor_3,
                model_name, computed_at
            )
            ON target.resident_id = source.resident_id
            WHEN MATCHED THEN UPDATE SET
                trend_direction             = source.trend_direction,
                cooperation_slope_3m        = source.cooperation_slope_3m,
                cooperation_slope_all       = source.cooperation_slope_all,
                current_cooperation_score   = source.current_cooperation_score,
                total_visits                = source.total_visits,
                pct_favorable_outcomes      = source.pct_favorable_outcomes,
                pct_safety_concerns         = source.pct_safety_concerns,
                risk_regression_probability = source.risk_regression_probability,
                risk_category               = source.risk_category,
                top_risk_factor_1           = source.top_risk_factor_1,
                top_risk_factor_2           = source.top_risk_factor_2,
                top_risk_factor_3           = source.top_risk_factor_3,
                model_name                  = source.model_name,
                computed_at                 = source.computed_at
            WHEN NOT MATCHED THEN INSERT (
                resident_id, trend_direction, cooperation_slope_3m, cooperation_slope_all,
                current_cooperation_score, total_visits, pct_favorable_outcomes,
                pct_safety_concerns, risk_regression_probability, risk_category,
                top_risk_factor_1, top_risk_factor_2, top_risk_factor_3,
                model_name, computed_at
            ) VALUES (
                source.resident_id, source.trend_direction, source.cooperation_slope_3m,
                source.cooperation_slope_all, source.current_cooperation_score,
                source.total_visits, source.pct_favorable_outcomes, source.pct_safety_concerns,
                source.risk_regression_probability, source.risk_category,
                source.top_risk_factor_1, source.top_risk_factor_2, source.top_risk_factor_3,
                source.model_name, source.computed_at
            );
        """

        def _f(v):
            """Convert NaN/None floats to None for SQL."""
            if v is None:
                return None
            try:
                return None if (isinstance(v, float) and np.isnan(v)) else v
            except Exception:
                return v

        now = datetime.utcnow().isoformat()
        rows = [
            (
                int(r.resident_id),
                _f(r.trend_direction), _f(r.cooperation_slope_3m), _f(r.cooperation_slope_all),
                _f(r.current_cooperation_score),
                int(r.total_visits) if _f(r.total_visits) is not None else 0,
                _f(r.pct_favorable_outcomes), _f(r.pct_safety_concerns),
                _f(r.risk_regression_probability), _f(r.risk_category),
                _f(r.top_risk_factor_1), _f(r.top_risk_factor_2), _f(r.top_risk_factor_3),
                _f(r.model_name), now,
            )
            for r in df.itertuples(index=False)
        ]
        cursor.execute(f"SET IDENTITY_INSERT [{RESIDENT_EW_TABLE}] ON")
        cursor.executemany(merge_sql, rows)
        cursor.execute(f"SET IDENTITY_INSERT [{RESIDENT_EW_TABLE}] OFF")
        conn.commit()
    print(f"[EW] {len(rows)} rows written to [{RESIDENT_EW_TABLE}].")


def write_risk_alerts(df: pd.DataFrame) -> None:
    with azure_sql_conn() as conn:
        cursor = conn.cursor()
        # Replace all alerts on each run (re-computed from scratch)
        cursor.execute(f"""
            IF EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '{RISK_ALERTS_TABLE}'
            )
            BEGIN DELETE FROM [{RISK_ALERTS_TABLE}] END
            ELSE
            BEGIN
                CREATE TABLE [{RISK_ALERTS_TABLE}] (
                    alert_id            INT IDENTITY(1,1) PRIMARY KEY,
                    resident_id         INT,
                    alert_type          NVARCHAR(50),
                    severity            NVARCHAR(20),
                    detail              NVARCHAR(500),
                    current_risk_level  NVARCHAR(20),
                    computed_at         DATETIME2
                )
            END
        """)
        conn.commit()

        if df.empty:
            print("[EW] No alerts to write.")
            return

        insert_sql = f"""
            INSERT INTO [{RISK_ALERTS_TABLE}]
                (resident_id, alert_type, severity, detail, current_risk_level, computed_at)
            VALUES (?,?,?,?,?,?)
        """
        rows = [
            (int(r.resident_id), r.alert_type, r.severity, r.detail, r.current_risk_level,
             r.computed_at.isoformat() if hasattr(r.computed_at, 'isoformat') else str(r.computed_at))
            for r in df.itertuples(index=False)
        ]
        cursor.executemany(insert_sql, rows)
        conn.commit()
    print(f"[EW] {len(rows)} alerts written to [{RISK_ALERTS_TABLE}].")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def run_inference():
    print("=" * 60)
    print("EARLY WARNING INFERENCE PIPELINE")
    print("=" * 60)

    artifact = load_model()
    tables   = load_live_data()

    print("\n[EW] Computing cooperation trajectories...")
    trajectories = compute_cooperation_trajectories(
        tables["residents"], tables["home_visitations"]
    )

    print("[EW] Computing risk alerts...")
    alerts = compute_risk_alerts(
        tables["residents"], trajectories,
        tables["health_records"], tables["process_recordings"],
        tables["incident_reports"],
    )
    print(f"     {len(alerts)} alerts generated")

    print("[EW] Computing ML risk scores...")
    scores = compute_ml_scores(
        tables["residents"], tables["home_visitations"],
        tables["health_records"], tables["process_recordings"],
        tables["education_records"], tables["incident_reports"],
        artifact,
    )

    print("[EW] Merging trajectories + scores → resident_early_warning...")
    merged = trajectories.merge(
        scores.drop(columns=[], errors="ignore"),
        on="resident_id", how="outer",
    )
    merged = merged.dropna(subset=["resident_id"])
    merged["resident_id"] = merged["resident_id"].astype(int)

    print("[EW] Writing to Azure SQL...")
    write_resident_early_warning(merged)
    write_risk_alerts(alerts)

    print("\n[EW] Complete. Tables ready for the C# API.")
    cat_counts = scores["risk_category"].value_counts().to_dict()
    print(f"     Risk categories: {cat_counts}")


if __name__ == "__main__":
    run_inference()
