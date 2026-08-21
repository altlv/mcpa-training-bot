# MCPA Training Bot

**Your personal study buddy for the Model Context Protocol Associate certification!**

---

## What Is This?

A local training bot that helps you study for the MCPA certification by:
- Quizzing you on MCP concepts (471 questions across 17 chapters)
- Providing instant feedback and scoring
- Teaching you through a live tutoring chatbot
- Tracking your weak areas across exam domains

**Built with MCP, for learning MCP.**

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (v24+ recommended)

### Installation

```bash
# 1. Clone or download this project
cd mcpa-bot

# 2. Install dependencies
npm install

# 3. Start the server
npm start

# 4. Open browser
http://localhost:3000
```

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
- Chat assistant explains concepts
- Quick buttons: "Why is this the answer?" / "What concept?"

---

## Project Structure

```
mcpa-bot/
├── src/
│   ├── server.js              # Express server entry point
│   ├── mcp/
│   │   └── server.js          # MCP server (6 tools, 3 resources, 2 prompts)
│   ├── routes/
│   │   ├── quiz.js            # Quiz API endpoints
│   │   └── chat.js            # Teaching chat endpoints
│   └── services/
│       ├── questionService.js  # Question loading, scoring, preparation
│       └── chatService.js      # Teaching assistant logic
├── public/
│   ├── index.html             # Exam mode quiz interface
│   ├── training.html          # Training mode (quiz + chat)
│   ├── css/style.css          # Styles
│   └── js/
│       ├── app.js             # Exam mode logic
│       └── api.js             # API helpers
├── test/
│   ├── api.test.js            # API endpoint tests (37 tests)
│   ├── data-integrity.test.js # Question bank validation (16 tests)
│   └── mcp-server.test.js     # MCP server tests (20 tests)
├── data/
│   ├── questions/             # 34 JSON files (471 questions)
│   ├── results/               # Saved quiz results
│   └── schemas/               # Question JSON schema
├── docs/
│   └── learning-notes/
│       └── EXAM-CHEAT-SHEET.md # Comprehensive exam reference
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
# All tests (73 tests)
npm test

# Individual suites
npm run test:data    # Question bank validation
npm run test:api     # API endpoint tests
npm run test:mcp     # MCP server tests
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

---

## Tech Stack

- **Backend:** Node.js + Express
- **MCP Server:** `@modelcontextprotocol/sdk` v1.30.0
- **Testing:** `node:test` (built-in)
- **Frontend:** Vanilla HTML/CSS/JS
- **Data:** JSON files (no database required)

---

**Happy Learning!** 🚀
