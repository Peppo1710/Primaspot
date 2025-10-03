const db = require('../models');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const { Groq } = require('groq-sdk');
require('dotenv').config()


class DatabaseService {
  constructor() {
    this.logger = logger.withContext('DatabaseService');
  }

  async getTopInfluencers(limit = 10) {
    try {
      const users = await db.Profile
        .find({})
        .sort({ followers_count: -1 })
        .limit(limit)
        .lean();

      return users;
    } catch (error) {
      this.logger.error('Error in getTopInfluencers:', error);
      throw new ApiError(500, 'Database error while retrieving top influencers');
    }
  }

  async checkRateLimit(username) {
    try {
      this.logger.info(`Checking rate limit for ${username}`);
      const user = await db.Profile.findOne({ username: username.toLowerCase() });
      if (!user) return { canScrape: true, reason: 'new_user' };

      const lastSnapshot = await db.EngagementSnapshot
        .findOne({ influencer_id: user._id })
        .sort({ createdAt: -1 });

      if (!lastSnapshot) return { canScrape: true, reason: 'no_snapshot' };

      const lastScraped = new Date(lastSnapshot.createdAt);
      const nextAllowed = new Date(lastScraped.getTime() + 4 * 60 * 60 * 1000);
      const canScrape = new Date() >= nextAllowed;

      return { canScrape, nextAllowedScrape: canScrape ? null : nextAllowed, lastScraped };
    } catch (error) {
      this.logger.error('Error in checkRateLimit:', error);
      throw new ApiError(500, 'Database error while checking rate limit');
    }
  }

  async getStats() {
    try {
      const [userCount, postCount, engagementCount] = await Promise.all([
        db.Profile.countDocuments(),
        db.Post.countDocuments(),
        db.EngagementSnapshot.countDocuments()
      ]);

      return {
        users: userCount,
        posts: postCount,
        engagementSnapshots: engagementCount,
        updated_at: new Date()
      };
    } catch (error) {
      this.logger.error('Error in getStats:', error);
      throw new ApiError(500, 'Database error while getting stats');
    }
  }

  async updateScrapingStatus(influencerId, status, errorMessage = null) {
    try {
      this.logger.info(`Updating scraping status for influencer ${influencerId} -> ${status}`);
      await db.Profile.findByIdAndUpdate(influencerId, { updatedAt: new Date() });
      if (errorMessage) this.logger.warn(`Scrape error for ${influencerId}: ${errorMessage}`);
    } catch (error) {
      this.logger.error('Error in updateScrapingStatus:', error);
    }
  }

  async findUserByUsername(username) {
    try {
      const user = await db.Profile.findOne({ username: username.toLowerCase() }).lean();
      return user;
    } catch (error) {
      this.logger.error('Error in findUserByUsername:', error);
      throw new ApiError(500, 'Database error while finding user');
    }
  }

  async getUserPosts(userId, options = {}) {
    try {
      const { limit = 20, skip = 0, sortBy = 'createdAt' } = options;

      // Get user's posts document
      const userPostsDoc = await db.Post
        .findOne({ profile_id: userId })
        .lean();

      if (!userPostsDoc || !userPostsDoc.posts) {
        return [];
      }

      // Sort posts array
      let sortedPosts = [...userPostsDoc.posts];

      if (sortBy === 'createdAt' || sortBy === '-createdAt') {
        sortedPosts.sort((a, b) => {
          const dateA = new Date(a.post_date || 0);
          const dateB = new Date(b.post_date || 0);
          return sortBy.startsWith('-') ? dateB - dateA : dateA - dateB;
        });
      } else if (sortBy === 'likes_count' || sortBy === '-likes_count') {
        sortedPosts.sort((a, b) => {
          return sortBy.startsWith('-') ? b.likes_count - a.likes_count : a.likes_count - b.likes_count;
        });
      } else if (sortBy === 'comments_count' || sortBy === '-comments_count') {
        sortedPosts.sort((a, b) => {
          return sortBy.startsWith('-') ? b.comments_count - a.comments_count : a.comments_count - b.comments_count;
        });
      }

      // Apply pagination
      const paginatedPosts = sortedPosts.slice(skip, skip + limit);

      return paginatedPosts;
    } catch (error) {
      this.logger.error('Error in getUserPosts:', error);
      throw new ApiError(500, 'Database error while retrieving user posts');
    }
  }

