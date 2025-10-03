const mongoose = require('mongoose');

let isConnected = false;
let state = 'disconnected';
let connection = null;

async function connect() {
  try {
    // Get MongoDB URI from environment variables
    let mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    
    // If no URI provided, use default local MongoDB
    if (!mongoUri) {
      mongoUri = 'mongodb://localhost:27017/instagram-dashboard';
    }
    
    // Ensure the URI starts with mongodb:// or mongodb+srv://
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      throw new Error(`Invalid MongoDB URI format. Expected mongodb:// or mongodb+srv://, got: ${mongoUri}`);
    }
    
    console.log(`🔗 Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);
    
    connection = await mongoose.connect(mongoUri);

    isConnected = true;
    state = 'authenticated';
    
    console.log('MongoDB connected successfully');
  } catch (error) {
    isConnected = false;
    state = 'error';
    console.error('MongoDB connection error:', error.message);
    console.error('💡 Make sure MongoDB is running and MONGODB_URI is set correctly');
    throw error;
  }
}

async function initialize() {
  try {
    // Create indexes for better performance
    const db = mongoose.connection.db;
    
    // Profiles collection indexes
    await db.collection('profiles').createIndex({ username: 1 }, { unique: true });
    await db.collection('profiles').createIndex({ followers_count: -1 });
    await db.collection('profiles').createIndex({ full_name: 'text', username: 'text' });
    await db.collection('profiles').createIndex({ scraped_at: -1 });
    
    // Posts collection indexes
    await db.collection('posts').createIndex({ profile_id: 1 });
    await db.collection('posts').createIndex({ post_id: 1 }, { unique: true });
    await db.collection('posts').createIndex({ post_date: -1 });
    await db.collection('posts').createIndex({ likes_count: -1 });
    await db.collection('posts').createIndex({ post_type: 1, post_date: -1 });
    await db.collection('posts').createIndex({ caption: 'text' });
    await db.collection('posts').createIndex({ scraped_at: -1 });
    
    // Post AI Analysis collection indexes
    await db.collection('post_ai_analysis').createIndex({ post_id: 1 });
    await db.collection('post_ai_analysis').createIndex({ analyzed_at: -1 });
    
    // Reels collection indexes
    await db.collection('reels').createIndex({ profile_id: 1 });
    await db.collection('reels').createIndex({ reel_id: 1 }, { unique: true });
    await db.collection('reels').createIndex({ post_date: -1 });
    await db.collection('reels').createIndex({ views_count: -1 });
    await db.collection('reels').createIndex({ caption: 'text' });
    await db.collection('reels').createIndex({ scraped_at: -1 });
    
    // Reel AI Analysis collection indexes
    await db.collection('reel_ai_analysis').createIndex({ reel_id: 1 });
    await db.collection('reel_ai_analysis').createIndex({ analyzed_at: -1 });
    
    // Post URLs collection indexes
    await db.collection('post_urls').createIndex({ username: 1 });
    await db.collection('post_urls').createIndex({ profile_id: 1 });
    await db.collection('post_urls').createIndex({ created_at: -1 });
    
    // Reel URLs collection indexes
    await db.collection('reel_urls').createIndex({ username: 1 });
    await db.collection('reel_urls').createIndex({ profile_id: 1 });
    await db.collection('reel_urls').createIndex({ created_at: -1 });
    
    // Analytics Data collection indexes
    await db.collection('analytics_data').createIndex({ username: 1 });
    await db.collection('analytics_data').createIndex({ analytics_type: 1 });
    await db.collection('analytics_data').createIndex({ username: 1, analytics_type: 1 }, { unique: true });
    await db.collection('analytics_data').createIndex({ profile_id: 1 });
    await db.collection('analytics_data').createIndex({ calculated_at: -1 });
    
    console.log('MongoDB indexes created successfully');
  } catch (error) {
    console.error('MongoDB initialization error:', error.message);
    throw error;
  }
}

function getStatus() {
  return {
    isConnected,
    state,
    database: {
      type: 'mongodb',
      host: connection?.host || 'unknown',
      port: connection?.port || 'unknown',
      name: connection?.name || 'unknown'
    }
  };
}

async function gracefulShutdown() {
  try {
    if (connection) {
      await mongoose.connection.close();
      isConnected = false;
      state = 'closed';
      console.log('MongoDB connection closed');
    }
  } catch (error) {
    state = 'error';
    console.error('MongoDB shutdown error:', error.message);
  }
}

// MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 MongoDB connected');
  isConnected = true;
  state = 'connected';
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB error:', error);
  isConnected = false;
  state = 'error';
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB disconnected');
  isConnected = false;
  state = 'disconnected';
});

module.exports = { mongoose, connect, initialize, getStatus, gracefulShutdown };