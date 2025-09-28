# src/api/schemas.py
from __future__ import annotations
from typing import Optional, Any, Dict
from pydantic import BaseModel, Field


class ScrapeRequest(BaseModel):
    username: str = Field(..., description="Instagram username to scrape")
    posts: Optional[int] = Field(10, ge=1, description="How many recent posts to fetch")
    analyze: Optional[bool] = Field(True, description="Whether to run image analysis")
    sample: Optional[bool] = Field(False, description="If true, use sample_data instead of Instaloader")


class ScrapeResponse(BaseModel):
    job_id: str
    status: str


class JobStatus(BaseModel):
    job_id: str
    username: str
    status: str
    message: Optional[str] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
