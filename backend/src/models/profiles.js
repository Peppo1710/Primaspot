const mongoose = require('mongoose');

const profilesSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
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
    default: 0,
    index: true
  },
  following_count: {
    type: Number,
    default: 0
  },
  posts_count: {
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
  collection: 'profiles'
});

// Text search index for full_name and username
profilesSchema.index({ 
  full_name: 'text', 
  username: 'text' 
});

// Compound indexes for better query performance
profilesSchema.index({ followers_count: -1 });
profilesSchema.index({ username: 1, followers_count: -1 });

module.exports = profilesSchema;