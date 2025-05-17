/**
 * Backward-compatible upload configuration wrapper
 * This file ensures compatibility with existing code that imports from multer.config.js
 */
const uploadModule = require('./upload/index');

// Re-export everything from the new modular system
module.exports = {
  createUploader: uploadModule.createUploader,
  createFilter: uploadModule.createFilter,
  fileFilters: uploadModule.predefinedFilters,
  deleteUploadedFile: uploadModule.deleteFile,
  requireFileUpload: uploadModule.requireFileUpload,
  requireFilesUpload: uploadModule.requireFilesUpload,
  // Export cloudinary resource types for backward compatibility
  cloudinaryResourceTypes: uploadModule.constants.RESOURCE_TYPES,
  cloudinaryAccountTypes: uploadModule.constants.ACCOUNT_TYPES,
  cloudinaryPurposeTypes: uploadModule.constants.PURPOSE_TYPES
};
