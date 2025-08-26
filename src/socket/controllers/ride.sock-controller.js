const RideInstanceRepository = require("../../data-access/rideInstance");
const RideInstanceLocationRepository = require("../../data-access/rideInstanceLocation");
const RideGroupRepository = require("../../data-access/rideGroup");
const RideHistoryRepository = require("../../data-access/rideHistory");


const redisService = require("../../services/redis.service");
const logger = require("../../services/logging.service").getLogger();

const { getDistanceBetweenLocations } = require("../../domain/checkpoint/detector");
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
                    parent_id: parent.parent_id,
                    children: parent.childDetails.map(childDetail => childDetail.child_id) || []
                };
            });
            
            order = await getOptimizedRouteWithSteps({
                ...location,
                id: socket.driver.id
            }, parentsLocations, locations.school, rideInstance.type);

            // driver location is a finished checkpoint already
            order[0].status = "done";

            // Check if this ride instance has existing history (Redis data loss scenario)
            const existingHistory = await RideHistoryRepository.findAllByRideInstanceId(rideInstance.id);
            
            if (existingHistory && existingHistory.length > 0) {
                // Reconstruct order status based on ride history
                for (const historyRecord of existingHistory) {
                    // Find corresponding checkpoint in order
                    const checkpointIndex = Object.keys(order).find(index => {
                        const checkpoint = order[index];
                        const typeMatch = checkpoint.type === historyRecord.type;

                        // For child checkpoints, match by parent ID from delivered children
                        if (historyRecord.type === 'child' && historyRecord.deliveredChildren?.length > 0) {
                            // Get parent ID from the first delivered child (all children at same house have same parent)
                            const parentId = historyRecord.deliveredChildren[0].child?.parent_id;
                            return typeMatch && checkpoint.id === parentId;
                        }

                        // For school and driver checkpoints, just match by type
                        return typeMatch;
                    });

                    if (checkpointIndex !== undefined) {
                        // Mark checkpoint as done
                        order[checkpointIndex].status = "done";

                        // If this is a child or school checkpoint, add confirmed children data
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
            lat: parseFloat(jsonPayload.location.lat),
            lng: parseFloat(jsonPayload.location.lng),
            ts: Date.now()
        };

        if (Math.abs(locationMap.lat) > 90 || Math.abs(locationMap.lng) > 180) {
            return socket.emit("ack", { type: "LOCATION_UPDATE_ERROR", message: "Invalid GPS coordinates detected!", data: null });
        }

        socket.rideRoomId = uid;
        socket.rideInstanceId = rideInstance.id;

        await redisService.setLocationUpdates(socket.rideRoomId, locationMap);

        socket.driver.location = locationMap;

        socket.join(uid);
        
        socket.to(uid).emit("location_update", {
            type: "DRIVER_STATUS",
            message: "Driver has joined!",
            data: {
                checkpointOrder: order
            }
        });
    
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

        await RideInstanceLocationRepository.create({
            ride_instance_id: socket.rideInstanceId,
            lat: locationMap.lat,
            lng: locationMap.lng,
        })
  

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
            // TODO: SEND NOTIFICATIONS UNDER THE CIRCUMSTANCES MENTIONED BELOW
            /** send a notification in the following cases:
             * 1. If the driver has reached the parent's house
             * 2. If the driver has reached the school
             * 3. If the driver has started a ride
             * 4. If the next checkpoint is the parent's house
            */
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

        const { ride_group_id, location, children_ids = [] } = jsonPayload;
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

        if (["school", "child"].includes(currentCheckpoint.type)) {
            if (!children_ids || children_ids.length === 0) {
                return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: "ERROR: MUST SPECIFY CHILDREN BEING PICKED UP/DELIVERED!", data: null });
            }

            const checkpointChildren = currentCheckpoint.children || [];
            const invalidChildren = children_ids.filter(childId => !checkpointChildren.includes(childId));

            if (invalidChildren.length > 0) {
                return socket.emit("ack", { 
                    type: "CHECKPOINT_CONFIRM_ERROR", 
                    message: `ERROR: Children with IDs [${invalidChildren.join(', ')}] do not belong to this house!`, 
                    data: null 
                });
            }
        }

        if (currentCheckpoint.type === "child") {
            // Verify children exist in the parent group (double-check against database)
            try {
                const locations = await RideGroupRepository.getAllLocationsById(rideInstance.group_id);
                const parentGroup = locations.parentGroups.find(pg => pg.parent_id === currentCheckpoint.id);

                if (!parentGroup || !parentGroup.childDetails) {
                    return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: "ERROR: Cannot verify children for this house!", data: null });
                }

                const validChildrenIds = parentGroup.childDetails.map(childDetail => childDetail.child_id);
                const unverifiedChildren = children_ids.filter(childId => !validChildrenIds.includes(childId));

                if (unverifiedChildren.length > 0) {
                    return socket.emit("ack", { 
                        type: "CHECKPOINT_CONFIRM_ERROR", 
                        message: `ERROR: Children with IDs [${unverifiedChildren.join(', ')}] are not registered in this parent group!`, 
                        data: null 
                    });
                }
            } catch (error) {
                logger.error("Error verifying children in parent group:", error);
                return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: "ERROR: Failed to verify children data!", data: null });
            }
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
            if (currentCheckpoint.type === "child") {
                // For child names, we would need to fetch from database or store names in checkpoint
                const childrenText = children_ids.join(', ');

                const direction = rideInstance.type === "to_school" 
                    ? `picked up children with IDs: ${childrenText} from home` 
                    : `delivered children with IDs: ${childrenText} to home`;

                status = `Continued trip: ${direction}`;
            } else {
                status = `Continued trip: reached ${currentCheckpoint.type}`;
            }
            isRideComplete = false;
        }

        // Create ride history with children delivery records
        const rideHistoryData = {
            lat: location.lat,
            lng: location.lng,
            issued_at: new Date().toISOString().slice(0, 10),
            type: currentCheckpoint.type,
            status,
            ride_instance_id: rideInstance.id
        };

        const childrenToRecord = ["school", "child"].includes(currentCheckpoint.type) ? children_ids : [];
        await RideHistoryRepository.createWithChildren(rideHistoryData, childrenToRecord);

        const newCheckpoint = {
           ...order[current_index],
           status: "done",
           confirmed_children: ["school", "child"].includes(currentCheckpoint.type) ? children_ids : undefined
        };

        await redisService.updateRideInstanceCheckpoint(rideInstance.id, current_index, newCheckpoint);

        socket.emit("ack", { 
            type: isRideComplete ? "RIDE_COMPLETED" : "CHECKPOINT_CONFIRMED", 
            message: isRideComplete ? "RIDE_COMPLETED" : "CHECKPOINT_CONFIRMED",
            data: { confirmed_children: currentCheckpoint.type === "child" ? children_ids : undefined }
        });
        socket.to(socket.rideRoomId).emit("location_update", {
            type: isRideComplete ? "RIDE_COMPLETED" : "CHECKPOINT_CONFIRMED",
            message: isRideComplete ? "Ride has been completed successfully" : "Checkpoint has been confirmed",
            data: {
                checkpointIndex: current_index,
                checkpoint: newCheckpoint,
                status,
                isRideComplete,
                confirmed_children: currentCheckpoint.type === "child" ? children_ids : undefined
            }
        });

        // update location of driver
        const locationMap = {
            lat: parseFloat(jsonPayload.location.lat),
            lng: parseFloat(jsonPayload.location.lng),
            ts: Date.now()
        };

        await redisService.setLocationUpdates(socket.rideRoomId, locationMap);

        socket.driver.location = locationMap;

        if (isRideComplete) {
            // leave room & close all sockets after the ride, to save up resources
            setTimeout(async () => {
                await RideInstanceRepository.finishRide(rideInstance.id);
                redisService.flushRideInstance(rideInstance.id, socket.rideRoomId);
                io.in(socket.rideRoomId).socketsLeave(socket.rideRoomId);
                io.in(socket.rideRoomId).disconnectSockets(true);
            }, 10000);
        }
    } catch (error) {
        logger.warn(error);
        return socket.emit("ack", { type: "CHECKPOINT_CONFIRM_ERROR", message: `ERROR: ${error.message || 'Unknown error'}`, data: null });
    }
}

