const DEFAULT_ERRORS = {
    BAD_TOKEN: {
        code: "BAD_TOKEN",
        message: "Token is not valid",
    },
    TOKEN_EXPIRED: {
        code: "TOKEN_EXPIRED",
        message: "Token expired",
    },
    REFRESH_DISABLED: {
        code: "REFRESH_DISABLED",
        message: "Refresh token functionality is not enabled",
    },
    JWT_EXPIRY_DISABLED: {
        code: "JWT_EXPIRY_DISABLED",
        message: "JWT expiration is not enabled",
    },
    UNAUTHORIZED: {
        code: "UNAUTHORIZED",
        message: "Invalid credentials",
    },
    SERVER_ERROR: {
        code: "SERVER_ERROR",
        message: "Internal server error",
    },
    NOT_FOUND: {
        code: "NOT_FOUND",
        message: "Not found",
    },
    BAD_REQUEST: {
        code: "BAD_REQUEST",
        message: "Bad request",
    },
    FORBIDDEN: {
        code: "FORBIDDEN",
        message: "Permission denied",
    },
    VALIDATION: {
        code: "VALIDATION",
        message: "Validation error",
    },
    DATABASE_ERROR: {
        code: "DATABASE_ERROR",
        message: "Database error",
    },
    CORS_ERROR: {
        code: "CORS_ERROR",
        message: "CORS policy violation: Origin not allowed",
    },
    // Email verification errors
    EMAIL_VERIFICATION_REQUIRED: {
        code: "EMAIL_VERIFICATION_REQUIRED",
        message: "Email verification is required to access this resource",
    },
    EMAIL_ALREADY_VERIFIED: {
        code: "EMAIL_ALREADY_VERIFIED",
        message: "Email is already verified",
    },
    EMAIL_VERIFICATION_CODE_EXPIRED: {
        code: "EMAIL_VERIFICATION_CODE_EXPIRED",
        message: "Email verification code has expired",
    },
    EMAIL_VERIFICATION_CODE_INVALID: {
        code: "EMAIL_VERIFICATION_CODE_INVALID",
        message: "Invalid email verification code",
    },
    EMAIL_VERIFICATION_CODE_NOT_FOUND: {
        code: "EMAIL_VERIFICATION_CODE_NOT_FOUND",
        message: "No verification code found for this email",
    },
    TOO_MANY_VERIFICATION_ATTEMPTS: {
        code: "TOO_MANY_VERIFICATION_ATTEMPTS",
        message: "Too many verification attempts. Please request a new code.",
    },
    // Password reset errors
    VERIFICATION_CODE_EXPIRED: {
        code: "VERIFICATION_CODE_EXPIRED",
        message: "Verification code has expired",
    },
    VERIFICATION_CODE_INVALID: {
        code: "VERIFICATION_CODE_INVALID",
        message: "Invalid verification code",
    },
    VERIFICATION_CODE_NOT_FOUND: {
        code: "VERIFICATION_CODE_NOT_FOUND",
        message: "No verification code found for this email",
    },
    EMAIL_NOT_FOUND: {
        code: "EMAIL_NOT_FOUND",
        message: "No account found with that email address",
    },
    PASSWORD_RESET_REQUIRED: {
        code: "PASSWORD_RESET_REQUIRED",
        message: "Verification code must be validated before resetting password",
    },
    INVALID_RESET_TOKEN: {
        code: "INVALID_RESET_TOKEN",
        message: "Invalid or expired password reset token",
    },
    RESET_TOKEN_USED: {
        code: "RESET_TOKEN_USED",
        message: "This reset token has already been used",
    }
};

module.exports = DEFAULT_ERRORS;
