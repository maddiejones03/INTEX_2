"""
train_pipeline2.py — Donation to Outcome Pipeline: Donation-to-Outcome Correlation
Reads the impact_modeling_panel table built by etl_pipeline2.py,
fits OLS regression models (with and without safehouse fixed effects),
and saves impact_per_1000.json to the artifacts folder.

Unlike Donor Risk Score Pipeline, there is no model.pkl here — the deployment artifact
is the JSON file containing OLS coefficients. The app reads this JSON
directly to display funding impact on the dashboard.

Chapter 17 pattern:
    modeling table → train → evaluate → save artifact

Run after etl_pipeline2.py:
    cd ml-pipelines/jobs
    python train_pipeline2.py
"""

import json
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.api as sm

from config import ARTIFACTS_DIR
from utils_db import read_query

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

PER1000_COLS = [f"{area}_per_1000" for area in PROGRAM_AREAS]
OUTPUT_PATH  = ARTIFACTS_DIR / "impact_per_1000.json"


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Load modeling table from Azure SQL
# ─────────────────────────────────────────────────────────────────────────────

def load_modeling_table() -> pd.DataFrame:
    print(f"[TRAIN2] Loading [{MODELING_TABLE}] from Azure SQL...")
    df = read_query(f"SELECT * FROM [{MODELING_TABLE}]")
    print(f"[TRAIN2] Loaded {df.shape[0]} rows, {df.shape[1]} columns.")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Fit OLS models
# Mirrors donation_to_outcome.ipynb exactly — Model A (no FE) and Model B (with FE)
# for both outcome variables.
# ─────────────────────────────────────────────────────────────────────────────

