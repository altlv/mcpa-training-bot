# MCPA Training Bot — TODO

**Exam:** Sep 12, 2026
**Status:** Core features complete, polish remaining

---

## ✅ Completed

### Phase 1: Quiz Engine
- [x] Express server with API + Swagger UI
- [x] 471 questions across 17 chapters (34 JSON files)
- [x] Quiz GUI: tag selection, quiz session, results, tag scoring
- [x] Scoring accuracy (single + multi-select)
- [x] Question letter re-assignment by position
- [x] 73 tests passing (api, data-integrity, mcp-server)

### Phase 2: MCP Server
- [x] MCP SDK installed + stdio transport
- [x] 6 tools: search, explain, questions, sections, weak areas, similar
- [x] 3 resources: cheat-sheet, exam-domains, glossary
- [x] 2 prompts: teach-concept, compare
- [x] Tool + resource + prompt tests

### Phase 3: Teaching Assistant
- [x] Chat service (rule-based, no AI dependency)
- [x] Chat API endpoints (message, context, action, history)
- [x] Training mode UI (split screen: quiz + chat)
- [x] Instant feedback after each answer
- [x] Quick action buttons: "Why?" + "What concept?"
- [x] Chat context auto-updates with current question

### Phase 4: Test Quality
- [x] QA agent audit: found 27 issues, fixed top 3
- [x] Upgraded MCP test assertions (no more `length > 100`)
- [x] Added 13 new tests (edge cases, error paths)
- [x] Fixed 2 production bugs (getAllQuestions, section parser)
- [x] 73/73 tests passing

---

## 🔲 Remaining

### High Priority
- [ ] **Fix 23 multi-select questions** — all 5 options marked correct (data quality issue)
- [ ] **Git commit** — all changes since last commit
- [ ] **Practice exam mode** — 60 questions, 90 min timer, domain-weighted selection
- [ ] **Weak areas dashboard** — visualize quiz results over time

### Medium Priority
- [ ] **AI integration for chat** — replace rule-based with LLM (optional)
- [ ] **Progress persistence** — track scores across sessions (localStorage or JSON)
- [ ] **Domain-weighted question selection** — match exam proportions (26/24/20/16/14)
- [ ] **Speed training mode** — timed rapid-fire questions

### Low Priority (Nice to have)
- [ ] **Spaced repetition** — review missed questions at intervals
- [ ] **Dark mode** — theme toggle
- [ ] **Export results** — download score report as PDF
- [ ] **Keyboard shortcuts** — faster navigation

---

## 📋 Exam Day Checklist

- [ ] Score 80%+ on 2 practice exams
- [ ] Review all cheat sheet sections
- [ ] Complete weak area remediation
- [ ] Rest day before exam

---

## Architecture Notes

### What exists now
- Express API server (port 3000)
- MCP server (stdio, for AI hosts)
- Exam mode quiz (index.html)
- Training mode quiz + chat (training.html)
- 471 questions, 73 tests

### What we decided NOT to build
- ~~Vectra/RAG~~ — removed, cheat sheet search is sufficient
- ~~SQLite~~ — JSON files work fine for this scale
- ~~Separate quiz + knowledge servers~~ — unified server is simpler
- ~~3 questions per page~~ — 1 question per page works better for training

---

*Last updated: 2026-08-22*