const adminVerifyAndJoinRide = async (socket, payload) => {
    try {
        /* if (socket.rideRoomId && socket.rideInstanceId)
            return socket.emit("ack", { type: "ADMIN_JOIN_ERROR", message: "ALREADY JOINED RIDE", data: null }); */

        const jsonPayload = JSON.parse(payload) || {};

        if (!jsonPayload.ride_group_id)
            return socket.emit("ack", { type: "ADMIN_JOIN_ERROR", message: "BAD REQUEST, MISSING ride_group_id!", data: null });
        if (socket.accountType !== "admin")
            return socket.emit("ack", { type: "ADMIN_JOIN_ERROR", message: "Unauthorized!", data: null });
    
        const rideInstance = await RideInstanceRepository.findActiveInstanceByGroup(jsonPayload.ride_group_id);
    
        if (!rideInstance)
            return socket.emit("ack", { type: "ADMIN_JOIN_ERROR", message: "NO ACTIVE INSTANCES, WAIT FOR DRIVER TO START!", data: null });
        
        const previousLocations = await RideInstanceLocationRepository.findAll({
            where: {
                ride_instance_id: rideInstance.id
            }
        })
    
        const uid = `driver:${rideInstance.driver_id}:${rideInstance.group_id}:${rideInstance.id}`;
        
        socket.join(uid);
    
        socket.rideRoomId = uid;
        socket.rideInstanceId = rideInstance.id;
    
        const order = await redisService.getRideOrderForRideInstance(rideInstance.id);
    
        const location = await redisService.getLatestLocationUpdate(uid);
    
        return socket.emit("ack", { type: "ADMIN_JOIN_SUCCESS", message: "Admin successfully joined ride", data: { uid, driverLocation: location || {}, checkpointOrder: order, previousLocations } });
    } catch (error) {
        logger.warn(error);
        return socket.emit("ack", { type: "ADMIN_JOIN_ERROR", message: `ERROR: ${error.message || 'Unknown error'}`, data: null });
    }
}

