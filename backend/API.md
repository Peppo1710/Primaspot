# Instagram Dashboard API Documentation

## Base URL
```
http://localhost:8000/api
```

## Authentication
All endpoints are currently public (no authentication required).

## Rate Limiting
- Instagram scraping endpoints: 20 requests per hour
- Other endpoints: No rate limiting

---

## Core Endpoints

### Health Check
**GET** `/health`

Check server and database status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-03T22:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "database": {
    "status": "connected",
    "state": "connected"
  }
}
```

### API Information
**GET** `/api`

Get basic API information and available endpoints.

**Response:**
```json
{
  "success": true,
  "message": "Instagram Dashboard API",
  "version": "1.0.0",
  "endpoints": {
    "users": "/api/users",
    "user": "/api/user/:username",
    "validate": "/api/user/validate/:username",
    "health": "/health"
  }
}
```

### API Documentation
**GET** `/api/docs`

Get detailed API documentation.

**Response:**
```json
{
  "success": true,
  "message": "API Documentation",
  "endpoints": [
    {
      "method": "GET",
      "path": "/user/:username",
      "description": "Get user profile data"
    }
  ]
}
```

---

## User Management Endpoints

### Validate User
**GET** `/api/user/validate/:username`

Validate if user exists in database, if not scrape from Instagram.

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Query Parameters:**
- None

**Response:**
```json
{
  "success": true,
  "message": "User validated and data scraped successfully",
  "data": {
    "username": "example_user",
    "full_name": "Example User",
    "followers_count": 1000,
    "following_count": 500,
    "posts_count": 50,
    "is_verified": false,
    "profile_picture_url": "https://...",
    "bio_text": "Bio text here",
    "website_url": "https://...",
    "account_type": "personal"
  },
  "scraped": true
}
```

**Special Notes:**
- Rate limited to 20 requests per hour
- Automatically scrapes data if user not found in database
- Username is normalized (lowercase, @ removed)

### Scrape User Data
**POST** `/api/user/scrape/:username`

Force scrape user data from Instagram.

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "User data scraped successfully",
  "data": {
    "username": "example_user",
    "full_name": "Example User",
    "followers_count": 1000,
    "following_count": 500,
    "posts_count": 50
  }
}
```

**Special Notes:**
- Rate limited to 20 requests per hour
- Forces fresh data scrape from Instagram

### Get User Profile
**GET** `/api/user/profile/:username`

