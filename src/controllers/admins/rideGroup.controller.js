const RideGroupRepository = require("../../data-access/rideGroup");
const { createPagination } = require("../../utils/responseHandler");
const logger = require("../../services/logging.service").getLogger();

const rideGroupController = {
    getRideGroups: async (req, res, next) => {
        try {
          const { page = 1, limit = 10 } = req.query;
          const { count, rows: rideGroups } = await RideGroupRepository.findAllDetailedPaginated(parseInt(page), parseInt(limit));
    
          if (!rideGroups || rideGroups.length === 0) {
            return res.success("No ride groups found for this parent", { rideGroups: [] });
          }
          
          const pagination = createPagination(page, limit, count);
    
          return res.success("Ride groups fetched successfully", { pagination, rideGroups });
        } catch (error) {
          logger.error("Error fetching ride groups", {
            error: error.message,
            stack: error.stack,
          });
          return next(error);
        }
    },

    mergeRideGroups: async (req, res) => {
        try {
            const { group_src, group_dest } = req.body;

            // Validate that both groups exist and are not the same
            if (group_src === group_dest) {
                return res.status(400).json({ error: "Source and destination groups cannot be the same." });
            }

            // Call the service to merge ride groups
            await RideGroupRepository.mergeRideGroups(group_src, group_dest);

            return res.success("Ride groups merged successfully.");
        } catch (error) {
            console.error("Error merging ride groups:", error);
            return res.status(500).json({ error: "An error occurred while merging ride groups." });
        }
    }
};

module.exports = rideGroupController;
