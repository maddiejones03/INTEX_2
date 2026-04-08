"""
config.py — Shared paths and database connection for all ML pipeline jobs.
Mirrors the Chapter 17 pattern but targets Azure SQL via pyodbc + ODBC Driver 18.

All jobs import from here. Never hardcode paths or credentials elsewhere.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ── Load .env file if present (local dev) ────────────────────────────────────
# On Azure App Service, these same keys are set as Application Settings
# (environment variables), so load_dotenv() quietly does nothing there.
load_dotenv()

# ── Project layout ────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[1]  # one level above /jobs

ARTIFACTS_DIR = PROJECT_ROOT / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)    # create on first run


# ── Model artifact paths ──────────────────────────────────────────────────────
# One trio of paths per pipeline: model .sav, metadata .json, metrics .json
# Add a new trio here each time you add a pipeline.

# Pipeline 1: Donor Lapse Risk Classifier
DONOR_CHURN_MODEL_PATH    = ARTIFACTS_DIR / "donor_churn_model.sav"
DONOR_CHURN_METADATA_PATH = ARTIFACTS_DIR / "donor_churn_metadata.json"
DONOR_CHURN_METRICS_PATH  = ARTIFACTS_DIR / "donor_churn_metrics.json"

# Pipeline 2: Resident Reintegration Readiness (or whatever Pipeline 2 predicts)
PIPELINE2_MODEL_PATH    = ARTIFACTS_DIR / "pipeline2_model.sav"
PIPELINE2_METADATA_PATH = ARTIFACTS_DIR / "pipeline2_metadata.json"
PIPELINE2_METRICS_PATH  = ARTIFACTS_DIR / "pipeline2_metrics.json"

# Pipeline 3: Early Warning Model (q2c_early_warning_model)
EARLY_WARNING_MODEL_PATH    = ARTIFACTS_DIR / "early_warning_model.sav"
EARLY_WARNING_METADATA_PATH = ARTIFACTS_DIR / "early_warning_metadata.json"
EARLY_WARNING_METRICS_PATH  = ARTIFACTS_DIR / "early_warning_metrics.json"

# Pipeline 4: Social Media Performance
SOCIAL_MEDIA_MODEL_PATH    = ARTIFACTS_DIR / "social_media_model.sav"
SOCIAL_MEDIA_METADATA_PATH = ARTIFACTS_DIR / "social_media_metadata.json"
SOCIAL_MEDIA_METRICS_PATH  = ARTIFACTS_DIR / "social_media_metrics.json"


# ── Azure SQL connection string (pyodbc) ──────────────────────────────────────
def get_connection_string() -> str:
    """
    Builds a pyodbc connection string from environment variables.

    Required variables (set in .env locally, App Settings on Azure):
        AZURE_SQL_SERVER   — e.g. intex-server-maddie.database.windows.net
        AZURE_SQL_DATABASE — e.g. intex-db
        AZURE_SQL_USERNAME — e.g. intexadmin
        AZURE_SQL_PASSWORD — your password

    Raises a clear KeyError if any variable is missing,
    rather than a cryptic connection failure.
    """
    server   = os.environ["AZURE_SQL_SERVER"]
    database = os.environ["AZURE_SQL_DATABASE"]
    username = os.environ["AZURE_SQL_USERNAME"]
    password = os.environ["AZURE_SQL_PASSWORD"]

    return (
        "DRIVER={ODBC Driver 18 for SQL Server};"
        f"SERVER={server},1433;"
        f"DATABASE={database};"
        f"UID={username};"
        f"PWD={password};"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=30;"
    )