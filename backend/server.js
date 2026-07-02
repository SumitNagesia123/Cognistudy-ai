import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import multer from "multer";
import { createRequire } from "module";
import mongoose from "mongoose";
import Session from "./models/Session.js";
import History from "./models/History.js";
import StudyPlan from "./models/StudyPlan.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import auth from "./middleware/auth.js";
import User from "./models/User.js";
import rateLimit from "express-rate-limit";

dotenv.config();

// ─────────────────────────────────────────
// Fix #2 — Fail fast if JWT_SECRET is absent.
// Never allow a silent fallback that lets the
// server run with a predictable insecure secret.
// ─────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET is not set in .env. Refusing to start.");
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error("❌ FATAL: MONGO_URI is not set in .env. Refusing to start.");
  process.exit(1);
}
if (!process.env.GROQ_API_KEY) {
  console.error("❌ FATAL: GROQ_API_KEY is not set in .env. Refusing to start.");
  process.exit(1);
}

// ─── DB ──────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => { console.error("❌ Mongo Error:", err); process.exit(1); });

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const app = express();

// ─────────────────────────────────────────
// Fix #7 — Restrict CORS to the known frontend
// origin. ALLOWED_ORIGIN defaults to the Vite dev
// server; override via env for production.
// ─────────────────────────────────────────
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:5173";
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// ─────────────────────────────────────────
// Fix #3 — Multer: PDF-only, 10 MB limit.
// fileFilter rejects non-PDFs before the route
// handler runs. multerErrorHandler converts Multer
// errors to clean 400 responses.
// ─────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted."));
    }
  }
});

const multerErrorHandler = (err, _req, res, next) => {
  if (err instanceof multer.MulterError || err.message === "Only PDF files are accepted.") {
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

// ─────────────────────────────────────────
// Fix #5 — Rate limiting on auth routes only
// (10 requests per 15 minutes per IP).
// ─────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." }
});

// ─────────────────────────────────────────
// Helper — shared Groq caller
// ─────────────────────────────────────────
const generateSummaryFromText = async (text) => {
  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "user", content: `Summarize this:\n${text.slice(0, 3000)}` }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
  return response.data?.choices?.[0]?.message?.content;
};

// ─────────────────────────────────────────
// Web Search Helper using Jina AI Search
// ─────────────────────────────────────────
const searchWeb = async (query) => {
  try {
    console.log(`🔍 Searching Yahoo for: "${query}"`);
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 8000
    });
    
    const html = response.data;
    const results = [];
    const blocks = html.split(/<div[^>]*class="[^"]*\balgo-sr\b[^"]*"/);
    
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      
      const ruMatch = block.match(/href="[^"]*RU=([^"&]+)[^"]*"/);
      if (!ruMatch) continue;
      
      let targetUrl = decodeURIComponent(ruMatch[1]);
      const cleanUrlMatch = targetUrl.match(/^(https?:\/\/[^\/]+(?:\/[^\/]+)*\/?)/);
      if (cleanUrlMatch) {
        targetUrl = cleanUrlMatch[1];
      }
      
      if (!targetUrl.startsWith('http') || targetUrl.includes('yahoo.com') || targetUrl.includes('yimg.com')) {
        continue;
      }
      
      const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || block.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>/);
      let title = "";
      if (titleMatch) {
        title = titleMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      }
      
      const snippetMatch = block.match(/<div class="compText[^"]*">([\s\S]*?)<\/div>/) || 
                           block.match(/<p class="[^"]*(?:fc-dustygray|fc-gray)[^"]*">([\s\S]*?)<\/p>/);
      let snippet = "";
      if (snippetMatch) {
        snippet = snippetMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      }
      
      if (title && (snippet || targetUrl)) {
        results.push({ url: targetUrl, title, snippet });
      }
    }

    if (results.length > 0) {
      return results.map(r => `- **${r.title}** (${r.url}): ${r.snippet}`).join('\n');
    }
  } catch (err) {
    console.error("❌ Yahoo Search Error, trying Wikipedia fallback...", err.message);
  }

  // Fallback to Wikipedia
  try {
    console.log(`🔍 Searching Wikipedia for fallback: "${query}"`);
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const response = await axios.get(wikiUrl, {
      headers: {
        "User-Agent": "CogniStudy/1.0 (contact@cognistudy.com)"
      },
      timeout: 5000
    });
    
    const searchResults = response.data?.query?.search || [];
    if (searchResults.length === 0) return "";
    
    return searchResults.map(result => {
      const snippet = result.snippet.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
      return `- **${result.title}**: ${snippet}`;
    }).join('\n');
  } catch (err) {
    console.error("❌ Wikipedia Fallback Search Error:", err.message);
    return "";
  }
};


