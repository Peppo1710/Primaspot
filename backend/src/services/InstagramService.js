// services/InstagramService.js
const axios = require('axios');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const DatabaseService = require('./DatabaseService');

class InstagramService {
  constructor() {
    this.baseURL = 'https://www.instagram.com';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'X-IG-App-ID': '936619743392459',
      'X-ASBD-ID': '198387',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // Rate limiting
    this.maxRequestsPerMinute = 30;
    this.requestTimestamps = [];

    // DB service
    this.db = new DatabaseService();
  }

  // ----------------------
  // Public API
  // ----------------------

  /**
   * Fetch profile only (transformed) and persist a raw profile row.
   * Returns { profile, rawProfileRow }
   */
  async getUserProfile(username) {
    try {
      logger.info(`Fetching profile data for @${username}`);
      if (!this.isValidUsername(username)) throw new ApiError(400, 'Invalid username format');

      await this.checkRateLimit();

      const profileUrl = `${this.baseURL}/api/v1/users/web_profile_info/?username=${username}`;
      const response = await this.makeRequest(profileUrl);

      if (!response.data?.data?.user) {
        throw new ApiError(404, `Instagram user @${username} not found`);
      }

      const user = response.data.data.user;
      const profileData = this.transformProfileData(user);

      // Persist raw profile row to instagram_data
      const rawRow = {
        username: profileData.instagram_username,
        full_name: profileData.profile.full_name,
        profile_picture_url: profileData.profile.profile_pic_url,
        followers_count: profileData.profile.followers,
        following_count: profileData.profile.following,
        posts_count: profileData.profile.posts_count,
        bio_text: profileData.profile.biography,
        website_url: profileData.profile.external_url,
        is_verified: profileData.profile.is_verified,
        account_type: profileData.profile.is_business ? 'business' : 'personal',
        data_type: 'profile',
        scraped_at: new Date()
      };

      const [saved] = await this.db.saveRawInstagramRows(rawRow);
      logger.info(`Saved raw profile row id=${saved.id} for @${username}`);

      return { profile: profileData, rawProfileRow: saved };
    } catch (error) {
      logger.error(`Error fetching profile for @${username}:`, error.message || error);
      throw this.handleInstagramError(error, username);
    }
  }

  /**
   * Fetch posts (transformed) and persist raw post rows.
   * Returns { posts, rawPostRows }
   */
  async getUserPosts(username, limit = 12) {
    try {
      logger.info(`Fetching ${limit} posts for @${username}`);
      await this.checkRateLimit();

      const profileUrl = `${this.baseURL}/api/v1/users/web_profile_info/?username=${username}`;
      const response = await this.makeRequest(profileUrl);

      if (!response.data?.data?.user) {
        throw new ApiError(404, `Instagram user @${username} not found`);
      }

      const user = response.data.data.user;
      let posts = this.extractPostsFromProfile(user, limit);

      // If limit is 0 (get all) or more than 12, try to fetch additional posts
      if (limit === 0 || limit > 12) {
        posts = await this.fetchAllPosts(username, user, posts);
      }

      // Build raw rows and persist
      const rawRows = posts.map(p => ({
        username,
        content_id: p.instagram_post_id,
        content_url: p.shortcode ? `https://www.instagram.com/p/${p.shortcode}/` : null,
        content_type: this.determineContentType(p),
        media_type: p.media_type,
        image_url: p.display_url || null,
        video_url: p.video_url || null,
        thumbnail_url: p.thumbnail_url || null,
        caption: p.caption || null,
        likes_count: p.likes || 0,
        comments_count: p.comments || 0,
        views_count: p.views || 0,
        post_date: p.instagram_data?.taken_at || new Date(),
        hashtags: p.hashtags || [],
        tagged_users: p.tagged_users || [],
        duration_seconds: p.duration || 0,
        data_type: this.determineContentType(p),
        scraped_at: new Date()
      }));

      const savedRaw = await this.db.saveRawInstagramRows(rawRows);
      logger.info(`Saved ${savedRaw.length} raw post rows for @${username}`);

      return { posts, rawPostRows: savedRaw };
    } catch (error) {
      logger.error(`Error fetching posts for @${username}:`, error.message || error);
      throw this.handleInstagramError(error, username);
    }
  }

