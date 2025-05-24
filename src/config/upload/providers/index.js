/**
 * Provider factory module for storage implementations
 */
const diskStorage = require("./disk");
const s3Storage = require("./s3");
const cloudinaryStorage = require("./cloudinary");
const loggingService = require("../../../services/logging.service");

const logger = loggingService.getLogger();

/**
 * Create a storage provider based on the specified type
 * @param {Object} options - Storage options
 * @returns {Object} Storage provider
 */
const createStorage = (options = {}) => {
  const { storageType, ...configOptions } = options;

  logger.debug(`[UPLOAD] Creating storage provider of type: ${storageType}`);

  switch (storageType) {
    case "disk":
      return diskStorage.create(configOptions);

    case "s3":
      return s3Storage.create(configOptions);

    case "cloudinary":
      return cloudinaryStorage.create(configOptions);

    default:
      throw new Error(`Unsupported storage type: ${storageType}`);
  }
};

module.exports = {
  createStorage,
};
