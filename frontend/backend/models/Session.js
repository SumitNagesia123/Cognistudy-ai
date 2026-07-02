import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  userId: String,

  title: String,
  input: String,

  summary: String,

  flashcards: [
    {
      question: String,
      answer: String
    }
  ],

  quiz: [
    {
      question: String,
      options: [String],
      correctAnswer: String
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Session", sessionSchema);