const shouldSearch = (text) => {
  if (!text || typeof text !== "string") return false;
  const query = text.toLowerCase().trim();
  const keywords = [
    "current", "latest", "today", "now", "2024", "2025", "2026", "news", 
    "recent", "who is", "what is the latest", "what is the current", 
    "cutoff", "knowledge limit", "training data", "how many", "who won", "president", 
    "weather", "stock", "price of"
  ];
  const isQuestion = query.endsWith("?") || 
                     query.startsWith("who ") || 
                     query.startsWith("what ") || 
                     query.startsWith("where ") || 
                     query.startsWith("when ") || 
                     query.startsWith("how ") || 
                     query.startsWith("tell me about ");
                     
  return keywords.some(k => query.includes(k)) || isQuestion;
};

const getCurrentDatePrompt = () => {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = new Date().toLocaleDateString('en-US', options);
  return `Current Year/Date: ${dateStr}.
Assume the current year is 2026. Do NOT mention a knowledge cutoff of 2023. You have access to real-time search context to answer with 2026 data.`;
};

// ─────────────────────────────────────────
// Fix #6 — Simple reusable validators
// ─────────────────────────────────────────
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase().trim());


// ═══════════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════════
app.get("/", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});


// ═══════════════════════════════════════════
// AUTH: REGISTER
// Fix #4 — Enforce 8-char minimum password server-side.
// Fix #6 — Validate email format before Mongoose.
// Fix #5 — Rate limited.
// Fix #8 — Response never includes password field.
// ═══════════════════════════════════════════
app.post("/auth/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Fix #6 — email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    // Fix #4 — minimum password length
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Fix #8 — create user then read back without password
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    // Fix #2 — no fallback secret
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        points: user.points
      }
    });

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Registration failed." });
  }
});


// ═══════════════════════════════════════════
// AUTH: LOGIN
// Fix #6 — Validate email format.
// Fix #5 — Rate limited.
// Fix #8 — Password field never returned.
// ═══════════════════════════════════════════
app.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Fix #6 — email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    // Fix #8 — select password only for bcrypt compare; excluded from response
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Fix #2 — no fallback secret
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        points: user.points
      }
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Login failed." });
  }
});


// ═══════════════════════════════════════════
// AUTH: PROFILE
// Fix #8 — .select("-password") already present; confirmed correct.
// ═══════════════════════════════════════════
app.get("/auth/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});


// ═══════════════════════════════════════════
// AUTH: UPDATE PREFERENCES
// ═══════════════════════════════════════════
app.put("/auth/preferences", auth, async (req, res) => {
  try {
    const { preferences } = req.body;
    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({ error: "preferences object is required." });
    }
    // Fix #1 — scoped to req.user.id, not a bare findById that could be spoofed
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { preferences } },
      { new: true, select: "-password" }
    );
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({ preferences: user.preferences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});


// ═══════════════════════════════════════════
// AUTH: UPDATE POINTS
// ═══════════════════════════════════════════
app.put("/auth/points", auth, async (req, res) => {
  try {
    const { points } = req.body;
    if (typeof points !== "number") {
      return res.status(400).json({ error: "points must be a number." });
    }
    const existingUser = await User.findById(req.user.id);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found." });
    }
    const currentPoints = typeof existingUser.points === "number" ? existingUser.points : 100;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { points: currentPoints + points } },
      { new: true, select: "-password" }
    );
    res.json({ points: user.points });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});


