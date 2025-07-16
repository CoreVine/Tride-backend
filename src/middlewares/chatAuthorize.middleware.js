const { NotFoundError, BadRequestError, ForbiddenError } = require("../utils/errors/types/Api.error");
const RideGroupRepository = require("../data-access/rideGroup");
const ChatRoom = require("../mongo-model/ChatRoom");

const isInsideChat = async (req, res, next) => {
    try {
        const { chatRoomId } = req.params;
        const userId = req.userId;
    
        const chatRoom = await ChatRoom.findById(chatRoomId);
    
        if (!chatRoom) {
            throw new NotFoundError("Chat room not found");
        }
    
        const group = await RideGroupRepository.findIfAccountIdInsideGroup(
            chatRoom.ride_group_id, userId, req.accountType);
        
        if (!group) {
            throw new NotFoundError("You are not authorized to access this chat room");
        }
    
        return next();
    } catch (error) {
        console.error("Error in isInsideChat middleware:", error);
        return next(error);
    }
}

const isInsideRideGroup  = async (req, res, next) => {
    try {
        const userId = req.userId;
    
        const { rideGroupId } = req.params;

        if (!rideGroupId) {
            throw new BadRequestError("Ride group ID is required");
        }

        const group = await RideGroupRepository.findIfAccountIdInsideGroup(
            rideGroupId, userId, req.accountType);

        if (!group) {
            throw new ForbiddenError("You are not authorized to access this ride group");
        }

        next();
    } catch (error) {
        console.error("Error in isInsideChat middleware:", error);
        return next(error);
    }
}

module.exports = {
    isInsideChat,
    isInsideRideGroup
};
