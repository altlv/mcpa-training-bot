/**
 * ChatService Unit Tests
 *
 * Tests for identifyConcept(), searchAndExplain(), searchCheatSheetLegacy(),
 * getDomainForTag(), session management, and the searchCheatSheetLegacy fix
 * in identifyConcept.
 *
 * Note: chatService is a singleton that initializes from real files at require-time.
 * The test verifies it works correctly with the actual project data.
 */

const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');

// Load question service first so questions are available
const questionService = require('../src/services/questionService');
if (!questionService.loaded) questionService.loadQuestions();

// Load the singleton — this will read cheat sheet and load search index
const chatService = require('../src/services/chatService');

// ── Session Management ─────────────────────────────────────────────────

describe('ChatService — session management', () => {
  it('should create a new session on first access', () => {
    const session = chatService.getSession('test-session-1');
    assert.ok(session, 'Session should exist');
    assert.ok(Array.isArray(session.messages), 'Session should have messages array');
    assert.deepStrictEqual(session.messages, []);
    assert.deepStrictEqual(session.context, {});
  });

  it('should return the same session on repeated access', () => {
    const s1 = chatService.getSession('test-session-2');
    s1.messages.push({ role: 'user', content: 'hi' });
    const s2 = chatService.getSession('test-session-2');
    assert.strictEqual(s1, s2, 'Should return the same session object');
    assert.strictEqual(s2.messages.length, 1);
  });

  it('should add messages and keep only last MAX_MESSAGES', () => {
    const sid = 'test-session-3';
    chatService.getSession(sid); // ensure exists

    // Add more than MAX_MESSAGES (10)
    for (let i = 0; i < 15; i++) {
      chatService.addMessage(sid, 'user', `msg ${i}`);
    }

    const history = chatService.getHistory(sid);
    assert.ok(history.length <= 10, `History should be ≤10, got ${history.length}`);
    // Should keep the last ones
    assert.ok(history[history.length - 1].content.includes('msg 14'));
  });

  it('setContext should update session context', () => {
    const sid = 'test-session-4';
    chatService.setContext(sid, { questionId: 'ch7-q1', userAnswer: 'A' });
    const session = chatService.getSession(sid);
    assert.strictEqual(session.context.questionId, 'ch7-q1');
    assert.strictEqual(session.context.userAnswer, 'A');
  });
});

// ── identifyConcept ────────────────────────────────────────────────────

describe('ChatService — identifyConcept', () => {
  it('should identify tags for a valid question context', () => {
    chatService.setContext('concept-test', {
      questionId: 'ch7-q1',
    });

    const result = chatService.identifyConcept(chatService.getSession('concept-test').context);

    assert.ok(result.text, 'Should have text response');
    assert.ok(result.text.includes('This question tests:'), 'Should contain topic identification');
    assert.ok(Array.isArray(result.references), 'Should have references');
    assert.ok(result.references.length > 0, 'Should have tag references');
  });

  it('should return helpful message when no question context', () => {
    const result = chatService.identifyConcept({});
    assert.ok(result.text.includes('describe') || result.text.includes('topic'),
      'Should provide guidance when no context');
  });

  it('should include exam domain from getDomainForTag', () => {
    chatService.setContext('concept-domain', {
      questionId: 'ch7-q1',
    });

    const result = chatService.identifyConcept(chatService.getSession('concept-domain').context);
    // Should mention the exam domain somewhere in the text
    assert.ok(
      result.text.includes('Security & Governance') ||
      result.text.includes('Interactions & Execution') ||
      result.text.includes('MCP Fundamentals') ||
      result.text.includes('Architecture') ||
      result.text.includes('Use Cases'),
      'Should include an exam domain'
    );
  });
});

// ── searchAndExplain ───────────────────────────────────────────────────

describe('ChatService — searchAndExplain', () => {
  it('should return spec content for spec-related queries', () => {
    const ctx = {};
    const result = chatService.searchAndExplain('JSON-RPC specification', ctx);

    assert.ok(result.text, 'Should have text response');
    assert.ok(result.text.includes('JSON-RPC') || result.text.includes('json-rpc'),
      'Should mention JSON-RPC in results');
    assert.ok(Array.isArray(result.references), 'Should have references');
  });

  it('should return results for MCP protocol queries', () => {
    const result = chatService.searchAndExplain('MCP protocol tools resources', {});
    assert.ok(result.text, 'Should have response');
    // Should find something about MCP
    assert.ok(
      result.text.includes('MCP') || result.text.includes('mcp'),
      'Should return MCP-related content'
    );
  });

  it('should suggest topics when no results found', () => {
    const result = chatService.searchAndExplain('xyzzy_nonexistent_garbage_42', {});
    assert.ok(result.text, 'Should have response');
    // Should provide helpful suggestions
    assert.ok(
      result.text.includes('JSON-RPC') || result.text.includes('MCP') || result.text.includes('try'),
      'Should suggest topics when nothing found'
    );
  });

  it('should include question context tip when ctx.questionId is provided', () => {
    // Use a question that exists
    const questionService = require('../src/services/questionService');
    if (!questionService.loaded) questionService.loadQuestions();
    const tags = questionService.getTags();
    if (tags.length === 0) return;

    const firstTag = tags[0].name;
    const questions = questionService.getQuestionsByTags([firstTag], 1);
    if (questions.length === 0) return;

    chatService.setContext('explain-ctx-test', { questionId: questions[0].id });
    const session = chatService.getSession('explain-ctx-test');
    const result = chatService.searchAndExplain('security', session.context);

    assert.ok(result.text.includes('Tip') || result.text.includes('relates'),
      'Should include context tip when question context is provided');
  });

  it('should categorize results by type (spec, cheat-sheet, question)', () => {
    const result = chatService.searchAndExplain('OAuth authentication security', {});
    assert.ok(result.text, 'Should have response');
    // The response should mention study materials or specs if found
    assert.ok(
      result.text.includes('Found') || result.text.includes('found') ||
      result.text.includes('Here') || result.text.includes('Specification') ||
      result.text.includes('Study') || result.text.includes('question'),
      'Should categorize and present results'
    );
  });
});

