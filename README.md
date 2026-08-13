# MCPA Training Bot

**Your personal study buddy for the Model Context Protocol Associate certification!**

---

## What Is This?

A local training bot that helps you study for the MCPA certification by:
- Quizzing you on MCP concepts
- Tracking your progress
- Adapting to your learning style
- Using RAG to pull from official documentation

**Built with MCP, for learning MCP.**

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS version)
- [Docker](https://www.docker.com/) (for ChromaDB) OR npm
- [Goose](https://github.com/anthropics/goose) (you already have it!)

### Installation

```bash
# 1. Clone or download this project
cd mcpa-bot

# 2. Install dependencies
npm install

# 3. Start ChromaDB (Option A: Docker)
docker run -p 8000:8000 chromadb/chroma

# OR Option B: Local
npm run start:chroma

# 4. Start the quiz server
npm run start:quiz

# 5. Start the web interface
npm run start:web

# 6. Open browser
http://localhost:3000
```

---

## Project Structure

```
mcpa-bot/
├── src/
│   ├── mcp-servers/        # MCP server implementations
│   │   ├── quiz-server.js  # Quiz generation & grading
│   │   └── knowledge-server.js  # RAG retrieval
│   ├── loaders/            # Document loaders
│   └── utils/              # Shared helpers
├── data/
│   ├── schemas/            # JSON schemas
│   ├── questions/          # Question bank
│   └── chroma/             # Vector DB storage
├── docs/                   # Learning materials
│   ├── ARCHITECTURE.md     # Why things are built this way
│   ├── DECISIONS.md        # Technical decisions log
│   └── LEARNING.md         # Your personal learning journal
├── public/                 # Frontend (HTML/CSS/JS)
└── tests/                  # Test files
```

---

## How to Use

### Take a Quiz
1. Open the web interface
2. Click "Start Quiz"
3. Select chapter/topic
4. Answer questions
5. Review explanations
6. Track your progress

### Track Progress
- Dashboard shows completion by chapter
- Accuracy percentages by domain
- Weak areas highlighted
- Spaced repetition reminders

### Study with RAG
- Ask questions about MCP concepts
- Get answers with source citations
- Explore related topics

---

## Learning Path

**Start here:**

1. **Read** `docs/ARCHITECTURE.md` - Understand the big picture
2. **Review** `docs/DECISIONS.md` - See why choices were made
3. **Complete** Phase 0 tasks in `TODO.md`
4. **Build** Phase 1-6 incrementally
5. **Document** your journey in `docs/LEARNING.md`

---

## What You'll Learn

By building this, you'll understand:

- **MCP Protocol** - How it works, why it exists
- **RAG Systems** - Retrieval-Augmented Generation
- **Vector Databases** - ChromaDB basics
- **MCP Servers** - Building your own
- **Node.js** - Backend development
- **System Design** - Architecture decisions
- **Testing** - QA skills applied to code

---

## FAQ

**Q: Is this free?**
A: Yes! Everything runs locally. No API costs.

**Q: Do I need coding experience?**
A: Basic Node.js helps, but you can learn as you go.

**Q: How long will this take?**
A: ~20-27 hours total, spread across many sessions.

**Q: Can I use this to study for the real exam?**
A: Absolutely! Questions are based on the MCPA curriculum.

**Q: What if I get stuck?**
A: Ask Goose! That's what it's for. Or check the docs.

---

## Contributing

This is your personal learning project! But if you want to improve it:

1. Fork the repo
2. Create a feature branch
3. Make changes
4. Add tests
5. Submit a PR

---

## Documentation

- `ARCHITECTURE.md` - System design & why things work this way
- `DECISIONS.md` - Technical choices & trade-offs
- `LEARNING.md` - Your personal learning journal
- `TODO.md` - Task breakdown with checkboxes

---

## About MCPA

The **Model Context Protocol Associate (MCPA)** certification validates your knowledge of:
- MCP architecture & components
- JSON-RPC 2.0 protocol
- Server & client features
- Security & authorization
- Real-world use cases

Learn more: [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

## Acknowledgments

- **Anthropic** - For creating MCP and Goose
- **AAIF** - For the MCPA certification
- **You** - For taking the leap to learn!

---

## Questions?

Ask Goose! Or open an issue on GitHub.

---

**Happy Learning!**

*Built with Goose*