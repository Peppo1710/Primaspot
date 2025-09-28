# src/storage.py
"""
Media download helper. Downloads a media URL (display_url) to a temp dir specified in config.MEDIA_TEMP_DIR.
Returns local path or None on failure.
"""
import os
import uuid
import logging
from urllib.parse import urlparse
import requests
from src.common import config

logger = logging.getLogger(__name__)
os.makedirs(config.MEDIA_TEMP_DIR, exist_ok=True)

def download_media_for_post(post: dict, timeout: int | None = None) -> str | None:
    """
    Download display_url -> local file path
    post: dict with 'display_url' and 'shortcode' keys
    Returns path or None
    """
    url = post.get("display_url")
    if not url:
        return None
    timeout = timeout or config.REQUEST_TIMEOUT
    try:
        resp = requests.get(url, stream=True, timeout=timeout)
        resp.raise_for_status()
        ext = os.path.splitext(urlparse(url).path)[1] or ".jpg"
        fname = f"{post.get('shortcode') or uuid.uuid4()}{ext}"
        path = os.path.join(config.MEDIA_TEMP_DIR, fname)
        with open(path, "wb") as f:
            for chunk in resp.iter_content(1024 * 32):
                if not chunk:
                    break
                f.write(chunk)
        logger.info("Downloaded media for %s -> %s", post.get("shortcode"), path)
        return path
    except Exception as e:
        logger.debug("Failed to download media %s: %s", url, e)
        return None
