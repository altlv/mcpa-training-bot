# Vectra Quick Start Guide
## Local Vector Database for MCPA Training Bot

---

## What is Vectra?

Vectra is a lightweight vector database that runs entirely in Node.js. No server, no Docker, no external dependencies.

**What it does:**
- Stores text as numerical vectors (embeddings)
- Finds similar content using vector similarity
- Persists data to a local folder

**Analogy:**
- Traditional search: "Find exact word 'JSON-RPC'"
- Vectra search: "Find concepts related to JSON-RPC"

---

## How It Works

```
Your text: "MCP uses JSON-RPC for communication"
     |
     v
Embedding function: Converts to numbers
     |
     v
Vector: [0.12, -0.45, 0.78, 0.23, ...] (1536 numbers)
     |
     v
Stored in: data/vectra/index/
     |
     v
When you search: "protocol communication"
     |
     v
Finds similar vectors (semantic match)
```

---

## Installation

```bash
cd C:\Users\User\mcpa-bot
npm install vectra
```

---

## Basic Usage

### 1. Create an Index

```javascript
const { Index } = require('vectra');
const path = require('path');

// Create index in local folder
const index = new Index(path.join(__dirname, '../data/vectra'));
```

### 2. Add Items

```javascript
await index.upsertItem({
  key: 'mcp-basics',
  text: 'MCP (Model Context Protocol) standardizes how AI apps connect to tools and data.',
  metadata: {
    topic: 'fundamentals',
    chapter: 1,
    difficulty: 'easy'
  }
});
```

### 3. Search

```javascript
const results = await index.queryItems('What is MCP?', 5);

results.forEach(result => {
  console.log(`Score: ${result.score}`);
  console.log(`Text: ${result.item.text}`);
  console.log(`Metadata: ${result.item.metadata}`);
});
```

---

## Why Vectra for This Project?

| Requirement | ChromaDB | Vectra |
|-------------|----------|--------|
| Docker required | Yes | No |
| Server required | Yes | No |
| Local storage | No (in container) | Yes (folder) |
| Setup complexity | Medium | Low |
| Learning curve | Medium | Low |
| Perfect for learning | Good | Better |

---

## Data Storage

Vectra stores everything in a local folder:

```
data/vectra/
  index.json        # Vector data
  metadata.json     # Item metadata
```

**Backup:** Just copy the `data/vectra/` folder.

**Reset:** Delete the folder and restart.

---

## Embedding Options

Vectra can use different embedding providers:

### Option 1: OpenAI Embeddings (Recommended)
```javascript
const { Index, OpenAIEmbeddingFunction } = require('vectra');

const embedder = new OpenAIEmbeddingFunction('your-api-key');
const index = new Index(path, embedder);
```

### Option 2: Local Embeddings (No API Key)
```javascript
const { Index, TransformersEmbeddingFunction } = require('vectra');

const embedder = new TransformersEmbeddingFunction();
const index = new Index(path, embedder);
```

### Option 3: Custom Embeddings
```javascript
const embedder = {
  async embed(text) {
    // Your custom embedding logic
    return [0.1, 0.2, ...]; // Vector of numbers
  }
};

const index = new Index(path, embedder);
```

---

## Integration with Quiz Engine

```
+-------------+     +-------------+     +-------------+
| Quiz        | --> | Vectra      | --> | Questions   |
| Server      |     | Search      |     | (vectorized)|
+-------------+     +-------------+     +-------------+
                           |
                           v
                    +-------------+
                    | Relevant    |
                    | Questions   |
                    +-------------+
```

### Example: Find Questions by Topic

```javascript
async function findQuestionsByTopic(topic, count = 5) {
  const results = await index.queryItems(topic, count);
  return results.map(r => r.item);
}

// Usage
const oauthQuestions = await findQuestionsByTopic('OAuth 2.1', 10);
```

### Example: Find Similar Questions

```javascript
async function findSimilarQuestions(questionText, count = 3) {
  const results = await index.queryItems(questionText, count);
  return results.filter(r => r.score > 0.7); // Only good matches
}
```

---

## Limitations

1. **Local only:** Data stays on your machine
2. **Single user:** No concurrent access protection
3. **Small scale:** Perfect for learning, not production
4. **Embedding quality:** Depends on which embedding function you use

---

## Upgrade Path

When you're ready for more power:

1. **ChromaDB (Docker):** More features, better performance
2. **Pinecone:** Cloud-based, scalable
3. **Weaviate:** Advanced features, GraphQL API

The quiz engine won't need to change - only the search backend.

---

## Troubleshooting

**Problem:** "Cannot find module 'vectra'"
**Solution:** Run `npm install vectra`

**Problem:** Search returns irrelevant results
**Solution:** Try different embedding function or improve your text

**Problem:** Data not persisting
**Solution:** Check that `data/vectra/` folder exists and is writable

---

*Last updated: 2026-08-13*
*Part of: MCPA Training Bot project*