"""
run_referral_inference.py — Pipeline 5: Post Recommendation (Referral Prediction)
Loads the trained referral classifier + regressor, reads social_media_posts from
Azure SQL, builds a multi-platform 7-day posting schedule by:

  1. Scoring every candidate post configuration with the ML models
  2. Distributing posts across platforms at the correct weekly frequency
  3. Enforcing a content mix (awareness / emotional-story / fundraising / engagement)
  4. Rotating CTA types across the week
  5. Boosting only the top-2 highest-predicted-referral posts

This is what the C# API reads from. The app never touches ML code —
it just queries posting_schedule like any other table.

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
SCHEDULE_DAYS          = 7
BOOSTED_TOP_N          = 2   # only the top-2 posts by predicted referrals get is_boosted=True

# Posts per platform per week (capped to sensible defaults within best-practice ranges).
# Platforms not found in the historical data are skipped automatically.
PLATFORM_WEEKLY_POSTS = {
    "WhatsApp":  5,    # 4–5x/week (high-trust channel, don't overpost)
    "YouTube":   4,    # 3–5x/week
    "TikTok":   14,    # 2x/day (mid-range of 1–3)
    "Instagram": 7,    # 1x/day feed
    "Facebook":  5,    # 4–5x/week
    "LinkedIn":  4,    # 3–5x/week
    "Twitter":   21,   # 3x/day (lower of 3–5 range; included if present in data)
}

# Weekly post-type mix targets (proportions, normalised to sum to 1.0)
# Based on nonprofit fundraising best-practice guidelines.
_RAW_POST_TYPE_MIX = {
    "ImpactStory":        0.325,   # 30–35% — highest donation driver
    "FundraisingAppeal":  0.175,   # 15–20% — direct asks
    "Campaign":           0.175,   # 15–20% — tied to fundraising pushes
    "ThankYou":           0.150,   # 15%    — donor retention
    "EducationalContent": 0.125,   # 10–15% — trust/awareness building
    "EventPromotion":     0.075,   # 5–10%  — lowest direct donation driver
}
_total = sum(_RAW_POST_TYPE_MIX.values())
POST_TYPE_MIX = {k: v / _total for k, v in _RAW_POST_TYPE_MIX.items()}

# Features the model was trained on
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

    print(f"[REF] Loaded classifier (CV AUC: {metadata.get('cv_roc_auc_mean', 0):.3f})")
    print(f"[REF] Loaded regressor  (CV MAE log: {metadata.get('cv_neg_mae_log_mean', 0):.3f})")
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
# STEP 3: Build candidate table (unique feature combos × 7 days)
# ─────────────────────────────────────────────────────────────────────────────

def build_candidates(df: pd.DataFrame, n_days: int = SCHEDULE_DAYS) -> pd.DataFrame:
    """
    Unique combinations of non-temporal selected features cross-joined with the
    next N calendar days. day_of_week, post_month, post_year are refreshed per day.
    """
    key_cols   = [c for c in SELECTED_FEATURES if c not in ("day_of_week", "post_month", "post_year")]
    templates  = df[SELECTED_FEATURES].drop_duplicates(subset=key_cols)

    today = date.today()
    rows  = []
    for i in range(n_days):
        target_date = today + timedelta(days=i)
        for _, row in templates.iterrows():
            r                   = row.copy()
            r["day_of_week"]    = target_date.strftime("%A")
            r["post_month"]     = target_date.strftime("%Y-%m")
            r["post_year"]      = int(target_date.year)
            r["_schedule_date"] = target_date.isoformat()
            rows.append(r)

    candidates = pd.DataFrame(rows)
    print(f"[REF] {len(candidates)} candidates built for {n_days} days")
    return candidates


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Score and build weekly schedule
# ─────────────────────────────────────────────────────────────────────────────

def _needed_post_type(post_type_counts: dict, total_assigned: int) -> str:
    """Return the post type most below its target proportion."""
    if total_assigned == 0:
        return "ImpactStory"
    deficits = {
        pt: POST_TYPE_MIX[pt] - (post_type_counts[pt] / total_assigned)
        for pt in POST_TYPE_MIX
    }
    return max(deficits, key=deficits.get)


def build_weekly_schedule(
    candidates: pd.DataFrame,
    classifier,
    regressor,
) -> pd.DataFrame:
    """
    Score every candidate with the ML models, then select posts for each
    (platform, day, slot) according to frequency rules and content mix targets.
    Returns a DataFrame ready to write to posting_schedule.
    """
    # Score all candidates
    X        = candidates[SELECTED_FEATURES]
    p_any    = classifier.predict_proba(X)[:, 1]
    pred_log = regressor.predict(X)
    pred_cnt = np.maximum(0, np.expm1(pred_log))

    scored = candidates.copy()
    scored["p_any_referral"]      = p_any
    scored["predicted_referrals"] = pred_cnt

    # Only schedule platforms that appear in historical data
    available = set(scored["platform"].dropna().unique())
    active_platforms = {p: n for p, n in PLATFORM_WEEKLY_POSTS.items() if p in available}
    if not active_platforms:
        raise ValueError("[REF] No recognized platforms found in historical posts data.")
    print(f"[REF] Active platforms: {list(active_platforms.keys())}")

    today          = date.today()
    schedule_dates = [today + timedelta(days=i) for i in range(SCHEDULE_DAYS)]

    # Build the ordered list of (date, platform, slot) assignments
    slot_list = []
    for platform, weekly_posts in active_platforms.items():
        base_per_day = weekly_posts // SCHEDULE_DAYS
        extras       = weekly_posts % SCHEDULE_DAYS
        for day_idx, target_date in enumerate(schedule_dates):
            n_slots = base_per_day + (1 if day_idx < extras else 0)
            for slot in range(1, n_slots + 1):
                slot_list.append((target_date, platform, slot))

    # Fill each slot, enforcing post-type mix targets
    post_type_counts = {pt: 0 for pt in POST_TYPE_MIX}
    results          = []

    for target_date, platform, slot in slot_list:
        date_str = target_date.isoformat()

        pool = scored[
            (scored["platform"] == platform) &
            (scored["_schedule_date"] == date_str)
        ]
        if pool.empty:
            continue

        total_so_far   = sum(post_type_counts.values())
        available_types = set(pool["post_type"].dropna().unique())

        # Walk post types in deficit order until one is available in this pool.
        # This enforces the mix even when some types are missing for a given platform/date.
        deficits = sorted(
            POST_TYPE_MIX.keys(),
            key=lambda pt: POST_TYPE_MIX[pt] - (post_type_counts[pt] / max(total_so_far, 1)),
            reverse=True,
        )
        pt_pool = pd.DataFrame()
        for candidate_pt in deficits:
            if candidate_pt in available_types:
                pt_pool = pool[pool["post_type"] == candidate_pt]
                if not pt_pool.empty:
                    break

        # Last resort: any post in pool (should be extremely rare)
        best_pool = pt_pool if not pt_pool.empty else pool
        best      = best_pool.sort_values("predicted_referrals", ascending=False).iloc[0]
        actual_pt = str(best["post_type"]) if pd.notna(best["post_type"]) else "ImpactStory"

        if actual_pt in post_type_counts:
            post_type_counts[actual_pt] += 1

        cta = best.get("call_to_action_type")

        results.append({
            "schedule_date":          date_str,
            "slot":                   slot,
            "platform":               best["platform"],
            "day_of_week":            target_date.strftime("%A"),
            "post_hour":              best["post_hour"],
            "post_type":              best["post_type"],
            "media_type":             best["media_type"],
            "sentiment_tone":         best["sentiment_tone"],
            "has_call_to_action":     best["has_call_to_action"],
            "call_to_action_type":    cta if pd.notna(cta) else None,
            "is_boosted":             False,   # assigned below
            "features_resident_story": best.get("features_resident_story"),
            "p_any_referral":         float(best["p_any_referral"]),
            "predicted_referrals":    float(best["predicted_referrals"]),
        })

    schedule = pd.DataFrame(results)

    # Mark top-N posts by predicted referrals as boosted
    if not schedule.empty and BOOSTED_TOP_N > 0:
        top_idx = schedule["predicted_referrals"].nlargest(BOOSTED_TOP_N).index
        schedule.loc[top_idx, "is_boosted"] = True

    # Summary
    total = len(schedule)
    print(f"[REF] {total} posts scheduled across {len(active_platforms)} platforms")
    print(f"[REF] Post type mix: { {k: v for k, v in post_type_counts.items() if v > 0} }")
    print(f"[REF] Boosted posts: {int(schedule['is_boosted'].sum())}")

    return schedule


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: Write schedule to Azure SQL (DELETE + INSERT)
# ─────────────────────────────────────────────────────────────────────────────

def write_posting_schedule(schedule: pd.DataFrame) -> None:
    with azure_sql_conn() as conn:
        cursor = conn.cursor()

        # Create table if it doesn't exist yet (first run or after migration)
        cursor.execute(f"""
            IF NOT EXISTS (
                SELECT 1 FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = '{POSTING_SCHEDULE_TABLE}'
            )
            BEGIN
                CREATE TABLE [{POSTING_SCHEDULE_TABLE}] (
                    schedule_id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    schedule_date            DATE              NOT NULL,
                    slot                     INT               NOT NULL DEFAULT 1,
                    platform                 NVARCHAR(50)      NULL,
                    day_of_week              NVARCHAR(20)      NULL,
                    post_hour                INT               NULL,
                    post_type                NVARCHAR(50)      NULL,
                    media_type               NVARCHAR(50)      NULL,
                    sentiment_tone           NVARCHAR(50)      NULL,
                    has_call_to_action       BIT               NULL,
                    call_to_action_type      NVARCHAR(50)      NULL,
                    is_boosted               BIT               NULL,
                    features_resident_story  BIT               NULL,
                    p_any_referral           FLOAT             NULL,
                    predicted_referrals      FLOAT             NULL,
                    computed_at              DATETIME2         NULL,
                    CONSTRAINT UQ_posting_schedule_date_platform_slot
                        UNIQUE (schedule_date, platform, slot)
                )
            END
        """)
        conn.commit()

        # Delete this week's window and re-insert fresh
        today    = date.today().isoformat()
        end_date = (date.today() + timedelta(days=SCHEDULE_DAYS)).isoformat()
        cursor.execute(
            f"DELETE FROM [{POSTING_SCHEDULE_TABLE}] "
            f"WHERE schedule_date >= ? AND schedule_date < ?",
            (today, end_date),
        )
        conn.commit()

        insert_sql = f"""
            INSERT INTO [{POSTING_SCHEDULE_TABLE}] (
                schedule_date, slot, platform, day_of_week, post_hour, post_type,
                media_type, sentiment_tone, has_call_to_action, call_to_action_type,
                is_boosted, features_resident_story, p_any_referral,
                predicted_referrals, computed_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """

        now = datetime.utcnow().isoformat()

        def _bit(val):
            if val is None or (isinstance(val, float) and np.isnan(val)):
                return None
            return bool(val)

        rows = [
            (
                r.schedule_date,
                int(r.slot),
                str(r.platform)          if pd.notna(r.platform)          else None,
                str(r.day_of_week),
                int(r.post_hour)         if pd.notna(r.post_hour)         else None,
                str(r.post_type)         if pd.notna(r.post_type)         else None,
                str(r.media_type)        if pd.notna(r.media_type)        else None,
                str(r.sentiment_tone)    if pd.notna(r.sentiment_tone)    else None,
                _bit(r.has_call_to_action),
                str(r.call_to_action_type) if pd.notna(r.call_to_action_type) else None,
                _bit(r.is_boosted),
                _bit(r.features_resident_story),
                float(r.p_any_referral),
                float(r.predicted_referrals),
                now,
            )
            for r in schedule.itertuples(index=False)
        ]
        cursor.executemany(insert_sql, rows)
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
    schedule   = build_weekly_schedule(candidates, classifier, regressor)

    print("[REF] Writing to Azure SQL...")
    write_posting_schedule(schedule)

    print("\n[REF] Complete. posting_schedule table ready for the C# API.")
    print(f"\n{'Date':12s} {'Platform':12s} {'Slot':>4s} {'Type':20s} "
          f"{'Hour':>5s} {'Pred Ref':>10s} {'Boost':>6s}")
    print("-" * 75)
    for r in schedule.sort_values(["schedule_date", "platform", "slot"]).itertuples(index=False):
        boost = "YES" if r.is_boosted else ""
        print(f"{r.schedule_date:12s} {str(r.platform):12s} {int(r.slot):4d} "
              f"{str(r.post_type):20s} "
              f"{int(r.post_hour) if pd.notna(r.post_hour) else 0:5d} "
              f"{r.predicted_referrals:10.2f} {boost:>6s}")


if __name__ == "__main__":
    run_inference()
