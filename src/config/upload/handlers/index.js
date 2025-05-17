/**
 * File handlers module
 */
const { deleteFile, deleteFromDisk, deleteFromS3, deleteFromCloudinary } = require('./delete-handlers');

module.exports = {
  deleteFile,
  deleteFromDisk,
  deleteFromS3,
  deleteFromCloudinary
};
