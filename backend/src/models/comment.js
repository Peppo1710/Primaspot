const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  reel_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reel'
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
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'comments'
});

// Index for better query performance
commentSchema.index({ post_id: 1 });
commentSchema.index({ reel_id: 1 });
commentSchema.index({ commenter_username: 1 });
commentSchema.index({ comment_date: -1 });

module.exports = commentSchema;