  /**
   * Fetch profile + posts + reels + analytics, persist raw rows (profile + posts),
   * and return the complete transformed payload plus saved raw rows.
   *
   * Returns:
   * {
   *   profile,
   *   posts,
   *   reels,
   *   analytics,
   *   rawRows: { profile: {...}, posts: [... ] }
   * }
   */
  async getCompleteUserData(username, postLimit = 12) {
    try {
      logger.info(`Fetching complete data for @${username}`);

      // profile
      const { profile, rawProfileRow } = await this.getUserProfile(username);
      // posts + raw posts
      const { posts, rawPostRows } = await this.getUserPosts(username, postLimit);

      // reels are posts that are video & duration > 0
      const reels = this.extractReelsFromPosts(posts);

      // analytics computed from transforms
      const analytics = this.calculateAnalytics(profile, posts, reels);

      // Add API limitation warning to analytics
      analytics.api_limitations = {
        posts_available: posts.length,
        total_posts_reported: profile.profile.posts_count,
        limitation_note: "Instagram's public API only provides the first 12 posts. For complete data, consider Instagram Graph API or third-party services."
      };

      // Save influencer (derived) optionally: we still return everything; controller or workers may create derived tables.
      // But we also return saved raw rows so caller can reference them.
      logger.info(`Successfully fetched complete data for @${username}: ${posts.length} posts, ${reels.length} reels`);
      logger.warn(`API LIMITATION: Only ${posts.length} posts available out of ${profile.profile.posts_count} total posts`);

      return {
        profile,
        posts,
        reels,
        analytics,
        rawRows: {
          profile: rawProfileRow,
          posts: rawPostRows
        },
        scraped_at: new Date().toISOString(),
        data_version: '1.0',
        api_limitations: {
          posts_available: posts.length,
          total_posts_reported: profile.profile.posts_count,
          limitation_note: "Instagram's public API only provides the first 12 posts. For complete data, consider Instagram Graph API or third-party services."
        }
      };
    } catch (error) {
      logger.error(`Error fetching complete data for @${username}:`, error.message || error);
      throw error; // caller (controller) will handle and set scraping status
    }
  }

  // ----------------------
  // Transform / helpers (kept same as original)
  // ----------------------

  transformProfileData(user) {
    try {
      return {
        instagram_id: user.id,
        instagram_username: user.username,
        profile: {
          full_name: user.full_name || '',
          biography: user.biography || '',
          profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url || '',
          external_url: user.external_url || '',
          is_verified: user.is_verified || false,
          is_business: user.is_business_account || false,
          is_private: user.is_private || false,
          followers: user.edge_followed_by?.count || 0,
          following: user.edge_follow?.count || 0,
          posts_count: user.edge_owner_to_timeline_media?.count || 0
        }
      };
    } catch (error) {
      logger.error('Error transforming profile data:', error);
      throw new ApiError(500, 'Error processing Instagram profile data');
    }
  }

  extractPostsFromProfile(user, limit = 12) {
    try {
      if (!user.edge_owner_to_timeline_media?.edges) return [];

      // If limit is 0, get all posts, otherwise slice to limit
      const edges = limit === 0 
        ? user.edge_owner_to_timeline_media.edges 
        : user.edge_owner_to_timeline_media.edges.slice(0, limit);
      
      return edges.map(edge => this.transformPostData(edge.node));
    } catch (error) {
      logger.error('Error extracting posts from profile:', error);
      return [];
    }
  }