  async getUserReels(userId, options = {}) {
    try {
      const { limit = 20, skip = 0, sortBy = 'createdAt' } = options;

      // Get user's reels document
      const userReelsDoc = await db.Reel
        .findOne({ profile_id: userId })
        .lean();

      if (!userReelsDoc || !userReelsDoc.reels) {
        return [];
      }

      // Sort reels array
      let sortedReels = [...userReelsDoc.reels];

      if (sortBy === 'createdAt' || sortBy === '-createdAt') {
        sortedReels.sort((a, b) => {
          const dateA = new Date(a.post_date || 0);
          const dateB = new Date(b.post_date || 0);
          return sortBy.startsWith('-') ? dateB - dateA : dateA - dateB;
        });
      } else if (sortBy === 'likes_count' || sortBy === '-likes_count') {
        sortedReels.sort((a, b) => {
          return sortBy.startsWith('-') ? b.likes_count - a.likes_count : a.likes_count - b.likes_count;
        });
      } else if (sortBy === 'views_count' || sortBy === '-views_count') {
        sortedReels.sort((a, b) => {
          return sortBy.startsWith('-') ? b.views_count - a.views_count : a.views_count - b.views_count;
        });
      }

      // Apply pagination
      const paginatedReels = sortedReels.slice(skip, skip + limit);

      return paginatedReels;
    } catch (error) {
      this.logger.error('Error in getUserReels:', error);
      throw new ApiError(500, 'Database error while retrieving user reels');
    }
  }

  async getUserAnalytics(userId) {
    try {
      // Get the latest engagement snapshot for the user
      const latestSnapshot = await db.EngagementSnapshot
        .findOne({ influencer_id: userId })
        .sort({ createdAt: -1 });

      if (!latestSnapshot) {
        return null;
      }

      // Get aggregated analytics from posts
      const posts = await db.Post.find({ profile_id: userId }).lean();

      const totalLikes = posts.reduce((sum, post) => sum + (post.likes_count || 0), 0);
      const totalComments = posts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
      const totalViews = posts.reduce((sum, post) => sum + (post.views_count || 0), 0);
      const avgLikes = posts.length > 0 ? Math.round(totalLikes / posts.length) : 0;
      const avgComments = posts.length > 0 ? Math.round(totalComments / posts.length) : 0;

      const user = await db.Profile.findById(userId).lean();
      const engagementRate = user && user.followers_count > 0 && posts.length > 0
        ? (((totalLikes + totalComments) / posts.length) / user.followers_count * 100)
        : 0;

      return {
        total_likes: totalLikes,
        total_comments: totalComments,
        total_views: totalViews,
        avg_likes: avgLikes,
        avg_comments: avgComments,
        engagement_rate: parseFloat(engagementRate.toFixed(2)),
        posts_count: posts.length,
        last_updated: latestSnapshot.createdAt,
        calculated_at: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error in getUserAnalytics:', error);
      throw new ApiError(500, 'Database error while retrieving user analytics');
    }
  }

  async searchUsers(query, limit = 20) {
    try {
      const users = await db.Profile
        .find({
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { full_name: { $regex: query, $options: 'i' } }
          ]
        })
        .sort({ followers_count: -1 })
        .limit(limit)
        .lean();

      return users;
    } catch (error) {
      this.logger.error('Error in searchUsers:', error);
      throw new ApiError(500, 'Database error while searching users');
    }
  }

  async upsertUser(profileData) {
    try {
      this.logger.info('upsertUser called with data:', JSON.stringify(profileData, null, 2));

      if (!profileData || !profileData.instagram_username) {
        throw new Error('Invalid profile data: missing instagram_username');
      }

      const filter = {
        username: profileData.instagram_username.toLowerCase()
      };

      const update = {
        username: profileData.instagram_username.toLowerCase(),
        full_name: profileData.profile?.full_name || '',
        profile_picture_url: profileData.profile?.profile_pic_url || '',
        bio_text: profileData.profile?.biography || '',
        website_url: profileData.profile?.external_url || '',
        is_verified: profileData.profile?.is_verified || false,
        account_type: profileData.profile?.is_business ? 'business' : 'personal',
        followers_count: profileData.profile?.followers || 0,
        following_count: profileData.profile?.following || 0,
        posts_count: profileData.profile?.posts_count || 0,
        scraped_at: new Date(),
        updatedAt: new Date()
      };

      this.logger.info('Updating profile with:', JSON.stringify(update, null, 2));

      const user = await db.Profile.findOneAndUpdate(
        filter,
        update,
        { upsert: true, new: true }
      ).lean();

      this.logger.info('Profile saved successfully:', user._id);
      return user;
    } catch (error) {
      this.logger.error('Error in upsertUser:', error);
      throw new ApiError(500, 'Database error while saving user');
    }
  }

  async savePosts(userId, posts, username) {
    try {
      // Transform posts data to new format
      const postsArray = posts.map(postData => ({
        post_id: postData.instagram_post_id,
        post_url: postData.url || `https://instagram.com/p/${postData.shortcode}`,
        image_url: postData.display_url,
        video_url: postData.video_url,
        caption: postData.caption,
        likes_count: postData.likes,
        comments_count: postData.comments,
        post_date: postData.instagram_data?.taken_at || new Date(),
        post_type: postData.media_type,
        hashtags: postData.hashtags || []
      }));

      // Find or create user's posts document
      const filter = { profile_id: userId };
      const update = {
        username: username.toLowerCase(),
        profile_id: userId,
        posts: postsArray,
        total_posts: postsArray.length,
        scraped_at: new Date(),
        updatedAt: new Date()
      };

      const userPostsDoc = await db.Post.findOneAndUpdate(
        filter,
        update,
        { upsert: true, new: true }
      ).lean();

      return userPostsDoc;
    } catch (error) {
      this.logger.error('Error in savePosts:', error);
      throw new ApiError(500, 'Database error while saving posts');
    }
  }

