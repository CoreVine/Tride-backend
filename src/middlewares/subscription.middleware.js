const AccountRepository = require("../data-access/accounts");
const { isParentSubscriptionValid } = require("../domain/subscription/subscription");
const ChatRoom = require("../mongo-model/ChatRoom");
const { ForbiddenError, BadRequestError } = require("../utils/errors/types/Api.error");


const checkValidSubscription = async (req, res, next) => {
    try {
        const { rideGroupId } = req.query;
        const accountId = req.userId;

        if (req.accountType === "admin") {
            // Admins are not required to have a subscription
            return next();
        }

        // skip subscription check for customer support chat rooms
        if (req.resourceRequested === "chat") {
            const chatRoom = await ChatRoom.findOne({ room_type: "customer_support", id: req.requestedId }).limit(1);

            if (chatRoom) {
                return next();
            }
        }

        if (!rideGroupId) {
            throw new BadRequestError("Ride group ID is required");
        }

        // Check if the parent has a valid subscription for the ride group
        await isParentSubscriptionValid(accountId, rideGroupId);

        next();
    } catch (error) {
        console.error("Error checking subscription validity:", error);

        next(error);
    }
}

module.exports = {
    checkValidSubscription,
};
