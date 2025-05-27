// Your main initialization file (e.g., app.js or server.js in your root)

const expressService = require("./services/express.service");
const sequelizeService = require("./services/sequelize.service");
const awsService = require("./services/aws.service");
const emailService = require("./services/email.service");
const redisService = require("./services/redis.service");
const mongodbService = require("./config/monogodb"); // Assuming this is correct
const socketioService = require("./services/socketio.service"); // NEW: Your Socket.IO service

require("dotenv").config(); // Ensure dotenv is loaded early

// This array holds services that can be initialized without special dependencies
// We'll handle expressService and socketioService separately because of their interdependency
const coreServices = [
  mongodbService, // Connects to MongoDB
  sequelizeService, // Connects to MySQL
  awsService,
  emailService,
  redisService,
];

(async () => {
  let app; // To hold the Express app instance
  let httpServer; // To hold the HTTP server instance

  try {
    // 1. Initialize core services (MongoDB, MySQL, etc.)
    for (const service of coreServices) {
      // Assuming each service has an 'init' method
      await service.init();
    }

    // 2. Initialize Express *after* core services (if Express needs them, e.g., logging)
    //    This step gets the configured Express 'app' instance.
    app = await expressService.init();

    // 3. Initialize Socket.IO, passing it the Express 'app'.
    //    The socketioService will create the underlying HTTP server.
    await socketioService.init(app);
    httpServer = socketioService.getHttpServer(); // Get the HTTP server instance from socketioService

    // Import logging service after initial services are set up
    const loggingService = require("./services/logging.service"); // Re-require if needed
    const logger = loggingService.getLogger(); // Get the logger instance

    logger.info("All services initialized successfully.");

    // 4. Start the server listening on the HTTP server (which serves both Express and Socket.IO)
    const PORT = process.env.SERVER_PORT || 3000; // Use your desired port, from .env
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Access API at http://localhost:${PORT}/api`);
      logger.info(`Socket.IO listening on ws://localhost:${PORT}`);
    });

  } catch (error) {
    // Make sure logging is initialized before trying to log here, or use console.error
    console.error("Failed to initialize server:", error);
    process.exit(1); // Exit if initialization fails
  }
})();