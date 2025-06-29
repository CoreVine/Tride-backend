const DEFAULT_ERRORS = require('../messages.errors');
const BaseError = require("./Base.error");

/**
 * @class DatabaseError
 */
class DatabaseError extends BaseError {
    constructor(originalError = null) {
        const message = DEFAULT_ERRORS.DATABASE_ERROR.message,
        status = 500,
        type = DEFAULT_ERRORS.DATABASE_ERROR.code;

        super(message, status, type, true);
        this.databaseError = true;
        this.originalError = originalError;
    }
}

const isDatabaseError = (err) =>
    err instanceof DatabaseError ? err.databaseError : false;

module.exports = {
    DatabaseError,
    isDatabaseError
};

