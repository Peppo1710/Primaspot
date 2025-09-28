# src/jobs/worker.py
import logging
import traceback
from datetime import datetime
from src.jobs import job_store
from src.instaloader_client import fetch_profile_and_posts
from src.common.db import get_collection
from src.storage import download_media_for_post
from src.analyzer.image_analysis import analyze_image

_logger = logging.getLogger(__name__)
_profiles = get_collection("profiles")
_posts = get_collection("posts")

def _now_iso():
    return datetime.utcnow().isoformat()

def run_job_background(job_id: str):
    """
    Background job executed by FastAPI BackgroundTasks.
    Updates job status in jobs collection.
    """
    try:
        job_store.update_job(job_id, status="running", started_at=_now_iso(), message="Job started")
        job_doc = job_store.get_job(job_id)
        if not job_doc:
            _logger.warning("Job %s not found during run", job_id)
            return

        username = job_doc["username"]
        params = job_doc.get("params", {})
        posts_limit = params.get("posts", 10)
        analyze = params.get("analyze", True)
        sample = params.get("sample", False)

        # fetch profile & posts (metadata only)
        profile, posts = fetch_profile_and_posts(username, posts_limit, sample=sample)

        # upsert profile
        _profiles.update_one(
            {"username": profile["username"]},
            {"$set": {**profile, "last_scraped_at": _now_iso()}},
            upsert=True
        )

        # upsert posts metadata
        for p in posts:
            key = {"shortcode": p.get("shortcode")}
            _posts.update_one(
                key,
                {"$set": {**p, "username": profile["username"], "scraped_at": _now_iso()}},
                upsert=True
            )

        # perform analysis if requested
        if analyze:
            for p in posts:
                shortcode = p.get("shortcode")
                try:
                    local_path = download_media_for_post(p)
                    analysis = analyze_image(local_path, caption=p.get("caption", ""))
                except Exception as e:
                    _logger.exception("Analysis error for %s: %s", shortcode, e)
                    analysis = {"tags": [], "vibe": "unknown", "lighting_score": 0.0, "quality_score": 0.0, "faces_count": 0}

                _posts.update_one(
                    {"shortcode": shortcode},
                    {"$set": {"analysis": analysis, "analyzed_at": _now_iso()}}
                )

        job_store.update_job(job_id, status="completed", finished_at=_now_iso(), message="Job completed")
        _logger.info("Job %s completed", job_id)
    except Exception as e:
        _logger.exception("Job %s failed: %s", job_id, e)
        tb = traceback.format_exc()
        job_store.update_job(job_id, status="failed", finished_at=_now_iso(), message=f"Job failed: {str(e)}\n{tb}")
