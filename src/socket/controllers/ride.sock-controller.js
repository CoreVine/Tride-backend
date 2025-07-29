const RideInstanceRepository = require("../../data-access/rideInstance");
const { setLocationUpdates } = require("../../services/redis.service");
const { ROLE_PERMISSION_CHAT_WITH_PARENT, ROLE_PERMISSION_CHAT_WITH_DRIVER } = require("../../utils/constants/admin-permissions");
const logger = require("../../services/logging.service").getLogger();

const driverVerifyAndJoinRide = async (socket) => {
    if (socket.accountType !== "driver")
        return socket.emit("ack", `Unauthorized!`);

    const rideInstance = await RideInstanceRepository.findActiveInstanceByDriverId(socket.driver.id);

    if (!rideInstance)
        return socket.emit("ack", `NO ACTIVE INSTANCES, CREATE ONE FIRST!`);

    if (rideInstance.status === "started")
        await rideInstance.update({
            status: "active"
        });

    // create a ride instance socket room for the driver
    // driver:driverId:rideGroupId:rideInstanceId
    const uid = `driver:${rideInstance.driver_id}:${rideInstance.group_id}:${rideInstance.id}`;
    socket.join(uid);

    socket.rideRoomId = uid;
    socket.rideInstanceId = rideInstance.id;

    return socket.emit("ack", `OK:${uid}`);
}

const parentVerifyAndJoinRide = async (socket) => {
    if (socket.accountType !== "parent")
        return socket.emit("ack", `Unauthorized!`);

    const rideInstance = await RideInstanceRepository.findActiveInstanceByParentId(socket.parent.id);

    if (!rideInstance)
        return socket.emit("ack", `NO ACTIVE INSTANCES, WAIT FOR DRIVER TO START!`);

    // TODO: ADD INACTIVITY
    const uid = `driver:${rideInstance.driver_id}:${rideInstance.group_id}:${rideInstance.id}`;
    socket.join(uid);

    socket.rideRoomId = uid;
    socket.rideInstanceId = rideInstance.id;

    // TODO: GET LAST KNOWN LOCATION FROM REDIS IF EXISTS

    return socket.emit("ack", `OK:${uid}`);
}

// driver operations
const relayLocationUpdates = async (socket, location) => {
    if (!socket.rideRoomId || socket.accountType !== "driver")
        return socket.emit("ack", "Unauthorized");

    const locationMap = {
        lat: location.lat,
        lng: location.lng,
        ts: Date.now()
    };
    
    // TODO: Handle geo-fencing
    // TODO: SAVE LAST KNOWN LOCATION ON REDIS
    setLocationUpdates(socket.rideRoomId, locationMap);
    // TODO: SAVE ALL CHECKPOINTS ON REDIS
    socket.to(socket.rideRoomId).emit("location_update", locationMap);
}

const adminVerifyAndJoinRide = async (socket) => {
    
}

module.exports = {
    driverVerifyAndJoinRide,
    parentVerifyAndJoinRide,
    relayLocationUpdates
};
