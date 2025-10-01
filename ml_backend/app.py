"""
Simplified Instagram Image Analyzer API
Returns exactly what the assignment needs:
- 2 keywords/tags
- 2 vibe classifications  
- 3 quality indicators

Run: python app.py
Test: curl -X POST -F "image=@photo.jpg" http://localhost:5000/analyze
"""

from io import BytesIO
import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

# Load face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')


def read_image_from_file(file_storage):
    """Read image from uploaded file"""
    data = file_storage.read()
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError('Could not decode image')
    return img


def read_image_from_url(url, timeout=8):
    """Read image from URL"""
    resp = requests.get(url, timeout=timeout)
    resp.raise_for_status()
    arr = np.frombuffer(resp.content, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError('Could not decode image')
    return img


def compute_brightness(img_gray):
    """Average pixel intensity"""
    return float(np.mean(img_gray))


def compute_contrast(img_gray):
    """Standard deviation of pixel intensities"""
    return float(np.std(img_gray))


def compute_sharpness(img_gray):
    """Laplacian variance - measures edge sharpness"""
    return float(cv2.Laplacian(img_gray, cv2.CV_64F).var())


def compute_colorfulness(img):
    """Hasler and Süsstrunk colorfulness metric"""
    (B, G, R) = cv2.split(img.astype('float'))
    rg = np.absolute(R - G)
    yb = np.absolute(0.5 * (R + G) - B)
    std = np.sqrt((rg.std() ** 2) + (yb.std() ** 2))
    mean = np.sqrt((rg.mean() ** 2) + (yb.mean() ** 2))
    return float(std + (0.3 * mean))


def detect_faces(img_gray):
    """Detect number of faces"""
    h, w = img_gray.shape[:2]
    scale = 0.6
    small = cv2.resize(img_gray, (0, 0), fx=scale, fy=scale)
    min_size = (max(20, int(w * 0.03 * scale)), max(20, int(h * 0.03 * scale)))
    faces = face_cascade.detectMultiScale(small, scaleFactor=1.1, minNeighbors=6, minSize=min_size)
    return len(faces)


def compute_saturation(img):
    """Mean saturation from HSV"""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    return float(np.mean(hsv[:, :, 1]))


def analyze_image(img):
    """
    Main analysis function
    Returns simplified output with exactly 2 tags per category
    """
    h, w = img.shape[:2]
    img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Compute metrics
    brightness = compute_brightness(img_gray)
    contrast = compute_contrast(img_gray)
    sharpness = compute_sharpness(img_gray)
    colorfulness = compute_colorfulness(img)
    saturation = compute_saturation(img)
    face_count = detect_faces(img_gray)
    aspect_ratio = w / (h + 1e-9)
    
    # ==========================================
    # 1. AUTO-GENERATE KEYWORDS (2 tags max)
    # ==========================================
    keywords = []
    
    # Primary subject detection
    if face_count > 0:
        if face_count == 1:
            keywords.append('portrait')
        else:
            keywords.append('group')
    elif aspect_ratio > 1.6:
        keywords.append('landscape')
    elif colorfulness > 45 and saturation > 80:
        keywords.append('colorful')
    else:
        keywords.append('scene')
    
    # Secondary classification
    if brightness < 90:
        keywords.append('night')
    elif colorfulness > 50:
        keywords.append('vibrant')
    elif face_count == 0 and aspect_ratio > 1.3:
        keywords.append('nature')
    elif sharpness > 300:
        keywords.append('detailed')
    else:
        keywords.append('lifestyle')
    
    # Ensure exactly 2 keywords
    keywords = keywords[:2]
    
    # ==========================================
    # 2. CLASSIFY VIBE/AMBIENCE (2 tags max)
    # ==========================================
    vibe_scores = {}
    
    # Casual: everyday photos, moderate everything
    vibe_scores['casual'] = (
        0.4 * (1 - abs(brightness - 140) / 140) +
        0.3 * min(sharpness / 200, 1) +
        0.3 * (1 if face_count > 0 else 0.3)
    )
    
    # Aesthetic: high color, sharp, well-composed
    vibe_scores['aesthetic'] = (
        0.4 * min(colorfulness / 50, 1.5) +
        0.4 * min(sharpness / 300, 1.2) +
        0.2 * min(saturation / 100, 1)
    )
    
    # Luxury/Lavish: bright, clean, minimal edges
    vibe_scores['luxury'] = (
        0.5 * max(0, (brightness - 150) / 100) +
        0.3 * (1 - min(colorfulness / 60, 1)) +
        0.2 * min(sharpness / 250, 1)
    )
    
    # Energetic: high color, high saturation, dynamic
    vibe_scores['energetic'] = (
        0.5 * min(colorfulness / 40, 2) +
        0.3 * min(saturation / 90, 1.5) +
        0.2 * min(contrast / 70, 1)
    )
    
    # Moody: dark, high contrast
    vibe_scores['moody'] = (
        0.6 * max(0, (100 - brightness) / 100) +
        0.4 * min(contrast / 80, 1.5)
    )
    
    # Get top 2 vibes
    sorted_vibes = sorted(vibe_scores.items(), key=lambda x: x[1], reverse=True)
    top_vibes = [vibe[0] for vibe in sorted_vibes[:2]]
    
    # ==========================================
    # 3. QUALITY INDICATORS
    # ==========================================
    quality = {}
    
    # Lighting quality
    if brightness < 80:
        quality['lighting'] = 'underexposed'
    elif brightness > 220:
        quality['lighting'] = 'overexposed'
    elif 120 <= brightness <= 180:
        quality['lighting'] = 'excellent'
    else:
        quality['lighting'] = 'good'
    
    # Visual appeal score (0-10)
    appeal = 0.0
    appeal += max(0, 1 - abs((brightness - 140) / 140)) * 3  # optimal brightness
    appeal += min(colorfulness / 80, 1) * 3  # good color
    appeal += min(sharpness / 400, 1) * 2.5  # sharpness
    appeal += min(contrast / 80, 1) * 1.5  # contrast
    quality['visual_appeal'] = round(appeal, 1)
    
    # Consistency/Style score (0-10)
    # How consistent with common Instagram aesthetics
    consistency = 0.0
    if 100 <= brightness <= 200:  # good exposure range
        consistency += 3
    if 30 <= colorfulness <= 70:  # balanced color
        consistency += 3
    if sharpness > 100:  # sharp enough
        consistency += 2
    if 40 <= contrast <= 90:  # good contrast
        consistency += 2
    quality['consistency'] = round(consistency, 1)
    
    # ==========================================
    # RETURN SIMPLIFIED OUTPUT
    # ==========================================
    result = {
        'keywords': keywords,  # 2 tags
        'vibe': top_vibes,  # 2 tags
        'quality': quality  # 3 indicators
    }
    
    return result


@app.route('/analyze', methods=['POST'])
def analyze_endpoint():
    """
    Analyze endpoint supporting:
    - Multipart file upload: curl -X POST -F "image=@photo.jpg" http://localhost:5000/analyze
    - JSON URL: curl -X POST -H "Content-Type: application/json" -d '{"url":"https://..."}' http://localhost:5000/analyze
    - Batch URLs: curl -X POST -H "Content-Type: application/json" -d '{"urls":["url1","url2"]}' http://localhost:5000/analyze
    """
    try:
        # Handle file upload
        if 'image' in request.files:
            img = read_image_from_file(request.files['image'])
            result = analyze_image(img)
            return jsonify(result)
        
        # Handle JSON payload
        payload = request.get_json(silent=True) or {}
        
        # Batch URLs
        if 'urls' in payload and isinstance(payload['urls'], list):
            results = {}
            for url in payload['urls']:
                try:
                    img = read_image_from_url(url)
                    results[url] = analyze_image(img)
                except Exception as e:
                    results[url] = {'error': str(e)}
            return jsonify({'results': results})
        
        # Single URL
        if 'url' in payload:
            img = read_image_from_url(payload['url'])
            result = analyze_image(img)
            return jsonify(result)
        
        return jsonify({'error': 'No image provided. Send file or JSON with url/urls'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/', methods=['GET'])
def home():
    """Health check"""
    return jsonify({
        'status': 'running',
        'service': 'Instagram Image Analyzer',
        'endpoints': {
            'POST /analyze': 'Upload image file or send JSON with url/urls'
        }
    })


if __name__ == '__main__':
    print("🚀 Starting Instagram Image Analyzer API")
    print("📍 http://localhost:5000")
    print("\nTest with:")
    print("  curl -X POST -F 'image=@photo.jpg' http://localhost:5000/analyze")
    app.run(host='0.0.0.0', port=5000, debug=True)