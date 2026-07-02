# CogniStudy AI — Project Brain
> Auto-generated from full codebase read on 2026-06-28. Update whenever a significant decision is made or a new feature is added.

---

## 1. Project Identity

**What it is:** CogniStudy AI is a full-stack, multi-tenant AI-powered study assistant. Students upload PDFs, generate AI summaries and flashcards, chat with documents, take practice tests, manage study plans, and keep AI-assisted notes — all in one authenticated workspace.

**Who it's for:** Students — high school, university, self-learners.

**Project name:** CogniStudy AI
**Repo structure:** Monorepo — `backend/` (Node/Express/MongoDB) + `frontend/` (React/Vite)

---

## 2. Tech Stack

### Backend (`backend/package.json`) — ESM, port 5000
| Package | Purpose |
|---|---|
| `express ^5.2.1` | HTTP server and routing |
| `mongoose ^9.6.0` | MongoDB ODM, all DB models |
| `bcryptjs ^3.0.3` | Password hashing (10 rounds) |
| `jsonwebtoken ^9.0.3` | JWT sign/verify (7d expiry) |
| `dotenv ^17.4.2` | `.env` file loading |
| `cors ^2.8.6` | CORS — restricted to `ALLOWED_ORIGIN` env var |
| `multer ^2.1.1` | PDF upload (memory storage, 10MB limit) |
| `pdf-parse ^1.1.1` | PDF text extraction from buffer |
| `axios ^1.15.2` | Groq API, Yahoo Search, Wikipedia, Jina AI calls |
| `express-rate-limit ^8.5.2` | Rate limiting on `/auth/*` (10/15min per IP) |
| `@google/generative-ai ^0.24.1` | **Installed but NOT used** |
| `openai ^6.34.0` | **Installed but NOT used** |

**Start:** `node scripts/clear-port.js && node server.js`

### Frontend (`frontend/package.json`) — ESM, port 5173
| Package | Purpose |
|---|---|
| `react ^19.2.5` | UI framework |
| `react-dom ^19.2.5` | DOM renderer |
| `lucide-react ^1.14.0` | **Sole icon library** — no other icon sets |
| `vite ^8.0.10` | Build tool and dev server |

**Start:** `node scripts/clear-port.js && vite`

---

## 3. Folder Structure

```
ai-study-assistant/
├── brain.md                          ← THIS FILE
├── backend/
│   ├── .env                          ← PORT, GROQ_API_KEY, MONGO_URI, JWT_SECRET
│   ├── server.js                     ← ALL routes + helpers (1311 lines, single file)
│   ├── package.json
│   ├── middleware/
│   │   └── auth.js                   ← JWT verification; sets req.user = { id, iat, exp }
│   ├── models/
│   │   ├── User.js                   ← name, email, password, preferences, points
│   │   ├── Session.js                ← PDF text, summary, questions[], flashcards[]
│   │   ├── History.js                ← AI interaction audit log (type/input/output)
│   │   └── StudyPlan.js              ← subject, type, startTime, endTime, status
│   └── scripts/
│       ├── clear-port.js             ← Kills process on port before server starts
│       └── test-live-api.js          ← Manual smoke test (dev tool only)
│
└── frontend/
    ├── public/
    │   └── mascot-sidebar.png        ← Sidebar footer mascot (hidden via onError if missing)
    └── src/
        ├── main.jsx                  ← React root: renders <App />
        ├── index.css                 ← CSS entry point — imports ALL other CSS files
        ├── App.jsx                   ← Root: ToastProvider, AuthProvider, routing, +New modal
        ├── api/
        │   └── client.js             ← Centralized fetch: api.get/post/put/patch/delete
        ├── context/
        │   └── AuthContext.jsx       ← JWT in localStorage, login/register/logout/updatePreferences/updatePoints
        ├── components/
        │   ├── Sidebar.jsx           ← Left nav: logo, 7 items, logout, mascot, upgrade card
        │   ├── Topbar.jsx            ← Search, +New, points chip, bell, profile dropdown
        │   └── RingProgress.jsx      ← SVG ring progress (reused across multiple pages)
        ├── pages/
        │   ├── Landing.jsx           ← Public marketing page (no auth required)
        │   ├── AuthPage.jsx          ← Login/Register two-panel form
        │   ├── Dashboard.jsx         ← Quick summarizer, study plans, analytics, recent activity
        │   ├── Documents.jsx         ← PDF upload, session list, inline document Q&A chat
        │   ├── StudyPlans.jsx        ← Full study plan CRUD with calendar + kanban view
        │   ├── Flashcards.jsx        ← Deck viewer, 3D card flip, practice test with scoring
        │   ├── History.jsx           ← Filterable AI interaction log, export to JSON
        │   ├── Notes.jsx             ← Two-pane editor backed by History (type=summary|note)
        │   ├── Settings.jsx          ← Preferences toggles, danger zone (clear all data)
        │   ├── Automations.jsx       ← Placeholder for future smart workflow features
        │   └── LetsChat.jsx          ← General AI chat: Yahoo Search + multi-turn history
        └── styles/
            ├── tokens.css            ← *** SOURCE OF TRUTH — all design tokens ***
            ├── base.css              ← CSS reset, body, typography, utility classes
            ├── components.css        ← Buttons, cards, badges, modals, toasts, forms
            ├── layout.css            ← App shell, sidebar, topbar, content-area grid
            └── pages/
                ├── auth.css / dashboard.css / documents.css / flashcards.css
                ├── history.css / notes.css / settings.css / landing.css
                ├── automations.css / studyplans.css
```

