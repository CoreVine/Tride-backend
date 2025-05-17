const AccountRepository = require('../data-access/accounts');
const { ForbiddenError } = require('../utils/errors/types/Api.error');

/**
 * Middleware to check if user is the owner of the requested resource
 * 
 * @param {Object} options - Configuration options
 * @param {String} options.idParam - Parameter containing the resource ID (default: 'id')
 * @returns {Function} Express middleware
 */
const isSelfAuthorizedMiddleware = (options = {}) => {
  const { idParam = 'id' } = options;
  
  return async (req, res, next) => {
    try {
      // Get the requested resource ID from params
      const requestedResourceId = parseInt(req.params[idParam]);
      
      if (!requestedResourceId) {
        throw new ForbiddenError(`Resource ID parameter '${idParam}' is missing or invalid`);
      }
      
      // Get the account making the request
      const account = await AccountRepository.findByIdExcludeProps(req.userId, ['password']);
      
      if (!account) {
        throw new ForbiddenError('Account not found');
      }
      
      // Check if user is the owner of the resource (assuming id matches resource ID)
      if (account.id === requestedResourceId) {
        // User is authorized to operate on their own resource
        req.isSelfAuthorized = true;
        return next();
      }
      
      // If not self, reject the request
      throw new ForbiddenError('Access denied. Self-authorization required');
      
    } catch (error) {
      next(error);
    }
  };
};

// Default middleware instance with default options
const defaultSelfAuthorizedMiddleware = isSelfAuthorizedMiddleware();

module.exports = defaultSelfAuthorizedMiddleware;
module.exports.withOptions = isSelfAuthorizedMiddleware; // Export function for custom options
