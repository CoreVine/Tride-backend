// src/services/socketio.service.js
const { Server } = require("socket.io");
const logger = require("./logging.service").getLogger();
const jwt = require("jsonwebtoken");
require("dotenv").config(); // Ensure you have dotenv to load environment variables
let io; // This will hold our Socket.IO server instance
let attachedHttpServer; // To store the HTTP server instance we attach to

// A map to store userId -> Set<socket.id> for direct messaging/notifications
const userSocketMap = new Map();

/**
 * Initializes the Socket.IO server by attaching it to an existing HTTP server.
 * @param {import('http').Server} httpServer The Node.js HTTP server instance to attach to.
 */
function init(httpServer) {
  if (!httpServer || typeof httpServer.listen !== "function") {
    logger.error(
      "[Socket.IO] Invalid HTTP server instance provided. Cannot initialize Socket.IO."
    );
    throw new Error("Invalid HTTP server provided to Socket.IO service.");
  }

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*", // Adjust CORS as needed for your frontend
      allowedHeaders: ["Authorization"], // Allow auth header
      credentials: true,

      methods: ["GET", "POST"],
    },
    // Add other options like transports if necessary
  });

  attachedHttpServer = httpServer; // Store the provided http server

  // In socketio.service.js, modify the connection handler:
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization;

      if (!token) {
        throw new Error("No token provided");
      }

      const decoded = jwt.verify(
        token.replace("Bearer ", ""),
        process.env.SERVER_JWT_SECRET
      );
      socket.userId = decoded.payload.id; // Adjust based on your JWT structure
      next();
    } catch (error) {
      logger.error(`Authentication failed: ${error.message}`);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    // logger.info(`[Socket.IO] User connected: ${socket.id}`);

    // // Verify token from handshake
    // const token =
    //   socket.handshake.auth.token || socket.handshake.headers.authorization;
    // if (!token) throw new Error("No token provided");

    // const decoded = jwt.verify(
    //   token.replace("Bearer ", ""),
    //   process.env.SERVER_JWT_SECRET
    // );
    // const userId = decoded.payload.id; // Adjust based on your JWT structure

    // if (userId) {
    // Store the userId on the socket for easy access later
    const userId = socket.userId;

    // Add socket.id to the userSocketMap for this userId
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);
    logger.info(
      `[Socket.IO] Socket ${
        socket.id
      } associated with user_${userId}. Total sockets for user: ${
        userSocketMap.get(userId).size
      }`
    );

    // Also join a private room for this user for general user-specific notifications
    socket.join(`user_${userId}`);
    logger.info(`[Socket.IO] Socket ${socket.id} joined room user_${userId}`);

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      logger.info(
        `[Socket.IO] Socket ${socket.id} joined chat room: ${roomId}`
      );
    });

    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
      logger.info(`[Socket.IO] Socket ${socket.id} left chat room: ${roomId}`);
    });

    socket.on("disconnect", () => {
      logger.info(`[Socket.IO] User disconnected: ${socket.id}`);
      // Remove socket.id from userSocketMap on disconnect
      if (socket.userId && userSocketMap.has(socket.userId)) {
        userSocketMap.get(socket.userId).delete(socket.id);
        if (userSocketMap.get(socket.userId).size === 0) {
          userSocketMap.delete(socket.userId); // Remove user entry if no active sockets
        }
        logger.info(
          `[Socket.IO] Socket ${socket.id} removed from user_${
            socket.userId
          }. Remaining sockets for user: ${
            userSocketMap.has(socket.userId)
              ? userSocketMap.get(socket.userId).size
              : 0
          }`
        );
      }
    });
  });

  logger.info("[Socket.IO] Server initialized and attached to HTTP server.");
}

function getIo() {
  if (!io) {
    logger.error(
      "[Socket.IO] Socket.IO server not initialized. Call init() first."
    );
    throw new Error("Socket.IO server not initialized.");
  }
  return io;
}

function getHttpServer() {
  if (!attachedHttpServer) {
    logger.error(
      "[Socket.IO] HTTP server not attached. Call init() first with an http.Server instance."
    );
    throw new Error("HTTP server not attached to Socket.IO.");
  }
  return attachedHttpServer;
}

/**
 * Returns the userSocketMap for direct access to user's connected sockets.
 * @returns {Map<string, Set<string>>} A map of userId to a Set of socket IDs.
 */
function getUserSocketMap() {
  return userSocketMap;
}

const NOTIFICATION_TYPES = {
  NEW_MESSAGE: "new_message",
  MESSAGE_DELETED: "message_deleted", // Corrected duplicate key
  SYSTEM_MESSAGE: "system_message",
  NEW_NOTIFICATION: "new_notification",
};

module.exports = {
  init,
  getIo,
  getHttpServer,
  getUserSocketMap, // Export the new function
  NOTIFICATION_TYPES,
};
