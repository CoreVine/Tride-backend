const { UnauthorizedError } = require("../../utils/errors/types/Api.error");

const AccountRepository = require("../../data-access/accounts");

const joinSocketController = require("../../socket/controllers/join.sock-controller");
const rideSocketController = require("../../socket/controllers/ride.sock-controller");
const leaveSocketController = require("../../socket/controllers/leave.sock-controller");

const redisService = require("../../services/redis.service");
const logger = require("../../services/logging.service").getLogger();
const jwt = require("jsonwebtoken");

function socketEventWrapper(socket, io) {  
    // Helper function for socket event logging and error handling
    const handleSocketEvent = async (eventName, handler, ...args) => {
        try {
            logger.info(`🔥 SOCKET EVENT: ${eventName} received`, { 
                service: "api",
                socketId: socket.id, 
                userId: socket.userId, 
                accountType: socket.accountType,
                driverId: socket.driver?.id,
                parentId: socket.parent?.id,
                adminId: socket.admin?.id
            });

            const result = await handler(...args);
            
            logger.info(`✅ SOCKET EVENT: ${eventName} completed successfully`, { 
                service: "api",
                socketId: socket.id, 
                userId: socket.userId 
            });
            
            return result;
        } catch (error) {
            logger.error(`❌ SOCKET EVENT: ${eventName} failed`, { 
                service: "api",
                socketId: socket.id, 
                userId: socket.userId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    };

    // chat sockets
    socket.on("join_room", async (room_id) => handleSocketEvent("join_room", joinSocketController.verifyAndJoinRoom, socket, room_id));
    socket.on("leave_room", (room_id) => handleSocketEvent("leave_room", leaveSocketController.leaveRoom, socket, room_id));

    // ride sockets
    socket.on("parent_watch_ride", async (payload) => handleSocketEvent("parent_watch_ride", rideSocketController.parentVerifyAndJoinRide, socket, payload));
    socket.on("driver_join_ride", async (payload, callback) => {
        try {
            logger.info(`🔥 SOCKET EVENT: driver_join_ride received`, { 
                service: "api",
                socketId: socket.id, 
                userId: socket.userId, 
                accountType: socket.accountType,
                driverId: socket.driver?.id,
                payload: payload
            });

            const result = await rideSocketController.driverVerifyAndJoinRide(socket, payload);
            
            logger.info(`✅ SOCKET EVENT: driver_join_ride completed, sending acknowledgment`, { 
                service: "api",
                socketId: socket.id, 
                userId: socket.userId,
                result: result
            });

            if (callback && typeof callback === 'function') {
                callback(result);
                logger.info(`📤 SOCKET ACK: driver_join_ride acknowledgment sent via callback`, { 
                    service: "api",
                    socketId: socket.id, 
                    result: result
                });
            }
        } catch (error) {
            logger.error(`❌ SOCKET EVENT: driver_join_ride failed`, { 
                service: "api",
                socketId: socket.id, 
                userId: socket.userId,
                error: error.message,
                stack: error.stack
            });

            if (callback && typeof callback === 'function') {
                const errorResponse = {
                    success: false,
                    message: error.message,
                    error: true
                };
                callback(errorResponse);
                logger.info(`📤 SOCKET ACK: driver_join_ride error acknowledgment sent`, { 
                    service: "api",
                    socketId: socket.id, 
                    errorResponse: errorResponse
                });
            }
        }
    });
    socket.on("admin_watch_ride", async (payload) => handleSocketEvent("admin_watch_ride", rideSocketController.adminVerifyAndJoinRide, socket, payload));
    socket.on("admin_watch_rides", async (payload) => handleSocketEvent("admin_watch_rides", rideSocketController.adminVerifyAndViewAll, socket));
    socket.on("driver_location_update", async (location) => handleSocketEvent("driver_location_update", rideSocketController.relayLocationUpdates, socket, location));
    socket.on("driver_confirm_checkpoint", async (payload) => handleSocketEvent("driver_confirm_checkpoint", rideSocketController.confirmCheckPoint, socket, io, payload));
    socket.on("driver_cancel_ride", async (location) => handleSocketEvent("driver_cancel_ride", rideSocketController.driverCancelActiveRide, socket));
    socket.on("driver_end_ride", async (location) => handleSocketEvent("driver_end_ride", rideSocketController.driverEndActiveRide, socket));
    socket.on("complete_ride", async (payload, callback) => {
        try {
            logger.info(`🔥 SOCKET EVENT: complete_ride received`, { 
                service: "api",
                socketId: socket.id, 
                userId: socket.userId, 
                accountType: socket.accountType,
                driverId: socket.driver?.id,
                payload: payload
            });

            const result = await rideSocketController.driverEndActiveRide(socket);
            
            logger.info(`✅ SOCKET EVENT: complete_ride completed, sending acknowledgment`, { 
                service: "api",
                socketId: socket.id, 
                userId: socket.userId,
                result: result
            });

            if (callback && typeof callback === 'function') {
                callback(result);
                logger.info(`📤 SOCKET ACK: complete_ride acknowledgment sent via callback`, { 
                    service: "api",
                    socketId: socket.id, 
                    result: result
                });
            }
        } catch (error) {
            logger.error(`❌ SOCKET EVENT: complete_ride failed`, { 
                service: "api",
                socketId: socket.id, 
                userId: socket.userId,
                error: error.message,
                stack: error.stack
            });

            if (callback && typeof callback === 'function') {
                const errorResponse = {
                    success: false,
                    message: error.message,
                    error: true
                };
                callback(errorResponse);
                logger.info(`📤 SOCKET ACK: complete_ride error acknowledgment sent`, { 
                    service: "api",
                    socketId: socket.id, 
                    errorResponse: errorResponse
                });
            }
        }
    });
}

function setupConnection(io) {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        throw new UnauthorizedError("No token provided");
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
    } else if (account.account_type === "driver" && (!account.driver.papers || !account.driver.papers.approved)) {
      logger.warn("Driver account papers not approved", { accountId: socket.userId });
      throw new UnauthorizedError("Unauthorized access");
    }
    if (socket.accountType === "admin") {
      socket.admin = {};
      socket.admin.id = account.admin.id;
      socket.admin.role = account.admin.role;
      socket.admin.permissions = account.admin.role.permissions.map((permission) => ({
        id: permission.id,
        name: permission.role_permission_name,
        group: permission.role_permission_group,
      }));
    } else if (socket.accountType === "driver") {
      socket.driver = {
        id: account.driver.id
      };
    } else {
      socket.parent = {
        id: account.parent.id
      };
    }

    // Store user connection in Redis
    await redisService.storeUserConnection(socket.userId, socket.id, socket.accountType);
    logger.debug(`[Socket.IO] User  connected and stored in Redis: ${socket.id} for user ${socket.userId}`);

    next();
    } catch (error) {
      logger.error(`Authentication failed: ${error.message}`);
      next(error);
    }
  });
}

function setupDisconnection(socket) {
    socket.on("disconnect", async () => {
        logger.debug(`[Socket.IO] User disconnected: ${socket.id}`);
        
        try {
            // Remove user connection from Redis
            if (socket.userId) {
                await redisService.removeUserSocketConnection(socket.userId, socket.id);
                logger.debug(`[Socket.IO] Socket ${socket.id} removed from Redis for user ${socket.userId}`);
            }

            if (socket.rideRoomId) {
              socket.to(socket.rideRoomId).emit("location_update", {
                type: "DRIVER_STATUS",
                message: "Driver has left!",
                data: {}
              })
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
