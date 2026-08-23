/**
 * BM25 Search Index
 * 
 * Builds a keyword search index over questions + learning materials.
 * No external dependencies — pure JS BM25 implementation.
 * 
 * Indexed content: question text, options, explanations, cheat sheet sections, learning notes.
 * Persisted to JSON for fast reload.
 */

const fs = require('fs');
const path = require('path');

// ─── Tokenizer ───────────────────────────────────────────────────────
const { SpecIndexer } = require('./specIndexer');

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'don', 'now', 'and', 'but', 'or', 'if', 'while', 'that', 'this',
  'these', 'those', 'it', 'its', 'what', 'which', 'who', 'whom',
  'he', 'she', 'they', 'them', 'his', 'her', 'their', 'we', 'you',
  'me', 'my', 'your', 'our', 'about', 'up', 'also', 'than', 'get',
  'one', 'two', 'first', 'new', 'like', 'make', 'even', 'much',
  'well', 'back', 'know', 'take', 'come', 'many', 'must', 'via',
  'eg', 'e.g', 'ie', 'i.e', 'etc', 'spec', 'per', 'set',
]);

/**
 * Tokenize text into lowercase stemmed terms
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\-\/\._]+/g, ' ')  // keep hyphens, slashes, dots for MCP terms
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t))
    .map(stem);
}

/**
 * Simple suffix stemmer (not Porter, but good enough for BM25)
 */
function stem(word) {
  // Keep MCP-specific terms intact
  if (/^[a-z]+\/[a-z]+$/i.test(word)) return word;  // e.g. tools/call
  if (/^-[0-9]+$/i.test(word)) return word;           // e.g. -32602
  if (/^[a-z]+\.[a-z]+$/i.test(word)) return word;   // e.g. io.modelcontextprotocol
  if (/^\d+\.\d+$/.test(word)) return word;           // e.g. 2.1

  // Basic suffix stripping
  return word
    .replace(/ies$/, 'y')
    .replace(/esses$/, 'ess')
    .replace(/sses$/, 'ss')
    .replace(/ness$/, '')
    .replace(/ment$/, '')
    .replace(/tion$/, 't')
    .replace(/sion$/, 's')
    .replace(/able$/, '')
    .replace(/ible$/, '')
    .replace(/ful$/, '')
    .replace(/ous$/, '')
    .replace(/ive$/, '')
    .replace(/ing$/, '')
    .replace(/edly$/, '')
    .replace(/edly$/, '')
    .replace(/ed$/, '')
    .replace(/ly$/, '')
    .replace(/er$/, '')
    .replace(/s$/, '');
}

// ─── BM25 Engine ─────────────────────────────────────────────────────

class BM25 {
  constructor(k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.docs = [];          // [{id, type, chunk, tokens, meta}]
    this.termFreq = [];      // per-doc term frequency maps
    this.docFreq = {};       // term -> number of docs containing it
    this.avgDocLen = 0;
    this.totalDocs = 0;
  }

  /**
   * Add a document to the index
   * @param {Object} doc - {id, type, chunk, meta}
   */
  addDoc(doc) {
    const tokens = tokenize(doc.chunk);
    const tf = {};
    for (const t of tokens) {
      tf[t] = (tf[t] || 0) + 1;
    }

    const idx = this.docs.length;
    this.docs.push({ ...doc, tokens });
    this.termFreq.push(tf);

    // Update document frequency
    for (const term of Object.keys(tf)) {
      this.docFreq[term] = (this.docFreq[term] || 0) + 1;
    }
  }

  /**
   * Finalize the index (compute avg doc length)
   */
  finalize() {
    this.totalDocs = this.docs.length;
    const totalLen = this.docs.reduce((sum, d) => sum + d.tokens.length, 0);
    this.avgDocLen = this.totalDocs > 0 ? totalLen / this.totalDocs : 0;
  }

  /**
   * Search the index
   * @param {string} query
   * @param {number} topK - max results
   * @param {Object} filter - optional {type: string}
   * @returns {Array<{doc, score}>}
   */
  search(query, topK = 10, filter = {}) {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const results = [];

    for (let i = 0; i < this.docs.length; i++) {
      const doc = this.docs[i];

      // Optional type filter
      if (filter.type && doc.type !== filter.type) continue;

      let score = 0;
      const tf = this.termFreq[i];
      const docLen = doc.tokens.length;

      for (const term of queryTokens) {
        const termFreq = tf[term] || 0;
        if (termFreq === 0) continue;

        const df = this.docFreq[term] || 0;
        const idf = Math.log((this.totalDocs - df + 0.5) / (df + 0.5) + 1);

        const tfNorm = (termFreq * (this.k1 + 1)) /
          (termFreq + this.k1 * (1 - this.b + this.b * docLen / this.avgDocLen));

        score += idf * tfNorm;
      }

      if (score > 0) {
        results.push({ doc, score });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      k1: this.k1,
      b: this.b,
      docs: this.docs.map(d => ({
        id: d.id,
        type: d.type,
        chunk: d.chunk,
        meta: d.meta,
      })),
    };
  }

  /**
   * Load from serialized JSON (re-indexes internally)
   */
  static fromJSON(data) {
    const engine = new BM25(data.k1, data.b);
    for (const doc of data.docs) {
      engine.addDoc(doc);
    }
    engine.finalize();
    return engine;
  }
}

// ─── Index Builder ───────────────────────────────────────────────────

class SearchIndex {
  constructor(projectRoot) {
    this.root = projectRoot || path.join(__dirname, '../..');
    this.engine = new BM25();
    this.indexPath = path.join(this.root, 'data', 'search-index.json');
  }

