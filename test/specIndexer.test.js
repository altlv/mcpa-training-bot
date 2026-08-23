/**
 * SpecIndexer Tests
 * 
 * Tests the spec indexer's core functionality:
 * - HTML text extraction
 * - Text chunking with overlap
 * - Index building and loading
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { SpecIndexer, SPEC_SOURCES } = require('../src/services/specIndexer');

// Test directory (isolated from real data)
const TEST_DIR = path.join(__dirname, '../tmp-test-spec');
const TEST_DATA_DIR = path.join(TEST_DIR, 'data', 'specs');

describe('SpecIndexer', () => {
  let indexer;

  beforeEach(() => {
    // Clean test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    indexer = new SpecIndexer(TEST_DIR);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('extractTextFromHtml', () => {
    it('removes HTML tags but keeps content', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      const result = indexer.extractTextFromHtml(html);
      assert.equal(result, 'Hello world');
    });

    it('removes script and style elements', () => {
      const html = 'Before <script>var x = 1;</script> middle <style>.foo{color:red}</style> after';
      const result = indexer.extractTextFromHtml(html);
      assert.ok(!result.includes('var x'));
      assert.ok(!result.includes('.foo'));
      assert.ok(result.includes('Before'));
      assert.ok(result.includes('middle'));
      assert.ok(result.includes('after'));
    });

    it('decodes HTML entities', () => {
      const html = '&amp; &lt; &gt; &quot; &#39;';
      const result = indexer.extractTextFromHtml(html);
      assert.equal(result, '& < > " \'');
    });

    it('collapses multiple whitespace', () => {
      const html = 'Hello   world\t\t\ntest';
      const result = indexer.extractTextFromHtml(html);
      assert.equal(result, 'Hello world test');
    });

    it('handles empty input', () => {
      assert.equal(indexer.extractTextFromHtml(''), '');
    });

    it('handles null input gracefully', () => {
      // The implementation should not throw on null
      try {
        const result = indexer.extractTextFromHtml(null);
        assert.equal(result, '');
      } catch (e) {
        // If it throws, that's a bug we need to fix
        assert.fail('extractTextFromHtml should handle null input without throwing');
      }
    });

    it('handles malformed HTML gracefully', () => {
      const html = '<p>unclosed <div> nested <span>text</div></p>';
      const result = indexer.extractTextFromHtml(html);
      assert.ok(result.includes('text'));
    });
  });

  describe('chunkText', () => {
    it('creates chunks from text', () => {
      const text = 'A'.repeat(3000); // 3000 chars should create 2+ chunks
      const source = { id: 'test', name: 'Test', url: 'http://test.com', type: 'spec' };
      const chunks = indexer.chunkText(text, source);
      
      assert.ok(chunks.length >= 2, 'Expected at least 2 chunks');
    });

    it('each chunk has required fields', () => {
      const text = 'A'.repeat(3000);
      const source = { id: 'test', name: 'Test', url: 'http://test.com', type: 'spec' };
      const chunks = indexer.chunkText(text, source);
      
      for (const chunk of chunks) {
        assert.ok(chunk.id, 'chunk must have id');
        assert.equal(chunk.type, 'spec');
        assert.ok(chunk.chunk, 'chunk must have content');
        assert.ok(chunk.meta, 'chunk must have meta');
        assert.equal(chunk.meta.source, 'test');
        assert.equal(chunk.meta.sourceName, 'Test');
        assert.equal(chunk.meta.url, 'http://test.com');
      }
    });

    it('chunk IDs are sequential', () => {
      const text = 'A'.repeat(5000);
      const source = { id: 'myid', name: 'Test', url: 'http://test.com', type: 'spec' };
      const chunks = indexer.chunkText(text, source);
      
      assert.equal(chunks[0].id, 'myid-chunk-0');
      assert.equal(chunks[1].id, 'myid-chunk-1');
    });

    it('tracks section headings', () => {
      const text = 'Some intro text\n## My Section\n' + 'A'.repeat(2000);
      const source = { id: 'test', name: 'Test', url: 'http://test.com', type: 'spec' };
      const chunks = indexer.chunkText(text, source);
      
      const withHeading = chunks.find(c => c.meta.section === 'My Section');
      assert.ok(withHeading, 'Should find chunk with heading');
    });

    it('skips chunks smaller than 50 chars', () => {
      const text = 'Tiny';
      const source = { id: 'test', name: 'Test', url: 'http://test.com', type: 'spec' };
      const chunks = indexer.chunkText(text, source);
      
      assert.equal(chunks.length, 0, 'Should skip tiny chunks');
    });
  });

  describe('loadIndex / getChunksForSpec', () => {
    it('returns null when no index exists', () => {
      const result = indexer.loadIndex();
      assert.equal(result, null);
    });

    it('loads index from disk', () => {
      const indexData = {
        version: 1,
        builtAt: '2026-01-01T00:00:00Z',
        sources: ['test'],
        chunks: [
          {
            id: 'test-0',
            type: 'spec',
            chunk: 'Test content',
            meta: { source: 'test', sourceName: 'Test', section: 'Intro', url: 'http://test.com' },
          },
        ],
      };
      
      fs.writeFileSync(indexer.indexPath, JSON.stringify(indexData));
      const loaded = indexer.loadIndex();
      
      assert.equal(loaded.version, 1);
      assert.equal(loaded.chunks.length, 1);
      assert.equal(loaded.chunks[0].chunk, 'Test content');
    });

    it('getChunksForSpec filters by source', () => {
      const indexData = {
        version: 1,
        builtAt: '2026-01-01T00:00:00Z',
        sources: ['jsonrpc', 'mcp'],
        chunks: [
          { id: 'j-0', type: 'spec', chunk: 'JSON-RPC content', meta: { source: 'jsonrpc' } },
          { id: 'm-0', type: 'spec', chunk: 'MCP content', meta: { source: 'mcp' } },
          { id: 'j-1', type: 'spec', chunk: 'More JSON-RPC', meta: { source: 'jsonrpc' } },
        ],
      };
      
      fs.writeFileSync(indexer.indexPath, JSON.stringify(indexData));
      
      const jsonrpcChunks = indexer.getChunksForSpec('jsonrpc');
      assert.equal(jsonrpcChunks.length, 2);
      assert.ok(jsonrpcChunks.every(c => c.meta.source === 'jsonrpc'));
      
      const mcpChunks = indexer.getChunksForSpec('mcp');
      assert.equal(mcpChunks.length, 1);
    });
  });

  describe('SPEC_SOURCES', () => {
    it('defines both required spec sources', () => {
      assert.equal(SPEC_SOURCES.length, 2);
      const ids = SPEC_SOURCES.map(s => s.id);
      assert.ok(ids.includes('jsonrpc'), 'Should include jsonrpc');
      assert.ok(ids.includes('mcp'), 'Should include mcp');
    });

    it('each source has required fields', () => {
      for (const source of SPEC_SOURCES) {
        assert.ok(source.id, 'source must have id');
        assert.ok(source.name, 'source must have name');
        assert.ok(source.url, 'source must have url');
        assert.ok(source.url.startsWith('http'), 'url must be valid');
      }
    });
  });
});