// ═══════════════════════════════════════════
// TEXT SUMMARY
// ═══════════════════════════════════════════
app.post("/summary", auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text is required." });
    }

    let finalPayloadText = text;
    let searchResults = null;

    // Check if the input is a URL
    const isUrl = (str) => {
      try {
        new URL(str);
        return str.startsWith("http://") || str.startsWith("https://");
      } catch (_) {
        return false;
      }
    };

    if (isUrl(text.trim())) {
      const targetUrl = text.trim();

      const cleanHtml = (html) => {
        let c = html.replace(/<(script|style|iframe|head|nav|footer|noscript|header|aside)[^>]*>[\s\S]*?<\/\1>/gi, "");
        c = c.replace(/<[^>]+>/g, " ");
        c = c
          .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
        return c.replace(/\s+/g, " ").trim();
      };

      // Helper: try direct fetch with realistic browser headers
      const tryDirect = async () => {
        const r = await axios.get(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Upgrade-Insecure-Requests": "1"
          },
          timeout: 10000,
          maxRedirects: 5
        });
        return typeof r.data === "string" ? cleanHtml(r.data) : null;
      };

      // Helper: fallback using Jina AI reader (strips JS-heavy sites perfectly)
      const tryJina = async () => {
        const jinaUrl = `https://r.jina.ai/${targetUrl}`;
        const r = await axios.get(jinaUrl, {
          headers: { "Accept": "text/plain", "User-Agent": "CogniStudy/1.0" },
          timeout: 15000
        });
        return typeof r.data === "string" ? r.data.replace(/\s+/g, " ").trim() : null;
      };

      try {
        let extracted = null;
        let usedFallback = false;

        // Try direct first
        try {
          extracted = await tryDirect();
        } catch (directErr) {
          const status = directErr.response?.status;
          // If blocked/forbidden/rate-limited/requires-auth — try Jina fallback
          if ([401, 403, 429, 503].includes(status) || directErr.code === "ECONNREFUSED") {
            console.log(`Direct fetch blocked (${status}), trying Jina fallback...`);
            try {
              extracted = await tryJina();
              usedFallback = true;
            } catch (jinaErr) {
              // Both failed — give a friendly error based on status code
              if (status === 401 || status === 403) {
                return res.status(400).json({
                  error: "This page requires login or blocks external access. Try a public URL like a Wikipedia article, news page, or blog post."
                });
              } else if (status === 429) {
                return res.status(400).json({ error: "The website is rate-limiting requests. Please try again in a few minutes or use a different URL." });
              } else {
                return res.status(400).json({ error: `Could not fetch the URL (${status || directErr.code}). Try a different public URL.` });
              }
            }
          } else if (directErr.code === "ETIMEDOUT" || directErr.code === "ECONNABORTED") {
            return res.status(400).json({ error: "The URL took too long to respond. Try a different URL." });
          } else if (directErr.code === "ENOTFOUND") {
            return res.status(400).json({ error: "URL not found. Check the URL is correct and the site is online." });
          } else {
            throw directErr;
          }
        }

        if (!extracted || extracted.length < 80) {
          return res.status(400).json({ error: "The page did not contain enough readable text to summarize. Try a different URL." });
        }

        finalPayloadText = extracted.slice(0, 6000);
        if (usedFallback) console.log("Used Jina reader fallback successfully.");

      } catch (urlErr) {
        console.error("URL Fetch Error:", urlErr.message);
        return res.status(400).json({ error: `Failed to read the URL. Make sure it's a public webpage. (${urlErr.message})` });
      }
    } else if (shouldSearch(text)) {
      searchResults = await searchWeb(text);
    }

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are CogniStudy AI, an expert study assistant. Your job is to help students understand, learn, and analyze content.
When given text or a webpage, provide a clear, well-structured summary with:
- Key concepts and main ideas
- Important facts and definitions
- Actionable takeaways for studying
Format with headings and bullet points for easy reading.
If the input looks like a question rather than content to summarize, answer it thoroughly and educationally.
Always be helpful, thorough, and educational. Never refuse to help with study-related topics.