def fit_models(panel: pd.DataFrame) -> dict:
    """
    Fits four OLS models matching the notebook:
        Model A — Simple OLS, education progress
        Model B — OLS with safehouse fixed effects, education progress
        Model A — Simple OLS, health score
        Model B — OLS with safehouse fixed effects, health score

    Returns a dict of fitted statsmodels results.
    """
    sh_dummy_cols  = [c for c in panel.columns if c.startswith("sh_")]
    predictors_A   = PER1000_COLS + ["active_residents"]
    predictors_B   = PER1000_COLS + ["active_residents"] + sh_dummy_cols

    y_edu    = panel["avg_education_progress"].astype(float)
    y_health = panel["avg_health_score"].astype(float)

    X_a = sm.add_constant(panel[predictors_A].astype(float))
    X_b = sm.add_constant(panel[predictors_B].astype(float))

    print("[TRAIN2] Fitting Model A — Simple OLS (education)...")
    model_A_edu = sm.OLS(y_edu, X_a).fit()

    print("[TRAIN2] Fitting Model B — OLS with fixed effects (education)...")
    model_B_edu = sm.OLS(y_edu, X_b).fit()

    print("[TRAIN2] Fitting Model A — Simple OLS (health)...")
    model_A_health = sm.OLS(y_health, X_a).fit()

    print("[TRAIN2] Fitting Model B — OLS with fixed effects (health)...")
    model_B_health = sm.OLS(y_health, X_b).fit()

    return {
        "A_edu":    model_A_edu,
        "B_edu":    model_B_edu,
        "A_health": model_A_health,
        "B_health": model_B_health,
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Build coefficient comparison table (mirrors notebook cell 14)
# ─────────────────────────────────────────────────────────────────────────────

def build_comparison_table(models: dict) -> pd.DataFrame:
    program_labels = PROGRAM_AREAS + ["active_residents"]
    feature_cols   = PER1000_COLS  + ["active_residents"]

    coef_comparison = pd.DataFrame({
        "Feature":           program_labels,
        "ModelA_edu_coef":   [models["A_edu"].params.get(c, np.nan)
                              for c in feature_cols],
        "ModelB_edu_coef":   [models["B_edu"].params.get(c, np.nan)
                              for c in feature_cols],
        "ModelA_health_coef":[models["A_health"].params.get(c, np.nan)
                              for c in feature_cols],
        "ModelB_health_coef":[models["B_health"].params.get(c, np.nan)
                              for c in feature_cols],
    })

    print("\n[TRAIN2] Coefficient comparison (Model A vs Model B):")
    print("=" * 80)
    print(coef_comparison.to_string(index=False, float_format="{:.4f}".format))
    print("\nInterpretation: each coefficient = change in outcome "
          "per $1,000 allocated (lagged 1 month)")

    return coef_comparison


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Build impact ranking and save JSON artifact
# Mirrors notebook cell 19 exactly.
# ─────────────────────────────────────────────────────────────────────────────

def save_impact_json(models: dict) -> None:
    """
    Builds the impact_per_1000.json artifact consumed by:
        - Public Impact Dashboard (donor-facing)
        - Admin Reports page (staff-facing)
    """
    B_edu    = models["B_edu"]
    B_health = models["B_health"]

    edu_coefs    = {area: float(B_edu.params.get(f"{area}_per_1000", 0))
                   for area in PROGRAM_AREAS}
    health_coefs = {area: float(B_health.params.get(f"{area}_per_1000", 0))
                   for area in PROGRAM_AREAS}

    ranking_df = pd.DataFrame({
        "program_area": PROGRAM_AREAS,
        "edu_coef":     [edu_coefs[a]    for a in PROGRAM_AREAS],
        "health_coef":  [health_coefs[a] for a in PROGRAM_AREAS],
    })
    ranking_df["avg_impact"] = (
        ranking_df["edu_coef"] + ranking_df["health_coef"]
    ) / 2
    ranking_df = ranking_df.sort_values(
        "avg_impact", ascending=False
    ).reset_index(drop=True)
    ranking_df["rank"] = ranking_df.index + 1

    print("\n[TRAIN2] Program area impact ranking (Model B):")
    print("=" * 60)
    print(ranking_df[["rank", "program_area", "edu_coef",
                       "health_coef", "avg_impact"]]
          .to_string(index=False, float_format="{:.4f}".format))

    # ── Model fit metrics ─────────────────────────────────────────────────────
    impact_json = {
        "generated_at":  datetime.utcnow().isoformat(),
        "model":         "OLS with safehouse fixed effects (Model B)",
        "unit":          "points per $1,000 allocated (lagged 1 month)",
        "model_fit": {
            "education": {
                "r_squared":     round(float(B_edu.rsquared), 4),
                "adj_r_squared": round(float(B_edu.rsquared_adj), 4),
                "n_obs":         int(B_edu.nobs),
                "f_pvalue":      round(float(B_edu.f_pvalue), 4),
            },
            "health": {
                "r_squared":     round(float(B_health.rsquared), 4),
                "adj_r_squared": round(float(B_health.rsquared_adj), 4),
                "n_obs":         int(B_health.nobs),
                "f_pvalue":      round(float(B_health.f_pvalue), 4),
            },
        },
        "education_progress_coefficients": {
            row["program_area"]: round(row["edu_coef"], 4)
            for _, row in ranking_df.iterrows()
        },
        "health_score_coefficients": {
            row["program_area"]: round(row["health_coef"], 4)
            for _, row in ranking_df.iterrows()
        },
        "program_area_ranking": [
            {
                "rank":         int(row["rank"]),
                "program_area": row["program_area"],
                "edu_coef":     round(row["edu_coef"], 4),
                "health_coef":  round(row["health_coef"], 4),
                "avg_impact":   round(row["avg_impact"], 4),
            }
            for _, row in ranking_df.iterrows()
        ],
        "top_program_area": ranking_df.iloc[0]["program_area"],
        "top_edu_impact":   round(ranking_df.iloc[0]["edu_coef"], 4),
    }

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(impact_json, f, indent=2)

    print(f"\n[TRAIN2] Saved artifact → {OUTPUT_PATH}")
    print(f"[TRAIN2] Top program area: {impact_json['top_program_area']} "
          f"(avg impact: {impact_json['program_area_ranking'][0]['avg_impact']:.4f})")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def train():
    panel  = load_modeling_table()
    models = fit_models(panel)
    build_comparison_table(models)
    save_impact_json(models)

    print("\n[TRAIN2] Model fit summary:")
    print(f"  Education  — R²: {models['B_edu'].rsquared:.4f} | "
          f"Adj R²: {models['B_edu'].rsquared_adj:.4f}")
    print(f"  Health     — R²: {models['B_health'].rsquared:.4f} | "
          f"Adj R²: {models['B_health'].rsquared_adj:.4f}")
    print("\n[TRAIN2] Complete. impact_per_1000.json is ready for the C# API.")


if __name__ == "__main__":
    train()