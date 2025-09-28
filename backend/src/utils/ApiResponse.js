/**
 * Standard API Response utility
 * Ensures consistent response format across all endpoints
 */
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Create a success response (200)
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @returns {ApiResponse}
   */
  static success(data, message = 'Operation successful') {
    return new ApiResponse(200, data, message);
  }

  /**
   * Create a created response (201)
   * @param {*} data - Created resource data
   * @param {string} message - Success message
   * @returns {ApiResponse}
   */
  static created(data, message = 'Resource created successfully') {
    return new ApiResponse(201, data, message);
  }

  /**
   * Create an accepted response (202)
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @returns {ApiResponse}
   */
  static accepted(data, message = 'Request accepted') {
    return new ApiResponse(202, data, message);
  }

  /**
   * Create a no content response (204)
   * @param {string} message - Success message
   * @returns {ApiResponse}
   */
  static noContent(message = 'No content') {
    return new ApiResponse(204, null, message);
  }

  /**
   * Create a paginated response
   * @param {Array} data - Array of items
   * @param {Object} pagination - Pagination info
   * @param {string} message - Success message
   * @returns {ApiResponse}
   */
  static paginated(data, pagination, message = 'Data retrieved successfully') {
    return new ApiResponse(200, {
      items: data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || data.length,
        totalPages: pagination.totalPages || Math.ceil((pagination.total || data.length) / (pagination.limit || 20)),
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false
      }
    }, message);
  }

  /**
   * Create a cached response
   * @param {*} data - Response data
   * @param {string} cacheInfo - Cache information
   * @param {string} message - Success message
   * @returns {ApiResponse}
   */
  static cached(data, cacheInfo, message = 'Data retrieved from cache') {
    const response = new ApiResponse(200, data, message);
    response.cache = {
      hit: true,
      info: cacheInfo,
      cached_at: new Date().toISOString()
    };
    return response;
  }

  /**
   * Create a response with metadata
   * @param {*} data - Response data
   * @param {Object} meta - Metadata
   * @param {string} message - Success message
   * @returns {ApiResponse}
   */
  static withMeta(data, meta, message = 'Success') {
    const response = new ApiResponse(200, data, message);
    response.meta = meta;
    return response;
  }

  /**
   * Convert to JSON format for Express response
   * @returns {Object}
   */
  toJSON() {
    const response = {
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      timestamp: this.timestamp
    };

    if (this.data !== null && this.data !== undefined) {
      response.data = this.data;
    }

    if (this.meta) {
      response.meta = this.meta;
    }

    if (this.cache) {
      response.cache = this.cache;
    }

    return response;
  }

  /**
   * Send response via Express
   * @param {Object} res - Express response object
   */
  send(res) {
    res.status(this.statusCode).json(this.toJSON());
  }
}

module.exports = ApiResponse;