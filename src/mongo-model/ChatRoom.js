const mongoose = require("mongoose");
const AccountRepository = require("../data-access/accounts");

const chatRoomSchema = new mongoose.Schema({
  ride_group_id: {
    type: Number,
    required: false,
    unique: true,
    index: true,
  },
  room_type: {
    type: String,
    required: true,
    enum: ["ride_group", "private", "customer_support"],
    default: "ride_group",
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

    return this.save();
  }
};

// Add a method to get the last message
chatRoomSchema.methods.getLastMessage = async function () {
  const message = await mongoose.model("ChatMessage")
    .findOne({ chat_room_id: this._id })
    .sort({ created_at: -1 });

  return message || null;
}

// Add a method to get participants' profile pictures
chatRoomSchema.methods.getParticipantsProfilePictures = async function () {
  try {
    const accountsDetails = this.participants.map(p => ({
      id: Number(p.user_id),
      account_type: p.user_type
    }));
    const result = await AccountRepository.getChatParticipantsProfilePictures(accountsDetails);
  
    return result;
  } catch (error) {
    console.error("Error fetching participants' profile pictures:", error);
    throw new DatabaseError("Failed to fetch participants' profile pictures");
  }
}

// get a pages of 10 messages sorted by created_at
chatRoomSchema.methods.getMessagesPage = async function (chatRoomId, page = 1) {
  const limit = 10;
  const skip = (page - 1) * limit;

  const messages = await mongoose.model("ChatMessage")
    .find({ chat_room_id: chatRoomId })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .populate("reply_to")
    .lean();

  return messages;
}

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);

module.exports = ChatRoom;
