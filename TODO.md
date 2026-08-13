# MCPA Training Bot
# 30-Day Battle Plan
## Guided Development + Exam Prep

**Status:** READY TO START
**Start:** Aug 13, 2026
**Exam:** Sep 12, 2026
**Learning Style:** Guided development (we build together!)
**Daily Commitment:** 2+ hours

---

## Project Files Created

- [x] README.md - Project overview
- [x] TODO.md - This file (master plan)
- [x] ARCHITECTURE.md - WHY things are built this way
- [x] docs/GETTING-STARTED.md - Beginner guide
- [x] docs/DECISIONS.md - Technical choices
- [x] docs/LEARNING.md - Learning journal
- [x] docs/EXAM-CHEAT-SHEET.md - Exam prep reference
- [x] docs/SESSION-LOG.md - Session tracker

---

## WEEK 1: Foundation (Aug 13-19)
**Goal:** Understand MCP + Build Quiz Engine MVP

### Day 1 - TODAY (Aug 13) - MCP Basics [2.5 hrs]
- [ ] **0:00-0:10** | Say "Day 1, ready!" and review plan
- [ ] **0:10-0:40** | READ: https://modelcontextprotocol.io/docs/getting-started/intro
- [ ] **0:40-0:45** | BREAK
- [ ] **0:45-1:45** | BUILD: Project setup + folder structure
  - [ ] Create mcpa-bot/src/
  - [ ] Create mcpa-bot/data/
  - [ ] Create mcpa-bot/public/
  - [ ] Initialize npm (npm init -y)
  - [ ] Install express (npm install express)
- [ ] **1:45-1:50** | BREAK
- [ ] **1:50-2:15** | TEST: Verify setup works
  - [ ] Run: dir (check folders exist)
  - [ ] Run: npm list (check express installed)
- [ ] **2:15-2:30** | REFLECT:
  - [ ] Write 3-sentence summary of MCP
  - [ ] Update SESSION-LOG.md
  - [ ] Mark this section complete

**Day 1 Deliverables:**
- [ ] MCP summary written
- [ ] Project structure created
- [ ] npm initialized
- [ ] Express installed
- [ ] Session log updated

---

### Day 2 - Aug 14 - MCP Architecture [2.5 hrs]
- [ ] **0:00-0:10** | Review Day 1 learning
- [ ] **0:10-0:40** | STUDY: Chapter 2 - Architecture
  - [ ] Read about Host, Client, Server
  - [ ] Understand cardinality
  - [ ] Learn about transports (stdio vs HTTP)
- [ ] **0:40-0:45** | BREAK
- [ ] **0:45-1:45** | BUILD: Question schema
  - [ ] Create data/schemas/question.json
  - [ ] Define fields: id, type, question, options, answer, explanation
  - [ ] Create 3 sample questions for Ch1
- [ ] **1:45-1:50** | BREAK
- [ ] **1:50-2:15** | TEST: Validate schema
  - [ ] Test JSON validity
  - [ ] Test sample questions load correctly
- [ ] **2:15-2:30** | REFLECT:
  - [ ] Draw architecture diagram on paper
  - [ ] Update SESSION-LOG.md
  - [ ] Mark this section complete

**Day 2 Deliverables:**
- [ ] Architecture diagram drawn
- [ ] Question schema created
- [ ] 3 sample questions written
- [ ] Session log updated

---

### Day 3 - Aug 15 - JSON-RPC Deep Dive [2.5 hrs]
- [ ] **0:00-0:10** | Review Day 2 learning
- [ ] **0:10-0:40** | STUDY: Chapter 3 - JSON-RPC 2.0
  - [ ] Message shapes (Request, Response, Notification)
  - [ ] Params & batching
  - [ ] Error object & codes
- [ ] **0:40-0:45** | BREAK
- [ ] **0:45-1:45** | BUILD: Question bank
  - [ ] Create 10 questions for Ch1-3
  - [ ] Mix difficulty (easy, medium, hard)
  - [ ] Save to data/questions/bank.json
- [ ] **1:45-1:50** | BREAK
- [ ] **1:50-2:15** | TEST: Question validation
  - [ ] Test each question loads
  - [ ] Verify answers are correct
  - [ ] Check explanations make sense
- [ ] **2:15-2:30** | REFLECT:
  - [ ] Update EXAM-CHEAT-SHEET.md with JSON-RPC notes
  - [ ] Update SESSION-LOG.md

**Day 3 Deliverables:**
- [ ] 10 questions created
- [ ] Questions validated
- [ ] Cheat sheet updated
- [ ] Session log updated

---