  async saveReels(profileId, reels, username) {
    try {
      if (!reels || reels.length === 0) {
        this.logger.info('No reels to save');
        return null;
      }

      // Transform reels data to new format
      const reelsArray = reels.map(reel => ({
        reel_id: reel.instagram_post_id || reel.shortcode,
        reel_url: reel.url || `https://instagram.com/reel/${reel.shortcode}`,
        thumbnail_url: reel.thumbnail_url || reel.display_url,
        video_url: reel.video_url,
        caption: reel.caption,
        views_count: reel.views || reel.views_count || 0,
        likes_count: reel.likes || reel.likes_count || 0,
        comments_count: reel.comments || reel.comments_count || 0,
        post_date: reel.instagram_data?.taken_at || reel.post_date || new Date(),
        duration_seconds: reel.duration || reel.duration_seconds || 0
      }));

      // Find or create user's reels document
      const filter = { profile_id: profileId };
      const update = {
        username: username.toLowerCase(),
        profile_id: profileId,
        reels: reelsArray,
        total_reels: reelsArray.length,
        scraped_at: new Date(),
        updatedAt: new Date()
      };

      const userReelsDoc = await db.Reel.findOneAndUpdate(
        filter,
        update,
        { upsert: true, new: true }
      ).lean();

      this.logger.info(`Saved ${reelsArray.length} reels for profile ${profileId}`);
      return userReelsDoc;
    } catch (error) {
      this.logger.error('Error in saveReels:', error);
      throw new ApiError(500, 'Database error while saving reels');
    }
  }

  async saveAnalytics(userId, analyticsData) {
    try {
      // Save analytics as engagement snapshot
      const snapshot = await db.EngagementSnapshot.create({
        influencer_id: userId,
        followers_count: analyticsData.total_likes || 0, // Using total_likes as placeholder
        following_count: analyticsData.total_comments || 0,
        posts_count: analyticsData.content_breakdown?.images + analyticsData.content_breakdown?.videos + analyticsData.content_breakdown?.carousels || 0,
        engagement_rate: analyticsData.engagement_rate || 0,
        influence_score: analyticsData.influence_score || 0,
        avg_likes: analyticsData.avg_likes || 0,
        avg_comments: analyticsData.avg_comments || 0,
        snapshot_date: new Date()
      });

      return snapshot.toObject();
    } catch (error) {
      this.logger.error('Error in saveAnalytics:', error);
      throw new ApiError(500, 'Database error while saving analytics');
    }
  }

  async saveRawInstagramRows(rows) {
    try {
      if (!Array.isArray(rows)) {
        rows = [rows];
      }

      const savedRows = [];
      for (const row of rows) {
        const filter = {
          $or: [
            { content_id: row.content_id },
            { username: row.username, data_type: row.data_type }
          ]
        };

        const savedRow = await db.InstagramData.findOneAndUpdate(
          filter,
          { ...row, updatedAt: new Date() },
          { upsert: true, new: true }
        ).lean();

        savedRows.push(savedRow);
      }

      return savedRows;
    } catch (error) {
      this.logger.error('Error in saveRawInstagramRows:', error);
      throw new ApiError(500, 'Database error while saving raw Instagram data');
    }
  }

  async getPostAnalytics(userId) {
    try {
      const analyticsDoc = await db.PostAiAnalysis
        .findOne({ profile_id: userId })
        .lean();

      if (!analyticsDoc || !analyticsDoc.analytics) {
        return [];
      }

      return analyticsDoc.analytics;
    } catch (error) {
      this.logger.error('Error in getPostAnalytics:', error);
      throw new ApiError(500, 'Database error while retrieving post analytics');
    }
  }

  async getReelAnalytics(userId) {
    try {
      this.logger.info(`Getting reel analytics for user ID: ${userId}`);

      // Get all reels for this user first
      const userReels = await db.Reel.findOne({ profile_id: userId });
      this.logger.info(`Found user reels document:`, userReels ? 'exists' : 'not found');

      if (!userReels || !userReels.reels) {
        this.logger.info('No reels found for user, returning empty array');
        return [];
      }

      const reelIds = userReels.reels.map(reel => reel.reel_id);
      this.logger.info(`Found ${reelIds.length} reel IDs:`, reelIds);

      // Get analytics for all reels
      const analyticsDocs = await db.ReelAiAnalysis
        .find({ reel_id: { $in: reelIds } })
        .lean();

      this.logger.info(`Found ${analyticsDocs.length} analytics documents`);
      return analyticsDocs;
    } catch (error) {
      this.logger.error('Error in getReelAnalytics:', error);
      this.logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw new ApiError(500, 'Database error while retrieving reel analytics');
    }
  }

