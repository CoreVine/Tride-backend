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
  // For media metadata
  media_meta: {
    size: Number, // in bytes
    duration: Number, // for audio/video in seconds
    width: Number, // for images/videos
    height: Number, // for images/videos
    mime_type: String,
  },
  // For location messages

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

// chatMessageSchema.pre("save", function (next) {
//   if (this.type === messageTypes.LOCATION) {
//     if (
//       !this.location ||
//       !this.location.coordinates ||
//       this.location.coordinates.length !== 2
//     ) {
//       throw new Error("Location messages require valid coordinates");
//     }
//   }
//   next();
// });
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

// location: {
//     type: {
//       type: String,
//       default: "Point",
//       enum: ["Point"],
//       required: function () {
//         return this.type === messageTypes.LOCATION;
//       },
//     },
//     coordinates: {
//       type: [Number],
//       required: function () {
//         return this.type === messageTypes.LOCATION;
//       },
//       validate: {
//         validator: function (v) {
//           return (
//             v.length === 2 &&
//             typeof v[0] === "number" &&
//             typeof v[1] === "number"
//           );
//         },
//         message: (props) =>
//           `${props.value} must be an array of two numbers [longitude, latitude]`,
//       },
//     },
//     name: {
//       type: String,
//       required: false,
//     },
//   },
