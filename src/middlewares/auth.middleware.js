const loggingService = require("../services/logging.service");
const JwtService = require("../services/jwt.service");
const { BadTokenError } = require("../utils/errors/types/Api.error");
const AdminRepository = require("../data-access/admin");
const AccountRepository = require("../data-access/accounts");
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
      const isAccount = await AccountRepository.findById(decoded.id);

      if (!isAccount)
        throw new Error("Invalid account!");
      
      req.userId = decoded.id;
      req.accountType = decoded.accountType;


      // admin permissions are added to the request object
      if (decoded.accountType === "admin") {
        // Fetch admin permissions from the database
        const admin = await AdminRepository.getPermissionsByAccountId(req.userId);

        if (admin) {
          req.admin = {
            id: admin.id,
            role: admin.role.role_name,
            permissions: admin.role.permissions.map(p => ({
              id: p.id,
              group: p.role_permission_group,
              name: p.role_permission_name
            }))
          };
        } else {
          logger.warn("[Auth] Admin not found for user ID:", req.userId);
        }
      }

      return next();
    } catch (error) {
      logger.error(`[Auth] Token verification failed: ${error.message}`);
      return next(
        new BadTokenError(`Token verification failed: ${error.message}`)
      );
    }
  } catch (error) {
    logger.error("[Auth] Unexpected error in auth middleware:", error);
    next(new BadTokenError("Authentication failed"));
  }
};

module.exports = authMiddleware;
