const { BadRequestError, NotFoundError } = require("../../utils/errors");

const PlanRepository = require("../../data-access/plan");
const loggingService = require('../../services/logging.service');

const logger = loggingService.getLogger()

const adminPlanController = {
  getPlans: async (_, res, next) => {
    try {
      const plans = await PlanRepository.findAll()
      return res.success("Plans fetched successfully", plans);
    } catch (error) {
      logger.error("Get plans error:", error);
      return next(error);
    }
  }
};

module.exports = adminPlanController;
