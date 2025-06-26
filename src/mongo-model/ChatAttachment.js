const mongoose = require("mongoose");

const chatAttachmentSchema = new mongoose.Schema({
  message_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatMessage",
    required: true,
  },
  file_url: {
    type: String,
    required: true,
  },
  thumbnail_url: {
    type: String,
    required: false, // Optional: if a thumbnail is not always available
  },
  file_type: {
    type: String,
    enum: ["image", "video", "audio", "document"],
    required: true,
  },
  file_name: {
    type: String,
    required: true,
  },
  file_size: {
    type: Number, // in bytes
    required: true,
  },
  duration: {
    type: Number, // for audio/video in seconds
    // This is correctly defined for conditional requirement
    required: function () {
      return ["video", "audio"].includes(this.file_type);
    },
  },
  dimensions: {
    // Define the type of 'dimensions' as an object
    type: {
      width: {
        type: Number,
        // Make width required ONLY if the dimensions object itself is present
        // and the file_type is image/video.
        // The outer 'required' function on 'dimensions' handles the conditional presence.
        // If dimensions is present, then width and height should be required.
        required: function () {
          // This 'this' refers to the 'dimensions' object itself.
          // We only care if dimensions is being set.
          // The outer 'required' function ensures 'dimensions' is present for image/video.
          // So, if we reach here, and it's an image/video, width/height should be there.
          return ["image", "video"].includes(this.parent.file_type); // Access parent document's file_type
        },
      },
      height: {
        type: Number,
        required: function () {
          return ["image", "video"].includes(this.parent.file_type); // Access parent document's file_type
        },
      },
    },
    // This 'required' function applies to the 'dimensions' object itself.
    // It ensures that the 'dimensions' object must be present if file_type is image or video.
    required: function () {
      return ["image", "video"].includes(this.file_type);
    },
    _id: false, // Prevents Mongoose from creating a default _id for this sub-document
  },
  mime_type: {
    type: String,
    required: true,
  },
  uploaded_by: {
    user_id: {
      type: Number, // Assuming user_id is a number. If it's a MongoDB ObjectId, change to mongoose.Schema.Types.ObjectId
      required: true,
    },
    user_type: {
      type: String,
      enum: ["parent", "driver", "admin"],
      required: true,
    },
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});
const ChatAttachment = mongoose.model("ChatAttachment", chatAttachmentSchema);

module.exports = ChatAttachment;
