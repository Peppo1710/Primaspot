#!/usr/bin/env python3
"""
app.py
Flask server that analyzes image/video URLs using Google Gemini (via google-genai SDK).

POST /analyze
Body JSON: {"urls": ["https://...jpg", "https://...mp4", ...]}

Response JSON: { "<url>": {analysis}, ... }

This rewritten version:
- Uses the documented `generate_content` call when available (with fallbacks)
- Avoids hardcoding API keys (reads from env)
- Supports sending images as PIL.Image or uploading via client.files.upload if available
- Defensive parsing of SDK responses
- Better error messages and logging
- Keeps the same behaviour: images analyzed directly, videos sampled and aggregated
"""

import os
import io
import json
import base64
import tempfile
import traceback
import logging
from typing import List, Dict, Any, Optional

from flask import Flask, request, jsonify
import requests
from PIL import Image
import cv2
import numpy as np

# Try importing google-genai in a couple of ways for robustness
try:
    from google import genai
except Exception:
    try:
        import google_genai as genai
    except Exception:
        genai = None

# ---------------- CONFIG ----------------
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

MODEL = os.getenv("MODEL", "gemini-2.5-flash")  # default if not found
API_KEY = os.getenv("API_KEY")
FRAME_SAMPLING_SECONDS = int(os.getenv("FRAME_SAMPLING_SECONDS", "2"))
MAX_TAGS = int(os.getenv("MAX_TAGS", "12"))
PORT = int(os.getenv("PORT", "5000"))
VIDEO_EXTS = (".mp4", ".mov", ".mkv", ".webm", ".avi")

# ---------------- Logging ----------------
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("app")

# ---------------- Initialize client ----------------
client = None
if genai is None:
    log.warning("google-genai SDK not installed or not importable. Install `google-genai`.")
else:
    try:
        if API_KEY:
            client = genai.Client(api_key=API_KEY)
        else:
            # rely on ADC if available
            client = genai.Client()
        log.info("GenAI client initialized")
    except Exception:
        log.exception("Failed to create GenAI client")
        client = None

# ---------------- Utilities ----------------

def download_to_file(url: str, timeout: int = 30) -> str:
    """Download url to a temp file and return local path."""
    r = requests.get(url, stream=True, timeout=timeout)
    r.raise_for_status()
    ext = os.path.splitext(url.split("?")[0])[1] or ".bin"
    fd, path = tempfile.mkstemp(suffix=ext)
    with os.fdopen(fd, "wb") as f:
        for chunk in r.iter_content(1024 * 32):
            if not chunk:
                continue
            f.write(chunk)
    return path


def image_bytes_to_pil(b: bytes) -> Image.Image:
    return Image.open(io.BytesIO(b)).convert("RGB")


def frame_to_jpeg_bytes(frame: np.ndarray) -> bytes:
    _, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    return buf.tobytes()


# ---------------- GenAI helpers ----------------

def _call_model_with_fallback(contents: List[Any], model: str):
    """
    Attempt to call the GenAI model using a few method names / shapes depending on SDK version.
    Returns the raw response object.
    """
    if client is None:
        raise RuntimeError("GenAI client not initialized")

    # Try ordered list of candidate callables
    # Many recent examples use: client.models.generate_content(model=..., contents=[...])
    # Older or alternate SDKs might have client.models.generate(...) or client.generate(...)
    try_methods = []
    if hasattr(client, "models"):
        try_methods.append((client.models, "generate_content"))
        try_methods.append((client.models, "generate"))
    try_methods.append((client, "generate_content"))
    try_methods.append((client, "generate"))

    last_exc = None
    for obj, name in try_methods:
        fn = getattr(obj, name, None)
        if not callable(fn):
            continue
        try:
            # Most documented form: fn(model=MODEL, contents=[prompt, image_or_file_ref])
            return fn(model=model, contents=contents)
        except TypeError:
            # Some SDKs expect inputs= or different arg names, try permissive forms
            try:
                return fn(model=model, inputs=contents)
            except Exception as e:
                last_exc = e
        except Exception as e:
            last_exc = e
    # nothing worked
    raise RuntimeError("No compatible model-call method found on genai client", last_exc)