---

## 4. Architecture & Data Flow

### JWT Auth — End to End
1. **Register** `POST /auth/register` → validate email/password (8 char min) → bcrypt hash → `User.create()` → `jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' })` → return `{ token, user }` (no password)
2. **Login** `POST /auth/login` → `User.findOne({ email }).select('+password')` → `bcrypt.compare()` → same token shape
3. **Storage** `localStorage.setItem('token', token)` — key name is exactly **`"token"`**
4. **Attaching** `api/client.js` reads `localStorage.getItem('token')` on every call → `Authorization: Bearer <token>` header
5. **Verification** `middleware/auth.js` → `jwt.verify(token, JWT_SECRET)` → `req.user = { id, iat, exp }`
6. **Expiry** middleware returns `401 { error: "Token expired..." }`. `client.js` intercepts any `401` → clears localStorage → `window.location.reload()`
7. **Hydration** `AuthContext` calls `GET /auth/me` on app load to restore user state from stored token

### PDF Upload Flow
1. `Documents.jsx` → `api.post('/upload-pdf', formData)` (FormData skips JSON Content-Type in client.js)
2. Multer: PDF-only MIME check, 10MB limit
3. `pdf-parse(req.file.buffer)` → raw text
4. `Session.create({ userId: req.user.id, text })`
5. `generateSummaryFromText(text.slice(0,3000))` → Groq API
6. `session.summary = summary; session.save()`
7. `History.create({ userId, type:'summary', input: filename, output: summary, sessionId })`
8. Returns `{ result, summary, _id, session }`

### RAG Q&A (Ask PDF)
1. `api.post('/ask-pdf', { question, sessionId })`
2. Lookup chain: `Session.findOne({ _id: sessionId, userId })` → if missing, try `History.findOne` to resolve sessionId → fallback to most-recent session
3. Groq: system = "Answer only from the provided PDF content"; user = `PDF:\n${text.slice(0,3000)}\n\nQ: ${question}`
4. `session.questions.push({ question, answer })` → `session.save()`
5. Logged to History as `type:'chat'`

### Real-Time Chat (Let's Chat)
1. Chat history persisted in `localStorage` key `'cognistudy_general_chat'`
2. `shouldSearch(text)` checks keywords (current/latest/today/price of/who won/news/etc.) or question prefixes (who/what/where/when/how)
3. If search: `searchWeb(query)` scrapes Yahoo HTML → title+snippet+URL markdown list → Wikipedia API fallback if Yahoo fails
4. `getCurrentDatePrompt()` generates today's real date dynamically on every request — injected into system prompt
5. Up to last 8 messages sent as `history[]` for multi-turn context
6. Logged to History as `type:'chat'`

---

## 5. Database Schemas

### User
| Field | Type | Req | Default | Purpose |
|---|---|---|---|---|
| `name` | String | ✅ | — | Display name |
| `email` | String | ✅ | — | Login; unique, lowercase |
| `password` | String | ✅ | — | bcrypt hash; **never returned** |
| `preferences.darkMode` | Boolean | — | `true` | Theme toggle |
| `preferences.autoSave` | Boolean | — | `true` | Auto-save |
| `preferences.emailNotifications` | Boolean | — | `false` | Email prefs |
| `preferences.weeklyGoal` | String | — | `"5 milestones"` | Goal label |
| `points` | Number | — | `100` | Gamification; additive |

