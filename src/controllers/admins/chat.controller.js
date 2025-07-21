const ChatRoom = require("../../mongo-model/ChatRoom");
const { ROLE_PERMISSION_CHAT_WITH_DRIVER, ROLE_PERMISSION_CHAT_WITH_PARENT } = require("../../utils/constants/admin-permissions");
const { BadRequestError, NotFoundError } = require("../../utils/errors");

const chatController = {
  // TODO: I MUST BE ABLE TO GET CHAT ROOMS WITHOUT BEING A PARTICIPANT!
  getChatRooms: async (req, res, next) => {
    try {
      const { rideGroupId } = req.params;
      const userId = req.userId;

      if (!rideGroupId) {
        throw new BadRequestError("Ride group ID is required");
      }

      const chatRooms = await ChatRoom.find({ ride_group_id: rideGroupId, participants: { $elemMatch: { user_id: userId } } });

      return res.success("Chat rooms retrieved successfully", chatRooms);
    } catch (error) {
      console.error("Error getting chat rooms:", error);
      return next(error);
    }
  },
  getCustomerServiceRooms: async (req, res, next) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const { permissions } = req.account.admin.role;

      const userTypes = permissions.map(p => p.role_permission_name === ROLE_PERMISSION_CHAT_WITH_DRIVER ? "driver" : "parent");
    
      const chatRooms = await ChatRoom.find({
        participants: { $elemMatch: { user_type: { $in: userTypes } } },
        room_type: "customer_support",
      })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
  
      if (!chatRooms || chatRooms.length === 0) {
        throw new NotFoundError("No customer service chat rooms found");
      }

      // Get parents and last message for each chat room
      const chatRoomsWithDetails = await Promise.all(chatRooms.map(async (room) => {
        const lastMessage = await room.getLastMessage();
        const participantProfilePic = await room.getParticipantsProfilePictures();
        return {
          ...room.toObject(),
          last_message: lastMessage ? lastMessage.toObject() : null,
          participantsProfilePic: participantProfilePic,
        };
      }));

      return res.success("Customer service rooms retrieved successfully", {
        chatRoomsWithDetails
      });
    } catch (error) {
      console.error("Error getting customer service room:", error);
      return next(error);
    }
  }
};

module.exports = chatController;