def _extract_text_from_response(resp: Any) -> Optional[str]:
    """Try to extract plain text from a variety of SDK response shapes."""
    if resp is None:
        return None
    # common: resp.text
    if hasattr(resp, "text") and isinstance(resp.text, str) and resp.text.strip():
        return resp.text.strip()

    # some SDKs: resp.output -> list -> content -> list -> text
    try:
        out = getattr(resp, "output", None)
        if out and isinstance(out, (list, tuple)):
            # find first text chunk
            for o in out:
                content = o.get("content") if isinstance(o, dict) else getattr(o, "content", None)
                if content:
                    # content may be list of dicts with text
                    for c in content:
                        if isinstance(c, dict) and "text" in c:
                            t = c["text"]
                            if isinstance(t, str) and t.strip():
                                return t.strip()
                        if hasattr(c, "text") and isinstance(c.text, str) and c.text.strip():
                            return c.text.strip()
    except Exception:
        pass

    # some SDKs: candidates -> content -> parts -> text
    try:
        cands = getattr(resp, "candidates", None)
        if cands and len(cands) > 0:
            cand = cands[0]
            # cand.content.parts might exist
            parts = None
            if isinstance(cand, dict):
                content = cand.get("content")
                if isinstance(content, dict):
                    parts = content.get("parts")
            else:
                parts = getattr(cand, "content", None)
                if parts is not None:
                    parts = getattr(parts, "parts", None) or parts
            if parts:
                texts = []
                for p in parts:
                    if isinstance(p, dict) and "text" in p and p["text"]:
                        texts.append(p["text"])
                    elif hasattr(p, "text") and p.text:
                        texts.append(p.text)
                if texts:
                    return "\n".join(texts).strip()
    except Exception:
        pass

    # last resort: str(resp)
    try:
        s = str(resp)
        if s and "\n" in s:
            return s
    except Exception:
        pass
    return None


# ---------------- Prompting + parsing ----------------

IMAGE_PROMPT_TEMPLATE = """
You are a concise image analyzer. Given the provided image, return ONLY valid JSON with:
- caption: one short sentence describing the main scene.
- tags: array of up to {max_tags} short keywords (no duplicates).
- num_people: estimated number of people (integer).
- ambience: up to 2 labels from ['casual','aesthetic','luxurious','energetic','calm','outdoor','indoor','night','daytime','crowded','empty'].
- quality: object with numeric fields: width, height (px), brightness (0-255 mean), blur_score (higher = sharper).

If unsure, give your best estimate. Output must be pure JSON.
"""


def _parse_json_from_text(text: str) -> Any:
    """Strictly parse JSON or attempt to extract the first {...} block."""
    if not text:
        return {"__error": "no_text_to_parse"}
    try:
        return json.loads(text)
    except Exception:
        try:
            start = text.index("{")
            end = text.rindex("}") + 1
            sub = text[start:end]
            return json.loads(sub)
        except Exception as e:
            return {"__raw": text, "__parse_error": str(e)}


def ask_gemini_with_image(pil_image: Image.Image, max_tags: int = MAX_TAGS) -> Dict:
    """Send a single PIL image to Gemini and request strict JSON output."""
    prompt = IMAGE_PROMPT_TEMPLATE.format(max_tags=max_tags)
    # Build contents in the form [prompt, image] which the SDK commonly accepts
    contents = [prompt, pil_image]
    try:
        resp = _call_model_with_fallback(contents=contents, model=MODEL)
    except Exception as e:
        log.exception("gemini call failed")
        return {"__error": "gemini_call_failed", "message": str(e), "trace": traceback.format_exc()}

    text = _extract_text_from_response(resp)
    if not text:
        return {"__error": "no_text_in_response", "raw": str(resp)}

    return _parse_json_from_text(text)


def analyze_image_url_via_gemini(image_url: str) -> Dict:
    """Try to send URL directly using client.files.upload when available, else download and send image bytes."""
    if client is None:
        return {"__error": "no_genai_client"}

    # Try to upload the remote file (SDK may accept a URL or local path)
    try:
        if hasattr(client, "files") and hasattr(client.files, "upload"):
            try:
                # Some SDKs let you pass a remote URL to files.upload; if not, this will raise
                file_ref = client.files.upload(file=image_url)
                # pass the returned file object into contents
                prompt = IMAGE_PROMPT_TEMPLATE.format(max_tags=MAX_TAGS)
                resp = _call_model_with_fallback(contents=[prompt, file_ref], model=MODEL)
                text = _extract_text_from_response(resp)
                if text:
                    return _parse_json_from_text(text)
            except Exception:
                # we'll fallback to download
                log.debug("files.upload via URL not supported or failed, falling back to download", exc_info=True)
    except Exception:
        log.debug("files.upload check failed", exc_info=True)

    # fallback: download the image and send as PIL
    try:
        path = download_to_file(image_url)
        with open(path, "rb") as f:
            b = f.read()
        try:
            os.remove(path)
        except Exception:
            pass
        img = image_bytes_to_pil(b)
        return ask_gemini_with_image(img)
    except Exception as e:
        log.exception("failed to download or analyze image")
        return {"__error": "download_failed", "message": str(e), "trace": traceback.format_exc()}


