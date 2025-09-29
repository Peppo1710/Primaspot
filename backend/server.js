require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import utilities and middleware
const logger = require('./src/utils/logger');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const dbConnection = require('./config/database');

// Import routes
const userRoutes = require('./src/routes/userRoutes');

const app = express();
const port = process.env.PORT || 8000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression());

// CORS configuration - Allow all origins for development
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Request-ID'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Instagram specific rate limit
const instagramLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour
  message: {
    success: false,
    statusCode: 429,
    message: 'Instagram API rate limit exceeded. Please try again in an hour.'
  }
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Request ID middleware
app.use((req, res, next) => {
  req.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  res.set('X-Request-ID', req.id);
  next();
});

// Health check
app.get('/health', (req, res) => {
  const dbStatus = dbConnection.getStatus();
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: {
      status: dbStatus.isConnected ? 'connected' : 'disconnected',
      state: dbStatus.state
    }
  };
  const statusCode = dbStatus.isConnected ? 200 : 503;
  res.status(statusCode).json(health);
});

// API routes
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Instagram Dashboard API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      user: '/api/user/:username',
      validate: '/api/user/validate/:username',
      health: '/health'
    }
  });
});

// Mount user routes
app.use('/api/user', userRoutes);
app.use('/api/users', userRoutes);

// Apply Instagram rate limit to refresh endpoint
app.use('/api/user/:username/refresh', instagramLimiter);

// API documentation
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'API Documentation',
    endpoints: [
      { method: 'GET', path: '/user/:username', description: 'Get user profile data' },
      { method: 'GET', path: '/user/validate/:username', description: 'Validate if username exists on Instagram and call central API' },
      { method: 'POST', path: '/user/:username/refresh', description: 'Force refresh user data' },
      { method: 'GET', path: '/user/:username/posts', description: 'Get user posts with pagination' },
      { method: 'GET', path: '/user/:username/analytics', description: 'Get user analytics data' },
      { method: 'GET', path: '/users/search', description: 'Search users by username' },
      { method: 'GET', path: '/users/top', description: 'Get top influencers' }
    ]
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('🔄 Gracefully shutting down server...');
  await dbConnection.gracefulShutdown();
  process.exit(0);
};

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  gracefulShutdown();
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown();
});

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    await dbConnection.connect();
    await dbConnection.initialize();

    const server = app.listen(port, () => {
      logger.info(`🚀 Instagram Dashboard API Server started on port ${port}`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`API Documentation: http://localhost:${port}/api/docs`);
        logger.info(`Health Check: http://localhost:${port}/health`);
        logger.info(`API Base URL: http://localhost:${port}/api`);
        logger.info(`Server running on: http://localhost:${port}`);
      }
    });

    server.on('error', (error) => {
      logger.error('Server error:', error);
      gracefulShutdown();
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;