const adminVerifyAndViewAll = async (socket) => {
    try {

        if (socket.accountType !== "admin")
            return socket.emit("ack", { type: "ADMIN_FETCH_ALL_ERROR", message: "Unauthorized!", data: null });
    
        const rideInstances = await RideInstanceRepository.findAllActiveInstances();
    
        if (!rideInstances)
            return socket.emit("ack", { type: "ADMIN_FETCH_ALL_ERROR", message: "NO ACTIVE INSTANCES, WAIT FOR DRIVERS TO START!", data: null });
        
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
        }))

        return socket.emit("ack", { type: "ADMIN_FETCH_ALL_SUCCESS", message: "Active rides fetched successfully", data: rideData });
        
    } catch (error) {
        logger.warn(error);
        return socket.emit("ack", { type: "ADMIN_FETCH_ALL_ERROR", message: `ERROR: ${error.message || 'Unknown error'}`, data: null });
    }
}

const driverCancelActiveRide = async (socket) => {
    try {
        if (socket.accountType !== "driver")
            return socket.emit("ack", { type: "DRIVER_CANCEL_ERROR", message: "Unauthorized!", data: null });
        if (!socket.rideRoomId || !socket.rideInstanceId)
            return socket.emit("ack", { type: "DRIVER_CANCEL_ERROR", message: "You must join a ride first!", data: null });

        const rideInstance = await RideInstanceRepository.findActiveInstanceById(socket.rideInstanceId);
        
        if (!rideInstance)
            return socket.emit("ack", { type: "DRIVER_CANCEL_ERROR", message: "No active ride found!", data: null });

        await RideInstanceRepository.cancelRideInstance(rideInstance.id);

        await redisService.flushRideInstance(rideInstance.id, socket.rideRoomId);

        socket.to(socket.rideRoomId).emit("location_update", {
            type: "RIDE_CANCELLED",
            message: "Driver has cancelled the ride",
            data: {}
        });

        socket.leave(socket.rideRoomId);
        socket.rideRoomId = null;
        socket.rideInstanceId = null;

        return socket.emit("ack", { type: "RIDE_CANCEL_SUCCESS", message: "Ride cancelled successfully", data: {} });
    } catch (error) {
        logger.warn(error);
        return socket.emit("ack", { type: "DRIVER_CANCEL_ERROR", message: `ERROR: ${error.message || 'Unknown error'}`, data: null });
    }
}

const driverEndActiveRide = async (socket) => {
    try {
        if (socket.accountType !== "driver")
            return socket.emit("ack", { type: "DRIVER_END_ERROR", message: "Unauthorized!", data: null });
        if (!socket.rideRoomId || !socket.rideInstanceId)
            return socket.emit("ack", { type: "DRIVER_END_ERROR", message: "You must join a ride first!", data: null });

        const rideInstance = await RideInstanceRepository.findById(socket.rideInstanceId);
        
        if (!rideInstance)
            return socket.emit("ack", { type: "DRIVER_END_ERROR", message: "No active ride found!", data: null });

        const order = await redisService.getRideOrderForRideInstance(rideInstance.id);

        if (!order || Object.keys(order).length === 0)
            return socket.emit("ack", { type: "DRIVER_END_ERROR", message: "This ride instance has no checkpoints!", data: null });

        const rideHistoriesCount = await RideHistoryRepository.count({
            ride_instance_id: rideInstance.id
        });

/*         if (rideHistoriesCount !== Object.keys(order).length)
            return socket.emit("ack", { type: "DRIVER_END_ERROR", message: "Confirm all checkpoints before finishing the ride!", data: null });
 */
        await RideInstanceRepository.finishRide(rideInstance.id);

        await redisService.flushRideInstance(rideInstance.id, socket.rideRoomId);

        socket.to(socket.rideRoomId).emit("location_update", {
            type: "RIDE_COMPLETED",
            message: "Driver has completed the ride",
            data: {}
        });

        socket.leave(socket.rideRoomId);
        socket.rideRoomId = null;
        socket.rideInstanceId = null;

        return socket.emit("ack", { type: "RIDE_END_SUCCESS", message: "Ride ended successfully", data: {} });
    } catch (error) {
        logger.warn(error);
        return socket.emit("ack", { type: "DRIVER_END_ERROR", message: `ERROR: ${error.message || 'Unknown error'}`, data: null });
    }
}

module.exports = {
    driverVerifyAndJoinRide,
    parentVerifyAndJoinRide,
    relayLocationUpdates,
    confirmCheckPoint,
    adminVerifyAndJoinRide,
    driverCancelActiveRide,
    adminVerifyAndViewAll,
    driverEndActiveRide
};
