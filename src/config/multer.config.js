const multer = require('multer');
const path = require('path');
const fs = require('fs');
const awsService = require('../services/aws.service');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const loggingService = require("../services/logging.service");
const logger = loggingService.getLogger();
// Import cloudinary configuration
const cloudinaryConfig = require('./cloudinary.config');

// Initialize Cloudinary with config from environment
cloudinaryConfig.initCloudinary();

// Create a custom middleware to check for file upload
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
 * Predefined file type filters
 */
const fileFilters = {
  // Filter for image files
  images: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
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
 * Ensure directory exists
 * @param {string} directory - Directory path 
 */
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

/**
 * Create a custom file filter
 * @param {string[]} allowedMimeTypes - Array of allowed MIME types
 * @param {string} errorMessage - Error message for invalid files
 */
const createFileFilter = (allowedMimeTypes, errorMessage) => {
  return (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(errorMessage || `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
    }
  };
};

/**
 * Delete file from storage
 * @param {string} filePath - File path or URL
 */
const deleteUploadedFile = async (filePath) => {
  if (!filePath) return;
  
  try {
    // Local storage
    if (filePath.startsWith('/uploads/') || filePath.startsWith('uploads/')) {
      const basePath = process.cwd();
      const fullPath = path.join(basePath, filePath);
      
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        logger.debug(`File deleted successfully: ${fullPath}`);
      }
    }
    // AWS S3
    else if (filePath.includes('.amazonaws.com/')) {
      // Parse the URL to extract necessary information
      const url = new URL(filePath);
      const pathSegments = url.pathname.split('/').filter(Boolean);
      
      // Extract the filename and extension
      const filename = pathSegments[pathSegments.length - 1];
      const fileUUID = filename.split('.')[0];
      const extension = path.extname(filename).substring(1);
      
      // Extract the bucket path (folder structure)
      const bucketPath = pathSegments.length > 1 
        ? pathSegments.slice(1, -1).join('/') + '/' 
        : '';
      
      await awsService.deleteFile(fileUUID, extension, bucketPath);
      logger.debug(`File deleted from S3: ${filename}`);
    }
    // Cloudinary
    else if (filePath.includes('cloudinary.com/') || filePath.includes('res.cloudinary.com/')) {
      // Use the cloudinary config's delete function
      await cloudinaryConfig.deleteFromCloudinary(filePath);
    }
  } catch (error) {
    console.error(`Error deleting file: ${error.message}`);
  }
};

/**
 * Create multer configuration
 * @param {Object} options - Configuration options
 * @param {string} options.storageType - Storage type ('disk', 's3', or 'cloudinary')
 * @param {string} options.uploadPath - Upload path for disk storage, bucket path for S3, or folder for Cloudinary
 * @param {string|function} options.fileFilter - Predefined filter name or custom filter function
 * @param {number} options.fileSize - Maximum file size in bytes
 * @param {Object} options.limits - Additional limits for multer
 * @param {string} options.fileNamePrefix - Prefix for uploaded files
 * @param {Object} options.cloudinaryOptions - Additional options for Cloudinary
 */
function createUploader(options = {}) {
  const {
    storageType = 'disk',
    uploadPath = 'uploads',
    fileFilter = 'all',
    fileSize = 5 * 1024 * 1024, // 5MB default
    limits = {},
    fileNamePrefix = '',
    cloudinaryOptions = {}
  } = options;

  // Resolve file filter
  const resolvedFilter = typeof fileFilter === 'function' ? fileFilter : fileFilters[fileFilter] || fileFilters.all;

  // Configure common limits
  const uploadLimits = {
    fileSize,
    ...limits
  };

  // Disk Storage Configuration
  if (storageType === 'disk') {
    const uploadDir = path.join(process.cwd(), uploadPath);
    ensureDirectoryExists(uploadDir);

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const prefix = fileNamePrefix ? `${fileNamePrefix}-` : '';
        cb(null, `${prefix}${uniqueSuffix}${ext}`);
      }
    });

    return multer({
      storage,
      fileFilter: resolvedFilter,
      limits: uploadLimits
    });
  }
  
  // S3 Storage Configuration
  else if (storageType === 's3') {
    const bucketPath = uploadPath.endsWith('/') ? uploadPath : `${uploadPath}/`;
    const tempDir = path.join(os.tmpdir(), 'express-app-uploads');
    ensureDirectoryExists(tempDir);
    
    // For AWS S3, we first need to save to disk since aws.service.js expects files on disk
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, tempDir);
      },
      filename: (req, file, cb) => {
        // Generate a UUID for the file
        const uuid = uuidv4();
        const ext = path.extname(file.originalname);
        // Save the UUID to use later for S3 upload
        file.uuid = uuid;
        cb(null, `${uuid}${ext}`);
      }
    });
    
    const multerInstance = multer({
      storage,
      fileFilter: resolvedFilter,
      limits: uploadLimits
    });
    
    // Create wrapper functions that combine multer with S3 upload
    const uploadToS3 = async (req, res, next) => {
      try {
        // Handle single file uploads
        if (req.file) {
          const file = req.file;
          const ext = path.extname(file.originalname).substring(1);
          
          // Upload file to S3 using the existing aws service
          const uuid = await awsService.uploadFile(file, ext, bucketPath);
          
          // Update req.file with S3 info
          req.file.url = `https://${process.env.AWS_BUCKET}.s3.amazonaws.com/${bucketPath}${uuid}.${ext}`;
          req.file.key = `${bucketPath}${uuid}.${ext}`;
          req.file.uuid = uuid;
        }
        
        // Handle multiple file uploads
        if (req.files) {
          // Handle array of files
          if (Array.isArray(req.files)) {
            const uploadPromises = req.files.map(async (file) => {
              const ext = path.extname(file.originalname).substring(1);
              const uuid = await awsService.uploadFile(file, ext, bucketPath);
              
              file.url = `https://${process.env.AWS_BUCKET}.s3.amazonaws.com/${bucketPath}${uuid}.${ext}`;
              file.key = `${bucketPath}${uuid}.${ext}`;
              file.uuid = uuid;
              
              return file;
            });
            
            req.files = await Promise.all(uploadPromises);
          }
          // Handle fields of files
          else {
            for (const field in req.files) {
              const files = req.files[field];
              const uploadPromises = files.map(async (file) => {
                const ext = path.extname(file.originalname).substring(1);
                const uuid = await awsService.uploadFile(file, ext, bucketPath);
                
                file.url = `https://${process.env.AWS_BUCKET}.s3.amazonaws.com/${bucketPath}${uuid}.${ext}`;
                file.key = `${bucketPath}${uuid}.${ext}`;
                file.uuid = uuid;
                
                return file;
              });
              
              req.files[field] = await Promise.all(uploadPromises);
            }
          }
        }
        
        next();
      } catch (error) {
        // Clean up temporary files in case of error
        if (req.file && req.file.path) {
          fs.unlink(req.file.path, (err) => {
            if (err) logger.error(`Error cleaning up temp file after error: ${err}`);
          });
        }
        if (req.files) {
          // Clean up array of files
          if (Array.isArray(req.files)) {
            req.files.forEach(file => {
              if (file.path) {
                fs.unlink(file.path, (err) => {
                  if (err) logger.error(`Error cleaning up temp file after error: ${err}`);
                });
              }
            });
          } 
          // Clean up fields of files
          else {
            Object.values(req.files).flat().forEach(file => {
              if (file.path) {
                fs.unlink(file.path, (err) => {
                  if (err) logger.error(`Error cleaning up temp file after error: ${err}`);
                });
              }
            });
          }
        }
        next(error);
      }
    };

    // Return wrapped methods
    return {
      single: (fieldName) => [multerInstance.single(fieldName), uploadToS3],
      array: (fieldName, maxCount) => [multerInstance.array(fieldName, maxCount), uploadToS3],
      fields: (fields) => [multerInstance.fields(fields), uploadToS3],
      any: () => [multerInstance.any(), uploadToS3],
      none: () => multerInstance.none()
    };
  }
  
  // Cloudinary Storage Configuration
  else if (storageType === 'cloudinary') {
    // Configure Cloudinary storage using the cloudinary config
    const storage = cloudinaryConfig.createCloudinaryStorage({
      resourceType: cloudinaryOptions.resourceType || cloudinaryConfig.RESOURCE_TYPES.AUTO,
      accountType: cloudinaryOptions.accountType || cloudinaryConfig.ACCOUNT_TYPES.SYSTEM,
      purpose: cloudinaryOptions.purpose || cloudinaryConfig.PURPOSE_TYPES.MISC,
      userId: cloudinaryOptions.userId,
      uploadPath: uploadPath,
      transformation: cloudinaryOptions.transformation,
      transformationPreset: cloudinaryOptions.transformationPreset,
      fileNamePrefix: fileNamePrefix,
      allowedFormats: cloudinaryOptions.allowedFormats || [],
      tags: cloudinaryOptions.tags || []
    });

    // Get folder path for logging and metadata
    const folder = cloudinaryConfig.getFolderPath({
      accountType: cloudinaryOptions.accountType || cloudinaryConfig.ACCOUNT_TYPES.SYSTEM,
      purpose: cloudinaryOptions.purpose || cloudinaryConfig.PURPOSE_TYPES.MISC,
      userId: cloudinaryOptions.userId,
      customPath: uploadPath
    });

    const resourceType = cloudinaryOptions.resourceType || cloudinaryConfig.RESOURCE_TYPES.AUTO;

    const multerInstance = multer({
      storage,
      fileFilter: resolvedFilter,
      limits: uploadLimits
    });

    // Add some post-processing to enhance file object with additional info
    const enhanceCloudinaryResponse = (req, res, next) => {
      try {
        // For single file uploads
        if (req.file) {
          // Process the file with cloudinary metadata
          cloudinaryConfig.processUploadedFile(req.file, { resourceType, folder });
          logger.info(`[CLOUDINARY] File uploaded: ${req.file.originalname} -> ${req.file.path}`);
        }
        
        // For multiple file uploads
        if (req.files) {
          // Array of files
          if (Array.isArray(req.files)) {
            req.files.forEach(file => {
              cloudinaryConfig.processUploadedFile(file, { resourceType, folder });
            });
            
            logger.info(`[CLOUDINARY] ${req.files.length} files uploaded to ${folder}`);
          } 
          // Fields of files
          else {
            Object.keys(req.files).forEach(field => {
              req.files[field].forEach(file => {
                cloudinaryConfig.processUploadedFile(file, { resourceType, folder });
              });
              
              const totalFiles = Object.values(req.files).reduce((sum, files) => sum + files.length, 0);
              logger.info(`[CLOUDINARY] ${totalFiles} files uploaded across ${Object.keys(req.files).length} fields to ${folder}`);
            });
          }
        }
        
        next();
      } catch (error) {
        logger.error(`[CLOUDINARY] Error processing upload: ${error.message}`);
        next(error);
      }
    };
    
    // Return wrapped methods with the same interface as the S3 uploader
    return {
      single: (fieldName) => [multerInstance.single(fieldName), enhanceCloudinaryResponse],
      array: (fieldName, maxCount) => [multerInstance.array(fieldName, maxCount), enhanceCloudinaryResponse],
      fields: (fields) => [multerInstance.fields(fields), enhanceCloudinaryResponse],
      any: () => [multerInstance.any(), enhanceCloudinaryResponse],
      none: () => multerInstance.none()
    };
  }
  
  throw new Error(`Unsupported storage type: ${storageType}`);
}

module.exports = {
  createUploader,
  fileFilters,
  createFileFilter,
  deleteUploadedFile,
  requireFileUpload,
  // Export cloudinary resource types directly from cloudinary config
  cloudinaryResourceTypes: cloudinaryConfig.RESOURCE_TYPES,
  cloudinaryAccountTypes: cloudinaryConfig.ACCOUNT_TYPES,
  cloudinaryPurposeTypes: cloudinaryConfig.PURPOSE_TYPES
};
