# src/instaloader_client.py
"""
Instaloader client with automatic session initialization.

Usage:
- Call init_session() at app startup to attempt loading/saving a session file.
- Then call fetch_profile_and_posts(...) as before.
"""
from __future__ import annotations
import os
import json
import logging
import time
from typing import Tuple, List, Dict, Optional
from src.common import config

logger = logging.getLogger(__name__)

# Configuration / sample dir
SAMPLE_DIR = os.path.abspath(config.SAMPLE_DATA_DIR)

# Global Instaloader instance (lazy-created)
_L = None  # type: ignore

def _read_json_abs(path: str):
    if not os.path.isabs(path):
        path = os.path.abspath(path)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Sample file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def init_session(timeout_seconds: int = 20) -> bool:
    """
    Initialize a global Instaloader session.
    - If INSTALOADER_SESSION_FILE exists, load it.
    - Else if INSTALOADER_LOGIN + INSTALOADER_PASSWORD set in env, attempt login and save session file.
    Returns True if a session is loaded (authenticated), False otherwise.
    """
    global _L
    try:
        import instaloader  # local import
    except Exception as e:
        logger.warning("Instaloader is not installed or failed to import: %s", e)
        return False

    if _L is None:
        _L = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            save_metadata=False,
            compress_json=False
        )

    session_path = os.getenv("INSTALOADER_SESSION_FILE") or config.INSTALOADER_SESSION_FILE or ""
    login_user = os.getenv("INSTALOADER_LOGIN")
    login_pass = os.getenv("INSTALOADER_PASSWORD")

    # 1) Try load session file if present
    if session_path:
        try:
            if os.path.exists(session_path):
                _L.load_session_from_file(filename=session_path)
                logger.info("Loaded Instaloader session from %s", session_path)
                return True
            else:
                logger.info("INSTALOADER_SESSION_FILE set but file not found: %s", session_path)
        except Exception as e:
            logger.warning("Failed to load session file %s: %s", session_path, e)

    # 2) Try programmatic login if credentials provided
    if login_user and login_pass:
        try:
            logger.info("Attempting Instaloader login for %s (programmatic)", login_user)
            # This may raise if 2FA required or credentials invalid
            _L.login(login_user, login_pass)
            # Save session file if session_path configured
            if session_path:
                try:
                    _L.save_session_to_file(filename=session_path)
                    logger.info("Saved Instaloader session to %s", session_path)
                except Exception as e:
                    logger.warning("Failed to save session file to %s: %s", session_path, e)
            return True
        except Exception as e:
            # Common reasons: 2FA required, incorrect credentials, or network/IG block
            logger.warning("Programmatic instaloader login failed: %s", e)
            logger.debug("Programmatic instaloader login exception", exc_info=True)

    # No session
    logger.info("No Instaloader session available (anonymous mode). Provide INSTALOADER_SESSION_FILE or env credentials for authenticated scraping.")
    return False

def fetch_profile_and_posts(username: str, posts_limit: int = 10, sample: bool = False,
                            max_attempts: int = 4, backoff_base: float = 1.0) -> Tuple[Dict, List[Dict]]:
    """
    Returns (profile_dict, posts_list)
    - In sample mode, reads files from SAMPLE_DIR
    - Otherwise uses the global Instaloader instance _L (init_session should be called on startup)
    """
    global _L

    if sample:
        profile_path = os.path.join(SAMPLE_DIR, "sample_profile.json")
        posts_path = os.path.join(SAMPLE_DIR, "sample_posts.json")
        logger.info("Using sample data from %s", SAMPLE_DIR)
        profile = _read_json_abs(profile_path)
        posts = _read_json_abs(posts_path)
        return profile, posts

    # Lazy import instaloader if needed
    try:
        import instaloader
        from instaloader import ConnectionException
    except Exception as e:
        logger.exception("Instaloader import failed: %s", e)
        raise RuntimeError("Instaloader is required for non-sample mode")

    # Ensure _L exists
    if _L is None:
        _L = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            save_metadata=False,
            compress_json=False
        )
        # try to auto-load session file if config present
        session_path = os.getenv("INSTALOADER_SESSION_FILE") or config.INSTALOADER_SESSION_FILE or ""
        if session_path and os.path.exists(session_path):
            try:
                _L.load_session_from_file(filename=session_path)
                logger.info("Loaded Instaloader session from %s (lazy)", session_path)
            except Exception:
                logger.debug("Failed to lazy-load instaloader session file: %s", session_path)

    try:
        profile_obj = instaloader.Profile.from_username(_L.context, username)
    except Exception as e:
        logger.exception("Instaloader error fetching profile: %s", e)
        raise RuntimeError(f"Instaloader error fetching profile: {e}")

    # Fetch posts with retry on ConnectionException
    attempt = 0
    posts = []
    while attempt < max_attempts:
        try:
            count = 0
            for post in profile_obj.get_posts():
                if count >= posts_limit:
                    break
                p = {
                    "shortcode": getattr(post, "shortcode", None),
                    "caption": getattr(post, "caption", "") or "",
                    "likes": getattr(post, "likes", 0),
                    "comments": getattr(post, "comments", 0),
                    "display_url": (getattr(post, "url", None) or (post.get_display_url() if hasattr(post, "get_display_url") else None)),
                    "taken_at": (post.date_utc.isoformat() if getattr(post, "date_utc", None) else None),
                    "is_video": getattr(post, "is_video", False)
                }
                posts.append(p)
                count += 1
            break  # success
        except ConnectionException as e:
            attempt += 1
            msg = str(e)
            logger.warning("Instaloader ConnectionException (attempt %d/%d): %s", attempt, max_attempts, msg)
            if attempt >= max_attempts:
                logger.exception("Exceeded max attempts fetching posts for %s", username)
                raise RuntimeError(f"Instaloader error fetching posts: {msg}")
            sleep_seconds = backoff_base * (2 ** (attempt - 1))
            logger.info("Sleeping %.1fs before retrying...", sleep_seconds)
            time.sleep(sleep_seconds)
        except Exception as e:
            logger.exception("Unexpected error while iterating posts: %s", e)
            raise RuntimeError(f"Instaloader error fetching posts: {e}")

    profile = {
        "username": profile_obj.username,
        "full_name": profile_obj.full_name,
        "profile_pic_url": getattr(profile_obj, "profile_pic_url", None),
        "followers": getattr(profile_obj, "followers", 0),
        "followees": getattr(profile_obj, "followees", 0),
        "posts_count": getattr(profile_obj, "mediacount", 0),
        "biography": getattr(profile_obj, "biography", "") or ""
    }

    return profile, posts
