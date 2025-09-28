# src/jobs/job_store.py
import uuid
from datetime import datetime
import logging
from src.common.db import get_collection

_logger = logging.getLogger(__name__)
_jobs_coll = get_collection("jobs")

def _now_iso():
    return datetime.utcnow().isoformat()

def create_job(username: str, posts: int = 10, analyze: bool = True, sample: bool = False) -> str:
    job_id = str(uuid.uuid4())
    doc = {
        "job_id": job_id,
        "username": username,
        "status": "queued",
        "message": "Job queued",
        "created_at": _now_iso(),
        "started_at": None,
        "finished_at": None,
        "params": {"posts": int(posts), "analyze": bool(analyze), "sample": bool(sample)}
    }
    _jobs_coll.insert_one(doc)
    _logger.info("Job created: %s for %s", job_id, username)
    return job_id

def update_job(job_id: str, **kwargs):
    if not kwargs:
        return
    _jobs_coll.update_one({"job_id": job_id}, {"$set": kwargs})

def get_job(job_id: str):
    return _jobs_coll.find_one({"job_id": job_id})
