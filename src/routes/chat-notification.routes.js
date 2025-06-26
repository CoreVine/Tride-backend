const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware"); // Ensure authMiddleware is correctly exported here
const {
  ChatRoom,
  ChatMessage,
  messageTypes,
} = require("../mongo-model/ChatMessage");
const Notification = require("../mongo-model/Notification");
const { getIo, NOTIFICATION_TYPES } = require("../services/socketio.service");
const logger = require("../services/logging.service").getLogger();
const chatController = require("../controllers/chat-room.controller");
const { upload, getFileType } = require("../services/file-upload.service");

// Get or create chat room for a ride group
router.get(
  "/ride-group/:rideGroupId/room",
  authMiddleware,
  chatController.getChatRooms
);

// Get chat messages
router.get(
  "/ride-group/:rideGroupId/messages",
  authMiddleware,
  chatController.getChatMessages
);

// Upload chat media
router.post(
  "/messages/upload",
  authMiddleware,
  upload.single("file"), // `upload` here is the Multer instance from destructuring
  chatController.uploadFile
);

// Create a message
router.post(
  "/messages/:chatRoomId",
  authMiddleware,
  chatController.createMessage
);
// Delete a message
router.delete(
  "/messages/:messageId",
  authMiddleware,
  chatController.deleteMessage
);

// Notification Endpoints (same as before, but enhanced with socket integration)
router.get("/notifications", authMiddleware, chatController.getNotifications);
router.post(
  "/notifications/",
  authMiddleware,
  chatController.createNotification
);
// Mark notifications as read in bulk
router.patch(
  "/notifications/mark-read",
  authMiddleware,
  chatController.markNotificationsRead
);
router.patch(
  "/notifications/:id/read",
  authMiddleware,
  chatController.markAsRead
);
router.patch(
  "/notifications/mark-all-read",
  authMiddleware,
  chatController.markAllAsRead
);
router.delete(
  "/notifications/:id",
  authMiddleware,
  chatController.deleteNotification
);

router.get(
  "/notifications/unread",
  authMiddleware,
  chatController.getUnreadCount
);

module.exports = router;
