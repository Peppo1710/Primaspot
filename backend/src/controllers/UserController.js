require('dotenv').config();
const InstagramService = require('../services/InstagramService');
const DatabaseService = require('../services/DatabaseService');
const logger = require('../utils/logger');

class UserController {
  constructor() {
    this.instagramService = new InstagramService();
    this.databaseService = new DatabaseService();
    
    // Bind methods to preserve 'this' context
    this.validateUser = this.validateUser.bind(this);
    this.scrapeUserData = this.scrapeUserData.bind(this);
    this.getUserProfile = this.getUserProfile.bind(this);
    this.getUserPosts = this.getUserPosts.bind(this);
    this.getUserReels = this.getUserReels.bind(this);
    this.getPostAnalytics = this.getPostAnalytics.bind(this);
    this.getReelAnalytics = this.getReelAnalytics.bind(this);
    this.getUserEngagementMetrics = this.getUserEngagementMetrics.bind(this);
    this.getPostsUrls = this.getPostsUrls.bind(this);
    this.getReelsUrls = this.getReelsUrls.bind(this);
  }

  /**
   * Validate User - Check if username exists in database
   * If exists, return username. If not, call scrape controller.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async validateUser(req, res, next) {
    try {
      const { username } = req.params;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Validating user: ${username}`);

      // Check if user exists in database
      const existingUser = await this.databaseService.findUserByUsername(username);
      
      if (existingUser) {
        logger.info(`User ${username} found in database`);
        return res.status(200).json({
          success: true,
          message: `User @${username} found in database`,
          data: {
            username: existingUser.username,
            exists: true,
            lastScraped: existingUser.scraped_at || existingUser.updated_at,
            profileId: existingUser._id
          }
        });
      }

      // User not found in database, call scrape controller
      logger.info(`User ${username} not found in database, calling scrape controller`);
      return await this.scrapeUserData(req, res, next);

    } catch (error) {
      logger.error(`Error validating user ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Scrape User Data - Scrape data from Instagram and store in database
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async scrapeUserData(req, res, next) {
    try {
      const { username } = req.params;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Starting data scrape for: ${username}`);

      // Check rate limit
      const rateLimitCheck = await this.databaseService.checkRateLimit(username);
      if (!rateLimitCheck.canScrape) {
        return res.status(429).json({
          success: false,
          message: `Rate limit exceeded. Next scrape available at ${rateLimitCheck.nextAllowedScrape}`
        });
      }

      // Check if username exists on Instagram
      const usernameCheck = await this.instagramService.checkUsernameExists(username);
      
      if (!usernameCheck.exists) {
        return res.status(404).json({
          success: false,
          message: `Username @${username} not found on Instagram`,
          data: {
            username,
            exists: false
          }
        });
      }

      // Scrape complete user data from Instagram
      const instagramData = await this.instagramService.getCompleteUserData(username, 0);
      
      // Store all data in database (images will be cached on frontend)
      const profile = await this.databaseService.upsertUser(instagramData.profile);
      const savedPosts = await this.databaseService.savePosts(profile._id, instagramData.posts, username);
      const savedReels = await this.databaseService.saveReels(profile._id, instagramData.reels, username);
      const savedAnalytics = await this.databaseService.saveAnalytics(profile._id, instagramData.analytics);
      
      // Update scraping status
      await this.databaseService.updateScrapingStatus(profile._id, 'completed');

      logger.info(`Successfully scraped and stored data for ${username}: ${savedPosts.length} posts, ${savedReels.length} reels`);

      return res.status(200).json({
        success: true,
        message: `Data successfully scraped and stored for @${username}`,
        data: {
          username,
          profileId: profile._id,
          postsScraped: savedPosts.length,
          reelsScraped: savedReels.length,
          totalPostsReported: instagramData.profile.profile.posts_count,
          apiLimitations: {
            postsAvailable: savedPosts.length,
            totalPostsReported: instagramData.profile.profile.posts_count,
            note: "Instagram's public API only provides the first 12 posts. For complete data, consider Instagram Graph API or third-party services."
          }
        }
      });

    } catch (error) {
      logger.error(`Error scraping data for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get User Profile - Fetch user profile data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getUserProfile(req, res, next) {
    try {
      const { username } = req.params;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Fetching profile for user: ${username}`);

      const user = await this.databaseService.findUserByUsername(username);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User @${username} not found in database`
        });
      }

      return res.status(200).json({
        success: true,
        message: `Profile data for @${username}`,
        data: {
          username: user.username,
          profile: {
            full_name: user.full_name,
            profile_picture_url: user.profile_picture_url,
            bio_text: user.bio_text,
            website_url: user.website_url,
            is_verified: user.is_verified,
            account_type: user.account_type
          },
          stats: {
            postsCount: user.posts_count || 0,
            followersCount: user.followers_count || 0,
            followingCount: user.following_count || 0,
            lastScraped: user.scraped_at || user.updated_at
          }
        }
      });

    } catch (error) {
      logger.error(`Error fetching profile for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get User Posts - Fetch user posts with pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getUserPosts(req, res, next) {
    try {
      const { username } = req.params;
      const { page = 1, limit = 20, sortBy = '-instagram_data.posted_at' } = req.query;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Fetching posts for user: ${username}`);

      const user = await this.databaseService.findUserByUsername(username);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User @${username} not found in database`
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const posts = await this.databaseService.getUserPosts(user._id, {
        limit: parseInt(limit),
        skip,
        sortBy
      });

      const totalPosts = user.profile?.posts_count || posts.length;

      return res.status(200).json({
        success: true,
        message: `Posts for @${username}`,
        data: posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalPosts,
          totalPages: Math.ceil(totalPosts / parseInt(limit)),
          hasNext: skip + posts.length < totalPosts,
          hasPrev: parseInt(page) > 1
        }
      });

    } catch (error) {
      logger.error(`Error fetching posts for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get User Reels - Fetch user reels with pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getUserReels(req, res, next) {
    try {
      const { username } = req.params;
      const { page = 1, limit = 20, sortBy = '-instagram_data.posted_at' } = req.query;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Fetching reels for user: ${username}`);

      const user = await this.databaseService.findUserByUsername(username);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User @${username} not found in database`
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const reels = await this.databaseService.getUserReels(user._id, {
        limit: parseInt(limit),
        skip,
        sortBy
      });

      const totalReels = reels.length; // You might want to add reels_count to profile

      return res.status(200).json({
        success: true,
        message: `Reels for @${username}`,
        data: reels,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalReels,
          totalPages: Math.ceil(totalReels / parseInt(limit)),
          hasNext: skip + reels.length < totalReels,
          hasPrev: parseInt(page) > 1
        }
      });

    } catch (error) {
      logger.error(`Error fetching reels for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get Post Analytics - Analyze post performance using ML API
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getPostAnalytics(req, res, next) {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Fetching post analytics for user: ${username}`);

      const user = await this.databaseService.findUserByUsername(username);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User @${username} not found in database`
        });
      }

      // Get user posts
      const posts = await this.databaseService.getUserPosts(user._id, { limit: 1000 });
      
      if (posts.length === 0) {
        return res.status(200).json({
          success: true,
          message: `No posts found for @${username}`,
          data: []
        });
      }

      // Check if we already have analytics data for this user
      const existingAnalytics = await this.databaseService.getPostAnalytics(user._id);
      
      if (existingAnalytics.length > 0) {
        logger.info(`Found existing analytics for ${existingAnalytics.length} posts`);
        return res.status(200).json({
          success: true,
          message: `Post analytics for @${username}`,
          data: existingAnalytics
        });
      }

      // No existing analytics, call ML API
      logger.info(`No existing analytics found, calling ML API for ${posts.length} posts`);
      
      // Extract image URLs from posts
      const imageUrls = posts
        .filter(post => post.image_url)
        .map(post => post.image_url);

      if (imageUrls.length === 0) {
        return res.status(200).json({
          success: true,
          message: `No images found in posts for @${username}`,
          data: []
        });
      }

      console.log("imageUrls", imageUrls);
      console.log('type of imageUrls:', typeof imageUrls);
console.log('Array.isArray(imageUrls):', Array.isArray(imageUrls));
console.log('imageUrls length:', imageUrls && imageUrls.length);
console.log('first item type:', imageUrls && typeof imageUrls[0]);

      

      // Call ML API
      const mlApiUrl = 'http://127.0.0.1:5000/analyze';
      logger.info(`Calling ML API with ${imageUrls.length} image URLs:`, imageUrls);
      
      try {
        const mlResponse = await fetch(mlApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ urls: imageUrls }),
          timeout: 30000 // 30 second timeout
        });

        if (!mlResponse.ok) {
          logger.error(`ML API error: ${mlResponse.status} ${mlResponse.statusText}`);
          throw new Error(`ML API error: ${mlResponse.status} ${mlResponse.statusText}`);
        }

        const mlData = await mlResponse.json();
        logger.info(`ML API returned data:`, JSON.stringify(mlData, null, 2));

        // Check if ML API returned valid data
        if (!mlData || Object.keys(mlData).length === 0) {
          logger.warn('ML API returned empty or invalid data');
          return res.status(200).json({
            success: true,
            message: `ML API returned no analysis data for @${username}`,
            data: {
              message: "ML API returned empty data",
              imageUrls: imageUrls,
              mlResponse: mlData
            }
          });
        }

        // Convert ML API response format to array format
        // ML API returns data as { "image_url": { analysis_data } }
        const analyticsArray = Object.entries(mlData).map(([imageUrl, analysis]) => ({
          image_url: imageUrl,
          ...analysis
        }));
        logger.info(`Converted ML data to array with ${analyticsArray.length} items`);

        // Store analytics in database
        const savedAnalytics = await this.databaseService.savePostAnalytics(posts, analyticsArray, user._id, username);
        
        return res.status(200).json({
          success: true,
          message: `Post analytics for @${username}`,
          data: savedAnalytics
        });

      } catch (mlError) {
        logger.error(`ML API call failed:`, mlError);
        
        // Return error response instead of throwing
        return res.status(500).json({
          success: false,
          message: `Failed to analyze posts for @${username}`,
          error: {
            type: 'ML_API_ERROR',
            message: mlError.message,
            imageUrls: imageUrls,
            mlApiUrl: mlApiUrl
          }
        });
      }

    } catch (error) {
      logger.error(`Error fetching post analytics for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get Reel Analytics - Analyze reel performance using ML API
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getReelAnalytics(req, res, next) {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Fetching reel analytics for user: ${username}`);

      const user = await this.databaseService.findUserByUsername(username);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User @${username} not found in database`
        });
      }

      // Get user reels
      const reels = await this.databaseService.getUserReels(user._id, { limit: 1000 });
      
      if (reels.length === 0) {
        return res.status(200).json({
          success: true,
          message: `No reels found for @${username}`,
          data: []
        });
      }

      // Check if we already have analytics data for this user's reels
      const existingAnalytics = await this.databaseService.getReelAnalytics(user._id);
      
      if (existingAnalytics.length > 0) {
        logger.info(`Found existing reel analytics for ${existingAnalytics.length} reels`);
        return res.status(200).json({
          success: true,
          message: `Reel analytics for @${username}`,
          data: existingAnalytics
        });
      }

      // No existing analytics, call ML API
      logger.info(`No existing reel analytics found, calling ML API for ${reels.length} reels`);
      
      // Extract thumbnail URLs from reels
      const thumbnailUrls = reels
        .filter(reel => reel.thumbnail_url)
        .map(reel => reel.thumbnail_url);

      if (thumbnailUrls.length === 0) {
        return res.status(200).json({
          success: true,
          message: `No thumbnails found in reels for @${username}`,
          data: []
        });
      }

      // Call ML API
      const mlApiUrl = 'http://127.0.0.1:5000/analyze';
      logger.info(`Calling ML API with ${thumbnailUrls.length} reel thumbnail URLs:`, thumbnailUrls);
      
      try {
        const mlResponse = await fetch(mlApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ urls: thumbnailUrls }),
          timeout: 30000 // 30 second timeout
        });

        if (!mlResponse.ok) {
          logger.error(`ML API error: ${mlResponse.status} ${mlResponse.statusText}`);
          throw new Error(`ML API error: ${mlResponse.status} ${mlResponse.statusText}`);
        }

        const mlData = await mlResponse.json();
        logger.info(`ML API returned reel data:`, JSON.stringify(mlData, null, 2));

        // Check if ML API returned valid data
        if (!mlData || Object.keys(mlData).length === 0) {
          logger.warn('ML API returned empty or invalid reel data');
          return res.status(200).json({
            success: true,
            message: `ML API returned no analysis data for @${username} reels`,
            data: {
              message: "ML API returned empty data",
              thumbnailUrls: thumbnailUrls,
              mlResponse: mlData
            }
          });
        }

        // Convert ML API response format to array format
        // ML API returns data as { "thumbnail_url": { analysis_data } }
        const analyticsArray = Object.entries(mlData).map(([thumbnailUrl, analysis]) => ({
          thumbnail_url: thumbnailUrl,
          ...analysis
        }));
        logger.info(`Converted ML reel data to array with ${analyticsArray.length} items`);

        // Store analytics in database
        const savedAnalytics = await this.databaseService.saveReelAnalytics(reels, analyticsArray, user._id, username);
        
        return res.status(200).json({
          success: true,
          message: `Reel analytics for @${username}`,
          data: savedAnalytics
        });

      } catch (mlError) {
        logger.error(`ML API call failed for reels:`, mlError);
        
        // Return error response instead of throwing
        return res.status(500).json({
          success: false,
          message: `Failed to analyze reels for @${username}`,
          error: {
            type: 'ML_API_ERROR',
            message: mlError.message,
            thumbnailUrls: thumbnailUrls,
            mlApiUrl: mlApiUrl
          }
        });
      }

    } catch (error) {
      logger.error(`Error fetching reel analytics for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get User Engagement Metrics - Simple metrics from posts and reels
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getUserEngagementMetrics(req, res, next) {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Fetching engagement metrics for user: ${username}`);

      const user = await this.databaseService.findUserByUsername(username);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User @${username} not found in database`
        });
      }

      // Get all posts and reels for the user
      const posts = await this.databaseService.getUserPosts(user._id, { limit: 1000 });
      const reels = await this.databaseService.getUserReels(user._id, { limit: 1000 });

      // Calculate metrics from posts
      const postsTotalLikes = posts.reduce((sum, post) => sum + (post.likes_count || 0), 0);
      const postsTotalComments = posts.reduce((sum, post) => sum + (post.comments_count || 0), 0);

      // Calculate metrics from reels
      const reelsTotalLikes = reels.reduce((sum, reel) => sum + (reel.likes_count || 0), 0);
      const reelsTotalComments = reels.reduce((sum, reel) => sum + (reel.comments_count || 0), 0);

      // Combined totals
      const totalLikes = postsTotalLikes + reelsTotalLikes;
      const totalComments = postsTotalComments + reelsTotalComments;
      const totalContent = posts.length + reels.length;

      // Calculate averages
      const avgLikes = totalContent > 0 ? Math.round(totalLikes / totalContent) : 0;
      const avgComments = totalContent > 0 ? Math.round(totalComments / totalContent) : 0;

      // Calculate engagement rate
      const totalEngagement = totalLikes + totalComments;
      const engagementRate = user.followers_count > 0 && totalContent > 0
        ? parseFloat(((totalEngagement / totalContent) / user.followers_count * 100).toFixed(2))
        : 0;

      return res.status(200).json({
        success: true,
        message: `Engagement metrics for @${username}`,
        data: {
          avg_likes: avgLikes,
          avg_comments: avgComments,
          engagement_rate: engagementRate
        }
      });

    } catch (error) {
      logger.error(`Error fetching engagement metrics for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get Posts URLs - Extract URLs from posts and store in MongoDB
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getPostsUrls(req, res, next) {
    try {
      const { username } = req.params;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Fetching posts URLs for user: ${username}`);

      // Check if user exists in database
      const user = await this.databaseService.findUserByUsername(username);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User @${username} not found in database`
        });
      }

      // Check if we already have URLs stored for this user
      const existingUrls = await this.databaseService.getPostsUrlsByUsername(username);
      
      if (existingUrls) {
        logger.info(`Found existing posts URLs for ${username}: ${existingUrls.total_urls} URLs`);
        
        // Also get the original posts data
        const posts = await this.databaseService.getUserPosts(user._id, { limit: 1000 });
        
        return res.status(200).json({
          success: true,
          message: `Posts URLs for @${username} (from cache)`,
          data: {
            urls: existingUrls.urls,
            total_urls: existingUrls.total_urls,
            created_at: existingUrls.created_at,
            posts_data: posts
          }
        });
      }

      // No existing URLs, extract from posts
      logger.info(`No existing URLs found, extracting from posts for ${username}`);
      
      const posts = await this.databaseService.getUserPosts(user._id, { limit: 1000 });
      
      if (posts.length === 0) {
        return res.status(200).json({
          success: true,
          message: `No posts found for @${username}`,
          data: {
            urls: [],
            total_urls: 0,
            posts_data: []
          }
        });
      }

      // Extract URLs from posts (image_url and video_url)
      const urls = [];
      posts.forEach(post => {
        if (post.image_url) {
          urls.push(post.image_url);
        }
        if (post.video_url) {
          urls.push(post.video_url);
        }
      });

      // Remove duplicates
      const uniqueUrls = [...new Set(urls)];

      // Store URLs in database
      const savedUrls = await this.databaseService.savePostsUrls(user._id, username, uniqueUrls);
      
      logger.info(`Successfully extracted and stored ${uniqueUrls.length} unique URLs for ${username}`);

      return res.status(200).json({
        success: true,
        message: `Posts URLs extracted and stored for @${username}`,
        data: {
          urls: savedUrls.urls,
          total_urls: savedUrls.total_urls,
          created_at: savedUrls.created_at,
          posts_data: posts
        }
      });

    } catch (error) {
      logger.error(`Error fetching posts URLs for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get Reels URLs - Extract URLs from reels and store in MongoDB
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getReelsUrls(req, res, next) {
    try {
      const { username } = req.params;
      
      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Fetching reels URLs for user: ${username}`);

      // Check if user exists in database
      const user = await this.databaseService.findUserByUsername(username);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User @${username} not found in database`
        });
      }

      // Check if we already have URLs stored for this user
      const existingUrls = await this.databaseService.getReelsUrlsByUsername(username);
      
      if (existingUrls) {
        logger.info(`Found existing reels URLs for ${username}: ${existingUrls.total_urls} URLs`);
        
        // Also get the original reels data
        const reels = await this.databaseService.getUserReels(user._id, { limit: 1000 });
        
        return res.status(200).json({
          success: true,
          message: `Reels URLs for @${username} (from cache)`,
          data: {
            urls: existingUrls.urls,
            total_urls: existingUrls.total_urls,
            created_at: existingUrls.created_at,
            reels_data: reels
          }
        });
      }

      // No existing URLs, extract from reels
      logger.info(`No existing URLs found, extracting from reels for ${username}`);
      
      const reels = await this.databaseService.getUserReels(user._id, { limit: 1000 });
      
      if (reels.length === 0) {
        return res.status(200).json({
          success: true,
          message: `No reels found for @${username}`,
          data: {
            urls: [],
            total_urls: 0,
            reels_data: []
          }
        });
      }

      // Extract URLs from reels (thumbnail_url and video_url)
      const urls = [];
      reels.forEach(reel => {
        if (reel.thumbnail_url) {
          urls.push(reel.thumbnail_url);
        }
        if (reel.video_url) {
          urls.push(reel.video_url);
        }
      });

      // Remove duplicates
      const uniqueUrls = [...new Set(urls)];

      // Store URLs in database
      const savedUrls = await this.databaseService.saveReelsUrls(user._id, username, uniqueUrls);
      
      logger.info(`Successfully extracted and stored ${uniqueUrls.length} unique URLs for ${username}`);

      return res.status(200).json({
        success: true,
        message: `Reels URLs extracted and stored for @${username}`,
        data: {
          urls: savedUrls.urls,
          total_urls: savedUrls.total_urls,
          created_at: savedUrls.created_at,
          reels_data: reels
        }
      });

    } catch (error) {
      logger.error(`Error fetching reels URLs for ${req.params.username}:`, error);
      next(error);
    }
  }
}

module.exports = UserController;