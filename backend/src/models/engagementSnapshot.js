const mongoose = require('mongoose');

const engagementSnapshotSchema = new mongoose.Schema({
  influencer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Influencer',
    required: true,
    index: true
  },
  followers_count: {
    type: Number,
    default: 0
  },
  following_count: {
    type: Number,
    default: 0
  },
  posts_count: {
    type: Number,
    default: 0
  },
  avg_likes: {
    type: Number,
    default: 0
  },
  avg_comments: {
    type: Number,
    default: 0
  },
  engagement_rate: {
    type: Number,
    default: 0
  },
  influence_score: {
    type: Number,
    default: 0
  },
  snapshot_date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'engagementsnapshots'
});

// Index for better query performance
engagementSnapshotSchema.index({ influencer_id: 1, createdAt: -1 });
engagementSnapshotSchema.index({ createdAt: -1 });

module.exports = engagementSnapshotSchema;