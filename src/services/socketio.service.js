require("dotenv").config(); // Ensure you have dotenv to load environment variables
const { Server } = require("socket.io");
const { setupConnection, socketEventWrapper, setupDisconnection } = require("../socket/events");
const logger = require("./logging.service").getLogger();
const redisService = require("./redis.service");

let io; // This will hold our Socket.IO server instance
let attachedHttpServer; // To store the HTTP server instance we attach to

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
  });

  attachedHttpServer = httpServer; // Store the provided http server

  setupConnection(io);

  io.on("connection", async (socket) => {
    const userId = socket.userId;

    try {
      // Store user connection in Redis (already handled in setupConnection)
      // Just join the user-specific room for notifications
      socket.join(`user_${userId}`);
      logger.debug(`[Socket.IO] Socket ${socket.id} joined room user_${userId}`);
      
      // Get current connection count from Redis for logging
      const connections = await redisService.getUserConnections(userId);
      const connectionCount = connections ? Object.keys(connections).length : 0;
      logger.debug(
        `[Socket.IO] Socket ${socket.id} associated with user_${userId}. Total sockets for user: ${connectionCount}`
      );
    } catch (error) {
      logger.error(`[Socket.IO] Error managing user connection for ${userId}: ${error.message}`);
    }

    socketEventWrapper(socket);
    setupDisconnection(socket);
  });

  logger.debug("[Socket.IO] Server initialized and attached to HTTP server.");
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

const NOTIFICATION_TYPES = {
  NEW_MESSAGE: "new_message",
  NEW_CHAT_MESSAGE: "new_chat_message", // Added for chat messages
  MESSAGE_DELETED: "message_deleted",
  SYSTEM_MESSAGE: "system_message",
  NEW_NOTIFICATION: "new_notification",
};

module.exports = {
  init,
  getIo,
  getHttpServer,
  NOTIFICATION_TYPES,
};
