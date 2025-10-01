const logger = require('../src/utils/logger');

// Mock the isReel function to test reel detection logic
function isReel(post) {
  try {
    // Check if it's a video first
    if (post.media_type !== 'video') return false;
    
    // Log post data for debugging
    logger.info(`Checking if post is reel:`, {
      media_type: post.media_type,
      duration: post.duration,
      video_url: !!post.video_url,
      dimensions: post.dimensions,
      caption: post.caption?.substring(0, 50) + '...'
    });
    
    // Multiple conditions to identify reels:
    // 1. Has duration and it's short (reels are typically 15-90 seconds)
    if (post.duration > 0 && post.duration <= 90) {
      logger.info(`Reel detected: duration ${post.duration}s`);
      return true;
    }
    
    // 2. Has video_url and is not a long video
    if (post.video_url && post.duration <= 90) {
      logger.info(`Reel detected: has video_url and duration ${post.duration}s`);
      return true;
    }
    
    // 3. Check caption for reel indicators
    const caption = (post.caption || '').toLowerCase();
    if (caption.includes('#reel') || caption.includes('#reels') || caption.includes('reel')) {
      logger.info(`Reel detected: caption contains reel keywords`);
      return true;
    }
    
    // 4. Check if it's a short video with high engagement (typical of reels)
    if (post.duration > 0 && post.duration <= 60 && (post.likes > 100 || post.comments > 10)) {
      logger.info(`Reel detected: short video with high engagement`);
      return true;
    }
    
    // 5. Check for reel-specific patterns in the data structure
    if (post.instagram_data?.is_reel === true) {
      logger.info(`Reel detected: instagram_data.is_reel is true`);
      return true;
    }
    
    // 6. Check for vertical video aspect ratio (common for reels)
    if (post.dimensions && post.dimensions.height > post.dimensions.width) {
      const aspectRatio = post.dimensions.height / post.dimensions.width;
      if (aspectRatio > 1.2 && post.duration <= 90) {
        logger.info(`Reel detected: vertical aspect ratio ${aspectRatio.toFixed(2)}`);
        return true;
      }
    }
    
    // 7. Check for reel-specific metadata
    if (post.instagram_data?.product_type === 'clips' || post.instagram_data?.product_type === 'reel') {
      logger.info(`Reel detected: product_type is ${post.instagram_data.product_type}`);
      return true;
    }
    
    // 8. Check for shortcode pattern (reels often have specific patterns)
    if (post.shortcode && post.shortcode.length > 10) {
      // Additional check for reel-like behavior
      if (post.duration > 0 && post.duration <= 90) {
        logger.info(`Reel detected: shortcode pattern with duration ${post.duration}s`);
        return true;
      }
    }
    
    logger.info(`Post is not a reel`);
    return false;
  } catch (error) {
    logger.error('Error in isReel:', error);
    return false;
  }
}

// Test cases
const testPosts = [
  {
    shortcode: 'C1234567890',
    media_type: 'video',
    duration: 30,
    video_url: 'https://example.com/video.mp4',
    caption: 'Check out this amazing reel! #reel #viral',
    likes: 1500,
    comments: 50,
    views: 10000,
    dimensions: { width: 1080, height: 1920 }
  },
  {
    shortcode: 'C1234567891',
    media_type: 'video',
    duration: 120,
    video_url: 'https://example.com/video2.mp4',
    caption: 'Long video content',
    likes: 200,
    comments: 10,
    views: 1000,
    dimensions: { width: 1920, height: 1080 }
  },
  {
    shortcode: 'C1234567892',
    media_type: 'image',
    duration: 0,
    video_url: null,
    caption: 'Photo post',
    likes: 500,
    comments: 20,
    views: 0,
    dimensions: { width: 1080, height: 1080 }
  },
  {
    shortcode: 'C1234567893',
    media_type: 'video',
    duration: 45,
    video_url: 'https://example.com/video3.mp4',
    caption: 'Short vertical video',
    likes: 800,
    comments: 30,
    views: 5000,
    dimensions: { width: 720, height: 1280 }
  }
];

async function testReelDetection() {
  try {
    logger.info('Testing reel detection logic...');
    
    testPosts.forEach((post, index) => {
      logger.info(`\n--- Testing Post ${index + 1} ---`);
      const isReelResult = isReel(post);
      logger.info(`Result: ${isReelResult ? 'IS REEL' : 'NOT REEL'}`);
    });
    
  } catch (error) {
    logger.error('Test failed:', error);
  }
}

// Run the test
testReelDetection();
