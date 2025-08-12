const RideInstanceRepository = require("../../data-access/rideInstance");
const RideGroupRepository = require("../../data-access/rideGroup");
const RideHistoryRepository = require("../../data-access/rideHistory");
const redisService = require("../../services/redis.service");
const logger = require("../../services/logging.service").getLogger();
const { 
    ROLE_PERMISSION_CHAT_WITH_PARENT, 
    ROLE_PERMISSION_CHAT_WITH_DRIVER 
} = require("../../utils/constants/admin-permissions");
const { getDistanceBetweenLocations, isLocationCloseToCheckpoint } = require("../../domain/checkpoint/detector");
const { getOptimizedRouteWithSteps } = require("../../utils/openRoutesService");
const { CHECKPOINT_RADIUS } = require("../../utils/constants/ride");

const driverVerifyAndJoinRide = async (socket, payload) => { 
    try {
        if (socket.rideRoomId && socket.rideInstanceId)
            return socket.emit("ack", { type: "DRIVER_JOIN_ERROR", message: "ALREADY JOINED RIDE", data: null });

        const jsonPayload = JSON.parse(payload) || {};
        
        if (!jsonPayload.ride_group_id)
            return socket.emit("ack", { type: "DRIVER_JOIN_ERROR", message: "BAD REQUEST, MISSING ride_group_id!", data: null });
        if (socket.accountType !== "driver")
            return socket.emit("ack", { type: "DRIVER_JOIN_ERROR", message: "Unauthorized!", data: null });
        if (!jsonPayload.location?.lat || !jsonPayload.location?.lng)
            return socket.emit("ack", { type: "DRIVER_JOIN_ERROR", message: "Invalid location is set!", data: null });

        const { ride_group_id, location } = jsonPayload;
    
        const rideInstance = await RideInstanceRepository.findActiveInstanceByRideGroupAndDriver(ride_group_id, socket.driver.id);

        if (!rideInstance)
            return socket.emit("ack", { type: "DRIVER_JOIN_ERROR", message: "NO ACTIVE INSTANCES, CREATE ONE FIRST!", data: null });

        const uid = `driver:${rideInstance.driver_id}:${rideInstance.group_id}:${rideInstance.id}`;
        let order = await redisService.getRideOrderForRideInstance(rideInstance.id);

        if (!Object.keys(order).length) {
            const locations = await RideGroupRepository.getAllLocationsById(rideInstance.group_id);
    
            if (!locations || !locations.parentGroups || !locations.school)
                return socket.emit("ack", { type: "DRIVER_JOIN_ERROR", message: "BAD REQUEST, THIS DRIVER HAS NO LOCATIONS!", data: null });
    
            const parentsLocations = locations.parentGroups.map(parent => { 
                return {
                    lat: parent.home_lat,
                    lng: parent.home_lng,
                    parent_id: parent.parent_id
                };
            });
            
            order = await getOptimizedRouteWithSteps({
                ...location,
                id: socket.driver.id
            }, parentsLocations, locations.school, rideInstance.type);

            // driver location is a finished checkpoint already
            order[0].status = "done";
   
            await redisService.setRideOrderForRideInstance(rideInstance.id, order, order.length);
        }

        if (rideInstance.status === "started") {
            await RideInstanceRepository.startNewRide(rideInstance, location);
        }

        socket.join(uid);
        
        socket.to(uid).emit("location_update", {
            type: "DRIVER_STATUS",
            message: "Driver has joined!",
            data: {
                checkpointOrder: order
            }
        });
    
        socket.rideRoomId = uid;
        socket.rideInstanceId = rideInstance.id;
    
        return socket.emit("ack", { type: "DRIVER_JOIN_SUCCESS", message: "Driver successfully joined ride", data: { uid, order, direction: rideInstance.type } });
    } catch (error) {
        logger.warn(error);
        return socket.emit("ack", { type: "DRIVER_JOIN_ERROR", message: "ERROR!", data: null });
    }
}

