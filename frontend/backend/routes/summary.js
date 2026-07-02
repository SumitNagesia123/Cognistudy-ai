import express from "express";
import Session from "../models/Session.js";

const router = express.Router();

// CREATE SESSION
router.post("/session", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text required" });
    }

    // 🔥 TEMP AI (replace later with real AI)
    const summary = text.slice(0, 150);

    const session = await Session.create({
      title: text.slice(0, 30),
      input: text,
      summary
    });

    res.json(session);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Session creation failed" });
  }
});

// GET ALL SESSIONS
router.get("/sessions", async (req, res) => {
  const sessions = await Session.find().sort({ createdAt: -1 });
  res.json(sessions);
});

export default router;