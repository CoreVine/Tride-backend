const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient_id: {
    type: mongoose.Schema.Types.Mixed, // Can be String or Number
    required: true,
    index: true,
  },
  sender_id: {
    type: mongoose.Schema.Types.Mixed,
    index: true,
  },
  type: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  related_entity_type: {
    type: String,
    index: true,
  },
  related_entity_id: {
    type: mongoose.Schema.Types.Mixed,
    index: true,
  },
  is_read: {
    type: Boolean,
    default: false,
    index: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
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

// Update the updated_at field on save
notificationSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Index for frequently used queries
notificationSchema.index({
  recipient_id: 1,
  is_read: 1,
  created_at: -1,
});

module.exports = mongoose.model("Notification", notificationSchema);
