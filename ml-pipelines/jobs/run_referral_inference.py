"""
run_referral_inference.py — Pipeline 5: Post Recommendation (Referral Prediction)
Loads the trained referral classifier + regressor, reads social_media_posts from
Azure SQL, builds a 7-day posting schedule by scoring candidate post configurations,
and writes results to the posting_schedule table.

This is what the C# API reads from. The app never touches ML code —
it just queries posting_schedule like any other table.

Chapter 17 pattern:
    load models → load live data → build candidates → score → pick winners → write to DB

Run:
    cd ml-pipelines/jobs
    python run_referral_inference.py
"""

import json
from datetime import date, datetime, timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from config import REFERRAL_CLASSIFIER_PATH, REFERRAL_REGRESSOR_PATH, REFERRAL_METADATA_PATH
from utils_db import azure_sql_conn, read_query

POSTING_SCHEDULE_TABLE = "posting_schedule"
SCHEDULE_DAYS = 7

# Features the model was trained on (from selected_feature_names.json)
SELECTED_FEATURES = [
    "platform", "day_of_week", "post_hour", "post_type", "media_type",
    "num_hashtags", "mentions_count", "has_call_to_action", "call_to_action_type",
    "sentiment_tone", "caption_length", "features_resident_story", "is_boosted",
    "post_month", "post_year",
]


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Load trained models
# ─────────────────────────────────────────────────────────────────────────────

def load_models():
    for path in [REFERRAL_CLASSIFIER_PATH, REFERRAL_REGRESSOR_PATH, REFERRAL_METADATA_PATH]:
        if not path.exists():
            raise FileNotFoundError(
                f"Artifact not found: {path}. "
                "Run referral_training.ipynb first."
            )

    classifier = joblib.load(REFERRAL_CLASSIFIER_PATH)
    regressor  = joblib.load(REFERRAL_REGRESSOR_PATH)
    with open(REFERRAL_METADATA_PATH) as f:
        metadata = json.load(f)

    print(f"[REF] Loaded classifier (CV AUC: {metadata.get('cv_roc_auc_mean', '?'):.3f})")
    print(f"[REF] Loaded regressor  (CV MAE log: {metadata.get('cv_neg_mae_log_mean', '?'):.3f})")
    return classifier, regressor, metadata


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Load historical posts from Azure SQL
# ─────────────────────────────────────────────────────────────────────────────

def load_post_history() -> pd.DataFrame:
    print("[REF] Loading social_media_posts from Azure SQL...")
    feature_list = ", ".join(SELECTED_FEATURES)
    df = read_query(f"SELECT {feature_list} FROM social_media_posts")
    print(f"[REF] {len(df)} historical posts loaded")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Build 7-day candidate table
# ─────────────────────────────────────────────────────────────────────────────

def build_candidates(df: pd.DataFrame, n_days: int = SCHEDULE_DAYS) -> pd.DataFrame:
    """
    Unique combinations of non-temporal selected features, cross-joined with
    the next N calendar days. day_of_week, post_month, post_year refreshed per day.
    """
    key_cols = [c for c in SELECTED_FEATURES if c not in ("day_of_week", "post_month", "post_year")]
    templates = df[SELECTED_FEATURES].drop_duplicates(subset=key_cols)

    today = date.today()
    rows = []
    for i in range(n_days):
        target_date = today + timedelta(days=i)
        for _, row in templates.iterrows():
            r = row.copy()
            r["day_of_week"] = target_date.strftime("%A")
            r["post_month"]  = target_date.strftime("%Y-%m")
            r["post_year"]   = int(target_date.year)
            r["_schedule_date"] = target_date.isoformat()
            rows.append(r)

    candidates = pd.DataFrame(rows)
    print(f"[REF] {len(candidates)} candidates built for {n_days} days")
    return candidates


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Score candidates and pick daily winners
# ─────────────────────────────────────────────────────────────────────────────

def score_and_pick_winners(
    candidates: pd.DataFrame,
    classifier,
    regressor,
) -> pd.DataFrame:
    dates    = candidates["_schedule_date"].values
    X        = candidates[SELECTED_FEATURES]

    p_any    = classifier.predict_proba(X)[:, 1]
    pred_log = regressor.predict(X)
    pred_cnt = np.maximum(0, np.expm1(pred_log))

    scored = candidates.copy()
    scored["p_any_referral"]      = p_any
    scored["predicted_referrals"] = pred_cnt

    # Pick highest predicted_referrals per day
    winners = (
        scored.sort_values(["_schedule_date", "predicted_referrals"], ascending=[True, False])
        .groupby("_schedule_date", as_index=False)
        .first()
    )

    print(f"[REF] {len(winners)} daily winners selected")
    return winners


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: Write schedule to Azure SQL via MERGE upsert
# ─────────────────────────────────────────────────────────────────────────────

