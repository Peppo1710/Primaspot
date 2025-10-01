const InstagramService = require('../src/services/InstagramService');
const logger = require('../src/utils/logger');

async function testReelScraping() {
  try {
    const instagramService = new InstagramService();
    
    // Test with a username that likely has reels
    const username = 'theboyfrom_maharashtra';
    
    logger.info(`Testing reel scraping for @${username}`);
    
    // Get complete user data
    const userData = await instagramService.getCompleteUserData(username, 0);
    
    logger.info(`Results:`);
    logger.info(`- Total posts: ${userData.posts.length}`);
    logger.info(`- Total reels: ${userData.reels.length}`);
    logger.info(`- Profile posts count: ${userData.profile.profile.posts_count}`);
    
    // Log details about reels
    if (userData.reels.length > 0) {
      logger.info(`Reels found:`);
      userData.reels.forEach((reel, index) => {
        logger.info(`  ${index + 1}. ${reel.shortcode}`);
        logger.info(`     - Duration: ${reel.duration_seconds}s`);
        logger.info(`     - Views: ${reel.views_count}`);
        logger.info(`     - Thumbnail: ${reel.thumbnail_url ? 'Yes' : 'No'}`);
        logger.info(`     - Video URL: ${reel.video_url ? 'Yes' : 'No'}`);
      });
    } else {
      logger.warn(`No reels found. This could be due to:`);
      logger.warn(`1. User has no reels in their recent 12 posts`);
      logger.warn(`2. Reel detection logic needs improvement`);
      logger.warn(`3. Instagram API limitations`);
    }
    
    // Log details about posts
    logger.info(`Posts found:`);
    userData.posts.forEach((post, index) => {
      logger.info(`  ${index + 1}. ${post.shortcode} (${post.media_type})`);
      logger.info(`     - Duration: ${post.duration}s`);
      logger.info(`     - Views: ${post.views}`);
      logger.info(`     - Is Reel: ${post.instagram_data?.is_reel || false}`);
    });
    
  } catch (error) {
    logger.error('Test failed:', error);
  }
}

// Run the test
testReelScraping();
