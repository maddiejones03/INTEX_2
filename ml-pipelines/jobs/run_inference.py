"""
run_inference.py — Donor Risk Score Pipeline: Donor Lapse Risk
Loads the trained model.pkl, re-engineers features from live Azure SQL data,
scores all active supporters, and writes results to the donor_risk_scores table.

This is what your C# API reads from. The app never touches ML code —
it just queries donor_risk_scores like any other table.

Chapter 17 pattern:
    load model → load live data → feature engineering → predict → write to DB

Run after train_model.py:
    cd ml-pipelines/jobs
    python run_inference.py
"""

import json
import pickle
from datetime import datetime
from pathlib import Path

import pandas as pd
import numpy as np

from utils_db import azure_sql_conn, read_query

# ── Config ────────────────────────────────────────────────────────────────────
BASE_DIR        = Path(__file__).resolve().parents[1]
MODEL_PATH      = BASE_DIR / "artifacts" / "model.pkl"
PREDICTIONS_TABLE = "donor_risk_scores"
REFERENCE_DATE  = pd.Timestamp("2026-04-06")   # same as ETL and features.py

NUMERIC_FEATURES = [
    "days_since_last_donation",
    "personal_avg_gap",
    "gap_ratio",
    "gap_cv",
    "momentum",
    "distinct_campaigns_count",
    "amount_trend",
    "lifetime_value_php",
    "total_donation_count",
]

CATEGORICAL_FEATURES = [
    "acquisition_channel",
    "supporter_type",
    "relationship_type",
]


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Load trained model
# ─────────────────────────────────────────────────────────────────────────────

def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"model.pkl not found at {MODEL_PATH}. "
            "Run train_model.py first."
        )
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    print(f"[INFER] Loaded model from {MODEL_PATH}")
    return model


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Load live data from Azure SQL
# ─────────────────────────────────────────────────────────────────────────────

