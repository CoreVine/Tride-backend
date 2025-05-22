const AccountRepository = require("../data-access/accounts");
const { ForbiddenError } = require("../utils/errors/types/Api.error");

/**
 * Middleware to check if user's email is verified
 * Only applies if EMAIL_VERIFICATION_REQUIRED is set to true
 */
const verifiedEmailRequired = async (req, res, next) => {
  try {
    // Skip verification check if feature is disabled
    if (process.env.EMAIL_VERIFICATION_REQUIRED !== "true") {
      return next();
    }

    if (!req.userId) {
      throw new ForbiddenError("Authentication required");
    }

    const account = await AccountRepository.findById(req.userId);

    if (!account) {
      throw new ForbiddenError("Account not found");
    }

    if (!account.is_verified) {
      throw new ForbiddenError(
        "Email verification required to access this resource"
      );
    }

    // If email is verified, proceed to next middleware
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = verifiedEmailRequired;
