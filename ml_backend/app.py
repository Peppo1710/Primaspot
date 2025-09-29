"""
Flask + OpenCV image-level analyzer (hardcoded heuristics)

Features:
- POST /analyze accepts multipart-form file field `image` or JSON {"url": "..."}
- Computes many low-level features (brightness, contrast, sharpness, colorfulness, edge density,
  dominant color, saturation, face count, skin-tone ratio, aspect ratio, etc.)
- Generates a large list of hardcoded tags using thresholded heuristics
- Classifies vibe/ambience into multiple categories with scores
- Returns JSON with tags, vibes (scores + chosen label), quality indicators, and raw metrics

Notes:
- This is *heuristic* and intentionally "hardcoded"; no ML model is used.
- Requires: Python 3.8+, Flask, requests, opencv-python, numpy, Pillow, scikit-learn

Install:
    pip install flask requests opencv-python-headless numpy pillow scikit-learn flask-cors

Run:
    python flask_opencv_image_analysis.py

Example curl (file):
    curl -F "image=@/path/to/photo.jpg" http://127.0.0.1:5000/analyze

Example curl (URL):
    curl -H "Content-Type: application/json" -d '{"url":"https://example.com/pic.jpg"}' http://127.0.0.1:5000/analyze

"""

from io import BytesIO
import math
import json
import cv2
import numpy as np
from sklearn.cluster import KMeans
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

# Load Haar cascade for face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# --- Utility image helpers ---

def read_image_from_file(file_storage):
    data = file_storage.read()
    return read_image_from_bytes(data)


def read_image_from_url(url, timeout=8):
    resp = requests.get(url, timeout=timeout)
    resp.raise_for_status()
    return read_image_from_bytes(resp.content)


def read_image_from_bytes(data):
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError('Could not decode image')
    return img

# --- Low-level metrics ---

def compute_brightness(img_gray):
    # mean pixel intensity (0-255)
    return float(np.mean(img_gray))


def compute_contrast(img_gray):
    # standard deviation of luminance
    return float(np.std(img_gray))


def compute_sharpness(img_gray):
    # variance of Laplacian
    return float(cv2.Laplacian(img_gray, cv2.CV_64F).var())


def compute_colorfulness(img):
    # From Hasler and Suesstrunk: colorfulness metric
    (B, G, R) = cv2.split(img.astype('float'))
    rg = np.absolute(R - G)
    yb = np.absolute(0.5 * (R + G) - B)
    stdRoot = np.sqrt((rg.std() ** 2) + (yb.std() ** 2))
    meanRoot = np.sqrt((rg.mean() ** 2) + (yb.mean() ** 2))
    return float(stdRoot + (0.3 * meanRoot))


def compute_edge_density(img_gray):
    edges = cv2.Canny(img_gray, 100, 200)
    return float(np.count_nonzero(edges) / edges.size)


def compute_dominant_color(img, k=3):
    # Resize to speed up
    small = cv2.resize(img, (100, 100), interpolation=cv2.INTER_AREA)
    data = small.reshape((-1, 3))
    km = KMeans(n_clusters=k, random_state=0, n_init=4)
    km.fit(data)
    centers = km.cluster_centers_.astype(int)
    counts = np.bincount(km.labels_)
    dominant = centers[np.argmax(counts)]
    # return as RGB tuple
    return int(dominant[2]), int(dominant[1]), int(dominant[0])