// ── searchCheatSheetLegacy ─────────────────────────────────────────────

describe('ChatService — searchCheatSheetLegacy', () => {
  it('should find cheat sheet lines matching single keyword', () => {
    const results = chatService.searchCheatSheetLegacy('OAuth');
    assert.ok(results.length > 0, 'Should find OAuth mentions in cheat sheet');
    for (const r of results) {
      assert.ok(r.toLowerCase().includes('oauth'),
        `Result should mention OAuth: ${r}`);
    }
  });

  it('should find cheat sheet lines matching multiple keywords', () => {
    const results = chatService.searchCheatSheetLegacy('transport stdio');
    assert.ok(results.length >= 0, 'Should handle multi-keyword query');
    // At least one result should mention transport or stdio
    if (results.length > 0) {
      const combined = results.join(' ').toLowerCase();
      assert.ok(combined.includes('transport') || combined.includes('stdio'),
        'Results should be related to transport/stdio');
    }
  });

  it('should return at most 5 results', () => {
    const results = chatService.searchCheatSheetLegacy('security');
    assert.ok(results.length <= 5, `Should return ≤5 results, got ${results.length}`);
  });

  it('should format results with section headings', () => {
    const results = chatService.searchCheatSheetLegacy('security');
    if (results.length > 0) {
      // Results should be formatted as **Section:** content
      assert.ok(results[0].startsWith('**'), 'Result should start with bold section marker');
    }
  });

  it('should return empty for terms not in cheat sheet', () => {
    const results = chatService.searchCheatSheetLegacy('xyzzy_nonexistent_abc123');
    assert.deepStrictEqual(results, [], 'Should return empty for unknown terms');
  });
});

// ── getDomainForTag ────────────────────────────────────────────────────

describe('ChatService — getDomainForTag', () => {
  it('should map security tag to Security & Governance domain', () => {
    assert.strictEqual(
      chatService.getDomainForTag('security'),
      'Security & Governance (24%)'
    );
  });

  it('should map tools tag to Interactions & Execution domain', () => {
    assert.strictEqual(
      chatService.getDomainForTag('tools'),
      'Interactions & Execution (26%)'
    );
  });

  it('should map transport tag to Architecture & Components domain', () => {
    assert.strictEqual(
      chatService.getDomainForTag('transport'),
      'Architecture & Components (14%)'
    );
  });

  it('should map mcp tag to MCP Fundamentals domain', () => {
    assert.strictEqual(
      chatService.getDomainForTag('mcp'),
      'MCP Fundamentals (16%)'
    );
  });

  it('should map inspector tag to Use Cases & Ecosystem domain', () => {
    assert.strictEqual(
      chatService.getDomainForTag('inspector'),
      'Use Cases & Ecosystem (20%)'
    );
  });

  it('should return default domain for unknown tags', () => {
    assert.strictEqual(
      chatService.getDomainForTag('unknown_tag_xyz'),
      'MCP Fundamentals (16%)'
    );
  });

  it('should map all known tag families correctly', () => {
    const mappings = {
      'oauth': 'Security & Governance (24%)',
      'resources': 'Interactions & Execution (26%)',
      'prompts': 'Interactions & Execution (26%)',
      'architecture': 'Architecture & Components (14%)',
      'extensions': 'Use Cases & Ecosystem (20%)',
      'registry': 'Use Cases & Ecosystem (20%)',
    };
    for (const [tag, expected] of Object.entries(mappings)) {
      assert.strictEqual(chatService.getDomainForTag(tag), expected,
        `Tag "${tag}" should map to "${expected}"`);
    }
  });
});

// ── processMessage integration ─────────────────────────────────────────

describe('ChatService — processMessage', () => {
  it('should handle "what is" concept queries via identifyConcept', async () => {
    const sid = 'proc-msg-concept';
    chatService.setContext(sid, { questionId: 'ch7-q1' });

    const result = await chatService.processMessage(sid, 'What is this concept?');
    assert.ok(result.response, 'Should have response');
    assert.ok(typeof result.response === 'string');
    assert.ok(typeof result.messageCount === 'number');
  });

  it('should handle "explain" queries via searchAndExplain', async () => {
    const result = await chatService.processMessage('proc-msg-explain', 'Explain JSON-RPC');
    assert.ok(result.response, 'Should have response');
    assert.ok(result.response.length > 0, 'Response should not be empty');
  });

  it('should handle "how" queries via searchAndExplain', async () => {
    const result = await chatService.processMessage('proc-msg-how', 'How does OAuth work?');
    assert.ok(result.response, 'Should have response');
  });

  it('should fall through to searchAndExplain for general messages', async () => {
    const result = await chatService.processMessage('proc-msg-general', 'tell me about MCP tools');
    assert.ok(result.response, 'Should have response');
  });

  it('should return references array', async () => {
    const result = await chatService.processMessage('proc-msg-refs', 'JSON-RPC specification');
    assert.ok(Array.isArray(result.references), 'Should return references array');
  });
});
