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

    let token;
    try {
      token = JwtService.jwtGetToken(req);
    } catch (error) {
      logger.error("[Auth] Failed to extract token:", error.message);
      return next(new BadTokenError("No authentication token provided"));
    }
    
    if (!token) {
      logger.error("[Auth] No token provided in request");
      return next(new BadTokenError("No authentication token provided"));
    }

    try {
      const decoded = await JwtService.jwtVerify(token);
      req.userId = decoded.id;
      return next();
    } catch (error) {
      logger.error("[Auth] Token verification failed:", error.message);
      return next(new BadTokenError(`Token verification failed: ${error.message}`));
    }
  } catch (error) {
    logger.error("[Auth] Unexpected error in auth middleware:", error);
    next(new BadTokenError("Authentication failed"));
  }
};

module.exports = authMiddleware;
