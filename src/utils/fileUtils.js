const path = require("path");

/**
 * Converts a file path to a relative public URL path
 * @param {string} filePath - The original file path
 * @param {string} type - The type of upload (e.g., 'product-images', 'profile-pictures', etc.)
 * @returns {string} The relative path for public URL
 */
const getRelativePath = (filePath, type) => {
  if (!filePath) return null;
  
  // Extract just the filename from the path
  const fileName = path.basename(filePath);
  
  // Return the relative path for public URL
  return `/uploads/${type}/${fileName}`;
};

module.exports = {
  getRelativePath
};