### Day 4 - Aug 16 - Quiz Engine Core [2.5 hrs]
- [ ] **0:00-0:10** | Review Day 3 learning
- [ ] **0:10-0:40** | STUDY: MCP tools/resources concept
- [ ] **0:40-0:45** | BREAK
- [ ] **0:45-1:45** | BUILD: Quiz MCP Server
  - [ ] Create src/mcp-servers/quiz-server.js
  - [ ] Implement: generate_mcq()
  - [ ] Implement: evaluate_answer()
  - [ ] Basic test with sample questions
- [ ] **1:45-1:50** | BREAK
- [ ] **1:50-2:15** | TEST: Quiz server
  - [ ] Test generate_mcq returns valid question
  - [ ] Test evaluate_answer works correctly
  - [ ] Test error handling
- [ ] **2:15-2:30** | REFLECT:
  - [ ] Update SESSION-LOG.md

**Day 4 Deliverables:**
- [ ] Quiz server created
- [ ] generate_mcq() working
- [ ] evaluate_answer() working
- [ ] Basic tests passed
- [ ] Session log updated

---

### Day 5 - Aug 17 - Quiz Polish + UI [3 hrs]
- [ ] **0:00-0:10** | Review Day 4 learning
- [ ] **0:10-0:40** | STUDY: Server features (Tools/Resources/Prompts)
- [ ] **0:40-0:45** | BREAK
- [ ] **0:45-1:45** | BUILD: Difficulty levels + HTML UI
  - [ ] Add easy/medium/hard to questions
  - [ ] Create public/index.html
  - [ ] Add quiz interface (input, submit, display)
- [ ] **1:45-1:50** | BREAK
- [ ] **1:50-2:15** | BUILD: Connect frontend
  - [ ] Wire HTML to quiz server
  - [ ] Test end-to-end flow
- [ ] **2:15-2:45** | TEST: Full quiz flow
  - [ ] Start quiz
  - [ ] Answer questions
  - [ ] See results
  - [ ] Test edge cases
- [ ] **2:45-3:00** | REFLECT:
  - [ ] Update SESSION-LOG.md
  - [ ] Take first practice quiz!

**Day 5 Deliverables:**
- [ ] Difficulty levels added
- [ ] HTML UI created
- [ ] Frontend connected to backend
- [ ] Full quiz flow working
- [ ] First practice quiz taken!

---

### Day 6 - Aug 18 - Server Features [2.5 hrs]
- [ ] **0:00-0:10** | Review Day 5 - celebrate quiz working!
- [ ] **0:10-0:40** | STUDY: Chapter 4 - Server Features
  - [ ] Tools (functions AI can call)
  - [ ] Resources (data AI can read)
  - [ ] Prompts (templates for interactions)
  - [ ] Tool invocation lifecycle
- [ ] **0:40-0:45** | BREAK
- [ ] **0:45-1:45** | BUILD: Server feature questions
  - [ ] Add 10 questions for Ch4
  - [ ] Include scenario-based questions
  - [ ] Add "what's the difference" questions
- [ ] **1:45-1:50** | BREAK
- [ ] **1:50-2:15** | TEST: New questions
  - [ ] Test all new questions
  - [ ] Verify difficulty levels
  - [ ] Check explanations
- [ ] **2:15-2:30** | REFLECT:
  - [ ] Update EXAM-CHEAT-SHEET.md
  - [ ] Update SESSION-LOG.md

**Day 6 Deliverables:**
- [ ] Ch4 questions added
- [ ] Scenario questions created
- [ ] Questions validated
- [ ] Cheat sheet updated
- [ ] Session log updated

---

### Day 7 - Aug 19 - Week 1 Review [2 hrs]
- [ ] **0:00-0:10** | Review the week's learning
- [ ] **0:10-0:40** | REVIEW: All Ch1-4 content
  - [ ] Read through EXAM-CHEAT-SHEET.md
  - [ ] Review any confusing topics
- [ ] **0:40-0:45** | BREAK
- [ ] **0:45-1:15** | QUIZ: Practice quiz (20 questions)
  - [ ] Mix all chapters
  - [ ] Time yourself
  - [ ] Note weak areas
- [ ] **1:15-1:45** | REVIEW: Quiz results
  - [ ] Understand mistakes
  - [ ] Update learning journal
- [ ] **1:45-2:00** | REFLECT:
  - [ ] Update SESSION-LOG.md
  - [ ] Update confidence levels
  - [ ] Plan Week 2 focus areas

**Day 7 Deliverables:**
- [ ] Week 1 review complete
- [ ] Practice quiz taken
- [ ] Weak areas identified
- [ ] Week 2 planned
- [ ] Session log updated

---

