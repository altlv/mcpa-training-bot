# MCPA Training Bot — Plan

**Exam:** Sep 12, 2026
**Started:** Aug 13, 2026
**Daily Commitment:** 2+ hours

---

## ✅ Completed

### Phase 1: Quiz Engine (Aug 13-20)
- [x] Express server + API + Swagger UI
- [x] 471 questions across 17 chapters (34 JSON files)
- [x] Quiz GUI: tag selection, session, results, tag scoring
- [x] Scoring accuracy (single + multi-select)
- [x] Question letter re-assignment by position

### Phase 2: MCP Server (Aug 21)
- [x] MCP SDK + stdio transport
- [x] 6 tools: search, explain, questions, sections, weak areas, similar
- [x] 3 resources: cheat-sheet, exam-domains, glossary
- [x] 2 prompts: teach-concept, compare
- [x] Full test coverage (20 tests)

### Phase 3: Teaching Assistant (Aug 22)
- [x] Chat service (rule-based, no AI dependency)
- [x] Chat API (message, context, action, history)
- [x] Training mode UI (split screen: quiz + chat)
- [x] Instant feedback after each answer
- [x] Quick action buttons: "Why?" + "What concept?"

### Phase 4: Test Quality (Aug 21-22)
- [x] QA agent audit → found issues → fixed
- [x] Upgraded MCP test assertions
- [x] Added edge case + error path tests
- [x] Fixed 2 production bugs
- [x] 73/73 tests passing

---

## 🔲 Next Steps

### Week of Aug 25-31
- [ ] Fix 23 multi-select questions (all 5 options marked correct)
- [ ] Git commit all changes
- [ ] Practice exam mode (60 questions, 90 min timer)
- [ ] Domain-weighted question selection
- [ ] Weak areas dashboard

### Week of Sep 1-7
- [ ] Speed training mode (timed rapid-fire)
- [ ] Progress persistence across sessions
- [ ] Final practice exams
- [ ] Cheat sheet review sessions

### Exam Week (Sep 8-12)
- [ ] Final practice exam
- [ ] Light review only
- [ ] REST day (Sep 11)
- [ ] EXAM DAY (Sep 12) 🎯

---

## 🔲 Sidequest: MCP Protocol Lab (added 2026-09-15)

**Goal:** learn the protocol by defining resources, tools and prompts, and by *watching*
the message exchange — including what goes on the wire when something fails.

**Inspiration:** [ShawhinT/YouTube-Blog `agents/4-mcp`](https://github.com/ShawhinT/YouTube-Blog/tree/main/agents/4-mcp)
— Python, stdio, Gmail tools behind Google OAuth, run with `uv run mcp dev` (which opens
the MCP Inspector). Only its file list and a summary were read, not the code. The idea
to borrow is the Inspector-first workflow; the Gmail/OAuth parts are not needed here.

### Starting point (checked 2026-09-15)
- `src/mcp/server.js` — `McpServer` + `StdioServerTransport`. A grep finds **8**
  `server.tool`, **3** `server.resource`, **2** `server.prompt` calls. The README says 8
  tools; Phase 2 above and the Architecture diagram still say 6 — stale, not yet fixed.
- `test/mcp-server.test.js` — already contains a client (`createMcpClient()`);
  `npm run test:mcp` runs it.
- Missing: any way to see the raw JSON-RPC messages, and any deliberate failure cases.
- No `isError`, `sendLoggingMessage` or Inspector mention was confirmed — that search
  was interrupted, so re-run it before relying on this line.

### Steps
- [ ] **1. Look, no code.** Run the existing server under the Inspector and walk
      `initialize` → `tools/list` → `tools/call` → `resources/list` / `resources/read` →
      `prompts/list` / `prompts/get` in its history pane.
      `npx @modelcontextprotocol/inspector node src/mcp/server.js` (downloads the Inspector)
- [ ] **2. Tracing client** — e.g. `scripts/mcp-trace.js`: spawn the server, print every
      JSON-RPC message in both directions with a timestamp and direction arrow, run the
      same sequence as step 1. Goal: the raw protocol, not the SDK's parsed results.
- [ ] **3. Failure catalogue** — trigger each on purpose, record what the trace shows and
      which layer caught it:
  - [ ] Tool fails → returns `isError: true` (a *result* the model reads, not a protocol error)
  - [ ] Invalid arguments → JSON-RPC error `-32602` from schema validation
  - [ ] Unknown tool / resource URI / prompt name
  - [ ] `console.log` inside the stdio server → stdout corrupted, client parse failure
  - [ ] Server crashes or exits mid-session → transport closed
  - [ ] Handler never answers → client request timeout
  - [ ] Protocol version mismatch during `initialize`
- [ ] **4. Tests for the catalogue** — one test per failure in `test/`, so each behaviour
      stays proven rather than remembered.
- [ ] **5. (Optional) Streamable HTTP transport** beside stdio — sessions, headers, SSE.
- [ ] Fix the stale 6-tools counts in Phase 2 and the Architecture diagram.

### Notes
- A harness project (`cc-pw-qe-harness`, PLAN item 11) may later use this repo's tests
  as ground truth for agent findings; if that happens it should pin a commit. Nothing
  here needs to wait for it.

---

## What We Built vs Original Plan

| Original Plan | What Actually Happened |
|---------------|----------------------|
| Vectra/RAG for knowledge retrieval | Removed — cheat sheet search is sufficient |
| SQLite for progress tracking | Not needed — JSON files work fine |
| Separate quiz + knowledge servers | Unified server is simpler |
| 3 questions per page | 1 question per page (better for training) |
| AI-powered chat (OpenAI API) | Rule-based chat (no API costs, works offline) |
| 30-day timeline | Core features done in ~4 days |

---

## Architecture (Current)

```
Browser
  ├── index.html (Exam Mode)
  └── training.html (Training Mode: quiz + chat)
        │
        ▼
Express Server (port 3000)
  ├── /api/quiz/* (start, submit, tags, questions)
  ├── /api/chat/* (message, context, action, history)
  └── /api/docs (Swagger UI)
        │
        ├── QuestionService (load + score questions)
        ├── ChatService (search cheat sheet + explain)
        └── JSON files (471 questions)

MCP Server (stdio) — separate process
  └── 6 tools, 3 resources, 2 prompts
      Used by: Goose, Claude Desktop, etc.
```

---

*Last updated: 2026-08-22*
