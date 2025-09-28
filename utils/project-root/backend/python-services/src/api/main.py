# src/api/main.py
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# your startup instaloader init
from src.instaloader_client import init_session

# import routes module (router defined here)
from src.api import routes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("insta_scraper_api")

app = FastAPI(title="Instagram Scraper API")

# include the router so endpoints in src/api/routes.py are registered
# note: this registers routes under /api/... (so POST /api/scrape)
app.include_router(routes.router, prefix="/api")

# Add CORS (adjust allow_origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # lock this down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _on_startup():
    logger.info("App startup: initializing Instaloader session (if configured)...")
    try:
        ok = init_session()
        if ok:
            logger.info("Instaloader session ready.")
        else:
            logger.info("No authenticated Instaloader session (will use anonymous requests).")
    except Exception as e:
        logger.exception("Error initializing instaloader session at startup: %s", e)

@app.get("/health")
async def health():
    """Simple health check used by readiness/liveness probes."""
    return {"status": "ok"}
