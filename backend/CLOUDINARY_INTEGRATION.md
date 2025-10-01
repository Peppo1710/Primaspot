# Cloudinary Integration Documentation

## Overview

This application uses Cloudinary to store all Instagram media (profile pictures, post images, videos, and reel thumbnails) during the scraping process. This ensures:

1. **Reliability**: Media is stored permanently on Cloudinary instead of relying on Instagram URLs that may expire
2. **Performance**: Cloudinary's CDN provides fast delivery worldwide
3. **Optimization**: Automatic image optimization, format conversion, and quality adjustment
4. **Storage**: Organized folder structure for easy management

## Configuration

### Environment Setup

Add your Cloudinary URL to the `.env` file in the backend directory:

```env
CLOUDINARY_URL=cloudinary://424474367888639:-QUb0qiBjtIFW5FNTQ5iWy2NLGQ@dkt88mf2n
```

The Cloudinary URL format is:
```
cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

You can find this in your Cloudinary Console: https://cloudinary.com/console

### Package Dependencies

Cloudinary is already included in `package.json`:

```json
{
  "dependencies": {
    "cloudinary": "^2.7.0"
  }
}
```

## Architecture

### CloudinaryService

Located at: `backend/src/services/CloudinaryService.js`

This service handles all Cloudinary operations:

#### Key Methods

1. **uploadProfilePicture(imageUrl, username)**
   - Uploads profile pictures
   - Folder: `instagram/profiles/{username}/`
   - Transformation: 500x500, auto quality, auto format

2. **uploadPostImage(imageUrl, username, postId)**
   - Uploads post images
   - Folder: `instagram/posts/{username}/`
   - Transformation: Auto quality, auto format

3. **uploadPostVideo(videoUrl, username, postId)**
   - Uploads post videos
   - Folder: `instagram/posts/{username}/`
   - Transformation: Auto quality, auto format

4. **uploadReelThumbnail(thumbnailUrl, username, reelId)**
   - Uploads reel thumbnails
   - Folder: `instagram/reels/{username}/`
   - Transformation: Auto quality, auto format

5. **uploadReelVideo(videoUrl, username, reelId)**
   - Uploads reel videos
   - Folder: `instagram/reels/{username}/`
   - Transformation: Auto quality, auto format

### Integration with InstagramService

The `InstagramService` automatically uploads media to Cloudinary during scraping:

#### Profile Scraping Flow

```javascript
1. Fetch profile data from Instagram
2. Upload profile picture to Cloudinary
3. Replace Instagram URL with Cloudinary URL
4. Save to database with Cloudinary URL
```

#### Post Scraping Flow

```javascript
1. Fetch posts from Instagram
2. For each post:
   - Upload image to Cloudinary (if exists)
   - Upload video to Cloudinary (if exists)
   - Replace Instagram URLs with Cloudinary URLs
3. Save posts to database with Cloudinary URLs
```

#### Reel Handling

Reels are extracted from posts, so they automatically inherit Cloudinary URLs from the post upload process.

## Folder Structure

Media is organized in Cloudinary with the following structure:

```
instagram/
├── profiles/
│   └── {username}/
│       └── profile_picture
├── posts/
│   └── {username}/
│       ├── {post_id}
│       └── {post_id}_video
└── reels/
    └── {username}/
        ├── {reel_id}_thumbnail
        └── {reel_id}_video
