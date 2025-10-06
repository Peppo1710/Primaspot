// Frontend Image Downloader Service
// Downloads Instagram images and saves them to public/images folder

class ImageDownloaderService {
  constructor() {
    this.baseUrl = '/images';
  }

  async downloadAndSaveImage(imageUrl, localPath) {
    try {
      // Fetch the image
      const response = await fetch(imageUrl, {
        mode: 'cors',
        headers: {
          'Accept': 'image/*'
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch image:', imageUrl);
        return null;
      }

      const blob = await response.blob();
      
      // Create a download link and trigger download to save in public folder
      // Note: Browser security prevents direct file system access
      // So we'll use the image URL directly and let the browser cache it
      
      return localPath;
    } catch (error) {
      console.error('Error downloading image:', error);
      return null;
    }
  }

  getLocalPath(username, type, index = null) {
    switch (type) {
      case 'profile':
        return `${this.baseUrl}/profiles/${username}_profile.jpg`;
      case 'post':
        return `${this.baseUrl}/posts/${username}_post_${index}.jpg`;
      case 'reel':
        return `${this.baseUrl}/reels/${username}_reel_${index}.jpg`;
      default:
        return null;
    }
  }

  async processProfileImage(username, imageUrl) {
    if (!imageUrl) return null;
    
    const localPath = this.getLocalPath(username, 'profile');
    
    // Check if image already exists by trying to load it
    const exists = await this.checkImageExists(localPath);
    if (exists) {
      console.log('Profile image already cached:', localPath);
      return localPath;
    }

    // Use a proxy approach - download via backend or use direct URL with fallback
    return imageUrl; // Return original URL, browser will cache it
  }

  async processPostImages(username, posts) {
    const processedPosts = [];
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const localPath = this.getLocalPath(username, 'post', i + 1);
      
      const exists = await this.checkImageExists(localPath);
      let imageUrl = exists ? localPath : post.image_url;
      
      processedPosts.push({
        ...post,
        image_url: imageUrl,
        local_path: localPath,
        original_url: post.image_url
      });
    }
    
    return processedPosts;
  }

  async processReelThumbnails(username, reels) {
    const processedReels = [];
    
    for (let i = 0; i < reels.length; i++) {
      const reel = reels[i];
      const localPath = this.getLocalPath(username, 'reel', i + 1);
      
      const exists = await this.checkImageExists(localPath);
      let thumbnailUrl = exists ? localPath : reel.thumbnail_url;
      
      processedReels.push({
        ...reel,
        thumbnail_url: thumbnailUrl,
        local_path: localPath,
        original_url: reel.thumbnail_url
      });
    }
    
    return processedReels;
  }

  async checkImageExists(path) {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  async downloadImageToPublic(imageUrl, filename, folder) {
    try {
      // Fetch image through our backend proxy to avoid CORS
      const backendUrl = 'http://localhost:8000';
      const proxyUrl = `${backendUrl}/api/proxy-image`;
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          filename,
          folder
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.localPath;
      }
      
      return null;
    } catch (error) {
      console.error('Error downloading image:', error);
      return null;
    }
  }

  async processUserImages(username, profileData, posts, reels) {
    console.log('Processing images for user:', username);

    // Download profile image
    let updatedProfile = { ...profileData };
    if (profileData.profile?.profile_picture_url) {
      const localPath = await this.downloadImageToPublic(
        profileData.profile.profile_picture_url,
        `${username}_profile.jpg`,
        'profiles'
      );
      if (localPath) {
        updatedProfile.profile.profile_picture_url = localPath;
      }
    }

    // Download post images
    const updatedPosts = [];
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      let localPath = null;
      
      if (post.image_url) {
        localPath = await this.downloadImageToPublic(
          post.image_url,
          `${username}_post_${i + 1}.jpg`,
          'posts'
        );
      }
      
      updatedPosts.push({
        ...post,
        image_url: localPath || post.image_url
      });
    }

    // Download reel thumbnails
    const updatedReels = [];
    for (let i = 0; i < reels.length; i++) {
      const reel = reels[i];
      let localPath = null;
      
      if (reel.thumbnail_url) {
        localPath = await this.downloadImageToPublic(
          reel.thumbnail_url,
          `${username}_reel_${i + 1}.jpg`,
          'reels'
        );
      }
      
      updatedReels.push({
        ...reel,
        thumbnail_url: localPath || reel.thumbnail_url
      });
    }

    return {
      profile: updatedProfile,
      posts: updatedPosts,
      reels: updatedReels
    };
  }
}

export default new ImageDownloaderService();