def write_posting_schedule(winners: pd.DataFrame) -> None:
    with azure_sql_conn() as conn:
        cursor = conn.cursor()
        cursor.execute(f"""
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = '{POSTING_SCHEDULE_TABLE}'
            )
            BEGIN
                CREATE TABLE [{POSTING_SCHEDULE_TABLE}] (
                    schedule_date            DATE          PRIMARY KEY,
                    platform                 NVARCHAR(50),
                    day_of_week              NVARCHAR(20),
                    post_hour                INT,
                    post_type                NVARCHAR(50),
                    media_type               NVARCHAR(50),
                    sentiment_tone           NVARCHAR(50),
                    has_call_to_action       BIT,
                    call_to_action_type      NVARCHAR(50),
                    is_boosted               BIT,
                    features_resident_story  BIT,
                    p_any_referral           FLOAT,
                    predicted_referrals      FLOAT,
                    computed_at              DATETIME2
                )
            END
        """)
        conn.commit()

        merge_sql = f"""
            MERGE [{POSTING_SCHEDULE_TABLE}] AS target
            USING (VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)) AS source (
                schedule_date, platform, day_of_week, post_hour, post_type,
                media_type, sentiment_tone, has_call_to_action, call_to_action_type,
                is_boosted, features_resident_story, p_any_referral,
                predicted_referrals, computed_at
            )
            ON target.schedule_date = source.schedule_date
            WHEN MATCHED THEN UPDATE SET
                platform                = source.platform,
                day_of_week             = source.day_of_week,
                post_hour               = source.post_hour,
                post_type               = source.post_type,
                media_type              = source.media_type,
                sentiment_tone          = source.sentiment_tone,
                has_call_to_action      = source.has_call_to_action,
                call_to_action_type     = source.call_to_action_type,
                is_boosted              = source.is_boosted,
                features_resident_story = source.features_resident_story,
                p_any_referral          = source.p_any_referral,
                predicted_referrals     = source.predicted_referrals,
                computed_at             = source.computed_at
            WHEN NOT MATCHED THEN INSERT (
                schedule_date, platform, day_of_week, post_hour, post_type,
                media_type, sentiment_tone, has_call_to_action, call_to_action_type,
                is_boosted, features_resident_story, p_any_referral,
                predicted_referrals, computed_at
            ) VALUES (
                source.schedule_date, source.platform, source.day_of_week,
                source.post_hour, source.post_type, source.media_type,
                source.sentiment_tone, source.has_call_to_action,
                source.call_to_action_type, source.is_boosted,
                source.features_resident_story, source.p_any_referral,
                source.predicted_referrals, source.computed_at
            );
        """

        winners = winners.rename(columns={"_schedule_date": "schedule_date"})
        now = datetime.utcnow().isoformat()

        def _bit(val):
            if val is None or (isinstance(val, float) and np.isnan(val)):
                return None
            return bool(val)

        rows = [
            (
                r.schedule_date,
                str(r.platform) if pd.notna(r.platform) else None,
                str(r.day_of_week),
                int(r.post_hour) if pd.notna(r.post_hour) else None,
                str(r.post_type) if pd.notna(r.post_type) else None,
                str(r.media_type) if pd.notna(r.media_type) else None,
                str(r.sentiment_tone) if pd.notna(r.sentiment_tone) else None,
                _bit(r.has_call_to_action),
                str(r.call_to_action_type) if pd.notna(r.call_to_action_type) else None,
                _bit(r.is_boosted),
                _bit(r.features_resident_story),
                float(r.p_any_referral),
                float(r.predicted_referrals),
                now,
            )
            for r in winners.itertuples(index=False)
        ]
        cursor.executemany(merge_sql, rows)
        conn.commit()

    print(f"[REF] {len(rows)} rows written to [{POSTING_SCHEDULE_TABLE}].")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def run_inference():
    print("=" * 60)
    print("REFERRAL PREDICTION INFERENCE PIPELINE")
    print("=" * 60)

    classifier, regressor, metadata = load_models()
    history    = load_post_history()
    candidates = build_candidates(history, n_days=SCHEDULE_DAYS)
    winners    = score_and_pick_winners(candidates, classifier, regressor)

    print("[REF] Writing to Azure SQL...")
    write_posting_schedule(winners)

    print("\n[REF] Complete. posting_schedule table ready for the C# API.")
    print(f"\n{'Date':12s} {'Platform':12s} {'Type':20s} {'Hour':>5s} {'Pred Referrals':>15s}")
    print("-" * 68)
    for r in winners.itertuples(index=False):
        print(f"{r.schedule_date:12s} {str(r.platform):12s} {str(r.post_type):20s} "
              f"{int(r.post_hour) if pd.notna(r.post_hour) else 0:5d} {r.predicted_referrals:15.2f}")


if __name__ == "__main__":
    run_inference()