  async savePostAnalytics(posts, mlData, userId, username) {
    try {
      // Transform analytics data to new format
      const analyticsArray = [];

      // Match posts with ML analysis data by image URL
      for (const post of posts) {
        if (!post.image_url) continue;

        // Find matching ML analysis data
        const analysis = mlData.find(mlItem =>
          mlItem.image_url === post.image_url ||
          mlItem.image_url.includes(post.image_url.split('/').pop()) ||
          post.image_url.includes(mlItem.image_url.split('/').pop())
        );

        if (analysis) {
          analyticsArray.push({
            post_id: post.post_id,
            content_categories: analysis.tags || [],
            vibe_classification: Array.isArray(analysis.ambience) ? analysis.ambience.join(', ') : (analysis.ambience || ''),
            quality_score: analysis.quality?.blur_score ? (analysis.quality.blur_score * 10) : 0,
            lighting_score: analysis.quality?.brightness ? Math.min(10, Math.max(1, analysis.quality.brightness / 25)) : 5,
            visual_appeal_score: analysis.quality?.blur_score ? (analysis.quality.blur_score * 10) : 0,
            consistency_score: analysis.quality?.brightness ? Math.min(10, Math.max(1, analysis.quality.brightness / 25)) : 5,
            keywords: analysis.tags || [],
            caption: analysis.caption || '',
            num_people: analysis.num_people || 0,
            ambience: analysis.ambience || [],
            image_dimensions: {
              width: analysis.quality?.width || 0,
              height: analysis.quality?.height || 0
            }
          });
        }
      }

      // Find or create user's analytics document
      const filter = { profile_id: userId };
      const update = {
        username: username.toLowerCase(),
        profile_id: userId,
        analytics: analyticsArray,
        total_analyzed: analyticsArray.length,
        analyzed_at: new Date(),
        updatedAt: new Date()
      };

      const userAnalyticsDoc = await db.PostAiAnalysis.findOneAndUpdate(
        filter,
        update,
        { upsert: true, new: true }
      ).lean();

      this.logger.info(`Saved analytics for ${analyticsArray.length} posts`);
      return userAnalyticsDoc;
    } catch (error) {
      this.logger.error('Error in savePostAnalytics:', error);
      throw new ApiError(500, 'Database error while saving post analytics');
    }
  }

  async saveReelAnalytics(reels, mlData, userId, username) {
    try {
      // Transform analytics data to new format
      const analyticsArray = [];

      // Match reels with ML analysis data by thumbnail URL
      for (const reel of reels) {
        if (!reel.thumbnail_url) continue;

        // Find matching ML analysis data
        const analysis = mlData.find(mlItem =>
          mlItem.thumbnail_url === reel.thumbnail_url ||
          mlItem.thumbnail_url.includes(reel.thumbnail_url.split('/').pop()) ||
          reel.thumbnail_url.includes(mlItem.thumbnail_url.split('/').pop())
        );

        if (analysis) {
          analyticsArray.push({
            reel_id: reel.reel_id,
            content_categories: analysis.tags || [],
            vibe_classification: Array.isArray(analysis.ambience) ? analysis.ambience.join(', ') : (analysis.ambience || ''),
            quality_score: analysis.quality?.blur_score ? (analysis.quality.blur_score * 10) : 0,
            events_objects: analysis.tags || [],
            descriptive_tags: analysis.tags || [],
            // Add the missing fields that the frontend expects
            keywords: analysis.tags || [],
            num_people: analysis.num_people || 0,
            lighting_score: analysis.quality?.brightness ? Math.min(10, Math.max(1, analysis.quality.brightness / 25)) : 5
          });
        }
      }

      // Save each reel analytics individually (since ReelAiAnalysis is per-reel, not per-user)
      const savedAnalytics = [];
      for (const analytics of analyticsArray) {
        try {
          // Create a clean analytics object with only valid schema fields
          const cleanAnalytics = {
            reel_id: analytics.reel_id,
            content_categories: analytics.content_categories || [],
            vibe_classification: analytics.vibe_classification || '',
            quality_score: analytics.quality_score || 0,
            events_objects: analytics.events_objects || [],
            descriptive_tags: analytics.descriptive_tags || []
          };

          const savedDoc = await db.ReelAiAnalysis.findOneAndUpdate(
            { reel_id: analytics.reel_id },
            cleanAnalytics,
            { upsert: true, new: true }
          ).lean();
          savedAnalytics.push(savedDoc);
        } catch (error) {
          this.logger.error(`Error saving reel analytics for ${analytics.reel_id}:`, error);
        }
      }

      this.logger.info(`Saved analytics for ${savedAnalytics.length} reels`);
      return savedAnalytics;
    } catch (error) {
      this.logger.error('Error in saveReelAnalytics:', error);
      throw new ApiError(500, 'Database error while saving reel analytics');
    }
  }

