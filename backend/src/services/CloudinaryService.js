// services/CloudinaryService.js
const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const logger = require('../utils/logger');

class CloudinaryService {
  constructor() {
    // Cloudinary is configured automatically via CLOUDINARY_URL env variable
    this.logger = logger.withContext('CloudinaryService');
    
    // Verify configuration
    if (!process.env.CLOUDINARY_URL) {
      this.logger.error('CLOUDINARY_URL environment variable is not set');
      throw new Error('Cloudinary configuration missing');
    }
    
    this.logger.info('Cloudinary service initialized successfully');
  }

  /**
   * Upload an image from URL to Cloudinary
   * @param {string} imageUrl - URL of the image to upload
   * @param {Object} options - Upload options
   * @returns {Promise<string>} - Cloudinary URL of uploaded image
   */
  async uploadImageFromUrl(imageUrl, options = {}) {
    try {
      if (!imageUrl) {
        this.logger.warn('No image URL provided');
        return null;
      }

      const {
        folder = 'instagram',
        resourceType = 'image',
        transformation = {},
        publicId = null
      } = options;

      this.logger.info(`Uploading ${resourceType} from URL: ${imageUrl.substring(0, 100)}...`);

      const uploadOptions = {
        folder,
        resource_type: resourceType,
        overwrite: false,
        invalidate: true,
        transformation
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      const result = await cloudinary.uploader.upload(imageUrl, uploadOptions);
      
      this.logger.info(`Successfully uploaded to Cloudinary: ${result.secure_url}`);
      return result.secure_url;
    } catch (error) {
      this.logger.error(`Error uploading image to Cloudinary: ${error.message}`, error);
      // Return original URL as fallback
      return imageUrl;
    }
  }

  /**
   * Upload a video from URL to Cloudinary
   * @param {string} videoUrl - URL of the video to upload
   * @param {Object} options - Upload options
   * @returns {Promise<string>} - Cloudinary URL of uploaded video
   */
  async uploadVideoFromUrl(videoUrl, options = {}) {
    try {
      if (!videoUrl) {
        this.logger.warn('No video URL provided');
        return null;
      }

      const {
        folder = 'instagram/videos',
        publicId = null,
        transformation = {}
      } = options;

      this.logger.info(`Uploading video from URL: ${videoUrl.substring(0, 100)}...`);

      const uploadOptions = {
        folder,
        resource_type: 'video',
        overwrite: false,
        invalidate: true,
        transformation
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      const result = await cloudinary.uploader.upload(videoUrl, uploadOptions);
      
      this.logger.info(`Successfully uploaded video to Cloudinary: ${result.secure_url}`);
      return result.secure_url;
    } catch (error) {
      this.logger.error(`Error uploading video to Cloudinary: ${error.message}`, error);
      // Return original URL as fallback
      return videoUrl;
    }
  }

  /**
   * Upload profile picture to Cloudinary
   * @param {string} imageUrl - URL of the profile picture
   * @param {string} username - Username for folder organization
   * @returns {Promise<string>} - Cloudinary URL
   */
  async uploadProfilePicture(imageUrl, username) {
    try {
      if (!imageUrl) return null;

      return await this.uploadImageFromUrl(imageUrl, {
        folder: `instagram/profiles/${username}`,
        publicId: 'profile_picture',
        transformation: {
          width: 500,
          height: 500,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto'
        }
      });
    } catch (error) {
      this.logger.error(`Error uploading profile picture: ${error.message}`);
      return imageUrl;
    }
  }

  /**
   * Upload post image to Cloudinary
   * @param {string} imageUrl - URL of the post image
   * @param {string} username - Username for folder organization
   * @param {string} postId - Post ID for file naming
   * @returns {Promise<string>} - Cloudinary URL
   */
  async uploadPostImage(imageUrl, username, postId) {
    try {
      if (!imageUrl) return null;

      return await this.uploadImageFromUrl(imageUrl, {
        folder: `instagram/posts/${username}`,
        publicId: postId,
        transformation: {
          quality: 'auto:good',
          fetch_format: 'auto'
        }
      });
    } catch (error) {
      this.logger.error(`Error uploading post image: ${error.message}`);
      return imageUrl;
    }
  }

  /**
   * Upload post video to Cloudinary
   * @param {string} videoUrl - URL of the post video
   * @param {string} username - Username for folder organization
   * @param {string} postId - Post ID for file naming
   * @returns {Promise<string>} - Cloudinary URL
   */
  async uploadPostVideo(videoUrl, username, postId) {
    try {
      if (!videoUrl) return null;

      return await this.uploadVideoFromUrl(videoUrl, {
        folder: `instagram/posts/${username}`,
        publicId: `${postId}_video`,
        transformation: {
          quality: 'auto:good',
          fetch_format: 'auto'
        }
      });
    } catch (error) {
      this.logger.error(`Error uploading post video: ${error.message}`);
      return videoUrl;
    }
  }

  /**
   * Upload reel thumbnail to Cloudinary
   * @param {string} thumbnailUrl - URL of the thumbnail
   * @param {string} username - Username for folder organization
   * @param {string} reelId - Reel ID for file naming
   * @returns {Promise<string>} - Cloudinary URL
   */
  async uploadReelThumbnail(thumbnailUrl, username, reelId) {
    try {
      if (!thumbnailUrl) return null;

      return await this.uploadImageFromUrl(thumbnailUrl, {
        folder: `instagram/reels/${username}`,
        publicId: `${reelId}_thumbnail`,
        transformation: {
          quality: 'auto:good',
          fetch_format: 'auto'
        }
      });
    } catch (error) {
      this.logger.error(`Error uploading reel thumbnail: ${error.message}`);
      return thumbnailUrl;
    }
  }

  /**
   * Upload reel video to Cloudinary
   * @param {string} videoUrl - URL of the reel video
   * @param {string} username - Username for folder organization
   * @param {string} reelId - Reel ID for file naming
   * @returns {Promise<string>} - Cloudinary URL
   */
  async uploadReelVideo(videoUrl, username, reelId) {
    try {
      if (!videoUrl) return null;

      return await this.uploadVideoFromUrl(videoUrl, {
        folder: `instagram/reels/${username}`,
        publicId: `${reelId}_video`,
        transformation: {
          quality: 'auto:good',
          fetch_format: 'auto'
        }
      });
    } catch (error) {
      this.logger.error(`Error uploading reel video: ${error.message}`);
      return videoUrl;
    }
  }

  /**
   * Upload multiple images in parallel with concurrency limit
   * @param {Array} uploads - Array of upload tasks
   * @param {number} concurrency - Number of concurrent uploads
   * @returns {Promise<Array>} - Array of Cloudinary URLs
   */
  async uploadBatch(uploads, concurrency = 3) {
    try {
      const results = [];
      
      for (let i = 0; i < uploads.length; i += concurrency) {
        const batch = uploads.slice(i, i + concurrency);
        const batchResults = await Promise.allSettled(batch);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            this.logger.error(`Upload failed in batch: ${result.reason}`);
            // Push original URL as fallback
            results.push(uploads[i + index].originalUrl);
          }
        });
        
        // Small delay between batches to avoid rate limiting
        if (i + concurrency < uploads.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return results;
    } catch (error) {
      this.logger.error(`Error in batch upload: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an image from Cloudinary
   * @param {string} publicId - Public ID of the image to delete
   * @param {string} resourceType - Type of resource (image, video, etc.)
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteMedia(publicId, resourceType = 'image') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
      
      this.logger.info(`Deleted ${resourceType} from Cloudinary: ${publicId}`);
      return result;
    } catch (error) {
      this.logger.error(`Error deleting media from Cloudinary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get optimized URL for an image
   * @param {string} cloudinaryUrl - Original Cloudinary URL
   * @param {Object} transformation - Transformation options
   * @returns {string} - Optimized URL
   */
  getOptimizedUrl(cloudinaryUrl, transformation = {}) {
    try {
      if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) {
        return cloudinaryUrl;
      }

      const defaultTransformation = {
        quality: 'auto',
        fetch_format: 'auto',
        ...transformation
      };

      // Extract public ID from URL
      const urlParts = cloudinaryUrl.split('/upload/');
      if (urlParts.length !== 2) return cloudinaryUrl;

      const [baseUrl, pathWithPublicId] = urlParts;
      const transformationString = Object.entries(defaultTransformation)
        .map(([key, value]) => `${key}_${value}`)
        .join(',');

      return `${baseUrl}/upload/${transformationString}/${pathWithPublicId}`;
    } catch (error) {
      this.logger.error(`Error generating optimized URL: ${error.message}`);
      return cloudinaryUrl;
    }
  }
}

module.exports = CloudinaryService;

