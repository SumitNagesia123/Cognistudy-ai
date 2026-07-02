import mongoose from "mongoose";

// Fix #1 — userId typed as ObjectId (proper ref) instead of loose String
const historySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["summary", "chat", "flashcard", "note"], required: true },
  input: { type: String, default: "" },
  output: { type: String, default: "" },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index ensures efficient per-user queries used in all protected routes
historySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("History", historySchema);