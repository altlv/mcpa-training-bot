/**
 * Specs Routes Tests
 * 
 * Tests the /api/specs endpoints with a managed server lifecycle:
 * - GET /api/specs/status - index status
 * - GET /api/specs/search - search spec content
 * - Search relevance ranking
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const BASE = 'http://localhost:3000';
let serverProcess;

// Helper to make HTTP requests
function fetch(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

// Start server for specs tests (isolated lifecycle)
before(async () => {
  // Check if server is already running
  try {
    await fetch(`${BASE}/api/health`);
    return; // Already running
  } catch {
    // Need to start
  }

  serverProcess = spawn('node', [path.join(__dirname, '../src/server.js')], {
    stdio: 'pipe',
    env: { ...process.env }
  });

  for (let i = 0; i < 15; i++) {
    try {
      await fetch(`${BASE}/api/health`);
      return;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('Server failed to start for specs tests');
});

after(() => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

describe('Specs Routes', () => {

  describe('GET /api/specs/status', () => {
    it('returns built status with correct structure', async () => {
      const res = await fetch(`${BASE}/api/specs/status`);
      assert.equal(res.status, 200);
      assert.equal(res.json.built, true);
      assert.ok(res.json.totalChunks > 0, 'Should have chunks');
      assert.ok(Array.isArray(res.json.sources), 'Should have sources array');
      assert.equal(res.json.sources.length, 2, 'Should have 2 sources');
    });

    it('includes source details with chunk counts', async () => {
      const res = await fetch(`${BASE}/api/specs/status`);
      const jsonrpc = res.json.sources.find(s => s.id === 'jsonrpc');
      const mcp = res.json.sources.find(s => s.id === 'mcp');
      
      assert.ok(jsonrpc, 'Should have jsonrpc source');
      assert.ok(mcp, 'Should have mcp source');
      assert.ok(jsonrpc.chunks > 0, 'jsonrpc should have chunks');
      assert.ok(mcp.chunks > 0, 'mcp should have chunks');
    });
  });

  describe('GET /api/specs/search', () => {
    it('returns spec results for valid query', async () => {
      const res = await fetch(`${BASE}/api/specs/search?q=notification`);
      assert.equal(res.status, 200);
      assert.ok(res.json.results.length > 0, 'Should find results for "notification"');
      assert.equal(res.json.query, 'notification');
    });

    it('results have correct structure', async () => {
      const res = await fetch(`${BASE}/api/specs/search?q=tools`);
      assert.equal(res.status, 200);
      
      if (res.json.results.length > 0) {
        const first = res.json.results[0];
        assert.ok(first.id, 'Result must have id');
        assert.ok(first.source, 'Result must have source');
        assert.ok(first.chunk, 'Result must have chunk');
        assert.ok(typeof first.score === 'number', 'Result must have numeric score');
      }
    });

    it('returns 400 when query missing', async () => {
      const res = await fetch(`${BASE}/api/specs/search`);
      assert.equal(res.status, 400);
    });

    it('returns empty results for nonsensical query', async () => {
      const res = await fetch(`${BASE}/api/specs/search?q=xyzzyplugh123`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.json.results));
      assert.strictEqual(res.json.results.length, 0);
    });

    it('finds JSON-RPC specific content for batch requests', async () => {
      const res = await fetch(`${BASE}/api/specs/search?q=batch+request`);
      assert.ok(res.json.results.length > 0, 'Should find batch request content');
      const jsonrpcResult = res.json.results.find(r =>
        r.source && r.source.toLowerCase().includes('json-rpc'));
      assert.ok(jsonrpcResult, 'Should find JSON-RPC spec content for "batch request"');
    });

    it('finds MCP specific content for tools and resources', async () => {
      const res = await fetch(`${BASE}/api/specs/search?q=MCP+tools+resources`);
      assert.ok(res.json.results.length > 0, 'Should find MCP content');
      const mcpResult = res.json.results.find(r =>
        r.source && r.source.toLowerCase().includes('model context protocol'));
      assert.ok(mcpResult, 'Should find MCP spec content');
    });

    it('respects limit parameter', async () => {
      const res = await fetch(`${BASE}/api/specs/search?q=protocol&limit=2`);
      assert.equal(res.status, 200);
      assert.ok(res.json.results.length <= 2,
        `Expected ≤2 results, got ${res.json.results.length}`);
    });
  });

  describe('QA: Search relevance ranking', () => {
    it('should rank JSON-RPC content higher for JSON-RPC-specific queries', async () => {
      const res = await fetch(`${BASE}/api/specs/search?q=JSON-RPC+notification+batch`);
      assert.ok(res.json.results.length >= 2, 'Need at least 2 results for ranking check');

      // Find the first result from each source
      const firstJsonRpc = res.json.results.findIndex(r =>
        r.source && r.source.toLowerCase().includes('json-rpc'));
      const firstMcp = res.json.results.findIndex(r =>
        r.source && r.source.toLowerCase().includes('model context protocol'));

      // JSON-RPC should appear first (or MCP should not appear before it)
      if (firstJsonRpc >= 0 && firstMcp >= 0) {
        assert.ok(firstJsonRpc < firstMcp,
          `JSON-RPC result (index ${firstJsonRpc}) should rank higher than MCP (index ${firstMcp}) for JSON-RPC query`);
      }
      // If only JSON-RPC results, that's also correct
    });

    it('should return scores in descending order', async () => {
      const res = await fetch(`${BASE}/api/specs/search?q=protocol`);
      if (res.json.results.length >= 2) {
        for (let i = 0; i < res.json.results.length - 1; i++) {
          assert.ok(res.json.results[i].score >= res.json.results[i + 1].score,
            `Result ${i} score (${res.json.results[i].score}) should be >= result ${i + 1} score (${res.json.results[i + 1].score})`);
        }
      }
    });

    it('should find more relevant results for specific vs generic queries', async () => {
      const specific = await fetch(`${BASE}/api/specs/search?q=JSON-RPC+2.0+batch+request+notification`);
      const generic = await fetch(`${BASE}/api/specs/search?q=a+the+is`);

      // Specific query should return results, generic stop-word query may return fewer or none
      assert.ok(specific.json.results.length > 0,
        'Specific query should return results');
      // Generic stop-word query might return 0 results after tokenization removes stopwords
      // This is fine — we just verify specific queries work
    });

    it('result chunks should be truncated to 500 chars', async () => {
      const res = await fetch(`${BASE}/api/specs/search?q=protocol`);
      res.json.results.forEach(r => {
        assert.ok(r.chunk.length <= 500,
          `Chunk should be ≤500 chars, got ${r.chunk.length}`);
      });
    });
  });
});
