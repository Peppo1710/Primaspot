const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Error handling middleware
 * Converts all errors to consistent API error responses
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`${req.method} ${req.originalUrl} - ${error.message}`, {
    error: error.stack,
    statusCode: error.statusCode,
    isOperational: error.isOperational,
    body: req.body,
    params: req.params,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID';
    error = new ApiError(400, message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value for ${field}`;
    error = new ApiError(409, message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ApiError(400, message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ApiError(401, message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ApiError(401, message);
  }

  // Express validator errors
  if (err.array && typeof err.array === 'function') {
    const message = err.array().map(e => e.msg).join(', ');
    error = new ApiError(400, message);
  }

  // Default to 500 server error
  if (!error.statusCode) {
    error = new ApiError(500, 'Internal server error');
  }

  // Send error response
  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    timestamp: new Date().toISOString()
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  // Add request ID if available
  if (req.id) {
    response.requestId = req.id;
  }

  res.status(error.statusCode).json(response);
};

/**
 * 404 handler for unmatched routes
 */
const notFound = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  const error = new ApiError(404, message);
  next(error);
};

module.exports = {
  errorHandler,
  notFound
};