Get user profile information from database.

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "Profile for @example_user",
  "data": {
    "_id": "user_id",
    "username": "example_user",
    "full_name": "Example User",
    "followers_count": 1000,
    "following_count": 500,
    "posts_count": 50,
    "is_verified": false,
    "profile_picture_url": "https://...",
    "bio_text": "Bio text here",
    "website_url": "https://...",
    "account_type": "personal",
    "scraped_at": "2025-10-03T22:00:00.000Z"
  }
}
```

---

## Content Endpoints

### Get User Posts
**GET** `/api/user/posts/:username`

Get user posts with pagination.

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Posts per page (1-100, default: 20)
- `sortBy` (string, optional): Sort field (`createdAt`, `-createdAt`, `likes_count`, `-likes_count`, `comments_count`, `-comments_count`)

**Response:**
```json
{
  "success": true,
  "message": "Posts for @example_user",
  "data": [
    {
      "post_id": "post_id_123",
      "post_url": "https://instagram.com/p/ABC123",
      "image_url": "https://...",
      "video_url": null,
      "caption": "Post caption",
      "likes_count": 100,
      "comments_count": 10,
      "post_date": "2025-10-01T12:00:00.000Z",
      "post_type": "image",
      "hashtags": ["tag1", "tag2"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

### Get User Reels
**GET** `/api/user/reels/:username`

Get user reels with pagination.

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Reels per page (1-100, default: 20)
- `sortBy` (string, optional): Sort field (`createdAt`, `-createdAt`, `likes_count`, `-likes_count`, `views_count`, `-views_count`)

**Response:**
```json
{
  "success": true,
  "message": "Reels for @example_user",
  "data": [
    {
      "reel_id": "reel_id_123",
      "reel_url": "https://instagram.com/reel/ABC123",
      "thumbnail_url": "https://...",
      "video_url": "https://...",
      "caption": "Reel caption",
      "views_count": 5000,
      "likes_count": 200,
      "comments_count": 20,
      "post_date": "2025-10-01T12:00:00.000Z",
      "duration_seconds": 15
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

### Get Posts URLs
**GET** `/api/user/posts-urls/:username`

Get posts URLs for a user and store in MongoDB.

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "Posts URLs retrieved and stored for @example_user",
  "data": {
    "username": "example_user",
    "profile_id": "user_id",
    "urls": [
      "https://instagram.com/p/ABC123",
      "https://instagram.com/p/DEF456"
    ],
    "total_urls": 2
  }
}
```

### Get Reels URLs
**GET** `/api/user/reels-urls/:username`

Get reels URLs for a user and store in MongoDB.

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "Reels URLs retrieved and stored for @example_user",
  "data": {
    "username": "example_user",
    "profile_id": "user_id",
    "urls": [
      "https://instagram.com/reel/ABC123",
      "https://instagram.com/reel/DEF456"
    ],
    "total_urls": 2
  }
}
```

---

## Analytics Endpoints

### Get Post Analytics
**GET** `/api/user/analytics/posts/:username`

Get post analytics (AI/ML analysis).

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "Post analytics for @example_user",
  "data": [
    {
      "post_id": "post_id_123",
      "content_categories": ["fashion", "lifestyle"],
      "vibe_classification": "energetic, aesthetic",
      "quality_score": 85,
      "lighting_score": 8.5,
      "visual_appeal_score": 9.0,
      "consistency_score": 8.0,
      "keywords": ["fashion", "lifestyle", "aesthetic"],
      "caption": "Post caption",
      "num_people": 1,
      "ambience": ["energetic", "aesthetic"],
      "image_dimensions": {
        "width": 1080,
        "height": 1350
      }
    }
  ]
}
```

### Get Reel Analytics
**GET** `/api/user/analytics/reels/:username`

Get reel analytics (AI/ML analysis).

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "Reel analytics for @example_user",
  "data": [
    {
      "reel_id": "reel_id_123",
      "content_categories": ["dance", "music"],
      "vibe_classification": "energetic, night",
      "quality_score": 90,
      "events_objects": ["dance", "music"],
      "descriptive_tags": ["energetic", "night", "dance"]
    }
  ]
}
```

### Get User Engagement Metrics
**GET** `/api/user/engagement/:username`

Get user engagement metrics (avg likes, avg comments, engagement rate).

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "Engagement metrics for @example_user",
  "data": {
    "total_likes": 5000,
    "total_comments": 500,
    "total_views": 25000,
    "avg_likes": 100,
    "avg_comments": 10,
    "engagement_rate": 5.5,
    "posts_count": 50,
    "last_updated": "2025-10-03T22:00:00.000Z",
    "calculated_at": "2025-10-03T22:00:00.000Z"
  }
}
```

---

## Advanced Analytics Endpoints

### Likes vs Comments Analytics
**GET** `/api/analytics/likesvscomments/:username`

Get detailed likes vs comments analytics.

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "Likes vs comments analytics for @example_user",
  "data": {
    "total_posts": 50,
    "total_reels": 25,
    "total_content": 75,
    "posts_data": [
      {
        "type": "post",
        "likes": 100,
        "comments": 10,
        "date": "2025-10-01T12:00:00.000Z"
      }
    ],
    "reels_data": [
      {
        "type": "reel",
        "likes": 200,
        "comments": 20,
        "date": "2025-10-01T12:00:00.000Z"
      }
    ],
    "summary": {
      "total_likes": 7500,
      "total_comments": 750,
      "avg_likes_per_post": 100,
      "avg_comments_per_post": 10,
      "avg_likes_per_reel": 200,
      "avg_comments_per_reel": 20
    }
  }
}
```

### Individual Engagement Rate Analytics
**GET** `/api/analytics/engagement/:username`

Get individual engagement rate for each post and reel using the formula: `((Likes + Comments) / Followers) × 100`

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "Engagement rate analytics for @example_user",
  "data": {
    "posts": [
      {
        "post_id": "post_id_123",
        "shortcode": "ABC123",
        "likes_count": 150,
        "comments_count": 25,
        "total_engagement": 175,
        "engagement_rate": 2.34
      },
      {
        "post_id": "post_id_456",
        "shortcode": "DEF456",
        "likes_count": 200,
        "comments_count": 30,
        "total_engagement": 230,
        "engagement_rate": 3.07
      }
    ],
    "reels": [
      {
        "reel_id": "reel_id_789",
        "shortcode": "GHI789",
        "likes_count": 300,
        "comments_count": 45,
        "total_engagement": 345,
        "engagement_rate": 4.61
      }
    ],
    "followers_count": 7476
  }
}
```

**Special Notes:**
- **Formula**: `((Likes + Comments) / Followers) × 100`
- Returns individual engagement rates for each post and reel
- Engagement rate is calculated as a percentage
- Separates posts and reels into different arrays

### Content Analysis (AI-Powered)
**GET** `/api/analytics/contentanalysis/content/:username`

Get content analysis via Grok AI API. Returns only the AI analysis data.

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "Content analysis for @example_user",
  "data": {
    "tags": [
      {"tag": "lifestyle", "percentage": 35.2},
      {"tag": "fashion", "percentage": 28.7},
      {"tag": "travel", "percentage": 15.3},
      {"tag": "food", "percentage": 12.1},
      {"tag": "miscellaneous", "percentage": 8.7}
    ]
  }
}
```

**Special Notes:**
- Uses Grok AI API for intelligent content analysis
- Returns **only** the Grok analysis data (no metadata)
- Pure JSON response from AI analysis
- No caching - always fresh analysis

### Vibe Analysis (AI-Powered)
**GET** `/api/analytics/contentanalysis/vibe/:username`

Get vibe analysis via Grok AI API. Returns only the AI analysis data.

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "Vibe analysis for @example_user",
  "data": {
    "vibes": [
      {"vibe": "energetic", "percentage": 40.0},
      {"vibe": "casual", "percentage": 30.0},
      {"vibe": "aesthetic", "percentage": 20.0},
      {"vibe": "professional", "percentage": 10.0}
    ]
  }
}
```

