const mongoose = require('mongoose');

const instagramDataSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    lowercase: true,
    maxlength: 100,
    index: true
  },
  full_name: {
    type: String,
    maxlength: 255
  },
  profile_picture_url: {
    type: String
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
  bio_text: {
    type: String
  },
  website_url: {
    type: String,
    maxlength: 500
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  account_type: {
    type: String,
    enum: ['business', 'personal'],
    default: 'personal'
  },
  content_id: {
    type: String,
    maxlength: 100,
    index: true
  },
  content_url: {
    type: String
  },
  media_type: {
    type: String,
    maxlength: 20
  },
  image_url: {
    type: String
  },
  video_url: {
    type: String
  },
  thumbnail_url: {
    type: String
  },
  caption: {
    type: String
  },
  likes_count: {
    type: Number,
    default: 0
  },
  comments_count: {
    type: Number,
    default: 0
  },
  views_count: {
    type: Number,
    default: 0
  },
  shares_count: {
    type: Number,
    default: 0
  },
  saves_count: {
    type: Number,
    default: 0
  },
  post_date: {
    type: Date,
    index: true
  },
  location: {
    type: String,
    maxlength: 255
  },
  hashtags: [{
    type: String
  }],
  tagged_users: [{
    type: String
  }],
  duration_seconds: {
    type: Number,
    default: 0
  },
  audio_track: {
    type: String,
    maxlength: 255
  },
  commenter_username: {
    type: String,
    maxlength: 100
  },
  commenter_profile_pic: {
    type: String
  },
  commenter_followers_count: {
    type: Number,
    default: 0
  },
  comment_text: {
    type: String
  },
  comment_date: {
    type: Date
  },
  scraped_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  data_type: {
    type: String,
    enum: ['profile', 'post', 'reel', 'comment'],
    required: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'instagramdata'
});

// Compound indexes for better query performance
instagramDataSchema.index({ username: 1, data_type: 1 });
instagramDataSchema.index({ data_type: 1, scraped_at: -1 });
instagramDataSchema.index({ post_date: -1 });

module.exports = instagramDataSchema;