  // ========================================
  // URL COLLECTION METHODS
  // ========================================

  async getPostsUrlsByUsername(username) {
    try {
      const urlsDoc = await db.PostUrls
        .findOne({ username: username.toLowerCase() })
        .lean();

      return urlsDoc;
    } catch (error) {
      this.logger.error('Error in getPostsUrlsByUsername:', error);
      throw new ApiError(500, 'Database error while retrieving posts URLs');
    }
  }

  async getReelsUrlsByUsername(username) {
    try {
      const urlsDoc = await db.ReelUrls
        .findOne({ username: username.toLowerCase() })
        .lean();

      return urlsDoc;
    } catch (error) {
      this.logger.error('Error in getReelsUrlsByUsername:', error);
      throw new ApiError(500, 'Database error while retrieving reels URLs');
    }
  }

  async savePostsUrls(profileId, username, urls) {
    try {
      const filter = { username: username.toLowerCase() };
      const update = {
        username: username.toLowerCase(),
        profile_id: profileId,
        urls: urls,
        total_urls: urls.length,
        created_at: new Date(),
        updatedAt: new Date()
      };

      const urlsDoc = await db.PostUrls.findOneAndUpdate(
        filter,
        update,
        { upsert: true, new: true }
      ).lean();

      this.logger.info(`Saved ${urls.length} posts URLs for ${username}`);
      return urlsDoc;
    } catch (error) {
      this.logger.error('Error in savePostsUrls:', error);
      throw new ApiError(500, 'Database error while saving posts URLs');
    }
  }

  async saveReelsUrls(profileId, username, urls) {
    try {
      const filter = { username: username.toLowerCase() };
      const update = {
        username: username.toLowerCase(),
        profile_id: profileId,
        urls: urls,
        total_urls: urls.length,
        created_at: new Date(),
        updatedAt: new Date()
      };

      const urlsDoc = await db.ReelUrls.findOneAndUpdate(
        filter,
        update,
        { upsert: true, new: true }
      ).lean();

      this.logger.info(`Saved ${urls.length} reels URLs for ${username}`);
      return urlsDoc;
    } catch (error) {
      this.logger.error('Error in saveReelsUrls:', error);
      throw new ApiError(500, 'Database error while saving reels URLs');
    }
  }

  // ========================================
  // ANALYTICS METHODS
  // ========================================

  async getAnalyticsData(username, analyticsType) {
    try {
      const analyticsDoc = await db.AnalyticsData
        .findOne({
          username: username.toLowerCase(),
          analytics_type: analyticsType
        })
        .lean();

      return analyticsDoc;
    } catch (error) {
      this.logger.error('Error in getAnalyticsData:', error);
      throw new ApiError(500, 'Database error while retrieving analytics data');
    }
  }

  async saveAnalyticsData(username, analyticsType, data) {
    try {
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const filter = {
        username: username.toLowerCase(),
        analytics_type: analyticsType
      };
      const update = {
        username: username.toLowerCase(),
        profile_id: user._id,
        analytics_type: analyticsType,
        data: data,
        calculated_at: new Date(),
        updatedAt: new Date()
      };

      const analyticsDoc = await db.AnalyticsData.findOneAndUpdate(
        filter,
        update,
        { upsert: true, new: true }
      ).lean();

      this.logger.info(`Saved ${analyticsType} analytics data for ${username}`);
      return analyticsDoc;
    } catch (error) {
      this.logger.error('Error in saveAnalyticsData:', error);
      throw new ApiError(500, 'Database error while saving analytics data');
    }
  }

  async calculateLikesVsComments(username) {
    try {
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Get posts data
      const posts = await this.getUserPosts(user._id, { limit: 1000 });
      const reels = await this.getUserReels(user._id, { limit: 1000 });

      const postsData = posts.map(post => ({
        type: 'post',
        likes: post.likes_count || 0,
        comments: post.comments_count || 0,
        date: post.post_date
      }));

      const reelsData = reels.map(reel => ({
        type: 'reel',
        likes: reel.likes_count || 0,
        comments: reel.comments_count || 0,
        date: reel.post_date
      }));

      const allData = [...postsData, ...reelsData];

      return {
        total_posts: posts.length,
        total_reels: reels.length,
        total_content: allData.length,
        posts_data: postsData,
        reels_data: reelsData,
        all_data: allData,
        summary: {
          total_likes: allData.reduce((sum, item) => sum + item.likes, 0),
          total_comments: allData.reduce((sum, item) => sum + item.comments, 0),
          avg_likes_per_post: posts.length > 0 ? Math.round(posts.reduce((sum, post) => sum + (post.likes_count || 0), 0) / posts.length) : 0,
          avg_comments_per_post: posts.length > 0 ? Math.round(posts.reduce((sum, post) => sum + (post.comments_count || 0), 0) / posts.length) : 0,
          avg_likes_per_reel: reels.length > 0 ? Math.round(reels.reduce((sum, reel) => sum + (reel.likes_count || 0), 0) / reels.length) : 0,
          avg_comments_per_reel: reels.length > 0 ? Math.round(reels.reduce((sum, reel) => sum + (reel.comments_count || 0), 0) / reels.length) : 0
        }
      };
    } catch (error) {
      this.logger.error('Error in calculateLikesVsComments:', error);
      throw new ApiError(500, 'Error calculating likes vs comments analytics');
    }
  }