**Special Notes:**
- Uses Grok AI API for intelligent vibe analysis
- Returns **only** the Grok analysis data (no metadata)
- Pure JSON response from AI analysis
- No caching - always fresh analysis

### Top Tags Analytics
**GET** `/api/analytics/contentanalysis/top-tags/:username`

Get top 10 tags by percentage (no AI/LLM).

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "Top tags for @example_user",
  "data": {
    "total_tags": 150,
    "unique_tags": 45,
    "top_tags": [
      {"tag": "lifestyle", "count": 25, "percentage": 16.67},
      {"tag": "fashion", "count": 20, "percentage": 13.33},
      {"tag": "travel", "count": 15, "percentage": 10.00}
    ],
    "posts_analyzed": 12,
    "reels_analyzed": 8
  }
}
```

### Performance PQ vs Engagement
**GET** `/api/analytics/performance/pqvsengagement/:username`

Get quality score (normalized) and engagement rate percentage for each post and reel.

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "Performance PQ vs engagement for @example_user",
  "data": {
    "posts": [
      {
        "type": "post",
        "id": "post_id_123",
        "shortcode": "ABC123",
        "quality_score": 85,
        "engagement_rate_percentage": 2.34
      },
      {
        "type": "post",
        "id": "post_id_456",
        "shortcode": "DEF456",
        "quality_score": 92,
        "engagement_rate_percentage": 3.07
      }
    ],
    "reels": [
      {
        "type": "reel",
        "id": "reel_id_789",
        "shortcode": "GHI789",
        "quality_score": 88,
        "engagement_rate_percentage": 4.61
      }
    ]
  }
}
```

