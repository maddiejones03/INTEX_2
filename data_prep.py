"""
data_prep.py — Lighthouse Sanctuary Data Cleaning Pipeline

Reads 17 raw CSVs from SOURCE_DIR, applies universal and table-specific
cleaning, validates FK integrity, writes cleaned CSVs + SQLite database
+ quality log to CLEAN_DIR.

No integrated analytical views are built here; those are constructed in
data_understanding.ipynb after cross-table relationship exploration.

Usage:
    python data_prep.py
    python data_prep.py --source path/to/raw --output path/to/cleaned
"""

import argparse
import json
import sqlite3
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SOURCE_DIR = Path("lighthouse_csv_v7")
CLEAN_DIR = Path("cleaned")
REFERENCE_DATE = pd.Timestamp("2026-04-06")

TABLE_NAMES = [
    "safehouses",
    "partners",
    "partner_assignments",
    "supporters",
    "donations",
    "in_kind_donation_items",
    "donation_allocations",
    "residents",
    "process_recordings",
    "home_visitations",
    "education_records",
    "health_wellbeing_records",
    "intervention_plans",
    "incident_reports",
    "social_media_posts",
    "safehouse_monthly_metrics",
    "public_impact_snapshots",
]

DATE_COLUMNS = {
    "safehouses": ["open_date"],
    "partners": ["start_date", "end_date"],
    "partner_assignments": ["assignment_start", "assignment_end"],
    "supporters": ["created_at", "first_donation_date"],
    "donations": ["donation_date"],
    "donation_allocations": ["allocation_date"],
    "residents": [
        "date_of_birth", "date_of_admission", "date_colb_registered",
        "date_colb_obtained", "date_case_study_prepared", "date_enrolled",
        "date_closed", "created_at",
    ],
    "process_recordings": ["session_date"],
    "home_visitations": ["visit_date"],
    "education_records": ["record_date"],
    "health_wellbeing_records": ["record_date"],
    "intervention_plans": ["target_date", "case_conference_date", "created_at", "updated_at"],
    "incident_reports": ["incident_date", "resolution_date"],
    "social_media_posts": ["created_at"],
    "safehouse_monthly_metrics": ["month_start", "month_end"],
    "public_impact_snapshots": ["snapshot_date", "published_at"],
    "in_kind_donation_items": [],
}

BOOL_COLUMNS = {
    "donations": ["is_recurring"],
    "residents": [
        "sub_cat_orphaned", "sub_cat_trafficked", "sub_cat_child_labor",
        "sub_cat_physical_abuse", "sub_cat_sexual_abuse", "sub_cat_osaec",
        "sub_cat_cicl", "sub_cat_at_risk", "sub_cat_street_child",
        "sub_cat_child_with_hiv", "is_pwd", "has_special_needs",
        "family_is_4ps", "family_solo_parent", "family_indigenous",
        "family_parent_pwd", "family_informal_settler",
    ],
    "process_recordings": ["progress_noted", "concerns_flagged", "referral_made"],
    "home_visitations": ["safety_concerns_noted", "follow_up_needed"],
    "incident_reports": ["resolved", "follow_up_required"],
    "social_media_posts": ["has_call_to_action", "features_resident_story", "is_boosted"],
    "education_records": [],
    "health_wellbeing_records": ["medical_checkup_done", "dental_checkup_done", "psychological_checkup_done"],
    "public_impact_snapshots": ["is_published"],
    "partner_assignments": ["is_primary"],
}

FK_RELATIONSHIPS = [
    ("donations", "supporter_id", "supporters", "supporter_id"),
    ("donations", "referral_post_id", "social_media_posts", "post_id"),
    ("donation_allocations", "donation_id", "donations", "donation_id"),
    ("donation_allocations", "safehouse_id", "safehouses", "safehouse_id"),
    ("in_kind_donation_items", "donation_id", "donations", "donation_id"),
    ("residents", "safehouse_id", "safehouses", "safehouse_id"),
    ("process_recordings", "resident_id", "residents", "resident_id"),
    ("home_visitations", "resident_id", "residents", "resident_id"),
    ("education_records", "resident_id", "residents", "resident_id"),
    ("health_wellbeing_records", "resident_id", "residents", "resident_id"),
    ("intervention_plans", "resident_id", "residents", "resident_id"),
    ("incident_reports", "resident_id", "residents", "resident_id"),
    ("incident_reports", "safehouse_id", "safehouses", "safehouse_id"),
    ("partner_assignments", "partner_id", "partners", "partner_id"),
    ("partner_assignments", "safehouse_id", "safehouses", "safehouse_id"),
    ("safehouse_monthly_metrics", "safehouse_id", "safehouses", "safehouse_id"),
]