```

## Database Schema

All URL fields in the database store Cloudinary URLs:

### Profiles Model
- `profile_picture_url` → Cloudinary URL

### Posts Model
- `image_url` → Cloudinary URL
- `video_url` → Cloudinary URL

### Reels Model
- `thumbnail_url` → Cloudinary URL
- `video_url` → Cloudinary URL

### InstagramData Model (Raw Data)
- `profile_picture_url` → Cloudinary URL
- `image_url` → Cloudinary URL
- `video_url` → Cloudinary URL
- `thumbnail_url` → Cloudinary URL

## Error Handling

The CloudinaryService includes robust error handling:

1. **Upload Failures**: If a Cloudinary upload fails, the original Instagram URL is used as a fallback
2. **Logging**: All upload operations are logged for debugging
3. **Graceful Degradation**: Scraping continues even if some media uploads fail

## Optimizations

### Automatic Transformations

All uploaded media includes:
- **quality: auto:good** - Automatic quality optimization
- **fetch_format: auto** - Automatic format selection (WebP, AVIF, etc.)

### Profile Pictures
- Resized to 500x500 pixels
- Cropped to fill the frame
- Optimized for web delivery

### Post Images & Videos
- Original dimensions maintained
- Quality optimized for web
- Format automatically selected

## Usage Example

### Scraping User Data

When you scrape a user, media is automatically uploaded:

```bash
# Make API request to scrape user
curl -X POST http://localhost:3000/api/users/validate/username

# All media URLs in the response will be Cloudinary URLs
```

### API Response Example

```json
{
  "success": true,
  "data": {
    "profile": {
      "profile_picture_url": "https://res.cloudinary.com/dkt88mf2n/image/upload/v1234567890/instagram/profiles/username/profile_picture.jpg"
    },
    "posts": [
      {
        "image_url": "https://res.cloudinary.com/dkt88mf2n/image/upload/v1234567890/instagram/posts/username/post_id.jpg",
        "video_url": "https://res.cloudinary.com/dkt88mf2n/video/upload/v1234567890/instagram/posts/username/post_id_video.mp4"
      }
    ]
  }
}
```

## Performance Considerations

1. **Sequential Uploads**: Media is uploaded sequentially during scraping to avoid overwhelming Cloudinary's API
2. **Rate Limiting**: Cloudinary has rate limits; the service includes retry logic with exponential backoff
3. **Timeouts**: Upload operations have 15-second timeouts to prevent hanging

## Monitoring

### Logs

All Cloudinary operations are logged:

```
INFO: Uploading profile picture to Cloudinary for @username
INFO: Successfully uploaded to Cloudinary: https://res.cloudinary.com/...
ERROR: Error uploading media for post xyz: Connection timeout
```

### Cloudinary Console

Monitor your uploads in the Cloudinary Console:
- View all uploaded media
- Check storage usage
- Monitor bandwidth
- View transformation statistics

## Storage Limits

Free Cloudinary accounts include:
- 25 GB storage
- 25 GB bandwidth per month
- 1,000 transformations per month

Upgrade your plan if needed: https://cloudinary.com/pricing

## Best Practices

1. **Regular Cleanup**: Periodically delete old/unused media from Cloudinary
2. **Monitor Usage**: Keep track of storage and bandwidth usage
3. **Backup URLs**: Original Instagram URLs are lost after upload, so ensure database backups
4. **Test Configuration**: Verify Cloudinary credentials before production deployment

## Troubleshooting

### Common Issues

**Issue**: "Cloudinary configuration missing"
- **Solution**: Ensure `CLOUDINARY_URL` is set in `.env` file

**Issue**: Uploads fail with 401 Unauthorized
- **Solution**: Verify Cloudinary credentials are correct

**Issue**: Uploads timeout
- **Solution**: Check network connection and Cloudinary service status

**Issue**: Media not displaying
- **Solution**: Verify Cloudinary URLs are accessible and not blocked by CORS

### Debug Mode

Enable debug logging:

```javascript
// In CloudinaryService.js
this.logger.setLevel('debug');
```

## Future Enhancements

1. **Batch Uploads**: Implement parallel batch uploads for faster processing
2. **Caching**: Cache Cloudinary URLs to avoid re-uploading existing media
3. **Lazy Upload**: Upload media on-demand instead of during scraping
4. **Video Thumbnails**: Auto-generate video thumbnails using Cloudinary transformations
5. **Image Analysis**: Use Cloudinary's AI features for content moderation and tagging

## Support

For issues or questions:
1. Check Cloudinary documentation: https://cloudinary.com/documentation
2. Review application logs for error messages
3. Contact Cloudinary support for platform-specific issues

