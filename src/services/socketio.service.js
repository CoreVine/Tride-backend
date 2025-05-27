// services/socketio.service.js

const http = require('http');
const { Server } = require('socket.io');
const loggingService = require("./logging.service"); // Assuming logging.service.js is in the same directory
const logger = loggingService.getLogger();

// Import your necessary models and services
const JwtService = require('./jwt.service'); // Adjust path if needed
const AccountRepository = require('../data-access/accounts'); // Adjust path if needed
// FIX: Import Parent and Driver models directly
const Parent = require('../models/Parent'); // Corrected path
const Driver = require('../models/Driver'); // Corrected path

const ChatRoom = require('../models/ChatRoom'); // Your Mongoose ChatRoom model
const ChatMessage = require('../models/ChatMessage'); // Your Mongoose ChatMessage model
let _io; // Private variable to hold the Socket.IO server instance
let _httpServer; // Private variable to hold the HTTP server instance

const init = async (expressApp) => {
  // Ensure we only initialize once
  if (_io) {
    logger.warn('Socket.IO service already initialized.');
    return _io;
  }

  // Create HTTP server using the provided Express app
  _httpServer = http.createServer(expressApp);

  // Initialize Socket.IO server
 _io = new Server(_httpServer, {
    cors: {
        origin: [process.env.FRONTEND_URL || "*", "null"], // <--- IT MUST BE THE STRING "null"
      methods: ["GET", "POST"]
    }
  });

  logger.info("Socket.IO initialized.");

  // --- Socket.IO Authentication Middleware ---
  _io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        logger.warn('Socket.IO Auth: No authentication token provided.');
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = await JwtService.jwtVerify(token); // Use your JwtService
      socket.userId = decoded.id;

      // Fetch account type from your MySQL account table if it's not in the JWT payload
      const account = await AccountRepository.findById(socket.userId);
      if (!account) {
        logger.warn(`Socket.IO Auth: Account not found for user ID: ${socket.userId}`);
        return next(new Error('Authentication error: Account not found'));
      }
      socket.accountType = account.account_type;

      logger.info(`Socket.IO: User ${socket.userId} (${socket.accountType}) connected with socket ID: ${socket.id}`);
      next();
    } catch (error) {
      logger.error('Socket.IO Auth failed:', error.message);
      next(new Error('Authentication error: Invalid token or account'));
    }
  });

  // --- Socket.IO Event Handlers ---
  _io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}, User ID: ${socket.userId}`);

    // Join a specific chat room for a ride group
    socket.on('join_ride_group_chat', async (rideGroupId) => {
      try {
        if (!rideGroupId) {
          throw new Error('rideGroupId is required to join a chat.');
        }

        let chatRoom = await ChatRoom.findOne({ ride_group_id: rideGroupId });
        if (!chatRoom) {
          chatRoom = new ChatRoom({ ride_group_id: rideGroupId });
          await chatRoom.save();
          logger.info(`Created new chat room for ride group ${rideGroupId}: ${chatRoom._id}`);
        }

        socket.chatRoomId = chatRoom._id.toString();
        socket.rideGroupId = rideGroupId;

        socket.join(socket.chatRoomId);
        logger.info(`User ${socket.userId} joined room: ${socket.chatRoomId} (Ride Group: ${rideGroupId})`);

        const messages = await ChatMessage.find({ chat_room_id: chatRoom._id })
                                          .sort({ created_at: 1 })
                                          .limit(50);

        const messagesWithSenderNames = await Promise.all(messages.map(async (msg) => {
          let senderName = 'Unknown User';
          if (msg.sender_type === 'parent') {
            const parent = await Parent.findByPk(msg.sender_id, { attributes: ['name'] });
            senderName = parent ? parent.name : 'Parent';
          } else if (msg.sender_type === 'driver') {
            const driver = await Driver.findByPk(msg.sender_id, { attributes: ['name'] });
            senderName = driver ? driver.name : 'Driver';
          }
          return {
            id: msg._id,
            senderId: msg.sender_id,
            senderType: msg.sender_type,
            senderName: senderName,
            message: msg.message,
            createdAt: msg.created_at
          };
        }));

        socket.emit('chat_history', messagesWithSenderNames);

      } catch (error) {
        logger.error(`Error joining chat room for ride group ${rideGroupId}:`, error.message);
        socket.emit('chat_error', `Failed to join chat room: ${error.message}`);
      }
    });

    // Handle incoming messages
    socket.on('send_message', async (data) => {
      const { message } = data;
      const { userId, accountType, chatRoomId } = socket;

      if (!chatRoomId || !userId || !message) {
        return socket.emit('chat_error', 'Cannot send message: not in a room, or missing user/message.');
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

        let senderName = 'Unknown User';
        if (accountType === 'parent') {
          const parent = await Parent.findByPk(userId, { attributes: ['name'] });
          senderName = parent ? parent.name : 'Parent';
        } else if (accountType === 'driver') {
          const driver = await Driver.findByPk(userId, { attributes: ['name'] });
          senderName = driver ? driver.name : 'Driver';
        }

        const messageToBroadcast = {
          id: newChatMessage._id,
          senderId: userId,
          senderType: accountType,
          senderName: senderName,
          message: newChatMessage.message,
          createdAt: newChatMessage.created_at
        };

        _io.to(chatRoomId).emit('receive_message', messageToBroadcast);

      } catch (error) {
        logger.error(`Error sending message in room ${chatRoomId}:`, error.message);
        socket.emit('chat_error', `Failed to send message: ${error.message}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}, User ID: ${socket.userId}`);
    });
  });

  return _io; // Return the Socket.IO instance
};

const getIo = () => {
  if (!_io) {
    throw new Error('Socket.IO not initialized. Call init() first.');
  }
  return _io;
};

const getHttpServer = () => {
  if (!_httpServer) {
    throw new Error('HTTP server not initialized. Call init() first.');
  }
  return _httpServer;
}

module.exports = {
  init,
  getIo,
  getHttpServer
};