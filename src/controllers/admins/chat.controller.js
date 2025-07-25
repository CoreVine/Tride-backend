const ChatRoom = require("../../mongo-model/ChatRoom");
const { ROLE_PERMISSION_CHAT_WITH_DRIVER, ROLE_PERMISSION_CHAT_WITH_PARENT } = require("../../utils/constants/admin-permissions");
const { BadRequestError, NotFoundError } = require("../../utils/errors");
const { createPagination } = require("../../utils/responseHandler");
const AccountRepository = require("../../data-access/accounts");

const chatController = {
  getChatRooms: async (req, res, next) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      // Fetch chat rooms based on user type
      const chatRooms = await ChatRoom.find({
        room_type: "ride_group",
      })
      .sort({ updated_at: -1, created_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

      return res.success("Chat rooms retrieved successfully", {data: chatRooms});
    } catch (error) {
      console.error("Error getting chat rooms:", error);
      return next(error);
    }
  },
  getChatRoomMessages: async (req, res, next) => {
    try {
      const { rideGroupId } = req.params;
      const { page = 1 } = req.query;

      // Fetch chat room for the ride group
      const chatRoom = await ChatRoom.findOne({
        _id: rideGroupId,
        room_type: "ride_group"
      });

      if (!chatRoom) {
        throw new NotFoundError("Chat room not found for this ride group");
      }

      const messages = await chatRoom.getMessagesPage(chatRoom._id, page);

/*       if (!messages || messages.length === 0) {
        throw new NotFoundError("No messages found in this chat room");
      } */

      const pagination = createPagination(Number(page), 10, messages.length);

      return res.success("Messages retrieved successfully", {
        pagination,
        data: messages,
      });
    } catch (error) {
      console.error("Error getting chat room messages:", error);
      return next(error);
    }
  },
  getCustomerServiceRooms: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, account_type, name, email } = req.query;
      const { permissions } = req.account.admin.role;

      let userTypes = permissions.map(p => p.role_permission_name === ROLE_PERMISSION_CHAT_WITH_DRIVER ? "driver" : "parent");

      // filter user types based on account_type query parameter
      if (account_type && account_type !== "all") {
        userTypes = userTypes.filter(type => type === account_type);
      }

      // validate after filtering if userTypes is empty
      if (userTypes.length === 0) {
        throw new BadRequestError("No valid user types found for the provided permissions");
      }

      // get all accountIds based on q_type and q_value
      const accountIds = await AccountRepository.filterAccountIdsByQuery({
        name,
        email
      }, userTypes);

      const participantsFilter = { user_type: { $in: userTypes } };
      if (name) {
        participantsFilter.name = { $regex: name, $options: "i" };
      }
      if (accountIds && accountIds.length > 0) {
        participantsFilter.account_id = { $in: accountIds };
      }

      const chatRooms = await ChatRoom.find({
        participants: { $elemMatch: participantsFilter },
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
        data: chatRoomsWithDetails
      });
    } catch (error) {
      console.error("Error getting customer service room:", error);
      return next(error);
    }
  },
  getChatById: async (req, res, next) => {
    try {
      const { chatId } = req.params;

      // Validate chatId
      if (!chatId) {
        throw new BadRequestError("Chat ID is required");
      }

      // Fetch chat room by ID
      const chatRoom = await ChatRoom.findById(chatId).populate('last_message');
      if (!chatRoom) {
        throw new NotFoundError("Chat room not found");
      }

      return res.success("Chat retrieved successfully", chatRoom);
    } catch (error) {
      console.error("Error getting chat by ID:", error);
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
        data: messages,
      });
    } catch (error) {
      console.error("Error getting latest messages for customer service room:", error);
      return next(error);
    }
  }
};

module.exports = chatController;
