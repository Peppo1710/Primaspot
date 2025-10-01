# Instagram Dashboard API Documentation

## 🎨 Cloudinary Media Storage

All Instagram media (profile pictures, post images, videos, reel thumbnails) are automatically uploaded to Cloudinary during scraping. This ensures:
- **Permanent Storage**: Media remains available even if Instagram URLs expire
- **Fast Delivery**: Global CDN for optimal performance
- **Auto Optimization**: Automatic format conversion and quality adjustment

See `CLOUDINARY_INTEGRATION.md` for detailed documentation.

---

# Instagram Dashboard API Documentation

## Base Information

**Base URL:** `http://localhost:8000`  
**API Version:** `1.0.0`  
**Environment:** Development/Production

---

## Table of Contents

- [Overview](#overview)
- [Rate Limiting](#rate-limiting)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [API Info](#api-info)
  - [User Validation](#user-validation)
  - [User Scraping](#user-scraping)
  - [User Profile](#user-profile)
  - [User Posts](#user-posts)
  - [User Reels](#user-reels)
  - [Post Analytics](#post-analytics)
  - [Reel Analytics](#reel-analytics)
  - [Engagement Metrics](#engagement-metrics)
- [Data Models](#data-models)
- [Status Codes](#status-codes)

---

## Overview

The Instagram Dashboard API provides endpoints to fetch and analyze Instagram user profiles, posts, reels, and analytics data. The API automatically scrapes data from Instagram when a user is not found in the database and stores it for future requests.

### Key Features
- ✅ User profile validation and scraping
- ✅ Posts and reels retrieval with pagination
- ✅ AI/ML-powered post analytics
- ✅ Engagement metrics calculation
- ✅ Rate limiting and caching
- ✅ Comprehensive error handling

---

## Rate Limiting

### Global Rate Limit
- **Window:** 15 minutes
- **Max Requests:** 100 requests per IP
- **Response on Limit:** 429 Too Many Requests

### Instagram Scraping Rate Limit
- **Window:** 1 hour
- **Max Requests:** 20 requests per hour
- **Cooldown Period:** 4 hours between scrapes for the same user
- **Response on Limit:** 429 Too Many Requests

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Descriptive success message",
  "data": { /* Response data */ },
  "pagination": { /* Only for paginated endpoints */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

---

## Error Handling

All errors follow a consistent format with appropriate HTTP status codes. The API includes custom error handling for:
- Validation errors (400)
- Not found errors (404)
- Rate limit errors (429)
- Server errors (500)
- Instagram service errors (503)

---

## Endpoints

### Health Check

Check API server and database status.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-01T12:00:00.000Z",
  "uptime": 3600.123,
  "environment": "development",
  "database": {
    "status": "connected",
    "state": "connected"
  }
}
```

**Status Codes:**
- `200` - Healthy
- `503` - Service Unavailable (Database disconnected)

---

### API Info

Get API information and available endpoints.

**Endpoint:** `GET /api`

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

---

### API Documentation

Get complete API endpoint documentation.

**Endpoint:** `GET /api/docs`

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
    },
    {
      "method": "GET",
      "path": "/user/validate/:username",
      "description": "Validate if username exists on Instagram and call central API"
    }
    // ... more endpoints
  ]
}
```

---

### User Validation

Validate if a username exists in the database. If not found, automatically scrapes data from Instagram.

**Endpoint:** `GET /api/user/validate/:username`

**URL Parameters:**
- `username` (string, required) - Instagram username (1-30 characters)

**Example Request:**
```bash
GET /api/user/validate/cristiano
```

**Success Response (User Found in Database):**
```json
{
  "success": true,
  "message": "User @cristiano found in database",
  "data": {
    "username": "cristiano",
    "exists": true,
    "lastScraped": "2025-10-01T10:30:00.000Z",
    "profileId": "507f1f77bcf86cd799439011"
  }
}
```

**Success Response (User Scraped from Instagram):**
```json
{
  "success": true,
  "message": "Data successfully scraped and stored for @cristiano",
  "data": {
    "username": "cristiano",
    "profileId": "507f1f77bcf86cd799439011",
    "postsScraped": 12,
    "reelsScraped": 3,
    "totalPostsReported": 3500,
    "apiLimitations": {
      "postsAvailable": 12,
      "totalPostsReported": 3500,
      "note": "Instagram's public API only provides the first 12 posts. For complete data, consider Instagram Graph API or third-party services."
    }
  }
}
```

**Error Responses:**
```json
// Username not found on Instagram
{
  "success": false,
  "message": "Username @invaliduser not found on Instagram",
  "data": {
    "username": "invaliduser",
    "exists": false
  }
}

// Rate limit exceeded
{
  "success": false,
  "message": "Rate limit exceeded. Next scrape available at 2025-10-01T14:30:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid username format
- `404` - Username not found on Instagram
- `429` - Rate limit exceeded

---

### User Scraping

Force scrape user data from Instagram (bypasses cache).

**Endpoint:** `POST /api/user/scrape/:username`

**URL Parameters:**
- `username` (string, required) - Instagram username

**Example Request:**
```bash
POST /api/user/scrape/cristiano
```

**Success Response:**
```json
{
  "success": true,
  "message": "Data successfully scraped and stored for @cristiano",
  "data": {
    "username": "cristiano",
    "profileId": "507f1f77bcf86cd799439011",
    "postsScraped": 12,
    "reelsScraped": 3,
    "totalPostsReported": 3500,
    "apiLimitations": {
      "postsAvailable": 12,
      "totalPostsReported": 3500,
      "note": "Instagram's public API only provides the first 12 posts. For complete data, consider Instagram Graph API or third-party services."
    }
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid username
- `404` - Username not found on Instagram
- `429` - Rate limit exceeded

---

### User Profile

Get user profile information.

**Endpoint:** `GET /api/user/profile/:username`

**URL Parameters:**
- `username` (string, required) - Instagram username

**Example Request:**
```bash
GET /api/user/profile/cristiano
```

**Success Response:**
```json
{
  "success": true,
  "message": "Profile data for @cristiano",
  "data": {
    "username": "cristiano",
    "profile": {
      "full_name": "Cristiano Ronaldo",
      "profile_picture_url": "https://instagram.com/...",
      "bio_text": "Professional footballer",
      "website_url": "https://www.cristianoronaldo.com",
      "is_verified": true,
      "account_type": "business"
    },
    "stats": {
      "postsCount": 3500,
      "followersCount": 600000000,
      "followingCount": 500,
      "lastScraped": "2025-10-01T10:30:00.000Z"
    }
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid username
- `404` - User not found in database

---

### User Posts

Get user posts with pagination and sorting.

**Endpoint:** `GET /api/user/posts/:username`

**URL Parameters:**
- `username` (string, required) - Instagram username

**Query Parameters:**
- `page` (number, optional, default: 1) - Page number
- `limit` (number, optional, default: 20, max: 100) - Items per page
- `sortBy` (string, optional, default: '-instagram_data.posted_at') - Sort field
  - Options: `createdAt`, `-createdAt`, `likes_count`, `-likes_count`, `comments_count`, `-comments_count`

**Example Request:**
```bash
GET /api/user/posts/cristiano?page=1&limit=10&sortBy=-likes_count
```

**Success Response:**
```json
{
  "success": true,
  "message": "Posts for @cristiano",
  "data": [
    {
      "post_id": "ABC123XYZ",
      "post_url": "https://instagram.com/p/ABC123XYZ",
      "image_url": "https://instagram.com/...",
      "video_url": null,
      "caption": "Great match today! ⚽️",
      "likes_count": 15000000,
      "comments_count": 250000,
      "post_date": "2025-09-30T18:00:00.000Z",
      "post_type": "photo",
      "hashtags": ["#football", "#soccer"]
    }
    // ... more posts
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3500,
    "totalPages": 350,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid parameters
- `404` - User not found in database

---

### User Reels

Get user reels with pagination and sorting.

**Endpoint:** `GET /api/user/reels/:username`

**URL Parameters:**
- `username` (string, required) - Instagram username

**Query Parameters:**
- `page` (number, optional, default: 1) - Page number
- `limit` (number, optional, default: 20, max: 100) - Items per page
- `sortBy` (string, optional, default: '-instagram_data.posted_at') - Sort field
  - Options: `createdAt`, `-createdAt`, `likes_count`, `-likes_count`, `views_count`, `-views_count`

**Example Request:**
```bash
GET /api/user/reels/cristiano?page=1&limit=10&sortBy=-views_count
```

**Success Response:**
```json
{
  "success": true,
  "message": "Reels for @cristiano",
  "data": [
    {
      "reel_id": "XYZ789ABC",
      "reel_url": "https://instagram.com/reel/XYZ789ABC",
      "thumbnail_url": "https://instagram.com/...",
      "video_url": "https://instagram.com/...",
      "caption": "Behind the scenes 🎬",
      "views_count": 50000000,
      "likes_count": 8000000,
      "comments_count": 150000,
      "post_date": "2025-09-28T12:00:00.000Z",
      "duration_seconds": 30
    }
    // ... more reels
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid parameters
- `404` - User not found in database

---

### Post Analytics

Get AI/ML-powered post analytics including image analysis, keywords, vibe classification, and quality scores.

**Endpoint:** `GET /api/user/analytics/posts/:username`

**URL Parameters:**
- `username` (string, required) - Instagram username

**Prerequisites:**
- ML Backend service must be running at `http://127.0.0.1:5000`
- User must have posts in the database

**Example Request:**
```bash
GET /api/user/analytics/posts/cristiano
```

**Success Response:**
```json
{
  "success": true,
  "message": "Post analytics for @cristiano",
  "data": {
    "username": "cristiano",
    "profile_id": "507f1f77bcf86cd799439011",
    "analytics": [
      {
        "post_id": "ABC123XYZ",
        "content_categories": ["sports", "football", "action"],
        "vibe_classification": "energetic, professional",
        "quality_score": 9.2,
        "lighting_score": 8.5,
        "visual_appeal_score": 9.0,
        "consistency_score": 8.8,
        "keywords": ["football", "stadium", "celebration", "team"]
      }
      // ... more analytics
    ],
    "total_analyzed": 12,
    "analyzed_at": "2025-10-01T11:00:00.000Z"
  }
}
```

**Error Response (ML API Unavailable):**
```json
{
  "success": false,
  "message": "Failed to analyze posts for @cristiano",
  "error": {
    "type": "ML_API_ERROR",
    "message": "ML API call failed",
    "imageUrls": ["https://..."],
    "mlApiUrl": "http://127.0.0.1:5000/analyze"
  }
}
```

**Status Codes:**
- `200` - Success (including cached results)
- `400` - Invalid username
- `404` - User not found in database
- `500` - ML API error

**Notes:**
- Analytics are cached after first generation
- ML API must be running separately
- Processing time depends on number of posts

---

### Reel Analytics

Get reel analytics (placeholder - under development).

**Endpoint:** `GET /api/user/analytics/reels/:username`

**URL Parameters:**
- `username` (string, required) - Instagram username

**Example Request:**
```bash
GET /api/user/analytics/reels/cristiano
```

**Success Response:**
```json
{
  "success": true,
  "message": "Reel analytics for @cristiano (placeholder)",
  "data": {
    "message": "Reel analytics feature is under development",
    "features": [
      "Video analysis using AI/ML",
      "Engagement analysis",
      "Performance metrics",
      "Content insights"
    ],
    "status": "coming_soon"
  }
}
```

**Status Codes:**
- `200` - Success (placeholder response)

---

### Engagement Metrics

Get user engagement metrics including average likes, comments, and engagement rate.

**Endpoint:** `GET /api/user/engagement/:username`

**URL Parameters:**
- `username` (string, required) - Instagram username

**Example Request:**
```bash
GET /api/user/engagement/cristiano
```

**Success Response:**
```json
{
  "success": true,
  "message": "Engagement metrics for @cristiano",
  "data": {
    "avg_likes": 12500000,
    "avg_comments": 180000,
    "engagement_rate": 2.11
  }
}
```

**Calculation Logic:**
- `avg_likes` = Total likes across all posts and reels / Total content count
- `avg_comments` = Total comments across all posts and reels / Total content count
- `engagement_rate` = ((Total likes + Total comments) / Total content) / Followers count * 100

**Status Codes:**
- `200` - Success
- `400` - Invalid username
- `404` - User not found in database

---

## Legacy Endpoints

The following endpoints are maintained for backward compatibility but are deprecated:

### Legacy User Endpoint
**Endpoint:** `GET /api/user/:username`  
**Redirect:** Uses validate logic internally  
**Status:** Deprecated, use `/api/user/validate/:username` instead

### Legacy Posts Endpoint
**Endpoint:** `GET /api/user/:username/posts`  
**Redirect:** Uses posts logic internally  
**Status:** Deprecated, use `/api/user/posts/:username` instead

### Legacy Analytics Endpoint
**Endpoint:** `GET /api/user/:username/analytics`  
**Redirect:** Uses profile logic internally  
**Status:** Deprecated, use `/api/user/profile/:username` instead

---

## Data Models

### Profile Model
```typescript
{
  _id: ObjectId,
  username: string,              // lowercase, unique
  full_name: string,
  profile_picture_url: string,
  bio_text: string,
  website_url: string,
  is_verified: boolean,
  account_type: 'personal' | 'business' | 'creator',
  followers_count: number,
  following_count: number,
  posts_count: number,
  scraped_at: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Post Model
```typescript
{
  _id: ObjectId,
  username: string,
  profile_id: ObjectId,          // Reference to Profile
  posts: [
    {
      post_id: string,
      post_url: string,
      image_url: string,
      video_url: string | null,
      caption: string,
      likes_count: number,
      comments_count: number,
      post_date: Date,
      post_type: 'photo' | 'video' | 'carousel',
      hashtags: string[]
    }
  ],
  total_posts: number,
  scraped_at: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Reel Model
```typescript
{
  _id: ObjectId,
  username: string,
  profile_id: ObjectId,          // Reference to Profile
  reels: [
    {
      reel_id: string,
      reel_url: string,
      thumbnail_url: string,
      video_url: string,
      caption: string,
      views_count: number,
      likes_count: number,
      comments_count: number,
      post_date: Date,
      duration_seconds: number
    }
  ],
  total_reels: number,
  scraped_at: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Post AI Analysis Model
```typescript
{
  _id: ObjectId,
  username: string,
  profile_id: ObjectId,          // Reference to Profile
  analytics: [
    {
      post_id: string,
      content_categories: string[],
      vibe_classification: string,
      quality_score: number,     // 0-10
      lighting_score: number,    // 0-10
      visual_appeal_score: number, // 0-10
      consistency_score: number,  // 0-10
      keywords: string[]
    }
  ],
  total_analyzed: number,
  analyzed_at: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| `200` | OK - Request successful |
| `400` | Bad Request - Invalid parameters or validation error |
| `404` | Not Found - Resource not found |
| `408` | Request Timeout - Request to Instagram timed out |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error - Server error |
| `503` | Service Unavailable - External service unavailable |

---

## Instagram API Limitations

⚠️ **Important:** This API uses Instagram's public web interface, which has significant limitations:

### Current Limitations
1. **Posts Limit:** Only the first 12 posts are accessible via public API
2. **Private Accounts:** Cannot access data from private accounts
3. **Rate Limiting:** Instagram may block requests if too many are made
4. **Data Freshness:** Data is cached to respect rate limits (4-hour cooldown)

### Total Posts vs Available Posts
When you scrape a user:
- `totalPostsReported` - Total posts the user has on Instagram
- `postsAvailable` - Number of posts actually scraped (max 12)

### Recommendations for Complete Data
For production use with full data access, consider:
1. **Instagram Graph API** - Official API requiring business account and app review
2. **Instagram Basic Display API** - For user's own content only
3. **Third-party Services** - Paid services with better data access
4. **Instaloader/Instagram-Scraper** - Open-source scraping tools (use responsibly)

---

## ML Backend Integration

The Post Analytics endpoint requires a separate ML backend service running at `http://127.0.0.1:5000`.

### ML API Endpoint
**URL:** `POST http://127.0.0.1:5000/analyze`

**Request:**
```json
{
  "urls": [
    "https://instagram.com/image1.jpg",
    "https://instagram.com/image2.jpg"
  ]
}
```

**Response:**
```json
{
  "results": {
    "0": {
      "keywords": ["football", "stadium"],
      "vibe": ["energetic", "professional"],
      "quality": {
        "visual_appeal": 9.2,
        "lighting": "good",
        "consistency": 8.8
      }
    }
  }
}
```

---

## Security Headers

The API implements several security measures:

### Helmet.js Security Headers
- Content Security Policy disabled for media loading
- Cross-Origin Embedder Policy disabled

### CORS Configuration
- **Allowed Origins:** All origins (development mode)
- **Credentials:** Enabled
- **Methods:** GET, POST, PUT, DELETE, OPTIONS, PATCH
- **Allowed Headers:** Content-Type, Authorization, X-Requested-With, Accept, Origin
- **Exposed Headers:** X-Request-ID

---

## Request ID Tracking

Every request receives a unique request ID in the response headers:
```
X-Request-ID: abc123xyz456
```

Use this ID for debugging and tracking requests in logs.

---

## Example Frontend Integration (JavaScript)

### Fetch User Profile
```javascript
async function getUserProfile(username) {
  try {
    const response = await fetch(`http://localhost:8000/api/user/validate/${username}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('Profile:', data.data);
      return data.data;
    } else {
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

### Fetch User Posts with Pagination
```javascript
async function getUserPosts(username, page = 1, limit = 20) {
  try {
    const response = await fetch(
      `http://localhost:8000/api/user/posts/${username}?page=${page}&limit=${limit}&sortBy=-likes_count`
    );
    const data = await response.json();
    
    if (data.success) {
      console.log('Posts:', data.data);
      console.log('Pagination:', data.pagination);
      return data;
    } else {
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

### Fetch Post Analytics
```javascript
async function getPostAnalytics(username) {
  try {
    const response = await fetch(
      `http://localhost:8000/api/user/analytics/posts/${username}`
    );
    const data = await response.json();
    
    if (data.success) {
      console.log('Analytics:', data.data.analytics);
      return data.data;
    } else {
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

### Fetch Engagement Metrics
```javascript
async function getEngagementMetrics(username) {
  try {
    const response = await fetch(
      `http://localhost:8000/api/user/engagement/${username}`
    );
    const data = await response.json();
    
    if (data.success) {
      console.log('Engagement:', data.data);
      return data.data;
    } else {
      console.error('Error:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

---

## Example Frontend Integration (React)

### Custom Hook for API Calls
```javascript
import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000/api';

export function useUserProfile(username) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) return;

    async function fetchProfile() {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/user/validate/${username}`);
        const data = await response.json();
        
        if (data.success) {
          setProfile(data.data);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [username]);

  return { profile, loading, error };
}

export function useUserPosts(username, page = 1, limit = 20) {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) return;

    async function fetchPosts() {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE_URL}/user/posts/${username}?page=${page}&limit=${limit}`
        );
        const data = await response.json();
        
        if (data.success) {
          setPosts(data.data);
          setPagination(data.pagination);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [username, page, limit]);

  return { posts, pagination, loading, error };
}
```

---

## Support & Issues

For issues, questions, or feature requests, please contact the development team or create an issue in the project repository.

---

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- User validation and scraping
- Posts and reels retrieval with pagination
- Post analytics with ML integration
- Engagement metrics calculation
- Rate limiting and caching
- Comprehensive error handling

---

**Last Updated:** October 1, 2025  
**API Version:** 1.0.0  
**Author:** Instagram Dashboard Team

