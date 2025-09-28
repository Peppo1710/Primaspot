// Main router
const express = require('express');
const router = express.Router();

const profileRoutes = require('./profile.routes');
const postsRoutes = require('./posts.routes');
const reelsRoutes = require('./reels.routes');

router.use('/profile', profileRoutes);
router.use('/posts', postsRoutes);
router.use('/reels', reelsRoutes);

module.exports = router;
