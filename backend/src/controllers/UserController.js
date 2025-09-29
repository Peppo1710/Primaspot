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
      
      // Store all data in database
      const profile = await this.databaseService.upsertUser(instagramData.profile);
      const savedPosts = await this.databaseService.savePosts(profile._id, instagramData.posts);
      const savedReels = await this.databaseService.saveReels(profile._id, instagramData.reels);
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
          profile: user.profile,
          stats: {
            postsCount: user.profile?.posts_count || 0,
            followersCount: user.profile?.followers_count || 0,
            followingCount: user.profile?.following_count || 0,
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
   * Get Post Analytics - Analyze post performance (placeholder for future implementation)
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

      // TODO: Implement post analytics
      // This would include:
      // - Photo analysis using AI/ML
      // - Engagement analysis
      // - Performance metrics
      // - Content insights

      return res.status(200).json({
        success: true,
        message: `Post analytics for @${username} (placeholder)`,
        data: {
          message: "Post analytics feature is under development",
          features: [
            "Photo analysis using AI/ML",
            "Engagement analysis",
            "Performance metrics",
            "Content insights"
          ],
          status: "coming_soon"
        }
      });

    } catch (error) {
      logger.error(`Error fetching post analytics for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get Reel Analytics - Analyze reel performance (placeholder for future implementation)
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

      // TODO: Implement reel analytics
      // This would include:
      // - Video analysis using AI/ML
      // - Engagement analysis
      // - Performance metrics
      // - Content insights

      return res.status(200).json({
        success: true,
        message: `Reel analytics for @${username} (placeholder)`,
        data: {
          message: "Reel analytics feature is under development",
          features: [
            "Video analysis using AI/ML",
            "Engagement analysis",
            "Performance metrics",
            "Content insights"
          ],
          status: "coming_soon"
        }
      });

    } catch (error) {
      logger.error(`Error fetching reel analytics for ${req.params.username}:`, error);
      next(error);
    }
  }
}

module.exports = UserController;