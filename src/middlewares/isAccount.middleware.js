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

      if (!account || !account.is_verified) {
        logger.warn("Account not found", { accountId });
        throw new UnauthorizedError("Account not found");
      }

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

const arePapersVerified = async (req, res, next) => {
  try {
    // Get account ID from auth middleware
    const accountId = req.userId;

    if (!accountId) {
      throw new UnauthorizedError("Authentication required");
    }

    // Get account from database
    const account = await AccountRepository.findByIdIncludeDetails(accountId);
    if (!account || !account.is_verified) {
      logger.warn("Parent account not found or not verified", { accountId });
      throw new UnauthorizedError("Parent account not found or not verified");
    }

    if (account.account_type === "parent" && (!account.parent || !account.parent.documents_approved)) {
      logger.warn("Parent account documents not approved", { accountId });
      throw new UnauthorizedError("Parent account documents not approved");
    } else if (account.account_type === "driver" && (!account.driver_papers || !account.driver_papers.approved)) {
      logger.warn("Driver account papers not approved", { accountId });
      throw new UnauthorizedError("Driver account papers not approved");
    }

    next();
  } catch (error) {
    next(error);
  }
}

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
      if (!account || !account.admin || !account.is_verified) {
        logger.warn("Admin account not found", { accountId });
        throw new UnauthorizedError("Admin account not found");
      }
      
      // Check if admin has the required role
      if (account.admin.role.role_name !== role) {
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

// TODO: TEST, NOT USED YET
const isAdminWithPermissions = (permissions) => {
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

      // Check if admin has the required permissions
      const hasPermissions = permissions.every(({ type, value }) =>
        account.admin.role.permissions.some(p => type === "group" ?  p.role_permission_group === value : p.role_permission_name === value)
      );

      if (!hasPermissions) {
        logger.warn("Unauthorized access attempt - insufficient admin permissions", {
          accountId,
          permissions: account.admin.role.permissions.map(p => p.role_permission_name),
          requiredPermissions: permissions,
        });
        throw new UnauthorizedError(`Access denied. This resource requires ${permissions.join(", ")} permissions.`);
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
  }
}

const isOneOf = (...userTypes) => {
  if (userTypes.length === 0) {
    throw new Error("At least one user type must be specified");
  }

  return async (req, res, next) => {
    try {
          // Get account ID from auth middleware
          const accountId = req.userId;
  
          if (!accountId) {
            throw new UnauthorizedError("Authentication required");
          }
      
          // Get account from database
          const account = await AccountRepository.findById(accountId);
          if (!account || !account.is_verified) {
            logger.info("Account not found", { accountId });
            throw new UnauthorizedError("Account not found");
          }
      
          if (!userTypes.includes(account.account_type)) {
            logger.warn("Unauthorized access attempt - incorrect account type", {
              accountId,
              accountType: account.account_type,
              requiredTypes: userTypes,
            });
            throw new UnauthorizedError(`Access denied.`);
          }
      
          const details = await AccountRepository.findByIdIncludeDetails(accountId, account.account_type);
  
          if (!details) {
            logger.info("Account details not found", { accountId });
            throw new UnauthorizedError("Account details not found");
          }
  
          req.account = {
            id: details.id,
            email: details.email,
            account_type: details.account_type,
            is_verified: details.is_verified,
            is_admin: details.account_type === "admin",
            [details.account_type]: details[details.account_type] || null,
          };
  
          next();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = {
  isParent: isAccountType("parent"),
  isDriver: isAccountType("driver"),
  isAdmin: isAccountType("admin"),
  isOneOf,
  isAdminWithRole,
  isAdminWithPermissions,
  isAccountType,
  arePapersVerified
};
