# Decision Log

Technical decisions and their rationale.

---

## Decision 001: Use Express for API
**Date:** Aug 13, 2026
**Decision:** Express.js for HTTP server
**Alternatives considered:** Fastify, Koa, raw Node.js http
**Why:** Simple, well-documented, good for learning
**Trade-off:** Slightly slower than Fastify, but irrelevant at this scale

---

## Decision 002: JSON files for question storage
**Date:** Aug 13, 2026
**Decision:** Store questions in JSON files (not database)
**Alternatives considered:** SQLite, MongoDB, PostgreSQL
**Why:**
- No database server to install
- Git-friendly (version control)
- 471 questions load in <100ms
- Simple to edit and validate
**Trade-off:** Can't query efficiently at scale (not needed here)

---

## Decision 003: MCP SDK v1.30.0 with Zod schemas
**Date:** Aug 21, 2026
**Decision:** Use official MCP SDK with Zod for tool parameter validation
**Alternatives considered:** Manual JSON-RPC, raw stdio
**Why:**
- Official SDK handles protocol details
- Zod provides runtime validation
- Matches real-world MCP usage
**Trade-off:** Dependency on SDK version

---

## Decision 004: Single-file MCP server
**Date:** Aug 21, 2026
**Decision:** All MCP tools/resources/prompts in one server.js file
**Alternatives considered:** Separate files per tool (src/mcp/tools/*.js)
**Why:**
- Simpler to navigate and debug
- Single file is only ~500 lines
- No need for dynamic loading
**Trade-off:** Harder to modularize if it grows significantly

---

## Decision 005: Rule-based chat (no AI dependency)
**Date:** Aug 22, 2026
**Decision:** Chat service uses cheat sheet search, not LLM
**Alternatives considered:** OpenAI API, local LLM, Claude API
**Why:**
- No API costs
- No internet required
- Deterministic responses
- Works offline
**Trade-off:** Less flexible than AI, but sufficient for exam prep

---

## Decision 006: Letter re-assignment by position
**Date:** Aug 21, 2026
**Decision:** Re-assign A/B/C/D based on option position (not shuffle)
**Alternatives considered:** Fisher-Yates shuffle, no re-assignment
**Why:**
- 300+ questions eliminates memorization concern
- Correct answers tracked by TEXT content
- Simplifies debugging and testing
**Trade-off:** Options always appear in same order within a session

---

## Decision 007: Instant feedback in training mode
**Date:** Aug 22, 2026
**Decision:** Show correct/wrong immediately after answering
**Alternatives considered:** Delayed feedback (exam mode), on-demand
**Why:**
- Learning science: immediate correction improves retention
- Chat can explain while question is fresh
- More engaging than waiting for submit
**Trade-off:** Less realistic than exam conditions (that's what exam mode is for)

---

## Decision 008: Split-screen training UI
**Date:** Aug 22, 2026
**Decision:** Quiz on left, chat on right (side by side)
**Alternatives considered:** Tab switching, overlay, separate pages
**Why:**
- See question + chat simultaneously
- No context switching
- Natural conversation flow
**Trade-off:** Requires wider screen (responsive: stacks on mobile)

---

## Decision 009: 10-message chat limit
**Date:** Aug 22, 2026
**Decision:** Keep last 10 messages per chat session
**Alternatives considered:** Unlimited, 20, 50
**Why:**
- Prevents context window bloat
- Focuses on recent discussion
- Matches real chat UX
**Trade-off:** Older explanations not visible (but quiz results persist)

---

## Decision 010: Node:test for test runner
**Date:** Aug 21, 2026
**Decision:** Use built-in node:test (no Jest/Mocha)
**Alternatives considered:** Jest, Mocha, Vitest
**Why:**
- Zero dependencies
- Built into Node.js v18+
- Sufficient for this project
**Trade-off:** Less features than Jest (no built-in coverage, mocking)

---

## Principles

1. **Learning first** — Optimize for understanding, not performance
2. **Local-first** — No cloud costs, works offline
3. **Incremental** — Small steps, constant progress
4. **Tested** — 73 tests prove correctness
5. **Documented** — Every choice explained

---

*Last updated: 2026-08-22*
