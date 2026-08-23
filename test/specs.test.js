/**
 * Specs Routes Tests
 * 
 * Tests the /api/specs endpoints:
 * - GET /api/specs/status - index status
 * - POST /api/specs/build - trigger build
 * - GET /api/specs/search - search spec content
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

// Helper to make HTTP requests
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
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

const BASE = 'http://localhost:3000';

describe('Specs Routes', () => {
  // Server should be running for these tests
  // Run: node src/server.js &

  describe('GET /api/specs/status', () => {
    it('returns built status', async () => {
      try {
        const res = await fetch(`${BASE}/api/specs/status`);
        assert.equal(res.status, 200);
        assert.equal(res.json.built, true);
        assert.ok(res.json.totalChunks > 0, 'Should have chunks');
        assert.ok(Array.isArray(res.json.sources), 'Should have sources array');
        assert.equal(res.json.sources.length, 2, 'Should have 2 sources');
      } catch (e) {
        if (e.code === 'ECONNREFUSED') {
          console.log('⚠️  Server not running - skipping (start with: node src/server.js)');
          return;
        }
        throw e;
      }
    });

    it('includes source details', async () => {
      try {
        const res = await fetch(`${BASE}/api/specs/status`);
        const jsonrpc = res.json.sources.find(s => s.id === 'jsonrpc');
        const mcp = res.json.sources.find(s => s.id === 'mcp');
        
        assert.ok(jsonrpc, 'Should have jsonrpc source');
        assert.ok(mcp, 'Should have mcp source');
        assert.equal(jsonrpc.chunks > 0, true, 'jsonrpc should have chunks');
        assert.equal(mcp.chunks > 0, true, 'mcp should have chunks');
      } catch (e) {
        if (e.code === 'ECONNREFUSED') return;
        throw e;
      }
    });
  });

  describe('GET /api/specs/search', () => {
    it('returns spec results for valid query', async () => {
      try {
        const res = await fetch(`${BASE}/api/specs/search?q=notification`);
        assert.equal(res.status, 200);
        assert.ok(res.json.results.length > 0, 'Should find results for "notification"');
        assert.equal(res.json.query, 'notification');
      } catch (e) {
        if (e.code === 'ECONNREFUSED') return;
        throw e;
      }
    });

    it('results have correct structure', async () => {
      try {
        const res = await fetch(`${BASE}/api/specs/search?q=tools`);
        assert.equal(res.status, 200);
        
        if (res.json.results.length > 0) {
          const first = res.json.results[0];
          assert.ok(first.id, 'Result must have id');
          assert.ok(first.source, 'Result must have source');
          assert.ok(first.chunk, 'Result must have chunk');
          assert.ok(typeof first.score === 'number', 'Result must have numeric score');
        }
      } catch (e) {
        if (e.code === 'ECONNREFUSED') return;
        throw e;
      }
    });

    it('returns 400 when query missing', async () => {
      try {
        const res = await fetch(`${BASE}/api/specs/search`);
        assert.equal(res.status, 400);
      } catch (e) {
        if (e.code === 'ECONNREFUSED') return;
        throw e;
      }
    });

    it('finds JSON-RPC specific content', async () => {
      try {
        const res = await fetch(`${BASE}/api/specs/search?q=batch+request`);
        assert.ok(res.json.results.length > 0, 'Should find batch request content');
        const jsonrpcResult = res.json.results.find(r => r.source === 'JSON-RPC 2.0 Specification');
        assert.ok(jsonrpcResult, 'Should find JSON-RPC spec content');
      } catch (e) {
        if (e.code === 'ECONNREFUSED') return;
        throw e;
      }
    });

    it('finds MCP specific content', async () => {
      try {
        const res = await fetch(`${BASE}/api/specs/search?q=MCP+tools+resources`);
        assert.ok(res.json.results.length > 0, 'Should find MCP content');
        const mcpResult = res.json.results.find(r => r.source === 'Model Context Protocol Specification');
        assert.ok(mcpResult, 'Should find MCP spec content');
      } catch (e) {
        if (e.code === 'ECONNREFUSED') return;
        throw e;
      }
    });
  });
});
