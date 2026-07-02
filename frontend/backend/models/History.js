// models/History.js
import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
  userId: String,
  input: String,
  output: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("History", historySchema);