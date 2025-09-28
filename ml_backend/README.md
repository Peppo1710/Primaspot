# Image Analysis API

A Flask-based API that uses Hugging Face's CLIP model to analyze images and extract keywords, vibes, and quality indicators.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```
   HUGGINGFACE_TOKEN=your_huggingface_token_here
   ```
   
   Get your token from: https://huggingface.co/settings/tokens

3. **Run the application:**
   ```bash
   python app.py
   ```

## API Endpoints

### 1. Single Image Analysis
**POST** `/analyze`

Upload a single image file for analysis.

**Request:**
- Content-Type: `multipart/form-data`
- Parameter: `image` (file)

**Example using curl:**
```bash
curl -X POST -F "image=@your_image.jpg" http://localhost:5000/analyze
```

### 2. Batch Image Analysis
**POST** `/analyze-batch`

Analyze multiple images from URLs (up to 10 images per request).

**Request:**
- Content-Type: `application/json`
- Body:
  ```json
  {
    "image_urls": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
      "https://example.com/image3.jpg"
    ]
  }
  ```

**Example using curl:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"image_urls": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]}' \
  http://localhost:5000/analyze-batch
```

### 3. Get Available Categories
**GET** `/categories`

Returns all available keywords, vibes, and quality indicators for analysis.

### 4. Health Check
**GET** `/health`

Check if the API is running properly.

### 5. API Documentation
**GET** `/`

Returns API documentation and usage examples.

## Response Format

### Single Image Analysis Response:
```json
{
  "status": "success",
  "filename": "image.jpg",
  "analysis": {
    "keywords": [
      {"tag": "food", "confidence": 0.95},
      {"tag": "nature", "confidence": 0.82}
    ],
    "vibe_ambience": [
      {"vibe": "aesthetic", "confidence": 0.78},
      {"vibe": "calm", "confidence": 0.65}
    ],
    "quality_indicators": [
      {"indicator": "professional photography", "confidence": 0.88},
      {"indicator": "good lighting", "confidence": 0.75}
    ]
  },
  "summary": {
    "total_keywords": 2,
    "primary_vibe": "aesthetic",
    "quality_score": 0.88
  }
}
```

### Batch Analysis Response:
```json
{
  "status": "completed",
  "total_images": 3,
  "successful": 2,
  "failed": 1,
  "results": [
    {
      "url": "https://example.com/image1.jpg",
      "index": 0,
      "status": "success",
      "analysis": { ... },
      "summary": { ... }
    },
    {
      "url": "https://example.com/image2.jpg",
      "index": 1,
      "status": "error",
      "error": "Failed to download image"
    }
  ]
}
```

## Supported Image Formats
- PNG
- JPG/JPEG
- GIF
- BMP
- WebP

## Environment Variables
- `HUGGINGFACE_TOKEN`: Your Hugging Face API token (required)