def compute_saturation_mean(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    return float(np.mean(hsv[:, :, 1]))


def compute_skin_ratio(img):
    # crude skin detection in HSV and YCrCb space
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    h, s, v = cv2.split(hsv)
    y, cr, cb = cv2.split(ycrcb)
    skin_mask1 = cv2.inRange(hsv, np.array([0, 15, 0]), np.array([25, 200, 255]))
    skin_mask2 = cv2.inRange(ycrcb, np.array([0, 135, 85]), np.array([255, 180, 135]))
    skin = cv2.bitwise_and(skin_mask1, skin_mask2)
    ratio = float(np.count_nonzero(skin) / skin.size)
    return ratio

# --- Heuristic tag generation (lots of hardcoded rules) ---

HARDCODED_TAG_BUCKETS = {
    'basic': ['food', 'travel', 'fashion', 'architecture', 'nature', 'urban', 'portrait', 'product', 'street', 'night', 'interior', 'landscape', 'selfie', 'group', 'pets', 'sports', 'event', 'wedding', 'art', 'flatlay', 'macro', 'detail', 'aerial', 'panorama', 'minimal', 'editorial'],
    'style': ['casual', 'formal', 'vintage', 'modern', 'gritty', 'soft', 'clean', 'moody', 'bright', 'muted', 'colorful', 'monochrome', 'film', 'cinematic', 'high-contrast', 'low-contrast'],
    'moods': ['energetic', 'calm', 'romantic', 'melancholic', 'playful', 'serene', 'luxury', 'cozy', 'dramatic', 'aesthetic', 'raw', 'documentary'],
    'technical': ['blurry', 'sharp', 'noisy', 'low-light', 'overexposed', 'underexposed', 'balanced', 'high-dynamic-range', 'well-composed', 'off-center', 'rule-of-thirds', 'high-saturation', 'low-saturation'],
}

def generate_tags_from_metrics(metrics):
    tags = set()
    b = metrics['brightness']
    c = metrics['contrast']
    sharp = metrics['sharpness']
    colorf = metrics['colorfulness']
    edges = metrics['edge_density']
    sat = metrics['saturation_mean']
    faces = metrics['faces']
    skin = metrics['skin_ratio']
    h, w = metrics['height'], metrics['width']
    ar = w / (h + 1e-9)

    # Basic scene guesses
    if faces > 0:
        tags.update(['portrait', 'people'])
        if faces == 1:
            tags.add('selfie')
        else:
            tags.add('group')
    if ar > 1.6:
        tags.add('landscape')
        tags.add('panorama')
    if ar < 0.8:
        tags.add('vertical')
        tags.add('portrait-orientation')

    # Lighting tags
    if b > 200:
        tags.add('bright')
        tags.add('sunny')
    elif b > 120:
        tags.add('well-lit')
    else:
        tags.add('dark')
        tags.add('moody')

    # Exposure / contrast
    if c < 25:
        tags.add('low-contrast')
    elif c > 60:
        tags.add('high-contrast')

    # Sharpness
    if sharp < 50:
        tags.add('blurry')
    elif sharp > 400:
        tags.add('very-sharp')
    else:
        tags.add('sharp')

    # Colorfulness and saturation
    if colorf > 40:
        tags.add('colorful')
        tags.add('vibrant')
    else:
        tags.add('muted')
    if sat > 80:
        tags.add('high-saturation')
    elif sat < 30:
        tags.add('low-saturation')

    # Edge / detail
    if edges > 0.06:
        tags.add('detailed')
        tags.add('textured')
    elif edges < 0.015:
        tags.add('smooth')

    # Skin and fashion heuristics
    if skin > 0.02 and faces > 0:
        tags.add('fashion')
        tags.add('beauty')
    if skin > 0.01 and faces == 0:
        tags.add('hands')
        tags.add('skin-present')

    # Time of day guess via brightness+color temp-ish
    if b > 220 and colorf > 35:
        tags.add('daytime')
    if b < 80 and colorf < 25:
        tags.add('night')

    # Composition heuristics (rule-of-thirds: high variance of centroid)
    if metrics['centroid_distance_from_center'] < 0.18:
        tags.add('centered')
    else:
        tags.add('off-center')
        tags.add('rule-of-thirds')

    # Add bucketed tags to increase hardcoded tag count
    # Pick some from HARDCODED_TAG_BUCKETS depending on metrics
    if faces > 0 and colorf > 30:
        tags.update(['editorial', 'portrait', 'fashion'])
    if ar > 2.0 and edges > 0.04:
        tags.update(['aerial', 'landscape', 'panorama'])
    if b < 90 and sharp > 200:
        tags.update(['dramatic', 'cinematic'])
    if colorf > 60 and sat > 100:
        tags.update(['pop', 'color-bomb', 'in-your-face'])

    # Force-add many extra hardcoded descriptors to satisfy "too many hardcoded tags"
    extra_force = [
        'visual', 'composition', 'frame', 'tone', 'ambience', 'look', 'feel', 'mood', 'palette', 'grain', 'texture', 'contrasty', 'flat', 'glossy', 'matte',
        'studio', 'ambient', 'natural-light', 'art-direct', 'documentary', 'lifestyle', 'editorial-style', 'campaign', 'closeup', 'wide-angle'
    ]
    # Choose a subset depending on simple thresholds (deterministic)
    if metrics['width'] * metrics['height'] > 800 * 800:
        tags.update(extra_force[:8])
    else:
        tags.update(extra_force[2:12])

    # Normalize and return
    return sorted(list(tags))

# --- Vibe classification (heuristic, returns scores) ---

VIBE_LABELS = ['casual', 'aesthetic', 'luxury/lavish', 'energetic', 'calm', 'moody', 'playful']

def classify_vibe(metrics):
    # Create simple score by weighted sum of normalized features
    # Normalize by reasonable constants to keep values small
    norm_b = (metrics['brightness'] - 100) / 100.0
    norm_color = metrics['colorfulness'] / 50.0
    norm_sharp = metrics['sharpness'] / 200.0
    norm_edges = metrics['edge_density'] / 0.05
    norm_sat = metrics['saturation_mean'] / 100.0
    faces = metrics['faces']

    scores = {k: 0.0 for k in VIBE_LABELS}

    # casual: moderate brightness, faces present, moderate sharpness
    scores['casual'] = 0.4 * faces + 0.3 * (1 - abs(norm_b)) + 0.3 * min(norm_sharp, 1.0)
    # aesthetic: high colorfulness, balanced contrast, high sharpness
    scores['aesthetic'] = 0.5 * min(norm_color, 1.5) + 0.3 * min(norm_sharp, 1.5) + 0.2 * (norm_sat)
    # luxury/lavish: low clutter (low edge density), warm brightness, centered composition
    scores['luxury/lavish'] = 0.4 * max(0, norm_b) + 0.4 * (1 - min(norm_edges, 1.0)) + 0.2 * (1 - metrics['centroid_distance_from_center'])
    # energetic: high colorfulness, high edge density, high saturation
    scores['energetic'] = 0.45 * min(norm_color, 2.0) + 0.35 * min(norm_edges, 2.0) + 0.2 * min(norm_sat, 2.0)
    # calm: low colorfulness, low edge density, low sharpness
    scores['calm'] = 0.5 * (1 - min(norm_color, 1.0)) + 0.3 * (1 - min(norm_edges, 1.0)) + 0.2 * (1 - min(norm_sharp, 1.0))
    # moody: low brightness, high contrast, high sharpness
    scores['moody'] = 0.5 * max(0, -norm_b) + 0.3 * (metrics['contrast'] / 80.0) + 0.2 * min(norm_sharp, 2.0)
    # playful: faces, bright, colorful
    scores['playful'] = 0.5 * faces + 0.3 * max(0, norm_b) + 0.2 * min(norm_color, 1.5)

    # Clamp and normalize to 0..1
    for k in scores:
        scores[k] = float(max(0.0, min(1.0, scores[k])))

    # pick top label
    top = max(scores.items(), key=lambda x: x[1])
    return {'scores': scores, 'label': top[0], 'confidence': top[1]}

# --- Composition helpers ---

def compute_centroid_distance(img_gray):
    # Treat brightness as mass; compute centroid and distance from image center
    h, w = img_gray.shape[:2]
    norm = img_gray.astype(np.float32) / 255.0
    total = np.sum(norm) + 1e-9
    coords = np.indices((h, w)).astype(np.float32)
    y_coords = coords[0]
    x_coords = coords[1]
    centroid_y = np.sum(y_coords * norm) / total
    centroid_x = np.sum(x_coords * norm) / total
    # Normalize distance relative to image diagonal
    center_y = h / 2.0
    center_x = w / 2.0
    dist = math.hypot((centroid_x - center_x) / w, (centroid_y - center_y) / h)
    return float(dist)

# --- Main analyze function ---

def analyze_image(img):
    # Expect BGR OpenCV image
    h, w = img.shape[:2]
    img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    brightness = compute_brightness(img_gray)
    contrast = compute_contrast(img_gray)
    sharpness = compute_sharpness(img_gray)
    colorfulness = compute_colorfulness(img)
    edge_density = compute_edge_density(img_gray)
    dominant_rgb = compute_dominant_color(img)
    saturation_mean = compute_saturation_mean(img)
    skin_ratio = compute_skin_ratio(img)

    # Face detection (scale down for speed)
    small = cv2.resize(img_gray, (0, 0), fx=0.6, fy=0.6)
    faces = face_cascade.detectMultiScale(small, scaleFactor=1.1, minNeighbors=5)
    face_count = int(len(faces))

    centroid_dist = compute_centroid_distance(img_gray)

    metrics = {
        'width': int(w),
        'height': int(h),
        'brightness': brightness,
        'contrast': contrast,
        'sharpness': sharpness,
        'colorfulness': colorfulness,
        'edge_density': edge_density,
        'dominant_rgb': dominant_rgb,
        'saturation_mean': saturation_mean,
        'skin_ratio': skin_ratio,
        'faces': face_count,
        'centroid_distance_from_center': centroid_dist,
    }

    tags = generate_tags_from_metrics(metrics)
    vibe = classify_vibe(metrics)

    # Quality indicators (composed)
    quality = {}
    # Lighting
    if brightness < 80:
        quality['lighting'] = 'underexposed'
    elif brightness > 230:
        quality['lighting'] = 'overexposed'
    else:
        quality['lighting'] = 'good'
    # Visual appeal score (0-100), heuristic
    appeal = 0.0
    # favor mid brightness, high colorfulness, good sharpness
    appeal += max(0, 1 - abs((brightness - 140) / 140.0)) * 30
    appeal += min(colorfulness / 80.0, 1.0) * 30
    appeal += min(sharpness / 400.0, 1.0) * 25
    appeal += min(contrast / 80.0, 1.0) * 15
    quality['visual_appeal'] = int(max(0, min(100, round(appeal))))

    # Consistency: placeholder rule comparing to built-in "presets"
    # We'll compute distance to 3 style centroids: bright, moody, colorful
    bright_centroid = np.array([160.0, 40.0, 200.0])  # brightness, contrast, colorfulness
    moody_centroid = np.array([60.0, 70.0, 15.0])
    colorful_centroid = np.array([140.0, 35.0, 70.0])
    sample = np.array([brightness, contrast, colorfulness])
    dists = [np.linalg.norm(sample - bright_centroid), np.linalg.norm(sample - moody_centroid), np.linalg.norm(sample - colorful_centroid)]
    consistency_score = float(100 - min(dists) / 2.0)
    quality['consistency'] = int(max(0, min(100, round(consistency_score))))

    # Assemble final result
    result = {
        'tags': tags,
        'vibe': vibe,
        'quality': quality,
        'metrics': metrics,
    }
    return result

# --- Flask endpoints ---

@app.route('/analyze', methods=['POST'])
def analyze_endpoint():
    try:
        # Accept either multipart file or JSON with url
        if 'image' in request.files:
            img = read_image_from_file(request.files['image'])
        else:
            payload = request.get_json(force=True, silent=True)
            if payload and 'url' in payload:
                img = read_image_from_url(payload['url'])
            else:
                return jsonify({'error': 'No image file or url provided'}), 400

        result = analyze_image(img)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/', methods=['GET'])
def home():
    return jsonify({'status': 'flask-opencv-image-analyzer', 'endpoints': ['/analyze (POST)']})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
