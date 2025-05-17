/**
 * Utility functions for file uploads
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} directory - Directory path
 */
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

/**
 * Generate a unique filename
 * @param {Object} options - Options for filename generation
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (options = {}) => {
  const { originalFilename = '', prefix = '' } = options;
  const ext = path.extname(originalFilename);
  const basename = path.basename(originalFilename, ext);
  const timestamp = Date.now();
  const uniqueId = uuidv4().substring(0, 8);
  
  return `${prefix}${prefix ? '-' : ''}${basename}-${timestamp}-${uniqueId}${ext}`;
};

/**
 * Clean up temporary files
 * @param {Object} files - Files to clean up
 */
const cleanupTempFiles = (files) => {
  if (!files) return;
  
  if (Array.isArray(files)) {
    files.forEach(file => {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  } else if (typeof files === 'object') {
    if (files.path && fs.existsSync(files.path)) {
      fs.unlinkSync(files.path);
    } else {
      // Handle nested object of files
      Object.values(files).forEach(fieldFiles => {
        if (Array.isArray(fieldFiles)) {
          fieldFiles.forEach(file => {
            if (file?.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
      });
    }
  }
};

module.exports = {
  ensureDirectoryExists,
  generateUniqueFilename,
  cleanupTempFiles
};
