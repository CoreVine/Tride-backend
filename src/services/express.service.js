// services/express.service.js
const express = require("express");
const bodyParser = require("body-parser");
const {
  globalErrorHandler,
  notFoundHandler,
} = require("../middlewares/errorHandler.middleware");
const responseMiddleware = require("../middlewares/response.middleware");
const multerErrorHandler = require("../middlewares/multerErrorHandler.middleware");
const apiRouter = require("../routes");
const loggingService = require("./logging.service");
const rateLimitService = require("./rateLimit.service");
const corsService = require("./cors.service");

let app;
let logger;

const expressService = {
  init: async () => {
    try {
      // Initialize logging service first
      const { logger: winstonLogger, morgan } = await loggingService.init();
      logger = winstonLogger;

      // Initialize rate limiting service
      if (process.env.NODE_ENV === "production") {
        await rateLimitService.init();
      }

      // Initialize CORS service
      corsService.init(logger);

      app = express(); // Initialize Express app

      // Apply response formatting middleware
      app.use(responseMiddleware);

      // Apply CORS middleware (before other middleware)
      app.use(corsService.getCorsMiddleware());

      // Apply middleware
      app.use(bodyParser.json());

      if (process.env.NODE_ENV === "production") {
        // Apply rate limiting middleware to all requests
        app.use(rateLimitService.standardLimiter());
      }
      // Apply morgan middleware for HTTP request logging
      app.use(morgan);

      // Apply routes
      // *** REMOVED: Static file serving for uploads, as files are now on Cloudinary ***
      // app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

      // API routes under /api
      app.use("/api", apiRouter);

      // Handle 404 routes
      app.use("*", notFoundHandler);

      // MUST BE AT THE END TO HANDLE ERRORS!
      // Handle multer-specific errors first
      app.use(multerErrorHandler);

      // Apply global error handler
      app.use(globalErrorHandler);

      logger.info(`[EXPRESS] Express app configured.`);
      return app; // IMPORTANT: Return the Express app instance
    } catch (error) {
      logger.error(
        "[EXPRESS] Error during express service initialization",
        error
      );
      throw error;
    }
  },
  // Optionally, you can add a getApp method if other services need direct access to the app
  getApp: () => {
    if (!app) {
      throw new Error("Express app not initialized. Call init() first.");
    }
    return app;
  },
};

module.exports = expressService;