  async calculateEngagementRate(username) {
    try {
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Get posts and reels data
      const posts = await this.getUserPosts(user._id, { limit: 1000 });
      const reels = await this.getUserReels(user._id, { limit: 1000 });

      const followersCount = user.followers_count || 0;

      if (followersCount === 0) {
        return {
          engagement_rate: 0,
          followers_count: 0,
          message: 'No followers data available'
        };
      }

      // Calculate engagement for posts
      const postsEngagement = posts.reduce((sum, post) => {
        return sum + (post.likes_count || 0) + (post.comments_count || 0);
      }, 0);

      // Calculate engagement for reels
      const reelsEngagement = reels.reduce((sum, reel) => {
        return sum + (reel.likes_count || 0) + (reel.comments_count || 0);
      }, 0);

      const totalEngagement = postsEngagement + reelsEngagement;
      const totalContent = posts.length + reels.length;

      // ER = (likes + comments) / 100
      const engagementRate = totalEngagement / 100;

      return {
        engagement_rate: Math.round(engagementRate * 100) / 100,
        followers_count: followersCount,
        total_engagement: totalEngagement,
        total_content: totalContent,
        posts_engagement: postsEngagement,
        reels_engagement: reelsEngagement,
        posts_count: posts.length,
        reels_count: reels.length,
        engagement_per_content: totalContent > 0 ? Math.round(totalEngagement / totalContent) : 0,
        engagement_rate_percentage: followersCount > 0 ? Math.round((totalEngagement / followersCount) * 10000) / 100 : 0
      };
    } catch (error) {
      this.logger.error('Error in calculateEngagementRate:', error);
      throw new ApiError(500, 'Error calculating engagement rate analytics');
    }
  }

  async calculateContentAnalysis(username) {
    try {
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Get AI analysis data from posts and reels
      const postAnalytics = await this.getPostAnalytics(user._id);
      const reelAnalytics = await this.getReelAnalytics(user._id);

      // Collect all tags from posts and reels
      const allTags = [];

      postAnalytics.forEach(post => {
        if (post.content_categories && Array.isArray(post.content_categories)) {
          allTags.push(...post.content_categories);
        }
        if (post.keywords && Array.isArray(post.keywords)) {
          allTags.push(...post.keywords);
        }
      });

      reelAnalytics.forEach(reel => {
        if (reel.content_categories && Array.isArray(reel.content_categories)) {
          allTags.push(...reel.content_categories);
        }
        if (reel.descriptive_tags && Array.isArray(reel.descriptive_tags)) {
          allTags.push(...reel.descriptive_tags);
        }
      });

      if (allTags.length === 0) {
        return {
          message: 'No content analysis data available',
          tags: [],
          analysis: null
        };
      }

      // Call Grok API for content analysis
      const grokAnalysis = await this.callGrokAPI(
        `You are a data analysis assistant. Analyze the following content tags and return ONLY a valid JSON object (no markdown, no explanations).

Requirements:
1. Find the 8 most frequently occurring tags
2. Merge similar/related tags into one generalized tag
3. Group less common tags into "miscellaneous"
4. Calculate percentage for each tag based on frequency
5. Sort by percentage (highest first)

Input tags: ${allTags.join(', ')}

Return format (strict JSON only):
{
  "tags": [
    {"tag": "tag_name", "percentage": 25.5},
    {"tag": "another_tag", "percentage": 18.2}
  ]
}

Output:`
      );

      return {
        total_tags: allTags.length,
        unique_tags: [...new Set(allTags)].length,
        all_tags: allTags,
        grok_analysis: grokAnalysis,
        posts_analyzed: postAnalytics.length,
        reels_analyzed: reelAnalytics.length
      };
    } catch (error) {
      this.logger.error('Error in calculateContentAnalysis:', error);
      throw new ApiError(500, 'Error calculating content analysis');
    }
  }

