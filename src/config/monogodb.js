// config/mongodb.js
const mongoose = require("mongoose");
const loggingService = require("../services/logging.service");
const logger = loggingService.getLogger();
const dotenv = require("dotenv");
const connectMongoDB = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/ride_group_chat_db"; // Default to local MongoDB if not set
    await mongoose.connect(mongoUri);
    logger.info("MongoDB Connected...");
  } catch (err) {
    logger.error("MongoDB Connection Failed:", err.message);
    throw err; // Re-throw to be caught by the main init block
  }
};

module.exports = {
  init: connectMongoDB, // Expose it as an 'init' method
};
