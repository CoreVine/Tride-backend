const DEFAULT_ERRORS = require("../messages.errors");
const BaseError = require("./Base.error");

/**
 * @class ApiError
 */
class ApiError extends BaseError {
  constructor(message, statusCode, type) {
    super(message, statusCode, type, true);
  }
}

class NotFoundError extends ApiError {
  constructor(
    message = DEFAULT_ERRORS.NOT_FOUND.message,
    type = DEFAULT_ERRORS.NOT_FOUND.code
  ) {
    super(message, 404, type);
  }
}

class BadRequestError extends ApiError {
  constructor(
    message = DEFAULT_ERRORS.BAD_REQUEST.message,
    type = DEFAULT_ERRORS.BAD_REQUEST.code
  ) {
    super(message, 400, type);
  }
}

class ValidationError extends ApiError {
  constructor(
    message = DEFAULT_ERRORS.VALIDATION.message,
    type = DEFAULT_ERRORS.VALIDATION.code
  ) {
    super(message, 400, type);
    
    // Add errors property to contain the detailed validation errors
    this.errors = Array.isArray(message) ? message : [message];
  }
}

class UnauthorizedError extends ApiError {
  constructor(
    message = DEFAULT_ERRORS.UNAUTHORIZED.message,
    type = DEFAULT_ERRORS.UNAUTHORIZED.code
  ) {
    super(message, 401, type);
  }
}
class ForbiddenError extends ApiError {
  constructor(
    message = DEFAULT_ERRORS.FORBIDDEN.message,
    type = DEFAULT_ERRORS.FORBIDDEN.code
  ) {
    super(message, 403, type);
  }
}

class InternalServerError extends ApiError {
  constructor(
    message = DEFAULT_ERRORS.SERVER_ERROR.message,
    type = DEFAULT_ERRORS.SERVER_ERROR.code
  ) {
    super(message, 500, type);
  }
}

class BadTokenError extends ApiError {
  constructor(
    message = DEFAULT_ERRORS.BAD_TOKEN.message,
    type = DEFAULT_ERRORS.BAD_TOKEN.code
  ) {
    super(message, 401, type);
  }
}

class TokenExpiredError extends ApiError {
  constructor(
    message = DEFAULT_ERRORS.TOKEN_EXPIRED.message,
    type = DEFAULT_ERRORS.TOKEN_EXPIRED.code
  ) {
    super(message, 401, type);
  }
}

class VerificationCodeExpiredError extends ApiError {
  constructor(
    message = DEFAULT_ERRORS.VERIFICATION_CODE_EXPIRED.message,
    type = DEFAULT_ERRORS.VERIFICATION_CODE_EXPIRED.code
  ) {
    super(message, 400, type);
  }
}

class VerificationCodeInvalidError extends ApiError {
  constructor(
    message = DEFAULT_ERRORS.VERIFICATION_CODE_INVALID.message,
    type = DEFAULT_ERRORS.VERIFICATION_CODE_INVALID.code
  ) {
    super(message, 400, type);
  }
}

class PasswordResetRequiredError extends ApiError {
  constructor(
    message = DEFAULT_ERRORS.PASSWORD_RESET_REQUIRED.message,
    type = DEFAULT_ERRORS.PASSWORD_RESET_REQUIRED.code
  ) {
    super(message, 400, type);
  }
}

class InvalidResetTokenError extends ApiError {
  constructor(
    message = DEFAULT_ERRORS.INVALID_RESET_TOKEN.message,
    type = DEFAULT_ERRORS.INVALID_RESET_TOKEN.code
  ) {
    super(message, 400, type);
  }
}

class ResetTokenUsedError extends ApiError {
  constructor(
    message = DEFAULT_ERRORS.RESET_TOKEN_USED.message,
    type = DEFAULT_ERRORS.RESET_TOKEN_USED.code
  ) {
    super(message, 400, type);
  }
}

class CorsError extends ApiError {
  constructor(
    origin = null,
    message = DEFAULT_ERRORS.CORS_ERROR.message,
    type = DEFAULT_ERRORS.CORS_ERROR.code
  ) {
    const errorMessage = origin ? `${message}: ${origin}` : message;
    super(errorMessage, 403, type);
    this.origin = origin;
  }
}

class TooManyAttemptsError extends Error {
  constructor(message = 'Too many attempts. Please try again later.') {
    super(message);
    this.name = 'TooManyAttemptsError';
    this.statusCode = 429; // Too Many Requests
  }
}

/**
 * Check if error is an api specific error
 * @param {Error} err - Error object
 * @returns {boolean} - Is this error an ApiError
 */
const isApiError = (err) =>
    err instanceof ApiError ? err.isOperational : false;

module.exports = {
  ApiError,
  NotFoundError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
  BadTokenError,
  TokenExpiredError,
  VerificationCodeExpiredError,
  VerificationCodeInvalidError,
  PasswordResetRequiredError,
  InvalidResetTokenError,
  ResetTokenUsedError,
  CorsError,
  TooManyAttemptsError,
  isApiError
};
