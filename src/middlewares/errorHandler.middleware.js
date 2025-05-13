const loggingService = require('../services/logging.service');
const { isApiError } = require("../utils/errors/types/Api.error");

const logger = loggingService.getLogger();
const currentEnv = process.env.NODE_ENV || 'development';

/**
 * Global error handler for all routes
 * @param {Error} err - Error object
 * @param {Request} _req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
const globalErrorHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);

  const customError = isApiError(err);
  
  let statusCode = customError ? err.statusCode : 500;
  let message = (customError || currentEnv === 'development') ? err.message : 'Something went wrong';
  
  if (!customError) {
    logger.error(err);
  }
  
  return res.error(message, statusCode);
};

/**
 * Handle 404 errors
 */
const notFoundHandler = (req, res) => {
  return res.error('Route not found', 404);
};

module.exports = { globalErrorHandler, notFoundHandler };

