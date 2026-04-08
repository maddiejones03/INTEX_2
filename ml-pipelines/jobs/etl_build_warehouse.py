"""
etl_build_warehouse.py — Pipeline 1: Donor Lapse Risk
Extracts supporters + donations from Azure SQL and engineers the exact same
features as features.py (used during training). Writes a modeling-ready table
back to Azure SQL for train_model.py to consume.

Chapter 17 pattern:
    operational DB → extract → feature engineering → modeling table

Run this before train_model.py:
    cd ml-pipelines/jobs
    python etl_build_warehouse.py
"""

import pandas as pd
import numpy as np
from datetime import datetime
from utils_db import read_query, azure_sql_conn

# ── Config ────────────────────────────────────────────────────────────────────
MODELING_TABLE  = "donor_lapse_modeling"   # written back to Azure SQL
REFERENCE_DATE  = pd.Timestamp("2026-04-06")  # pin to same date as training


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Extract raw tables from Azure SQL
# ─────────────────────────────────────────────────────────────────────────────

def extract() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Pull supporters and donations from the live operational database."""

    print("[ETL] Extracting supporters...")
    supporters = read_query("""
        SELECT
            supporter_id,
            supporter_type,
            status,
            acquisition_channel,
            relationship_type,
            first_donation_date,
            created_at
        FROM supporters
    """)

    print("[ETL] Extracting donations...")
    donations = read_query("""
        SELECT
            donation_id,
            supporter_id,
            donation_type,
            donation_date,
            amount,
            estimated_value,
            is_recurring,
            campaign_name
        FROM donations
    """)

    # Ensure date column is datetime
    donations["donation_date"] = pd.to_datetime(
        donations["donation_date"], errors="coerce"
    )

    print(f"[ETL] supporters: {supporters.shape}, donations: {donations.shape}")
    return supporters, donations


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Feature engineering
# This is an exact port of features.py — same logic, same column names.
# Both training (Pipeline1.ipynb) and inference (run_inference.py) use this.
# ─────────────────────────────────────────────────────────────────────────────

def engineer_features(
    supporters: pd.DataFrame,
    donations: pd.DataFrame
) -> pd.DataFrame:
    """
    Builds one row per supporter with all features from features.py.

    Numeric features:
        days_since_last_donation  — recency
        personal_avg_gap          — donor's own average gap between gifts
        gap_ratio                 — days_since / personal_avg_gap
        gap_cv                    — coefficient of variation of gaps
        momentum                  — recent (0-90d) vs prior (90-180d) count ratio
        distinct_campaigns_count  — number of distinct campaigns donated to
        amount_trend              — last 2 gifts vs prior gifts amount ratio
        lifetime_value_php        — sum of estimated_value across all donations
        total_donation_count      — total number of donation records

    Categorical (kept as strings — one-hot encoded by train_model.py):
        acquisition_channel
        supporter_type
        relationship_type

    Target:
        is_lapsed  — 1 if status == Inactive, 0 if Active
    """

    donations_sorted = donations.sort_values(["supporter_id", "donation_date"])

    agg_rows = []
    for sid, grp in donations_sorted.groupby("supporter_id"):
        dates = grp["donation_date"].dropna().sort_values()

        # ── Recency features ──────────────────────────────────────────
        last_date         = dates.max()
        days_since_last   = (REFERENCE_DATE - last_date).days

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

        # ── Momentum: recent vs prior 90-day window ───────────────────
        last_90       = grp[grp["donation_date"] >= (REFERENCE_DATE - pd.Timedelta(days=90))]
        prior_90_180  = grp[
            (grp["donation_date"] >= (REFERENCE_DATE - pd.Timedelta(days=180)))
            & (grp["donation_date"] <  (REFERENCE_DATE - pd.Timedelta(days=90)))
        ]
        cnt_last90 = len(last_90)
        cnt_prior  = len(prior_90_180)
        momentum   = (cnt_last90 / cnt_prior) if cnt_prior > 0 else float(cnt_last90)

        # ── Behavioral features ───────────────────────────────────────
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

    # ── Merge supporter profile columns ───────────────────────────────
    profile_cols = [
        "supporter_id",
        "acquisition_channel",
        "supporter_type",
        "relationship_type",
        "status",
    ]
    features = features.merge(
        supporters[profile_cols], on="supporter_id", how="left"
    )

    # ── Target variable ───────────────────────────────────────────────
    features["is_lapsed"] = (features["status"] == "Inactive").astype(int)
    features.drop(columns=["status"], inplace=True)

    return features


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Write modeling table back to Azure SQL
# ─────────────────────────────────────────────────────────────────────────────

def load(df: pd.DataFrame) -> None:
    """
    Writes the modeling-ready DataFrame to Azure SQL.
    Replaces the table on every run so it always reflects latest data.
    """
    print(f"[ETL] Writing {len(df)} rows to [{MODELING_TABLE}]...")

    with azure_sql_conn() as conn:
        cursor = conn.cursor()

        # Drop and recreate for a clean slate each run
        cursor.execute(f"""
            IF OBJECT_ID('{MODELING_TABLE}', 'U') IS NOT NULL
                DROP TABLE [{MODELING_TABLE}]
        """)
        conn.commit()

        # Build CREATE TABLE from DataFrame dtypes
        dtype_map = {
            "int64":   "INT",
            "float64": "FLOAT",
            "bool":    "BIT",
            "object":  "NVARCHAR(255)",
        }
        col_defs = []
        for col in df.columns:
            sql_type = dtype_map.get(str(df[col].dtype), "NVARCHAR(255)")
            col_defs.append(f"[{col}] {sql_type}")

        create_sql = f"""
            CREATE TABLE [{MODELING_TABLE}] (
                {", ".join(col_defs)}
            )
        """
        cursor.execute(create_sql)
        conn.commit()

        # Bulk insert
        placeholders = ", ".join(["?"] * len(df.columns))
        col_list     = ", ".join(f"[{c}]" for c in df.columns)
        insert_sql   = f"INSERT INTO [{MODELING_TABLE}] ({col_list}) VALUES ({placeholders})"

        rows = [tuple(row) for row in df.itertuples(index=False)]
        cursor.executemany(insert_sql, rows)
        conn.commit()

    print(f"[ETL] Done. [{MODELING_TABLE}] has {len(df)} rows, {len(df.columns)} columns.")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN: run all three steps in order
# ─────────────────────────────────────────────────────────────────────────────

def build_modeling_table() -> int:
    supporters, donations = extract()
    df = engineer_features(supporters, donations)

    print(f"\n[ETL] Feature matrix shape: {df.shape}")
    print(f"[ETL] Target distribution:\n{df['is_lapsed'].value_counts()}")
    print(f"[ETL] Class balance: {df['is_lapsed'].mean()*100:.1f}% lapsed\n")

    load(df)
    return len(df)


if __name__ == "__main__":
    row_count = build_modeling_table()
    print(f"\n[ETL] Complete. {row_count} supporters in modeling table.")