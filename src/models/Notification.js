const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient_id: { type: String, required: true },
  sender_id: { type: String },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  related_entity_type: { type: String },
  related_entity_id: { type: mongoose.Schema.Types.ObjectId },
  is_read: { type: Boolean, default: false },
  metadata: { type: Object },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notification", notificationSchema);
