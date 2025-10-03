const mongoose = require('mongoose');

const analyticsDataSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    lowercase: true,
    maxlength: 100,
    index: true
  },
  profile_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
    index: true
  },
  analytics_type: {
    type: String,
    required: true,
    enum: [
      'likes_vs_comments',
      'engagement_rate', 
      'content_analysis',
      'vibe_analysis',
      'top_tags',
      'performance_pq_vs_engagement',
      'quality_indicators'
    ],
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  calculated_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'analytics_data'
});

// Compound indexes for better performance
analyticsDataSchema.index({ username: 1, analytics_type: 1 }, { unique: true });
analyticsDataSchema.index({ profile_id: 1, analytics_type: 1 });
analyticsDataSchema.index({ calculated_at: -1 });

module.exports = analyticsDataSchema;
