# src/api/routes.py
from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
import logging

from src.api.schemas import ScrapeRequest, ScrapeResponse
from src.jobs import job_store, worker

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/scrape", response_model=ScrapeResponse, status_code=status.HTTP_202_ACCEPTED)
def post_scrape(body: ScrapeRequest, background_tasks: BackgroundTasks):
    """
    Trigger a scrape job. Creates a job doc in MongoDB and schedules the background worker.
    Returns immediately with job_id and status "queued".
    """
    # create job record
    try:
        job_id = job_store.create_job(body.username, posts=body.posts, analyze=body.analyze, sample=body.sample)
    except Exception as e:
        logger.exception("Failed to create job for %s: %s", body.username, e)
        raise HTTPException(status_code=500, detail="Failed to create job")

    # schedule background task
    try:
        background_tasks.add_task(worker.run_job_background, job_id)
        logger.info("Scheduled background job %s for username=%s", job_id, body.username)
    except Exception as e:
        # If scheduling fails, mark job failed
        logger.exception("Failed to schedule background job %s: %s", job_id, e)
        job_store.update_job(job_id, status="failed", message=f"Failed to schedule: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to schedule background job")

    return {"job_id": job_id, "status": "queued"}

@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    """
    Return job document (job_id, username, status, message, created_at, started_at, finished_at, params).
    """
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    # remove internal Mongo _id if present
    job.pop("_id", None)
    return job
