const { ValidationError } = require("../utils/errors/types/Api.error");
const loggingService = require("../services/logging.service");
const logger = loggingService.getLogger();

/**
 * Creates a middleware function that validates request data against a Yup schema
 * 
 * @param {object} schema - Yup schema for validation (if single source)
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 * 
 * Alternatively:
 * @param {object} schemaMap - Object mapping sources to schemas
 *                  e.g. { body: bodySchema, params: paramsSchema }
 * 
 * @returns {Function} Express middleware
 */
const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      // Handle multiple sources validation
      if (typeof schema === 'object' && !schema.validateSync && !schema.__isYupSchema__) {
        const errors = [];
        
        // Validate each source against its schema
        for (const [src, schemaObj] of Object.entries(schema)) {
          if (req[src]) {
            try {
              await schemaObj.validate(req[src], { abortEarly: false });
            } catch (error) {
              errors.push(...error.errors.map(err => `[${src}] ${err}`));
            }
          }
        }
        
        if (errors.length > 0) {
          logger.warn('Validation errors:', errors);
          throw new ValidationError(errors);
        }
      } 
      // Handle single source validation (original functionality)
      else {
        try {
          await schema.validate(req[source], { abortEarly: false });
        } catch (error) {
          // Create a structured array of validation errors
          const errors = error.errors || [error.message];
          logger.warn('Validation errors:', errors);
          throw new ValidationError(errors);
        }
      }
      // If validation passes, continue to next middleware
      next();
    } catch(error) {
      next(error);
    }
  };
};

module.exports = validate;
