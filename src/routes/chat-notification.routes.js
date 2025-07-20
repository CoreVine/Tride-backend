const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware"); // Ensure authMiddleware is correctly exported here
const { messageTypes } = require("../mongo-model/ChatMessage");

const chatController = require("../controllers/chat-room.controller");
const { upload, getFileType } = require("../services/file-upload.service");
const validate = require("../middlewares/validation.middleware");
const Yup = require("yup");
const { isInsideChat } = require("../middlewares/chatAuthorize.middleware");
const { checkValidSubscription } = require("../middlewares/subscription.middleware");

const rideGroupIdSchema = Yup.object().shape({
  rideGroupId: Yup.string()
    .required("Ride Group ID is required.") // Ensures the parameter exists
    .matches(
      /^[a-zA-Z0-9_-]+$/,
      "Ride Group ID can only contain letters, numbers, underscores, and hyphens."
    ) // Example: custom regex for valid characters
    .min(1, "Ride Group ID must be at least 3 characters long.") // Example: minimum length
    .max(50, "Ride Group ID cannot exceed 50 characters."), // Example: maximum length
});
const chatRoomIdSchema = Yup.object().shape({
  chatRoomId: Yup.string()
    .required("Ride Group ID is required.")
    .matches(
      /^[a-fA-F0-9]{24}$/,
      "Ride Group ID must be a valid Mongo ObjectId"
    ),
});
const messageIdIdSchema = Yup.object().shape({
  messageId: Yup.string()
    .required("Ride Group ID is required.")
    .matches(
      /^[a-fA-F0-9]{24}$/,
      "Ride Group ID must be a valid Mongo ObjectId"
    ),
});

const notificationFetchSchema = {
  params: Yup.object().shape({
    page: Yup.number().positive().required(),
    limit: Yup.number().positive().required()
  })
};
// Base media types

// Location Schema
// const locationSchema = Yup.object({
//   type: Yup.string()
//     .oneOf(["Point"])
//     .required("Location type must be 'Point'"),
//   coordinates: Yup.array()
//     .of(Yup.number())
//     .length(2, "Coordinates must be an array of two numbers [longitude, latitude]")
//     .required("Coordinates are required for location messages"),
//   name: Yup.string().optional(),
// });
const mediaTypes = [
  messageTypes.IMAGE,
  messageTypes.VIDEO,
  messageTypes.AUDIO,
  messageTypes.DOCUMENT,
];

const chatMessageValidationSchema = Yup.object({
  type: Yup.string()
    .oneOf(Object.values(messageTypes))
    .default(messageTypes.TEXT),

  message: Yup.string()
    .trim()
    .when("type", {
      is: messageTypes.TEXT,
      then: (schema) => schema.required("Message is required for text type"),
      otherwise: (schema) => schema.strip(), // remove it if not needed
    }),

  media_url: Yup.string().when("type", {
    is: (val) => mediaTypes.includes(val),
    then: (schema) => schema.required("media_url is required for media types"),
    otherwise: (schema) => schema.strip(),
  }),

  is_system: Yup.boolean().default(false),

  reply_to: Yup.string()
    .matches(/^[a-fA-F0-9]{24}$/, "Invalid reply_to ID")
    .nullable()
    .notRequired(),
});
const notificationSchema = Yup.object().shape({
  recipientId: Yup.mixed()
    .required("Recipient ID is required")
    .test(
      "is-string-or-number",
      "Recipient ID must be a string or a number",
      (value) => typeof value === "string" || typeof value === "number"
    ),
  senderId: Yup.mixed()
    .nullable()
    .optional()
    .test(
      "is-string-or-number-or-null",
      "Sender ID must be a string, a number, or null",
      (value) =>
        value === null || typeof value === "string" || typeof value === "number"
    ),
  type: Yup.string().required("Type is required"),
  title: Yup.string()
    .required("Title is required")
    .trim("Title cannot include leading or trailing spaces"),
  message: Yup.string()
    .required("Message is required")
    .trim("Message cannot include leading or trailing spaces"),
  related_entity_type: Yup.string().nullable().optional(),
  related_entity_id: Yup.mixed()
    .nullable()
    .optional()
    .test(
      "is-string-or-number-or-null",
      "Related Entity ID must be a string, a number, or null",
      (value) =>
        value === null || typeof value === "string" || typeof value === "number"
    ),
  metadata: Yup.object().nullable().optional(),
});

// Get or create chat room for a ride group
// TODO: ADD AUTHORIZATION HERE
router.get(
  "/ride-group/:rideGroupId/room",
  authMiddleware,
  checkValidSubscription,
  validate(rideGroupIdSchema, "params"), // Validate rideGroupId in params
  chatController.getChatRooms
);

// Get chat messages
router.get(
  "/ride-group/:rideGroupId/messages",
  authMiddleware,
  checkValidSubscription,
  validate(rideGroupIdSchema, "params"), // Validate rideGroupId in params
  chatController.getChatMessages
);

// Upload chat media
router.post(
  "/messages/upload",
  authMiddleware,
  checkValidSubscription,
  upload.single("file"), // `upload` here is the Multer instance from destructuring
  chatController.uploadFile
);

// Create a message
router.post(
  "/messages/:chatRoomId/media",
  authMiddleware,
  checkValidSubscription,
  validate(chatRoomIdSchema, "params"),
  upload.single("file"),
  chatController.asssginMediaMeta,
  validate(chatMessageValidationSchema, "body"),
  chatController.createMessage
);
router.post(
  "/messages/:chatRoomId/message",
  authMiddleware,
  checkValidSubscription,
  isInsideChat,
  validate(chatRoomIdSchema, "params"),
  validate(chatMessageValidationSchema, "body"),
  chatController.createMessage
);
// Delete a message
router.delete(
  "/messages/:messageId",
  validate(messageIdIdSchema, "params"),
  checkValidSubscription,
  authMiddleware,
  chatController.deleteMessage
);

// Notification Endpoints (same as before, but enhanced with socket integration)
// Test notification endpoints
router.post(
  "/test/notification",
  authMiddleware,
  validate(notificationSchema, "body"),
  chatController.sendTestNotification
);

router.get(
  "/me/notification",
  authMiddleware,
  validate(notificationFetchSchema),
  chatController.getNotificationsPaginated
);

module.exports = router;