const parentVerifyAndJoinRide = async (socket, payload) => {
    try {
        if (socket.rideRoomId && socket.rideInstanceId)
            return socket.emit("ack", { type: "PARENT_JOIN_ERROR", message: "ALREADY JOINED RIDE", data: null });

        const jsonPayload = JSON.parse(payload) || {};

        if (!jsonPayload.ride_group_id)
            return socket.emit("ack", { type: "PARENT_JOIN_ERROR", message: "BAD REQUEST, MISSING ride_group_id!", data: null });
        if (socket.accountType !== "parent")
            return socket.emit("ack", { type: "PARENT_JOIN_ERROR", message: "Unauthorized!", data: null });
    
        const rideInstance = await RideInstanceRepository.findActiveInstanceByParentAndGroup(socket.parent.id, jsonPayload.ride_group_id);
    
        if (!rideInstance)
            return socket.emit("ack", { type: "PARENT_JOIN_ERROR", message: "NO ACTIVE INSTANCES, WAIT FOR DRIVER TO START!", data: null });
    
        const uid = `driver:${rideInstance.driver_id}:${rideInstance.group_id}:${rideInstance.id}`;
        
        socket.join(uid);
    
        socket.rideRoomId = uid;
        socket.rideInstanceId = rideInstance.id;
    
        const order = await redisService.getRideOrderForRideInstance(rideInstance.id);
    
        const location = await redisService.getLatestLocationUpdate(uid);
    
        return socket.emit("ack", { type: "PARENT_JOIN_SUCCESS", message: "Parent successfully joined ride", data: { uid, driverLocation: location || {}, checkpointOrder: order } });
    } catch (error) {
        logger.warn(error);
        return socket.emit("ack", { type: "PARENT_JOIN_ERROR", message: `ERROR: ${error.message || 'Unknown error'}`, data: null });
    }
}

