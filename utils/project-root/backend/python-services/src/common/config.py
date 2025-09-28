# src/common/config.py
from pathlib import Path
import os
from dotenv import load_dotenv

# Load .env if present
ROOT = Path(__file__).resolve().parents[1]  # src/
ENV_PATH = ROOT.parent / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()  # fallback to environment

# Defaults
PY_MONGO_URI = os.getenv("PY_MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "insta_scraper")
MEDIA_TEMP_DIR = os.getenv("MEDIA_TEMP_DIR", "/tmp/insta_media")
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "10"))
SAMPLE_DATA_DIR = os.getenv("SAMPLE_DATA_DIR", str(ROOT / "sample_data"))
INSTALOADER_SESSION_FILE = os.getenv("INSTALOADER_SESSION_FILE", "")
