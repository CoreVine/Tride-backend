const loggingService = require("../../services/logging.service");
const logger = loggingService.getLogger();
/**
 * File filters for upload configuration
 */

/**
 * Predefined file type filters
 */
const filters = {
  // Filter for image files
  images: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    
    // Debug logging to see what MIME type is being received
    logger.debug('File upload debug:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname,
      size: file.size
    });
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  },
  
  // Filter for document files
  documents: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOC/DOCX are allowed.'), false);
    }
  },
  
  // Filter for video files
  videos: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MPEG, MOV, and AVI are allowed.'), false);
    }
  },
  
  // Allow all file types
  all: (req, file, cb) => {
    cb(null, true);
  }
};

/**
 * Create a custom file filter
 * @param {string[]} allowedMimeTypes - Array of allowed MIME types
 * @param {string} errorMessage - Error message for invalid files
 * @returns {Function} Multer filter function
 */
const createFilter = (allowedMimeTypes, errorMessage) => {
  return (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(errorMessage || `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
    }
  };
};

module.exports = {
  filters,
  createFilter
};
