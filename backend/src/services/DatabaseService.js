const db = require('../models');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

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
      
      // Convert sortBy to MongoDB format
      let sortField = sortBy.replace('-', '');
      let sortOrder = sortBy.startsWith('-') ? -1 : 1;
      
      // Handle special field mappings
      if (sortField === 'created_at') sortField = 'createdAt';
      if (sortField === 'likes_count') sortField = 'likes_count';
      if (sortField === 'comments_count') sortField = 'comments_count';
      
      const posts = await db.Post
        .find({ profile_id: userId })
        .populate('PostAiAnalysis')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean();
      
      return posts;
    } catch (error) {
      this.logger.error('Error in getUserPosts:', error);
      throw new ApiError(500, 'Database error while retrieving user posts');
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

  async savePosts(userId, posts) {
    try {
      const savedPosts = [];
      
      for (const postData of posts) {
        const filter = { post_id: postData.instagram_post_id };
        
        const update = {
          profile_id: userId,
          post_id: postData.instagram_post_id,
          post_url: postData.url || `https://instagram.com/p/${postData.shortcode}`,
          image_url: postData.display_url,
          video_url: postData.video_url,
          caption: postData.caption,
          likes_count: postData.likes,
          comments_count: postData.comments,
          post_date: postData.instagram_data?.taken_at || new Date(),
          post_type: postData.media_type,
          hashtags: postData.hashtags || [],
          scraped_at: new Date(),
          updatedAt: new Date()
        };

        const post = await db.Post.findOneAndUpdate(
          filter,
          update,
          { upsert: true, new: true }
        ).lean();

        savedPosts.push(post);
      }

      return savedPosts;
    } catch (error) {
      this.logger.error('Error in savePosts:', error);
      throw new ApiError(500, 'Database error while saving posts');
    }
  }

  async saveReels(profileId, reels) {
    try {
      if (!reels || reels.length === 0) {
        this.logger.info('No reels to save');
        return [];
      }

      const savedReels = [];
      for (const reel of reels) {
        const reelData = {
          profile_id: profileId,
          reel_id: reel.id || reel.shortcode,
          reel_url: reel.url || `https://instagram.com/reel/${reel.shortcode}`,
          thumbnail_url: reel.thumbnail_url || reel.display_url,
          video_url: reel.video_url,
          caption: reel.caption,
          views_count: reel.views_count || 0,
          likes_count: reel.likes_count || 0,
          comments_count: reel.comments_count || 0,
          post_date: reel.post_date || new Date(),
          duration_seconds: reel.duration_seconds || 0,
          scraped_at: new Date()
        };

        const savedReel = await db.Reel.findOneAndUpdate(
          { reel_id: reelData.reel_id },
          reelData,
          { upsert: true, new: true }
        );

        savedReels.push(savedReel);
      }

      this.logger.info(`Saved ${savedReels.length} reels for profile ${profileId}`);
      return savedReels;
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
}

module.exports = DatabaseService;