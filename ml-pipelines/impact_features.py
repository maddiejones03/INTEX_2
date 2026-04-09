"""
Donation to Outcome Pipeline — Feature Engineering
Builds the safehouse-month panel dataset by:
1. Pivoting donation_allocations by program area per safehouse per month
2. Lagging funding by 1 month (funding in T predicts outcomes in T+1)
3. Joining to safehouse_monthly_metrics for outcome variables
4. Dropping rows with missing outcome data
Returns a clean modeling DataFrame ready for OLS regression.
"""

import pandas as pd
from pathlib import Path

REFERENCE_DATE = pd.Timestamp("2026-04-06")


def build_impact_features(clean_dir=None):
    # ── Step 1: Define paths and load data ──
    if clean_dir is None:
        clean_dir = Path(__file__).parent / "cleaned"
    else:
        clean_dir = Path(clean_dir)

    alloc = pd.read_csv(
        clean_dir / "donation_allocations.csv",
        parse_dates=["allocation_date"],
    )
    metrics = pd.read_csv(
        clean_dir / "safehouse_monthly_metrics.csv",
        parse_dates=["month_start"],
    )

    # ── Step 2: Build monthly allocation pivot ──
    alloc["alloc_month"] = alloc["allocation_date"].dt.to_period("M")

    pivot = alloc.pivot_table(
        index=["safehouse_id", "alloc_month"],
        columns="program_area",
        values="amount_allocated",
        aggfunc="sum",
        fill_value=0,
    ).reset_index()

    pivot.columns = [
        col if not isinstance(col, tuple) else col
        for col in pivot.columns
    ]
    pivot.columns.name = None

    # ── Step 3: Apply the 1-month lag ──
    # Funding disbursed in month T takes time to translate into programme
    # activities (hiring tutors, buying supplies, scheduling sessions).
    # Outcomes measured in T+1 are the earliest plausible reflection of
    # that spending, so we lag by exactly one period.
    pivot["outcome_month"] = pivot["alloc_month"] + 1

    # ── Step 4: Prepare metrics table ──
    metrics["month_period"] = metrics["month_start"].dt.to_period("M")

    metrics = metrics[
        [
            "safehouse_id",
            "month_period",
            "avg_education_progress",
            "avg_health_score",
            "active_residents",
            "incident_count",
            "process_recording_count",
        ]
    ]

    # ── Step 5: Join funding to outcomes ──
    panel = pivot.merge(
        metrics,
        left_on=["safehouse_id", "outcome_month"],
        right_on=["safehouse_id", "month_period"],
        how="inner",
    )
    panel = panel.drop(columns=["month_period"])

    # ── Step 6: Drop missing outcomes ──
    before = len(panel)
    panel = panel.dropna(subset=["avg_education_progress", "avg_health_score"])
    dropped = before - len(panel)
    print(
        f"Dropped {dropped} rows with missing outcome data — months where "
        "education or health assessments were not completed. "
        "Imputation is not appropriate for outcome variables as it "
        "would bias regression coefficients."
    )

    # ── Step 7: Engineer scaled funding features ──
    program_areas = [
        "Education",
        "Maintenance",
        "Operations",
        "Outreach",
        "Transport",
        "Wellbeing",
    ]
    for area in program_areas:
        panel[f"{area}_per_1000"] = panel[area] / 1000

    # ── Step 8: Add safehouse fixed effect dummies ──
    # Safehouse fixed effects control for time-invariant differences
    # between safehouses — staffing quality, location, resident
    # severity mix — so our funding coefficients are not confounded
    # by these baseline differences.
    sh_dummies = pd.get_dummies(
        panel["safehouse_id"], prefix="sh", drop_first=True
    )
    panel = pd.concat([panel, sh_dummies], axis=1)

    # ── Step 9: Return ──
    return panel


if __name__ == "__main__":
    panel = build_impact_features()
    print(f"Panel shape: {panel.shape}")
    print(f"Safehouses: {panel['safehouse_id'].nunique()}")
    print(
        f"Date range: {panel['alloc_month'].min()} to "
        f"{panel['alloc_month'].max()}"
    )
    print(f"\nOutcome variable stats:")
    print(
        panel[["avg_education_progress", "avg_health_score"]]
        .describe()
        .round(2)
    )
    print(f"\nFunding per 1000 stats:")
    per1000_cols = [c for c in panel.columns if c.endswith("_per_1000")]
    print(panel[per1000_cols].describe().round(2))
    print(f"\nMissing values:")
    missing = panel.isnull().sum()
    print(missing[missing > 0] if missing.any() else "None")
    print(f"\nCorrelations with avg_education_progress:")
    print(
        panel[per1000_cols + ["avg_education_progress"]]
        .corr()["avg_education_progress"]
        .round(3)
    )
