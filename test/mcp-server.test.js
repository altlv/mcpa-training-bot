/**
 * MCP Server Tests — Enhanced
 * Tests MCP tools, resources, and prompts via stdio transport
 * 
 * Quality bar: Every test proves specific behavior, not just "didn't crash"
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const path = require('path');

function createMcpClient() {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [path.join(__dirname, '../src/mcp/server.js')], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let buffer = '';
    let currentId = 0;
    const pending = new Map();
    let stderrOutput = '';
    
    server.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id && pending.has(msg.id)) {
            pending.get(msg.id)(msg);
            pending.delete(msg.id);
          }
        } catch {}
      }
    });
    
    server.stderr.on('data', (data) => {
      stderrOutput += data.toString();
    });
    
    function send(method, params = {}) {
      return new Promise((res) => {
        const id = ++currentId;
        pending.set(id, res);
        server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
        // Timeout after 5s to prevent hanging
        setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            res({ error: { code: -1, message: 'Timeout' } });
          }
        }, 5000);
      });
    }
    
    function close() {
      server.kill();
    }
    
    resolve({ send, close, getStderr: () => stderrOutput });
  });
}

describe('MCP Server', () => {
  let client;

  before(async () => {
    client = await createMcpClient();
  });

  after(() => {
    if (client) client.close();
  });

  describe('Initialization', () => {
    it('should initialize with correct server info', async () => {
      const res = await client.send('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' }
      });
      
      assert.strictEqual(res.result?.serverInfo?.name, 'mcpa-teaching-bot');
      assert.strictEqual(res.result?.serverInfo?.version, '1.0.0');
      assert.ok(res.result?.capabilities?.tools, 'Missing tools capability');
      assert.ok(res.result?.capabilities?.resources, 'Missing resources capability');
      assert.ok(res.result?.capabilities?.prompts, 'Missing prompts capability');
    });
  });

  describe('Tools', () => {
    it('should list exactly 6 tools with correct names', async () => {
      const res = await client.send('tools/list');
      const tools = res.result?.tools || [];
      assert.strictEqual(tools.length, 6, `Expected 6 tools, got ${tools.length}`);
      
      const expectedTools = [
        'search_concepts', 'explain_topic', 'get_questions_by_tag',
        'get_cheat_sheet_section', 'get_weak_areas', 'get_similar_questions'
      ];
      const names = tools.map(t => t.name);
      for (const name of expectedTools) {
        assert.ok(names.includes(name), `Missing tool: ${name}`);
      }
    });

    it('search_concepts: should find "OAuth" in cheat sheet sections', async () => {
      const res = await client.send('tools/call', {
        name: 'search_concepts',
        arguments: { query: 'OAuth' }
      });
      const text = res.result?.content?.[0]?.text || '';
      
      // Must contain the actual concept, not just the query word
      assert.ok(text.includes('OAuth'), 'Response must mention OAuth');
      assert.ok(text.includes('##'), 'Response must contain section headings (markdown)');
      assert.ok(text.includes('2.1') || text.includes('2.0') || text.includes('flow') || text.includes('Flow'),
        'OAuth results should contain version or flow details');
      assert.ok(!text.includes('No results'), 'Should find results for "OAuth"');
    });

    it('search_concepts: should return "No results" for gibberish query', async () => {
      const res = await client.send('tools/call', {
        name: 'search_concepts',
        arguments: { query: 'xyzzy_nonexistent_12345' }
      });
      const text = res.result?.content?.[0]?.text || '';
      assert.ok(text.includes('No results'), `Should report no results, got: ${text.substring(0, 200)}`);
    });

    it('explain_topic: should return "Control model" section with Tools/Resources details', async () => {
      const res = await client.send('tools/call', {
        name: 'explain_topic',
        arguments: { topic: 'Control model' }
      });
      const text = res.result?.content?.[0]?.text || '';
      
      // Control model specifically discusses who controls what
      assert.ok(text.includes('Tools'), 'Should discuss Tools control');
      assert.ok(text.includes('Resources'), 'Should discuss Resources control');
      assert.ok(text.includes('Model') || text.includes('model'), 'Should mention model control');
      // Should be a real section, not an error
      assert.ok(!text.includes('not found'), `Should find topic: ${text.substring(0, 200)}`);
    });

    it('explain_topic: should return error for non-existent topic', async () => {
      const res = await client.send('tools/call', {
        name: 'explain_topic',
        arguments: { topic: 'xyzzy_nonexistent_99999' }
      });
      const text = res.result?.content?.[0]?.text || '';
      assert.ok(text.includes('not found'), `Should report topic not found: ${text.substring(0, 200)}`);
    });

    it('get_questions_by_tag: should return questions with proper structure', async () => {
      const res = await client.send('tools/call', {
        name: 'get_questions_by_tag',
        arguments: { tag: 'security', include_answers: false }
      });
      const text = res.result?.content?.[0]?.text || '';
      
      // Verify actual question structure
      assert.ok(text.includes('security'), 'Should mention the queried tag');
      assert.ok(text.includes('Q1'), 'Should have question labels');
      // Questions must have options (letter + text pattern)
      assert.ok(/[A-D]\)/.test(text), 'Should contain option letters like A) B) C) D)');
      // Must not leak answers when include_answers=false
      assert.ok(!text.includes('**Answer:**'), 'Should NOT include answers when include_answers=false');
    });

    it('get_questions_by_tag: with answers should include correct answers', async () => {
      const res = await client.send('tools/call', {
        name: 'get_questions_by_tag',
        arguments: { tag: 'tools', include_answers: true }
      });
      const text = res.result?.content?.[0]?.text || '';
      
      assert.ok(text.includes('Answer'), 'Should include answer label');
      // Answer should be a valid letter
      assert.ok(/\*\*Answer:\*\*\s*[A-E]/.test(text),
        `Answer should be a letter: ${text.substring(0, 300)}`);
    });

    it('get_questions_by_tag: should handle non-existent tag gracefully', async () => {
      const res = await client.send('tools/call', {
        name: 'get_questions_by_tag',
        arguments: { tag: 'xyzzy_nonexistent_tag' }
      });
      const text = res.result?.content?.[0]?.text || '';
      assert.ok(text.includes('No questions found') || text.includes('Available tags'),
        `Should report no results or show available tags: ${text.substring(0, 200)}`);
    });

    it('get_cheat_sheet_section: list should return section names', async () => {
      const res = await client.send('tools/call', {
        name: 'get_cheat_sheet_section',
        arguments: { section: 'list' }
      });
      const text = res.result?.content?.[0]?.text || '';
      
      // Verify actual section names from the cheat sheet
      assert.ok(text.includes('Architecture'), 'Should list Architecture section');
      assert.ok(text.includes('Security'), 'Should list Security section');
      assert.ok(text.includes('Transport'), 'Should list Transport section');
    });

    it('get_cheat_sheet_section: should return specific section content', async () => {
      const res = await client.send('tools/call', {
        name: 'get_cheat_sheet_section',
        arguments: { section: 'Security' }
      });
      const text = res.result?.content?.[0]?.text || '';
      
      // Tool returns the top-level section heading + first sub-section
      assert.ok(text.includes('Security'), 'Should contain the Security heading');
      assert.ok(text.includes('##'), 'Should contain markdown heading');
      assert.ok(text.length > 100, `Section content too short: ${text.length} chars`);
    });

    it('get_weak_areas: should handle no quiz results gracefully', async () => {
      const res = await client.send('tools/call', {
        name: 'get_weak_areas',
        arguments: {}
      });
      const text = res.result?.content?.[0]?.text || '';
      
      // Should return a helpful message, not crash
      assert.ok(text.length > 0, 'Should return a message');
      assert.ok(!text.includes('Error') && !text.includes('error') && !text.includes('crash'),
        `Should not contain errors: ${text.substring(0, 200)}`);
      // Should mention taking a quiz
      assert.ok(text.includes('quiz') || text.includes('Quiz') || text.includes('results'),
        'Should mention quiz or results when no data exists');
    });

    it('get_similar_questions: should find questions by topic with structure', async () => {
      const res = await client.send('tools/call', {
        name: 'get_similar_questions',
        arguments: { topic: 'oauth', count: 3 }
      });
      const text = res.result?.content?.[0]?.text || '';
      
      assert.ok(text.includes('oauth') || text.includes('OAuth'),
        'Should mention the queried topic');
      // Should have question structure
      assert.ok(/[A-D]\)/.test(text), 'Should contain option letters');
      assert.ok(text.includes('Q1') || text.includes('**Q'), 'Should have question labels');
      // Should contain explanations
      assert.ok(text.includes('_') || text.includes('Hint'),
        'Should contain explanations or hints');
    });

    it('get_similar_questions: should handle non-existent topic', async () => {
      const res = await client.send('tools/call', {
        name: 'get_similar_questions',
        arguments: { topic: 'xyzzy_nonexistent_99999', count: 3 }
      });
      const text = res.result?.content?.[0]?.text || '';
      assert.ok(text.includes('No questions found') || text.includes('Available tags'),
        `Should report no results: ${text.substring(0, 200)}`);
    });
  });

  describe('Resources', () => {
    it('should list exactly 3 resources with correct URIs', async () => {
      const res = await client.send('resources/list');
      const resources = res.result?.resources || [];
      assert.strictEqual(resources.length, 3, `Expected 3 resources, got ${resources.length}`);
      
      const uris = resources.map(r => r.uri);
      assert.ok(uris.includes('mcpa://cheat-sheet'), 'Missing cheat-sheet resource');
      assert.ok(uris.includes('mcpa://exam-domains'), 'Missing exam-domains resource');
      assert.ok(uris.includes('mcpa://glossary'), 'Missing glossary resource');
    });

    it('cheat-sheet: should return full markdown with MCP content', async () => {
      const res = await client.send('resources/read', {
        uri: 'mcpa://cheat-sheet'
      });
      const text = res.result?.contents?.[0]?.text || '';
      
      // Verify actual cheat sheet content
      assert.ok(text.includes('MCP'), 'Should contain MCP content');
      assert.ok(text.includes('##'), 'Should have markdown headings');
      assert.ok(text.includes('Tool') || text.includes('tool'), 'Should discuss tools');
      assert.ok(text.includes('Resource') || text.includes('resource'), 'Should discuss resources');
      assert.ok(text.length > 5000, `Cheat sheet seems too short: ${text.length} chars`);
    });

    it('exam-domains: should return domain weights with percentages', async () => {
      const res = await client.send('resources/read', {
        uri: 'mcpa://exam-domains'
      });
      const text = res.result?.contents?.[0]?.text || '';
      
      // Verify actual exam domain data
      assert.ok(text.includes('26%'), 'Should include Interactions weight (26%)');
      assert.ok(text.includes('24%'), 'Should include Security weight (24%)');
      assert.ok(text.includes('Interactions'), 'Should mention Interactions domain');
      assert.ok(text.includes('Security'), 'Should mention Security domain');
      assert.ok(text.includes('16%') || text.includes('Fundamentals'),
        'Should mention Fundamentals domain');
    });

    it('glossary: should define key MCP terms', async () => {
      const res = await client.send('resources/read', {
        uri: 'mcpa://glossary'
      });
      const text = res.result?.contents?.[0]?.text || '';
      
      // Verify actual glossary terms
      assert.ok(text.includes('MCP'), 'Should define MCP');
      assert.ok(text.includes('Tool'), 'Should define Tool');
      assert.ok(text.includes('Resource'), 'Should define Resource');
      assert.ok(text.includes('MRTR'), 'Should define MRTR');
      assert.ok(text.includes('Host'), 'Should define Host');
    });
  });

  describe('Prompts', () => {
    it('should list exactly 2 prompts with correct names', async () => {
      const res = await client.send('prompts/list');
      const prompts = res.result?.prompts || [];
      assert.strictEqual(prompts.length, 2, `Expected 2 prompts, got ${prompts.length}`);
      
      const names = prompts.map(p => p.name);
      assert.ok(names.includes('teach-concept'), 'Missing teach-concept prompt');
      assert.ok(names.includes('compare'), 'Missing compare prompt');
    });

    it('teach-concept: should return message with concept details', async () => {
      const res = await client.send('prompts/get', {
        name: 'teach-concept',
        arguments: { concept: 'MRTR' }
      });
      const messages = res.result?.messages || [];
      assert.ok(messages.length > 0, 'Should return messages');
      
      const text = messages[0].content?.text || '';
      assert.ok(text.includes('MRTR'), 'Should mention the concept');
      assert.ok(text.includes('explain') || text.includes('Explain'),
        'Should ask for explanation');
      assert.ok(text.includes('pitfall') || text.includes('trap') || text.includes('exam'),
        'Should mention exam pitfalls');
    });

    it('compare: should return message comparing two topics', async () => {
      const res = await client.send('prompts/get', {
        name: 'compare',
        arguments: { topic_a: 'tools', topic_b: 'resources' }
      });
      const messages = res.result?.messages || [];
      assert.ok(messages.length > 0, 'Should return messages');
      
      const text = messages[0].content?.text || '';
      assert.ok(text.includes('tools'), 'Should mention topic_a');
      assert.ok(text.includes('resources'), 'Should mention topic_b');
      assert.ok(text.includes('difference') || text.includes('similar') || text.includes('compare'),
        'Should ask for comparison');
    });
  });
});