## WEEK 2: Security + RAG (Aug 20-26)
**Goal:** Master Security topics + Add RAG

### Day 8 - Aug 20 - Client Features [2.5 hrs]
- [ ] Study Chapter 5 (Sampling, Roots, Elicitation)
- [ ] Add 8 client feature questions
- [ ] Test new questions
- [ ] Update SESSION-LOG.md

### Day 9 - Aug 21 - Utilities + Security [2.5 hrs]
- [ ] Study Chapter 6-7
- [ ] Add utility questions
- [ ] Begin security concepts
- [ ] Update SESSION-LOG.md

### Day 10 - Aug 22 - OAuth 2.1 Deep Dive [3 hrs]
- [ ] Study Chapter 8 (OAuth 2.1)
- [ ] Focus on authorization flow
- [ ] Create security scenarios
- [ ] Add 12 hard questions
- [ ] Update EXAM-CHEAT-SHEET.md

### Day 11 - Aug 23 - Vectra Setup [2.5 hrs]
- [ ] Install Vectra (npm install vectra)
- [ ] Build vector store module
- [ ] Create embedding functions
- [ ] Load MCP spec content
- [ ] Test basic retrieval
- [ ] Update SESSION-LOG.md

### Day 12 - Aug 24 - Vectra Integration [2.5 hrs]
- [ ] Connect Vectra to quiz engine
- [ ] Test "explain this concept" feature
- [ ] Add source citations
- [ ] Test retrieval accuracy
- [ ] Update SESSION-LOG.md

### Day 13 - Aug 25 - Use Cases [2.5 hrs]
- [ ] Study Chapter 9
- [ ] Study AAIF overview
- [ ] Add ecosystem questions
- [ ] Update SESSION-LOG.md

### Day 14 - Aug 26 - Week 2 Review [2 hrs]
- [ ] Full practice quiz (30 questions, Ch1-9)
- [ ] Review weak areas
- [ ] Update learning journal
- [ ] RAG testing
- [ ] Update SESSION-LOG.md

**Week 2 Milestone:** Complete quiz bank + Vectra-powered explanations

---

## WEEK 3: Advanced Features + Practice (Aug 27 - Sep 2)
**Goal:** Smart features + Intensive practice

### Day 15 - Aug 27 - AAIF Deep Dive [2.5 hrs]
- [ ] Study Ch10 (AAIF projects)
- [ ] Goose, AGENTS.md, agentgateway
- [ ] Add AAIF questions
- [ ] Update SESSION-LOG.md

### Day 16 - Aug 28 - Progress Tracking [3 hrs]
- [ ] Build progress schema
- [ ] Implement SQLite storage
- [ ] Create dashboard
- [ ] Test progress tracking
- [ ] Update SESSION-LOG.md

### Day 17 - Aug 29 - Adaptive Difficulty [2.5 hrs]
- [ ] Implement adaptive logic
- [ ] Track accuracy by domain
- [ ] Auto-adjust difficulty
- [ ] Test adaptation
- [ ] Update SESSION-LOG.md

### Day 18 - Aug 30 - Spaced Repetition [2.5 hrs]
- [ ] Build review scheduler
- [ ] Implement missed question tracking
- [ ] Create review mode
- [ ] Test spaced repetition
- [ ] Update SESSION-LOG.md

### Day 19 - Aug 31 - Scenario Questions [3 hrs]
- [ ] Build scenario generator
- [ ] Create "what-if" questions
- [ ] Add debugging scenarios
- [ ] Test scenario engine
- [ ] Update SESSION-LOG.md

### Day 20 - Sep 1 - Full Practice Exam #1 [2.5 hrs]
- [ ] Generate 60-question exam
- [ ] Timed practice (90 min)
- [ ] Review all answers
- [ ] Identify gaps
- [ ] Update SESSION-LOG.md

### Day 21 - Sep 2 - Week 3 Review [2 hrs]
- [ ] Target weak areas
- [ ] Retake missed questions
- [ ] Update study plan
- [ ] Celebrate progress!
- [ ] Update SESSION-LOG.md

**Week 3 Milestone:** Full-featured training bot + first practice exam

---

## WEEK 4: Exam Prep + Polish (Sep 3-9)
**Goal:** Exam readiness + Final polish

### Day 22 - Sep 3 - Weak Area Focus [2.5 hrs]
- [ ] Review practice exam results
- [ ] Deep dive on weak domains
- [ ] Targeted quizzes
- [ ] Update SESSION-LOG.md

### Day 23 - Sep 4 - Speed Training [2.5 hrs]
- [ ] Quick-fire quiz sessions
- [ ] 20 questions in 15 minutes
- [ ] Improve recall speed
- [ ] Update SESSION-LOG.md