### Session
| Field | Type | Req | Default | Purpose |
|---|---|---|---|---|
| `userId` | ObjectId→User | ✅ | — | Owner (multi-tenant key) |
| `text` | String | — | `""` | Full PDF text |
| `summary` | String | — | `""` | AI summary |
| `questions` | `[{question,answer}]` | — | `[]` | Q&A history |
| `flashcards` | `[{question,answer}]` | — | `[]` | Cached cards |
| Index: `{ userId:1, createdAt:-1 }` |

### History
| Field | Type | Req | Default | Purpose |
|---|---|---|---|---|
| `userId` | ObjectId→User | ✅ | — | Owner |
| `type` | enum | ✅ | — | `summary`/`chat`/`flashcard`/`note` |
| `input` | String | — | `""` | User input or filename |
| `output` | String | — | `""` | AI response (JSON string for flashcards) |
| `sessionId` | ObjectId→Session | — | — | Optional link |
| `createdAt` | Date | — | `Date.now` | |
| Index: `{ userId:1, createdAt:-1 }` |
| **Notes are stored here** — `Notes.jsx` filters by `type:'summary'` or `type:'note'` |

### StudyPlan
| Field | Type | Req | Default | Purpose |
|---|---|---|---|---|
| `userId` | ObjectId→User | ✅ | — | Owner |
| `subject` | String | ✅ | — | Topic |
| `type` | enum | — | `reading` | `reading`/`test`/`review` |
| `startTime` | Date | ✅ | — | Must be before endTime |
| `endTime` | Date | ✅ | — | |
| `status` | enum | — | `upcoming` | `upcoming`/`completed`/`missed` |
| `sessionId` | ObjectId→Session | — | — | Optional link |
| Index: `{ userId:1, startTime:1 }` |

### Relationships
```
User ──< Session    (userId on Session)
User ──< History    (userId on History)
User ──< StudyPlan  (userId on StudyPlan)
Session ──< History (sessionId on History, optional)
Session ──< StudyPlan (sessionId on StudyPlan, optional)
```

---

## 6. API Reference (Complete)

All protected routes require `Authorization: Bearer <token>`.