  /**
   * Build the full index from all sources
   */
  build() {
    this.engine = new BM25();
    this.indexQuestions();
    this.indexCheatSheet();
    this.indexLearningNotes();
    this.indexSpecs();  // Add specification content
    this.engine.finalize();
    return this;
  }

  /**
   * Save index to disk
   */
  save() {
    const dir = path.dirname(this.indexPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.indexPath, JSON.stringify(this.engine.toJSON()), 'utf8');
    return this;
  }

  /**
   * Load index from disk
   */
  load() {
    if (!fs.existsSync(this.indexPath)) {
      this.build();
      this.save();
      return this;
    }
    const data = JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
    this.engine = BM25.fromJSON(data);
    return this;
  }

  /**
   * Search the index
   */
  search(query, topK = 10, filter = {}) {
    return this.engine.search(query, topK, filter);
  }

  /**
   * Index all question JSON files
   */
  indexQuestions() {
    const qDir = path.join(this.root, 'data', 'questions');
    if (!fs.existsSync(qDir)) return;

    const files = fs.readdirSync(qDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(qDir, file), 'utf8'));
        const questions = raw.questions || raw;
        if (!Array.isArray(questions)) continue;

        const chapter = file.replace(/-multi\.json$/, '').replace(/\.json$/, '');

        for (const q of questions) {
          // Index the question text
          const optionText = (q.options || []).map(o => o.text || '').join(' ');
          const fullText = [
            q.question || '',
            optionText,
            q.explanation || '',
            (q.tags || []).join(' '),
          ].join(' ');

          this.engine.addDoc({
            id: q.id || `q-${chapter}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'question',
            chunk: fullText,
            meta: {
              question: q.question,
              options: q.options,
              answer: q.answer || q.answers,
              explanation: q.explanation,
              tags: q.tags || [],
              chapter,
              multi: file.includes('-multi'),
            },
          });
        }
      } catch (e) {
        // Skip malformed files
      }
    }
  }

  /**
   * Index the exam cheat sheet by section
   */
  indexCheatSheet() {
    const csPath = path.join(this.root, 'docs', 'learning-notes', 'EXAM-CHEAT-SHEET.md');
    if (!fs.existsSync(csPath)) return;

    const content = fs.readFileSync(csPath, 'utf8');
    this.indexMarkdown(content, 'cheat-sheet', 'EXAM-CHEAT-SHEET.md');
  }

  /**
   * Index learning notes
   */
  indexLearningNotes() {
    const notesDir = path.join(this.root, 'docs', 'learning-notes');
    if (!fs.existsSync(notesDir)) return;

    const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.md') && f !== 'EXAM-CHEAT-SHEET.md');

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(notesDir, file), 'utf8');
        this.indexMarkdown(content, 'learning-note', file);
      } catch (e) {
        // Skip
      }
    }
  }

  /**
   * Index a markdown file by splitting into sections
   */
  indexMarkdown(content, type, source) {
    const lines = content.split('\n');
    let currentH2 = '';
    let currentH3 = '';
    let currentContent = [];
    let sectionIdx = 0;

    const flush = () => {
      if (currentContent.length === 0) return;
      const text = currentContent.join('\n').trim();
      if (text.length < 10) return;

      const heading = [currentH2, currentH3].filter(Boolean).join(' > ');

      this.engine.addDoc({
        id: `${type}-${source}-${sectionIdx++}`,
        type,
        chunk: heading ? `## ${heading}\n${text}` : text,
        meta: {
          source,
          section: heading || '(top-level)',
        },
      });
    };

    for (const line of lines) {
      if (line.startsWith('## ')) {
        flush();
        currentH2 = line.replace(/^##\s*/, '');
        currentH3 = '';
        currentContent = [];
      } else if (line.startsWith('### ')) {
        flush();
        currentH3 = line.replace(/^###\s*/, '');
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    flush();
  }

  /**
   * Index specification content (JSON-RPC, MCP)
   */
  indexSpecs() {
    const indexer = new SpecIndexer(this.root);
    const specIndex = indexer.loadIndex();
    
    if (!specIndex || !specIndex.chunks) {
      console.log('ℹ️  No spec index found. Run: node scripts/build-spec-index.js');
      return;
    }
    
    for (const chunk of specIndex.chunks) {
      this.engine.addDoc({
        id: chunk.id,
        type: 'spec',
        chunk: chunk.chunk,
        meta: {
          ...chunk.meta,
          sourceType: 'specification',
        },
      });
    }
    
    console.log(`📖 Indexed ${specIndex.chunks.length} specification chunks`);
  }

  /**
   * Get index stats
   */
  stats() {
    const docs = this.engine.docs;
    const types = {};
    for (const d of docs) {
      types[d.type] = (types[d.type] || 0) + 1;
    }
    return { total: docs.length, types };
  }
}

module.exports = { SearchIndex, BM25, tokenize, stem };
