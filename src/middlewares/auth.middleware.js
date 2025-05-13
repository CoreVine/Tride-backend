const loggingService = require('../services/logging.service');
const JwtService = require("../services/jwt.service");
const { BadTokenError } = require("../utils/errors/types/Api.error");

const logger = loggingService.getLogger();

/**
 * Authentication middleware to verify JWT tokens
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Skip authentication if disabled in environment config
    if (process.env.SERVER_JWT === "false") return next();

    const token = JwtService.jwtGetToken(req);
    
    if (!token) {
      throw new BadTokenError('No authentication token provided');
    }

    const decoded = JwtService.jwtVerify(token);
    req.userId = decoded;

    return next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    next(new BadTokenError(error.message));
  }
};

module.exports = authMiddleware;
