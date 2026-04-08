"""
train_model.py — Pipeline 1: Donor Lapse Risk
Reads the modeling table built by etl_build_warehouse.py, trains both
Logistic Regression (explanatory) and Gradient Boosting (predictive),
and saves the Gradient Boosting model as model.pkl — matching what
score.py expects.

Chapter 17 pattern:
    modeling table → train → evaluate → save artifacts

Run after etl_build_warehouse.py:
    cd ml-pipelines/jobs
    python train_model.py
"""

import json
import pickle
from datetime import datetime
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    balanced_accuracy_score,
    f1_score,
    log_loss,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from config import (
    ARTIFACTS_DIR,
    DONOR_CHURN_METADATA_PATH,
    DONOR_CHURN_METRICS_PATH,
)
from utils_db import read_query

# ── Config ────────────────────────────────────────────────────────────────────
MODELING_TABLE = "donor_lapse_modeling"
MODEL_VERSION  = "1.0.0"

# Save as model.pkl to match what score.py expects
MODEL_PATH = ARTIFACTS_DIR / "model.pkl"

# These must match features.py exactly
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

LABEL_COL = "is_lapsed"


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Load modeling table from Azure SQL
# ─────────────────────────────────────────────────────────────────────────────

def load_modeling_table() -> pd.DataFrame:
    print(f"[TRAIN] Loading [{MODELING_TABLE}] from Azure SQL...")
    df = read_query(f"SELECT * FROM [{MODELING_TABLE}]")
    print(f"[TRAIN] Loaded {df.shape[0]} rows, {df.shape[1]} columns.")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Prepare features and target
# ─────────────────────────────────────────────────────────────────────────────

def prepare(df: pd.DataFrame):
    """Split into X, y and then train/test — mirrors Pipeline1.ipynb exactly."""

    feature_cols = NUMERIC_FEATURES + CATEGORICAL_FEATURES
    X = df[feature_cols].copy()
    y = df[LABEL_COL].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    print(f"[TRAIN] Train: {X_train.shape[0]} rows | Test: {X_test.shape[0]} rows")
    return X_train, X_test, y_train, y_test


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Build sklearn Pipelines
# One-hot encoding + imputation handled here, not in ETL,
# so categoricals stay readable in the modeling table.
# ─────────────────────────────────────────────────────────────────────────────

def build_preprocessor() -> ColumnTransformer:
    numeric_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler",  StandardScaler()),
    ])
    categorical_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot",  OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer(transformers=[
        ("num", numeric_pipe,     NUMERIC_FEATURES),
        ("cat", categorical_pipe, CATEGORICAL_FEATURES),
    ])


def build_models(preprocessor: ColumnTransformer) -> dict:
    return {
        "Logistic Regression": Pipeline([
            ("prep",  preprocessor),
            ("model", LogisticRegression(
                class_weight="balanced",
                max_iter=1000,
                random_state=42,
            )),
        ]),
        "Gradient Boosting": Pipeline([
            ("prep",  preprocessor),
            ("model", GradientBoostingClassifier(
                n_estimators=100,
                max_depth=3,
                learning_rate=0.1,
                random_state=42,
            )),
        ]),
    }


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Train and evaluate both models
# ─────────────────────────────────────────────────────────────────────────────

def evaluate(model, X_test, y_test) -> dict:
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    return {
        "balanced_accuracy": float(balanced_accuracy_score(y_test, y_pred)),
        "roc_auc":           float(roc_auc_score(y_test, y_prob)),
        "f1":                float(f1_score(y_test, y_pred, zero_division=0)),
        "log_loss":          float(log_loss(y_test, y_prob)),
    }


def train_and_save(X_train, X_test, y_train, y_test) -> dict:
    preprocessor = build_preprocessor()
    models       = build_models(preprocessor)
    results      = {}

    for name, pipeline in models.items():
        print(f"[TRAIN] Fitting {name}...")
        pipeline.fit(X_train, y_train)
        metrics = evaluate(pipeline, X_test, y_test)
        results[name] = {"model": pipeline, "metrics": metrics}

        print(
            f"[TRAIN] {name} — "
            f"balanced_acc: {metrics['balanced_accuracy']:.3f} | "
            f"roc_auc: {metrics['roc_auc']:.3f} | "
            f"f1: {metrics['f1']:.3f} | "
            f"log_loss: {metrics['log_loss']:.3f}"
        )

    # ── Save Gradient Boosting as model.pkl (what score.py loads) ─────
    gb_model = results["Gradient Boosting"]["model"]
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(gb_model, f)
    print(f"[TRAIN] Saved model → {MODEL_PATH}")

    # ── Save metadata ─────────────────────────────────────────────────
    metadata = {
        "model_name":       "donor_lapse_risk",
        "model_version":    MODEL_VERSION,
        "trained_at_utc":   datetime.utcnow().isoformat(),
        "modeling_table":   MODELING_TABLE,
        "label":            LABEL_COL,
        "numeric_features": NUMERIC_FEATURES,
        "cat_features":     CATEGORICAL_FEATURES,
        "train_rows":       int(len(X_train)),
        "test_rows":        int(len(X_test)),
        "deployed_model":   "Gradient Boosting",
    }
    with open(DONOR_CHURN_METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[TRAIN] Saved metadata → {DONOR_CHURN_METADATA_PATH}")

    # ── Save metrics for both models ──────────────────────────────────
    metrics_out = {
        name: result["metrics"]
        for name, result in results.items()
    }
    with open(DONOR_CHURN_METRICS_PATH, "w") as f:
        json.dump(metrics_out, f, indent=2)
    print(f"[TRAIN] Saved metrics → {DONOR_CHURN_METRICS_PATH}")

    return results


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def train():
    df                               = load_modeling_table()
    X_train, X_test, y_train, y_test = prepare(df)
    results                          = train_and_save(X_train, X_test, y_train, y_test)

    print("\n[TRAIN] Final results:")
    print(f"{'Metric':25s} | {'Logistic Regression':>20s} | {'Gradient Boosting':>20s}")
    print("-" * 72)
    for metric in ["balanced_accuracy", "roc_auc", "f1", "log_loss"]:
        lr_val = results["Logistic Regression"]["metrics"][metric]
        gb_val = results["Gradient Boosting"]["metrics"][metric]
        print(f"{metric:25s} | {lr_val:20.3f} | {gb_val:20.3f}")

    print("\n[TRAIN] Complete. model.pkl is ready for score.py and run_inference.py.")


if __name__ == "__main__":
    train()