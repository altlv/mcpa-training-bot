# 🚀 Getting Started Guide
## For Absolute Beginners (That's You!)

---

## 🎯 Your First Task: Understand MCP

Before writing any code, let's understand what we're building with.

### Step 1: Read the MCP Introduction
Open your browser and visit:
```
https://modelcontextprotocol.io/docs/getting-started/intro
```

Read it slowly. It's okay if you don't understand everything. Just get the gist.

### Step 2: Answer These Questions
Write your answers in `docs/LEARNING.md`:

1. **What is MCP?** (2 sentences max)
2. **Why does MCP exist?** (What problem does it solve?)
3. **Who uses MCP?** (Give 2 examples)

### Step 3: Draw a Picture
On paper (yes, actual paper!), draw:
- A box labeled "Your App"
- A box labeled "Tool A"
- A box labeled "Tool B"
- Lines showing how they connect with and without MCP

Take a photo and save it in `docs/images/` (create the folder).

---

## 🛠️ Your Second Task: Set Up Your Workspace

### Step 1: Create Project Folder
Open a terminal (Command Prompt or PowerShell) and run:
```bash
mkdir mcpa-bot
cd mcpa-bot
```

### Step 2: Initialize npm
```bash
npm init -y
```
This creates a `package.json` file (like a project ID card).

### Step 3: Install First Dependency
```bash
npm install express
```
Express is a simple web server. We'll use it for the quiz interface.

### Step 4: Verify Installation
```bash
dir node_modules\express
```
If you see files, it worked!

---

## 🧪 Your Third Task: Test Your QA Skills

You're a QA tester. Let's test the setup!

### Test Case 1: Folder Exists
```bash
dir
```
**Expected:** See `mcpa-bot` folder
**Actual:** ___________
**Pass/Fail:** ___________

### Test Case 2: npm Installed
```bash
npm --version
```
**Expected:** Version number (e.g., "9.6.7")
**Actual:** ___________
**Pass/Fail:** ___________

### Test Case 3: Express Installed
```bash
dir node_modules
```
**Expected:** See `express` folder
**Actual:** ___________
**Pass/Fail:** ___________

Record your test results in `docs/LEARNING.md` under "Phase 0, Task 0.2".

---

## 📝 Your Fourth Task: Document Your Journey

Create a file called `docs/LEARNING.md` (if it doesn't exist) and add:

```markdown
# My MCPA Learning Journey

## Day 1: Starting Out

**Date:** ___________

**What I did:**
- Read about MCP
- Set up project folder
- Tested my setup

**What I learned:**
- 
- 

**What confused me:**
- 
- 

**How I feel:**
- Excited / Nervous / Confused / Motivated (circle one)
```

---

## 🎉 Congratulations!

You've completed your first tasks! You've:
- ✅ Learned what MCP is
- ✅ Set up your workspace
- ✅ Applied your QA skills
- ✅ Started documenting

**Next:** Move to Task 0.3 in `TODO.md` (Architecture Understanding).

---

## 💡 Pro Tips for Beginners

### 1. It's Okay Not to Understand Everything
Programming is like learning a language. You don't need to know every word to have a conversation.

### 2. Copy-Paste is Fine (at First)
Don't understand a command? Copy it, run it, see what happens. Then try to understand.

### 3. Errors are Learning Opportunities
When something breaks, you're about to learn something! Read the error message slowly.

### 4. Ask Goose Questions
That's what it's here for! Questions like:
- "What does this error mean?"
- "Explain this code like I'm 5"
- "What's the difference between X and Y?"

### 5. Take Breaks
Your brain learns while resting. If you're frustrated, walk away for 10 minutes.

---

## 🆘 Stuck? Try This

**Problem:** "I don't understand what MCP is"
**Solution:** Read the intro page again, then ask Goose to explain it differently.

**Problem:** "npm command not found"
**Solution:** You need to install Node.js first. Visit https://nodejs.org

**Problem:** "I'm overwhelmed"
**Solution:** Focus on just ONE task. Not the whole project. Just one checkbox.

**Problem:** "This feels too hard"
**Solution:** Good! That means you're learning. If it were easy, you wouldn't grow.

---

## 📊 Track Your Time

Start a timer when you begin. Write down how long each task takes.

| Task | Start Time | End Time | Duration |
|------|------------|----------|----------|
| 0.1: Read MCP intro | | | |
| 0.2: Setup environment | | | |
| 0.3: Architecture | | | |

This helps you:
- See your progress
- Estimate future tasks
- Celebrate time invested

---

## 🎓 Your QA Advantage

As a tester, you already have superpowers:

| QA Skill | How It Helps Coding |
|----------|---------------------|
| **Finding bugs** | You'll find your own bugs early |
| **Edge cases** | You'll think of weird scenarios |
| **Documentation** | You'll document your code well |
| **Systematic thinking** | You'll architect cleanly |
| **Breaking things** | You'll test your bot thoroughly |

**You're not starting from zero. You're starting from QA.** That's huge!

---

## 🌟 Mindset Shift

**Old mindset:** "I'm insecure about coding"
**New mindset:** "I'm learning to code, and that's brave"

**Old mindset:** "I don't know enough"
**New mindset:** "I know enough to start, and I'll learn the rest"

**Old mindset:** "This is too hard"
**New mindset:** "This is challenging, and challenges make me stronger"

---

## 🚀 Ready for More?

Complete the tasks in this guide, then move to:
- `TODO.md` - Task breakdown
- `ARCHITECTURE.md` - System design
- `DECISIONS.md` - Why choices were made

**You've got this! 💪**

---

*Created: 2026-08-13*
*For: The bravest beginner (that's you!)*