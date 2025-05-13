const { ForbiddenError } = require("../utils/errors/types/Api.error");

/**
 * Combines multiple middlewares with OR logic - if any middleware succeeds,
 * the request proceeds without checking remaining middlewares
 * 
 * @param {...Function} middlewares - Express middleware functions to combine with OR logic
 * @returns {Function} Combined middleware function
 */
const anyOf = (...middlewares) => {
  // Validate input - ensure we have actual middleware functions
  if (!middlewares.length) {
    throw new Error('anyOf requires at least one middleware function');
  }
  
  middlewares.forEach((middleware, index) => {
    if (typeof middleware !== 'function') {
      throw new Error(`Middleware at position ${index} is not a function`);
    }
  });

  return async (req, res, next) => {
    // Save original next function
    const originalNext = next;
    
    // Counter to track middleware execution attempts
    let middlewaresRun = 0;
    let errors = [];
    
    // Custom next function that tracks execution
    const trackingNext = (err) => {
      middlewaresRun++;
      
      // If no error, one middleware succeeded, so proceed
      if (!err) {
        return originalNext();
      }
      
      // Store the error
      errors.push(err);
      
      // If we've tried all middlewares and all failed, create a combined error
      if (middlewaresRun >= middlewares.length) {
        // Create a more descriptive error for better debugging
        const combinedError = new ForbiddenError('Access denied. None of the authorization checks passed.');
        combinedError.innerErrors = errors;
        return originalNext(combinedError);
      }
      
      // Otherwise, continue to the next middleware in our chain
      runMiddleware(middlewaresRun);
    };
    
    // Function to execute a middleware at a specific index
    const runMiddleware = (index) => {
      try {
        // Apply a timeout to prevent hanging middlewares (30 second timeout)
        const timeoutId = setTimeout(() => {
          trackingNext(new Error(`Middleware at position ${index} timed out after 30 seconds`));
        }, 30000);
        
        // Execute middleware and handle both Promise and synchronous patterns
        const middlewareExecution = middlewares[index](req, res, (err) => {
          clearTimeout(timeoutId);
          trackingNext(err);
        });
        
        // Handle the case where middleware returns a promise
        if (middlewareExecution instanceof Promise) {
          middlewareExecution.catch(error => {
            clearTimeout(timeoutId);
            trackingNext(error);
          });
        }
      } catch (error) {
        trackingNext(error);
      }
    };
    
    // Start with the first middleware
    runMiddleware(0);
  };
};

module.exports = {
  anyOf
};