  async calculateVibeAnalysis(username) {
    try {
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Get AI analysis data from posts and reels
      const postAnalytics = await this.getPostAnalytics(user._id);
      const reelAnalytics = await this.getReelAnalytics(user._id);

      // Collect all vibe classifications
      const allVibes = [];

      postAnalytics.forEach(post => {
        if (post.vibe_classification) {
          allVibes.push(post.vibe_classification);
        }
        if (post.ambience && Array.isArray(post.ambience)) {
          allVibes.push(...post.ambience);
        }
      });

      reelAnalytics.forEach(reel => {
        if (reel.vibe_classification) {
          allVibes.push(reel.vibe_classification);
        }
      });

      if (allVibes.length === 0) {
        return {
          message: 'No vibe analysis data available',
          vibes: [],
          analysis: null
        };
      }

      // Call Grok API for vibe analysis
      const grokAnalysis = await this.callGrokAPI(
        `Analyze these vibe classifications and return ONLY a valid JSON object with the most common 8 vibes and their percentages. Format: {"vibes": [{"vibe": "name", "percentage": number}]}. Generalize similar vibes and put less important ones as "miscellaneous", do not even return things like what you did what were you thinking ,i just want purse json data. Vibes: ${allVibes.join(', ')}`
      );

      return {
        total_vibes: allVibes.length,
        unique_vibes: [...new Set(allVibes)].length,
        all_vibes: allVibes,
        grok_analysis: grokAnalysis,
        posts_analyzed: postAnalytics.length,
        reels_analyzed: reelAnalytics.length
      };
    } catch (error) {
      this.logger.error('Error in calculateVibeAnalysis:', error);
      throw new ApiError(500, 'Error calculating vibe analysis');
    }
  }