${getCurrentDatePrompt()}`
          },
          {
            role: "user",
            content: searchResults 
              ? `[Web Search Context from current year 2026]:\n${searchResults.slice(0, 4000)}\n\nUser Input:\n${finalPayloadText.slice(0, 5000)}`
              : `${finalPayloadText.slice(0, 5000)}`
          }
        ],
        temperature: 0.6,
        max_tokens: 1024,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const output = response.data?.choices?.[0]?.message?.content;

    const session = await Session.create({
      userId: req.user.id,
      text: finalPayloadText,
      summary: output
    });

    await History.create({
      userId: req.user.id,
      type: "summary",
      input: text.slice(0, 100) + (text.length > 100 ? "..." : ""),
      output,
      sessionId: session._id
    });

    res.json({ result: output, _id: session._id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generating summary." });
  }
});


// ═══════════════════════════════════════════
// AI IMPROVE NOTE
// ═══════════════════════════════════════════
app.post("/improve", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text is required." });
    }

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a helpful study assistant. Improve, polish, format, and organize the following study notes. Make them clear, detailed, and structure them beautifully with Markdown format." },
          { role: "user", content: text }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const output = response.data?.choices?.[0]?.message?.content;
    res.json({ result: output });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to improve note." });
  }
});


// ═══════════════════════════════════════════
// GENERAL AI CHAT
// ═══════════════════════════════════════════
app.post("/chat", auth, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required." });
    }

    let userContent = message.trim();
    if (shouldSearch(userContent)) {
      const searchResults = await searchWeb(userContent);
      if (searchResults) {
        userContent = `[Web Search Context from current year 2026]:\n${searchResults.slice(0, 4000)}\n\nUser Question:\n${message.trim()}`;
      }
    }

    // Build conversation history for multi-turn context
    const conversationMessages = [
      {
        role: "system",
        content: `You are CogniStudy AI — a brilliant, friendly, and highly knowledgeable study assistant. You help students with:
- Explaining any academic concept (science, math, history, literature, coding, economics, etc.)
- Answering factual questions clearly and thoroughly
- Summarizing topics, comparing concepts, and giving examples
- Helping with homework, essays, study plans, and exam preparation
- Breaking down complex topics step by step

Your personality: enthusiastic, encouraging, clear, and precise.
Always give complete, well-structured answers. Use bullet points, numbered lists, and examples where helpful.
Never say "I can't help with that" for educational or study-related questions — always provide value.

