const logger = require("../../services/logging.service").getLogger();

const leaveRoom = (socket, roomId) => {
    socket.leave(roomId);
    logger.debug(`[Socket.IO] Socket ${socket.id} left chat room: ${roomId}`);
};

module.exports = {
    leaveRoom
};
