const {
    NotFoundError,
    BadRequestError,
    ValidationError,
    BadTokenError,
    TokenExpiredError,
    UnauthorizedError,
    ForbiddenError,
    InternalServerError,
    CorsError,
    VerificationCodeExpiredError,
    VerificationCodeInvalidError,
    PasswordResetRequiredError,
    InvalidResetTokenError,
    ResetTokenUsedError,
    TooManyAttemptsError,
    isApiError
} = require("./types/Api.error");

const {
    DatabaseError,
    isDatabaseError
} = require("./types/Sequelize.error");

module.exports = {
    // API Errors
    NotFoundError,
    BadRequestError,
    ValidationError,
    BadTokenError,
    TokenExpiredError,
    UnauthorizedError,
    ForbiddenError,
    InternalServerError,
    CorsError,
    VerificationCodeExpiredError,
    VerificationCodeInvalidError,
    PasswordResetRequiredError,
    InvalidResetTokenError,
    ResetTokenUsedError,
    TooManyAttemptsError,
    // Database Errors
    DatabaseError,
    // Utils
    isApiError,
    isDatabaseError,
};
