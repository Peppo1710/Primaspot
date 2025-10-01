const logger = require('../src/utils/logger');

// Test the simplified reel detection logic
function isReel(post) {
  // Check if it's a video
  if (post.media_type !== 'video') return false;
  
  // Multiple conditions to identify reels:
  // 1. Has duration and it's short (reels are typically 15-90 seconds)
  if (post.duration > 0 && post.duration <= 90) return true;
  
  // 2. Has video_url and is not a long video
  if (post.video_url && post.duration <= 90) return true;
  
  // 3. Check caption for reel indicators
  const caption = (post.caption || '').toLowerCase();
  if (caption.includes('#reel') || caption.includes('#reels')) return true;
  
  // 4. Check if it's a short video with high engagement (typical of reels)
  if (post.duration > 0 && post.duration <= 60 && (post.likes > 100 || post.comments > 10)) return true;
  
  // 5. Check for reel-specific patterns in the data structure
  if (post.instagram_data?.is_reel === true) return true;
  
  // 6. Check for vertical video aspect ratio (common for reels)
  if (post.dimensions && post.dimensions.height > post.dimensions.width) {
    const aspectRatio = post.dimensions.height / post.dimensions.width;
    if (aspectRatio > 1.2 && post.duration <= 90) return true;
  }
  
  // 7. Check for reel-specific metadata
  if (post.instagram_data?.product_type === 'clips' || post.instagram_data?.product_type === 'reel') return true;
  
  return false;
}

// Test cases that should be detected as reels
const testCases = [
  {
    name: "Short video with duration",
    post: {
      media_type: 'video',
      duration: 30,
      video_url: 'https://example.com/video.mp4',
      caption: 'Check out this amazing content!',
      likes: 500,
      comments: 20,
      views: 1000,
      dimensions: { width: 1080, height: 1920 }
    },
    expected: true
  },
  {
    name: "Video with reel hashtag",
    post: {
      media_type: 'video',
      duration: 45,
      video_url: 'https://example.com/video2.mp4',
      caption: 'Amazing #reel content here!',
      likes: 200,
      comments: 10,
      views: 500,
      dimensions: { width: 720, height: 1280 }
    },
    expected: true
  },
  {
    name: "Vertical video with short duration",
    post: {
      media_type: 'video',
      duration: 25,
      video_url: 'https://example.com/video3.mp4',
      caption: 'Quick tip!',
      likes: 150,
      comments: 5,
      views: 300,
      dimensions: { width: 720, height: 1280 }
    },
    expected: true
  },
  {
    name: "Long video (not a reel)",
    post: {
      media_type: 'video',
      duration: 120,
      video_url: 'https://example.com/video4.mp4',
      caption: 'Long form content',
      likes: 100,
      comments: 5,
      views: 200,
      dimensions: { width: 1920, height: 1080 }
    },
    expected: false
  },
  {
    name: "Image post (not a reel)",
    post: {
      media_type: 'image',
      duration: 0,
      video_url: null,
      caption: 'Photo post',
      likes: 300,
      comments: 15,
      views: 0,
      dimensions: { width: 1080, height: 1080 }
    },
    expected: false
  }
];

async function testReelDetection() {
  try {
    logger.info('Testing simplified reel detection logic...');
    
    let passed = 0;
    let failed = 0;
    
    testCases.forEach((testCase, index) => {
      const result = isReel(testCase.post);
      const success = result === testCase.expected;
      
      logger.info(`\n--- Test ${index + 1}: ${testCase.name} ---`);
      logger.info(`Expected: ${testCase.expected}, Got: ${result}`);
      logger.info(`Result: ${success ? 'PASS' : 'FAIL'}`);
      
      if (success) {
        passed++;
      } else {
        failed++;
        logger.error(`Failed test case: ${testCase.name}`);
      }
    });
    
    logger.info(`\n=== Test Results ===`);
    logger.info(`Passed: ${passed}`);
    logger.info(`Failed: ${failed}`);
    logger.info(`Total: ${testCases.length}`);
    
    if (failed === 0) {
      logger.info('✅ All tests passed!');
    } else {
      logger.error('❌ Some tests failed!');
    }
    
  } catch (error) {
    logger.error('Test failed:', error);
  }
}

// Run the test
testReelDetection();
