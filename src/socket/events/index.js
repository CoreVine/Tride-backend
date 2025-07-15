const jwt = require("jsonwebtoken");
const AccountRepository = require("../../data-access/accounts");
const joinSocketController = require("../../socket/controllers/join.sock-controller");
const leaveSocketController = require("../../socket/controllers/leave.sock-controller");
const { UnauthorizedError } = require("../../utils/errors/types/Api.error");
const logger = require("../../services/logging.service").getLogger();
const redisService = require("../../services/redis.service");

function socketEventWrapper(socket) {
    socket.on("join_room", async (room_id) => joinSocketController.verifyAndJoinRoom(socket, room_id));
    socket.on("leave_room", (room_id) => leaveSocketController.leaveRoom(socket, room_id));
}

function setupConnection(io) {
  io.use(async (socket, next) => {
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
      socket.accountType = decoded.payload.accountType; // Store account type for later use

    // Get account from database
    const account = await AccountRepository.findByIdIncludeDetails(socket.userId);
    if (!account || !account.is_verified) {
      logger.warn("Parent account not found or not verified", { accountId: socket.userId });
      throw new UnauthorizedError("Parent account not found or not verified");
    }
    
    if (account.account_type === "parent" && (!account.parent || !account.parent.documents_approved)) {
      logger.warn("Parent account documents not approved", { accountId: socket.userId });
      throw new UnauthorizedError("Unauthorized access");
    } else if (account.account_type === "driver" && (!account.driver_papers || !account.driver_papers.approved)) {
      logger.warn("Driver account papers not approved", { accountId: socket.userId });
      throw new UnauthorizedError("Unauthorized access");
    }

    // Store user connection in Redis
    await redisService.storeUserConnection(socket.userId, socket.id, socket.accountType);
    logger.info(`[Socket.IO] User connected and stored in Redis: ${socket.id} for user ${socket.userId}`);

    next();
    } catch (error) {
      logger.error(`Authentication failed: ${error.message}`);
      next(error);
    }
  });
}

function setupDisconnection(socket) {
    socket.on("disconnect", async () => {
        logger.info(`[Socket.IO] User disconnected: ${socket.id}`);
        
        try {
            // Remove user connection from Redis
            if (socket.userId) {
                await redisService.removeUserConnection(socket.userId);
                logger.info(`[Socket.IO] Socket ${socket.id} removed from Redis for user ${socket.userId}`);
            }
        } catch (error) {
            logger.error(`[Socket.IO] Error removing user connection from Redis: ${error.message}`);
        }
    });
}

module.exports = {
    socketEventWrapper,
    setupConnection,
    setupDisconnection
};