  transformPostData(node) {
    try {
      return {
        instagram_post_id: node.id,
        shortcode: node.shortcode,
        media_type: this.getMediaType(node),
        caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
        display_url: node.display_url,
        video_url: node.video_url || null,
        thumbnail_url: node.display_url,
        likes: node.edge_liked_by?.count || node.edge_media_preview_like?.count || 0,
        comments: node.edge_media_to_comment?.count || node.edge_media_preview_comment?.count || 0,
        views: node.video_view_count || 0,
        hashtags: this.extractHashtags(node.edge_media_to_caption?.edges?.[0]?.node?.text || ''),
        mentions: this.extractMentions(node.edge_media_to_caption?.edges?.[0]?.node?.text || ''),
        dimensions: { width: node.dimensions?.width || 0, height: node.dimensions?.height || 0 },
        duration: node.video_duration || 0,
        location: node.location ? { id: node.location.id, name: node.location.name, slug: node.location.slug } : null,
        instagram_data: {
          taken_at: new Date(node.taken_at_timestamp * 1000),
          posted_at: new Date(node.taken_at_timestamp * 1000),
          accessibility_caption: node.accessibility_caption || '',
          is_paid_partnership: false,
          tagged_users: this.extractTaggedUsers(node)
        }
      };
    } catch (error) {
      logger.error('Error transforming post data:', error);
      throw new ApiError(500, 'Error processing Instagram post data');
    }
  }

  extractReelsFromPosts(posts) {
    try {
      return posts
        .filter(post => this.isReel(post))
        .map(post => ({ ...post, type: 'reel', url: `https://www.instagram.com/reel/${post.shortcode}/` }));
    } catch (error) {
      logger.error('Error extracting reels:', error);
      return [];
    }
  }

