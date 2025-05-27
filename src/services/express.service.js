// services/express.service.js

const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { globalErrorHandler, notFoundHandler } = require("../middlewares/errorHandler.middleware");
const responseMiddleware = require("../middlewares/response.middleware");
const path = require('path');
const multerErrorHandler = require('../middlewares/multerErrorHandler.middleware');
const apiRouter = require("../routes");
const loggingService = require("./logging.service");
const rateLimitService = require("./rateLimit.service");
const corsService = require("./cors.service");

let app; // Renamed 'server' to 'app' for clarity as it's the Express app
let logger;

const expressService = {
  init: async () => {
    try {
      // Initialize logging service first
      const { logger: winstonLogger, morgan } = await loggingService.init();
      logger = winstonLogger;
      
      // Initialize rate limiting service
      if (process.env.NODE_ENV === 'production') {
        await rateLimitService.init();
      }
      
      // Initialize CORS service
      corsService.init(logger);
      
      app = express(); // Initialize Express app

      // Apply response formatting middleware
      app.use(responseMiddleware); // Changed 'server' to 'app'
      
      // Apply CORS middleware (before other middleware)
      app.use(corsService.getCorsMiddleware()); // Changed 'server' to 'app'
      
      // Apply middleware
      app.use(bodyParser.json()); // Changed 'server' to 'app'

      // Use cookie-parser middleware
      app.use(cookieParser()); // Changed 'server' to 'app'
      
      if (process.env.NODE_ENV === 'production') {
        // Apply rate limiting middleware to all requests
        app.use(rateLimitService.standardLimiter()); // Changed 'server' to 'app'
      }
      // Apply morgan middleware for HTTP request logging
      app.use(morgan); // Changed 'server' to 'app'
      
      // Apply routes
      // Static file serving for uploads
      app.use('/uploads', express.static(path.join(__dirname, '../../uploads'))); // Changed 'server' to 'app'
      // API routes under /api
      app.use('/api', apiRouter); // Changed 'server' to 'app'

      
      // Handle 404 routes
      app.use('*', notFoundHandler); // Changed 'server' to 'app'

      // MUST BE AT THE END TO HANDLE ERRORS!
      // Handle multer-specific errors first
      app.use(multerErrorHandler); // Changed 'server' to 'app'

      // Apply global error handler
      app.use(globalErrorHandler); // Changed 'server' to 'app'
      
      // *** REMOVE THE server.listen() CALL FROM HERE ***
      // server.listen(process.env.SERVER_PORT); // <-- REMOVE THIS LINE
      
      logger.info(`[EXPRESS] Express app configured.`); // Changed log message
      return app; // *** IMPORTANT: Return the Express app instance ***
    } catch (error) {
      logger.error("[EXPRESS] Error during express service initialization", error);
      throw error;
    }
  },
  // Optionally, you can add a getApp method if other services need direct access to the app
  getApp: () => {
    if (!app) {
      throw new Error('Express app not initialized. Call init() first.');
    }
    return app;
  }
};

module.exports = expressService;