# ---------------- Video handling ----------------

def analyze_video_url(video_url: str, sampling_seconds: int = FRAME_SAMPLING_SECONDS) -> Dict:
    """
    Download video, sample frames every sampling_seconds, call Gemini per sampled frame (PIL),
    then aggregate results: union of tags, max num_people, most common ambience, averaged quality.
    """
    try:
        vpath = download_to_file(video_url)
    except Exception as e:
        log.exception("video download failed")
        return {"__error": "video_download_failed", "message": str(e)}

    cap = cv2.VideoCapture(vpath)
    if not cap.isOpened():
        try:
            os.remove(vpath)
        except Exception:
            pass
        return {"__error": "video_open_failed"}

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total_frames / fps if fps > 0 else 0
    interval = max(1, int(round(fps * sampling_seconds)))

    frame_idx = 0
    sampled = 0
    frame_results = []

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % interval == 0:
                h, w = frame.shape[:2]
                max_dim = 1024
                if max(h, w) > max_dim:
                    scale = max_dim / float(max(h, w))
                    frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
                jpeg_bytes = frame_to_jpeg_bytes(frame)
                try:
                    pil = image_bytes_to_pil(jpeg_bytes)
                    out = ask_gemini_with_image(pil)
                except Exception as e:
                    out = {"__error": "frame_analysis_failed", "message": str(e)}
                frame_results.append(out)
                sampled += 1
            frame_idx += 1
    finally:
        cap.release()
        try:
            os.remove(vpath)
        except Exception:
            pass

    # Aggregate
    tags: List[str] = []
    ambience_counts: Dict[str, int] = {}
    captions: List[str] = []
    num_people_max = 0
    numeric_qualities: List[Dict[str, float]] = []

    for r in frame_results:
        if not isinstance(r, dict):
            continue
        if "tags" in r and isinstance(r["tags"], list):
            for t in r["tags"]:
                if t not in tags:
                    tags.append(t)
        if "ambience" in r and isinstance(r["ambience"], list):
            for a in r["ambience"]:
                ambience_counts[a] = ambience_counts.get(a, 0) + 1
        if "caption" in r and isinstance(r["caption"], str):
            captions.append(r["caption"])
        if "num_people" in r:
            try:
                val = int(r["num_people"])
                if val > num_people_max:
                    num_people_max = val
            except Exception:
                pass
        if "quality" in r and isinstance(r["quality"], dict):
            numeric_qualities.append(r["quality"])

    top_ambience = sorted(ambience_counts.items(), key=lambda x: x[1], reverse=True)
    ambience_top2 = [a for a, _ in top_ambience[:2]]

    agg_quality: Dict[str, float] = {}
    if numeric_qualities:
        keys = set().union(*[set(q.keys()) for q in numeric_qualities])
        for k in keys:
            vals = [float(q[k]) for q in numeric_qualities if k in q and isinstance(q[k], (int, float))]
            if vals:
                agg_quality[k] = sum(vals) / len(vals)

    return {
        "sampled_frames": sampled,
        "duration_seconds": duration,
        "caption_examples": captions[:3],
        "tags": tags[:MAX_TAGS],
        "num_people_estimate": num_people_max,
        "ambience": ambience_top2,
        "quality": agg_quality,
        "frame_level_raw_sample": frame_results[:3],
    }


# ---------------- Flask app ----------------
app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "client_present": client is not None})


@app.route("/analyze", methods=["POST"])
def analyze():
    payload = request.get_json(force=True, silent=True)
    if not payload or "urls" not in payload:
        return jsonify({"error": "please POST JSON with 'urls' array"}), 400

    urls: List[str] = payload["urls"]
    out: Dict[str, Any] = {}

    for url in urls:
        try:
            lower = url.lower().split("?")[0]
            if lower.endswith(VIDEO_EXTS):
                out[url] = analyze_video_url(url)
            else:
                out[url] = analyze_image_url_via_gemini(url)
        except Exception as e:
            log.exception("processing failed for %s", url)
            out[url] = {"__error": "processing_failed", "message": str(e), "trace": traceback.format_exc()}

    return jsonify(out)


if __name__ == "__main__":
    # When running locally keep debug off unless explicitly enabled
    debug_flag = os.environ.get("FLASK_DEBUG", "0") in ("1", "true", "True")
    app.run(host="0.0.0.0", port=PORT, debug=debug_flag)