# ---------------------------------------------------------------------------
# Quality log
# ---------------------------------------------------------------------------

_log_lines: list[str] = []


def log(msg: str) -> None:
    _log_lines.append(msg)
    print(f"  [QA] {msg}")


def write_log(path: Path) -> None:
    path.write_text("\n".join(_log_lines), encoding="utf-8")

# ---------------------------------------------------------------------------
# Universal cleaning helpers
# ---------------------------------------------------------------------------

def parse_dates(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    return df


def coerce_bools(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    for col in cols:
        if col in df.columns:
            df[col] = (
                df[col]
                .astype(str)
                .str.strip()
                .str.lower()
                .map({"true": True, "false": False, "1": True, "0": False,
                      "1.0": True, "0.0": False, "nan": None, "": None, "none": None})
            )
            df[col] = df[col].astype("boolean")
    return df


def normalize_location(df: pd.DataFrame) -> pd.DataFrame:
    for col in ["region", "city", "province", "country"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.title()
            df[col] = df[col].replace({"Nan": None, "None": None})
    return df


def parse_comma_list(series: pd.Series) -> pd.Series:
    def _split(val):
        if pd.isna(val) or str(val).strip() == "":
            return []
        return [s.strip() for s in str(val).split(",") if s.strip()]
    return series.apply(_split)


def nullable_int(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
    return df

# ---------------------------------------------------------------------------
# FK validation
# ---------------------------------------------------------------------------

def validate_fks(tables: dict[str, pd.DataFrame]) -> None:
    log("=" * 60)
    log("FK VALIDATION")
    log("=" * 60)
    for child_tbl, child_col, parent_tbl, parent_col in FK_RELATIONSHIPS:
        child = tables[child_tbl]
        parent = tables[parent_tbl]
        if child_col not in child.columns or parent_col not in parent.columns:
            log(f"SKIP {child_tbl}.{child_col} -> {parent_tbl}.{parent_col}: column missing")
            continue
        child_vals = child[child_col].dropna().unique()
        parent_vals = set(parent[parent_col].dropna().unique())
        orphans = [v for v in child_vals if v not in parent_vals]
        if orphans:
            log(f"ORPHAN {child_tbl}.{child_col} -> {parent_tbl}.{parent_col}: "
                f"{len(orphans)} orphan(s): {orphans[:10]}")
        else:
            log(f"OK     {child_tbl}.{child_col} -> {parent_tbl}.{parent_col}")

# ---------------------------------------------------------------------------
# Logical consistency checks
# ---------------------------------------------------------------------------

def check_consistency(tables: dict[str, pd.DataFrame]) -> None:
    log("=" * 60)
    log("LOGICAL CONSISTENCY CHECKS")
    log("=" * 60)

    # Donation amount vs allocation sum
    donations = tables["donations"]
    allocs = tables["donation_allocations"]
    monetary = donations[donations["amount"].notna()][["donation_id", "amount"]]
    alloc_sums = allocs.groupby("donation_id")["amount_allocated"].sum().reset_index()
    merged = monetary.merge(alloc_sums, on="donation_id", how="inner")
    mismatches = merged[~np.isclose(merged["amount"], merged["amount_allocated"], atol=0.02)]
    if len(mismatches) > 0:
        log(f"MISMATCH donation amount vs allocation sum: {len(mismatches)} donations")
        for _, row in mismatches.head(5).iterrows():
            log(f"  donation_id={row['donation_id']}: amount={row['amount']:.2f}, "
                f"allocated={row['amount_allocated']:.2f}")
    else:
        log("OK donation amounts match allocation sums")

    # Admission date before first child record
    residents = tables["residents"]
    for child_name, date_col in [
        ("process_recordings", "session_date"),
        ("education_records", "record_date"),
        ("health_wellbeing_records", "record_date"),
    ]:
        child = tables[child_name]
        if date_col not in child.columns:
            continue
        first_dates = child.groupby("resident_id")[date_col].min().reset_index()
        first_dates.columns = ["resident_id", "first_record"]
        check = residents[["resident_id", "date_of_admission"]].merge(first_dates, on="resident_id")
        violations = check[check["date_of_admission"] > check["first_record"]]
        if len(violations) > 0:
            log(f"CHRONO  {child_name}: {len(violations)} resident(s) have records before admission")
        else:
            log(f"OK      {child_name}: all records after admission date")

    # Occupancy <= capacity
    sh = tables["safehouses"]
    over = sh[sh["current_occupancy"] > sh["capacity_girls"]]
    if len(over) > 0:
        log(f"CAPACITY {len(over)} safehouse(s) over capacity: "
            f"{over[['safehouse_id','current_occupancy','capacity_girls']].to_dict('records')}")
    else:
        log("OK safehouse occupancy within capacity")

    # Conditional nullability: social media
    smp = tables["social_media_posts"]
    video_posts = smp[smp["media_type"].isin(["Video", "Reel"])]
    null_views = video_posts["video_views"].isna().sum()
    if null_views > 0:
        log(f"CONDNULL {null_views} Video/Reel posts have null video_views")
    else:
        log("OK all Video/Reel posts have video_views")

    boosted = smp[smp["is_boosted"] == True]
    null_budget = boosted["boost_budget_php"].isna().sum()
    if null_budget > 0:
        log(f"CONDNULL {null_budget} boosted posts have null boost_budget_php")
    else:
        log("OK all boosted posts have boost_budget_php")

# ---------------------------------------------------------------------------
# Table-specific cleaning
# ---------------------------------------------------------------------------

RISK_MAP = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
COOPERATION_MAP = {"Uncooperative": 1, "Neutral": 2, "Cooperative": 3, "Highly Cooperative": 4}
VISIT_OUTCOME_MAP = {"Unfavorable": 1, "Needs Improvement": 2, "Favorable": 3}
SEVERITY_MAP = {"Low": 1, "Medium": 2, "High": 3}
POSITIVE_STATES = {"Calm", "Hopeful", "Happy"}
NEGATIVE_STATES = {"Angry", "Sad", "Anxious", "Withdrawn", "Distressed"}


def clean_residents(df: pd.DataFrame) -> pd.DataFrame:
    df["age_upon_admission_months"] = (
        (df["date_of_admission"] - df["date_of_birth"]).dt.days / 30.44
    ).round(0).astype("Int64")

    df["present_age_months"] = (
        (REFERENCE_DATE - df["date_of_birth"]).dt.days / 30.44
    ).round(0).astype("Int64")

    end = df["date_closed"].fillna(REFERENCE_DATE)
    df["length_of_stay_days"] = (end - df["date_of_admission"]).dt.days.astype("Int64")

    df["initial_risk_numeric"] = df["initial_risk_level"].map(RISK_MAP).astype("Int64")
    df["current_risk_numeric"] = df["current_risk_level"].map(RISK_MAP).astype("Int64")
    df["risk_delta"] = df["initial_risk_numeric"] - df["current_risk_numeric"]

    return df


def clean_education(df: pd.DataFrame) -> pd.DataFrame:
    oob = (df["progress_percent"] < 0) | (df["progress_percent"] > 100)
    if oob.any():
        log(f"RANGE education_records.progress_percent: {oob.sum()} out of [0,100]")
    oob = (df["attendance_rate"] < 0) | (df["attendance_rate"] > 1)
    if oob.any():
        log(f"RANGE education_records.attendance_rate: {oob.sum()} out of [0,1]")
    if "gpa_like_score" in df.columns:
        oob = (df["gpa_like_score"] < 1) | (df["gpa_like_score"] > 5)
        if oob.any():
            log(f"RANGE education_records.gpa_like_score: {oob.sum()} out of [1,5]")
    return df


def clean_health(df: pd.DataFrame) -> pd.DataFrame:
    score_cols = ["general_health_score", "nutrition_score", "sleep_quality_score",
                  "energy_level_score"]
    for col in score_cols:
        if col in df.columns:
            oob = (df[col] < 1) | (df[col] > 5)
            if oob.any():
                log(f"RANGE health_wellbeing_records.{col}: {oob.sum()} out of [1,5]")

    if "bmi" in df.columns:
        oob = (df["bmi"] < 10) | (df["bmi"] > 50)
        if oob.any():
            log(f"RANGE health_wellbeing_records.bmi: {oob.sum()} outside [10,50]")

    df = df.sort_values(["resident_id", "record_date"])
    fill_cols = [c for c in score_cols + ["bmi", "weight_kg", "height_cm"] if c in df.columns]
    df[fill_cols] = df.groupby("resident_id")[fill_cols].ffill(limit=1)

    return df


def clean_process_recordings(df: pd.DataFrame) -> pd.DataFrame:
    df["interventions_list"] = parse_comma_list(df["interventions_applied"])

    df["start_valence"] = df["emotional_state_observed"].apply(
        lambda x: "positive" if x in POSITIVE_STATES else ("negative" if x in NEGATIVE_STATES else "neutral")
    )
    df["end_valence"] = df["emotional_state_end"].apply(
        lambda x: "positive" if x in POSITIVE_STATES else ("negative" if x in NEGATIVE_STATES else "neutral")
    )
    df["emotional_improvement"] = (
        (df["start_valence"] == "negative") & (df["end_valence"] == "positive")
    )
    return df


def clean_home_visitations(df: pd.DataFrame) -> pd.DataFrame:
    df["cooperation_numeric"] = df["family_cooperation_level"].map(COOPERATION_MAP).astype("Int64")
    df["outcome_numeric"] = df["visit_outcome"].map(VISIT_OUTCOME_MAP).astype("float64")
    return df


def clean_incident_reports(df: pd.DataFrame) -> pd.DataFrame:
    df["severity_numeric"] = df["severity"].map(SEVERITY_MAP).astype("Int64")
    return df


def clean_social_media(df: pd.DataFrame) -> pd.DataFrame:
    df["hashtags_list"] = parse_comma_list(df["hashtags"])
    df["post_month"] = df["created_at"].dt.to_period("M").astype(str)
    df["post_year"] = df["created_at"].dt.year.astype("Int64")
    return df


def clean_intervention_plans(df: pd.DataFrame) -> pd.DataFrame:
    df["services_list"] = parse_comma_list(df["services_provided"])
    return df


def clean_donations(df: pd.DataFrame) -> pd.DataFrame:
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["estimated_value"] = pd.to_numeric(df["estimated_value"], errors="coerce")
    return df


def clean_public_impact(df: pd.DataFrame) -> pd.DataFrame:
    def _parse_json(val):
        if pd.isna(val):
            return {}
        try:
            return json.loads(str(val).replace("'", '"'))
        except (json.JSONDecodeError, ValueError):
            return {}

    parsed = df["metric_payload_json"].apply(_parse_json)
    expanded = pd.json_normalize(parsed)
    expanded.columns = [f"metric_{c}" for c in expanded.columns]
    expanded.index = df.index
    return pd.concat([df, expanded], axis=1)


def forward_fill_education(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["resident_id", "record_date"])
    fill_cols = ["progress_percent", "attendance_rate"]
    if "gpa_like_score" in df.columns:
        fill_cols.append("gpa_like_score")
    df[fill_cols] = df.groupby("resident_id")[fill_cols].ffill(limit=1)
    return df

# ---------------------------------------------------------------------------
# SQLite export
# ---------------------------------------------------------------------------

def get_connection(db_path: str) -> sqlite3.Connection:
    """Configurable connection. Swap this for pyodbc/psycopg2 for production."""
    return sqlite3.connect(db_path)


def export_to_sqlite(tables: dict[str, pd.DataFrame], db_path: Path) -> None:
    conn = get_connection(str(db_path))
    for name, df in tables.items():
        serializable = df.copy()
        for col in serializable.columns:
            if serializable[col].dtype == "object":
                continue
            if hasattr(serializable[col], "dt"):
                serializable[col] = serializable[col].astype(str).replace("NaT", None)
            if str(serializable[col].dtype).startswith("Int"):
                serializable[col] = serializable[col].astype("object").where(
                    serializable[col].notna(), None
                )
            if str(serializable[col].dtype) == "boolean":
                serializable[col] = serializable[col].astype("object").where(
                    serializable[col].notna(), None
                )
        # Drop list columns that SQLite can't store natively
        list_cols = [c for c in serializable.columns
                     if serializable[c].apply(type).eq(list).any()]
        for col in list_cols:
            serializable[col] = serializable[col].apply(
                lambda x: ",".join(x) if isinstance(x, list) else x
            )
        serializable.to_sql(name, conn, if_exists="replace", index=False)
    conn.close()
    print(f"  SQLite database written to {db_path}")

# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def load_tables(source_dir: Path) -> dict[str, pd.DataFrame]:
    tables = {}
    for name in TABLE_NAMES:
        path = source_dir / f"{name}.csv"
        if path.exists():
            tables[name] = pd.read_csv(path)
            print(f"  Loaded {name}: {tables[name].shape}")
        else:
            print(f"  WARNING: {path} not found, skipping")
    return tables


def universal_clean(tables: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    for name, df in tables.items():
        date_cols = DATE_COLUMNS.get(name, [])
        df = parse_dates(df, date_cols)

        bool_cols = BOOL_COLUMNS.get(name, [])
        df = coerce_bools(df, bool_cols)

        df = normalize_location(df)

        id_cols = [c for c in df.columns if c.endswith("_id") and c != "platform_post_id"]
        df = nullable_int(df, id_cols)

        tables[name] = df
    return tables


def table_specific_clean(tables: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    tables["residents"] = clean_residents(tables["residents"])
    tables["education_records"] = clean_education(tables["education_records"])
    tables["education_records"] = forward_fill_education(tables["education_records"])
    tables["health_wellbeing_records"] = clean_health(tables["health_wellbeing_records"])
    tables["process_recordings"] = clean_process_recordings(tables["process_recordings"])
    tables["home_visitations"] = clean_home_visitations(tables["home_visitations"])
    tables["incident_reports"] = clean_incident_reports(tables["incident_reports"])
    tables["social_media_posts"] = clean_social_media(tables["social_media_posts"])
    tables["intervention_plans"] = clean_intervention_plans(tables["intervention_plans"])
    tables["donations"] = clean_donations(tables["donations"])
    tables["public_impact_snapshots"] = clean_public_impact(tables["public_impact_snapshots"])
    return tables


def save_csvs(tables: dict[str, pd.DataFrame], clean_dir: Path) -> None:
    for name, df in tables.items():
        out_path = clean_dir / f"{name}.csv"
        df.to_csv(out_path, index=False)
    print(f"  {len(tables)} cleaned CSVs written to {clean_dir}/")


def run(source_dir: Path, clean_dir: Path) -> None:
    clean_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("LIGHTHOUSE DATA PREP PIPELINE")
    print("=" * 60)

    print("\n[1/6] Loading raw tables...")
    tables = load_tables(source_dir)

    print("\n[2/6] Universal cleaning...")
    tables = universal_clean(tables)

    print("\n[3/6] Table-specific cleaning...")
    tables = table_specific_clean(tables)

    print("\n[4/6] Validating FK integrity and logical consistency...")
    validate_fks(tables)
    check_consistency(tables)

    print("\n[5/6] Writing cleaned CSVs...")
    save_csvs(tables, clean_dir)

    print("\n[6/6] Exporting to SQLite...")
    export_to_sqlite(tables, clean_dir / "lighthouse.db")

    log_path = clean_dir / "data_quality_log.txt"
    write_log(log_path)
    print(f"\n  Quality log written to {log_path}")
    print("\nDone.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lighthouse data cleaning pipeline")
    parser.add_argument("--source", type=Path, default=SOURCE_DIR)
    parser.add_argument("--output", type=Path, default=CLEAN_DIR)
    args = parser.parse_args()
    run(args.source, args.output)
