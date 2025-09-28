const mongoose = require('mongoose');

const postsSchema = new mongoose.Schema({
  profile_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
    index: true
  },
  post_id: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50,
    index: true
  },
  post_url: {
    type: String,
    required: true
  },
  image_url: {
    type: String
  },
  video_url: {
    type: String
  },
  caption: {
    type: String
  },
  likes_count: {
    type: Number,
    default: 0,
    index: true
  },
  comments_count: {
    type: Number,
    default: 0
  },
  post_date: {
    type: Date,
    index: true
  },
  post_type: {
    type: String,
    enum: ['photo', 'video', 'carousel'],
    default: 'photo'
  },
  hashtags: {
    type: [String],
    default: []
  },
  scraped_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'posts'
});

// Compound indexes for better query performance
postsSchema.index({ profile_id: 1, post_date: -1 });
postsSchema.index({ post_date: -1 });
postsSchema.index({ likes_count: -1 });
postsSchema.index({ post_type: 1, post_date: -1 });

// Text search index for caption
postsSchema.index({ caption: 'text' });

module.exports = postsSchema;
