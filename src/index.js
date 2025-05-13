import dotenv from "dotenv";
import expressService from "./services/express.service.js";
import sequelizeService from "./services/sequelize.service.js";
import awsService from "./services/aws.service.js";
import emailService from "./services/email.service.js";
dotenv.config();

const services = [expressService, awsService, sequelizeService, emailService];

(async () => {
  try {
    for (const service of services) {
      await service.init();
    }
    // Import logging service after initialization to avoid circular dependencies
    const loggingService = require("./services/logging.service");
    const logger = loggingService.getLogger();
    logger.info("Server initialized successfully");
    //PUT ADDITIONAL CODE HERE...
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
})();
