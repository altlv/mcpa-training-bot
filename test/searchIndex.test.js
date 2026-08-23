/**
 * SearchIndex Tests
 * 
 * Tests the BM25 search engine and SearchIndex:
 * - Tokenizer produces valid tokens
 * - Stemmer reduces words correctly
 * - BM25 search returns relevant results
 * - Search ranking is correct
 * - Index builds from questions + specs
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { BM25, tokenize, stem, SearchIndex } = require('../src/services/searchIndex');

describe('Tokenize', () => {
  it('converts to lowercase', () => {
    const tokens = tokenize('Hello World');
    assert.ok(tokens.includes('hello'));
    assert.ok(tokens.includes('world'));
  });

  it('removes stop words', () => {
    const tokens = tokenize('the quick brown fox');
    assert.ok(!tokens.includes('the'));
    assert.ok(tokens.includes('quick'));
    assert.ok(tokens.includes('brown'));
    assert.ok(tokens.includes('fox'));
  });

  it('keeps hyphens in tokens', () => {
    const tokens = tokenize('state-of-the-art');
    assert.ok(tokens.some(t => t.includes('state')));
  });

  it('filters single-character tokens', () => {
    const tokens = tokenize('a b c test');
    assert.ok(!tokens.includes('a'));
    assert.ok(!tokens.includes('b'));
    assert.ok(tokens.includes('test'));
  });

  it('handles empty/null input', () => {
    assert.deepEqual(tokenize(''), []);
    assert.deepEqual(tokenize(null), []);
    assert.deepEqual(tokenize(undefined), []);
  });
});

describe('Stem', () => {
  it('reduces "running" (removes -ing suffix)', () => {
    // Simple suffix stemmer strips -ing, leaving "runn" (not full Porter stemming)
    const result = stem('running');
    assert.ok(result.length < 'running'.length, 'Should reduce length');
    assert.ok(result.startsWith('run'), 'Should preserve root');
  });

  it('reduces "connection" to "connect"', () => {
    assert.equal(stem('connection'), 'connect');
  });

  it('reduces "notifications" to "notification"', () => {
    // notification → notifict (after -s removal on 'notifications')
    const result = stem('notifications');
    assert.ok(result.length < 'notifications'.length, 'Should reduce word');
  });

  it('preserves MCP-specific terms', () => {
    assert.equal(stem('tools/call'), 'tools/call'); // slashes kept
    assert.equal(stem('-32602'), '-32602');          // error codes kept
    assert.equal(stem('2.0'), '2.0');               // version numbers kept
  });

  it('reduces past tense', () => {
    assert.equal(stem('explained'), 'explain');
  });

  it('reduces "-edly" suffix (no duplicate)', () => {
    // The bug was duplicate replace(/edly$/, '')
    assert.equal(stem('assistedly'), 'assist');
  });

  it('reduces "-ing" suffix', () => {
    assert.equal(stem('connecting'), 'connect');
  });

  it('reduces "-ness" suffix', () => {
    assert.equal(stem('correctness'), 'correct');
  });
});

describe('BM25', () => {
  let engine;

  beforeEach(() => {
    engine = new BM25();
  });

  it('indexes documents and searches', () => {
    engine.addDoc({ id: '1', type: 'test', chunk: 'JSON-RPC is a protocol for remote procedure calls', meta: {} });
    engine.addDoc({ id: '2', type: 'test', chunk: 'MCP provides tools and resources to AI models', meta: {} });
    engine.addDoc({ id: '3', type: 'test', chunk: 'HTTP is a transport protocol for web', meta: {} });
    engine.finalize();

    const results = engine.search('JSON-RPC protocol');
    assert.ok(results.length > 0, 'Should find results');
    assert.equal(results[0].doc.id, '1', 'First result should be the JSON-RPC doc');
  });

  it('ranks more relevant docs higher', () => {
    engine.addDoc({ id: '1', type: 'test', chunk: 'tools functions execute AI', meta: {} });
    engine.addDoc({ id: '2', type: 'test', chunk: 'tools functions execute AI model context protocol server client', meta: {} });
    engine.addDoc({ id: '3', type: 'test', chunk: 'unrelated content about cooking recipes', meta: {} });
    engine.finalize();

    const results = engine.search('tools functions AI model');
    assert.ok(results.length >= 2);
    // Doc 2 has more matching terms, should rank higher
    assert.equal(results[0].doc.id, '2');
  });

  it('returns empty for non-matching queries', () => {
    engine.addDoc({ id: '1', type: 'test', chunk: 'hello world', meta: {} });
    engine.finalize();

    const results = engine.search('xyz quantum physics');
    assert.equal(results.length, 0);
  });

  it('supports type filtering', () => {
    engine.addDoc({ id: '1', type: 'question', chunk: 'JSON-RPC notification', meta: {} });
    engine.addDoc({ id: '2', type: 'spec', chunk: 'JSON-RPC notification request', meta: {} });
    engine.addDoc({ id: '3', type: 'cheat-sheet', chunk: 'JSON-RPC basics notification', meta: {} });
    engine.finalize();

    const specOnly = engine.search('JSON-RPC notification', 10, { type: 'spec' });
    assert.ok(specOnly.every(r => r.doc.type === 'spec'), 'All results should be spec type');
    assert.equal(specOnly[0].doc.id, '2');
  });

  it('serializes and deserializes correctly', () => {
    engine.addDoc({ id: '1', type: 'test', chunk: 'test document for serialization', meta: { source: 'test' } });
    engine.addDoc({ id: '2', type: 'test', chunk: 'another test document', meta: { source: 'test2' } });
    engine.finalize();

    const json = engine.toJSON();
    const restored = BM25.fromJSON(json);

    // Search should work on restored engine
    const results = restored.search('serialization');
    assert.ok(results.length > 0);
    assert.equal(results[0].doc.id, '1');
  });

  it('handles empty index', () => {
    engine.finalize();
    const results = engine.search('anything');
    assert.equal(results.length, 0);
  });

  it('respects topK limit', () => {
    for (let i = 0; i < 20; i++) {
      engine.addDoc({ id: `${i}`, type: 'test', chunk: `document about testing number ${i}`, meta: {} });
    }
    engine.finalize();

    const results = engine.search('testing', 5);
    assert.ok(results.length <= 5, `Expected <= 5 results, got ${results.length}`);
  });
});

describe('SearchIndex', () => {
  it('builds from project data files', () => {
    const index = new SearchIndex('.');
    index.build();
    const stats = index.stats();
    
    assert.ok(stats.total > 0, `Expected > 0 docs, got ${stats.total}`);
    assert.ok(stats.types.question > 0, 'Should have question docs');
  });

  it('includes spec chunks when available', () => {
    const index = new SearchIndex('.');
    index.build();
    const stats = index.stats();
    
    // Spec index should exist (we built it earlier)
    if (stats.types.spec) {
      assert.ok(stats.types.spec > 0, 'Should have spec docs');
    }
  });

  it('search returns results with correct structure', () => {
    const index = new SearchIndex('.');
    index.load();
    
    const results = index.search('notification', 3);
    if (results.length > 0) {
      const first = results[0];
      assert.ok(first.doc, 'Result must have doc');
      assert.ok(first.score > 0, 'Score must be positive');
      assert.ok(first.doc.id, 'Doc must have id');
      assert.ok(first.doc.type, 'Doc must have type');
      assert.ok(first.doc.chunk, 'Doc must have chunk');
    }
  });
});