### Health
| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/` | No | `{ status:"ok", timestamp }` |

### Auth
| Method | Path | Auth | Body | Response | Notes |
|---|---|---|---|---|---|
| POST | `/auth/register` | No | `{name,email,password}` | `{token,user}` | Rate limited; 8-char min; bcrypt |
| POST | `/auth/login` | No | `{email,password}` | `{token,user}` | Rate limited; bcrypt compare |
| GET | `/auth/me` | ✅ | — | User (no password) | Used by AuthContext on load |
| PUT | `/auth/preferences` | ✅ | `{preferences:{}}` | `{preferences}` | $set merge; scoped to req.user.id |
| PUT | `/auth/points` | ✅ | `{points:Number}` | `{points}` | **Additive** — adds to existing total |

### AI Core
| Method | Path | Auth | Body | Response | Notes |
|---|---|---|---|---|---|
| POST | `/summary` | ✅ | `{text}` | `{result,_id}` | URL→fetch page (direct then Jina); question keywords→Yahoo search; saves Session+History |
| POST | `/improve` | ✅ | `{text}` | `{result}` | Rewrites notes as markdown; does **not** log to History |
| POST | `/chat` | ✅ | `{message,history[]}` | `{result}` | Yahoo search if shouldSearch(); multi-turn (last 8 msgs); logged to History |
| POST | `/upload-pdf` | ✅ | FormData(`file`) | `{result,summary,_id,session}` | PDF only, 10MB; creates Session+History |
| POST | `/ask-pdf` | ✅ | `{question,sessionId?}` | `{result}` | RAG pipeline; logs to session.questions + History |
| POST | `/flashcards` | ✅ | `{sessionId?}` | `{cards:[]}` | Exactly 5 cards; saves to session.flashcards; logged to History |

### History
| Method | Path | Auth | Body | Response | Notes |
|---|---|---|---|---|---|
| GET | `/history` | ✅ | — | `[HistoryItem]` | All user history, newest first |
| POST | `/history` | ✅ | `{type,input,output,sessionId?}` | HistoryItem | Create custom note entry |
| PUT | `/history/:id` | ✅ | `{input,output}` | HistoryItem | Edit note; scoped to userId |
| DELETE | `/delete/:id` | ✅ | — | `{result}` | Deletes History + linked Session; 404 if not found |

### Sessions
| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| GET | `/sessions` | ✅ | `[{_id,summary,fileName,createdAt}]` | Joins Session+History for filename |
| DELETE | `/sessions/:id` | ✅ | `{result}` | Deletes Session + all linked History via deleteMany |

### Study Plans
| Method | Path | Auth | Body/Query | Response | Notes |
|---|---|---|---|---|---|
| POST | `/study-plans` | ✅ | `{subject,type?,startTime,endTime,sessionId?}` | StudyPlan | Validates dates; start < end |
| GET | `/study-plans` | ✅ | `?date=YYYY-MM-DD` | `[StudyPlan]` | Optional date filter |
| GET | `/study-plans/deadlines` | ✅ | — | `{urgent:[],missed:[]}` | Urgent=within 24hrs; Missed=endTime past |
| PUT | `/study-plans/:id` | ✅ | any fields | StudyPlan | Ownership verified before update |
| PATCH | `/study-plans/:id/status` | ✅ | `{status}` | StudyPlan | Quick status-only update |
| DELETE | `/study-plans/:id` | ✅ | — | `{result}` | Ownership verified |

---

## 7. Multi-Tenant Security Rules

### ✅ Correct Pattern — always use
```js
// Find:
const item = await Model.findOne({ _id: id, userId: req.user.id });
// Update:
const item = await Model.findOneAndUpdate({ _id: id, userId: req.user.id }, { ... }, { new: true });
// Delete:
await Model.findOneAndDelete({ _id: id, userId: req.user.id });
```

### ❌ Wrong Pattern — never use
```js
const item = await Model.findById(id);           // no userId check
await Model.findByIdAndUpdate(id, { ... });       // no userId check
```

### Response on Ownership Failure
**Return `404`, not `403`** — 403 reveals that a record exists for someone else; 404 reveals nothing.

### Other Security Rules
- `JWT_SECRET` must exist in `.env` — server refuses to start without it (no silent fallback)
- Password: `.select('-password')` on all responses; `.select('+password')` only for bcrypt compare in login
- Rate limit: 10 req/15min on register+login
- CORS: `ALLOWED_ORIGIN` env var (default: `http://localhost:5173`)
- `userId` always from `req.user.id` — **never from request body**
- Multer rejects non-PDF before route handler runs
- `client.js` intercepts `401` → clears localStorage → `window.location.reload()`

---

## 8. Design System

### Tokens — `frontend/src/styles/tokens.css`

#### Brand Colors
| Token | Value | Usage |
|---|---|---|
| `--clr-primary` | `#7c5cfc` | Buttons, active states, charts |
| `--clr-primary-hover` | `#6545e8` | Button hover |
| `--clr-primary-light` | `#ebe8ff` | Tint backgrounds |
| `--clr-canvas` | `#f7f7ff` | Page background |
| `--clr-surface` | `#ffffff` | Card background |
| `--clr-border` | `#e8e6f5` | Borders |
| `--clr-text-1` | `#1a1a2e` | Primary text |
| `--clr-text-2` | `#555577` | Secondary text |
| `--clr-text-3` | `#9999bb` | Muted/placeholder |

#### Sidebar Colors (Dark Navy)
| Token | Value |
|---|---|
| `--sidebar-bg` | `#1a1f5e` |
| `--sidebar-text` | `rgba(255,255,255,0.6)` |
| `--sidebar-text-active` | `#ffffff` |
| `--sidebar-item-active-bg` | `rgba(255,255,255,0.12)` |

#### Pastel Subject Colors (5 — cycle by index)
| Name | Color token | Bg token |
|---|---|---|
| Rose | `--clr-rose: #ff6b9d` | `--clr-rose-bg: #fff0f6` |
| Amber | `--clr-amber: #ffaa40` | `--clr-amber-bg: #fff8ee` |
| Mint | `--clr-mint: #34c991` | `--clr-mint-bg: #edfbf5` |
| Sky | `--clr-sky: #38b6ff` | `--clr-sky-bg: #eef8ff` |
| Lavender | `--clr-lavender: #9b8aff` | `--clr-lavender-bg: #f5f3ff` |

