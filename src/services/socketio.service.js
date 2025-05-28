// services/socketio.service.js

const http = require("http");
const { Server } = require("socket.io");
const loggingService = require("./logging.service");
const logger = loggingService.getLogger();

// Import your necessary models and services
const JwtService = require("./jwt.service");
const AccountRepository = require("../data-access/accounts");
const Parent = require("../models/Parent");
const Driver = require("../models/Driver");
const ChatRoom = require("../models/ChatRoom");
const ChatMessage = require("../models/ChatMessage");
const Notification = require("../models/Notification"); // New Notification model

let _io;
let _httpServer;
const userSocketMap = new Map(); // Track connected users and their sockets

// Notification types
const NOTIFICATION_TYPES = {
  MESSAGE: "new_message",
  RIDE_UPDATE: "ride_update",
  SYSTEM: "system_notification",
};

const init = async (expressApp) => {
  if (_io) {
    logger.warn("Socket.IO service already initialized.");
    return _io;
  }

  _httpServer = http.createServer(expressApp);

  _io = new Server(_httpServer, {
    cors: {
      origin: [process.env.FRONTEND_URL || "*", "null"],
      methods: ["GET", "POST"],
    },
  });

  logger.info("Socket.IO initialized.");

  // --- Socket.IO Authentication Middleware ---
  _io.use(async (socket, next) => {
    console.log("Socket.IO Auth Middleware triggered", socket.handshake);
    console.log("Socket.IO Auth Middleware Auth", socket.handshake.query.token);
    let token;
    try {
      token = socket.handshake.query.token;
      if (!token) {
        logger.warn("Socket.IO Auth: No authentication token provided.");
        return next(new Error("Authentication error: No token provided"));
      }
      token = token.startsWith("Bearer ") ? token.slice(7) : token;
      const decoded = await JwtService.jwtVerify(token);
      socket.userId = decoded.id;

      const account = await AccountRepository.findById(socket.userId);
      if (!account) {
        logger.warn(
          `Socket.IO Auth: Account not found for user ID: ${socket.userId}`
        );
        return next(new Error("Authentication error: Account not found"));
      }
      socket.accountType = account.account_type;

      logger.info(
        `Socket.IO: User ${socket.userId} (${socket.accountType}) connected with socket ID: ${socket.id}`
      );
      next();
    } catch (error) {
      logger.error("Socket.IO Auth failed:", error.message);
      next(new Error("Authentication error: Invalid token or account"));
    }
  });

  // --- Socket.IO Event Handlers ---
  _io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}, User ID: ${socket.userId}`);

    // Track the user's socket connection
    userSocketMap.set(socket.userId, socket.id);

    // Send pending notifications when user connects
    sendPendingNotifications(socket.userId);

    // Join a specific chat room for a ride group
    socket.on("join_ride_group_chat", async (rideGroupId) => {
      try {
        if (!rideGroupId) {
          throw new Error("rideGroupId is required to join a chat.");
        }

        let chatRoom = await ChatRoom.findOne({ ride_group_id: rideGroupId });
        if (!chatRoom) {
          chatRoom = new ChatRoom({ ride_group_id: rideGroupId });
          await chatRoom.save();
          logger.info(
            `Created new chat room for ride group ${rideGroupId}: ${chatRoom._id}`
          );
        }

        socket.chatRoomId = chatRoom._id.toString();
        socket.rideGroupId = rideGroupId;

        socket.join(socket.chatRoomId);
        logger.info(
          `User ${socket.userId} joined room: ${socket.chatRoomId} (Ride Group: ${rideGroupId})`
        );

        const messages = await ChatMessage.find({ chat_room_id: chatRoom._id })
          .sort({ created_at: 1 })
          .limit(50);

        const messagesWithSenderNames = await Promise.all(
          messages.map(async (msg) => {
            let senderName = "Unknown User";
            if (msg.sender_type === "parent") {
              const parent = await Parent.findByPk(msg.sender_id, {
                attributes: ["name"],
              });
              senderName = parent ? parent.name : "Parent";
            } else if (msg.sender_type === "driver") {
              const driver = await Driver.findByPk(msg.sender_id, {
                attributes: ["name"],
              });
              senderName = driver ? driver.name : "Driver";
            }
            return {
              id: msg._id,
              senderId: msg.sender_id,
              senderType: msg.sender_type,
              senderName: senderName,
              message: msg.message,
              createdAt: msg.created_at,
            };
          })
        );

        socket.emit("chat_history", messagesWithSenderNames);
      } catch (error) {
        logger.error(
          `Error joining chat room for ride group ${rideGroupId}:`,
          error.message
        );
        socket.emit("chat_error", `Failed to join chat room: ${error.message}`);
      }
    });

    // Handle incoming messages
    socket.on("send_message", async (data) => {
      const { message } = data;
      const { userId, accountType, chatRoomId, rideGroupId } = socket;

      if (!chatRoomId || !userId || !message) {
        return socket.emit(
          "chat_error",
          "Cannot send message: not in a room, or missing user/message."
        );
      }

      try {
        const newChatMessage = new ChatMessage({
          chat_room_id: chatRoomId,
          sender_id: userId,
          sender_type: accountType,
          message: message,
        });
        await newChatMessage.save();
        logger.info(`User ${userId} sent message to room ${chatRoomId}`);

        let senderName = "Unknown User";
        if (accountType === "parent") {
          const parent = await Parent.findByPk(userId, {
            attributes: ["name"],
          });
          senderName = parent ? parent.name : "Parent";
        } else if (accountType === "driver") {
          const driver = await Driver.findByPk(userId, {
            attributes: ["name"],
          });
          senderName = driver ? driver.name : "Driver";
        }

        const messageToBroadcast = {
          id: newChatMessage._id,
          senderId: userId,
          senderType: accountType,
          senderName: senderName,
          message: newChatMessage.message,
          createdAt: newChatMessage.created_at,
        };

        _io.to(chatRoomId).emit("receive_message", messageToBroadcast);

        // Create notification for all other users in the chat room
        await createNotificationForChatMessage(
          userId,
          chatRoomId,
          rideGroupId,
          messageToBroadcast
        );
      } catch (error) {
        logger.error(
          `Error sending message in room ${chatRoomId}:`,
          error.message
        );
        socket.emit("chat_error", `Failed to send message: ${error.message}`);
      }
    });

    // Notification event handlers
    socket.on("mark_notification_as_read", async (notificationId) => {
      try {
        await Notification.findByIdAndUpdate(notificationId, { is_read: true });
        logger.info(`Notification ${notificationId} marked as read`);
      } catch (error) {
        logger.error(`Error marking notification as read: ${error.message}`);
      }
    });

    socket.on("disconnect", () => {
      logger.info(
        `Socket disconnected: ${socket.id}, User ID: ${socket.userId}`
      );
      userSocketMap.delete(socket.userId);
    });
  });

  return _io;
};

// Notification-related functions

/**
 * Create a notification for a new chat message
 */
const createNotificationForChatMessage = async (
  senderId,
  chatRoomId,
  rideGroupId,
  message
) => {
  try {
    // Get all users in the chat room except the sender
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      logger.error(`Chat room ${chatRoomId} not found`);
      return;
    }

    // In a real app, you would have a way to determine who should receive notifications
    // For this example, we'll assume we need to notify all participants in the ride group

    // Create notifications for each recipient
    const notification = new Notification({
      recipient_id: message.senderId, // In practice, this would be the other users
      sender_id: senderId,
      type: NOTIFICATION_TYPES.MESSAGE,
      title: "New Message",
      message: `You have a new message from ${message.senderName}`,
      related_entity_type: "chat",
      related_entity_id: chatRoomId,
      is_read: false,
      metadata: {
        ride_group_id: rideGroupId,
        chat_room_id: chatRoomId,
        sender_name: message.senderName,
      },
    });

    await notification.save();

    // Send real-time notification if recipient is online
    const recipientSocketId = userSocketMap.get(notification.recipient_id);
    if (recipientSocketId) {
      _io.to(recipientSocketId).emit("new_notification", notification);
    }
  } catch (error) {
    logger.error(`Error creating chat message notification: ${error.message}`);
  }
};

/**
 * Send pending notifications to a user when they connect
 */
const sendPendingNotifications = async (userId) => {
  try {
    const notifications = await Notification.find({
      recipient_id: userId,
      is_read: false,
    })
      .sort({ created_at: -1 })
      .limit(10); // Get 10 most recent unread notifications

    const socketId = userSocketMap.get(userId);
    if (socketId && notifications.length > 0) {
      _io.to(socketId).emit("pending_notifications", notifications);
      logger.info(
        `Sent ${notifications.length} pending notifications to user ${userId}`
      );
    }
  } catch (error) {
    logger.error(`Error sending pending notifications: ${error.message}`);
  }
};

/**
 * Create and send a notification to a specific user
 */
const sendNotification = async ({
  recipientId,
  senderId,
  type,
  title,
  message,
  relatedEntityType,
  relatedEntityId,
  metadata,
}) => {
  try {
    const notification = new Notification({
      recipient_id: recipientId,
      sender_id: senderId,
      type: type,
      title: title,
      message: message,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      is_read: false,
      metadata: metadata,
    });

    await notification.save();

    // Send real-time notification if recipient is online
    const socketId = userSocketMap.get(recipientId);
    if (socketId) {
      _io.to(socketId).emit("new_notification", notification);
    }

    return notification;
  } catch (error) {
    logger.error(`Error creating notification: ${error.message}`);
    throw error;
  }
};

const getIo = () => {
  if (!_io) {
    throw new Error("Socket.IO not initialized. Call init() first.");
  }
  return _io;
};

const getHttpServer = () => {
  if (!_httpServer) {
    throw new Error("HTTP server not initialized. Call init() first.");
  }
  return _httpServer;
};

module.exports = {
  init,
  getIo,
  getHttpServer,
  sendNotification,
  NOTIFICATION_TYPES,
};
