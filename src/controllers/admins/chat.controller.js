const ChatRoom = require("../../mongo-model/ChatRoom");
const { ROLE_PERMISSION_CHAT_WITH_DRIVER, ROLE_PERMISSION_CHAT_WITH_PARENT } = require("../../utils/constants/admin-permissions");
const { BadRequestError, NotFoundError } = require("../../utils/errors");
const { createPagination } = require("../../utils/responseHandler");

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

      const pagination = createPagination(Number(page), Number(limit), chatRooms.length);

      return res.success("Customer service rooms retrieved successfully", {
        pagination,
        chatRoomsWithDetails
      });
    } catch (error) {
      console.error("Error getting customer service room:", error);
      return next(error);
    }
  },

  getLatestMessagesCustomerServiceRoom: async (req, res, next) => {
    try {
      const { chatRoomId } = req.params;
      const { page = 1 } = req.query;
      const { permissions } = req.account.admin.role;

      const userTypes = permissions.map(p => p.role_permission_name === ROLE_PERMISSION_CHAT_WITH_DRIVER ? "driver" : "parent");

      // validate chatRoomId
      const chatRoom = await ChatRoom.findOne({
        _id: chatRoomId,
        room_type: "customer_support",
        participants: {
          $elemMatch: {
            user_type: { $in: userTypes }
          }
        }
      });

      if (!chatRoom) {
        throw new NotFoundError("Chat room not found");
      }

      const messages = await chatRoom.getMessagesPage(chatRoomId, page);

      if (!messages || messages.length === 0) {
        throw new NotFoundError("No messages found in this chat room");
      }

      const pagination = createPagination(Number(page), 10, messages.length);

      return res.success("Messages retrieved successfully", {
        pagination,
        messages,
      });
    } catch (error) {
      console.error("Error getting latest messages for customer service room:", error);
      return next(error);
    }
  }
};

module.exports = chatController;
