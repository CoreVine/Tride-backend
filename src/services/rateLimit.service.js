const rateLimit = require('express-rate-limit');
const loggingService = require('./logging.service');

const logger = loggingService.getLogger();

const rateLimitService = {
  /**
   * Initialize the rate limit service
   */
  init: async () => {
    try {
      logger.info('[RATE_LIMIT] Rate limit service initialized');
      return rateLimitService;
    } catch (error) {
      logger.error('[RATE_LIMIT] Error during rate limit service initialization', error);
      throw error;
    }
  },

  /**
   * Create a standard API limiter with default settings
   */
  standardLimiter: () => {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      handler: (req, res) => {
        logger.warn(`[RATE_LIMIT] Too many requests from IP: ${req.ip}`);
        res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later.'
        });
      }
    });
  },
  
  /**
   * Create a more strict limiter for sensitive routes (login, registration, etc.)
   */
  strictLimiter: () => {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 100, // limit each IP to 10 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,

      handler: (req, res) => {
        logger.warn(`[RATE_LIMIT] Too many attempts on sensitive route from IP: ${req.ip}, path: ${req.originalUrl}`);
        res.status(429).json({
          success: false,
          message: 'Too many attempts, please try again later.'
        });
      }
    });
  },
  
  /**
   * Create a custom configured limiter
   * @param {Object} options - Limiter configuration options
   */
  createLimiter: (options) => {
    const config = {
      windowMs: options.windowMs || 15 * 60 * 1000,
      max: options.max || 100,
      standardHeaders: options.standardHeaders !== undefined ? options.standardHeaders : true,
      legacyHeaders: options.legacyHeaders !== undefined ? options.legacyHeaders : false,
      handler: (req, res) => {
        logger.warn(`[RATE_LIMIT] Rate limit exceeded for route: ${req.originalUrl} from IP: ${req.ip}`);
        res.status(429).json({
          success: false,
          message: options.message || 'Too many requests, please try again later.'
        });
      },
      ...options
    };
    
    return rateLimit(config);
  }
};

module.exports = rateLimitService;
