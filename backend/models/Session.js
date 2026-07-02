import mongoose from "mongoose";

// Fix #1 — userId typed as ObjectId ref instead of loose String
const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, default: "" },
  summary: { type: String, default: "" },
  questions: [
    {
      question: String,
      answer: String
    }
  ],
  flashcards: [
    {
      question: String,
      answer: String
    }
  ]
}, { timestamps: true });

// Compound index for fast per-user session lookups
sessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Session", sessionSchema);