const mongoose = require('mongoose');

const postAiAnalysisSchema = new mongoose.Schema({
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
  analytics: [{
    post_id: {
      type: String,
      required: true
    },
    content_categories: {
      type: [String],
      default: []
    },
    vibe_classification: {
      type: String,
      maxlength: 50
    },
    quality_score: {
      type: Number,
      default: 0
    },
    lighting_score: {
      type: Number,
      default: 0
    },
    visual_appeal_score: {
      type: Number,
      default: 0
    },
    consistency_score: {
      type: Number,
      default: 0
    },
    keywords: {
      type: [String],
      default: []
    }
  }],
  total_analyzed: {
    type: Number,
    default: 0
  },
  analyzed_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'post_ai_analysis'
});

// Index for better query performance
postAiAnalysisSchema.index({ post_id: 1 });
postAiAnalysisSchema.index({ analyzed_at: -1 });

module.exports = postAiAnalysisSchema;