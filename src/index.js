const expressService = require("./services/express.service");
const sequelizeService = require("./services/sequelize.service");
const awsService = require("./services/aws.service");
const emailService = require("./services/email.service");
const redisService = require("./services/redis.service");
require("dotenv").config();

const services = [
  expressService,
  awsService,
  sequelizeService,
  emailService,
  redisService,
];

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
