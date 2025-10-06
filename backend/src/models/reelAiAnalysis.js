const mongoose = require('mongoose');

const reelAiAnalysisSchema = new mongoose.Schema({
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
    reel_id: {
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
    events_objects: {
      type: [String],
      default: []
    },
    descriptive_tags: {
      type: [String],
      default: []
    },
    keywords: {
      type: [String],
      default: []
    },
    num_people: {
      type: Number,
      default: 0
    },
    lighting_score: {
      type: Number,
      default: 0
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
  collection: 'reel_ai_analysis'
});

// Index for better query performance
reelAiAnalysisSchema.index({ profile_id: 1 });
reelAiAnalysisSchema.index({ analyzed_at: -1 });

module.exports = reelAiAnalysisSchema;