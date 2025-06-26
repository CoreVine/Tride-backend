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
      const account = await AccountRepository.findById(accountId);
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

      // Add account type to request for use in controllers
      req.accountType = account.account_type;

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  isParent: isAccountType("parent"),
  isDriver: isAccountType("driver"),
  isAccountType,
};