  async calculateTopTags(username) {
    try {
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Get AI analysis data from posts and reels
      const postAnalytics = await this.getPostAnalytics(user._id);
      const reelAnalytics = await this.getReelAnalytics(user._id);

      // Collect all tags from posts and reels
      const allTags = [];

      postAnalytics.forEach(post => {
        if (post.content_categories && Array.isArray(post.content_categories)) {
          allTags.push(...post.content_categories);
        }
        if (post.keywords && Array.isArray(post.keywords)) {
          allTags.push(...post.keywords);
        }
      });

      reelAnalytics.forEach(reel => {
        if (reel.content_categories && Array.isArray(reel.content_categories)) {
          allTags.push(...reel.content_categories);
        }
        if (reel.descriptive_tags && Array.isArray(reel.descriptive_tags)) {
          allTags.push(...reel.descriptive_tags);
        }
      });

      if (allTags.length === 0) {
        return {
          message: 'No tags data available',
          top_tags: []
        };
      }

      // Count tag frequencies
      const tagCounts = {};
      allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      // Convert to array and sort by count
      const tagArray = Object.entries(tagCounts)
        .map(([tag, count]) => ({
          tag,
          count,
          percentage: Math.round((count / allTags.length) * 10000) / 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10

      return {
        total_tags: allTags.length,
        unique_tags: Object.keys(tagCounts).length,
        top_tags: tagArray,
        posts_analyzed: postAnalytics.length,
        reels_analyzed: reelAnalytics.length
      };
    } catch (error) {
      this.logger.error('Error in calculateTopTags:', error);
      throw new ApiError(500, 'Error calculating top tags');
    }
  }

  async calculatePerformancePQVsEngagement(username) {
    try {
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Get posts and reels data
      const posts = await this.getUserPosts(user._id, { limit: 1000 });
      const reels = await this.getUserReels(user._id, { limit: 1000 });
      const postAnalytics = await this.getPostAnalytics(user._id);
      const reelAnalytics = await this.getReelAnalytics(user._id);

      // Normalize quality scores and calculate engagement rates
      const processedData = [];

      // Process posts
      posts.forEach(post => {
        const analytics = postAnalytics.find(a => a.post_id === post.post_id);
        if (analytics) {
          const qualityScore = this.normalizeQualityScore(analytics.quality_score || 0);
          const engagement = (post.likes_count || 0) + (post.comments_count || 0);
          const er = engagement / 100;

          processedData.push({
            type: 'post',
            id: post.post_id,
            quality_score: qualityScore,
            engagement: engagement,
            engagement_rate: er,
            likes: post.likes_count || 0,
            comments: post.comments_count || 0
          });
        }
      });

      // Process reels
      reels.forEach(reel => {
        const analytics = reelAnalytics.find(a => a.reel_id === reel.reel_id);
        if (analytics) {
          const qualityScore = this.normalizeQualityScore(analytics.quality_score || 0);
          const engagement = (reel.likes_count || 0) + (reel.comments_count || 0);
          const er = engagement / 100;

          processedData.push({
            type: 'reel',
            id: reel.reel_id,
            quality_score: qualityScore,
            engagement: engagement,
            engagement_rate: er,
            likes: reel.likes_count || 0,
            comments: reel.comments_count || 0
          });
        }
      });

      return {
        total_analyzed: processedData.length,
        posts_analyzed: processedData.filter(item => item.type === 'post').length,
        reels_analyzed: processedData.filter(item => item.type === 'reel').length,
        data: processedData,
        summary: {
          avg_quality_score: processedData.length > 0 ? Math.round(processedData.reduce((sum, item) => sum + item.quality_score, 0) / processedData.length) : 0,
          avg_engagement_rate: processedData.length > 0 ? Math.round(processedData.reduce((sum, item) => sum + item.engagement_rate, 0) / processedData.length * 100) / 100 : 0,
          avg_engagement: processedData.length > 0 ? Math.round(processedData.reduce((sum, item) => sum + item.engagement, 0) / processedData.length) : 0
        }
      };
    } catch (error) {
      this.logger.error('Error in calculatePerformancePQVsEngagement:', error);
      throw new ApiError(500, 'Error calculating performance PQ vs engagement');
    }
  }

  async calculateQualityIndicators(username) {
    try {
      const user = await this.findUserByUsername(username);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Get AI analysis data from posts
      const postAnalytics = await this.getPostAnalytics(user._id);
      const reelAnalytics = await this.getReelAnalytics(user._id);

      // Collect all quality scores from posts
      const qualityScores = [];
      const lightingScores = [];
      const visualAppealScores = [];
      const consistencyScores = [];

      postAnalytics.forEach(post => {
        if (post.quality_score !== undefined) {
          qualityScores.push(this.normalizeQualityScore(post.quality_score));
        }
        if (post.lighting_score !== undefined) {
          lightingScores.push(post.lighting_score);
        }
        if (post.visual_appeal_score !== undefined) {
          visualAppealScores.push(post.visual_appeal_score);
        }
        if (post.consistency_score !== undefined) {
          consistencyScores.push(post.consistency_score);
        }
      });

      // Collect quality scores from reels
      reelAnalytics.forEach(reel => {
        if (reel.quality_score !== undefined) {
          qualityScores.push(this.normalizeQualityScore(reel.quality_score));
        }
        if (reel.lighting_score !== undefined) {
          lightingScores.push(reel.lighting_score);
        }
      });

      return {
        total_analyzed: qualityScores.length,
        posts_analyzed: postAnalytics.length,
        reels_analyzed: reelAnalytics.length,
        quality_indicators: {
          avg_quality_score: qualityScores.length > 0 ? Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) : 0,
          avg_lighting_score: lightingScores.length > 0 ? Math.round(lightingScores.reduce((sum, score) => sum + score, 0) / lightingScores.length * 100) / 100 : 0,
          avg_visual_appeal_score: visualAppealScores.length > 0 ? Math.round(visualAppealScores.reduce((sum, score) => sum + score, 0) / visualAppealScores.length * 100) / 100 : 0,
          avg_consistency_score: consistencyScores.length > 0 ? Math.round(consistencyScores.reduce((sum, score) => sum + score, 0) / consistencyScores.length * 100) / 100 : 0
        },
        score_breakdown: {
          quality_scores: qualityScores,
          lighting_scores: lightingScores,
          visual_appeal_scores: visualAppealScores,
          consistency_scores: consistencyScores
        }
      };
    } catch (error) {
      this.logger.error('Error in calculateQualityIndicators:', error);
      throw new ApiError(500, 'Error calculating quality indicators');
    }
  }

  normalizeQualityScore(score) {
    if (score > 100) {
      // 0-1000 scale, normalize to 0-100
      return Math.round((score / 1000) * 100);
    } else if (score <= 10) {
      // 0-10 scale, normalize to 0-100
      return Math.round((score / 10) * 100);
    } else {
      // Already on 0-100 scale
      return Math.round(score);
    }
  }

  async callGrokAPI(prompt) {
    
    try {
      const groqApiKey = process.env.GROQ_API_KEY;

      if (!groqApiKey) {
        throw new Error('GROQ_API_KEY environment variable not set');
      }

      this.logger.info('Calling Groq API with prompt:', prompt.substring(0, 100) + '...');

      const groq = new Groq({
        apiKey: groqApiKey
      });

      const requestConfig = {
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 1,
        max_completion_tokens: 1024,
        top_p: 1,
        stream: true,
        stop: null
      };

      const chatCompletion = await groq.chat.completions.create(requestConfig);

      // Collect streaming response
      let fullContent = '';
      let chunkCount = 0;
      
      for await (const chunk of chatCompletion) {
        chunkCount++;
        
        const chunkContent = chunk.choices[0]?.delta?.content || '';
        fullContent += chunkContent;
        
        if (chunkCount <= 5) { // Log first 5 chunks in detail
        }
      }


      this.logger.info('Groq API response received');

      if (fullContent) {
        const result = {
          analysis: fullContent,
          usage: chatCompletion.usage || null
        };
        return result;
      } else {
        const errorResult = {
          error: 'No response from Groq API',
          raw_response: chatCompletion
        };
        return errorResult;
      }
    } catch (error) {
      
      this.logger.error('Error calling Groq API:', error);
      
      const errorResult = {
        error: 'Failed to get AI analysis',
        message: error.message
      };
      return errorResult;
    }
  }
}

module.exports = DatabaseService;