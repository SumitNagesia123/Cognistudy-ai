import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  preferences: {
    darkMode: { type: Boolean, default: true },
    autoSave: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: false },
    weeklyGoal: { type: String, default: "5 milestones" }
  },
  points: {
    type: Number,
    default: 100
  }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
