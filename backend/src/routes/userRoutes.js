const express = require('express');
const UserController = require('../controllers/UserController');

const router = express.Router();
const userController = new UserController();

// Basic validation middleware
const validateUsername = (req, res, next) => {
  const { username } = req.params;
  if (!username || username.length < 1 || username.length > 30) {
    return res.status(400).json({
      success: false,
      message: 'Username must be between 1 and 30 characters'
    });
  }
  req.params.username = username.toLowerCase().trim();
  next();
};

// Routes - using arrow functions to preserve context
router.get('/search', (req, res, next) => userController.searchUsers(req, res, next));
// router.get('/top', (req, res, next) => userController.getTopInfluencers(req, res, next));
router.get('/:username', validateUsername, (req, res, next) => userController.getUser(req, res, next));
router.post('/:username/refresh', validateUsername, (req, res, next) => userController.refreshUser(req, res, next));
router.get('/:username/posts', validateUsername, (req, res, next) => userController.getUserPosts(req, res, next));
router.get('/:username/analytics', validateUsername, (req, res, next) => userController.getUserAnalytics(req, res, next));

module.exports = router;