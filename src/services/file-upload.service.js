const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { getLogger } = require("./logging.service"); // Assuming correct path to your logger
const logger = getLogger();

// --- Cloudinary Configuration ---
// IMPORTANT: Set these environment variables in your .env file
// Example:
// CLOUDINARY_CLOUD_NAME=your_cloud_name
// CLOUDINARY_API_KEY=your_api_key
// CLOUDINARY_API_SECRET=your_api_secret
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Cloudinary Storage for Multer ---
// This storage engine handles direct uploads to Cloudinary.
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // You can customize the folder structure on Cloudinary
    let folder;
    if (file.mimetype.startsWith("image/")) {
      folder = "car-wash-uploads/images";
    } else if (file.mimetype.startsWith("video/")) {
      folder = "car-wash-uploads/videos";
    } else if (file.mimetype.startsWith("audio/")) {
      folder = "car-wash-uploads/audio";
    } else {
      folder = "car-wash-uploads/documents"; // For PDF, Word, etc.
    }

    return {
      folder: folder,
      resource_type: "auto", // Cloudinary will automatically detect file type (image, video, raw)
      public_id: `${file.fieldname}-${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}`, // Unique public ID
      // Add any other Cloudinary upload options here (e.g., tags, quality)
      tags: ["car-wash", "chat-media"], // Example tags
    };
  },
});

// --- File Filter ---
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp", // Images (added webp)
    "image/heic",
    "image/heif", // Images (added HEIC/HEIF)
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-flv", // Videos (added webm, flv)
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/webm", // Audio (added ogg, webm)
    "application/pdf", // PDF
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Word Docs
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // Excel Docs
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PowerPoint Docs
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Using `logger.warn` instead of `logger.error` for invalid file type, as it's a client error.
    logger.warn(`Attempted upload with invalid file type: ${file.mimetype}`);
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Allowed types include common images, videos, audio, PDFs, and Office documents.`
      ),
      false
    );
  }
};

// --- Multer Upload Instance ---
// This instance will handle the incoming file and send it directly to Cloudinary.
const upload = multer({
  storage: cloudinaryStorage, // Use the Cloudinary storage engine
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (Adjust based on your Cloudinary plan and needs)
  },
});

// --- Process File Function (Updated for Cloudinary Response) ---
// This function now extracts metadata from the `req.file` object, which is populated
// by `multer-storage-cloudinary` with Cloudinary's response data.
upload.processFile = async (file) => {
  if (!file || !file.secure_url) {
    // Log an error if the file object is missing Cloudinary details
    logger.error("File object missing Cloudinary details after upload:", file);
    throw new Error("Uploaded file data is incomplete from Cloudinary.");
  }

  const result = {
    fieldname: file.fieldname,
    originalname: file.originalname,
    encoding: file.encoding,
    mimetype: file.mimetype,
    size: file.size, // Original file size
    filename: file.filename, // This will typically be the public_id provided to Cloudinary
    path: file.path, // This will be the Cloudinary secure_url
    url: file.secure_url, // The secure URL provided by Cloudinary
    // Cloudinary often provides these dimensions and duration directly for supported media types
    width: file.width || null,
    height: file.height || null,
    duration: file.duration ? Math.round(parseFloat(file.duration)) : null, // Duration for video/audio
    resource_type: file.resource_type, // 'image', 'video', 'raw' - determined by Cloudinary
  };

  logger.debug(
    `File successfully processed and uploaded to Cloudinary: ${result.url}`
  );
    return result;
};

// --- Helper function (remains the same, used for application-specific categorization) ---
function getFileType(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

// Export the Multer upload middleware and the helper function
module.exports = {
  upload, // This is the multer instance
  getFileType, // This is the helper function
};