${getCurrentDatePrompt()}`
      },
      // Include last 8 messages of conversation for context
      ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent }
    ];

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 1500,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const output = response.data?.choices?.[0]?.message?.content;

    // Save to history
    await History.create({
      userId: req.user.id,
      type: "chat",
      input: message.slice(0, 150) + (message.length > 150 ? "..." : ""),
      output,
    });

    res.json({ result: output });
  } catch (err) {
    console.error("Chat Error:", err);
    res.status(500).json({ error: "AI failed to respond. Please try again." });
  }
});


// ═══════════════════════════════════════════
// UPLOAD PDF
// Fix #3 — fileFilter + size limit enforced by
//          Multer config; multerErrorHandler
//          converts errors to 400.
// ═══════════════════════════════════════════
app.post("/upload-pdf", auth, upload.single("file"), multerErrorHandler, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const data = await pdfParse(req.file.buffer);
    const parsedText = data.text;

    if (!parsedText || parsedText.length < 50) {
      return res.status(400).json({ error: "No readable text found in PDF." });
    }

    const session = await Session.create({
      userId: req.user.id,
      text: parsedText
    });

    const summary = await generateSummaryFromText(parsedText);
    session.summary = summary;
    await session.save();

    await History.create({
      userId: req.user.id,
      type: "summary",
      input: req.file.originalname,
      output: summary,
      sessionId: session._id
    });

    res.json({
      result: "PDF uploaded",
      summary,
      _id: session._id,
      session
    });

  } catch (err) {
    console.error("❌ PDF ERROR:", err);
    res.status(500).json({ error: "Upload failed." });
  }
});


// ═══════════════════════════════════════════
// ASK PDF
// Fix #1 — all Session/History lookups already
//          include userId: req.user.id filter.
// ═══════════════════════════════════════════
app.post("/ask-pdf", auth, async (req, res) => {
  try {
    const { question, sessionId } = req.body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "question is required." });
    }

    let session = null;
    if (sessionId) {
      // Fix #1 — always scope by userId so another user's sessionId returns nothing
      session = await Session.findOne({ _id: sessionId, userId: req.user.id });

      if (!session) {
        // sessionId might refer to a History record; resolve through it
        const historyItem = await History.findOne({ _id: sessionId, userId: req.user.id });
        if (historyItem?.sessionId) {
          session = await Session.findOne({ _id: historyItem.sessionId, userId: req.user.id });
        }
      }
    }

    // Fallback: most-recent session owned by this user
    if (!session) {
      session = await Session.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    }

    if (!session?.text) {
      return res.status(400).json({ error: "No document found. Please upload a PDF first." });
    }

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Answer only from the provided PDF content." },
          { role: "user", content: `PDF:\n${session.text.slice(0, 3000)}\n\nQ: ${question}` }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const output = response.data?.choices?.[0]?.message?.content;

    session.questions.push({ question, answer: output });
    await session.save();

    await History.create({
      userId: req.user.id,
      type: "chat",
      input: question,
      output,
      sessionId: session._id
    });

    res.json({ result: output });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error answering question." });
  }
});


// ═══════════════════════════════════════════
// FLASHCARDS
// Fix #1 — all lookups scoped to userId.
// ═══════════════════════════════════════════
app.post("/flashcards", auth, async (req, res) => {
  try {
    const { sessionId } = req.body || {};

    let session = null;
    if (sessionId) {
      session = await Session.findOne({ _id: sessionId, userId: req.user.id });
      if (!session) {
        const historyItem = await History.findOne({ _id: sessionId, userId: req.user.id });
        if (historyItem?.sessionId) {
          session = await Session.findOne({ _id: historyItem.sessionId, userId: req.user.id });
        }
      }
    }

    if (!session) {
      session = await Session.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    }

    if (!session?.text || session.text.length < 50) {
      return res.status(400).json({ error: "No usable document found. Please upload a PDF first.", cards: [] });
    }

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a JSON generator. ONLY return valid JSON. No text. No explanation."
          },
          {
            role: "user",
            content: `Create exactly 5 flashcards from the text.\n\nReturn STRICT JSON ONLY:\n[\n  {"question":"...","answer":"..."},\n  {"question":"...","answer":"..."}\n]\n\nTEXT:\n${session.text.slice(0, 3000)}`
          }
        ],
        temperature: 0.3
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    let raw = response.data?.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json|```/g, "").trim();

    let cards = [];
    try {
      cards = JSON.parse(raw);
    } catch {
      console.error("❌ JSON PARSE FAILED:", raw);
      return res.status(500).json({ error: "AI returned malformed data.", cards: [] });
    }

    session.flashcards = cards;
    await session.save();

    await History.create({
      userId: req.user.id,
      type: "flashcard",
      input: "PDF Flashcard Generation",
      output: JSON.stringify(cards),
      sessionId: session._id
    });

    res.json({ cards });

  } catch (err) {
    console.error("❌ FLASHCARD ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "Flashcard generation failed.", cards: [] });
  }
});


