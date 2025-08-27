const RideGroupRepository = require("../data-access/rideGroup");
const RideInstanceRepository = require("../data-access/rideInstance");
const { BadRequestError, NotFoundError } = require("../utils/errors");
const loggingService = require("../services/logging.service");
const logger = loggingService.getLogger();
const { MAX_SEATS_CAR } = require("../config/upload/constants");
const redisService = require("../services/redis.service");
const socketService = require("../services/socketio.service");

const rideController = {
    cancelRideInstance: async (req, res, next) => {
        const { ride_instance_id } = req.params;
        const driver_id = req.account.driver.id;

        try {
            // Check if the ride instance exists and belongs to this driver
            const rideInstance = await RideInstanceRepository.findById(ride_instance_id);
            
            if (!rideInstance) {
                throw new NotFoundError("Ride instance not found");
            }
            
            if (rideInstance.driver_id !== driver_id) {
                throw new BadRequestError("You can only cancel your own ride instances");
            }
            
            if (rideInstance.status === "ended") {
                throw new BadRequestError("Ride instance is already ended");
            }
            
            await RideInstanceRepository.cancelRideInstance(ride_instance_id);
            
            logger.info(`Driver ${driver_id} cancelled ride instance ${ride_instance_id}`);
            
            return res.success("Ride instance cancelled successfully", {
                rideInstanceId: ride_instance_id,
                status: "ended"
            });
            
        } catch (error) {
            logger.error(`Error cancelling ride instance: ${error.message}`);
            next(error);
        }
    },

    forceLeaveRoom: async (req, res, next) => {
        const driver_id = req.account.driver.id;
        const user_id = req.account.id;

        try {
            logger.info(`🔧 FORCE LEAVE: Driver ${driver_id} requesting to leave all rooms`);

            // Get all socket connections for this user
            const socketConnections = await redisService.getUserSocketConnections(user_id);
            logger.info(`🔧 FORCE LEAVE: Found ${socketConnections.length} socket connections`, { socketConnections });

            let roomsLeft = 0;
            let socketsFound = 0;

            // For each socket connection, force leave rooms
            for (const socketId of socketConnections) {
                try {
                    // Get socket from server
                    const io = socketService.getIo();
                    const socket = io.sockets.sockets.get(socketId);
                    
                    if (socket) {
                        socketsFound++;
                        logger.info(`🔧 FORCE LEAVE: Processing socket ${socketId}`, { 
                            rideRoomId: socket.rideRoomId,
                            rideInstanceId: socket.rideInstanceId,
                            rooms: Array.from(socket.rooms)
                        });

                        // Leave ride room if exists
                        if (socket.rideRoomId) {
                            socket.leave(socket.rideRoomId);
                            
                            // Notify others in the room that driver left
                            socket.to(socket.rideRoomId).emit("location_update", {
                                type: "DRIVER_STATUS",
                                message: "Driver has left (forced)",
                                data: {}
                            });

                            logger.info(`🔧 FORCE LEAVE: Socket ${socketId} left room ${socket.rideRoomId}`);
                            roomsLeft++;
                        }

                        // Clear socket state
                        socket.rideRoomId = null;
                        socket.rideInstanceId = null;
                        
                        logger.info(`🔧 FORCE LEAVE: Socket ${socketId} state cleared`);
                    } else {
                        logger.warn(`🔧 FORCE LEAVE: Socket ${socketId} not found in server`);
                    }
                } catch (socketError) {
                    logger.error(`🔧 FORCE LEAVE: Error processing socket ${socketId}`, { error: socketError.message });
                }
            }

            logger.info(`🔧 FORCE LEAVE: Completed for driver ${driver_id}`, { 
                socketsFound, 
                roomsLeft, 
                totalConnections: socketConnections.length 
            });

            return res.success("Successfully forced leave from all rooms", {
                driverId: driver_id,
                socketsFound: socketsFound,
                roomsLeft: roomsLeft,
                totalConnections: socketConnections.length
            });
        } catch (error) {
            logger.error(`🔧 FORCE LEAVE: Error for driver ${driver_id}`, { error: error.message });
            next(error);
        }
    },

    createRideInstance: async (req, res, next) => {
        const { ride_group_id, type } = req.body;
        const driver_id = req.account.driver.id;

        try {
            const rideGroup = await RideGroupRepository.findOneIfDriver(ride_group_id, driver_id);

            if (!rideGroup) {
                throw new NotFoundError("Ride group is not found");
            }

            const existingRideInstance = await RideInstanceRepository.findActiveInstanceByRideGroupAndDriver(ride_group_id, driver_id);

            if (existingRideInstance) {
                logger.warn(`Driver ${driver_id} attempted to create duplicate ride instance for group ${ride_group_id}`, {
                    existingInstanceId: existingRideInstance.id,
                    status: existingRideInstance.status
                });
                
                return res.success("A ride instance is already active for this group", {
                    rideInstance: existingRideInstance,
                    message: "Cannot create multiple ride instances. Please complete or cancel the existing ride first."
                });
            }

            const driverActiveRides = await RideInstanceRepository.findActiveInstancesByDriver(driver_id);
            
            if (driverActiveRides && driverActiveRides.length > 0) {
                logger.warn(`Driver ${driver_id} has active rides in other groups`, {
                    activeRides: driverActiveRides.map(r => ({ id: r.id, groupId: r.group_id, status: r.status }))
                });
                
                throw new BadRequestError(`You have ${driverActiveRides.length} active ride(s) in other groups. Please complete them before starting a new ride.`);
            }

            // if (rideGroup.current_seats_taken !== MAX_SEATS_CAR) {
            //     throw new BadRequestError(`Cannot start a ride on a group that is not ${MAX_SEATS_CAR} members!`);
            // }

            // create a new ride instance
            const newRideInstance = await RideInstanceRepository.create({
                type,
                driver_id,
                group_id: ride_group_id
            });

            return res.success("Created a new ride instance", {
                rideInstance: newRideInstance
            });

        } catch (error) {
            logger.error(`Error creating ride instance: ${error.message}`);
            next(error);
        }
    }
};

module.exports = rideController;
