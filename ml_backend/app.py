from flask import Flask, request, jsonify
import requests
import base64
import json
from io import BytesIO
from PIL import Image
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
HUGGINGFACE_TOKEN = os.getenv('HUGGINGFACE_TOKEN')  # Get token from environment variable
CLIP_MODEL_URL = "https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32"

# Predefined categories for analysis
KEYWORDS = [
    "food", "travel", "fashion", "nature", "people", "animals", "architecture", 
    "technology", "art", "sports", "music", "business", "home", "car", "beach"
]

VIBES = [
    "casual", "aesthetic", "luxury", "energetic", "calm", "professional", 
    "cozy", "minimalist", "vintage", "modern", "romantic", "edgy"
]

QUALITY_INDICATORS = [
    "professional photography", "good lighting", "high quality", "sharp focus",
    "well composed", "vibrant colors", "clear image", "artistic"
]

def encode_image(image_file):
    """Convert image file to base64 string"""
    try:
        # Read image and convert to RGB if necessary
        image = Image.open(image_file)
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to base64
        buffered = BytesIO()
        image.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return img_str
    except Exception as e:
        raise ValueError(f"Error processing image: {str(e)}")

def query_clip_model(image_data, categories):
    """Query CLIP model with image and text categories"""
    headers = {
        "Authorization": f"Bearer {HUGGINGFACE_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": {
            "image": image_data,
            "text": categories
        }
    }
    
    try:
        response = requests.post(CLIP_MODEL_URL, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise Exception(f"API request failed: {str(e)}")

def process_clip_results(results, categories, threshold=0.1):
    """Process CLIP results and categorize them"""
    if not isinstance(results, list) or len(results) != len(categories):
        raise ValueError("Invalid response format from CLIP model")
    
    # Combine categories with their scores
    scored_items = list(zip(categories, results))
    
    # Separate into different types and filter by threshold
    keywords = []
    vibes = []
    quality = []
    
    for category, score in scored_items:
        if score > threshold:
            if category in KEYWORDS:
                keywords.append({"tag": category, "confidence": round(score, 3)})
            elif category in VIBES:
                vibes.append({"vibe": category, "confidence": round(score, 3)})
            elif category in QUALITY_INDICATORS:
                quality.append({"indicator": category, "confidence": round(score, 3)})
    
    # Sort by confidence (descending)
    keywords.sort(key=lambda x: x["confidence"], reverse=True)
    vibes.sort(key=lambda x: x["confidence"], reverse=True)
    quality.sort(key=lambda x: x["confidence"], reverse=True)
    
    return {
        "keywords": keywords[:5],  # Top 5 keywords
        "vibe_ambience": vibes[:3],  # Top 3 vibes
        "quality_indicators": quality[:3]  # Top 3 quality indicators
    }

@app.route('/')
def home():
    """Home endpoint with API documentation"""
    return jsonify({
        "message": "Image Analysis API using CLIP",
        "endpoints": {
            "/analyze": "POST - Upload image for analysis",
            "/analyze-batch": "POST - Analyze multiple images from URLs",
            "/categories": "GET - Get available analysis categories",
            "/health": "GET - Check API health"
        },
        "usage": {
            "single_image": {
                "method": "POST",
                "endpoint": "/analyze",
                "content_type": "multipart/form-data",
                "parameter": "image (file)"
            },
            "batch_analysis": {
                "method": "POST",
                "endpoint": "/analyze-batch",
                "content_type": "application/json",
                "body": {"image_urls": ["url1", "url2", "url3"]}
            }
        }
    })

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "model": "CLIP", "version": "1.0"})

