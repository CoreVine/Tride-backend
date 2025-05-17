/**
 * Middleware functions for file uploads
 */

/**
 * Middleware to check if a file was uploaded
 * @param {string} fieldName - Name of the file field to check
 * @returns {Function} Express middleware
 */
const requireFileUpload = (fieldName) => (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: `${fieldName} is required`,
      code: 'BAD_REQUEST',
      data: null
    });
  }
  next();
};

/**
 * Middleware to check if multiple files were uploaded
 * @param {string|string[]} fieldNames - Field name(s) to check
 * @param {Object} options - Options for validation
 * @returns {Function} Express middleware
 */
const requireFilesUpload = (fieldNames, options = {}) => {
  const { 
    allowPartial = false,
    customMessage = null
  } = options;
  
  return (req, res, next) => {
    const fieldsArray = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
    const missingFields = [];
    
    // Check each required field
    for (const fieldName of fieldsArray) {
      if (!req.files || !req.files[fieldName] || req.files[fieldName].length === 0) {
        missingFields.push(fieldName);
      }
    }
    
    // Handle missing fields
    if (missingFields.length > 0) {
      // Allow partial uploads if specified and at least one field is present
      if (allowPartial && missingFields.length < fieldsArray.length) {
        return next();
      }
      
      // Generate error message
      const message = customMessage || 
        `The following file(s) are required: ${missingFields.join(', ')}`;
      
      return res.status(400).json({
        status: 'error',
        message,
        code: 'BAD_REQUEST',
        data: null
      });
    }
    
    next();
  };
};

module.exports = {
  requireFileUpload,
  requireFilesUpload
};