### Day 24 - Sep 5 - Edge Cases [2.5 hrs]
- [ ] Study exam edge cases
- [ ] Create tricky questions
- [ ] Test your QA skills
- [ ] Update SESSION-LOG.md

### Day 25 - Sep 6 - Full Practice Exam #2 [2.5 hrs]
- [ ] New 60-question exam
- [ ] Timed (90 min)
- [ ] Compare to first attempt
- [ ] Measure improvement
- [ ] Update SESSION-LOG.md

### Day 26 - Sep 7 - Security Focus [2.5 hrs]
- [ ] Revisit OAuth 2.1
- [ ] Authorization scenarios
- [ ] Trust boundary questions
- [ ] Update SESSION-LOG.md

### Day 27 - Sep 8 - Architecture Review [2.5 hrs]
- [ ] Review all architecture
- [ ] Draw diagrams from memory
- [ ] Test conceptual understanding
- [ ] Update SESSION-LOG.md

### Day 28 - Sep 9 - Final Polish [2 hrs]
- [ ] Fix any bot bugs
- [ ] Update documentation
- [ ] Create exam cheat sheet
- [ ] Update SESSION-LOG.md

**Week 4 Milestone:** Score 80%+ on practice exam

---

## FINAL DAYS: Exam Readiness (Sep 10-12)
**Goal:** Confidence + Rest

### Day 29 - Sep 10 - Light Review [1.5 hrs]
- [ ] Review cheat sheet
- [ ] Quick quiz (30 min)
- [ ] Relax, trust your prep
- [ ] Update SESSION-LOG.md

### Day 30 - Sep 11 - REST DAY [0 hrs]
- [ ] NO studying!
- [ ] Light exercise
- [ ] Good sleep
- [ ] You've earned it!

### Day 31 - Sep 12 - EXAM DAY
- [ ] Review cheat sheet (15 min)
- [ ] Deep breaths
- [ ] CRUSH IT!
- [ ] Celebrate!

---

## Progress Tracker

### Weekly Milestones
| Week | Target | Status | Score |
|------|--------|--------|-------|
| Week 1 | Quiz MVP working | [ ] | ___% |
| Week 2 | Vectra + Complete bank | [ ] | ___% |
| Week 3 | Full practice exam | [ ] | ___% |
| Week 4 | 80%+ score | [ ] | ___% |
| **EXAM** | **MCPA Certified!** | [ ] | ___% |

### Hours Tracker
| Week | Planned | Actual | Status |
|------|---------|--------|--------|
| Week 1 | 17.5 hrs | ___ hrs | [ ] |
| Week 2 | 17.5 hrs | ___ hrs | [ ] |
| Week 3 | 18 hrs | ___ hrs | [ ] |
| Week 4 | 17.5 hrs | ___ hrs | [ ] |
| Final | 1.5 hrs | ___ hrs | [ ] |
| **TOTAL** | **72 hrs** | ___ hrs | [ ] |

---

## Your Daily Checklist

Before each session, ask yourself:
- [ ] Did I review yesterday's learning?
- [ ] Do I know what today's goal is?
- [ ] Do I have 2+ hours available?
- [ ] Am I ready to focus?

After each session, verify:
- [ ] Did I complete today's tasks?
- [ ] Did I update SESSION-LOG.md?
- [ ] Did I note questions for tomorrow?
- [ ] Did I celebrate my win today?

---

## Emergency Protocol

### Falling Behind?
1. Focus on HIGH-YIELD topics:
   - Architecture (Ch2)
   - Server Features (Ch4)
   - Security/OAuth (Ch7-8)
2. Skip nice-to-have bot features
3. Prioritize practice exams

### Don't Understand?
1. Ask me to explain differently
2. Draw a diagram
3. Find a real-world analogy
4. Move on and revisit tomorrow

### Burned Out?
1. Take an extra rest day
2. Do light review only
3. Remember: 30 days is plenty!
4. Trust the process

---

## Reward System

Celebrate these wins!
- [ ] First quiz working -> Favorite snack
- [ ] 70% on practice exam -> Movie night
- [ ] 80% on practice exam -> Buy something small
- [ ] MCPA Certified -> BIG celebration!

---

## Communication Protocol

### When We Work Together:
1. **Start session:** "Day X, ready!"
2. **Stuck:** "I don't understand [specific thing]"
3. **Done:** "Session complete, here's what I learned"
4. **Questions:** "Why does [concept] work this way?"

---

**Ready to begin Day 1? Say "Day 1, ready!" and let's GO!**

---

*Plan created: 2026-08-13*
*Exam target: 2026-09-12*
*Status: READY TO START*