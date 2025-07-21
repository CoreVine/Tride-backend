const { NotFoundError, BadRequestError, ForbiddenError } = require("../utils/errors/types/Api.error");
const RideGroupRepository = require("../data-access/rideGroup");
const ChatRoom = require("../mongo-model/ChatRoom");
const { ROLE_PERMISSION_CHAT_WITH_PARENT, ROLE_PERMISSION_CHAT_WITH_DRIVER } = require("../utils/constants/admin-permissions");

const isInsideChat = async (req, res, next) => {
    try {
        const { chatRoomId } = req.params;
        const userId = req.userId;
    
        const chatRoom = await ChatRoom.findById(chatRoomId);
    
        if (!chatRoom) {
            throw new NotFoundError("Chat room not found");
        }

        if (chatRoom.room_type === "customer_support") {
            if (req.accountType === "admin") {
                const participant = chatRoom.participants[0].user_type;
                const permissionName = participant === "parent" ? ROLE_PERMISSION_CHAT_WITH_PARENT : ROLE_PERMISSION_CHAT_WITH_DRIVER;
    
                if (!req.admin.permissions.some((p) => p.name === permissionName)) {
                    throw new ForbiddenError(`You do not have permission to access this chat room`);
                }
    
                req.admin.allowedToChatRoom = {
                    chatRoomId: chatRoom.id,
                    roomType: chatRoom.room_type
                };
    
                // Admins can access any chat room, so we skip further checks
                return next();
            } else if (chatRoom.participants[0].user_id === userId) {
                // If the user is the one who initiated the chat, they can access it
                return next();
            } else {
                throw new ForbiddenError("You are not authorized to access this chat room");
            }
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
