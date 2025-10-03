const mongoose = require('mongoose');

const reelUrlsSchema = new mongoose.Schema({
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
  urls: {
    type: [String],
    required: true,
    default: []
  },
  total_urls: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'reel_urls'
});

// Compound indexes for better query performance
reelUrlsSchema.index({ username: 1, created_at: -1 });
reelUrlsSchema.index({ profile_id: 1, created_at: -1 });

module.exports = reelUrlsSchema;
