const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  user: { type: String, default: "Anónimo" },
  room: { type: String, default: "general" },
  message: { type: String, default: "" },
  type: {
    type: String,
    enum: ["text", "audio", "file", "video"],
    default: "text",
  },
  fileName: { type: String, default: null },
  mimeType: { type: String, default: null },
  data: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);