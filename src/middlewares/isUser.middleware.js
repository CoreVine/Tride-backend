const AccountRepository = require('../data-access/accounts');
const { ForbiddenError } = require('../utils/errors/types/Api.error');

/**
 * Middleware to check if the requester has a valid account
 */
const isAccountMiddleware = async (req, res, next) => {
  try {
    const account = await AccountRepository.findById(req.userId);
    
    if (!account) {
      throw new ForbiddenError('Access denied. Account required');
    }
    
    // Add account info to request for later use
    req.account = account;
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = isAccountMiddleware;

