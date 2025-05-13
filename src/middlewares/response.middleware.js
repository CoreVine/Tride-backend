const { formatSuccessResponse, formatErrorResponse } = require('../utils/responseHandler');

/**
 * Middleware that adds standardized response methods to Express response object
 */
const responseMiddleware = (req, res, next) => {
  /**
   * Send a standardized success response
   * @param {string} message - Success message
   * @param {object|array} data - Response data
   * @param {object} pagination - Pagination details (optional)
   * @param {number} status - HTTP status code
   * @returns {Response} Express response
   */
  res.success = function(message, data = {}, pagination = null, status = 200) {
    const response = formatSuccessResponse(message, status, data, pagination);
    return this.status(status).json(response);
  };

  /**
   * Send a standardized error response
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @returns {Response} Express response
   */
  res.error = function(message, status = 400) {
    const response = formatErrorResponse(message, status);
    return this.status(status).json(response);
  };

  next();
};

module.exports = responseMiddleware;
