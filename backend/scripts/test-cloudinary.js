// scripts/test-cloudinary.js
// Test script to verify Cloudinary integration

require('dotenv').config();
const CloudinaryService = require('../src/services/CloudinaryService');

async function testCloudinaryIntegration() {
  console.log('🧪 Testing Cloudinary Integration...\n');

  try {
    // Initialize Cloudinary service
    console.log('1. Initializing Cloudinary service...');
    const cloudinaryService = new CloudinaryService();
    console.log('✅ Cloudinary service initialized successfully\n');

    // Test image URL (example Instagram profile picture)
    const testImageUrl = 'https://instagram.com/static/images/anonymousUser.jpg/23e7b3b2a737.jpg';

    // Test 1: Upload profile picture
    console.log('2. Testing profile picture upload...');
    const profilePictureUrl = await cloudinaryService.uploadProfilePicture(
      testImageUrl,
      'test_user'
    );
    console.log('✅ Profile picture uploaded successfully');
    console.log(`   URL: ${profilePictureUrl}\n`);

    // Test 2: Upload post image
    console.log('3. Testing post image upload...');
    const postImageUrl = await cloudinaryService.uploadPostImage(
      testImageUrl,
      'test_user',
      'test_post_123'
    );
    console.log('✅ Post image uploaded successfully');
    console.log(`   URL: ${postImageUrl}\n`);

    // Test 3: Get optimized URL
    console.log('4. Testing URL optimization...');
    const optimizedUrl = cloudinaryService.getOptimizedUrl(profilePictureUrl, {
      width: 200,
      height: 200,
      crop: 'thumb'
    });
    console.log('✅ URL optimized successfully');
    console.log(`   Original: ${profilePictureUrl}`);
    console.log(`   Optimized: ${optimizedUrl}\n`);

    console.log('✅ All tests passed! Cloudinary integration is working correctly.\n');
    console.log('📝 Notes:');
    console.log('   - Media is stored in your Cloudinary account');
    console.log('   - Folder structure: instagram/profiles/, instagram/posts/, etc.');
    console.log('   - Check your Cloudinary console to view uploaded media\n');

    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check that CLOUDINARY_URL is set in .env file');
    console.error('   2. Verify your Cloudinary credentials are correct');
    console.error('   3. Ensure you have an active internet connection');
    console.error('   4. Check Cloudinary service status\n');
    return false;
  }
}

// Run tests
testCloudinaryIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });

