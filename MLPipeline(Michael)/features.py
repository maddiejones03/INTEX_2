"""
Donor Lapse Risk — Feature Engineering Pipeline
This module is imported by both Pipeline1.ipynb (training) and score.py (production scoring).
It takes raw supporters and donations dataframes and returns a feature matrix X and target series y.
"""

from pathlib import Path
import pandas as pd
import numpy as np

REFERENCE_DATE = pd.Timestamp("2026-04-06")


def build_features(clean_dir=None):
    # ── STEP 1: Load data ───────────────────────────────────────────────
    if clean_dir is None:
        clean_dir = Path(__file__).parent / "cleaned"
    clean_dir = Path(clean_dir)

    supporters = pd.read_csv(clean_dir / "supporters.csv")
    donations = pd.read_csv(clean_dir / "donations.csv", parse_dates=["donation_date"])

    # ── STEP 3: Per-supporter aggregations from donations ───────────────
    donations_sorted = donations.sort_values(["supporter_id", "donation_date"])

    agg_rows = []
    for sid, grp in donations_sorted.groupby("supporter_id"):
        dates = grp["donation_date"].dropna().sort_values()

        # — Recency features: how recently and how regularly the donor gives —
        last_date = dates.max()
        days_since_last = (REFERENCE_DATE - last_date).days

        gaps = dates.diff().dt.days.dropna()
        if len(gaps) == 0:
            personal_avg_gap = float(days_since_last)
            gap_cv = 0.0
        else:
            personal_avg_gap = gaps.mean()
            gap_std = gaps.std()
            gap_cv = (gap_std / personal_avg_gap) if personal_avg_gap != 0 else 0.0
            if pd.isna(gap_cv):
                gap_cv = 0.0

        gap_ratio = (days_since_last / personal_avg_gap) if personal_avg_gap != 0 else 1.0

        last_90 = grp[grp["donation_date"] >= (REFERENCE_DATE - pd.Timedelta(days=90))]
        prior_90_180 = grp[
            (grp["donation_date"] >= (REFERENCE_DATE - pd.Timedelta(days=180)))
            & (grp["donation_date"] < (REFERENCE_DATE - pd.Timedelta(days=90)))
        ]
        cnt_last90 = len(last_90)
        cnt_prior = len(prior_90_180)
        momentum = (cnt_last90 / cnt_prior) if cnt_prior > 0 else float(cnt_last90)

        # — Behavioral features: breadth, trajectory and lifetime value —
        campaigns = grp["campaign_name"].dropna().nunique()

        monetary = grp[grp["donation_type"] == "Monetary"].sort_values("donation_date")
        if len(monetary) >= 3:
            last2_mean = monetary["amount"].iloc[-2:].mean()
            prior_mean = monetary["amount"].iloc[:-2].mean()
            amount_trend = (last2_mean / prior_mean) if prior_mean != 0 else 1.0
        else:
            amount_trend = 1.0

        lifetime_value = grp["estimated_value"].sum()
        total_count = len(grp)

        agg_rows.append({
            "supporter_id": sid,
            "days_since_last_donation": days_since_last,
            "personal_avg_gap": personal_avg_gap,
            "gap_ratio": gap_ratio,
            "gap_cv": gap_cv,
            "momentum": momentum,
            "distinct_campaigns_count": campaigns,
            "amount_trend": amount_trend,
            "lifetime_value_php": lifetime_value,
            "total_donation_count": total_count,
        })

    features = pd.DataFrame(agg_rows)

    # ── STEP 4: Merge supporter profile columns ────────────────────────
    profile_cols = [
        "supporter_id",
        "acquisition_channel",
        "supporter_type",
        "relationship_type",
        "status",
    ]
    features = features.merge(supporters[profile_cols], on="supporter_id", how="left")

    # ── STEP 5: Build target variable ───────────────────────────────────
    features["is_lapsed"] = (features["status"] == "Inactive").astype(int)
    features.drop(columns=["status"], inplace=True)

    # ── STEP 6: One-hot encode categoricals ─────────────────────────────
    cat_cols = ["acquisition_channel", "supporter_type", "relationship_type"]
    dummies = pd.get_dummies(features[cat_cols], prefix=cat_cols, drop_first=False)
    features = pd.concat([features.drop(columns=cat_cols), dummies], axis=1)

    # ── STEP 7: Return X, y, feature_names ──────────────────────────────
    y = features["is_lapsed"]
    X = features.drop(columns=["supporter_id", "is_lapsed"])
    feature_names = list(X.columns)

    return X, y, feature_names


if __name__ == "__main__":
    X, y, feature_names = build_features()
    print(f"\nFeature matrix shape: {X.shape}")
    print(f"Target distribution:\n{y.value_counts()}")
    print(f"\nClass balance: {y.mean()*100:.1f}% lapsed")
    print(f"\nFeature names ({len(feature_names)}):")
    for f in feature_names:
        print(f"  {f}")
    print(f"\nMissing values per feature:")
    print(X.isnull().sum()[X.isnull().sum() > 0])
