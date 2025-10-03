const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');

// Initialize controller
const analyticsController = new AnalyticsController();

// Username validation middleware
const validateUsername = (req, res, next) => {
  let { username } = req.params;
  
  if (!username || username.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Username parameter is required'
    });
  }
  
  if (username.length > 30) {
    return res.status(400).json({
      success: false,
      message: 'Username must be between 1 and 30 characters'
    });
  }
  
  // Clean and normalize username
  req.params.username = username.toLowerCase().trim().replace(/^@/, '');
  next();
};

/**
 * @route   GET /api/analytics/likesvscomments/:username
 * @desc    Get likes vs comments analytics
 * @access  Public
 */
router.get('/likesvscomments/:username', validateUsername, (req, res, next) => {
  analyticsController.getLikesVsComments(req, res, next);
});

/**
 * @route   GET /api/analytics/engagement/:username
 * @desc    Get engagement rate analytics
 * @access  Public
 */
router.get('/engagement/:username', validateUsername, (req, res, next) => {
  analyticsController.getEngagementRate(req, res, next);
});

/**
 * @route   GET /api/analytics/contentanalysis/content/:username
 * @desc    Get content analysis via Grok API
 * @access  Public
 */
router.get('/contentanalysis/content/:username', validateUsername, (req, res, next) => {
  analyticsController.getContentAnalysis(req, res, next);
});

/**
 * @route   GET /api/analytics/contentanalysis/vibe/:username
 * @desc    Get vibe analysis via Grok API
 * @access  Public
 */
router.get('/contentanalysis/vibe/:username', validateUsername, (req, res, next) => {
  analyticsController.getVibeAnalysis(req, res, next);
});

/**
 * @route   GET /api/analytics/contentanalysis/top-tags/:username
 * @desc    Get top 10 tags by percentage (no LLM)
 * @access  Public
 */
router.get('/contentanalysis/top-tags/:username', validateUsername, (req, res, next) => {
  analyticsController.getTopTags(req, res, next);
});

/**
 * @route   GET /api/analytics/performance/pqvsengagement/:username
 * @desc    Get performance PQ vs engagement analytics
 * @access  Public
 */
router.get('/performance/pqvsengagement/:username', validateUsername, (req, res, next) => {
  analyticsController.getPerformancePQVsEngagement(req, res, next);
});

/**
 * @route   GET /api/analytics/performance/quality/:username
 * @desc    Get quality indicators analytics
 * @access  Public
 */
router.get('/performance/quality/:username', validateUsername, (req, res, next) => {
  analyticsController.getQualityIndicators(req, res, next);
});

module.exports = router;
