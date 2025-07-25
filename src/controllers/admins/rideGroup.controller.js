const RideGroupRepository = require("../../data-access/rideGroup");
const ChatRoom = require("../../mongo-model/ChatRoom");
const { BadRequestError } = require("../../utils/errors");
const { createPagination } = require("../../utils/responseHandler");
const logger = require("../../services/logging.service").getLogger();

const rideGroupController = {
    getRideGroups: async (req, res, next) => {
        try {
          const { page = 1, limit = 10, name, seats, type } = req.query;
            const { count, rows: rideGroups } = await RideGroupRepository.findAllDetailedPaginated(
            parseInt(page, 10) || 1,
            parseInt(limit, 10) || 10,
            { name, seats: parseInt(seats, 10) || 0, type }
            );
    
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

    getRideGroupDetails: async (req, res, next) => {
        try {
            const { rideGroupId } = req.params;
            const rideGroup = await RideGroupRepository.findByIdDetailed(rideGroupId);

            if (!rideGroup) {
                return res.error("Ride group not found", 404);
            }

            return res.success("Ride group details fetched successfully", { rideGroup });
        } catch (error) {
            logger.error("Error fetching ride group details", {
                error: error.message,
                stack: error.stack,
            });
            return next(error);
        }
    },

    mergeRideGroups: async (req, res, next) => {
        try {
            const { group_src, group_dest } = req.body;

            // Validate that both groups exist and are not the same
            if (group_src === group_dest) {
              throw new BadRequestError("Source and destination groups cannot be the same");
            }

            // Call the service to merge ride groups
            const { participants, groupName } = await RideGroupRepository.mergeRideGroups(group_src, group_dest);

            // remove the ride group chat room for the source group
            await ChatRoom.deleteMany({ ride_group_id: group_src, room_type: "ride_group" });

            const chatRoom = await ChatRoom.findOne({
                ride_group_id: group_dest,
                room_type: "ride_group"
            });

            if (!chatRoom) {
              await ChatRoom.create({
                ride_group_id: group_dest,
                room_type: "ride_group",
                name: groupName,
                participants
              });
            } else {
              // add new participants to the existing chat room
              for (const participant of participants) {
                await chatRoom.addParticipant(participant.user_id, participant.user_type, participant.name);
              }
            }

            return res.success("Ride groups merged successfully.");
        } catch (error) {
            console.error("Error merging ride groups:", error);
            return next(error);
        }
    }
};

module.exports = rideGroupController;