#### Spacing — `--sp-1:4px` → `--sp-2:8px` → `--sp-3:12px` → `--sp-4:16px` → `--sp-5:20px` → `--sp-6:24px` → `--sp-8:32px` → `--sp-10:40px` → `--sp-12:48px` → `--sp-16:64px`

#### Border Radius — `--r-xs:6px` → `--r-sm:10px` → `--r-md:14px` → `--r-lg:18px` → `--r-xl:22px` → `--r-2xl:28px` → `--r-pill:999px`

#### Typography
- `--font-display: 'Plus Jakarta Sans', system-ui` — headings
- `--font-body: 'Inter', system-ui` — body text
- Scale: `--text-xs:11px` / `--text-sm:13px` / `--text-base:15px` / `--text-md:17px` / `--text-lg:20px` / `--text-xl:24px` / `--text-2xl:30px` / `--text-3xl:38px`

#### Shadows
`--shadow-xs/sm/md/lg/xl` (indigo-tinted). `--shadow-indigo: 0 6px 20px rgba(124,92,252,0.32)` for CTAs.

#### Layout
`--sidebar-w:200px` / `--topbar-h:64px` / `--content-pad-x:32px` / `--content-pad-y:28px`

### Component Patterns

**Cards:** `.card` — `--shadow-card`, `--r-lg`, `--clr-surface`. Variant: `.card--flat`.

**Buttons:**
- `.btn.btn-primary` — indigo fill, white text
- `.btn.btn-secondary` — surface bg, border
- `.btn.btn-sm` — reduced padding
- `.btn.btn-danger` — red, destructive actions

**Pastel Tint System:** `PASTEL[index % PASTEL.length]` → `{ bg, color }` from token vars. Used in Documents, Flashcards, Notes, Dashboard.

**RingProgress (`components/RingProgress.jsx`):** Props: `pct` (0–1), `size`, `color`, `strokeWidth`, `children`. SVG circle ring — signature recurring visual element.

**Pill Tabs:** `.pill-tabs` + `.pill-tab` + `.pill-tab.active`. Used in History and Settings.

**Visual Reference:** Based on SIMBI AI Study Companion (Dribbble, Ashley Anyaralu). App forced to light mode on mount via `document.documentElement.setAttribute('data-theme', 'light')`.

---

## 9. Key Decisions (do not revisit without strong reason)

| Decision | Detail |
|---|---|
| Styling | **Vanilla CSS only.** No Tailwind, no CSS-in-JS. Inline styles only permitted when using `var(--token)` references. |
| Notes storage | `History` entries with `type:'note'` or `type:'summary'`. No separate Note model. |
| JWT storage | `localStorage`, key = **`"token"`**. Managed exclusively by `AuthContext.jsx`. |
| API base URL | Hardcoded as `http://localhost:5000` in both `api/client.js` and `AuthContext.jsx`. Both must change for production. |
| File uploads | PDF only, 10MB max, enforced in Multer — not just frontend validation. |
| JWT expiry | `7d` — set in `/auth/register` and `/auth/login`. |
| Flashcards | Generated from session text (Groq), exactly 5 per call. Cached on `session.flashcards`. Stored in History as JSON string. No separate model. |
| LLM model | `llama-3.3-70b-versatile` via Groq API for all AI features. |
| Real-time search | Yahoo Search HTML scraping (primary) → Wikipedia API (fallback). Trigger: `shouldSearch()` keyword/pattern matching. |
| App routing | Client-side string state `currentRoute` in `App.jsx`. **No React Router.** |
| Theme | Light mode forced on mount. Dark mode toggle in Settings sets `data-theme="dark"` on `<html>`. |
| StudyPlan | Added after initial build. Fully CRUD-supported via dedicated model and 6 routes. |

---

## 10. Files — Never Modify

| File | Reason |
|---|---|
| `backend/middleware/auth.js` | Core security contract. Changing breaks JWT for every protected route. |
| `frontend/src/context/AuthContext.jsx` | Auth state, token persistence, login/register/logout — the contract between all pages and the backend. |
| `frontend/src/api/client.js` | Used by every page. Handles auth headers, JSON, and 401 auto-logout. Breaking it breaks the entire frontend. |

---

## 11. Files — Always Check Before Touching

| File | Why |
|---|---|
| `frontend/src/styles/tokens.css` | Every color, spacing, and size in the app uses these tokens. Renaming or removing breaks dozens of styles. |
| `backend/server.js` | All routes live here. Check for name conflicts before adding. `/history` is called by Dashboard, History, Notes, Flashcards — changing its response shape breaks all four. |
| `frontend/src/index.css` | Controls which CSS files are loaded globally. Adding/removing imports here has global effect. |

