require('dotenv').config();
const DatabaseService = require('../services/DatabaseService');
const logger = require('../utils/logger');

class AnalyticsController {
  constructor() {
    this.databaseService = new DatabaseService();
    
    // Bind methods to preserve 'this' context
    this.getLikesVsComments = this.getLikesVsComments.bind(this);
    this.getEngagementRate = this.getEngagementRate.bind(this);
    this.getContentAnalysis = this.getContentAnalysis.bind(this);
    this.getVibeAnalysis = this.getVibeAnalysis.bind(this);
    this.getTopTags = this.getTopTags.bind(this);
    this.getPerformancePQVsEngagement = this.getPerformancePQVsEngagement.bind(this);
    this.getQualityIndicators = this.getQualityIndicators.bind(this);
  }

  /**
   * Get Likes vs Comments Analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getLikesVsComments(req, res, next) {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Getting likes vs comments analytics for: ${username}`);

      // Check if data exists in cache
      const cachedData = await this.databaseService.getAnalyticsData(username, 'likes_vs_comments');
      if (cachedData) {
        return res.status(200).json({
          success: true,
          message: `Likes vs comments analytics for @${username}`,
          data: cachedData.data,
          cached: true,
          calculated_at: cachedData.calculated_at
        });
      }

      // Calculate new data
      const analyticsData = await this.databaseService.calculateLikesVsComments(username);
      
      // Store in cache
      await this.databaseService.saveAnalyticsData(username, 'likes_vs_comments', analyticsData);

      return res.status(200).json({
        success: true,
        message: `Likes vs comments analytics for @${username}`,
        data: analyticsData,
        cached: false,
        calculated_at: new Date()
      });

    } catch (error) {
      logger.error(`Error getting likes vs comments analytics for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get Engagement Rate Analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getEngagementRate(req, res, next) {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Getting engagement rate analytics for: ${username}`);

      // Check if data exists in cache
      const cachedData = await this.databaseService.getAnalyticsData(username, 'engagement_rate');
      if (cachedData) {
        return res.status(200).json({
          success: true,
          message: `Engagement rate analytics for @${username}`,
          data: cachedData.data,
          cached: true,
          calculated_at: cachedData.calculated_at
        });
      }

      // Calculate new data
      const analyticsData = await this.databaseService.calculateEngagementRate(username);
      
      // Store in cache
      await this.databaseService.saveAnalyticsData(username, 'engagement_rate', analyticsData);

      return res.status(200).json({
        success: true,
        message: `Engagement rate analytics for @${username}`,
        data: analyticsData,
        cached: false,
        calculated_at: new Date()
      });

    } catch (error) {
      logger.error(`Error getting engagement rate analytics for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get Content Analysis via Grok API
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getContentAnalysis(req, res, next) {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Getting content analysis for: ${username}`);

      // Calculate new data using Grok API (no caching)
      const analyticsData = await this.databaseService.calculateContentAnalysis(username);

      return res.status(200).json({
        success: true,
        message: `Content analysis for @${username}`,
        data: analyticsData,
        cached: false,
        calculated_at: new Date()
      });

    } catch (error) {
      logger.error(`Error getting content analysis for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get Vibe Analysis via Grok API
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getVibeAnalysis(req, res, next) {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Getting vibe analysis for: ${username}`);

      // Calculate new data using Grok API (no caching)
      const analyticsData = await this.databaseService.calculateVibeAnalysis(username);

      return res.status(200).json({
        success: true,
        message: `Vibe analysis for @${username}`,
        data: analyticsData,
        cached: false,
        calculated_at: new Date()
      });

    } catch (error) {
      logger.error(`Error getting vibe analysis for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get Top Tags (without LLM)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getTopTags(req, res, next) {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Getting top tags for: ${username}`);

      // Check if data exists in cache
      const cachedData = await this.databaseService.getAnalyticsData(username, 'top_tags');
      if (cachedData) {
        return res.status(200).json({
          success: true,
          message: `Top tags for @${username}`,
          data: cachedData.data,
          cached: true,
          calculated_at: cachedData.calculated_at
        });
      }

      // Calculate new data using simple math
      const analyticsData = await this.databaseService.calculateTopTags(username);
      
      // Store in cache
      await this.databaseService.saveAnalyticsData(username, 'top_tags', analyticsData);

      return res.status(200).json({
        success: true,
        message: `Top tags for @${username}`,
        data: analyticsData,
        cached: false,
        calculated_at: new Date()
      });

    } catch (error) {
      logger.error(`Error getting top tags for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get Performance PQ vs Engagement
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getPerformancePQVsEngagement(req, res, next) {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Getting performance PQ vs engagement for: ${username}`);

      // Check if data exists in cache
      const cachedData = await this.databaseService.getAnalyticsData(username, 'performance_pq_vs_engagement');
      if (cachedData) {
        return res.status(200).json({
          success: true,
          message: `Performance PQ vs engagement for @${username}`,
          data: cachedData.data,
          cached: true,
          calculated_at: cachedData.calculated_at
        });
      }

      // Calculate new data
      const analyticsData = await this.databaseService.calculatePerformancePQVsEngagement(username);
      
      // Store in cache
      await this.databaseService.saveAnalyticsData(username, 'performance_pq_vs_engagement', analyticsData);

      return res.status(200).json({
        success: true,
        message: `Performance PQ vs engagement for @${username}`,
        data: analyticsData,
        cached: false,
        calculated_at: new Date()
      });

    } catch (error) {
      logger.error(`Error getting performance PQ vs engagement for ${req.params.username}:`, error);
      next(error);
    }
  }

  /**
   * Get Quality Indicators
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  async getQualityIndicators(req, res, next) {
    try {
      const { username } = req.params;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username parameter is required'
        });
      }

      logger.info(`Getting quality indicators for: ${username}`);

      // Check if data exists in cache
      const cachedData = await this.databaseService.getAnalyticsData(username, 'quality_indicators');
      if (cachedData) {
        return res.status(200).json({
          success: true,
          message: `Quality indicators for @${username}`,
          data: cachedData.data,
          cached: true,
          calculated_at: cachedData.calculated_at
        });
      }

      // Calculate new data
      const analyticsData = await this.databaseService.calculateQualityIndicators(username);
      
      // Store in cache
      await this.databaseService.saveAnalyticsData(username, 'quality_indicators', analyticsData);

      return res.status(200).json({
        success: true,
        message: `Quality indicators for @${username}`,
        data: analyticsData,
        cached: false,
        calculated_at: new Date()
      });

    } catch (error) {
      logger.error(`Error getting quality indicators for ${req.params.username}:`, error);
      next(error);
    }
  }
}

module.exports = AnalyticsController;
