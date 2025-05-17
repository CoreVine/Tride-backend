/**
 * AWS S3 storage implementation for multer
 */
const multer = require('multer');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const awsService = require('../../../services/aws.service');
const utils = require('../utils');
const loggingService = require('../../../services/logging.service');

const logger = loggingService.getLogger();

/**
 * Process S3 uploads for files in the request
 * @param {string} bucketPath - S3 bucket path
 * @param {Object} req - Express request
 */
const processS3Uploads = async (bucketPath, req) => {
  // Handle single file uploads
  if (req.file) {
    const file = req.file;
    const ext = path.extname(file.originalname).substring(1);
    
    // Upload file to S3 using the aws service
    const uuid = await awsService.uploadFile(file, ext, bucketPath);
    
    // Update req.file with S3 info
    req.file.url = `https://${process.env.AWS_BUCKET}.s3.amazonaws.com/${bucketPath}${uuid}.${ext}`;
    req.file.key = `${bucketPath}${uuid}.${ext}`;
    req.file.uuid = uuid;
    
    logger.debug(`[UPLOAD] Uploaded file to S3: ${req.file.originalname} -> ${req.file.url}`);
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
      logger.debug(`[UPLOAD] Uploaded ${req.files.length} files to S3 bucket path: ${bucketPath}`);
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
      
      const totalFiles = Object.values(req.files).reduce((count, files) => count + files.length, 0);
      logger.debug(`[UPLOAD] Uploaded ${totalFiles} files across ${Object.keys(req.files).length} fields to S3 bucket path: ${bucketPath}`);
    }
  }
};

/**
 * Create an S3 storage configuration
 * @param {Object} options - Storage options
 * @returns {Object} Configured multer wrapper with S3 integration
 */
const create = (options = {}) => {
  const {
    uploadPath = 'uploads',
    fileFilter,
    fileSize = 5 * 1024 * 1024,
    limits = {}
  } = options;
  
  // Prepare the bucket path
  const bucketPath = uploadPath.endsWith('/') ? uploadPath : `${uploadPath}/`;
  
  // Create a temporary directory for files
  const tempDir = path.join(os.tmpdir(), 'express-app-uploads');
  utils.ensureDirectoryExists(tempDir);
  
  logger.debug(`[UPLOAD] Configuring S3 storage with bucket path: ${bucketPath}`);
  
  // Configure disk storage for temporary files
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
  
  // Create multer instance
  const multerInstance = multer({
    storage,
    fileFilter,
    limits: {
      fileSize,
      ...limits
    }
  });
  
  // Create middleware for S3 uploads
  const uploadToS3Middleware = async (req, res, next) => {
    try {
      await processS3Uploads(bucketPath, req);
      next();
    } catch (error) {
      // Clean up temporary files in case of error
      utils.cleanupTempFiles(req.file);
      utils.cleanupTempFiles(req.files);
      logger.error(`[UPLOAD] Error during S3 upload: ${error.message}`);
      next(error);
    }
  };
  
  // Return wrapped methods with the same interface as regular multer
  return {
    single: (fieldName) => [multerInstance.single(fieldName), uploadToS3Middleware],
    array: (fieldName, maxCount) => [multerInstance.array(fieldName, maxCount), uploadToS3Middleware],
    fields: (fields) => [multerInstance.fields(fields), uploadToS3Middleware],
    any: () => [multerInstance.any(), uploadToS3Middleware],
    none: () => multerInstance.none()
  };
};

module.exports = {
  create
};
