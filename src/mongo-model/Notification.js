const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    index: true,
    trim: true,
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
  relatedEntityType: {
    type: String,
    index: true,
    trim: true,
  },
  relatedEntityId: {
    type: mongoose.Schema.Types.Mixed,
    index: true,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Compound index for fast retrieval of unseen notifications
notificationSchema.index({
  accountId: 1,
  isRead: 1,
  createdAt: -1
});

module.exports = mongoose.model("Notification", notificationSchema);
