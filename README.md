# MCPA Training Bot

**Your personal study buddy for the Model Context Protocol Associate certification!**

---

## What Is This?

A local training bot that helps you study for the MCPA certification by:
- Quizzing you on MCP concepts (522 questions across 17 chapters, including scenario-based reasoning)
- Providing instant feedback and scoring
- Teaching you through a live AI-powered tutoring chatbot (with BM25 fallback)
- Tracking your weak areas across exam domains
- Searching official JSON-RPC and MCP specifications for answers

**Built with MCP, for learning MCP.**

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (v24+ recommended)

### Installation

```bash
# 1. Clone or download this project
cd mcpa-bot

# 2. Copy and configure environment
cp .env.sample .env
# Edit .env to add your API key (optional — bot works without AI)

# 3. Install dependencies
npm install

# 4. Start the server
npm start

# 5. Open browser
http://localhost:3000
```

### AI Configuration (Optional)

The bot works without AI, but responses are better with a provider:

```env
# Pick one:
OPENAI_API_KEY=sk-...        # Uses gpt-4o-mini
OPENROUTER_API_KEY=sk-or-... # Uses llama-3.3-70b
GROQ_API_KEY=gsk_...         # Uses llama-3.3-70b-versatile
XAI_API_KEY=xai-...          # Uses grok-3-mini

# Or use local Ollama:
OLLAMA_BASE_URL=http://localhost:11434/v1
```

> **Note:** `npm install` works out of the box. The `.npmrc` file handles dependency conflicts automatically.

---

## Two Modes

### 📝 Exam Mode (`/`)
- Take quizzes without help
- Delayed feedback (after submit)
- Simulates real exam conditions
- Results with per-topic scoring

### 🎓 Training Mode (`/training.html`)
- Split screen: quiz + live tutor
- Instant feedback after each answer
- AI chat assistant explains concepts
- Quick buttons: "Why is this the answer?" / "What concept?"
- Model selector with provider status indicator

---

## Project Structure

```
mcpa-bot/
├── src/
│   ├── server.js              # Express server entry point
│   ├── mcp/
│   │   └── server.js          # MCP server (8 tools, 3 resources, 2 prompts)
│   ├── routes/
│   │   ├── quiz.js            # Quiz API endpoints
│   │   ├── chat.js            # Teaching chat endpoints
│   │   ├── models.js          # Model provider status/config
│   │   └── specs.js           # Spec content search
│   └── services/
│       ├── questionService.js  # Question loading, scoring, preparation
│       ├── chatService.js      # AI-powered teaching assistant
│       ├── modelConfig.js      # Multi-provider AI configuration
│       ├── searchIndex.js      # BM25 search engine
│       └── specIndexer.js      # JSON-RPC/MCP spec content fetcher
├── public/
│   ├── index.html             # Exam mode quiz interface
│   ├── training.html          # Training mode (quiz + chat)
│   ├── css/style.css          # Styles
│   └── js/
│       ├── app.js             # Exam mode logic
│       └── api.js             # API helpers
├── test/
│   ├── api.test.js            # Quiz API tests
│   ├── chatService.test.js    # Chat service unit tests
│   ├── chat.test.js           # Chat API integration tests
│   ├── data-integrity.test.js # Question bank validation
│   ├── mcp-server.test.js     # MCP server tests
│   ├── questionService.test.js
│   ├── specIndexer.test.js    # Spec fetcher/chunker tests
│   ├── searchIndex.test.js    # BM25 search engine tests
│   └── specs.test.js          # Spec API endpoint tests
├── data/
│   ├── questions/             # 34 JSON files (522 questions)
│   ├── results/               # Saved quiz results
│   ├── specs/                 # Cached spec content
│   └── schemas/               # Question JSON schema
├── docs/
│   └── learning-notes/
│       ├── EXAM-CHEAT-SHEET.md
│       └── MCPA-SCENARIO-REASONING-GUIDE.md
├── scripts/
│   └── build-spec-index.js    # Build spec search index
├── e2e/
│   ├── exam.spec.js           # Exam mode E2E tests
│   ├── training.spec.js       # Training mode E2E tests
│   └── model-config.spec.js   # Model config E2E tests
└── package.json
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Server status + question count |
| GET | `/api/tags` | Available topics with counts |
| POST | `/api/quiz/start` | Start quiz session |
| POST | `/api/quiz/submit` | Submit answers + get results |
| GET | `/api/questions/:id` | Get single question |
| POST | `/api/chat` | Send message to tutor |
| POST | `/api/chat/context` | Update tutor's question context |
| POST | `/api/chat/action` | Quick action buttons |
| GET | `/api/chat/history/:id` | Get chat history |
| GET | `/api/chat/provider` | Current AI provider info |
| GET | `/api/models/status` | All provider statuses |
| POST | `/api/models/validate/:provider` | Validate a provider's key |
| GET | `/api/models/config` | Safe config summary (no keys exposed) |
| GET | `/api/specs/status` | Spec index status |
| POST | `/api/specs/build` | Rebuild spec index |
| GET | `/api/specs/search?q=...` | Search spec content |

---

## MCP Server

The project includes an MCP server (`src/mcp/server.js`) that exposes teaching tools:

### Tools
| Tool | Purpose |
|------|---------|
| `search_concepts` | Search cheat sheet for keywords |
| `explain_topic` | Get detailed topic explanation |
| `get_questions_by_tag` | Find questions by topic |
| `get_cheat_sheet_section` | List or retrieve cheat sheet sections |
| `get_weak_areas` | Analyze past quiz results |
| `get_similar_questions` | Find related questions |

### Resources
| Resource | Content |
|----------|---------|
| `mcpa://cheat-sheet` | Full exam cheat sheet |
| `mcpa://exam-domains` | Domain weights and topics |
| `mcpa://glossary` | MCP terms and definitions |

### Prompts
| Prompt | Purpose |
|--------|---------|
| `teach-concept` | Explain a concept with examples |
| `compare` | Compare two topics |

---

## Running Tests

```bash
# All tests (166 tests)
npm test

# Individual suites
npm run test:data    # Question bank validation
npm run test:api     # API endpoint tests
npm run test:mcp     # MCP server tests

# E2E tests (requires server running)
npx playwright test e2e/
```

---

## MCPA Exam Domains

| Domain | Weight |
|--------|--------|
| Interactions & Execution | 26% |
| Security & Governance | 24% |
| Use Cases & Ecosystem | 20% |
| MCP Fundamentals | 16% |
| Architecture & Components | 14% |

---

## What You'll Learn

By using this bot, you'll master:
- **MCP Protocol** — Architecture, tools, resources, prompts
- **Security** — OAuth 2.1, attack patterns, token validation
- **Transport** — stdio vs Streamable HTTP
- **JSON-RPC 2.0** — Message formats, error codes
- **Ecosystem** — Inspector, Extensions, Registry
- **Scenario Reasoning** — Tester-oriented problem solving (51 scenario questions)

---

## Tech Stack

- **Backend:** Node.js + Express
- **AI:** OpenAI-compatible API (OpenAI, OpenRouter, Groq, xAI, Ollama)
- **Search:** BM25 text search with stemming
- **MCP Server:** `@modelcontextprotocol/sdk` v1.30.0
- **Testing:** `node:test` (built-in) + Playwright (E2E)
- **Frontend:** Vanilla HTML/CSS/JS
- **Data:** JSON files (no database required)

---

**Happy Learning!** 🚀
