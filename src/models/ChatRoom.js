// models/ChatRoom.js
const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  // This ID will link to your RideGroup's 'id' from MySQL
  ride_group_id: {
    type: Number, // Assuming RideGroup.id is a Number/Integer in MySQL
    required: true,
    unique: true, // Each ride group should have only one chat room
    index: true // Index for efficient lookups
  },
  // Optional: A name for the chat room, might be derived from ride group name
  name: {
    type: String,
    trim: true,
    default: 'Ride Group Chat'
  },
  // We might store participants here for quick access, but the primary source
  // will still be your MySQL data (ParentGroup, Driver in RideGroup)
  participants: [{
    user_id: {
      type: Number, // ID from MySQL Parent.id or Driver.id
      required: true
    },
    user_type: {
      type: String,
      enum: ['parent', 'driver'], // To distinguish between parents and drivers
      required: true
    },
    // Optional: Denormalize name for display, to avoid constant MySQL lookups
    name: {
      type: String,
      required: false // Can be populated if needed
    }
  }],
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update updated_at on save
chatRoomSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

module.exports = ChatRoom;