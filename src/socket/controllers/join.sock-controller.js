const ChatRoom = require("../../mongo-model/ChatRoom");
const RideGroupRepository = require("../../data-access/rideGroup");
const logger = require("../../services/logging.service").getLogger();

const verifyAndJoinRoom = async (socket, roomId) => {
    const chatRoom = await ChatRoom.findById(roomId);

    if (!chatRoom) {
        logger.error(`[Socket.IO] Room ${roomId} not found for join request.`);
        socket.emit("ack", `Unauthorized!`);
        return;
    }

    const group = await RideGroupRepository.findIfAccountIdInsideGroup(
        chatRoom.ride_group_id, socket.userId, socket.accountType);

    if (!group) {
        logger.error(
        `[Socket.IO] User ${socket.userId} not authorized to join room ${roomId}.`
        );

        socket.emit("ack", `Unauthorized!`);
        return;
    }

    logger.info(
        `[Socket.IO] User ${socket.userId} authorized to join room ${roomId}.
        Joining room...`
    );

    socket.join(roomId);
    logger.info(
        `[Socket.IO] Socket ${socket.id} joined chat room: ${roomId}`
    );
    socket.emit("ack", "OK");
};

module.exports = {
    verifyAndJoinRoom
};