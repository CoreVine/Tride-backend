// models/ChatMessage.js
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  chat_room_id: {
    type: mongoose.Schema.Types.ObjectId, // Refers to the _id of the ChatRoom document
    ref: 'ChatRoom', // Mongoose will know it's a reference to the ChatRoom model
    required: true,
    index: true // Index for efficient message retrieval per room
  },
  sender_id: {
    type: Number, // This is the ID from your MySQL Parent.id or Driver.id
    required: true,
    index: true // Index for efficient lookups by sender
  },
  sender_type: {
    type: String,
    enum: ['parent', 'driver'], // To distinguish between parent and driver senders
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;