const relayLocationUpdates = async (socket, payload) => {
    if (socket.accountType !== "driver")
        return socket.emit("ack", { type: "LOCATION_UPDATE_ERROR", message: "Unauthorized", data: null });

    if (!socket.rideRoomId || !socket.rideInstanceId)
        return socket.emit("ack", { type: "LOCATION_UPDATE_ERROR", message: "DRIVER MUST JOIN A RIDE FIRST BEFORE RELAYING LOCATIONS!", data: null });

    try {
        const jsonPayload = JSON.parse(payload) || {};

        if (!jsonPayload.location?.lat || !jsonPayload.location?.lng)
            return socket.emit("ack", { type: "LOCATION_UPDATE_ERROR", message: "Invalid location coordinates provided!", data: null });

        const locationMap = {
            lat: parseFloat(jsonPayload.location.lat),
            lng: parseFloat(jsonPayload.location.lng),
            ts: Date.now()
        };

        if (Math.abs(locationMap.lat) > 90 || Math.abs(locationMap.lng) > 180) {
            return socket.emit("ack", { type: "LOCATION_UPDATE_ERROR", message: "Invalid GPS coordinates detected!", data: null });
        }

        await redisService.setLocationUpdates(socket.rideRoomId, locationMap);

        socket.driver.location = locationMap;

        let fullOrder;
        try {
            fullOrder = await redisService.getRideOrderForRideInstance(socket.rideInstanceId);
        } catch (redisError) {
            logger.error("Failed to get ride order from Redis", {
                instanceId: socket.rideInstanceId,
                error: redisError.message
            });
            return socket.emit("ack", { type: "LOCATION_UPDATE_ERROR", message: "Failed to retrieve ride route data. Please rejoin the ride.", data: null });
        }

        if (!fullOrder || Object.keys(fullOrder).length === 0) {
            return socket.emit("ack", { type: "LOCATION_UPDATE_ERROR", message: "Route data unavailable. Please restart the ride.", data: null });
        }
        
        let nearestCheckpoint = null;
        let nearestDistance = Infinity;
        let nearestOriginalIndex = -1;

        Object.keys(fullOrder).forEach(originalIndex => {
            const checkpoint = fullOrder[originalIndex];
            const index = parseInt(originalIndex);
            
            if (checkpoint.status === "done") return;

            if (!checkpoint.lat || !checkpoint.lng) {
                logger.warn(`Invalid checkpoint coordinates at index ${index}`);
                return;
            }
            
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

        if (nearestOriginalIndex !== -1) {
            return socket.to(socket.rideRoomId).emit("location_update", {
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
            return socket.to(socket.rideRoomId).emit("location_update", {
                type: "LOCATION_UPDATE",
                message: "Driver location updated",
                data: {
                    locationMap,
                    checkpointReached: null
                }
            });
        }
    } catch (parseError) {
        logger.error("Location update parsing error", {
            payload,
            error: parseError.message
        });
        return socket.emit("ack", { type: "LOCATION_UPDATE_ERROR", message: parseError.message, data: null });
    }
}

const confirmCheckPoint = async (socket, io, payload) => {
    try {
        const jsonPayload = JSON.parse(payload) || {};
        
        if (!jsonPayload.ride_group_id)
            return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: "BAD REQUEST, MISSING ride_group_id!", data: null });
        if (typeof jsonPayload.checkpoint_index !== "number")
            return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: "BAD REQUEST, MISSING checkpoint_index!", data: null });
        if (socket.accountType !== "driver")
            return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: "Unauthorized!", data: null });
        if (!jsonPayload.location?.lat || !jsonPayload.location?.lng)
            return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: "Invalid location is set!", data: null });
        if (!socket.rideRoomId || !socket.rideInstanceId)
            return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: "ERROR: DRIVER NOT JOINED TO RIDE ROOM!", data: null });

        const { ride_group_id, location } = jsonPayload;
        const rideInstance = await RideInstanceRepository.findActiveInstanceByRideGroupAndDriver(ride_group_id, socket.driver.id);
    
        if (!rideInstance)
            return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: "NO ACTIVE INSTANCES, CREATE ONE FIRST!", data: null });

        const order = await redisService.getRideOrderForRideInstance(rideInstance.id);

        if (!order || Object.keys(order).length === 0)
            return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: "ERROR: THIS RIDE INSTANCE HAS NO CHECKPOINTS!", data: null });

        const current_index = jsonPayload.checkpoint_index;
        const currentCheckpoint = order[current_index];

        if (!currentCheckpoint)
            return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: "ERROR: THIS RIDE INSTANCE DOES NOT HAVE THIS CHECKPOINT!", data: null });

        if (currentCheckpoint.status === "done")
            return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: "ERROR: CHECKPOINT ALREADY CONFIRMED!", data: null });

        const distance = getDistanceBetweenLocations(
            { location_lat: location.lat, location_lng: location.lng },
            { checkpoint_lat: currentCheckpoint.lat, checkpoint_lng: currentCheckpoint.lng }
        );
        
        if (distance > CHECKPOINT_RADIUS) {
            return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: `ERROR: YOU ARE TOO FAR FROM CHECKPOINT! Distance: ${Math.round(distance)}m`, data: null });
        }

        let status;
        let isRideComplete = false;

        if (current_index + 1 === Object.keys(order).length) {
            const rideHistoriesCount = await RideHistoryRepository.count({
                ride_instance_id: rideInstance.id
            });

            if (rideHistoriesCount !== Object.keys(order).length - 1)
                return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: "ERROR: CONFIRM ALL CHECKPOINTS BEFORE FINISHING THE RIDE!", data: null });

            status = `Finished trip. End destination: ${currentCheckpoint.type}`;
            isRideComplete = true;
        } else {
            const direction = rideInstance.type === "to_school" 
                ? `picked up child ID: ${currentCheckpoint.id} from home` 
                : `delivered child with ID: ${currentCheckpoint.id} to home`;

            status = `Continued trip: ${direction}`;
            isRideComplete = false;
        }

        await RideHistoryRepository.create({
            lat: location.lat,
            lng: location.lng,
            issued_at: new Date().toISOString().slice(0, 10),
            type: currentCheckpoint.type,
            status,
            ride_instance_id: rideInstance.id
        });

        const newCheckpoint = {
           ...order[current_index],
           status: "done"
        };

        await redisService.updateRideInstanceCheckpoint(rideInstance.id, current_index, newCheckpoint);

        socket.emit("ack", { 
            type: isRideComplete ? "RIDE_COMPLETED" : "CHECKPOINT_CONFIRMED", 
            message: isRideComplete ? "RIDE_COMPLETED" : "CHECKPOINT_CONFIRMED",
            data: null
        });
        socket.to(socket.rideRoomId).emit("location_update", {
            type: isRideComplete ? "RIDE_COMPLETED" : "CHECKPOINT_CONFIRMED",
            message: isRideComplete ? "Ride has been completed successfully" : "Checkpoint has been confirmed",
            data: {
                checkpointIndex: current_index,
                checkpoint: newCheckpoint,
                status,
                isRideComplete
            }
        });

        if (isRideComplete) {
            await RideInstanceRepository.finishRide(rideInstance.id);
            redisService.flushRideInstance(rideInstance.id, socket.rideRoomId);
            io.in(socket.rideRoomId).socketsLeave(socket.rideRoomId);
        }

    } catch (error) {
        logger.warn(error);
        return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: `ERROR: ${error.message || 'Unknown error'}`, data: null });
    }
}

const adminVerifyAndJoinRide = async (socket) => {
    // EMPTY FUNCTION - NOT IMPLEMENTED
}

const driverCancelActiveRide = async (socket) => {
    // EMPTY FUNCTION - NOT IMPLEMENTED
}

module.exports = {
    driverVerifyAndJoinRide,
    parentVerifyAndJoinRide,
    relayLocationUpdates,
    confirmCheckPoint
};
