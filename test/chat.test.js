/**
 * Chat API Tests
 * Tests chat teaching assistant endpoints
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const BASE = 'http://localhost:3000';
let serverProcess = null;

function request(method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function waitForServer(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http.get(BASE + '/api/health', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try { JSON.parse(data); resolve(); }
          catch { retry(); }
        });
      }).on('error', retry);
    };
    const retry = () => {
      if (Date.now() - start > timeout) {
        reject(new Error('Server did not start within ' + timeout + 'ms'));
      } else {
        setTimeout(check, 200);
      }
    };
    check();
  });
}

describe('Chat API', () => {

  before(async () => {
    // Start server if not already running
    try {
      await new Promise((resolve, reject) => {
        http.get(BASE + '/api/health', (res) => {
          res.resume();
          resolve();
        }).on('error', reject);
      });
    } catch {
      serverProcess = spawn('node', [path.join(__dirname, '../src/server.js')], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      await waitForServer();
    }
  });

  after(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      serverProcess = null;
    }
  });

  describe('POST /api/chat', () => {
    it('should send a message and get a response with reply field', async () => {
      const res = await request('POST', '/api/chat', {
        sessionId: 'test-chat-1',
        message: 'What is OAuth?'
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.response, 'Missing response field');
      assert.ok(typeof res.body.response === 'string', 'response should be a string');
      assert.ok(res.body.response.length > 0, 'response should not be empty');
      assert.ok(typeof res.body.messageCount === 'number', 'Missing messageCount');
    });

    it('should return 400 when sessionId is missing', async () => {
      const res = await request('POST', '/api/chat', {
        message: 'Hello'
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'MISSING_SESSION_ID');
    });

    it('should return 400 when message is missing', async () => {
      const res = await request('POST', '/api/chat', {
        sessionId: 'test-chat-2'
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'MISSING_MESSAGE');
    });

    it('should return 400 when message is empty string', async () => {
      const res = await request('POST', '/api/chat', {
        sessionId: 'test-chat-2b',
        message: '   '
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'MISSING_MESSAGE');
    });
  });

  describe('POST /api/chat/context', () => {
    it('should update question context and return success', async () => {
      const res = await request('POST', '/api/chat/context', {
        sessionId: 'test-chat-3',
        questionId: 'ch7-q1',
        userAnswer: 'A',
        correctAnswer: 'B',
        isCorrect: false
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(typeof res.body.autoMessage === 'string', 'Missing autoMessage');
      assert.ok(res.body.context, 'Missing context object');
      assert.strictEqual(res.body.context.questionId, 'ch7-q1');
      assert.strictEqual(res.body.context.isCorrect, false);
    });

    it('should return success=true when answer is correct', async () => {
      const res = await request('POST', '/api/chat/context', {
        sessionId: 'test-chat-4',
        questionId: 'ch7-q1',
        userAnswer: 'B',
        correctAnswer: 'B',
        isCorrect: true
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.autoMessage.includes('✅') || res.body.autoMessage.toLowerCase().includes('great'),
        'Should indicate correct answer');
    });

    it('should return 400 when sessionId is missing', async () => {
      const res = await request('POST', '/api/chat/context', {
        questionId: 'ch7-q1',
        userAnswer: 'A',
        correctAnswer: 'B',
        isCorrect: false
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'MISSING_SESSION_ID');
    });
  });

  describe('POST /api/chat/action', () => {
    it('should handle explain_answer action', async () => {
      // First set context
      await request('POST', '/api/chat/context', {
        sessionId: 'test-chat-5',
        questionId: 'ch7-q1',
        userAnswer: 'A',
        correctAnswer: 'B',
        isCorrect: false
      });

      const res = await request('POST', '/api/chat/action', {
        sessionId: 'test-chat-5',
        action: 'explain_answer'
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.response, 'Missing response field');
      assert.ok(res.body.response.length > 0, 'Response should not be empty');
    });

    it('should handle identify_concept action', async () => {
      // First set context
      await request('POST', '/api/chat/context', {
        sessionId: 'test-chat-6',
        questionId: 'ch7-q1',
        userAnswer: 'A',
        correctAnswer: 'B',
        isCorrect: false
      });

      const res = await request('POST', '/api/chat/action', {
        sessionId: 'test-chat-6',
        action: 'identify_concept'
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.response, 'Missing response field');
      assert.ok(res.body.response.length > 0, 'Response should not be empty');
    });

    it('should return 400 for invalid action', async () => {
      const res = await request('POST', '/api/chat/action', {
        sessionId: 'test-chat-7',
        action: 'invalid_action'
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'INVALID_ACTION');
    });

    it('should return 400 when sessionId is missing', async () => {
      const res = await request('POST', '/api/chat/action', {
        action: 'explain_answer'
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'MISSING_SESSION_ID');
    });
  });

  describe('GET /api/chat/history/:sessionId', () => {
    it('should return message history for a session', async () => {
      // Create some history first
      await request('POST', '/api/chat', {
        sessionId: 'test-chat-history',
        message: 'What are MCP tools?'
      });
      await request('POST', '/api/chat', {
        sessionId: 'test-chat-history',
        message: 'How do resources work?'
      });

      const res = await request('GET', '/api/chat/history/test-chat-history');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.messages), 'Missing messages array');
      assert.ok(res.body.messages.length >= 2, `Expected at least 2 messages, got ${res.body.messages.length}`);

      // Check message structure
      for (const msg of res.body.messages) {
        assert.ok(msg.role, 'Missing role');
        assert.ok(msg.content, 'Missing content');
        assert.ok(msg.timestamp, 'Missing timestamp');
        assert.ok(['user', 'assistant'].includes(msg.role),
          `Invalid role: ${msg.role}`);
      }
    });

    it('should return empty array for new session', async () => {
      const res = await request('GET', '/api/chat/history/new-unused-session-12345');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.messages), 'Missing messages array');
      assert.strictEqual(res.body.messages.length, 0, 'New session should have empty history');
    });
  });
});