@app.route('/analyze', methods=['POST'])
def analyze_image():
    """Main endpoint for image analysis"""
    try:
        # Check if image file is provided
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
        file_extension = image_file.filename.rsplit('.', 1)[1].lower()
        if file_extension not in allowed_extensions:
            return jsonify({"error": "Invalid file type. Supported: png, jpg, jpeg, gif, bmp, webp"}), 400
        
        # Process image
        image_data = encode_image(image_file)
        
        # Prepare all categories for analysis
        all_categories = KEYWORDS + VIBES + QUALITY_INDICATORS
        
        # Query CLIP model
        clip_results = query_clip_model(image_data, all_categories)
        
        # Process and categorize results
        analysis_results = process_clip_results(clip_results, all_categories)
        
        # Prepare response
        response = {
            "status": "success",
            "filename": image_file.filename,
            "analysis": analysis_results,
            "summary": {
                "total_keywords": len(analysis_results["keywords"]),
                "primary_vibe": analysis_results["vibe_ambience"][0]["vibe"] if analysis_results["vibe_ambience"] else "neutral",
                "quality_score": analysis_results["quality_indicators"][0]["confidence"] if analysis_results["quality_indicators"] else 0.0
            }
        }
        
        return jsonify(response)
    
    except ValueError as e:
        return jsonify({"error": f"Image processing error: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

@app.route('/analyze-batch', methods=['POST'])
def analyze_batch_images():
    """Analyze multiple images from URLs"""
    try:
        data = request.get_json()
        
        if not data or 'image_urls' not in data:
            return jsonify({"error": "No image_urls provided in JSON body"}), 400
        
        image_urls = data['image_urls']
        
        if not isinstance(image_urls, list):
            return jsonify({"error": "image_urls must be an array"}), 400
        
        if len(image_urls) > 10:  # Limit to prevent abuse
            return jsonify({"error": "Maximum 10 images allowed per batch"}), 400
        
        results = []
        all_categories = KEYWORDS + VIBES + QUALITY_INDICATORS
        
        for i, url in enumerate(image_urls):
            try:
                # Download image from URL
                response = requests.get(url, timeout=30)
                response.raise_for_status()
                
                # Create BytesIO object from response content
                image_file = BytesIO(response.content)
                
                # Process image
                image_data = encode_image(image_file)
                
                # Query CLIP model
                clip_results = query_clip_model(image_data, all_categories)
                
                # Process and categorize results
                analysis_results = process_clip_results(clip_results, all_categories)
                
                results.append({
                    "url": url,
                    "index": i,
                    "status": "success",
                    "analysis": analysis_results,
                    "summary": {
                        "total_keywords": len(analysis_results["keywords"]),
                        "primary_vibe": analysis_results["vibe_ambience"][0]["vibe"] if analysis_results["vibe_ambience"] else "neutral",
                        "quality_score": analysis_results["quality_indicators"][0]["confidence"] if analysis_results["quality_indicators"] else 0.0
                    }
                })
                
            except Exception as e:
                results.append({
                    "url": url,
                    "index": i,
                    "status": "error",
                    "error": str(e)
                })
        
        return jsonify({
            "status": "completed",
            "total_images": len(image_urls),
            "successful": len([r for r in results if r["status"] == "success"]),
            "failed": len([r for r in results if r["status"] == "error"]),
            "results": results
        })
        
    except Exception as e:
        return jsonify({"error": f"Batch analysis failed: {str(e)}"}), 500

@app.route('/categories')
def get_categories():
    """Get all available categories for analysis"""
    return jsonify({
        "keywords": KEYWORDS,
        "vibes": VIBES,
        "quality_indicators": QUALITY_INDICATORS
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    # Check if token is set
    if not HUGGINGFACE_TOKEN:
        print("⚠️  WARNING: Please set your Hugging Face token in the HUGGINGFACE_TOKEN environment variable!")
        print("   Get your token from: https://huggingface.co/settings/tokens")
        print("   Set it with: export HUGGINGFACE_TOKEN=your_token_here")
    
    print("🚀 Starting Image Analysis API...")
    print("📝 Available endpoints:")
    print("   GET  /             - API documentation")
    print("   GET  /health       - Health check")
    print("   POST /analyze      - Single image analysis")
    print("   POST /analyze-batch - Batch image analysis from URLs")
    print("   GET  /categories   - Available categories")
    
    app.run(debug=True, host='0.0.0.0', port=5000)