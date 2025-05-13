/**
 * Middleware to handle multer upload errors
 */
const multerErrorHandler = (err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    // A multer error occurred when uploading
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.error('The uploaded file is too large.', 400);
      case 'LIMIT_FILE_COUNT':
        return res.error('Too many files uploaded.', 400);
      case 'LIMIT_UNEXPECTED_FILE':
        return res.error(`Unexpected field: ${err.field}`, 400);
      default:
        return res.error(err.message, 400);
    }
  } else if (err && err.message && err.message.startsWith('Invalid file type')) {
    // Custom file type validation error
    return res.error(err.message, 400);
  }
  
  // Pass other errors to next error handler
  next(err);
};

module.exports = multerErrorHandler;