// ═══════════════════════════════════════════
// DELETE HISTORY / SESSION
// Fix #1 — findOneAndDelete already scoped
//          to userId (confirmed correct).
// Returns 404 if item not found rather than
// silently succeeding (avoids info leak).
// ═══════════════════════════════════════════
app.delete("/delete/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const historyItem = await History.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!historyItem) {
      // Fix #1 — 404 (not 403) to avoid leaking whether another user's record exists
      return res.status(404).json({ error: "Item not found." });
    }

    // Clean up the linked session if it belongs to the same user
    if (historyItem.sessionId) {
      await Session.findOneAndDelete({ _id: historyItem.sessionId, userId: req.user.id });
    }

    res.json({ result: "Deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete item." });
  }
});


// ═══════════════════════════════════════════
// GET HISTORY
// ═══════════════════════════════════════════
app.get("/history", auth, async (req, res) => {
  try {
    const data = await History.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch history." });
  }
});


// ═══════════════════════════════════════════
// UPDATE HISTORY ITEM (Notes editor)
// Fix #1 — already scoped to userId (confirmed).
// Fix #6 — validate that body fields are strings.
// ═══════════════════════════════════════════
app.put("/history/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { input, output } = req.body;

    if (typeof input !== "string" || typeof output !== "string") {
      return res.status(400).json({ error: "input and output must be strings." });
    }

    const historyItem = await History.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { input, output },
      { new: true }
    );

    if (!historyItem) {
      return res.status(404).json({ error: "Note not found." });
    }

    res.json(historyItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update note." });
  }
});


// ═══════════════════════════════════════════
// STUDY PLANS
// ═══════════════════════════════════════════

// Create a new study plan
app.post("/study-plans", auth, async (req, res) => {
  try {
    const { subject, type, startTime, endTime, sessionId } = req.body;

    if (!subject || !startTime || !endTime) {
      return res.status(400).json({ error: "subject, startTime, and endTime are required." });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format." });
    }

    if (start >= end) {
      return res.status(400).json({ error: "startTime must be before endTime." });
    }

    if (type && !["reading", "test", "review"].includes(type)) {
      return res.status(400).json({ error: "type must be reading, test, or review." });
    }

    if (sessionId) {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ error: "Invalid sessionId format." });
      }
      const session = await Session.findOne({ _id: sessionId, userId: req.user.id });
      if (!session) {
        return res.status(400).json({ error: "Session not found." });
      }
    }

    const plan = await StudyPlan.create({
      userId: req.user.id,
      subject,
      type: type || "reading",
      startTime: start,
      endTime: end,
      sessionId: sessionId || null
    });

    res.status(201).json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create study plan." });
  }
});

// Get all study plans for authenticated user
app.get("/study-plans", auth, async (req, res) => {
  try {
    const { date } = req.query;
    const query = { userId: req.user.id };

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "date must be in YYYY-MM-DD format." });
      }
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      query.startTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const plans = await StudyPlan.find(query).sort({ startTime: 1 });
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch study plans." });
  }
});

