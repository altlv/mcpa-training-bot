/**
 * Spec Indexer
 * 
 * Fetches and indexes specification content from:
 * - https://www.jsonrpc.org/specification (JSON-RPC 2.0)
 * - https://modelcontextprotocol.io/specification/2026-07-28 (MCP)
 * 
 * Content is chunked and stored for BM25 + semantic search.
 */

const fs = require('fs');
const path = require('path');

// Spec sources
const SPEC_SOURCES = [
  {
    id: 'jsonrpc',
    name: 'JSON-RPC 2.0 Specification',
    url: 'https://www.jsonrpc.org/specification',
    type: 'spec',
  },
  {
    id: 'mcp',
    name: 'Model Context Protocol Specification',
    url: 'https://modelcontextprotocol.io/specification/2026-07-28',
    type: 'spec',
  },
];

// Chunk size in characters (aim for ~500 tokens ≈ 1500 chars)
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

class SpecIndexer {
  constructor(projectRoot) {
    this.root = projectRoot || path.join(__dirname, '../..');
    this.dataDir = path.join(this.root, 'data', 'specs');
    this.indexPath = path.join(this.root, 'data', 'spec-index.json');
  }

  /**
   * Ensure data directory exists
   */
  ensureDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Fetch spec content from URL
   */
  async fetchSpec(source) {
    console.log(`📥 Fetching ${source.name}...`);
    
    try {
      // Use dynamic import for node-fetch (ESM module)
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'MCPA-Bot/1.0 (Spec Indexer)',
          'Accept': 'text/html,application/xhtml+xml,text/plain',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let text = await response.text();

      // If HTML, extract text content (basic extraction)
      if (contentType.includes('text/html')) {
        text = this.extractTextFromHtml(text);
      }

      // Save raw content
      const filePath = path.join(this.dataDir, `${source.id}-raw.txt`);
      fs.writeFileSync(filePath, text, 'utf8');
      
      console.log(`✅ Fetched ${source.name}: ${text.length} characters`);
      return { ...source, content: text, filePath };
    } catch (error) {
      console.error(`❌ Failed to fetch ${source.name}:`, error.message);
      
      // Check if we have a cached version
      const cachedPath = path.join(this.dataDir, `${source.id}-raw.txt`);
      if (fs.existsSync(cachedPath)) {
        console.log(`📂 Using cached version from ${cachedPath}`);
        const content = fs.readFileSync(cachedPath, 'utf8');
        return { ...source, content, filePath: cachedPath, cached: true };
      }
      
      return { ...source, content: null, error: error.message };
    }
  }

  /**
   * Basic HTML to text extraction
   */
  extractTextFromHtml(html) {
    if (!html) return '';
    return html
      // Remove script and style elements
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML tags but keep content
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Chunk text into overlapping segments
   */
  chunkText(text, source) {
    const chunks = [];
    const lines = text.split('\n');
    
    let currentChunk = [];
    let currentSize = 0;
    let chunkIndex = 0;
    let lastHeading = '';

    for (const line of lines) {
      // Track headings for context
      if (line.match(/^#+\s/) || line.match(/^[A-Z][A-Z\s]+:$/)) {
        lastHeading = line.replace(/^#+\s*/, '').trim();
      }

      currentChunk.push(line);
      currentSize += line.length + 1; // +1 for newline

      // Flush chunk when it reaches target size
      if (currentSize >= CHUNK_SIZE) {
        const chunkText = currentChunk.join('\n').trim();
        if (chunkText.length > 50) { // Skip tiny chunks
          chunks.push({
            id: `${source.id}-chunk-${chunkIndex}`,
            type: source.type,
            chunk: chunkText,
            meta: {
              source: source.id,
              sourceName: source.name,
              section: lastHeading || `Chunk ${chunkIndex + 1}`,
              chunkIndex,
              url: source.url,
            },
          });
          chunkIndex++;
        }

        // Keep overlap lines for context continuity
        const overlapLines = Math.floor(CHUNK_OVERLAP / 50); // ~50 chars per line
        currentChunk = currentChunk.slice(-overlapLines);
        currentSize = currentChunk.join('\n').length;
      }
    }

    // Final chunk
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join('\n').trim();
      if (chunkText.length > 50) {
        chunks.push({
          id: `${source.id}-chunk-${chunkIndex}`,
          type: source.type,
          chunk: chunkText,
          meta: {
            source: source.id,
            sourceName: source.name,
            section: lastHeading || `Chunk ${chunkIndex + 1}`,
            chunkIndex,
            url: source.url,
          },
        });
      }
    }

    return chunks;
  }

  /**
   * Build spec index from all sources
   */
  async buildIndex() {
    this.ensureDir();
    
    console.log('📚 Building specification index...');
    
    const allChunks = [];
    
    for (const source of SPEC_SOURCES) {
      const spec = await this.fetchSpec(source);
      if (spec.content) {
        const chunks = this.chunkText(spec.content, spec);
        allChunks.push(...chunks);
        console.log(`  ✓ ${source.name}: ${chunks.length} chunks`);
      }
    }

    // Save index
    const indexData = {
      version: 1,
      builtAt: new Date().toISOString(),
      sources: SPEC_SOURCES.map(s => s.id),
      chunks: allChunks,
    };

    fs.writeFileSync(this.indexPath, JSON.stringify(indexData, null, 2), 'utf8');
    console.log(`✅ Spec index saved: ${allChunks.length} chunks to ${this.indexPath}`);
    
    return indexData;
  }

  /**
   * Load spec index from disk
   */
  loadIndex() {
    if (!fs.existsSync(this.indexPath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
  }

  /**
   * Get chunks for a specific spec
   */
  getChunksForSpec(specId) {
    const index = this.loadIndex();
    if (!index) return [];
    return index.chunks.filter(c => c.meta.source === specId);
  }

  /**
   * Get all spec chunks
   */
  getAllChunks() {
    const index = this.loadIndex();
    if (!index) return [];
    return index.chunks;
  }
}

module.exports = { SpecIndexer, SPEC_SOURCES };
