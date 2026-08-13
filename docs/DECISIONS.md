# MCPA Training Bot - Decision Log
## Why We Made Each Choice

---

## Decision 001: Use MCP for Quiz Engine
**Date:** 2026-08-13
**Decision:** Build quiz engine as MCP server
**Alternatives considered:**
- Regular npm package
- REST API
- Direct function calls

**Why MCP?**
1. You're learning MCP - building it teaches you better than just reading
2. Standard interface - can swap quiz engine later
3. Reusable - other apps can use your quiz engine
4. Portfolio piece - shows you can build MCP servers

**Trade-off:** More complexity than a simple function, but worth it for learning.

---

## Decision 002: Use ChromaDB for RAG
**Date:** 2026-08-13
**Decision:** ChromaDB as vector database
**Alternatives considered:**
- Pinecone (cloud)
- Weaviate (more complex)
- FAISS (Facebook's, harder to use)
- Simple text search

**Why ChromaDB?**
1. Local-first (no cloud costs)
2. Simple API (beginner-friendly)
3. Docker or npm install (flexible)
4. Good documentation
5. Works great for small-medium datasets

**Trade-off:** Less scalable than cloud options, but you don't need scale for learning.

---

## Decision 003: Node.js Backend
**Date:** 2026-08-13
**Decision:** Node.js + JavaScript
**Alternatives considered:**
- Python
- Go
- Rust

**Why Node.js?**
1. You already have Goose (Node-based)
2. JavaScript/TypeScript is everywhere
3. Huge ecosystem (npm)
4. Easy to find help
5. Fast enough for this project

**Trade-off:** Python has better ML libraries, but we don't need them for quiz generation.

---

## Decision 004: SQLite for Progress
**Date:** 2026-08-13
**Decision:** SQLite for progress tracking
**Alternatives considered:**
- localStorage (browser only)
- PostgreSQL (overkill)
- JSON files
- MongoDB

**Why SQLite?**
1. Single file (easy to backup)
2. No server needed
3. Queryable (can ask complex questions)
4. Built into most systems
5. Perfect for personal projects

**Trade-off:** Not multi-user, but you don't need that.

---

## Decision 005: Simple HTML Frontend
**Date:** 2026-08-13
**Decision:** Plain HTML/CSS/JS (no frameworks)
**Alternatives considered:**
- React
- Vue
- Angular
- Electron (desktop app)

**Why simple HTML?**
1. Less to learn (focus on MCP, not React)
2. Faster to build
3. No build step (just open the file)
4. Good enough for MVP
5. Can upgrade later

**Trade-off:** Less interactive than React, but fine for quiz interface.

---

## Decision 006: Local-First Architecture
**Date:** 2026-08-13
**Decision:** Everything runs on your machine
**Alternatives considered:**
- Vercel/Netlify (frontend)
- Railway/Render (backend)
- AWS/GCP (full stack)

**Why local?**
1. No API costs (learning should be free!)
2. No internet required
3. Faster iteration (no deploy wait)
4. Your data stays private
5. Simpler debugging

**Trade-off:** Can't share easily, but you can add deployment later.

---

## Decision 007: Task-Based Learning
**Date:** 2026-08-13
**Decision:** Break into small, numbered tasks
**Alternatives considered:**
- Build everything at once
- Follow a tutorial exactly
- wing it

**Why task-based?**
1. Clear progress (check boxes = dopamine!)
2. Can stop and resume easily
3. Easier to ask for help ("Task 2.3 is stuck")
4. Reduces overwhelm
5. Better for switching models/sessions

**Trade-off:** More planning upfront, but saves time overall.

---

## Decision 008: Document Everything
**Date:** 2026-08-13
**Decision:** Create ARCHITECTURE.md, DECISIONS.md, LEARNING.md
**Alternatives considered:**
- Comments in code only
- README only
- No documentation

**Why so much documentation?**
1. Learning requires reflection
2. Future you will forget
3. Others can learn from your journey
4. Interview gold ("I built X because Y")
5. QA mindset = document behavior

**Trade-off:** Takes time, but saves more time later.

---

## Decision 009: Start with MCP Ch1-4 Questions
**Date:** 2026-08-13
**Decision:** Build quiz questions for completed sections first
**Alternatives considered:**
- Build all questions at once
- Start with random chapter
- Use external question bank

**Why start with completed sections?**
1. You already understand the content
2. Can verify accuracy
3. Quick win (questions you can answer!)
4. Tests the system with known-good data
5. Builds confidence

**Trade-off:** Limited scope initially, but better for learning.

---

## Decision 010: Use Goose for Development
**Date:** 2026-08-13
**Decision:** Build this bot using Goose
**Alternatives considered:**
- Build manually in VS Code
- Use another AI assistant
- Follow YouTube tutorials

**Why Goose?**
1. You already have it!
2. Can ask questions while building
3. Goose understands MCP (it uses it!)
4. Can delegate complex tasks
5. Interactive learning (not just reading)

**Trade-off:** Dependency on AI, but you're learning the concepts too.

---

## How to Add New Decisions

When you make a choice, add it here:

```markdown
## Decision 0XX: [Title]
**Date:** YYYY-MM-DD
**Decision:** [What you decided]
**Alternatives considered:**
- [Option 1]
- [Option 2]

**Why [Decision]?**
1. [Reason 1]
2. [Reason 2]

**Trade-off:** [What you give up]
```

---

## Key Principles Behind Decisions

1. **Learning first** - Optimize for understanding, not performance
2. **Local-first** - Avoid cloud costs and complexity
3. **Incremental** - Small steps, constant progress
4. **Documented** - Every choice explained
5. **Testable** - QA mindset throughout

---

*Last updated: 2026-08-13*
*Next review: After Phase 1 completion*