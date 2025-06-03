const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema({
  ride_group_id: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    trim: true,
    default: "Ride Group Chat",
  },
  participants: [
    {
      user_id: {
        type: Number,
        required: true,
      },
      user_type: {
        type: String,
        enum: ["parent", "driver", "admin"],
        required: true,
      },
      name: {
        type: String,
        required: false,
      },
      last_seen: {
        type: Date,
        default: null,
      },
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  last_message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatMessage",
    default: null,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
});

// Update timestamps
chatRoomSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// Add a method to add participants
chatRoomSchema.methods.addParticipant = function (
  userId,
  userType,
  name = null
) {
  const exists = this.participants.some(
    (p) => p.user_id === userId && p.user_type === userType
  );

  if (!exists) {
    this.participants.push({
      user_id: userId,
      user_type: userType,
      name: name,
    });
  }
};

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);

module.exports = ChatRoom;
