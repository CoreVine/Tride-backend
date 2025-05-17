const AccountRepository = require('../data-access/accounts');
const { ForbiddenError } = require('../utils/errors/types/Api.error');

/**
 * Creates a middleware to check if the user has the required role
 * 
 * @param {String|Array} requiredRoles - Single role or array of allowed roles
 * @param {String} userRoleField - Field in user object that contains the role (default: 'role')
 * @returns {Function} Express middleware
 */
const createRoleCheckMiddleware = (requiredRoles, userRoleField = 'role') => {
  // Convert single role to array for consistent handling
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        throw new ForbiddenError('Authentication required');
      }

      // Fetch user with their role information
      const account = await AccountRepository.findById(req.userId);
      
      if (!account) {
        throw new ForbiddenError('Account not found');
      }
      
      // Check if user has any of the required roles
      if (!roles.includes(account[userRoleField])) {
        throw new ForbiddenError(`Access denied. Required role: ${roles.join(' or ')}`);
      }
      
      // Add account info to request for later use
      req.account = account;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Pre-configured middleware for admin role check
const isAdminMiddleware = createRoleCheckMiddleware('admin', 'role');

module.exports = {
  roleCheck: createRoleCheckMiddleware,
  isAdminMiddleware
};
