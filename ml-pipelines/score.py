"""
Donor Lapse Risk — Production Scoring Script
Loads the trained model artifact (model.pkl) and runs the feature engineering pipeline
from features.py to score all active supporters and output risk tiers.
"""

import sys
import pickle
import json
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np

BASE_DIR = Path(__file__).parent
MODEL_PATH = BASE_DIR / "model.pkl"
CLEAN_DIR = BASE_DIR / "cleaned"
OUTPUT_PATH = BASE_DIR / "donor_risk_scores.json"


def load_model():
    if not MODEL_PATH.exists():
        print("ERROR: model.pkl not found. Please run donor_risk_score.ipynb first to train and save the model.")
        sys.exit(1)
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def get_risk_tier(score):
    if score >= 0.65:
        return "High"
    if score >= 0.40:
        return "Medium"
    return "Low"


def get_risk_reasons(X_row):
    reasons = []

    if X_row["gap_ratio"] > 1.5:
        reasons.append({
            "code": "GAP_OVERDUE",
            "label": (
                f"{int(X_row['days_since_last_donation'])} days since last gift "
                f"— {X_row['gap_ratio']:.1f}x their usual gap"
            ),
            "direction": "increases_risk",
        })

    if X_row["momentum"] < 0.5:
        reasons.append({
            "code": "LOW_MOMENTUM",
            "label": "Donation frequency has dropped recently",
            "direction": "increases_risk",
        })

    if X_row["amount_trend"] < 0.8:
        reasons.append({
            "code": "AMOUNT_DECLINING",
            "label": "Recent gift amounts are lower than historical average",
            "direction": "increases_risk",
        })

    acq_wom = X_row.get("acquisition_channel_WordOfMouth", 0)
    acq_web = X_row.get("acquisition_channel_Website", 0)
    if acq_wom == 1 or acq_web == 1:
        reasons.append({
            "code": "CHANNEL_HIGH_RISK",
            "label": "Acquisition channel historically shows higher lapse rate",
            "direction": "increases_risk",
        })

    if X_row["distinct_campaigns_count"] >= 2:
        reasons.append({
            "code": "CAMPAIGN_ENGAGED",
            "label": (
                f"Has donated during {int(X_row['distinct_campaigns_count'])} "
                f"named campaigns — shows mission alignment"
            ),
            "direction": "decreases_risk",
        })

    if X_row["lifetime_value_php"] > 5000:
        reasons.append({
            "code": "HIGH_VALUE",
            "label": (
                f"Lifetime value ₱{X_row['lifetime_value_php']:.0f} "
                f"— high-priority relationship"
            ),
            "direction": "decreases_risk",
        })

    return reasons


def main():
    model = load_model()

    from features import build_features
    X, y, feature_names = build_features(clean_dir=CLEAN_DIR)

    supporters = pd.read_csv(CLEAN_DIR / "supporters.csv")

    donations = pd.read_csv(CLEAN_DIR / "donations.csv")
    scored_ids = sorted(donations["supporter_id"].unique())

    meta = supporters[supporters["supporter_id"].isin(scored_ids)].copy()
    meta = meta[["supporter_id", "display_name", "status",
                  "acquisition_channel", "supporter_type"]]
    meta = meta.sort_values("supporter_id").reset_index(drop=True)

    risk_scores = model.predict_proba(X)[:, 1]

    meta["risk_score"] = risk_scores
    meta["risk_tier"] = meta["risk_score"].apply(get_risk_tier)
    meta["lifetime_value_php"] = X["lifetime_value_php"].values
    meta["priority_score"] = (meta["risk_score"] * meta["lifetime_value_php"]).round(2)

    meta["risk_reasons"] = [
        get_risk_reasons(X.iloc[i]) for i in range(len(X))
    ]

    active = meta[meta["status"] == "Active"].copy()
    active = active.sort_values("priority_score", ascending=False).reset_index(drop=True)

    scored_at = datetime.utcnow().isoformat() + "Z"
    output = []
    for _, row in active.iterrows():
        output.append({
            "supporter_id": int(row["supporter_id"]),
            "display_name": row["display_name"],
            "acquisition_channel": row["acquisition_channel"],
            "supporter_type": row["supporter_type"],
            "risk_tier": row["risk_tier"],
            "risk_score": round(float(row["risk_score"]), 4),
            "lifetime_value_php": round(float(row["lifetime_value_php"]), 2),
            "priority_score": float(row["priority_score"]),
            "risk_reasons": row["risk_reasons"],
            "last_scored_at": scored_at,
            "snooze_until": None,
        })

    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    # ── Terminal summary ────────────────────────────────────────────────
    n = len(output)
    high = sum(1 for r in output if r["risk_tier"] == "High")
    med = sum(1 for r in output if r["risk_tier"] == "Medium")
    low = sum(1 for r in output if r["risk_tier"] == "Low")

    print(f"\nScored {n} active supporters")
    print(f"High risk: {high} | Medium risk: {med} | Low risk: {low}")
    print(f"\nTop 5 by priority score:")
    print(f"{'Name':30s} {'Tier':8s} {'Risk Score':>10s} {'Priority':>10s}")
    print("-" * 62)
    for r in output[:5]:
        print(f"{r['display_name']:30s} {r['risk_tier']:8s} {r['risk_score']:10.4f} {r['priority_score']:10.2f}")
    print(f"\nOutput written to {OUTPUT_PATH.name}")


if __name__ == "__main__":
    main()
