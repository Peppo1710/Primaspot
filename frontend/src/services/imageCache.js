// Simple pass-through - no image processing
class ImageCache {
  async processUserData(username, profileData, posts, reels) {
    // Just return the data as-is without any processing
    return {
      profile: profileData,
      posts: posts,
      reels: reels
    };
  }
}

export default new ImageCache();

