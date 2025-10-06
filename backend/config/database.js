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
    
    // Add connection options for better reliability
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      retryWrites: true,
      retryReads: true
    };
    
    connection = await mongoose.connect(mongoUri, options);

    isConnected = true;
    state = 'authenticated';
    
    console.log('MongoDB connected successfully');
  } catch (error) {
    isConnected = false;
    state = 'error';
    console.error('MongoDB connection error:', error.message);
    
    // Provide specific error messages for common issues
    if (error.message.includes('ReplicaSetNoPrimary')) {
      console.error('💡 MongoDB cluster has no primary node. This usually means:');
      console.error('   - The cluster is starting up (wait a few minutes)');
      console.error('   - Network connectivity issues');
      console.error('   - Cluster configuration problems');
    } else if (error.message.includes('authentication')) {
      console.error('💡 Authentication failed. Check your MongoDB credentials.');
    } else if (error.message.includes('timeout')) {
      console.error('💡 Connection timeout. Check your network and MongoDB server status.');
    } else {
      console.error('💡 Make sure MongoDB is running and MONGODB_URI is set correctly');
    }
    
    throw error;
  }
}

async function initialize() {
  try {
    // Note: Most indexes are now defined in the schema files to avoid duplicates
    // This function is kept for any additional indexes not defined in schemas
    
    console.log('MongoDB initialization completed - indexes are managed by Mongoose schemas');
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