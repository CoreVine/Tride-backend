const ChatRoom = require("../../mongo-model/ChatRoom");
const RideGroupRepository = require("../../data-access/rideGroup");
const { ROLE_PERMISSION_CHAT_WITH_PARENT, ROLE_PERMISSION_CHAT_WITH_DRIVER } = require("../../utils/constants/admin-permissions");
const logger = require("../../services/logging.service").getLogger();

const verifyAndJoinRoom = async (socket, roomId) => {
    const chatRoom = await ChatRoom.findById(roomId);

    if (!chatRoom) {
        logger.error(`[Socket.IO] Room ${roomId} not found for join request.`);
        socket.emit("ack", `Unauthorized!`);
        return;
    }

    if (chatRoom.room_type === "ride_group") {
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
    } else if (chatRoom.room_type === "customer_support") {
        // only accounts that initiated the chat can join, as well as admins with permissions to do so
        if (socket.accountType !== "admin" && socket.userId !== chatRoom.participants[0].user_id) {
            logger.error(
                `[Socket.IO] User ${socket.userId} not authorized to join customer support room ${roomId}.`
            );
            socket.emit("ack", `Unauthorized!`);
            return;
        }

        
        if (socket.accountType === "admin") {
            const permissionName = chatRoom.participants[0].user_type ===  "parent" ? ROLE_PERMISSION_CHAT_WITH_PARENT : ROLE_PERMISSION_CHAT_WITH_DRIVER;

            if (!socket.admin.permissions.some((p) => p.name === permissionName)) {
                logger.error(
                    `[Socket.IO] Admin ${socket.userId} does not have permission to join customer support room ${roomId}.`
                );
                socket.emit("ack", `Unauthorized!`);
                return;
            } else {
                logger.info(
                    `[Socket.IO] Admin ${socket.userId} authorized to join customer support room ${roomId}.`
                );
            }
        }
    }

    socket.join(roomId);
    logger.info(
        `[Socket.IO] Socket ${socket.id} joined chat room: ${roomId}`
    );
    socket.emit("ack", "OK");
};

module.exports = {
    verifyAndJoinRoom
};