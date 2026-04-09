"""
etl_pipeline2.py — Donation to Outcome Pipeline: Donation-to-Outcome Correlation
Pulls donation_allocations and safehouse_monthly_metrics from Azure SQL,
builds the lagged safehouse-month panel, and writes a modeling-ready table
back to Azure SQL for train_pipeline2.py to consume.

This is an exact port of impact_features.py — same logic, same columns,
same 1-month lag — just reading from Azure SQL instead of CSV files.

Chapter 17 pattern:
    operational DB → extract → feature engineering → modeling table

Run this before train_pipeline2.py:
    cd ml-pipelines/jobs
    python etl_pipeline2.py
"""

import pandas as pd
from utils_db import read_query, azure_sql_conn

# ── Config ────────────────────────────────────────────────────────────────────
MODELING_TABLE = "impact_modeling_panel"

PROGRAM_AREAS = [
    "Education",
    "Maintenance",
    "Operations",
    "Outreach",
    "Transport",
    "Wellbeing",
]


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Extract raw tables from Azure SQL
# ─────────────────────────────────────────────────────────────────────────────

def extract() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Pull donation_allocations and safehouse_monthly_metrics from Azure SQL."""

    print("[ETL2] Extracting donation_allocations...")
    alloc = read_query("""
        SELECT
            safehouse_id,
            program_area,
            amount_allocated,
            allocation_date
        FROM donation_allocations
    """)
    alloc["allocation_date"] = pd.to_datetime(
        alloc["allocation_date"], errors="coerce"
    )

    print("[ETL2] Extracting safehouse_monthly_metrics...")
    metrics = read_query("""
        SELECT
            safehouse_id,
            month_start,
            avg_education_progress,
            avg_health_score,
            active_residents,
            incident_count,
            process_recording_count
        FROM safehouse_monthly_metrics
    """)
    metrics["month_start"] = pd.to_datetime(
        metrics["month_start"], errors="coerce"
    )

    print(f"[ETL2] allocations: {alloc.shape}, metrics: {metrics.shape}")
    return alloc, metrics


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Feature engineering
# Exact port of impact_features.py — same logic, same column names.
# ─────────────────────────────────────────────────────────────────────────────

def engineer_features(
    alloc: pd.DataFrame,
    metrics: pd.DataFrame
) -> pd.DataFrame:
    """
    Builds the safehouse-month panel with lagged funding features.

    Steps (mirrors impact_features.py exactly):
        1. Pivot allocation by program area per safehouse per month
        2. Lag funding by 1 month (T → T+1)
        3. Join to safehouse_monthly_metrics on outcome month
        4. Drop rows with missing outcome variables
        5. Scale funding to per-1000 units
        6. Add safehouse fixed effect dummies
    """

    # ── Step 2a: Build monthly allocation pivot ───────────────────────────────
    alloc["alloc_month"] = alloc["allocation_date"].dt.to_period("M")

    pivot = alloc.pivot_table(
        index=["safehouse_id", "alloc_month"],
        columns="program_area",
        values="amount_allocated",
        aggfunc="sum",
        fill_value=0,
    ).reset_index()

    pivot.columns.name = None

    # Ensure all 6 program area columns exist even if missing from data
    for area in PROGRAM_AREAS:
        if area not in pivot.columns:
            pivot[area] = 0.0

    # ── Step 2b: Apply the 1-month lag ───────────────────────────────────────
    # Funding in month T → outcomes in month T+1
    pivot["outcome_month"] = pivot["alloc_month"] + 1

    # ── Step 2c: Prepare metrics table ───────────────────────────────────────
    metrics["month_period"] = metrics["month_start"].dt.to_period("M")

    metrics_clean = metrics[[
        "safehouse_id",
        "month_period",
        "avg_education_progress",
        "avg_health_score",
        "active_residents",
        "incident_count",
        "process_recording_count",
    ]]

    # ── Step 2d: Join funding (T) to outcomes (T+1) ──────────────────────────
    panel = pivot.merge(
        metrics_clean,
        left_on=["safehouse_id", "outcome_month"],
        right_on=["safehouse_id", "month_period"],
        how="inner",
    )
    panel = panel.drop(columns=["month_period"])

    # ── Step 2e: Drop rows with missing outcome variables ────────────────────
    before = len(panel)
    panel = panel.dropna(
        subset=["avg_education_progress", "avg_health_score"]
    )
    dropped = before - len(panel)
    if dropped > 0:
        print(
            f"[ETL2] Dropped {dropped} rows with missing outcome data — "
            "months where education or health assessments were not completed."
        )

    # ── Step 2f: Scale funding to per-1000 units ─────────────────────────────
    for area in PROGRAM_AREAS:
        panel[f"{area}_per_1000"] = panel[area] / 1000

    # ── Step 2g: Add safehouse fixed effect dummies ──────────────────────────
    sh_dummies = pd.get_dummies(
        panel["safehouse_id"], prefix="sh", drop_first=True
    )
    panel = pd.concat([panel, sh_dummies], axis=1)

    # ── Step 2h: Convert Period columns to strings for SQL storage ───────────
    # SQL Server cannot store pandas Period objects
    panel["alloc_month"]   = panel["alloc_month"].astype(str)
    panel["outcome_month"] = panel["outcome_month"].astype(str)

    # Convert boolean dummy columns to int for SQL Server
    bool_cols = panel.select_dtypes(include="bool").columns
    panel[bool_cols] = panel[bool_cols].astype(int)

    return panel


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Write modeling table back to Azure SQL
# ─────────────────────────────────────────────────────────────────────────────

def load(df: pd.DataFrame) -> None:
    """
    Writes the panel DataFrame to Azure SQL.
    Drops and recreates the table on every run for a clean slate.
    """
    print(f"[ETL2] Writing {len(df)} rows to [{MODELING_TABLE}]...")

    dtype_map = {
        "int64":   "INT",
        "float64": "FLOAT",
        "bool":    "BIT",
        "object":  "NVARCHAR(255)",
        "int32":   "INT",
    }

    with azure_sql_conn() as conn:
        cursor = conn.cursor()

        # Drop existing table
        cursor.execute(f"""
            IF OBJECT_ID('{MODELING_TABLE}', 'U') IS NOT NULL
                DROP TABLE [{MODELING_TABLE}]
        """)
        conn.commit()

        # Create table from DataFrame dtypes
        col_defs = []
        for col in df.columns:
            sql_type = dtype_map.get(str(df[col].dtype), "NVARCHAR(255)")
            col_defs.append(f"[{col}] {sql_type}")

        cursor.execute(f"""
            CREATE TABLE [{MODELING_TABLE}] (
                {", ".join(col_defs)}
            )
        """)
        conn.commit()

        # Bulk insert
        placeholders = ", ".join(["?"] * len(df.columns))
        col_list     = ", ".join(f"[{c}]" for c in df.columns)
        insert_sql   = f"""
            INSERT INTO [{MODELING_TABLE}] ({col_list})
            VALUES ({placeholders})
        """
        rows = [tuple(row) for row in df.itertuples(index=False)]
        cursor.executemany(insert_sql, rows)
        conn.commit()

    print(f"[ETL2] Done. [{MODELING_TABLE}] has {len(df)} rows, "
          f"{len(df.columns)} columns.")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def build_modeling_table() -> int:
    alloc, metrics = extract()
    panel          = engineer_features(alloc, metrics)

    print(f"\n[ETL2] Panel shape: {panel.shape}")
    print(f"[ETL2] Safehouses: {panel['safehouse_id'].nunique()}")
    print(f"[ETL2] Date range: {panel['alloc_month'].min()} "
          f"to {panel['alloc_month'].max()}")
    print(f"[ETL2] Outcome stats:")
    print(panel[["avg_education_progress", "avg_health_score"]]
          .describe().round(2))

    load(panel)
    return len(panel)


if __name__ == "__main__":
    row_count = build_modeling_table()
    print(f"\n[ETL2] Complete. {row_count} safehouse-months in modeling table.")