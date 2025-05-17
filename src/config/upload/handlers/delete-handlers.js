/**
 * Handlers for deleting files from different storage providers
 */
const path = require('path');
const fs = require('fs');
const awsService = require('../../../services/aws.service');
const loggingService = require('../../../services/logging.service');
const cloudinary = require('cloudinary').v2;

const logger = loggingService.getLogger();

/**
 * Delete a file from local disk storage
 * @param {string} filePath - Path to the file
 * @returns {Promise<boolean>} Success status
 */
const deleteFromDisk = async (filePath) => {
  try {
    const basePath = process.cwd();
    const fullPath = path.join(basePath, filePath);
    
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      logger.info(`[UPLOAD] File deleted successfully: ${fullPath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`[UPLOAD] Error deleting file from disk: ${error.message}`);
    throw error;
  }
};

/**
 * Delete a file from AWS S3
 * @param {string} fileUrl - URL of the file
 * @returns {Promise<boolean>} Success status
 */
const deleteFromS3 = async (fileUrl) => {
  try {
    // Parse the URL to extract necessary information
    const url = new URL(fileUrl);
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
    logger.info(`[UPLOAD] File deleted from S3: ${filename}`);
    return true;
  } catch (error) {
    logger.error(`[UPLOAD] Error deleting file from S3: ${error.message}`);
    throw error;
  }
};

/**
 * Extract public ID from Cloudinary URL
 * This improved version handles complex folder structures and encoded characters
 * @param {string} url - Cloudinary URL
 * @returns {Object} Public ID and resource type
 */
const extractCloudinaryPublicId = (url) => {
  try {
    // Parse the URL to identify components
    
    // First determine the resource type from the URL
    let resourceType = 'image'; // Default
    if (url.includes('/video/')) {
      resourceType = 'video';
    } else if (url.includes('/raw/')) {
      resourceType = 'raw';
    }
    
    // Extract the path after the domain
    let publicId;
    
    // Case 1: URL contains full Cloudinary URL with domain
    if (url.includes('cloudinary.com')) {
      // Parse URL to extract path after domain
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Remove empty strings, 'image', 'video', 'raw', 'upload', etc., and any version number (v1234)
      const relevantParts = pathParts.filter(part => {
        return part && 
               !['image', 'video', 'raw', 'upload', 'private', 'authenticated'].includes(part) &&
               !part.match(/^v\d+$/);
      });
      
      publicId = relevantParts.join('/');
      
      // Remove extension if present
      const lastDotIndex = publicId.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        publicId = publicId.substring(0, lastDotIndex);
      }
    } 
    // Case 2: URL is already a public ID or path (no domain)
    else {
      publicId = url;
      
      // Remove extension if present
      const lastDotIndex = publicId.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        publicId = publicId.substring(0, lastDotIndex);
      }
    }
    
    // Decode URL-encoded characters
    publicId = decodeURIComponent(publicId);
    
    // Remove cloud prefix if present
    // This handles both explicit cloud name like 'drxkjfmbt/' and any cloud name from env
    if (publicId.includes('/')) {
      const parts = publicId.split('/');
      // If the first part doesn't contain the base folder, it's likely a cloud prefix
      const baseFolder = process.env.CLOUDINARY_BASE_FOLDER || 'tride';
      
      if (parts[0] && !parts[0].includes(baseFolder)) {
        // Remove the first segment (cloud prefix)
        parts.shift();
        publicId = parts.join('/');
        logger.debug(`[CLOUDINARY] Removed cloud prefix, new ID: ${publicId}`);
      }
    }
    
    logger.debug(`[CLOUDINARY] Final extracted public ID: ${publicId} (type: ${resourceType})`);
    return { publicId, resourceType };
  } catch (error) {
    logger.error(`[CLOUDINARY] Error extracting public ID: ${error.message}`, { url });
    throw error;
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} fileUrl - URL or public ID of the file
 * @returns {Promise<boolean>} Success status
 */
const deleteFromCloudinary = async (fileUrl) => {
  try {
    // Extract public ID and resource type
    const { publicId, resourceType } = extractCloudinaryPublicId(fileUrl);
    
    logger.debug(`[CLOUDINARY] Attempting to delete: ${publicId} (type: ${resourceType})`);
    
    // Try deleting with different methods and resource types if needed
    
    // First attempt: Use delete_resources with extracted resource type
    try {
      logger.debug(`[CLOUDINARY] Using delete_resources with type: ${resourceType}`);
      const result = await cloudinary.api.delete_resources([publicId], { 
        resource_type: resourceType 
      });
      
      if (result.deleted && result.deleted[publicId] === 'deleted') {
        logger.info(`[CLOUDINARY] Successfully deleted: ${publicId}`);
        return true;
      }
      
      logger.debug(`[CLOUDINARY] First attempt result: ${JSON.stringify(result)}`);
    } catch (err) {
      logger.debug(`[CLOUDINARY] First attempt failed: ${err.message}`);
    }
    
    // Second attempt: Try uploader.destroy for more precise control
    try {
      logger.debug(`[CLOUDINARY] Trying uploader.destroy with type: ${resourceType}`);
      const destroyResult = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true
      });
      
      if (destroyResult && destroyResult.result === 'ok') {
        logger.info(`[CLOUDINARY] Successfully deleted with uploader.destroy: ${publicId}`);
        return true;
      }
      
      logger.debug(`[CLOUDINARY] Second attempt result: ${JSON.stringify(destroyResult)}`);
    } catch (err) {
      logger.debug(`[CLOUDINARY] Second attempt failed: ${err.message}`);
    }
    
    // Third attempt: Try all resource types
    const allResourceTypes = ['image', 'video', 'raw'].filter(t => t !== resourceType);
    
    for (const type of allResourceTypes) {
      try {
        logger.debug(`[CLOUDINARY] Trying alternative resource type: ${type}`);
        const altResult = await cloudinary.uploader.destroy(publicId, {
          resource_type: type,
          invalidate: true
        });
        
        if (altResult && altResult.result === 'ok') {
          logger.info(`[CLOUDINARY] Successfully deleted with type ${type}: ${publicId}`);
          return true;
        }
      } catch (err) {
        logger.debug(`[CLOUDINARY] Failed with resource type ${type}: ${err.message}`);
      }
    }
    
    // If we get here, all attempts failed
    logger.warn(`[CLOUDINARY] Could not delete file: ${publicId}. File may not exist or path may be incorrect.`);
    return false;
  } catch (error) {
    logger.error(`[CLOUDINARY] Error in deleteFromCloudinary: ${error.message}`, { url: fileUrl });
    // Don't throw, just return false to not break the application flow
    return false;
  }
};

/**
 * Delete multiple files from Cloudinary in a single API call
 * @param {string[]} fileUrls - Array of Cloudinary URLs or public IDs
 * @returns {Promise<Object>} Result with success count and failed URLs
 */
const deleteMultipleFromCloudinary = async (fileUrls) => {
  if (!fileUrls || !fileUrls.length) return { success: 0, failed: [] };
  
  try {
    // Group files by resource type for batch deletion
    const resourceGroups = {};
    
    // Extract public IDs and group by resource type
    fileUrls.forEach(url => {
      try {
        const { publicId, resourceType } = extractCloudinaryPublicId(url);
        if (!resourceGroups[resourceType]) {
          resourceGroups[resourceType] = [];
        }
        resourceGroups[resourceType].push({ url, publicId });
      } catch (e) {
        logger.warn(`[CLOUDINARY] Skipping invalid URL: ${url}`);
      }
    });
    
    let successCount = 0;
    const failedUrls = [];
    
    // Process each resource type group
    for (const [resourceType, resources] of Object.entries(resourceGroups)) {
      if (resources.length === 0) continue;
      
      const publicIds = resources.map(r => r.publicId);
      logger.debug(`[CLOUDINARY] Batch deleting ${publicIds.length} resources of type ${resourceType}`);
      
      try {
        const result = await cloudinary.api.delete_resources(publicIds, { 
          resource_type: resourceType 
        });
        
        // Process results
        publicIds.forEach(publicId => {
          const resource = resources.find(r => r.publicId === publicId);
          if (result.deleted && result.deleted[publicId] === 'deleted') {
            successCount++;
          } else {
            failedUrls.push(resource.url);
          }
        });
      } catch (error) {
        logger.error(`[CLOUDINARY] Batch delete error for type ${resourceType}: ${error.message}`);
        resources.forEach(r => failedUrls.push(r.url));
      }
    }
    
    return { success: successCount, failed: failedUrls };
  } catch (error) {
    logger.error(`[CLOUDINARY] Batch delete error: ${error.message}`);
    return { success: 0, failed: fileUrls };
  }
};

/**
 * Delete a file from any storage based on the URL pattern
 * @param {string|string[]} filePath - Path or URL of the file(s)
 * @returns {Promise<boolean|Object>} Success status or result object
 */
const deleteFile = async (filePath) => {
  if (!filePath) return false;
  
  // Handle array of files
  if (Array.isArray(filePath)) {
    // Group by storage type for efficiency
    const diskPaths = [];
    const s3Urls = [];
    const cloudinaryUrls = [];
    const unknownPaths = [];
    
    filePath.forEach(path => {
      if (!path) return;
      
      if (path.startsWith('/uploads/') || path.startsWith('uploads/')) {
        diskPaths.push(path);
      } else if (path.includes('.amazonaws.com/')) {
        s3Urls.push(path);
      } else if (path.includes('cloudinary.com/') || path.includes('res.cloudinary.com/')) {
        cloudinaryUrls.push(path);
      } else {
        unknownPaths.push(path);
      }
    });
    
    const results = {
      total: filePath.length,
      successful: 0,
      failed: []
    };
    
    // Process each storage type in parallel
    const [diskResults, s3Results, cloudinaryResults] = await Promise.all([
      // Handle disk paths
      Promise.all(diskPaths.map(async (path) => {
        try {
          const success = await deleteFromDisk(path);
          return { path, success };
        } catch (error) {
          logger.error(`[UPLOAD] Error deleting disk file: ${error.message}`);
          return { path, success: false };
        }
      })),
      
      // Handle S3 URLs
      Promise.all(s3Urls.map(async (url) => {
        try {
          const success = await deleteFromS3(url);
          return { path: url, success };
        } catch (error) {
          logger.error(`[UPLOAD] Error deleting S3 file: ${error.message}`);
          return { path: url, success: false };
        }
      })),
      
      // Handle Cloudinary URLs in bulk
      cloudinaryUrls.length > 0 
        ? deleteMultipleFromCloudinary(cloudinaryUrls)
        : { success: 0, failed: [] }
    ]);
    
    // Combine results
    results.successful += diskResults.filter(r => r.success).length;
    results.successful += s3Results.filter(r => r.success).length;
    results.successful += cloudinaryResults.success;
    
    // Collect failed paths
    results.failed = [
      ...diskResults.filter(r => !r.success).map(r => r.path),
      ...s3Results.filter(r => !r.success).map(r => r.path),
      ...cloudinaryResults.failed,
      ...unknownPaths
    ];
    
    return results;
  }
  
  // Handle single file
  try {
    // Log the file path for debugging
    logger.debug(`[UPLOAD] Attempting to delete file: ${filePath}`);
    
    // Local storage
    if (filePath.startsWith('/uploads/') || filePath.startsWith('uploads/')) {
      return await deleteFromDisk(filePath);
    }
    // AWS S3
    else if (filePath.includes('.amazonaws.com/')) {
      return await deleteFromS3(filePath);
    }
    // Cloudinary
    else if (
      filePath.includes('cloudinary.com/') || 
      filePath.includes('res.cloudinary.com/') ||
      (typeof filePath === 'string' && filePath.includes('/upload/')) ||
      (typeof filePath === 'string' && filePath.includes(process.env.CLOUDINARY_BASE_FOLDER || 'tride'))
    ) {
      return await deleteFromCloudinary(filePath);
    }
    
    logger.warn(`[UPLOAD] Unknown file path format, couldn't determine storage type: ${filePath}`);
    return false;
  } catch (error) {
    logger.error(`[UPLOAD] Error deleting file: ${error.message}`, { path: filePath });
    return false;
  }
};

module.exports = {
  deleteFile,
  deleteFromDisk,
  deleteFromS3,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary
};
