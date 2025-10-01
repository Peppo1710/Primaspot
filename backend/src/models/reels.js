const mongoose = require('mongoose');

const reelsSchema = new mongoose.Schema({
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
  reels: [{
    reel_id: {
      type: String,
      required: true,
      maxlength: 50
    },
    reel_url: {
      type: String,
      required: true
    },
    thumbnail_url: {
      type: String
    },
    video_url: {
      type: String
    },
    caption: {
      type: String
    },
    views_count: {
      type: Number,
      default: 0
    },
    likes_count: {
      type: Number,
      default: 0
    },
    comments_count: {
      type: Number,
      default: 0
    },
    post_date: {
      type: Date
    },
    duration_seconds: {
      type: Number,
      default: 0
    }
  }],
  total_reels: {
    type: Number,
    default: 0
  },
  scraped_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'reels'
});

// Compound indexes for better query performance
reelsSchema.index({ profile_id: 1, post_date: -1 });
reelsSchema.index({ post_date: -1 });
reelsSchema.index({ views_count: -1 });

// Text search index for caption
reelsSchema.index({ caption: 'text' });

module.exports = reelsSchema;