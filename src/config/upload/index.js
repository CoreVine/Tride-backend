/**
 * Upload module - Main entry point
 * 
 * This module provides a unified API for file uploads with different storage providers.
 */
const constants = require('./constants');
const providers = require('./providers');
const { filters, createFilter } = require('./validators');
const { requireFileUpload, requireFilesUpload } = require('./middleware/require-file');
const { deleteFile } = require('./handlers/delete-handlers');
const loggingService = require('../../services/logging.service');

const logger = loggingService.getLogger();

/**
 * Create an uploader with the specified configuration
 * @param {Object} options - Upload configuration options
 * @returns {Object} Configured multer uploader
 */
function createUploader(options = {}) {
  const {
    storageType = 'disk',
    fileFilter = 'all',
    fileSize = 5 * 1024 * 1024, // 5MB default
    ...storageOptions
  } = options;

  // Resolve file filter
  const resolvedFilter = typeof fileFilter === 'function' 
    ? fileFilter 
    : (filters[fileFilter] || filters.all);

  // Configure multer with the specified storage
  try {
    return providers.createStorage({
      storageType,
      fileFilter: resolvedFilter,
      fileSize,
      ...storageOptions
    });
  } catch (error) {
    logger.error(`[UPLOAD] Error creating uploader: ${error.message}`);
    throw error;
  }
}

// Export the public API
module.exports = {
  createUploader,
  createFilter,
  predefinedFilters: filters,
  requireFileUpload,
  requireFilesUpload,
  deleteFile,
  // Export constants for convenience
  constants: {
    RESOURCE_TYPES: constants.RESOURCE_TYPES,
    ACCOUNT_TYPES: constants.ACCOUNT_TYPES,
    PURPOSE_TYPES: constants.PURPOSE_TYPES
  }
};
