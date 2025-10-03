const express = require('express');
const UserController = require('../controllers/UserController');

const router = express.Router();
const userController = new UserController();

// Middleware for username validation
const validateUsername = (req, res, next) => {
  const { username } = req.params;
  
  if (!username) {
    return res.status(400).json({
      success: false,
      message: 'Username parameter is required'
    });
  }
  
  if (username.length < 1 || username.length > 30) {
    return res.status(400).json({
      success: false,
      message: 'Username must be between 1 and 30 characters'
    });
  }
  
  // Clean and normalize username
  req.params.username = username.toLowerCase().trim().replace(/^@/, '');
  next();
};

// Middleware for query parameter validation
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;
  
  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      success: false,
      message: 'Page must be a positive integer'
    });
  }
  
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100'
    });
  }
  
  next();
};

// ========================================
// CORE USER ROUTES
// ========================================

/**
 * @route   GET /api/user/validate/:username
 * @desc    Validate if user exists in database, if not scrape from Instagram
 * @access  Public
 */
router.get('/validate/:username', validateUsername, (req, res, next) => {
  userController.validateUser(req, res, next);
});

/**
 * @route   POST /api/user/scrape/:username
 * @desc    Force scrape user data from Instagram
 * @access  Public
 */
router.post('/scrape/:username', validateUsername, (req, res, next) => {
  userController.scrapeUserData(req, res, next);
});

// ========================================
// PROFILE ROUTES
// ========================================

/**
 * @route   GET /api/user/profile/:username
 * @desc    Get user profile information
 * @access  Public
 */
router.get('/profile/:username', validateUsername, (req, res, next) => {
  userController.getUserProfile(req, res, next);
});

// ========================================
// CONTENT ROUTES
// ========================================

/**
 * @route   GET /api/user/posts/:username
 * @desc    Get user posts with pagination
 * @access  Public
 * @query   page, limit, sortBy
 */
router.get('/posts/:username', validateUsername, validatePagination, (req, res, next) => {
  userController.getUserPosts(req, res, next);
});

/**
 * @route   GET /api/user/reels/:username
 * @desc    Get user reels with pagination
 * @access  Public
 * @query   page, limit, sortBy
 */
router.get('/reels/:username', validateUsername, validatePagination, (req, res, next) => {
  userController.getUserReels(req, res, next);
});

// ========================================
// ANALYTICS ROUTES
// ========================================

/**
 * @route   GET /api/user/analytics/posts/:username
 * @desc    Get post analytics (AI/ML analysis)
 * @access  Public
 */
router.get('/analytics/posts/:username', validateUsername, (req, res, next) => {
  userController.getPostAnalytics(req, res, next);
});

/**
 * @route   GET /api/user/analytics/reels/:username
 * @desc    Get reel analytics (AI/ML analysis)
 * @access  Public
 */
router.get('/analytics/reels/:username', validateUsername, (req, res, next) => {
  userController.getReelAnalytics(req, res, next);
});

/**
 * @route   GET /api/user/engagement/:username
 * @desc    Get user engagement metrics (avg likes, avg comments, engagement rate)
 * @access  Public
 */
router.get('/engagement/:username', validateUsername, (req, res, next) => {
  userController.getUserEngagementMetrics(req, res, next);
});

// ========================================
// URL COLLECTION ROUTES
// ========================================

/**
 * @route   GET /api/user/posts-urls/:username
 * @desc    Get posts URLs for a user and store in MongoDB
 * @access  Public
 */
router.get('/posts-urls/:username', validateUsername, (req, res, next) => {
  userController.getPostsUrls(req, res, next);
});

/**
 * @route   GET /api/user/reels-urls/:username
 * @desc    Get reels URLs for a user and store in MongoDB
 * @access  Public
 */
router.get('/reels-urls/:username', validateUsername, (req, res, next) => {
  userController.getReelsUrls(req, res, next);
});

// ========================================
// LEGACY ROUTES (for backward compatibility)
// ========================================

/**
 * @route   GET /api/user/:username
 * @desc    Legacy route - redirects to validate user
 * @access  Public
 * @deprecated Use /validate/:username instead
 */
router.get('/:username', validateUsername, (req, res, next) => {
  // Redirect to validate endpoint for backward compatibility
  userController.validateUser(req, res, next);
});

/**
 * @route   GET /api/user/:username/posts
 * @desc    Legacy route - redirects to posts endpoint
 * @access  Public
 * @deprecated Use /posts/:username instead
 */
router.get('/:username/posts', validateUsername, validatePagination, (req, res, next) => {
  userController.getUserPosts(req, res, next);
});

/**
 * @route   GET /api/user/:username/analytics
 * @desc    Legacy route - redirects to profile endpoint
 * @access  Public
 * @deprecated Use /profile/:username instead
 */
router.get('/:username/analytics', validateUsername, (req, res, next) => {
  userController.getUserProfile(req, res, next);
});

module.exports = router;