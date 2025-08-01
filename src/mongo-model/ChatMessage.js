const mongoose = require("mongoose");

const messageTypes = {
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  DOCUMENT: "document",
  LOCATION: "location",
};

const chatMessageSchema = new mongoose.Schema({
  chat_room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatRoom",
    required: true,
    index: true,
  },
  sender_id: {
    type: Number,
    required: true,
  },
  sender_type: {
    type: String,
    enum: ["parent", "driver", "admin"],
    required: true,
  },
  // Message content type (text, image, video, etc.)
  type: {
    type: String,
    enum: Object.values(messageTypes),
    default: messageTypes.TEXT,
  },
  // For text messages
  message: {
    type: String,
    required: function () {
      return this.type === messageTypes.TEXT;
    },
    trim: true,
  },
  // For media messages (image, video, audio)
  media_url: {
    type: String,
    required: function () {
      return [
        messageTypes.IMAGE,
        messageTypes.VIDEO,
        messageTypes.AUDIO,
        messageTypes.DOCUMENT,
      ].includes(this.type);
    },
  },
  // System messages (like "User joined")
  is_system: {
    type: Boolean,
    default: false,
  },
  // Message status
  status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent",
  },
  // For message replies
  reply_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatMessage",
    default: null,
  },
  // For message deletion
  is_deleted: {
    type: Boolean,
    default: false,
  },
  deleted_at: {
    type: Date,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for faster queries
chatMessageSchema.index({ chat_room_id: 1, created_at: -1 });
chatMessageSchema.index({ sender_id: 1, sender_type: 1 });

// Update timestamp on save
chatMessageSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// Add text search index if you want to support message search
chatMessageSchema.index({ message: "text" });

// For location queries
chatMessageSchema.index({ location: "2dsphere" });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

module.exports = {
  ChatMessage,
  messageTypes,
};