// Get study plans deadlines (urgent and missed)
app.get("/study-plans/deadlines", auth, async (req, res) => {
  try {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingPlans = await StudyPlan.find({
      userId: req.user.id,
      status: "upcoming"
    });

    const urgent = upcomingPlans.filter(
      plan => plan.startTime >= now && plan.startTime <= oneDayFromNow
    );

    const missed = upcomingPlans.filter(
      plan => plan.endTime < now
    );

    res.json({ urgent, missed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch study plan deadlines." });
  }
});

// Update an existing study plan
app.put("/study-plans/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, type, startTime, endTime, status, sessionId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid plan ID format." });
    }

    // Must verify the plan belongs to req.user.id before updating
    const plan = await StudyPlan.findOne({ _id: id, userId: req.user.id });
    if (!plan) {
      return res.status(404).json({ error: "Study plan not found." });
    }

    const finalStart = startTime ? new Date(startTime) : plan.startTime;
    const finalEnd = endTime ? new Date(endTime) : plan.endTime;

    if (isNaN(finalStart.getTime()) || isNaN(finalEnd.getTime())) {
      return res.status(400).json({ error: "Invalid date format." });
    }

    if (finalStart >= finalEnd) {
      return res.status(400).json({ error: "startTime must be before endTime." });
    }

    if (type && !["reading", "test", "review"].includes(type)) {
      return res.status(400).json({ error: "type must be reading, test, or review." });
    }

    if (status && !["upcoming", "completed", "missed"].includes(status)) {
      return res.status(400).json({ error: "status must be upcoming, completed, or missed." });
    }

    if (sessionId) {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({ error: "Invalid sessionId format." });
      }
      const session = await Session.findOne({ _id: sessionId, userId: req.user.id });
      if (!session) {
        return res.status(400).json({ error: "Session not found." });
      }
    }

    const updatedPlan = await StudyPlan.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      {
        subject: subject !== undefined ? subject : plan.subject,
        type: type !== undefined ? type : plan.type,
        startTime: finalStart,
        endTime: finalEnd,
        status: status !== undefined ? status : plan.status,
        sessionId: sessionId !== undefined ? (sessionId || null) : plan.sessionId
      },
      { new: true }
    );

    res.json(updatedPlan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update study plan." });
  }
});

// Quick update status of study plan
app.patch("/study-plans/:id/status", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid plan ID format." });
    }

    if (!status || !["upcoming", "completed", "missed"].includes(status)) {
      return res.status(400).json({ error: "status must be upcoming, completed, or missed." });
    }

    const updatedPlan = await StudyPlan.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { status },
      { new: true }
    );

    if (!updatedPlan) {
      return res.status(404).json({ error: "Study plan not found." });
    }

    res.json(updatedPlan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update study plan status." });
  }
});

// Delete a study plan
app.delete("/study-plans/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid plan ID format." });
    }

    const deletedPlan = await StudyPlan.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!deletedPlan) {
      return res.status(404).json({ error: "Study plan not found." });
    }

    res.json({ result: "Study plan deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete study plan." });
  }
});


// ═══════════════════════════════════════════
// SESSIONS & HISTORY CREATION
// ═══════════════════════════════════════════

// Fetch user's uploaded sessions with matching original filenames from history
app.get("/sessions", auth, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.id }).sort({ createdAt: -1 });
    const histories = await History.find({ userId: req.user.id, type: "summary" });
    
    const sessionList = sessions.map(session => {
      const matchedHistory = histories.find(h => h.sessionId?.toString() === session._id.toString());
      return {
        _id: session._id,
        summary: session.summary || "",
        fileName: matchedHistory ? matchedHistory.input : "Document Note",
        createdAt: session.createdAt
      };
    });
    res.json(sessionList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sessions." });
  }
});

// Delete a session and all its associated history items
app.delete("/sessions/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid session ID." });
    }

    const session = await Session.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    await History.deleteMany({ sessionId: id, userId: req.user.id });

    res.json({ result: "Session and all associated history items deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete session." });
  }
});

// Create arbitrary history entry (e.g. custom study notes)
app.post("/history", auth, async (req, res) => {
  try {
    const { type, input, output, sessionId } = req.body;
    if (!type || !["summary", "chat", "flashcard", "note"].includes(type)) {
      return res.status(400).json({ error: "Invalid history type." });
    }
    if (sessionId && !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: "Invalid sessionId format." });
    }

    const item = await History.create({
      userId: req.user.id,
      type,
      input: input || "",
      output: output || "",
      sessionId: sessionId || null
    });
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create history entry." });
  }
});


// ─── Global error handler ────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "An unexpected error occurred." });
});


// ═══════════════════════════════════════════
// START
// ═══════════════════════════════════════════
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});