---

## 12. Current Build Status

### Done ✅
- Full JWT auth flow (register, login, logout, profile hydration, token auto-refresh)
- PDF upload + text extraction + AI summary generation
- Document library (session list with filenames from history join)
- Document Q&A (RAG pipeline with session fallback chain)
- AI flashcard generation (5 cards from PDF text, cached on session, logged to History)
- Flashcard deck viewer — 3D flip animation, hard/easy tracking
- Practice test mode in Flashcards — scoring, points awarded
- Let's Chat — general AI chat with multi-turn history + Yahoo real-time search
- Real-time web search (Yahoo scraper → Wikipedia fallback)
- Dynamic date injection into all AI system prompts via `getCurrentDatePrompt()`
- History page — filterable (All/Summaries/Flashcards/PDF Chats), searchable, deletable, JSON export
- Notes page — two-pane editor backed by History, AI-improve feature via `/improve`
- Study Plans — full CRUD (create, list, update, patch status, delete, deadlines endpoint)
- StudyPlans page — calendar view, kanban, color-coded by subject
- Dashboard — quick summarizer, today's plans, metrics (docs/streak/flashcards/hours), area chart
- Settings — preferences toggles (darkMode, autoSave, emailNotifications), danger zone (bulk delete)
- Landing page — public marketing page, no auth required
- Automations page — placeholder/stub
- Sidebar with mascot, upgrade card, 7 nav items
- Topbar with search, +New modal, points chip, bell, profile dropdown
- Toast notification system (global via ToastContext)
- Rate limiting on auth routes
- CORS restriction to known origin
- Multer PDF-only enforcement + 10MB limit
- Multi-tenant security on all DB queries
- MongoDB compound indexes on all models
- `clear-port.js` script prevents port conflicts on start

### In Progress / Partial
- Automations page — UI exists, no backend wired
- Notifications — bell icon and dropdown UI exist; no real notification system
- Search bar in Topbar — navigates to History page on Enter, not a true search

### Not Started / Pending
- Email notification system (`preferences.emailNotifications` stored but never sent)
- Production deployment (both `api/client.js` and `AuthContext.jsx` have hardcoded `localhost:5000`)
- Account deletion endpoint (frontend Settings has "Clear History" but no account delete API)
- Password change / reset flow
- `@google/generative-ai` and `openai` packages installed but never used — can be removed

### Known Issues
- `generateSummaryFromText()` helper (used for PDF upload) does NOT inject `getCurrentDatePrompt()` — only `/summary` and `/chat` routes use it. PDF summaries may reflect stale date context.
- `GET /auth/me` uses `findById(req.user.id)` without `userId` scoping — acceptable since `req.user.id` is the user's own ID, but technically inconsistent with the multi-tenant pattern.
- `PUT /auth/points` uses `User.findById(req.user.id)` (then a second `findByIdAndUpdate`) — same note, acceptable but slightly inconsistent.
- Storage size on Documents page is estimated (`docs.length * 2.4 MB`) — not real file sizes.
- `scoreTab` (Day/Week/Month) on Dashboard does arithmetic scaling of history counts, not real per-period queries.

---

## 13. Things That Must Never Happen

- [ ] Never use `findById(id)` without also filtering by `userId: req.user.id`
- [ ] Never return `403` when a record isn't found — return `404`
- [ ] Never expose the password field in any response (`.select('-password')` always)
- [ ] Never hardcode a fallback for `JWT_SECRET` (no `|| 'secret'` or similar)
- [ ] Never modify `AuthContext.jsx` auth/login/register logic
- [ ] Never modify `api/client.js` without checking every page that calls it
- [ ] Never add Tailwind, CSS-in-JS, or arbitrary inline styles — use token vars only
- [ ] Never hardcode color or spacing values in component files — use tokens
- [ ] Never accept `userId` from the request body — always use `req.user.id`
- [ ] Never store notes as a separate model — use History with `type:'note'`
- [ ] Never guess an API endpoint shape — read `backend/server.js` first
- [ ] Never add a new route without checking for name conflicts in `server.js`
- [ ] Never call `/history` and change its response shape — 4+ pages depend on it
- [ ] Never import a second icon library — lucide-react is the only one
- [ ] Never use React Router — routing is string state in `App.jsx`
