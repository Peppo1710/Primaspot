const mongoose = require('mongoose');

// Import Mongoose schemas
const InstagramDataSchema = require('./instagramData');
const ProfilesSchema = require('./profiles');
const PostsSchema = require('./posts');
const ReelsSchema = require('./reels');
const PostAiAnalysisSchema = require('./postAiAnalysis');
const ReelAiAnalysisSchema = require('./reelAiAnalysis');
const CommentSchema = require('./comment');
const EngagementSnapshotSchema = require('./engagementSnapshot');

// Create models from schemas
const InstagramData = mongoose.model('InstagramData', InstagramDataSchema);
const Profile = mongoose.model('Profile', ProfilesSchema);
const Post = mongoose.model('Post', PostsSchema);
const Reel = mongoose.model('Reel', ReelsSchema);
const PostAiAnalysis = mongoose.model('PostAiAnalysis', PostAiAnalysisSchema);
const ReelAiAnalysis = mongoose.model('ReelAiAnalysis', ReelAiAnalysisSchema);
const Comment = mongoose.model('Comment', CommentSchema);
const EngagementSnapshot = mongoose.model('EngagementSnapshot', EngagementSnapshotSchema);

// Export models and mongoose instance
const db = {
  mongoose,
  InstagramData,
  Profile,
  Post,
  Reel,
  PostAiAnalysis,
  ReelAiAnalysis,
  Comment,
  EngagementSnapshot
};

module.exports = db;