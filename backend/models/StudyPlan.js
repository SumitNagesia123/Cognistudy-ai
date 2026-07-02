import mongoose from "mongoose";

const studyPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subject: { type: String, required: true },
  type: { type: String, enum: ["reading", "test", "review"], default: "reading" },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ["upcoming", "completed", "missed"], default: "upcoming" },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
  createdAt: { type: Date, default: Date.now }
});

// Index for multi-tenant isolation and fast startTime sorting
studyPlanSchema.index({ userId: 1, startTime: 1 });

export default mongoose.model("StudyPlan", studyPlanSchema);
