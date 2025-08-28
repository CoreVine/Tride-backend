const RideGroupRepository = require("../data-access/rideGroup");
const RideInstanceRepository = require("../data-access/rideInstance");
const RideInstanceLocationRepository = require("../data-access/rideInstanceLocation");
const RideHistoryRepository = require("../data-access/rideHistory");
const { BadRequestError, NotFoundError } = require("../utils/errors");
const loggingService = require("../services/logging.service");
const logger = loggingService.getLogger();
const { MAX_SEATS_CAR } = require("../config/upload/constants");
const redisService = require("../services/redis.service");
const socketService = require("../services/socketio.service");
const { getDistanceBetweenLocations } = require("../domain/checkpoint/detector");
const { getOptimizedRouteWithSteps } = require("../utils/openRoutesService");
const { CHECKPOINT_RADIUS } = require("../utils/constants/ride");

const rideController = {
    cancelRideInstance: async (req, res, next) => {
        const { ride_instance_id } = req.params;
        const driver_id = req.account.driver.id;

        try {
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
            logger.debug(`FORCE LEAVE: Driver ${driver_id} requesting to leave all rooms`);

            const connections = await redisService.getUserConnections(user_id);
            if (!connections) {
                logger.debug(`FORCE LEAVE: No socket connections found for user ${user_id}`);
                return res.success("No socket connections found to clean up", {
                    driverId: driver_id,
                    socketsFound: 0,
                    roomsLeft: 0,
                    totalConnections: 0
                });
            }

            const socketConnections = Object.keys(connections);
            logger.debug(`FORCE LEAVE: Found ${socketConnections.length} socket connections`, { socketConnections });

            let roomsLeft = 0;
            let socketsFound = 0;

            for (const socketId of socketConnections) {
                try {
                    const io = socketService.getIo();
                    const socket = io.sockets.sockets.get(socketId);
                    
                    if (socket) {
                        socketsFound++;
                        logger.debug(`FORCE LEAVE: Processing socket ${socketId}`, { 
                            rideRoomId: socket.rideRoomId,
                            rideInstanceId: socket.rideInstanceId,
                            rooms: Array.from(socket.rooms)
                        });

                        if (socket.rideRoomId) {
                            socket.leave(socket.rideRoomId);
                            
                            socket.to(socket.rideRoomId).emit("location_update", {
                                type: "DRIVER_STATUS",
                                message: "Driver has left (forced)",
                                data: {}
                            });

                            logger.debug(`FORCE LEAVE: Socket ${socketId} left room ${socket.rideRoomId}`);
                            roomsLeft++;
                        }

                        socket.rideRoomId = null;
                        socket.rideInstanceId = null;
                        socket.disconnect(true);
                        
                        logger.debug(`FORCE LEAVE: Socket ${socketId} state cleared and disconnected`);
                    } else {
                        logger.warn(`FORCE LEAVE: Socket ${socketId} not found in server`);
                    }
                } catch (socketError) {
                    logger.error(`FORCE LEAVE: Error processing socket ${socketId}`, { error: socketError.message });
                }
            }

            logger.debug(`FORCE LEAVE: Completed for driver ${driver_id}`, { 
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
            logger.error(`FORCE LEAVE: Error for driver ${driver_id}`, { error: error.message });
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
    },

    _cleanupAndRejoinRide: async (user_id, accountType, newRideRoomId, newRideInstanceId) => {
        const connections = await redisService.getUserConnections(user_id);
        if (!connections) return null;

        const io = socketService.getIo();
        const socketConnections = Object.keys(connections);
        
        let activeSockets = [];
        let oldRideState = null;
        let staleSockets = [];

        for (const socketId of socketConnections) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket && socket.accountType === accountType) {
                activeSockets.push(socket);
                
                if (socket.rideRoomId && socket.rideInstanceId) {
                    if (!oldRideState) {
                        oldRideState = {
                            rideRoomId: socket.rideRoomId,
                            rideInstanceId: socket.rideInstanceId
                        };
                    }
                    staleSockets.push(socket);
                }
            }
        }

        if (staleSockets.length > 0) {
            for (const socket of staleSockets) {
                if (socket.rideRoomId) {
                    socket.leave(socket.rideRoomId);
                    logger.debug(`Socket ${socket.id} left old room ${socket.rideRoomId}`);
                }
                
                try {
                    await redisService.removeUserSocketConnection(user_id, socket.id);
                    logger.debug(`Manually removed socket ${socket.id} from Redis`);
                } catch (redisError) {
                    logger.warn(`Failed to remove socket ${socket.id} from Redis: ${redisError.message}`);
                }
                
                socket.disconnect(true);
                logger.debug(`Disconnected stale socket ${socket.id}`);
            }

            if (oldRideState && oldRideState.rideRoomId !== newRideRoomId) {
                io.to(oldRideState.rideRoomId).emit("location_update", {
                    type: "DRIVER_STATUS",
                    message: `${accountType.charAt(0).toUpperCase() + accountType.slice(1)} reconnected to different ride`,
                    data: {}
                });
            }
        }

        const remainingSockets = activeSockets.filter(socket => !staleSockets.includes(socket));
        if (remainingSockets.length > 0 && newRideRoomId && newRideInstanceId) {
            remainingSockets.forEach(socket => {
                socket.rideRoomId = newRideRoomId;
                socket.rideInstanceId = newRideInstanceId;
                socket.join(newRideRoomId);
                logger.debug(`Socket ${socket.id} joined new room ${newRideRoomId}`);
            });
        }

        return {
            sockets: remainingSockets,
            oldRideState,
            cleanedUp: staleSockets.length > 0
        };
    },

    _getSocketState: async (user_id, accountType) => {
        const connections = await redisService.getUserConnections(user_id);
        
        let socketState = {
            sockets: [],
            rideRoomId: null,
            rideInstanceId: null,
            hasActiveRide: false
        };

        if (connections) {
            const io = socketService.getIo();
            const socketConnections = Object.keys(connections);
            
            for (const socketId of socketConnections) {
                const socket = io.sockets.sockets.get(socketId);
                if (socket && socket.accountType === accountType) {
                    socketState.sockets.push(socket);
                    
                    if (!socketState.rideRoomId && socket.rideRoomId) {
                        socketState.rideRoomId = socket.rideRoomId;
                        socketState.rideInstanceId = socket.rideInstanceId;
                        socketState.hasActiveRide = true;
                    }
                }
            }
        }

        if (!socketState.hasActiveRide) {
            try {
                const rideState = await redisService.getUserRideState(user_id, accountType);
                if (rideState) {
                    socketState.rideRoomId = rideState.rideRoomId;
                    socketState.rideInstanceId = rideState.rideInstanceId;
                    socketState.hasActiveRide = true;
                }
            } catch (error) {
                logger.debug(`No Redis ride state found for user ${user_id}`);
            }
        }

        return socketState;
    },

    joinRide: async (req, res, next) => {
        const { ride_group_id, location } = req.body;
        const driver_id = req.account.driver.id;
        const user_id = req.account.id;

        try {
            await rideController._cleanupStaleConnections(user_id, "driver");

            const socketState = await rideController._getSocketState(user_id, "driver");
            
            if (socketState?.hasActiveRide) {
                logger.debug(`Driver ${driver_id} attempting to rejoin ride`, {
                    currentRideRoomId: socketState.rideRoomId,
                    currentRideInstanceId: socketState.rideInstanceId,
                    requestedGroupId: ride_group_id
                });

                const currentRideInstance = await RideInstanceRepository.findById(socketState.rideInstanceId);
                if (currentRideInstance && currentRideInstance.group_id === ride_group_id) {
                    const order = await redisService.getRideOrderForRideInstance(currentRideInstance.id);
                    const currentLocation = await redisService.getLatestLocationUpdate(socketState.rideRoomId);
                    
                    logger.debug(`Driver rejoined same ride successfully`);
                    return res.success("Driver reconnected to existing ride", {
                        uid: socketState.rideRoomId,
                        order,
                        direction: currentRideInstance.type,
                        reconnected: true
                    });
                } else {
                    throw new BadRequestError("You must complete or cancel your current ride before joining a different ride");
                }
            }

            if (!ride_group_id) {
                throw new BadRequestError("BAD REQUEST, MISSING ride_group_id!");
            }
            if (!location?.lat || !location?.lng) {
                throw new BadRequestError("Invalid location is set!");
            }

            const rideInstance = await RideInstanceRepository.findActiveInstanceByRideGroupAndDriver(ride_group_id, driver_id);
            if (!rideInstance) {
                throw new NotFoundError("NO ACTIVE INSTANCES, CREATE ONE FIRST!");
            }

            const uid = `driver:${rideInstance.driver_id}:${rideInstance.group_id}:${rideInstance.id}`;

            await redisService.setUserRideState(user_id, "driver", uid, rideInstance.id);

            await rideController._setupSocketsForRide(user_id, "driver", uid, rideInstance.id);

            let order = await redisService.getRideOrderForRideInstance(rideInstance.id);

            if (!Object.keys(order).length) {
                const locations = await RideGroupRepository.getAllLocationsById(rideInstance.group_id);
                
                if (!locations || !locations.parentGroups || !locations.school) {
                    throw new BadRequestError("BAD REQUEST, THIS DRIVER HAS NO LOCATIONS!");
                }

                const parentsLocations = locations.parentGroups.map(parent => ({
                    lat: parent.home_lat,
                    lng: parent.home_lng,
                    parent_id: parent.parent_id,
                    children: parent.childDetails.map(childDetail => childDetail.child_id) || []
                }));
                
                order = await getOptimizedRouteWithSteps({
                    ...location,
                    id: driver_id
                }, parentsLocations, locations.school, rideInstance.type);

                order[0].status = "done";

                const existingHistory = await RideHistoryRepository.findAllByRideInstanceId(rideInstance.id);
                if (existingHistory && existingHistory.length > 0) {
                    for (const historyRecord of existingHistory) {
                        const checkpointIndex = Object.keys(order).find(index => {
                            const checkpoint = order[index];
                            const typeMatch = checkpoint.type === historyRecord.type;

                            if (historyRecord.type === 'child' && historyRecord.deliveredChildren?.length > 0) {
                                const parentId = historyRecord.deliveredChildren[0].child?.parent_id;
                                return typeMatch && checkpoint.id === parentId;
                            }

                            return typeMatch;
                        });

                        if (checkpointIndex !== undefined) {
                            order[checkpointIndex].status = "done";
                            if (["child", "school"].includes(historyRecord.type)) {
                                const deliveredChildren = historyRecord.deliveredChildren || [];
                                if (deliveredChildren.length > 0) {
                                    order[checkpointIndex].confirmed_children = deliveredChildren.map(dc => dc.child_id);
                                }
                            }
                        }
                    }
                }

                await redisService.setRideOrderForRideInstance(rideInstance.id, order, order.length);
            }

            if (rideInstance.status === "started") {
                await RideInstanceRepository.startNewRide(rideInstance, location);
            }

            const locationMap = {
                lat: parseFloat(location.lat),
                lng: parseFloat(location.lng),
                ts: Date.now()
            };

            if (Math.abs(locationMap.lat) > 90 || Math.abs(locationMap.lng) > 180) {
                throw new BadRequestError("Invalid GPS coordinates detected!");
            }

            await redisService.setLocationUpdates(uid, locationMap);

            const io = socketService.getIo();
            io.to(uid).emit("location_update", {
                type: "DRIVER_STATUS",
                message: "Driver has joined!",
                data: { checkpointOrder: order }
            });

            return res.success("Driver successfully joined ride", {
                uid,
                order,
                direction: rideInstance.type,
                reconnected: false
            });

        } catch (error) {
            logger.error(`Error joining ride: ${error.message}`);
            next(error);
        }
    },

    _cleanupStaleConnections: async (user_id, accountType) => {
        const connections = await redisService.getUserConnections(user_id);
        
        if (connections) {
            const io = socketService.getIo();
            const socketConnections = Object.keys(connections);
            
            for (const socketId of socketConnections) {
                const socket = io.sockets.sockets.get(socketId);
                if (socket && socket.accountType === accountType && socket.rideRoomId) {
                    logger.debug(`Cleaning up stale socket ${socketId} with ride state`);
                    
                    socket.leave(socket.rideRoomId);
                    socket.rideRoomId = null;
                    socket.rideInstanceId = null;
                    
                    try {
                        await redisService.removeUserSocketConnection(user_id, socket.id);
                        socket.disconnect(true);
                        logger.debug(`Disconnected stale socket ${socketId}`);
                    } catch (error) {
                        logger.warn(`Failed to clean up socket ${socketId}: ${error.message}`);
                    }
                }
            }
        }

        try {
            await redisService.clearUserRideState(user_id, accountType);
            logger.debug(`Cleared Redis ride state for user ${user_id}`);
        } catch (error) {
            logger.debug(`No Redis ride state to clear for user ${user_id}`);
        }
    },

    _setupSocketsForRide: async (user_id, accountType, rideRoomId, rideInstanceId) => {
        const connections = await redisService.getUserConnections(user_id);
        if (!connections) return;

        const io = socketService.getIo();
        const socketConnections = Object.keys(connections);
        
        for (const socketId of socketConnections) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket && socket.accountType === accountType && !socket.rideRoomId) {
                socket.rideRoomId = rideRoomId;
                socket.rideInstanceId = rideInstanceId;
                socket.join(rideRoomId);
                logger.debug(`Socket ${socketId} joined room ${rideRoomId}`);
            }
        }
    },

    updateLocation: async (req, res, next) => {
        const { location } = req.body;
        const driver_id = req.account.driver.id;
        const user_id = req.account.id;

        try {
            const socketState = await rideController._getSocketState(user_id, "driver");

            if (!socketState?.hasActiveRide) {
                throw new BadRequestError("DRIVER MUST JOIN A RIDE FIRST BEFORE RELAYING LOCATIONS!");
            }

            // Validate that the ride instance actually exists in the database
            const rideInstance = await RideInstanceRepository.findById(socketState.rideInstanceId);
            if (!rideInstance) {
                // Clear invalid ride state and force driver to rejoin
                await redisService.clearUserRideState(user_id, "driver");
                throw new BadRequestError("INVALID RIDE STATE! Please join the ride again.");
            }

            // Validate that the ride instance belongs to this driver
            if (rideInstance.driver_id !== driver_id) {
                await redisService.clearUserRideState(user_id, "driver");
                throw new BadRequestError("RIDE INSTANCE DOES NOT BELONG TO THIS DRIVER! Please join the correct ride.");
            }

            // Validate that the ride instance is still active
            if (rideInstance.status === "ended" || rideInstance.status === "cancelled") {
                await redisService.clearUserRideState(user_id, "driver");
                throw new BadRequestError(`RIDE IS ${rideInstance.status.toUpperCase()}! Cannot update location for inactive ride.`);
            }

            if (!location?.lat || !location?.lng) {
                throw new BadRequestError("Invalid location coordinates provided!");
            }

            const locationMap = {
                lat: parseFloat(location.lat),
                lng: parseFloat(location.lng),
                ts: Date.now()
            };

            if (Math.abs(locationMap.lat) > 90 || Math.abs(locationMap.lng) > 180) {
                throw new BadRequestError("Invalid GPS coordinates detected!");
            }

            // Store in database with validated ride instance ID
            await RideInstanceLocationRepository.create({
                ride_instance_id: socketState.rideInstanceId,
                lat: locationMap.lat,
                lng: locationMap.lng,
            });

            await redisService.setLocationUpdates(socketState.rideRoomId, locationMap);

            const fullOrder = await redisService.getRideOrderForRideInstance(socketState.rideInstanceId);
            if (!fullOrder || Object.keys(fullOrder).length === 0) {
                throw new BadRequestError("Route data unavailable. Please restart the ride.");
            }

            let nearestCheckpoint = null;
            let nearestDistance = Infinity;
            let nearestOriginalIndex = -1;

            Object.keys(fullOrder).forEach(originalIndex => {
                const checkpoint = fullOrder[originalIndex];
                const index = parseInt(originalIndex);
                
                if (checkpoint.status === "done" || !checkpoint.lat || !checkpoint.lng) return;
                
                const distance = getDistanceBetweenLocations(
                    { location_lat: locationMap.lat, location_lng: locationMap.lng },
                    { checkpoint_lat: checkpoint.lat, checkpoint_lng: checkpoint.lng }
                );
                
                if (distance <= CHECKPOINT_RADIUS && distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestCheckpoint = checkpoint;
                    nearestOriginalIndex = index;
                }
            });

            const io = socketService.getIo();
            if (nearestOriginalIndex !== -1) {
                io.to(socketState.rideRoomId).emit("location_update", {
                    type: "CHECKPOINT_REACHED",
                    message: "Driver is near a checkpoint",
                    data: {
                        locationMap,
                        checkpointReached: {
                            ...nearestCheckpoint,
                            index: nearestOriginalIndex,
                            distance: nearestDistance
                        }
                    }
                });
            } else {
                io.to(socketState.rideRoomId).emit("location_update", {
                    type: "LOCATION_UPDATE",
                    message: "Driver location updated",
                    data: { locationMap, checkpointReached: null }
                });
            }

            return res.success("Location updated successfully", {
                location: locationMap,
                checkpointReached: nearestOriginalIndex !== -1 ? {
                    ...nearestCheckpoint,
                    index: nearestOriginalIndex,
                    distance: nearestDistance
                } : null
            });

        } catch (error) {
            logger.error(`Error updating location: ${error.message}`);
            next(error);
        }
    },

    confirmCheckpoint: async (req, res, next) => {
        const { ride_group_id, checkpoint_index, location, children_ids = [] } = req.body;
        const driver_id = req.account.driver.id;
        const user_id = req.account.id;

        try {
            if (!ride_group_id) {
                throw new BadRequestError("BAD REQUEST, MISSING ride_group_id!");
            }
            if (typeof checkpoint_index !== "number") {
                throw new BadRequestError("BAD REQUEST, MISSING checkpoint_index!");
            }
            if (!location?.lat || !location?.lng) {
                throw new BadRequestError("Invalid location is set!");
            }

            const socketState = await rideController._getSocketState(user_id, "driver");

            if (!socketState?.hasActiveRide) {
                throw new BadRequestError("ERROR: DRIVER NOT JOINED TO RIDE ROOM!");
            }

            // Validate ride instance exists and belongs to driver
            const rideInstance = await RideInstanceRepository.findById(socketState.rideInstanceId);
            if (!rideInstance) {
                await redisService.clearUserRideState(user_id, "driver");
                throw new BadRequestError("INVALID RIDE STATE! Please join the ride again.");
            }

            if (rideInstance.driver_id !== driver_id) {
                await redisService.clearUserRideState(user_id, "driver");
                throw new BadRequestError("RIDE INSTANCE DOES NOT BELONG TO THIS DRIVER!");
            }

            if (rideInstance.group_id !== ride_group_id) {
                await redisService.clearUserRideState(user_id, "driver");
                throw new BadRequestError("RIDE GROUP MISMATCH! Please join the correct ride.");
            }

            if (rideInstance.status === "ended" || rideInstance.status === "cancelled") {
                await redisService.clearUserRideState(user_id, "driver");
                throw new BadRequestError(`RIDE IS ${rideInstance.status.toUpperCase()}! Cannot confirm checkpoint for inactive ride.`);
            }

            const order = await redisService.getRideOrderForRideInstance(rideInstance.id);

            if (!order || Object.keys(order).length === 0) {
                throw new BadRequestError("ERROR: THIS RIDE INSTANCE HAS NO CHECKPOINTS!");
            }

            const currentCheckpoint = order[checkpoint_index];
            if (!currentCheckpoint) {
                throw new BadRequestError("ERROR: THIS RIDE INSTANCE DOES NOT HAVE THIS CHECKPOINT!");
            }

            if (currentCheckpoint.status === "done") {
                throw new BadRequestError("ERROR: CHECKPOINT ALREADY CONFIRMED!");
            }

            const distance = getDistanceBetweenLocations(
                { location_lat: location.lat, location_lng: location.lng },
                { checkpoint_lat: currentCheckpoint.lat, checkpoint_lng: currentCheckpoint.lng }
            );
            
            if (distance > CHECKPOINT_RADIUS) {
                throw new BadRequestError(`ERROR: YOU ARE TOO FAR FROM CHECKPOINT! Distance: ${Math.round(distance)}m (Required: within ${CHECKPOINT_RADIUS}m)`);
            }

            if (["school", "child"].includes(currentCheckpoint.type)) {
                if (!children_ids || children_ids.length === 0) {
                    throw new BadRequestError("ERROR: MUST SPECIFY CHILDREN BEING PICKED UP/DELIVERED!");
                }

                const checkpointChildren = currentCheckpoint.children || [];
                const invalidChildren = children_ids.filter(childId => !checkpointChildren.includes(childId));

                if (invalidChildren.length > 0) {
                    throw new BadRequestError(`ERROR: Children with IDs [${invalidChildren.join(', ')}] do not belong to this house!`);
                }

                if (currentCheckpoint.type === "child") {
                    const locations = await RideGroupRepository.getAllLocationsById(rideInstance.group_id);
                    const parentGroup = locations.parentGroups.find(pg => pg.parent_id === currentCheckpoint.id);

                    if (!parentGroup || !parentGroup.childDetails) {
                        throw new BadRequestError("ERROR: Cannot verify children for this house!");
                    }

                    const validChildrenIds = parentGroup.childDetails.map(childDetail => childDetail.child_id);
                    const unverifiedChildren = children_ids.filter(childId => !validChildrenIds.includes(childId));

                    if (unverifiedChildren.length > 0) {
                        throw new BadRequestError(`ERROR: Children with IDs [${unverifiedChildren.join(', ')}] are not registered in this parent group!`);
                    }
                }
            }

            let status;
            let isRideComplete = false;

            if (checkpoint_index + 1 === Object.keys(order).length) {
                const allPreviousCheckpoints = Object.keys(order)
                    .map(index => parseInt(index))
                    .filter(index => index < checkpoint_index);
                
                const unconfirmedCheckpoints = allPreviousCheckpoints.filter(index => 
                    order[index].status !== "done"
                );

                if (unconfirmedCheckpoints.length > 0) {
                    throw new BadRequestError("ERROR: CONFIRM ALL CHECKPOINTS BEFORE FINISHING THE RIDE!");
                }

                status = `Finished: ${currentCheckpoint.type}`;
                isRideComplete = true;
            } else {
                if (currentCheckpoint.type === "child") {
                    const childCount = children_ids.length;
                    const direction = rideInstance.type === "to_school" ? "pickup" : "delivery";
                    status = `${direction}: ${childCount} child${childCount > 1 ? 'ren' : ''}`;
                } else {
                    status = `reached: ${currentCheckpoint.type}`;
                }
            }

            const childrenToRecord = ["school", "child"].includes(currentCheckpoint.type) ? children_ids : [];
            
            await RideHistoryRepository.createWithChildren({
                lat: location.lat,
                lng: location.lng,
                issued_at: new Date().toISOString().slice(0, 10),
                status,
                ride_instance_id: rideInstance.id,
                type: currentCheckpoint.type
            }, childrenToRecord);

            const newCheckpoint = {
                ...order[checkpoint_index],
                status: "done",
                confirmed_children: ["school", "child"].includes(currentCheckpoint.type) ? children_ids : undefined
            };

            await redisService.updateRideInstanceCheckpoint(rideInstance.id, checkpoint_index, newCheckpoint);

            const locationMap = {
                lat: parseFloat(location.lat),
                lng: parseFloat(location.lng),
                ts: Date.now()
            };

            await redisService.setLocationUpdates(socketState.rideRoomId, locationMap);

            const io = socketService.getIo();
            io.to(socketState.rideRoomId).emit("location_update", {
                type: isRideComplete ? "RIDE_COMPLETED" : "CHECKPOINT_CONFIRMED",
                message: isRideComplete ? "Ride has been completed successfully" : "Checkpoint has been confirmed",
                data: {
                    checkpointIndex: checkpoint_index,
                    checkpoint: newCheckpoint,
                    status,
                    isRideComplete,
                    confirmed_children: currentCheckpoint.type === "child" ? children_ids : undefined
                }
            });

            if (isRideComplete) {
                setTimeout(async () => {
                    await RideInstanceRepository.finishRide(rideInstance.id);
                    redisService.flushRideInstance(rideInstance.id, socketState.rideRoomId);
                    io.in(socketState.rideRoomId).socketsLeave(socketState.rideRoomId);
                    io.in(socketState.rideRoomId).disconnectSockets(true);
                }, 10000);
            }

            return res.success(isRideComplete ? "RIDE_COMPLETED" : "CHECKPOINT_CONFIRMED", {
                confirmed_children: currentCheckpoint.type === "child" ? children_ids : undefined,
                checkpointIndex: checkpoint_index,
                checkpoint: newCheckpoint,
                isRideComplete
            });

        } catch (error) {
            logger.error(`Error confirming checkpoint: ${error.message}`);
            next(error);
        }
    },

    completeRide: async (req, res, next) => {
        const driver_id = req.account.driver.id;
        const user_id = req.account.id;

        try {
            const socketState = await rideController._getSocketState(user_id, "driver");

            if (!socketState?.hasActiveRide) {
                throw new BadRequestError("You must join a ride first!");
            }

            // Validate ride instance exists and belongs to driver
            const rideInstance = await RideInstanceRepository.findById(socketState.rideInstanceId);
            if (!rideInstance) {
                await redisService.clearUserRideState(user_id, "driver");
                throw new BadRequestError("INVALID RIDE STATE! Please join the ride again.");
            }

            if (rideInstance.driver_id !== driver_id) {
                await redisService.clearUserRideState(user_id, "driver");
                throw new BadRequestError("RIDE INSTANCE DOES NOT BELONG TO THIS DRIVER!");
            }

            if (rideInstance.status === "ended" || rideInstance.status === "cancelled") {
                await redisService.clearUserRideState(user_id, "driver");
                throw new BadRequestError(`RIDE IS ALREADY ${rideInstance.status.toUpperCase()}!`);
            }

            const order = await redisService.getRideOrderForRideInstance(rideInstance.id);
            if (!order || Object.keys(order).length === 0) {
                throw new BadRequestError("This ride instance has no checkpoints!");
            }

            const rideHistoriesCount = await RideHistoryRepository.count({
                ride_instance_id: rideInstance.id
            });

            await RideInstanceRepository.finishRide(rideInstance.id);
            await redisService.flushRideInstance(rideInstance.id, socketState.rideRoomId);

            if (socketState.sockets.length > 0) {
                socketState.sockets.forEach(socket => {
                    socket.leave(socketState.rideRoomId);
                    socket.rideRoomId = null;
                    socket.rideInstanceId = null;
                    socket.disconnect(true);
                });

                for (const socket of socketState.sockets) {
                    await redisService.removeUserSocketConnection(user_id, socket.id);
                }
            }

            await redisService.clearUserRideState(user_id, "driver");

            const io = socketService.getIo();
            io.to(socketState.rideRoomId).emit("location_update", {
                type: "RIDE_COMPLETED",
                message: "Driver has completed the ride",
                data: {}
            });

            return res.success("Ride ended successfully", {});

        } catch (error) {
            logger.error(`Error completing ride: ${error.message}`);
            next(error);
        }
    },

    parentWatchRide: async (req, res, next) => {
        const { ride_group_id } = req.body;
        const parent_id = req.account.parent.id;
        const user_id = req.account.id;

        try {
            await rideController._cleanupStaleConnections(user_id, "parent");

            const socketState = await rideController._getSocketState(user_id, "parent");
            
            if (socketState?.hasActiveRide) {
                // Validate that the tracked ride instance actually exists
                const rideInstance = await RideInstanceRepository.findById(socketState.rideInstanceId);
                if (!rideInstance) {
                    await redisService.clearUserRideState(user_id, "parent");
                    throw new BadRequestError("INVALID RIDE STATE! The ride you were tracking no longer exists.");
                }

                if (rideInstance.group_id.toString() !== ride_group_id.toString()) {
                    await redisService.clearUserRideState(user_id, "parent");
                    throw new BadRequestError("RIDE GROUP MISMATCH! Please watch the correct ride.");
                }

                const order = await redisService.getRideOrderForRideInstance(rideInstance.id);
                const location = await redisService.getLatestLocationUpdate(socketState.rideRoomId);
                
                logger.debug(`Parent rejoined same ride successfully`);
                return res.success("Parent reconnected to existing ride", {
                    uid: socketState.rideRoomId,
                    driverLocation: location || {},
                    checkpointOrder: order,
                    reconnected: true
                });
            }

            if (!ride_group_id) {
                throw new BadRequestError("BAD REQUEST, MISSING ride_group_id!");
            }

            const rideInstance = await RideInstanceRepository.findActiveInstanceByParentAndGroup(parent_id, ride_group_id);
            
            if (!rideInstance) {
                throw new NotFoundError("NO ACTIVE INSTANCES, WAIT FOR DRIVER TO START!");
            }

            const uid = `driver:${rideInstance.driver_id}:${rideInstance.group_id}:${rideInstance.id}`;
            
            await redisService.setUserRideState(user_id, "parent", uid, rideInstance.id);

            await rideController._setupSocketsForRide(user_id, "parent", uid, rideInstance.id);

            const order = await redisService.getRideOrderForRideInstance(rideInstance.id);
            const location = await redisService.getLatestLocationUpdate(uid);

            return res.success("Parent successfully joined ride", {
                uid, 
                driverLocation: location || {}, 
                checkpointOrder: order,
                reconnected: false
            });
        } catch (error) {
            logger.error(`Error parent watching ride: ${error.message}`);
            next(error);
        }
    },

    adminWatchRide: async (req, res, next) => {
        const { ride_group_id } = req.body;
        const admin_id = req.account.admin.id;
        const user_id = req.account.id;

        try {
            if (!ride_group_id) {
                throw new BadRequestError("BAD REQUEST, MISSING ride_group_id!");
            }

            const rideInstance = await RideInstanceRepository.findActiveInstanceByGroup(ride_group_id);
            
            if (!rideInstance) {
                throw new NotFoundError("NO ACTIVE INSTANCES, WAIT FOR DRIVER TO START!");
            }

            const previousLocations = await RideInstanceLocationRepository.findAll({
                where: {
                    ride_instance_id: rideInstance.id
                }
            });

            const uid = `driver:${rideInstance.driver_id}:${rideInstance.group_id}:${rideInstance.id}`;
            
            await redisService.setUserRideState(user_id, "admin", uid, rideInstance.id);

            await rideController._setupSocketsForRide(user_id, "admin", uid, rideInstance.id);

            const order = await redisService.getRideOrderForRideInstance(rideInstance.id);
            const location = await redisService.getLatestLocationUpdate(uid);

            return res.success("Admin successfully joined ride", {
                uid, 
                driverLocation: location || {}, 
                checkpointOrder: order, 
                previousLocations,
                reconnected: false
            });
        } catch (error) {
            logger.error(`Error admin watching ride: ${error.message}`);
            next(error);
        }
    },

    adminWatchAllRides: async (req, res, next) => {
        const admin_id = req.account.admin.id;
        const user_id = req.account.id;

        try {
            const rideInstances = await RideInstanceRepository.findAllActiveInstances();
            
            if (!rideInstances) {
                throw new NotFoundError("NO ACTIVE INSTANCES, WAIT FOR DRIVERS TO START!");
            }

            const rideData = await Promise.all(rideInstances.map(async (rideInstance) => {
                const uid = `driver:${rideInstance.driver_id}:${rideInstance.group_id}:${rideInstance.id}`;
                const order = await redisService.getRideOrderForRideInstance(rideInstance.id);
                const location = await redisService.getLatestLocationUpdate(uid);
                
                return {
                    rideInstance,
                    uid,
                    driverLocation: location || {},
                    checkpointOrder: order
                };
            }));

            return res.success("Active rides fetched successfully", rideData);
        } catch (error) {
            logger.error(`Error admin watching all rides: ${error.message}`);
            next(error);
        }
    },

    driverCancelRide: async (req, res, next) => {
        const driver_id = req.account.driver.id;
        const user_id = req.account.id;

        try {
            const socketState = await rideController._getSocketState(user_id, "driver");

            if (!socketState?.hasActiveRide) {
                throw new BadRequestError("You must join a ride first!");
            }

            // Validate ride instance exists and belongs to driver
            const rideInstance = await RideInstanceRepository.findById(socketState.rideInstanceId);
            if (!rideInstance) {
                await redisService.clearUserRideState(user_id, "driver");
                throw new BadRequestError("INVALID RIDE STATE! Please join the ride again.");
            }

            if (rideInstance.driver_id !== driver_id) {
                await redisService.clearUserRideState(user_id, "driver");
                throw new BadRequestError("RIDE INSTANCE DOES NOT BELONG TO THIS DRIVER!");
            }

            if (rideInstance.status === "ended" || rideInstance.status === "cancelled") {
                await redisService.clearUserRideState(user_id, "driver");
                throw new BadRequestError(`RIDE IS ALREADY ${rideInstance.status.toUpperCase()}!`);
            }

            await RideInstanceRepository.cancelRideInstance(rideInstance.id);
            await redisService.flushRideInstance(rideInstance.id, socketState.rideRoomId);

            if (socketState.sockets.length > 0) {
                socketState.sockets.forEach(socket => {
                    socket.leave(socketState.rideRoomId);
                    socket.rideRoomId = null;
                    socket.rideInstanceId = null;
                    socket.disconnect(true);
                });

                for (const socket of socketState.sockets) {
                    await redisService.removeUserSocketConnection(user_id, socket.id);
                }
            }

            await redisService.clearUserRideState(user_id, "driver");

            const io = socketService.getIo();
            io.to(socketState.rideRoomId).emit("location_update", {
                type: "RIDE_CANCELLED",
                message: "Driver has cancelled the ride",
                data: {}
            });

            return res.success("Ride cancelled successfully", {});

        } catch (error) {
            logger.error(`Error cancelling ride: ${error.message}`);
            next(error);
        }
    },

    parentGetRideUpdates: async (req, res, next) => {
        const { ride_group_id } = req.params;
        const parent_id = req.account.parent.id;
        const user_id = req.account.id;

        try {
            if (!ride_group_id) {
                throw new BadRequestError("BAD REQUEST, MISSING ride_group_id!");
            }

            const socketState = await rideController._getSocketState(user_id, "parent");
            let rideInstance;
            let uid;

            if (socketState?.hasActiveRide) {
                // Validate that the tracked ride instance actually exists
                rideInstance = await RideInstanceRepository.findById(socketState.rideInstanceId);
                if (!rideInstance) {
                    await redisService.clearUserRideState(user_id, "parent");
                    throw new BadRequestError("INVALID RIDE STATE! The ride you were tracking no longer exists.");
                }

                if (rideInstance.group_id.toString() !== ride_group_id.toString()) {
                    await redisService.clearUserRideState(user_id, "parent");
                    throw new BadRequestError("RIDE GROUP MISMATCH! Please watch the correct ride.");
                }

                // Validate parent has access to this ride group
                const parentRideInstance = await RideInstanceRepository.findActiveInstanceByParentAndGroup(parent_id, ride_group_id);
                if (!parentRideInstance || parentRideInstance.id !== rideInstance.id) {
                    await redisService.clearUserRideState(user_id, "parent");
                    throw new BadRequestError("YOU DO NOT HAVE ACCESS TO THIS RIDE!");
                }

                uid = socketState.rideRoomId;
            } else {
                // Parent is not tracking, but might want to check if there's an active ride
                rideInstance = await RideInstanceRepository.findActiveInstanceByParentAndGroup(parent_id, ride_group_id);
                if (!rideInstance) {
                    throw new NotFoundError("NO ACTIVE INSTANCES FOR THIS RIDE GROUP");
                }
                uid = `driver:${rideInstance.driver_id}:${rideInstance.group_id}:${rideInstance.id}`;
            }

            // Validate that the ride instance is still active for location updates
            if (rideInstance.status === "ended" || rideInstance.status === "cancelled") {
                // Don't clear state for ended/cancelled rides, just return final status
                const finalStatus = rideInstance.status === "ended" ? "RIDE_COMPLETED" : "RIDE_CANCELLED";
                const finalMessage = rideInstance.status === "ended" ? "Ride has been completed" : "Ride has been cancelled";

                return res.success("Final ride status retrieved", {
                    type: finalStatus,
                    message: finalMessage,
                    data: {
                        locationMap: {},
                        checkpointReached: null,
                        checkpointOrder: {}
                    },
                    meta: {
                        rideInstance: {
                            id: rideInstance.id,
                            status: rideInstance.status,
                            type: rideInstance.type,
                            started_at: rideInstance.started_at,
                            ended_at: rideInstance.ended_at
                        },
                        progress: {
                            completed: 0,
                            total: 0,
                            percentage: 100
                        },
                        activeCheckpoint: null,
                        lastUpdated: Date.now(),
                        isTracking: socketState?.hasActiveRide || false
                    }
                });
            }

            // Get current ride data - this matches what socket sends
            const order = await redisService.getRideOrderForRideInstance(rideInstance.id);
            const driverLocation = await redisService.getLatestLocationUpdate(uid);

            // Calculate checkpoint reached (same logic as socket)
            let checkpointReached = null;
            if (driverLocation && Object.keys(order).length > 0) {
                let nearestDistance = Infinity;
                let nearestOriginalIndex = -1;

                Object.keys(order).forEach(originalIndex => {
                    const checkpoint = order[originalIndex];
                    const index = parseInt(originalIndex);
                    
                    if (checkpoint.status === "done" || !checkpoint.lat || !checkpoint.lng) return;
                    
                    const distance = getDistanceBetweenLocations(
                        { location_lat: driverLocation.lat, location_lng: driverLocation.lng },
                        { checkpoint_lat: checkpoint.lat, checkpoint_lng: checkpoint.lng }
                    );
                    
                    if (distance <= CHECKPOINT_RADIUS && distance < nearestDistance) {
                        nearestDistance = distance;
                        checkpointReached = {
                            ...checkpoint,
                            index: nearestOriginalIndex,
                            distance: nearestDistance
                        };
                        nearestOriginalIndex = index;
                    }
                });
            }

            // Determine ride status and message (like socket events)
            let updateType = "LOCATION_UPDATE";
            let message = "Driver location updated";

            if (checkpointReached) {
                updateType = "CHECKPOINT_REACHED";
                message = "Driver is near a checkpoint";
            }

            if (rideInstance.status === "ended") {
                updateType = "RIDE_COMPLETED";
                message = "Ride has been completed";
            } else if (rideInstance.status === "cancelled") {
                updateType = "RIDE_CANCELLED";
                message = "Ride has been cancelled";
            }

            // Calculate progress
            const totalCheckpoints = Object.keys(order).length;
            const completedCheckpoints = Object.values(order).filter(checkpoint => checkpoint.status === "done").length;
            const progressPercentage = totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0;

            // Find current active checkpoint
            const activeCheckpoint = Object.entries(order).find(([index, checkpoint]) => 
                checkpoint.status !== "done"
            );

            // Return data in same format as socket location_update event
            return res.success("Location update retrieved successfully", {
                type: updateType,
                message: message,
                data: {
                    locationMap: driverLocation || {},
                    checkpointReached: checkpointReached,
                    checkpointOrder: order
                },
                // Additional helpful info for REST clients
                meta: {
                    rideInstance: {
                        id: rideInstance.id,
                        status: rideInstance.status,
                        type: rideInstance.type,
                        started_at: rideInstance.started_at,
                        ended_at: rideInstance.ended_at
                    },
                    progress: {
                        completed: completedCheckpoints,
                        total: totalCheckpoints,
                        percentage: progressPercentage
                    },
                    activeCheckpoint: activeCheckpoint ? {
                        index: parseInt(activeCheckpoint[0]),
                        ...activeCheckpoint[1]
                    } : null,
                    lastUpdated: driverLocation?.ts || Date.now(),
                    isTracking: socketState?.hasActiveRide || false
                }
            });

        } catch (error) {
            logger.error(`Error getting ride location updates for parent: ${error.message}`);
            next(error);
        }
    },
};

module.exports = rideController;