**Special Notes:**
- **Quality Score**: Normalized using existing normalization logic (0-100 scale)
- **Engagement Rate**: Calculated as `((Likes + Comments) / Followers) × 100`
- Separates posts and reels into different arrays
- Each item includes both quality score and engagement rate percentage

### Quality Indicators
**GET** `/api/analytics/performance/quality/:username`

Get quality indicators analytics.

**Parameters:**
- `username` (string, required): Instagram username (without @)

**Response:**
```json
{
  "success": true,
  "message": "Quality indicators for @example_user",
  "data": {
    "total_analyzed": 20,
    "posts_analyzed": 12,
    "reels_analyzed": 8,
    "quality_indicators": {
      "avg_quality_score": 82,
      "avg_lighting_score": 8.2,
      "avg_visual_appeal_score": 8.5,
      "avg_consistency_score": 8.0
    },
    "score_breakdown": {
      "quality_scores": [85, 80, 90],
      "lighting_scores": [8.5, 8.0, 9.0],
      "visual_appeal_scores": [9.0, 8.5, 8.0],
      "consistency_scores": [8.0, 8.5, 7.5]
    }
  }
}
```

---

## Utility Endpoints

### Image Proxy
**POST** `/api/proxy-image`

Download and save images from URLs.

**Request Body:**
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "filename": "image.jpg",
  "folder": "posts"
}
```

**Response:**
```json
{
  "success": true,
  "localPath": "/images/posts/image.jpg",
  "message": "Image downloaded successfully"
}
```

**Special Notes:**
- Downloads images to frontend public folder
- Creates directories if they don't exist
- Returns local path for frontend use

---

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Error message here",
  "statusCode": 400
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "User not found",
  "statusCode": 404
}
```

**429 Rate Limit Exceeded:**
```json
{
  "success": false,
  "statusCode": 429,
  "message": "Instagram API rate limit exceeded. Please try again in an hour."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error",
  "statusCode": 500
}
```

---

## Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|---------|
| Instagram Scraping | 20 requests | 1 hour |
| Other Endpoints | No limit | - |

**Rate Limited Endpoints:**
- `/api/user/validate/:username`
- `/api/user/scrape/:username`

---

## Special Features

### Username Validation
- All endpoints automatically normalize usernames (lowercase, remove @)
- Username length validation (1-30 characters)
- Automatic cleanup of invalid characters

### Pagination
- Available on posts and reels endpoints
- Default: page 1, limit 20
- Maximum limit: 100 items per page

### AI Integration
- Content and vibe analysis use Grok AI API
- Real-time analysis (no caching)
- JSON-formatted responses
- **Simplified responses**: AI endpoints return only the analysis data

### Data Storage
- MongoDB for all data persistence
- Automatic data scraping from Instagram
- URL collection and storage

### Analytics Improvements
- **Fixed Engagement Rate Formula**: Now uses `((Likes + Comments) / Followers) × 100`
- **Individual Post/Reel Analysis**: Each analytics endpoint returns data for individual posts and reels
- **Simplified Responses**: Removed unnecessary metadata, returning only requested data
- **Quality Score Normalization**: Maintains existing normalization logic for quality scores

---

## Updated Analytics Endpoints Summary

| Endpoint | New Response Format | Key Changes |
|----------|-------------------|-------------|
| `/api/analytics/engagement/:username` | Individual post/reel ER arrays | Fixed formula, individual calculations |
| `/api/analytics/contentanalysis/content/:username` | Pure Grok analysis | Removed metadata, AI-only response |
| `/api/analytics/contentanalysis/vibe/:username` | Pure Grok analysis | Removed metadata, AI-only response |
| `/api/analytics/performance/pqvsengagement/:username` | Quality score + ER arrays | Individual post/reel data, normalized scores |

All analytics endpoints now provide more granular, accurate data with simplified response structures focused on the specific metrics requested.