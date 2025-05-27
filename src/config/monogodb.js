// config/mongodb.js
const mongoose = require('mongoose');
const loggingService = require("../services/logging.service");
const logger = loggingService.getLogger();

const connectMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ride_group_chat_db';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB Connected...');
  } catch (err) {
    logger.error('MongoDB Connection Failed:', err.message);
    throw err; // Re-throw to be caught by the main init block
  }
};

module.exports = {
  init: connectMongoDB // Expose it as an 'init' method
};