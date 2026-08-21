# MCPA Training Bot — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Exam Mode        │  │  Training Mode    │                │
│  │  (index.html)     │  │  (training.html)  │                │
│  │  - Quiz only      │  │  - Quiz + Chat    │                │
│  │  - Delayed score  │  │  - Instant score  │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
└───────────┼─────────────────────┼───────────────────────────┘
            │ HTTP                │ HTTP
┌───────────▼─────────────────────▼───────────────────────────┐
│                    Express Server                            │
│                    (src/server.js)                            │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │ Quiz Routes  │  │ Chat Routes │  │ Swagger UI       │    │
│  │ /api/quiz/*  │  │ /api/chat/* │  │ /api/docs        │    │
│  └──────┬──────┘  └──────┬──────┘  └──────────────────┘    │
│         │                 │                                   │
│  ┌──────▼──────┐  ┌──────▼──────┐                           │
│  │ Question    │  │ Chat        │                           │
│  │ Service     │  │ Service     │                           │
│  └──────┬──────┘  └──────┬──────┘                           │
└─────────┼─────────────────┼─────────────────────────────────┘
          │                 │
   ┌──────▼──────┐  ┌──────▼──────┐
   │ JSON Files  │  │ Cheat Sheet │
   │ (questions) │  │ (markdown)  │
   └─────────────┘  └─────────────┘


┌─────────────────────────────────────────────────────────────┐
│                    MCP Server (stdio)                        │
│                    (src/mcp/server.js)                        │
│                                                              │
│  Tools: search_concepts, explain_topic, get_questions_by_tag │
│         get_cheat_sheet_section, get_weak_areas              │
│         get_similar_questions                                 │
│  Resources: mcpa://cheat-sheet, mcpa://exam-domains,        │
│             mcpa://glossary                                   │
│  Prompts: teach-concept, compare                             │
│                                                              │
│  Used by: AI hosts (Goose, Claude Desktop, etc.)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Express Server (`src/server.js`)
**What:** HTTP server serving API + static files
**Port:** 3000
**Why:** Central hub connecting frontend, API, and data

### 2. Quiz Service (`src/routes/quiz.js`)
**What:** API endpoints for quiz functionality
**Endpoints:**
- `GET /api/health` — server status
- `GET /api/tags` — available topics
- `POST /api/quiz/start` — create session, return questions
- `POST /api/quiz/submit` — score answers, save results
- `GET /api/questions/:id` — single question lookup

### 3. Question Service (`src/services/questionService.js`)
**What:** Core logic for loading, preparing, and scoring questions
**Key methods:**
- `loadQuestions()` — reads 34 JSON files, returns 471 questions
- `getQuestionsByTags()` — filter by topic
- `prepareQuizQuestions()` — re-assign letters A/B/C by position
- `scoreAnswers()` — compare user answers, return score + breakdown
- `getAllQuestions()` — return all loaded questions

**Design decisions:**
- Letters reassigned by position (not shuffled) — 300+ questions means no memorization concern
- Correct answers tracked by TEXT content (not letter) — survives letter re-assignment
- Multi-select scoring: order-independent string comparison

### 4. Chat Service (`src/services/chatService.js`)
**What:** Teaching assistant that explains MCP concepts
**How it works:**
- Searches cheat sheet content for relevant lines
- Routes messages to appropriate handlers (explain_answer, identify_concept, search)
- Maintains chat history (up to 10 messages per session)
- No AI dependency — pure rule-based search + templates

### 5. MCP Server (`src/mcp/server.js`)
**What:** Model Context Protocol server exposing teaching tools
**Transport:** stdio (for local use with AI hosts)
**Tools:** 6 tools for searching, explaining, and finding questions
**Resources:** 3 resources providing cheat sheet, domains, glossary
**Prompts:** 2 prompt templates for teaching and comparison

---

## Data Flow

### Exam Mode
```
User selects tags → POST /api/quiz/start → Questions returned
User answers → POST /api/quiz/submit → Score + results saved
Results saved to: data/results/quiz_*.json
```

### Training Mode
```
User selects tags → POST /api/quiz/start → Questions returned
User clicks answer → Instant feedback shown
                     → POST /api/chat/context → Chat updated
User asks "why?" → POST /api/chat/action → Explanation from cheat sheet
```

### MCP Server (standalone)
```
AI Host (Goose) → stdio → MCP Server → Tool called
                                    → Cheat sheet searched
                                    → Response returned
```

---

## File Structure

```
mcpa-bot/
├── src/
│   ├── server.js              # Express entry point
│   ├── mcp/server.js          # MCP server (stdio transport)
│   ├── routes/
│   │   ├── quiz.js            # Quiz API (health, tags, start, submit)
│   │   └── chat.js            # Chat API (message, context, action)
│   └── services/
│       ├── questionService.js  # Question loading + scoring
│       └── chatService.js      # Teaching assistant logic
├── public/
│   ├── index.html             # Exam mode interface
│   ├── training.html          # Training mode (split screen)
│   ├── css/style.css          # Shared styles
│   └── js/
│       ├── app.js             # Exam mode logic
│       └── api.js             # API helpers
├── test/
│   ├── api.test.js            # 37 tests: endpoints + scoring
│   ├── data-integrity.test.js # 16 tests: question validation
│   └── mcp-server.test.js     # 20 tests: MCP tools/resources
├── data/
│   ├── questions/             # 34 JSON files (471 questions)
│   ├── results/               # Saved quiz results
│   └── schemas/               # Question JSON schema
├── docs/
│   └── learning-notes/
│       └── EXAM-CHEAT-SHEET.md
└── package.json
```

---

## Design Decisions

### Why JSON files (not database)?
- **Simplicity:** No server setup required
- **Portability:** Copy folder, run anywhere
- **Version control:** Git-friendly
- **Scale:** 471 questions loads in <100ms

### Why rule-based chat (not AI)?
- **No API costs:** Runs entirely locally
- **No dependencies:** No OpenAI key needed
- **Reliability:** deterministic responses
- **Can add AI later:** Chat service is swappable

### Why MCP server separately?
- **Reusability:** Other AI apps can use it
- **Learning:** Building MCP teaches MCP
- **Standard:** Any MCP-compatible host can connect

### Why instant feedback in training mode?
- **Learning science:** Immediate correction improves retention
- **Context:** Chat can explain while question is fresh
- **Engagement:** Faster feedback loop = more practice

---

*Last updated: 2026-08-22*
