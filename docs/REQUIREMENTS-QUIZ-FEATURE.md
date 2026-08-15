# Quiz Feature Requirements
**Version:** 1.0
**Date:** Aug 13, 2026
**Status:** APPROVED ✅

---

## Design Decisions (User-Selected)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Feedback Timing** | Delayed (at end) | Realistic exam simulation |
| **Answer Randomization** | Always randomize | Prevents memorization |
| **Wrong Answer Explanations** | On demand (click/hover) | Cleaner UI, user controls detail |
| **Multi-select Input** | Radio for single, checkboxes for multi | Match question type |
| **Submit Button** | Only on last page | Keep UI clean |
| **Skip/Reorder** | Extra feature: skip question, move to end | Ensure no unanswered questions |
| **State Persistence** | localStorage | Survives page refresh |
| **Empty Tags** | Disable "Start Quiz" button | Prevent invalid start |
| **Question Count** | Dropdown: 20, 50, or All (default) | Flexible quiz length |
| **Color Scheme** | Light blue, teal, black, white | Clean, professional |
| **Fonts** | Baskerville or Futura | Readable, classic |
| **Mobile** | Responsive, scroll OK, min 12px font | Usable on all devices |
| **Keyboard** | Tab order, space to select, enter on buttons | Accessibility |
| **Loading** | Simple spinner | Not too fancy |
| **API** | Separate server (port 3000) | Best practice |
| **Animation** | Slide or none | Simple transitions |

---

## User Stories

### Story 1: Tag Selection
**As a** student,
**I want to** select specific topics to quiz on,
**So that** I can focus on weak areas.

**Acceptance Criteria:**
- [ ] Display all available tags as checkboxes
- [ ] "Select All" / "Deselect All" buttons
- [ ] "Start Quiz" button (disabled if no tags selected)
- [ ] Show question count for each tag
- [ ] Question count dropdown: "Up to 20", "Up to 50", "All" (default)
- [ ] "All" selected by default if checkboxes are checked

---

### Story 2: Quiz Session
**As a** student,
**I want to** answer questions in pages of 3,
**So that** I can focus without overwhelm.

**Acceptance Criteria:**
- [ ] Display 3 questions per page
- [ ] Show progress indicator ("Question 4 of 20")
- [ ] Previous/Next page buttons
- [ ] Answers persist when navigating pages
- [ ] Submit button ONLY on last page
- [ ] Skip button (optional: moves question to end of queue)
- [ ] Single-select: Radio buttons
- [ ] Multi-select: Checkboxes
- [ ] State saved to localStorage (survives refresh)

---

### Story 3: Summary Page
**As a** student,
**I want to** see my score and explanations at the end,
**So that** I can learn from mistakes.

**Acceptance Criteria:**
- [ ] Display overall score (e.g., "15/20 = 75%")
- [ ] List all questions with:
  - Your answer (highlighted green/red)
  - Correct answer (highlighted green)
  - Explanation text
  - "Why other options are wrong" (expandable)
- [ ] Filter buttons: All / Correct / Incorrect
- [ ] "Retry Missed Questions" button

---

## Technical Requirements

### Frontend Structure
```
public/
├── index.html              ← Main page
├── quiz.html               ← Quiz session page
├── summary.html            ← Results page
├── css/
│   └── style.css           ← Styling
└── js/
    ├── app.js              ← Main logic
    ├── quiz.js             ← Quiz engine
    └── api.js              ← API calls
```

### Backend Structure
```
src/
├── server.js               ← Express server
├── routes/
│   └── quiz.js             ← Quiz API endpoints
└── services/
    └── questionService.js  ← Load questions from JSON
```

### API Endpoints

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| GET | `/api/tags` | Get available tags | - | `{ tags: [...] }` |
| POST | `/api/quiz/start` | Start quiz session | `{ tags: [...], count: 20 }` | `{ sessionId, questions: [...] }` |
| POST | `/api/quiz/submit` | Submit answers | `{ sessionId, answers: {...} }` | `{ score, results: [...] }` |
| GET | `/api/questions/:id` | Get single question | - | `{ question: {...} }` |

