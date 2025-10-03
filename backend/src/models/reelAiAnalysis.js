const mongoose = require('mongoose');

const reelAiAnalysisSchema = new mongoose.Schema({
  reel_id: {
    type: String,
    required: true,
    maxlength: 50,
    index: true
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
reelAiAnalysisSchema.index({ reel_id: 1 });
reelAiAnalysisSchema.index({ analyzed_at: -1 });

module.exports = reelAiAnalysisSchema;