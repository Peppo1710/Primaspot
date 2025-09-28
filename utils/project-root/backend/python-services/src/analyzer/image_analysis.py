# src/analyzer/image_analysis.py
"""
Robust image analysis with lazy imports of cv2 and numpy.

Provides:
- analyze_image(path, caption) -> dict with tags, vibe, lighting_score, quality_score, faces_count

If cv2 / numpy is unavailable, returns a caption-only fallback.
"""

from typing import Dict, List
import os
import logging

logger = logging.getLogger(__name__)

_cv2 = None
_np = None
_HAAR_PATH = None

def _ensure_cv2() -> bool:
    """
    Lazy-import OpenCV and numpy. Determine Haar cascade path in a robust way.
    Returns True if cv2 is available and usable, False otherwise.
    """
    global _cv2, _np, _HAAR_PATH
    if _cv2 is not None:
        return True
    try:
        import cv2 as cv2_mod
        import numpy as np_mod
        _cv2 = cv2_mod
        _np = np_mod
        # try typical attribute
        try:
            _HAAR_PATH = _cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        except Exception:
            # fallback: try to locate the file relative to cv2.__file__
            try:
                cv2_dir = os.path.dirname(_cv2.__file__)
                candidate = os.path.join(cv2_dir, "data", "haarcascade_frontalface_default.xml")
                if os.path.exists(candidate):
                    _HAAR_PATH = candidate
                else:
                    # try package data directories
                    candidate2 = os.path.join(cv2_dir, "..", "share", "opencv4", "haarcascades", "haarcascade_frontalface_default.xml")
                    candidate2 = os.path.normpath(candidate2)
                    if os.path.exists(candidate2):
                        _HAAR_PATH = candidate2
                    else:
                        _HAAR_PATH = None
            except Exception:
                _HAAR_PATH = None
        return True
    except Exception as e:
        logger.debug("cv2/numpy not available: %s", e)
        _cv2 = None
        _np = None
        _HAAR_PATH = None
        return False

def brightness_score(img) -> float:
    if not _ensure_cv2():
        return 0.5
    gray = _cv2.cvtColor(img, _cv2.COLOR_BGR2GRAY)
    mean = float(gray.mean())
    return mean / 255.0

def sharpness_score(img) -> float:
    if not _ensure_cv2():
        return 0.5
    gray = _cv2.cvtColor(img, _cv2.COLOR_BGR2GRAY)
    lap = _cv2.Laplacian(gray, _cv2.CV_64F)
    var = lap.var()
    return float(1.0 - (1.0 / (1.0 + var / 100.0)))

def detect_faces(img) -> int:
    if not _ensure_cv2() or not _HAAR_PATH:
        return 0
    try:
        cascade = _cv2.CascadeClassifier(_HAAR_PATH)
        if cascade.empty():
            # failed to load cascade
            logger.debug("Haar cascade failed to load from %s", _HAAR_PATH)
            return 0
        gray = _cv2.cvtColor(img, _cv2.COLOR_BGR2GRAY)
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        return int(len(faces))
    except Exception as e:
        logger.debug("detect_faces error: %s", e)
        return 0

def tags_from_caption(caption: str) -> List[str]:
    caption = (caption or "").lower()
    tags = []
    mapping = {
        "food": ["food", "pizza", "sushi", "delicious"],
        "travel": ["travel", "beach", "vacation", "trip", "sea"],
        "fashion": ["fashion", "style", "ootd"],
        "fitness": ["gym", "workout", "fitness", "fit"],
        "nature": ["sunset", "sunrise", "mountain", "sky"]
    }
    for tag, kws in mapping.items():
        if any(k in caption for k in kws):
            tags.append(tag)
    return tags

def analyze_image(path: str | None, caption: str = "") -> Dict:
    """
    Analyze image at `path` (if available) and/or caption to return analysis dict:
      { tags: [], vibe: str, lighting_score: float, quality_score: float, faces_count: int }
    Falls back to caption-only analysis if cv2 is not available or file missing.
    """
    tags = tags_from_caption(caption)

    if not path or not _ensure_cv2() or not os.path.exists(path):
        vibe = tags[0] if tags else "neutral"
        return {
            "tags": tags,
            "vibe": vibe,
            "lighting_score": 0.5,
            "quality_score": 0.5,
            "faces_count": 0
        }

    try:
        data = _np.fromfile(path, dtype=_np.uint8)
        img = _cv2.imdecode(data, _cv2.IMREAD_COLOR)
        if img is None:
            return {"tags": tags, "vibe": "neutral", "lighting_score": 0.5, "quality_score": 0.5, "faces_count": 0}

        light = brightness_score(img)
        sharp = sharpness_score(img)
        faces = detect_faces(img)
        quality = float((light + sharp) / 2.0)

        if quality > 0.7 and light > 0.6:
            vibe = "aesthetic"
        elif faces > 0:
            vibe = "portrait"
        elif light < 0.35:
            vibe = "moody"
        else:
            vibe = "casual"

        if faces > 0 and "portrait" not in tags:
            tags.append("portrait")

        return {
            "tags": tags,
            "vibe": vibe,
            "lighting_score": round(float(light), 3),
            "quality_score": round(float(quality), 3),
            "faces_count": int(faces)
        }
    except Exception as e:
        logger.debug("analyze_image failed: %s", e)
        return {
            "tags": tags,
            "vibe": tags[0] if tags else "neutral",
            "lighting_score": 0.5,
            "quality_score": 0.5,
            "faces_count": 0
        }
