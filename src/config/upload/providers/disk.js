/**
 * Disk storage implementation for multer
 */
const multer = require('multer');
const path = require('path');
const utils = require('../utils');
const loggingService = require('../../../services/logging.service');

const logger = loggingService.getLogger();

/**
 * Create a disk storage configuration
 * @param {Object} options - Storage options
 * @returns {Object} Configured multer instance
 */
const create = (options = {}) => {
  const {
    uploadPath = 'uploads',
    fileNamePrefix = '',
    fileFilter,
    fileSize = 5 * 1024 * 1024,
    limits = {}
  } = options;
  
  // Ensure the upload directory exists
  const uploadDir = path.join(process.cwd(), uploadPath);
  utils.ensureDirectoryExists(uploadDir);
  
  logger.debug(`[UPLOAD] Configuring disk storage in: ${uploadDir}`);
  
  // Configure disk storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const filename = utils.generateUniqueFilename({
        originalFilename: file.originalname,
        prefix: fileNamePrefix
      });
      cb(null, filename);
    }
  });
  
  // Create and return multer instance
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize,
      ...limits
    }
  });
};

module.exports = {
  create
};
