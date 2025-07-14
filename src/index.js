// Your main initialization file (e.g., app.js or server.js in your root)

const http = require("http"); // <--- IMPORT HTTP MODULE

const expressService = require("./services/express.service");
const sequelizeService = require("./services/sequelize.service");
const awsService = require("./services/aws.service");
const emailService = require("./services/email.service");
const redisService = require("./services/redis.service");
const mongodbService = require("./config/monogodb");
const socketioService = require("./services/socketio.service");

require("dotenv").config(); // Ensure dotenv is loaded early

// This array holds services that can be initialized without special dependencies
const coreServices = [
  mongodbService,
  sequelizeService,
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
      await service.init();
    }

    // Import logging service after initial services are set up
    // This is placed here to ensure logger is available for subsequent steps
    const loggingService = require("./services/logging.service");
    const logger = loggingService.getLogger();

    // 2. Initialize Express *after* core services (if Express needs them, e.g., logging)
    app = await expressService.init();

    // 3. Create the HTTP server from the Express app
    // This is the CRITICAL STEP: http.createServer() takes the Express app as a handler
    httpServer = http.createServer(app);

    // 4. Initialize Socket.IO, passing it the raw HTTP server instance
    // Socket.IO will now attach itself correctly to this server
    socketioService.init(httpServer); // Pass the httpServer, not the Express 'app'

    logger.info("All services initialized successfully.");

    // 5. Start the HTTP server listening on the specified port
    // This server now handles both Express routes and Socket.IO connections
    const PORT = process.env.SERVER_PORT || 4000;
    httpServer.listen(PORT, "0.0.0.0", () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Access API at http://localhost:${PORT}/api`);
      logger.info(`Socket.IO listening on ws://localhost:${PORT}`);
    });
  } catch (error) {
    // Make sure logging is initialized before trying to log here, or use console.error
    console.error("Failed to initialize server:", error); // Use console.error as a fallback
    process.exit(1); // Exit if initialization fails
  }
})();