---

## Data Structures

### Question Object (from JSON)
```json
{
  "id": "ch1-q1",
  "chapter": 1,
  "type": "mcq",
  "difficulty": "medium",
  "question": "What does MCP stand for?",
  "options": [
    { "letter": "A", "text": "Model Context Protocol" },
    { "letter": "B", "text": "Machine Communication Protocol" },
    { "letter": "C", "text": "Model Control Process" },
    { "letter": "D", "text": "Multi-Channel Platform" }
  ],
  "answer": "A",
  "answers": ["A"],  // For multi-select support
  "explanation": "MCP stands for Model Context Protocol...",
  "tags": ["mcp-basics", "definitions"]
}
```

### Quiz Session Object (Frontend State)
```json
{
  "sessionId": "abc123",
  "questions": [
    {
      "id": "ch1-q1",
      "shuffledOptions": [
        { "letter": "C", "text": "Model Control Process" },
        { "letter": "A", "text": "Model Context Protocol" },
        { "letter": "D", "text": "Multi-Channel Platform" },
        { "letter": "B", "text": "Machine Communication Protocol" }
      ],
      "userAnswer": null
    }
  ],
  "currentPage": 0,
  "questionsPerPage": 3,
  "totalQuestions": 20
}
```

### API Response (Quiz Results)
```json
{
  "score": 15,
  "total": 20,
  "percentage": 75,
  "results": [
    {
      "questionId": "ch1-q1",
      "question": "What does MCP stand for?",
      "yourAnswer": "B",
      "correctAnswer": "A",
      "isCorrect": false,
      "explanation": "MCP stands for Model Context Protocol...",
      "options": [
        { "letter": "A", "text": "Model Context Protocol", "isCorrect": true },
        { "letter": "B", "text": "Machine Communication Protocol", "isCorrect": false },
        { "letter": "C", "text": "Model Control Process", "isCorrect": false },
        { "letter": "D", "text": "Multi-Channel Platform", "isCorrect": false }
      ]
    }
  ]
}
```

---

## UI/UX Specifications

### Color Scheme
| Element | Color | Hex |
|---------|-------|-----|
| Primary | Light Blue | #E3F2FD |
| Accent | Teal | #009688 |
| Text | Black | #212121 |
| Background | White | #FFFFFF |
| Success | Green | #4CAF50 |
| Error | Red | #F44336 |

### Typography
| Element | Font | Size |
|---------|------|------|
| Headings | Baskerville | 24px |
| Body | Futura | 16px |
| Minimum | - | 12px |

### Responsive Design
- Max-width: 800px (centered)
- Min font size: 12px
- Scroll: Vertical overflow OK
- Breakpoints: Mobile-first

### Keyboard Navigation
- **Tab**: Move between options
- **Space**: Select radio/checkbox
- **Enter**: Activate button
- **Arrow keys**: Navigate options (optional)

### Loading State
- Simple spinner (CSS animation)
- No fancy effects

### Animations
- Slide transitions between pages
- Or no animation (simpler)

---

## UI/UX Requirements

### Tag Selection Screen
```
┌─────────────────────────────────────────┐
│  MCPA Training Bot - Quiz Setup         │
├─────────────────────────────────────────┤
│  Select Topics:                         │
│                                         │
│  ☑ MCP Fundamentals (21 questions)      │
│  ☑ Architecture (19 questions)          │
│  ☐ Server Features (15 questions)       │
│  ☐ Client Features (15 questions)       │
│  ☑ Security (35 questions)              │
│  ...                                    │
│                                         │
│  [Select All] [Deselect All]            │
│                                         │
│  Questions to include: 75               │
│                                         │
│  [Start Quiz]                           │
└─────────────────────────────────────────┘
```

