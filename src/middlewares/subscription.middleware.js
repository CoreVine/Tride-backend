const { isParentSubscriptionValid } = require("../domain/subscription/subscription");
const { ForbiddenError, BadRequestError } = require("../utils/errors/types/Api.error");


const checkValidSubscription = async (req, res, next) => {
    try {
        const { rideGroupId } = req.query;
        const accountId = req.userId;

        if (!rideGroupId || !accountId) {
            throw new BadRequestError("Ride group ID and account ID are required");
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
