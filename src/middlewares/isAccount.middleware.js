const JwtService = require("../services/jwt.service");
const AccountRepository = require("../data-access/accounts");
const { UnauthorizedError } = require("../utils/errors/types/Api.error");
const loggingService = require("../services/logging.service");

const logger = loggingService.getLogger();

/**
 * Middleware to verify if the authenticated user has the required account type
 * @param {string} requiredType - The required account type ('parent' or 'driver')
 * @returns {function} Express middleware function
 */
const isAccountType = (requiredType) => {
  return async (req, res, next) => {
    try {
      // Get account ID from auth middleware
      const accountId = req.userId;

      if (!accountId) {
        throw new UnauthorizedError("Authentication required");
      }

      // Get account from database
      const account = await AccountRepository.findByIdIncludeDetails(accountId, requiredType);
      if (!account) {
        logger.warn("Account not found", { accountId });
        throw new UnauthorizedError("Account not found");
      }
      // console.log(
      //   "Account:",
      //   account.account_type,
      //   "Required Type:",
      //   requiredType
      // );

      // Check if account type matches required type
      if (account.account_type !== requiredType) {
        logger.warn("Unauthorized access attempt - incorrect account type", {
          accountId,
          accountType: account.account_type,
          requiredType,
        });
        throw new UnauthorizedError(
          `Access denied. This resource requires ${requiredType} account type.`
        );
      }

      req.account = {
        id: account.id,
        email: account.email,
        account_type: account.account_type,
        is_verified: account.is_verified,
        [requiredType]: account[requiredType] || null,
      };
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

const isAdminWithRole = (role) => {
  return async (req, res, next) => {
    try {
      // Get account ID from auth middleware
      const accountId = req.userId;

      if (!accountId) {
        throw new UnauthorizedError("Authentication required");
      }

      // Get account from database
      const account = await AccountRepository.findByIdIncludeDetails(accountId, "admin");
      if (!account || !account.admin) {
        logger.warn("Admin account not found", { accountId });
        throw new UnauthorizedError("Admin account not found");
      }
      console.log(account.admin.role.role_name, role);
      console.log(`hi ${account.admin.role.role_name} hi`, `hi ${role} hi`);
      
      // Check if admin has the required role
      if (!account.admin.role.role_name !== role) {
        logger.warn("Unauthorized access attempt - insufficient admin role", {
          accountId,
          roles: account.admin.roles,
          requiredRole: role,
        });
        throw new UnauthorizedError(`Access denied. This resource requires ${role} role, and we have: ${account.admin.role.role_name}.`);
      }

      req.account = {
        id: account.id,
        email: account.email,
        account_type: "admin",
        is_verified: account.is_verified,
        admin: account.admin,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  isParent: isAccountType("parent"),
  isDriver: isAccountType("driver"),
  isAdmin: isAccountType("admin"),
  isAdminWithRole,
  isAccountType,
};
