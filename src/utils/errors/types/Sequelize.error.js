import DEFAULT_ERRORS from '../messages.errors';
import BaseError from "./Base.error";

/**
 * @class DatabaseError
 */
export class DatabaseError extends BaseError {
    constructor(originalError = null) {
        const message = DEFAULT_ERRORS.DATABASE_ERROR.message,
        status = 500,
        type = DEFAULT_ERRORS.DATABASE_ERROR.code;

        super(message, status, type, true);
        this.databaseError = true;
        this.originalError = originalError;
    }
}

export const isDatabaseError = (err) =>
    err instanceof DatabaseError ? err.databaseError : false;