### Quiz Session Screen
```
┌─────────────────────────────────────────┐
│  Question 4 of 20          ████░░░░ 20% │
├─────────────────────────────────────────┤
│  What is the cardinality rule in MCP?   │
│                                         │
│  ○ A) One host, one client, one server  │
│  ● B) One host, many clients, one      │
│        server each                      │
│  ○ C) Many hosts, one client, many     │
│        servers                          │
│  ○ D) One host, one client, many       │
│        servers                          │
│                                         │
│  [Previous] [Next] [Submit Quiz]        │
└─────────────────────────────────────────┘
```

### Summary Screen
```
┌─────────────────────────────────────────┐
│  Quiz Complete!                         │
├─────────────────────────────────────────┤
│  Score: 15/20 (75%)                    │
│                                         │
│  [All] [Correct ✓] [Incorrect ✗]       │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ✗ Q1: What does MCP stand for?  │   │
│  │   Your answer: B (wrong)        │   │
│  │   Correct answer: A             │   │
│  │   [Show explanation ▼]          │   │
│  │   [Show why others are wrong ▼] │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ✓ Q2: What is a Host in MCP?    │   │
│  │   Your answer: A (correct!)     │   │
│  │   [Show explanation ▼]          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Retry Missed] [Start New Quiz]       │
└─────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Backend API (Day 4)
- [ ] Create Express routes (quiz.js)
- [ ] Implement tag scanning service
- [ ] Implement quiz generation logic
- [ ] Implement answer scoring logic
- [ ] Add input validation
- [ ] Test with curl/Postman

### Phase 2: Frontend UI (Day 5)
- [ ] Create HTML structure
- [ ] Add CSS styling (color scheme, fonts)
- [ ] Implement tag selection screen
  - [ ] Tag checkboxes
  - [ ] Question count dropdown (20/50/All)
  - [ ] Select All / Deselect All buttons
- [ ] Implement quiz session screen
  - [ ] 3 questions per page
  - [ ] Radio buttons (single-select)
  - [ ] Checkboxes (multi-select)
  - [ ] Previous/Next navigation
  - [ ] Skip button (optional)
  - [ ] Submit on last page only
- [ ] Implement summary screen
  - [ ] Score display
  - [ ] Filter (All/Correct/Incorrect)
  - [ ] Expandable explanations
- [ ] Add localStorage persistence
- [ ] Add keyboard navigation
- [ ] Add loading spinner
- [ ] Add slide animations (or none)
- [ ] Test end-to-end flow

### Phase 3: Polish (Day 6)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add responsive design
- [ ] Add keyboard navigation
- [ ] Test edge cases

---

## Technical Notes

### Randomization Logic
```javascript
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

### State Management (Frontend)
```javascript
// Store quiz state in JavaScript
const quizState = {
  sessionId: null,
  questions: [],
  currentPage: 0,
  answers: {},
  questionsPerPage: 3
};
```

### API Error Handling
```javascript
// Backend error responses
{
  "error": "Invalid tag name",
  "code": "INVALID_TAG",
  "details": { "tag": "invalid-tag-name" }
}
```

---

## Success Criteria

- [ ] User can select tags and start quiz
- [ ] Question count dropdown works (20/50/All)
- [ ] Questions are randomized
- [ ] Answer options are randomized
- [ ] 3 questions display per page
- [ ] User can navigate between pages (Previous/Next)
- [ ] Skip button moves question to end
- [ ] Answers persist during navigation
- [ ] State persists on page refresh (localStorage)
- [ ] Submit button appears only on last page
- [ ] Summary shows score and explanations
- [ ] User can filter results (All/Correct/Incorrect)
- [ ] User can retry missed questions
- [ ] All questions load correctly
- [ ] No JavaScript errors in console
- [ ] Works on mobile devices
- [ ] Keyboard navigation works (Tab, Space, Enter)
- [ ] Loading spinner shows during API calls
- [ ] Color scheme matches spec (light blue, teal, black, white)
- [ ] Fonts are readable (Baskerville/Futura, min 12px)

---

*Created: Aug 13, 2026*
*Status: Ready for implementation*
