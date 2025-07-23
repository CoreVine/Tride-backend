const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const { messageTypes } = require("../../mongo-model/ChatMessage");
const chatController = require("../../controllers/admins/chat.controller");
const { upload, getFileType } = require("../../services/file-upload.service");
const validate = require("../../middlewares/validation.middleware");
const Yup = require("yup");
const { isInsideChat } = require("../../middlewares/chatAuthorize.middleware");
const { checkValidSubscription } = require("../../middlewares/subscription.middleware");
const { isAdminWithPermissions } = require("../../middlewares/isAccount.middleware");
const { ROLE_PERMISSION_CHAT_WITH_DRIVER, ROLE_PERMISSION_CHAT_WITH_PARENT, ROLE_PERMISSION_VIEW_CHAT_HISTORY } = require("../../utils/constants/admin-permissions");

const getOneRideGroupChatRoomSchema = {
  params: Yup.object().shape({
    rideGroupId: Yup.string().required()
  })
};

const getRideGroupChatRoomsSchema = {
  query: Yup.object().shape({
    page: Yup.number().positive().optional(),
    limit: Yup.number().positive().optional()
  })
};

router.get(
  "/admin-view/chats/ride-groups",
  authMiddleware,
  isAdminWithPermissions([{ type: "name", value: ROLE_PERMISSION_VIEW_CHAT_HISTORY }]),
  validate(getRideGroupChatRoomsSchema),
  chatController.getChatRooms
);

router.get(
  "/admin-view/chats/ride-groups/:rideGroupId/messages",
  authMiddleware,
  isAdminWithPermissions([{ type: "name", value: ROLE_PERMISSION_VIEW_CHAT_HISTORY }]),
  validate(getOneRideGroupChatRoomSchema),
  chatController.getChatRoomMessages
);

router.get(
  "/admin-view/chats/customer-support/rooms",
  authMiddleware,
  validate({
    query: Yup.object().shape({
      page: Yup.number().positive().optional(),
      limit: Yup.number().positive().optional(),
      account_type: Yup.string().oneOf(["parent", "driver", "all"]).optional(),
      name: Yup.string().optional(),
      email: Yup.string().optional()
    })
  }),
  isAdminWithPermissions([{ type: "name", value: ROLE_PERMISSION_CHAT_WITH_DRIVER }, { type: "name", value: ROLE_PERMISSION_CHAT_WITH_PARENT }], "some"),
  chatController.getCustomerServiceRooms
);

router.get(
  "/admin-view/chats/customer-support/rooms/:chatRoomId/messages",
  authMiddleware,
  isAdminWithPermissions([{ type: "name", value: ROLE_PERMISSION_CHAT_WITH_DRIVER }, { type: "name", value: ROLE_PERMISSION_CHAT_WITH_PARENT }], "some"),
  chatController.getLatestMessagesCustomerServiceRoom
);

module.exports = router;
