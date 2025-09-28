/**
 * Custom API Error Class
 * Provides consistent error handling across the application
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Create a Bad Request error (400)
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static badRequest(message = 'Bad Request') {
    return new ApiError(400, message);
  }

  /**
   * Create an Unauthorized error (401)
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  /**
   * Create a Forbidden error (403)
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  /**
   * Create a Not Found error (404)
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static notFound(message = 'Not Found') {
    return new ApiError(404, message);
  }

  /**
   * Create a Conflict error (409)
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  /**
   * Create a Rate Limit error (429)
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static tooManyRequests(message = 'Too Many Requests') {
    return new ApiError(429, message);
  }

  /**
   * Create an Internal Server error (500)
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static internal(message = 'Internal Server Error') {
    return new ApiError(500, message);
  }

  /**
   * Create a Service Unavailable error (503)
   * @param {string} message - Error message
   * @returns {ApiError}
   */
  static serviceUnavailable(message = 'Service Unavailable') {
    return new ApiError(503, message);
  }

  /**
   * Convert error to JSON format
   * @returns {Object}
   */
  toJSON() {
    return {
      status: 'error',
      statusCode: this.statusCode,
      message: this.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}

module.exports = ApiError;