def load_live_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Pull live supporters and donations from operational DB."""

    print("[INFER] Loading live supporters...")
    supporters = read_query("""
        SELECT
            supporter_id,
            display_name,
            supporter_type,
            status,
            acquisition_channel,
            relationship_type
        FROM supporters
    """)

    print("[INFER] Loading live donations...")
    donations = read_query("""
        SELECT
            supporter_id,
            donation_type,
            donation_date,
            amount,
            estimated_value,
            campaign_name
        FROM donations
    """)

    donations["donation_date"] = pd.to_datetime(
        donations["donation_date"], errors="coerce"
    )

    print(f"[INFER] supporters: {len(supporters)} | donations: {len(donations)}")
    return supporters, donations


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Feature engineering
# Identical logic to features.py and etl_build_warehouse.py.
# This MUST stay in sync with training — same features, same logic.
# ─────────────────────────────────────────────────────────────────────────────

def engineer_features(
    supporters: pd.DataFrame,
    donations: pd.DataFrame
) -> pd.DataFrame:
    """Rebuild features from live data — mirrors features.py exactly."""

    donations_sorted = donations.sort_values(["supporter_id", "donation_date"])

    agg_rows = []
    for sid, grp in donations_sorted.groupby("supporter_id"):
        dates = grp["donation_date"].dropna().sort_values()

        last_date       = dates.max()
        days_since_last = (REFERENCE_DATE - last_date).days

        gaps = dates.diff().dt.days.dropna()
        if len(gaps) == 0:
            personal_avg_gap = float(days_since_last)
            gap_cv           = 0.0
        else:
            personal_avg_gap = gaps.mean()
            gap_std          = gaps.std()
            gap_cv = (gap_std / personal_avg_gap) if personal_avg_gap != 0 else 0.0
            if pd.isna(gap_cv):
                gap_cv = 0.0

        gap_ratio = (
            days_since_last / personal_avg_gap
            if personal_avg_gap != 0 else 1.0
        )

        last_90      = grp[grp["donation_date"] >= (REFERENCE_DATE - pd.Timedelta(days=90))]
        prior_90_180 = grp[
            (grp["donation_date"] >= (REFERENCE_DATE - pd.Timedelta(days=180)))
            & (grp["donation_date"] <  (REFERENCE_DATE - pd.Timedelta(days=90)))
        ]
        cnt_last90 = len(last_90)
        cnt_prior  = len(prior_90_180)
        momentum   = (cnt_last90 / cnt_prior) if cnt_prior > 0 else float(cnt_last90)

        campaigns = grp["campaign_name"].dropna().nunique()

        monetary = grp[grp["donation_type"] == "Monetary"].sort_values("donation_date")
        if len(monetary) >= 3:
            last2_mean   = monetary["amount"].iloc[-2:].mean()
            prior_mean   = monetary["amount"].iloc[:-2].mean()
            amount_trend = (last2_mean / prior_mean) if prior_mean != 0 else 1.0
        else:
            amount_trend = 1.0

        lifetime_value = grp["estimated_value"].sum()
        total_count    = len(grp)

        agg_rows.append({
            "supporter_id":             sid,
            "days_since_last_donation": days_since_last,
            "personal_avg_gap":         personal_avg_gap,
            "gap_ratio":                gap_ratio,
            "gap_cv":                   gap_cv,
            "momentum":                 momentum,
            "distinct_campaigns_count": campaigns,
            "amount_trend":             amount_trend,
            "lifetime_value_php":       lifetime_value,
            "total_donation_count":     total_count,
        })

    features = pd.DataFrame(agg_rows)

    # Merge supporter profile
    profile_cols = [
        "supporter_id", "display_name",
        "acquisition_channel", "supporter_type",
        "relationship_type", "status",
    ]
    features = features.merge(
        supporters[profile_cols], on="supporter_id", how="left"
    )

    return features


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Risk tier + reasons (mirrors score.py logic)
# ─────────────────────────────────────────────────────────────────────────────

def get_risk_tier(score: float) -> str:
    if score >= 0.65:
        return "High"
    if score >= 0.40:
        return "Medium"
    return "Low"


def get_risk_reasons(row: pd.Series) -> list[dict]:
    reasons = []

    if row["gap_ratio"] > 1.5:
        reasons.append({
            "code":      "GAP_OVERDUE",
            "label":     f"{int(row['days_since_last_donation'])} days since last gift — {row['gap_ratio']:.1f}x their usual gap",
            "direction": "increases_risk",
        })
    if row["momentum"] < 0.5:
        reasons.append({
            "code":      "LOW_MOMENTUM",
            "label":     "Donation frequency has dropped recently",
            "direction": "increases_risk",
        })
    if row["amount_trend"] < 0.8:
        reasons.append({
            "code":      "AMOUNT_DECLINING",
            "label":     "Recent gift amounts are lower than historical average",
            "direction": "increases_risk",
        })
    if row.get("acquisition_channel") in ["WordOfMouth", "Website"]:
        reasons.append({
            "code":      "CHANNEL_HIGH_RISK",
            "label":     "Acquisition channel historically shows higher lapse rate",
            "direction": "increases_risk",
        })
    if row["distinct_campaigns_count"] >= 2:
        reasons.append({
            "code":      "CAMPAIGN_ENGAGED",
            "label":     f"Has donated during {int(row['distinct_campaigns_count'])} named campaigns — shows mission alignment",
            "direction": "decreases_risk",
        })
    if row["lifetime_value_php"] > 5000:
        reasons.append({
            "code":      "HIGH_VALUE",
            "label":     f"Lifetime value ₱{row['lifetime_value_php']:.0f} — high-priority relationship",
            "direction": "decreases_risk",
        })

    return reasons


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: Score active supporters and write to Azure SQL
# ─────────────────────────────────────────────────────────────────────────────

def score_and_write(model, features: pd.DataFrame) -> None:
    """
    Score active supporters only, then write results to donor_risk_scores.
    The C# API reads this table — it never calls ML code directly.
    """

    # Only score active supporters for the watchlist
    active = features[features["status"] == "Active"].copy().reset_index(drop=True)
    print(f"[INFER] Scoring {len(active)} active supporters...")

    X_live = active[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    risk_scores = model.predict_proba(X_live)[:, 1]

    active["risk_score"]       = risk_scores
    active["risk_tier"]        = active["risk_score"].apply(get_risk_tier)
    active["priority_score"]   = (active["risk_score"] * active["lifetime_value_php"]).round(2)
    active["risk_reasons_json"] = active.apply(
        lambda row: json.dumps(get_risk_reasons(row)), axis=1
    )
    active["last_scored_at"]   = datetime.utcnow().isoformat()
    active["snooze_until"]     = None

    # Columns to write to DB
    out_cols = [
        "supporter_id",
        "display_name",
        "risk_score",
        "risk_tier",
        "priority_score",
        "lifetime_value_php",
        "days_since_last_donation",
        "gap_ratio",
        "risk_reasons_json",
        "last_scored_at",
        "snooze_until",
    ]
    out = active[out_cols].sort_values("priority_score", ascending=False)

    # Write to Azure SQL using MERGE (upsert on supporter_id)
    with azure_sql_conn() as conn:
        cursor = conn.cursor()

        # Create table if it doesn't exist
        cursor.execute(f"""
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = '{PREDICTIONS_TABLE}'
            )
            BEGIN
                CREATE TABLE [{PREDICTIONS_TABLE}] (
                    supporter_id          INT PRIMARY KEY,
                    display_name          NVARCHAR(255),
                    risk_score            FLOAT,
                    risk_tier             NVARCHAR(50),
                    priority_score        FLOAT,
                    lifetime_value_php    FLOAT,
                    days_since_last_donation FLOAT,
                    gap_ratio             FLOAT,
                    risk_reasons_json     NVARCHAR(MAX),
                    last_scored_at        NVARCHAR(50),
                    snooze_until          NVARCHAR(50)
                )
            END
        """)
        conn.commit()

        # MERGE upsert — safe to re-run without duplicates
        merge_sql = f"""
            MERGE [{PREDICTIONS_TABLE}] AS target
            USING (VALUES (?,?,?,?,?,?,?,?,?,?,?)) AS source (
                supporter_id, display_name, risk_score, risk_tier,
                priority_score, lifetime_value_php, days_since_last_donation,
                gap_ratio, risk_reasons_json, last_scored_at, snooze_until
            )
            ON target.supporter_id = source.supporter_id
            WHEN MATCHED THEN UPDATE SET
                display_name             = source.display_name,
                risk_score               = source.risk_score,
                risk_tier                = source.risk_tier,
                priority_score           = source.priority_score,
                lifetime_value_php       = source.lifetime_value_php,
                days_since_last_donation = source.days_since_last_donation,
                gap_ratio                = source.gap_ratio,
                risk_reasons_json        = source.risk_reasons_json,
                last_scored_at           = source.last_scored_at
            WHEN NOT MATCHED THEN INSERT (
                supporter_id, display_name, risk_score, risk_tier,
                priority_score, lifetime_value_php, days_since_last_donation,
                gap_ratio, risk_reasons_json, last_scored_at, snooze_until
            ) VALUES (
                source.supporter_id, source.display_name, source.risk_score,
                source.risk_tier, source.priority_score, source.lifetime_value_php,
                source.days_since_last_donation, source.gap_ratio,
                source.risk_reasons_json, source.last_scored_at, source.snooze_until
            );
        """

        rows = [
            (
                int(row.supporter_id),
                str(row.display_name),
                float(row.risk_score),
                str(row.risk_tier),
                float(row.priority_score),
                float(row.lifetime_value_php),
                float(row.days_since_last_donation),
                float(row.gap_ratio),
                str(row.risk_reasons_json),
                str(row.last_scored_at),
                None,   # snooze_until — set by staff via API
            )
            for row in out.itertuples(index=False)
        ]

        cursor.executemany(merge_sql, rows)
        conn.commit()

    print(f"[INFER] {len(rows)} rows written to [{PREDICTIONS_TABLE}].")

    # ── Terminal summary ──────────────────────────────────────────────
    high = sum(1 for r in rows if r[3] == "High")
    med  = sum(1 for r in rows if r[3] == "Medium")
    low  = sum(1 for r in rows if r[3] == "Low")
    print(f"[INFER] High: {high} | Medium: {med} | Low: {low}")
    print(f"\n{'Display Name':30s} {'Tier':8s} {'Risk Score':>10s} {'Priority':>10s}")
    print("-" * 62)
    for r in rows[:5]:
        print(f"{r[1]:30s} {r[3]:8s} {r[2]:10.4f} {r[4]:10.2f}")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def run_inference():
    model                  = load_model()
    supporters, donations  = load_live_data()
    features               = engineer_features(supporters, donations)
    score_and_write(model, features)
    print("\n[INFER] Complete. donor_risk_scores table is ready for the C# API.")


if __name__ == "__main__":
    run_inference()