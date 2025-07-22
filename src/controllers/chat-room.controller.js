const { sendNotificationTo } = require("../utils/generators/notification");
const {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} = require("../utils/errors/types/Api.error");
const {
  getIo,
  NOTIFICATION_TYPES,
} = require("../services/socketio.service");
const logger = require("../services/logging.service").getLogger();
const { upload, getFileType } = require("../services/file-upload.service");
const redisService = require("../services/redis.service");
const { ChatMessage, messageTypes } = require("../mongo-model/ChatMessage");
const ChatRoom = require("../mongo-model/ChatRoom");
const Notification = require("../mongo-model/Notification");
const AccountRepository = require("../data-access/accounts");
const ParentRepository = require("../data-access/parent");
const RideGroupRepository = require("../data-access/rideGroup");
const ParentGroupRepository = require("../data-access/parentGroup");
const DriverRepository = require("../data-access/driver");
const { createPagination } = require("../utils/responseHandler");

const chatController = {
  getCustomerSupportMessages: async (req, res, next) => {
    try {
      const { userId, accountType } = req;
      const { page = 1 } = req.query;

      // validate chatRoomId
      const chatRoom = await ChatRoom.findOne({
        room_type: "customer_support",
        participants: {
          $elemMatch: {
            user_id: userId,
            user_type: accountType
          }
        }
      });

      if (!chatRoom) {
        throw new NotFoundError("Chat room not found");
      }

      const messages = await chatRoom.getMessagesPage(chatRoom._id, page);

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
  },
  createCustomerServiceRoom: async (req, res, next) => {
    try {
      const userId = req.userId;
    
      let chatRoom = await ChatRoom.findOne({
        participants: { $elemMatch: { user_id: userId } },
        room_type: "customer_support",
      });
  
      if (!chatRoom) {
        const name = req.account[req.account.account_type].name;
  
        if (!name) {
          throw new BadRequestError("User name is required to create a customer support chat room!");
        }

        // Create a new customer service chat room
        chatRoom = new ChatRoom({
          name: `Customer Support - ${name}`,
          room_type: "customer_support",
          participants: [
            {
              user_id: userId,
              user_type: req.account.account_type,
              name,
            },
          ],
        });

        await chatRoom.save();
      }

      return res.success("Customer service chat room created successfully", chatRoom);
    } catch (error) {
      logger.error("Error creating customer service chat room:", error.message);
      next(error);
    }
  },

  getChatRoom: async (req, res, next) => {
    try {
      const { rideGroupId } = req.params;
      const userId = req.userId;
      const account = await AccountRepository.findById(req.userId);
      const rideGroup = await RideGroupRepository.findIfAccountIdInsideGroup(rideGroupId, req.userId, req.accountType);

      if (!account) {
        throw new NotFoundError("Account not found");
      }

      
      if (!account.is_verified) {
        throw new ForbiddenError(
          "Account email must be verified before creating a profile"
        );
      }
      if (!rideGroup) {
        throw new NotFoundError("Ride group not found");
      }

      let name;
      if (account.account_type === "parent") {
        const parent = await ParentRepository.findByAccountId(req.userId);
        name = parent.name;
      } else if (account.account_type === "driver") {
        const driver = await DriverRepository.findByAccountId(req.userId);
        name = driver.name;
      }
      const userType = account.account_type;

      let chatRoom = await ChatRoom.findOne({
        ride_group_id: rideGroupId,
      }).populate("last_message");

      if (!chatRoom) {
        chatRoom = new ChatRoom({
          ride_group_id: rideGroupId,
          name: `Chat Room for ${rideGroup.group_name}`,
          room_type: "ride_group",
          participants: [
            {
              user_id: userId,
              user_type: userType,
              name: name,
            },
          ],
        });
        await chatRoom.save();
      } else if (
        !chatRoom.participants.some(
          (p) => p.user_id === userId && p.user_type === userType
        )
      ) {
        chatRoom.addParticipant(userId, userType, name);
        await chatRoom.save();
      }

      return res.success("Chat Retured successfully", chatRoom);
    } catch (error) {
      logger.error("Error getting chat room:", error.message);
      next(error);
    }
  },
  getChatMessages: async (req, res, next) => {
    try {
      const { rideGroupId } = req.params;
      const { page = 1 } = req.query;
      const account = await AccountRepository.findById(req.userId);
      const rideGroup = await RideGroupRepository.findIfAccountIdInsideGroup(rideGroupId, req.userId, req.accountType);

      if (!account) {
        throw new NotFoundError("Account not found");
      }

      if (!account.is_verified) {
        throw new ForbiddenError(
          "Account email must be verified before creating a profile"
        );
      }

      if (!rideGroup) {
        throw new NotFoundError("Ride group not found");
      }

      const chatRoom = await ChatRoom.findOne({ ride_group_id: rideGroupId });
      if (!chatRoom) {
        throw new NotFoundError("Chat room not found");
      }
      const messages = await chatRoom.getMessagesPage(chatRoom._id, page);

      if (!messages) {
        throw new NotFoundError("No messages found in this chat room");
      }

      const pagination = createPagination(Number(page), 10, messages.length);

      return res.success(
        "Chat Messages Retured Successfully", {
          pagination,
          messages
        }
      );
    } catch (error) {
      logger.error(`Error fetching messages: ${error.message}`);
      next(error);
    }
  },
  uploadFile: async (req, res, next) => {
    try {
      if (!req.file) {
        throw new BadRequestError("No file uploaded.");
      } // Call upload.processFile to get the enhanced details from Cloudinary

      const uploadedFileDetails = await upload.processFile(req.file); // Use the destructured getFileType function

      const fileType = getFileType(uploadedFileDetails.mimetype);
      const mediaUrl = uploadedFileDetails.url; // This is the Cloudinary URL

      return res.success({
        media_url: mediaUrl,
        type: fileType,
        meta: {
          size: uploadedFileDetails.size,
          mime_type: uploadedFileDetails.mimetype,
          ...(fileType === "image" || fileType === "video"
            ? {
                width: uploadedFileDetails.width,
                height: uploadedFileDetails.height,
              }
            : {}),
          ...(fileType === "video" || fileType === "audio"
            ? {
                duration: uploadedFileDetails.duration,
              }
            : {}),
          public_id: uploadedFileDetails.filename, // Useful for Cloudinary management (e.g., deletion)
        },
      });
    } catch (error) {
      logger.error("File upload failed:", error.message);
      next(error);
    }
  },
  asssginMediaMeta: (req, res, next) => {
    if (req.file) {
      req.body.media_url = req.file.path; // Store the Cloudinary URL in req.body
      req.body.type = getFileType(req.file.mimetype); // Determine file type based on MIME type
    } else {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded." });
    }
    next(); // Pass control to the next middleware (your final response)
  },

  createMessage: async (req, res, next) => {
    try {
      const { chatRoomId } = req.params;
      const { type, message, media_url, media_meta, location, reply_to } =
        req.body;
      const userId = req.userId; // From authMiddleware
      const account = await AccountRepository.findById(req.userId);

      if (!account) {
        throw new NotFoundError("Account not found");
      }

      if (!account.is_verified) {
        throw new ForbiddenError(
          "Account email must be verified before creating a profile"
        );
      }
      let name;
      if (account.account_type === "parent") {
        const parent = await ParentRepository.findByAccountId(req.userId);
        name = parent.name;
      } else if (account.account_type === "driver") {
        const driver = await DriverRepository.findByAccountId(req.userId);
        name = driver.name;
      }
      const userType = account.account_type;

      // 1. Validate Chat Room Existence
      const chatRoom = await ChatRoom.findById(chatRoomId);
      if (!chatRoom) {
        throw new NotFoundError("Chat room not found.");
      }

      // 2. Validate Participant in Chat Room (Optional but good practice)
      if (req.accountType !== "admin" || !req.admin.allowedToChatRoom || req.admin.allowedToChatRoom.chatRoomId !== chatRoomId) {
        const isParticipant = chatRoom.participants.some(
          (p) => p.user_id === userId && p.user_type === userType
        );
        if (!isParticipant) {
          throw new ForbiddenError(
            "You are not a participant of this chat room."
          );
        }
      }

      // 3. Construct Message Object based on type
      let newMessageData = {
        chat_room_id: chatRoomId,
        sender_id: userId,
        sender_type: userType,
        type: type || messageTypes.TEXT, // Default to text if type not provided
      };

      // Explicitly set content fields to undefined initially to prevent Mongoose defaults for irrelevant types
      // This is crucial for preventing the geo key error when 'location' is not intended for the message type.
      newMessageData.message = undefined;
      newMessageData.media_url = undefined;
      newMessageData.media_meta = undefined;
      // newMessageData.location = undefined;

      switch (newMessageData.type) {
        case messageTypes.TEXT:
          if (!message || message.trim() === "") {
            throw new BadRequestError("Text message content is required.");
          }
          newMessageData.message = message.trim();
          break;
        case messageTypes.IMAGE:
        case messageTypes.VIDEO:
        case messageTypes.AUDIO:
        case messageTypes.DOCUMENT:
          if (!media_url) {
            throw new BadRequestError(`${type} message requires a media_url.`);
          }
          newMessageData.media_url = media_url;
          newMessageData.media_meta = media_meta; // Expect media_meta to be provided by client/upload service
          break;
        // case messageTypes.LOCATION:
        //   if (
        //     !location ||
        //     !location.coordinates ||
        //     !Array.isArray(location.coordinates) ||
        //     location.coordinates.length !== 2
        //   ) {
        //     throw new BadRequestError(
        //       "Location message requires valid coordinates [longitude, latitude]."
        //     );
        //   }
        //   // Validate coordinates are numbers
        //   if (
        //     typeof location.coordinates[0] !== "number" ||
        //     typeof location.coordinates[1] !== "number"
        //   ) {
        //     throw new BadRequestError("Coordinates must be numbers.");
        //   }
        //   newMessageData.location = {
        //     type: "Point",
        //     coordinates: [
        //       parseFloat(location.coordinates[0]),
        //       parseFloat(location.coordinates[1]),
        //     ],
        //     name: location.name || undefined,
        //   };
        //   break;
        default:
          throw new BadRequestError("Invalid message type provided.");
      }

      // Handle reply_to if provided
      if (reply_to) {
        const repliedMessage = await ChatMessage.findById(reply_to);
        if (!repliedMessage) {
          logger.warn(
            `Attempted to reply to a non-existent message: ${reply_to}`
          );
          // Optionally, throw an error or just proceed without reply_to
        } else {
          newMessageData.reply_to = reply_to;
        }
      }

      // 4. Create and Save Message
      const newMessage = new ChatMessage(newMessageData);
      await newMessage.save();

      // 5. Update Chat Room's last_message
      chatRoom.last_message = newMessage._id;
      await chatRoom.save();

      // 6. Populate sender details for the response and socket emission
      const populatedMessage = await ChatMessage.findById(newMessage._id)
        .populate({
          path: "reply_to",
          select: "message type media_url sender_id sender_type", // Only select necessary fields for reply
        })
        .lean(); // Use .lean() for faster query results if not modifying further

      // Add sender name for socket emission
      let senderName;
      if (userType === "parent") {
        const parent = await ParentRepository.findByAccountId(userId);
        senderName = parent ? parent.name : "Parent";
      } else if (userType === "driver") {
        const driver = await DriverRepository.findByAccountId(userId);
        senderName = driver ? driver.name : "Driver";
      }
      // Assuming 'admin' or other types are handled if they exist
      populatedMessage.sender_name = senderName;

      // 7. Emit Message via Socket.io
      // Emit to the specific chat room
      getIo().to(chatRoomId.toString()).emit("new_message", populatedMessage);


      // 8. Emit notifications to all users on a group
      if (chatRoom.participants) {
        const accountIds = chatRoom.participants.map(participant => participant.user_id);

        sendNotificationTo({
          accountIds,
          type: "chat_message",
          title: `New message from group: ${chatRoom.name}`,
          message: message,
          metadata: {
            chat_room_id: chatRoomId,
            sender_id: userId,
          }
        });
      }

      return res.success("Message created successfully", populatedMessage);
    } catch (error) {
      logger.error(`Error creating message: ${error.message}`);
      next(error);
    }
  },
  deleteMessage: async (req, res, next) => {
    try {
      const userId = req.userId; // From authMiddleware
      const account = await AccountRepository.findById(req.userId);

      if (!account) {
        throw new NotFoundError("Account not found");
      }

      if (!account.is_verified) {
        throw new ForbiddenError(
          "Account email must be verified before creating a profile"
        );
      }
      let name;
      if (account.account_type === "parent") {
        const parent = await ParentRepository.findByAccountId(req.userId);
        name = parent.name;
      } else if (account.account_type === "driver") {
        const driver = await DriverRepository.findByAccountId(req.userId);
        name = driver.name;
      }
      const userType = account.account_type;

      const message = await ChatMessage.findOneAndUpdate(
        {
          _id: req.params.messageId,
          sender_id: req.userId,
          sender_type: userType,
        },
        {
          is_deleted: true,
          deleted_at: new Date(),
        },
        { new: true }
      );

      if (!message) {
        throw new NotFoundError("Message not found or you are not the sender");
      } // Notify room about deleted message

      getIo().to(message.chat_room_id.toString()).emit("message_deleted", {
        message_id: message._id,
        chat_room_id: message.chat_room_id,
      });

      return res.success("Message deleted successfully");
    } catch (error) {
      logger.error("Error deleting message:", error.message);
      next(error);
    }
  },
  getNotifications: async (req, res, next) => {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const notifications = await Notification.find({
        recipient_id: req.userId,
      })
        .sort({ created_at: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit));

      return res.success("Notifications Returned Successfully", notifications);
    } catch (error) {
      logger.error("Error fetching notifications:", error.message);
      next(error);
    }
  },
  markNotificationsRead: async (req, res, next) => {
    try {
      const { notificationIds } = req.body;

      await Notification.updateMany(
        {
          _id: { $in: notificationIds },
          recipient_id: req.userId,
        },
        { is_read: true }
      ); // Emit event to update client-side

      getIo().to(`user_${req.userId}`).emit("notifications_read", {
        notificationIds,
      });

      return res.success({ success: true });
    } catch (error) {
      logger.error("Error marking notifications as read:", error.message);
      next(error);
    }
  },
  // getNotifications: async (req, res, next) => {
  //   try {
  //     const { limit = 20, offset = 0, is_read } = req.query;
  //     const query = { recipient_id: req.user.id };

  //     if (is_read !== undefined) {
  //       query.is_read = is_read === "true";
  //     }

  //     const notifications = await Notification.find(query)
  //       .sort({ created_at: -1 })
  //       .skip(parseInt(offset))
  //       .limit(parseInt(limit));

  //     return res.success("Notifications fetched successfully", notifications);
  //   } catch (error) {
  //     logger.error("Error fetching notifications:", error.message);
  //     next(error);
  //   }
  // },

  /**
   * Mark a notification as read
   */
  markAsRead: async (req, res, next) => {
    try {
      const notification = await Notification.findOneAndUpdate(
        {
          _id: req.params.id,
          recipient_id: req.userId,
        },
        { is_read: true },
        { new: true }
      );

      if (!notification) {
        return res.notFound("Notification not found");
      }

      // Emit real-time update to the client
      getIo().to(`user_${req.userId}`).emit("notification_read", {
        notificationId: notification._id,
        is_read: true,
      });

      return res.success("Notification marked as read", notification);
    } catch (error) {
      logger.error("Error marking notification as read:", error.message);
      next(error);
    }
  },

  /**
   * Mark multiple notifications as read
   */
  markAllAsRead: async (req, res, next) => {
    try {
      const result = await Notification.updateMany(
        {
          recipient_id: req.userId,
          is_read: false,
        },
        { is_read: true }
      );

      // Emit real-time update to the client
      getIo().to(`user_${req.userId}`).emit("all_notifications_read");

      return res.success(
        `Marked ${result.modifiedCount} notifications as read`
      );
    } catch (error) {
      logger.error("Error marking notifications as read:", error.message);
      next(error);
    }
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (req, res, next) => {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        recipient_id: req.userId,
      });

      if (!notification) {
        throw new NotFoundError("Notification not found");
      }

      // Emit real-time update to the client
      getIo().to(`user_${req.user.id}`).emit("notification_deleted", {
        notificationId: notification._id,
      });

      return res.success("Notification deleted successfully");
    } catch (error) {
      logger.error("Error deleting notification:", error.message);
      next(error);
    }
  },

  /**
   * Create a notification (for internal use)
   */
  createNotification: async (req, res, next) => {
    try {
      const {
        recipientId,
        senderId,
        type,
        title,
        message,
        relatedEntityType,
        relatedEntityId,
        metadata,
      } = req.body;
      if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
        throw new BadRequestError("Invalid notification type");
      }

      const notification = new Notification({
        recipient_id: recipientId,
        sender_id: senderId,
        type,
        title,
        message,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
        metadata,
        is_read: false,
      });

      await notification.save();

      // Send real-time notification if recipient is online
      try {
        const io = getIo();
        const recipientConnection = await redisService.getUserConnection(recipientId);
        if (recipientConnection && recipientConnection.socketId) {
          io.to(recipientConnection.socketId).emit("new_notification", notification);
          logger.info(`[Chat] Notification sent to user ${recipientId} via socket ${recipientConnection.socketId}`);
        } else {
          logger.info(`[Chat] User ${recipientId} not connected - notification saved for later delivery`);
        }
      } catch (socketError) {
        logger.error(`[Chat] Error sending real-time notification: ${socketError.message}`);
        // Notification is still saved in database even if real-time delivery fails
      }

      return res.success("Notification created successfully", notification);
    } catch (error) {
      logger.error("Error creating notification:", error.message);
      next(error);
    }
  },

  /**
   * Get unread notifications count
   */
  getUnreadCount: async (req, res, next) => {
    try {
      const count = await Notification.countDocuments({
        recipient_id: req.userId,
        is_read: false,
      });

      return res.success("Unread count fetched", { count });
    } catch (error) {
      logger.error("Error fetching unread count:", error.message);
      next(error);
    }
  },

  sendTestNotification: async (req, res, next) => {
    try {
      const { type, title, message, related_entity_type, related_entity_id, metadata } = req.body;
            
      
      sendNotificationTo({
        accountIds: [req.userId],
        type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        metadata
      });

      return res.success("Test notification sent successfully", {
        type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        metadata,
      });

    } catch (error) {
      logger.error("Test notification error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  // TODO: FIX
  getNotificationsPaginated: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, readOnly = false } = req.body;

      const notifications = await Notification.find({
        accountId: req.userId,
        isRead: readOnly ? true : { $ne: true }
      })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

      // Update read status for unread notifications if readOnly is false
      if (!readOnly) {
        Notification.updateMany(
          {
        accountId: req.userId,
        isRead: false
          },
          { isRead: true }
        );
      }

      const pagination = createPagination(page, limit, notifications.length);

      return res.success("Notifications fetched", {
        pagination,
        notifications
      });

    } catch (error) {
      logger.error("Error getting notifications ", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  }
};

module.exports = chatController;
