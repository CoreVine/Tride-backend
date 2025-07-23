const Notification = require("../../mongo-model/Notification");
const redisService = require("../../services/redis.service");
const firebaseService = require("../../services/firebase.service");
const { InternalServerError } = require("../errors");
const logger = require("../../services/logging.service").getLogger();

async function sendNotificationTo({ accountIds, type, title, message, related_entity_type, related_entity_id, metadata }) {    
    if (!accountIds || typeof accountIds !== "object" || !type || !title || !message) {
        throw new InternalServerError("Missing required parameters: accountId, type, title, or message.");
    }

    try {
        const results = await accountIds.map(async accountId => {
            // Create notification in database
            const notification = await Notification.create({
                accountId: accountId,
                type,
                title,
                message,
                isRead: false,
                metadata: {
                    ...metadata,
                    test: true,
                    timestamp: new Date().toISOString()
                },
                created_at: new Date(),
            });
            
            const deviceTokens = await redisService.getDeviceTokens(accountId);
            
            if (!deviceTokens || deviceTokens.length === 0) {
                return {
                    notificationId: notification._id,
                    notification: {
                        id: notification._id,
                        title,
                        message,
                        type,
                        created_at: notification.created_at
                    },
                    error: "No device tokens found for account."
                };
            }

            // Send push notification using Firebase service
            const firebaseMessage = {
                type: 'tokens',
                target: accountId,
                title,
                body: message,
                data: {
                    type,
                    notificationId: notification._id.toString(),
                    relatedEntityType: related_entity_type || '',
                    relatedEntityId: related_entity_id || '',
                    ...metadata
                }
            };

            const result = await firebaseService.sendNotification(firebaseMessage);
            logger.info('Notification is sent', {
                notificationId: notification._id,
                deviceTokenCount: deviceTokens.length,
                result
            });

            return {
                notification: {
                    id: notification._id,
                    title,
                    message,
                    type,
                    created_at: notification.created_at
                },
                delivery: result
            };
        });

        return results;
    } catch (error) {
        logger.error("Notification error", {
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
}

module.exports = {
    sendNotificationTo
};

