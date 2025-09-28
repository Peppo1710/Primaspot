const InstagramService = require('../services/InstagramService');
const DatabaseService = require('../services/DatabaseService');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

class UserController {
  constructor() {
    this.instagramService = new InstagramService();
    this.databaseService = new DatabaseService();
    
    // Bind methods to preserve 'this' context
    this.getUser = this.getUser.bind(this);
    this.refreshUser = this.refreshUser.bind(this);
    this.getUserPosts = this.getUserPosts.bind(this);
    this.getUserAnalytics = this.getUserAnalytics.bind(this);
    this.searchUsers = this.searchUsers.bind(this);
    this.scrapeAndStoreAllData = this.scrapeAndStoreAllData.bind(this);
  }

  async getUser(req, res, next) {
    try {
      const { username } = req.params;
      logger.info(`Scraping complete data for: ${username}`);

      // Check if profile exists in database
      const existingProfile = await this.databaseService.findUserByUsername(username);

      if (existingProfile) {
        // Check if data is recent (less than 4 hours old)
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
        const lastScraped = new Date(existingProfile.scraped_at || existingProfile.updated_at);
        
        if (lastScraped > fourHoursAgo) {
          logger.info(`Data for ${username} is recent, returning success`);
          return res.json({
            success: true,
            message: `Data for @${username} is already up to date`
          });
        }
      }

      // Scrape all data from Instagram
      await this.scrapeAndStoreAllData(username, res);

    } catch (error) {
      logger.error(`Error in getUser for ${req.params.username}:`, error);
      next(error);
    }
  }

  async refreshUser(req, res, next) {
    try {
      const { username } = req.params;
      logger.info(`Force refreshing all data for: ${username}`);

      // Check rate limit
      const rateLimitCheck = await this.databaseService.checkRateLimit(username);

      if (!rateLimitCheck.canScrape) {
        return res.status(429).json({
          success: false,
          message: `Rate limit exceeded. Next refresh available at ${rateLimitCheck.nextAllowedScrape}`
        });
      }

      // Force scrape all data regardless of existing data
      await this.scrapeAndStoreAllData(username, res);

    } catch (error) {
      logger.error(`Error in refreshUser for ${req.params.username}:`, error);
      next(error);
    }
  }

  //Here i have to make changes to get data of all posts of a user
  async getUserPosts(req, res, next) {
    try {
      const { username } = req.params;
      const { page = 1, limit = 20, sortBy = '-instagram_data.posted_at' } = req.query;

      logger.info(`Getting posts for user: ${username}`);

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

      const totalPosts = user.profile.posts_count || posts.length;

      res.json({
        success: true,
        data: posts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalPosts,
          totalPages: Math.ceil(totalPosts / parseInt(limit)),
          hasNext: skip + posts.length < totalPosts,
          hasPrev: parseInt(page) > 1
        },
        message: `Posts for @${username}`
      });

    } catch (error) {
      logger.error(`Error in getUserPosts for ${req.params.username}:`, error);
      next(error);
    }
  }

  async getUserAnalytics(req, res, next) {
    try {
      const { username } = req.params;
      logger.info(`Getting analytics for user: ${username}`);

      const user = await this.databaseService.findUserByUsername(username);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User @${username} not found in database`
        });
      }

      const analytics = await this.databaseService.getUserAnalytics(user._id);

      if (!analytics) {
        return res.status(404).json({
          success: false,
          message: `No analytics data found for @${username}`
        });
      }

      res.json({
        success: true,
        data: analytics,
        message: `Analytics for @${username}`
      });

    } catch (error) {
      logger.error(`Error in getUserAnalytics for ${req.params.username}:`, error);
      next(error);
    }
  }
// This search is first happens in local and then happens in instagram
  async searchUsers(req, res, next) {
    try {
      const { q: query, limit = 20 } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query parameter "q" is required'
        });
      }

      if (query.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      logger.info(`Searching users with query: ${query}`);

      const users = await this.databaseService.searchUsers(query, parseInt(limit));

      res.json({
        success: true,
        data: users,
        message: `Found ${users.length} users matching "${query}"`
      });

    } catch (error) {
      logger.error(`Error in searchUsers:`, error);
      next(error);
    }
  }

  // async getTopInfluencers(req, res, next) {
  //   try {
  //     const { limit = 50 } = req.query;
  //     logger.info(`Getting top ${limit} influencers`);

  //     const influencers = await this.databaseService.getTopInfluencers(parseInt(limit));

  //     res.json({
  //       success: true,
  //       data: influencers,
  //       message: `Top ${influencers.length} influencers`
  //     });

  //   } catch (error) {
  //     logger.error('Error in getTopInfluencers:', error);
  //     next(error);
  //   }
  // }

  // Main method to scrape ALL data from Instagram and store in respective tables
  async scrapeAndStoreAllData(username, res) {
    let profileId = null;

    try {
      logger.info(`Starting complete data scrape for: ${username}`);

      // Get ALL data from Instagram (no limit on posts/reels)
      const instagramData = await this.instagramService.getCompleteUserData(username, 0); // 0 = no limit

      // Store profile data in profiles table
      const profile = await this.databaseService.upsertUser(instagramData.profile);
      profileId = profile._id;

      // Store posts data in posts table
      const savedPosts = await this.databaseService.savePosts(profileId, instagramData.posts);

      // Store reels data in reels table (if any)
      const savedReels = await this.databaseService.saveReels(profileId, instagramData.reels);

      // Store analytics data
      const savedAnalytics = await this.databaseService.saveAnalytics(profileId, instagramData.analytics);

      // Update scraping status
      await this.databaseService.updateScrapingStatus(profileId, 'completed');

      // Return detailed success message with API limitations
      const totalPostsReported = instagramData.profile.profile.posts_count;
      const postsAvailable = savedPosts.length;
      const reelsAvailable = savedReels.length;
      
      res.json({
        success: true,
        message: `Complete data scraped and stored for @${username}. Posts: ${postsAvailable}, Reels: ${reelsAvailable}`,
        data: {
          posts_scraped: postsAvailable,
          reels_scraped: reelsAvailable,
          total_posts_reported: totalPostsReported,
          api_limitations: {
            posts_available: postsAvailable,
            total_posts_reported: totalPostsReported,
            limitation_note: "Instagram's public API only provides the first 12 posts. For complete data, consider Instagram Graph API or third-party services."
          }
        }
      });

      logger.info(`Successfully scraped and stored all data for ${username}: ${postsAvailable} posts, ${reelsAvailable} reels`);
      logger.warn(`API LIMITATION: Only ${postsAvailable} posts available out of ${totalPostsReported} total posts reported by Instagram`);

    } catch (error) {
      if (profileId) {
        await this.databaseService.updateScrapingStatus(profileId, 'failed', error.message);
      }

      logger.error(`Failed to scrape data for ${username}:`, error);
      throw error;
    }
  }
}

module.exports = UserController;