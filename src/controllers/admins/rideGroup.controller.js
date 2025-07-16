const RideGroupRepository = require("../../data-access/rideGroup");

const rideGroupController = {
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
