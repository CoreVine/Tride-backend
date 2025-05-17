/**
 * Cloudinary storage implementation for multer
 */
const multer = require('multer');
const dotenv = require('dotenv');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const constants = require('../constants');
const loggingService = require('../../../services/logging.service');

const logger = loggingService.getLogger();

dotenv.config();
// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Get folder path for Cloudinary uploads
 * @param {Object} options - Options for folder structure
 * @returns {string} Formatted folder path
 */
const getFolderPath = (options = {}) => {
  const {
    accountType = constants.ACCOUNT_TYPES.SYSTEM,
    purpose = constants.PURPOSE_TYPES.MISC,
    userId = null,
    customPath = null
  } = options;
  
  // Base folder from env or default
  let folder = process.env.CLOUDINARY_BASE_FOLDER || 'tride';
  
  // Add account type and purpose
  folder = `${folder}/${accountType}/${purpose}`;
  
  // Add user ID if provided
  if (userId) {
    folder = `${folder}/${userId}`;
  }
  
  // Add custom path if provided
  if (customPath) {
    folder = `${folder}/${customPath}`;
  }
  
  return folder;
};

/**
 * Enhance file with cloudinary metadata
 * @param {Object} file - File object
 * @param {Object} options - Enhancement options
 */
const enhanceFileWithCloudinaryMetadata = (file, options = {}) => {
  if (!file) return;
  
  const { resourceType, folder } = options;
  
  file.cloudinary = {
    publicId: file.filename,
    url: file.path,
    resourceType: resourceType,
    folder: folder,
    format: path.extname(file.path).substring(1) || 'auto'
  };
};

/**
 * Create a Cloudinary storage configuration
 * @param {Object} options - Storage options
 * @returns {Object} Configured multer wrapper with Cloudinary integration
 */
const create = (options = {}) => {
  const {
    uploadPath = '',
    fileFilter,
    fileSize = 5 * 1024 * 1024,
    limits = {},
    fileNamePrefix = '',
    cloudinaryOptions = {}
  } = options;
  
  const {
    resourceType = constants.RESOURCE_TYPES.AUTO,
    accountType = constants.ACCOUNT_TYPES.SYSTEM,
    purpose = constants.PURPOSE_TYPES.MISC,
    userId = null,
    transformation = null,
    transformationPreset = null,
    allowedFormats = [],
    tags = []
  } = cloudinaryOptions;
  
  // Get folder path
  const folder = getFolderPath({
    accountType,
    purpose,
    userId,
    customPath: uploadPath
  });
  
  logger.debug(`[UPLOAD] Configuring Cloudinary storage in folder: ${folder}`);
  
  // Get transformation configuration
  const finalTransformation = constants.getTransformation(transformation, transformationPreset);
  
  // Configure Cloudinary storage
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      format: async (req, file) => {
        // Extract format from mimetype or filename
        let format;
        if (file.mimetype) {
          format = file.mimetype.split('/')[1];
          // Normalize some formats
          if (format === 'jpeg') format = 'jpg';
        } else {
          format = path.extname(file.originalname).substring(1).toLowerCase();
        }
        
        // Check if format is allowed (if specified)
        if (allowedFormats.length > 0 && !allowedFormats.includes(format)) {
          throw new Error(`Format not allowed: ${format}`);
        }
        
        return format;
      },
      public_id: (req, file) => {
        // Generate a unique name with optional prefix
        const filename = path.basename(file.originalname, path.extname(file.originalname));
        const prefix = fileNamePrefix ? `${fileNamePrefix}-` : '';
        return `${prefix}${filename}-${uuidv4()}`;
      },
      resource_type: resourceType,
      transformation: finalTransformation,
      tags
    }
  });
  
  // Create multer instance
  const multerInstance = multer({
    storage,
    fileFilter,
    limits: {
      fileSize,
      ...limits
    }
  });
  
  // Create enhancement middleware for Cloudinary
  const enhanceCloudinaryResponse = (req, res, next) => {
    try {
      // Process single file
      if (req.file) {
        enhanceFileWithCloudinaryMetadata(req.file, { resourceType, folder });
        logger.debug(`[UPLOAD] Uploaded file to Cloudinary: ${req.file.originalname} -> ${req.file.path}`);
      }
      
      // Process multiple files
      if (req.files) {
        // Array of files
        if (Array.isArray(req.files)) {
          req.files.forEach(file => {
            enhanceFileWithCloudinaryMetadata(file, { resourceType, folder });
          });
          
          logger.debug(`[UPLOAD] Uploaded ${req.files.length} files to Cloudinary folder: ${folder}`);
        } 
        // Fields of files
        else {
          Object.keys(req.files).forEach(field => {
            req.files[field].forEach(file => {
              enhanceFileWithCloudinaryMetadata(file, { resourceType, folder });
            });
          });
          
          const totalFiles = Object.values(req.files).reduce((count, files) => count + files.length, 0);
          logger.debug(`[UPLOAD] Uploaded ${totalFiles} files across ${Object.keys(req.files).length} fields to Cloudinary folder: ${folder}`);
        }
      }
      
      next();
    } catch (error) {
      logger.error(`[UPLOAD] Error processing Cloudinary response: ${error.message}`);
      next(error);
    }
  };
  
  // Return wrapped methods with the same interface as other storage providers
  return {
    single: (fieldName) => [multerInstance.single(fieldName), enhanceCloudinaryResponse],
    array: (fieldName, maxCount) => [multerInstance.array(fieldName, maxCount), enhanceCloudinaryResponse],
    fields: (fields) => [multerInstance.fields(fields), enhanceCloudinaryResponse],
    any: () => [multerInstance.any(), enhanceCloudinaryResponse],
    none: () => multerInstance.none()
  };
};

module.exports = {
  create,
  getFolderPath
};