  /**
   * Improved reel detection logic
   */
  isReel(post) {
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

  /**
   * Determine content type (post vs reel)
   */
  determineContentType(post) {
    return this.isReel(post) ? 'reel' : 'post';
  }

  /**
   * Fetch additional posts beyond the initial 12
   */
  async fetchAllPosts(username, user, initialPosts) {
    try {
      const allPosts = [...initialPosts];
      const totalPosts = user.edge_owner_to_timeline_media?.count || 0;
      
      logger.info(`User has ${totalPosts} total posts, initial fetch: ${initialPosts.length}`);
      
      // Instagram's public API is severely limited
      // The web_profile_info endpoint only returns the first 12 posts
      // For more posts, we would need:
      // 1. Instagram Graph API (requires app review and business account)
      // 2. Instagram Basic Display API (limited to user's own content)
      // 3. Third-party scraping services
      // 4. Web scraping (against Instagram's ToS)
      
      if (totalPosts > 12) {
        logger.warn(`Instagram API limitation: Can only fetch first 12 posts via public API`);
        logger.info(`User has ${totalPosts} total posts, but we can only access ${initialPosts.length} via public API`);
        logger.info(`To get more posts, consider:`);
        logger.info(`1. Instagram Graph API (requires business account and app review)`);
        logger.info(`2. Instagram Basic Display API (limited to user's own content)`);
        logger.info(`3. Third-party Instagram API services`);
        logger.info(`4. Web scraping (not recommended, against ToS)`);
      }
      
      return allPosts;
    } catch (error) {
      logger.error('Error fetching additional posts:', error);
      return initialPosts; // Return what we have
    }
  }

  /**
   * Try to fetch posts from user's profile page (alternative method)
   */
  async fetchPostsFromProfilePage(username) {
    try {
      await this.checkRateLimit();
      
      // Try to fetch from the profile page directly
      const profilePageUrl = `${this.baseURL}/${username}/`;
      const response = await this.makeRequest(profilePageUrl);
      
      // Parse the HTML response to extract post data
      // This is a more complex approach that would require HTML parsing
      // For now, we'll return empty array as this method needs more implementation
      logger.info(`Profile page fetch attempted for ${username}, but HTML parsing not implemented yet`);
      return [];
      
    } catch (error) {
      logger.error(`Error fetching from profile page for ${username}:`, error.message);
      return [];
    }
  }

  /**
   * Try to fetch more posts using Instagram's web interface
   */
  async fetchPostsWithGraphQL(username, userId, cursor = null) {
    try {
      await this.checkRateLimit();
      
      // Use Instagram's actual web API endpoint
      const apiUrl = `${this.baseURL}/api/v1/users/${userId}/media/`;
      
      const params = {
        max_id: cursor,
        count: 12
      };
      
      const queryString = new URLSearchParams(params).toString();
      const response = await this.makeRequest(`${apiUrl}?${queryString}`);
      
      if (response.data?.items) {
        const posts = response.data.items.map(item => this.transformPostDataFromMedia(item));
        
        return {
          posts,
          hasNextPage: response.data.more_available || false,
          endCursor: response.data.next_max_id || null
        };
      }
      
      return { posts: [], hasNextPage: false, endCursor: null };
      
    } catch (error) {
      logger.error(`Error fetching posts with API for ${username}:`, error.message);
      return { posts: [], hasNextPage: false, endCursor: null };
    }
  }

  /**
   * Transform post data from media API response
   */
  transformPostDataFromMedia(item) {
    try {
      return {
        instagram_post_id: item.id,
        shortcode: item.code,
        media_type: this.getMediaTypeFromItem(item),
        caption: item.caption?.text || '',
        display_url: item.image_versions2?.candidates?.[0]?.url || item.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url,
        video_url: item.video_versions?.[0]?.url || null,
        thumbnail_url: item.image_versions2?.candidates?.[0]?.url,
        likes: item.like_count || 0,
        comments: item.comment_count || 0,
        views: item.view_count || 0,
        hashtags: this.extractHashtags(item.caption?.text || ''),
        mentions: this.extractMentions(item.caption?.text || ''),
        dimensions: { 
          width: item.original_width || 0, 
          height: item.original_height || 0 
        },
        duration: item.video_duration || 0,
        location: item.location ? { 
          id: item.location.pk, 
          name: item.location.name, 
          slug: item.location.slug 
        } : null,
        instagram_data: {
          taken_at: new Date(item.taken_at * 1000),
          posted_at: new Date(item.taken_at * 1000),
          accessibility_caption: item.accessibility_caption || '',
          is_paid_partnership: item.is_paid_partnership || false,
          tagged_users: this.extractTaggedUsersFromMedia(item)
        }
      };
    } catch (error) {
      logger.error('Error transforming post data from media:', error);
      throw new ApiError(500, 'Error processing Instagram media data');
    }
  }

  getMediaTypeFromItem(item) {
    if (item.media_type === 2) return 'video';
    if (item.media_type === 8) return 'carousel';
    return 'image';
  }

  extractTaggedUsersFromMedia(item) {
    try {
      if (item.usertags?.in) {
        return item.usertags.in.map(tag => ({
          username: tag.user.username,
          full_name: tag.user.full_name,
          user_id: tag.user.pk
        }));
      }
      return [];
    } catch (error) {
      logger.error('Error extracting tagged users from media:', error);
      return [];
    }
  }

  calculateAnalytics(profile, posts, reels) {
    try {
      const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
      const totalComments = posts.reduce((sum, post) => sum + (post.comments || 0), 0);
      const totalViews = reels.reduce((sum, reel) => sum + (reel.views || 0), 0);
      const avgLikes = posts.length > 0 ? Math.round(totalLikes / posts.length) : 0;
      const avgComments = posts.length > 0 ? Math.round(totalComments / posts.length) : 0;

      const engagementRate = profile.profile.followers > 0 && posts.length > 0
        ? (((totalLikes + totalComments) / posts.length) / profile.profile.followers * 100)
        : 0;

      const contentBreakdown = {
        images: posts.filter(p => p.media_type === 'image').length,
        videos: posts.filter(p => p.media_type === 'video').length,
        carousels: posts.filter(p => p.media_type === 'carousel').length,
        reels: reels.length
      };

      const topHashtags = this.getTopHashtags(posts);
      const influenceScore = this.calculateInfluenceScore(profile, posts, reels);

      return {
        total_likes: totalLikes,
        total_comments: totalComments,
        total_views: totalViews,
        avg_likes: avgLikes,
        avg_comments: avgComments,
        engagement_rate: parseFloat(engagementRate.toFixed(2)),
        content_breakdown: contentBreakdown,
        top_hashtags: topHashtags,
        influence_score: influenceScore,
        calculated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error calculating analytics:', error);
      return {
        total_likes: 0,
        total_comments: 0,
        engagement_rate: 0,
        influence_score: 0,
        error: 'Analytics calculation failed'
      };
    }
  }

  calculateInfluenceScore(profile, posts, reels) {
    try {
      let score = 0;
      const followers = profile.profile.followers;
      if (followers > 1000000) score += 30;
      else if (followers > 100000) score += 25;
      else if (followers > 10000) score += 20;
      else if (followers > 1000) score += 15;
      else score += 10;

      const totalPosts = posts.length + reels.length;
      if (totalPosts > 0) {
        const avgEngagement = posts.reduce((sum, p) => sum + p.likes + p.comments, 0) / totalPosts;
        const engagementRatio = avgEngagement / Math.max(1, followers);

        if (engagementRatio > 0.05) score += 25;
        else if (engagementRatio > 0.03) score += 20;
        else if (engagementRatio > 0.01) score += 15;
        else score += 10;
      }

      if (profile.profile.posts_count > 100) score += 20;
      else if (profile.profile.posts_count > 50) score += 15;
      else if (profile.profile.posts_count > 20) score += 10;
      else score += 5;

      if (profile.profile.is_verified) score += 10;
      if (profile.profile.is_business) score += 5;

      const contentTypes = [
        posts.filter(p => p.media_type === 'image').length > 0,
        posts.filter(p => p.media_type === 'video').length > 0,
        posts.filter(p => p.media_type === 'carousel').length > 0,
        reels.length > 0
      ].filter(Boolean).length;

      score += contentTypes * 2.5;
      return Math.min(100, Math.round(score));
    } catch (error) {
      logger.error('Error calculating influence score:', error);
      return 0;
    }
  }

  getTopHashtags(posts) {
    try {
      const hashtagCount = {};
      posts.forEach(post => {
        (post.hashtags || []).forEach(tag => {
          hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
        });
      });
      return Object.entries(hashtagCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));
    } catch (error) {
      logger.error('Error getting top hashtags:', error);
      return [];
    }
  }

  extractHashtags(caption) {
    if (!caption) return [];
    const hashtagRegex = /#[\w\u0590-\u05ff\u0900-\u097f]+/g;
    return caption.match(hashtagRegex) || [];
  }

  extractMentions(caption) {
    if (!caption) return [];
    const mentionRegex = /@[\w.]+/g;
    const matches = caption.match(mentionRegex) || [];
    return matches.map(mention => ({ username: mention.substring(1), user_id: null }));
  }

  extractTaggedUsers(node) {
    try {
      if (node.edge_media_to_tagged_user?.edges) {
        return node.edge_media_to_tagged_user.edges.map(edge => ({
          username: edge.node.user.username,
          full_name: edge.node.user.full_name,
          user_id: edge.node.user.id
        }));
      }
      return [];
    } catch (error) {
      logger.error('Error extracting tagged users:', error);
      return [];
    }
  }

  getMediaType(node) {
    if (node.__typename === 'GraphVideo') return 'video';
    if (node.__typename === 'GraphSidecar') return 'carousel';
    if (node.is_video) return 'video';
    return 'image';
  }

  isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
    return usernameRegex.test(username);
  }

  async makeRequest(url) {
    try {
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 15000
      });
      return response;
    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          throw new ApiError(404, 'Instagram user not found');
        } else if (error.response.status === 429) {
          throw new ApiError(429, 'Rate limit exceeded. Please try again later.');
        } else if (error.response.status === 403) {
          throw new ApiError(403, 'Access forbidden. User may be private.');
        }
      }
      throw new ApiError(500, 'Instagram service temporarily unavailable');
    }
  }

  async checkRateLimit() {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(timestamp => now - timestamp < 60000);
    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = 60000 - (now - oldestRequest);
      if (waitTime > 0) {
        logger.warn(`Rate limit exceeded. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    this.requestTimestamps.push(now);
  }

  handleInstagramError(error, username) {
    if (error instanceof ApiError) return error;
    if (error.code === 'ECONNREFUSED') return new ApiError(503, 'Instagram service is currently unavailable');
    if (error.code === 'ETIMEDOUT') return new ApiError(408, 'Request to Instagram timed out. Please try again.');
    logger.error(`Unexpected error for @${username}:`, error);
    return new ApiError(500, 'An unexpected error occurred while fetching Instagram data');
  }
}

module.exports = InstagramService;
