/**
 * MCPA Teaching Bot — MCP Server
 * 
 * This IS the MCP server project. It exposes tools, resources, and prompts
 * for learning MCP concepts and preparing for the MCPA certification exam.
 * 
 * Transport: stdio (for local clients like Claude Desktop, goose)
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');

// Create MCP server
const server = new McpServer({
  name: 'mcpa-teaching-bot',
  version: '1.0.0',
});

// Load cheat sheet content
const cheatSheetPath = path.join(__dirname, '../../docs/learning-notes/EXAM-CHEAT-SHEET.md');
const cheatSheetContent = fs.readFileSync(cheatSheetPath, 'utf8');

// Load question bank
const questionService = require('../services/questionService');
questionService.loadQuestions();

// Load quiz results history
const resultsDir = path.join(__dirname, '../../data/results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

function loadQuizResults() {
  try {
    const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));
    return files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8'));
      return data;
    });
  } catch (e) {
    return [];
  }
}

// ==================== TOOLS ====================

/**
 * Tool: search_concepts
 * Search MCP concepts from the cheat sheet
 */
server.tool(
  'search_concepts',
  'Search MCP exam concepts from the cheat sheet. Use keywords to find relevant sections.',
  { query: z.string().describe('Search query (e.g., "OAuth flow", "MRTR", "tools vs resources")') },
  async ({ query }) => {
    const lines = cheatSheetContent.split('\n');
    const results = [];
    const queryLower = query.toLowerCase();
    
    // Search for matching sections
    let currentSection = '';
    let currentContent = [];
    
    for (const line of lines) {
      if (line.startsWith('## ') || line.startsWith('### ')) {
        // Save previous section if it had matches
        if (currentSection && currentContent.some(l => l.toLowerCase().includes(queryLower))) {
          results.push({
            section: currentSection,
            content: currentContent.filter(l => l.toLowerCase().includes(queryLower)).join('\n')
          });
        }
        currentSection = line.replace(/^#+\s*/, '');
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    
    // Don't forget last section
    if (currentSection && currentContent.some(l => l.toLowerCase().includes(queryLower))) {
      results.push({
        section: currentSection,
        content: currentContent.filter(l => l.toLowerCase().includes(queryLower)).join('\n')
      });
    }
    
    if (results.length === 0) {
      return {
        content: [{ type: 'text', text: `No results found for "${query}". Try different keywords.` }]
      };
    }
    
    const formatted = results.slice(0, 5).map(r => 
      `## ${r.section}\n${r.content}`
    ).join('\n\n---\n\n');
    
    return {
      content: [{ type: 'text', text: `Found ${results.length} sections for "${query}":\n\n${formatted}` }]
    };
  }
);

/**
 * Tool: explain_topic
 * Get a detailed explanation of an MCP topic
 */
server.tool(
  'explain_topic',
  'Get a detailed explanation of an MCP concept. Returns the full section from the cheat sheet.',
  { topic: z.string().describe('Topic to explain (e.g., "Control model", "OAuth 2.1 Flow", "Stateless Core")') },
  async ({ topic }) => {
    const lines = cheatSheetContent.split('\n');
    let inSection = false;
    let sectionContent = [];
    let sectionLevel = 0;
    
    for (const line of lines) {
      if (line.startsWith('## ') || line.startsWith('### ')) {
        if (inSection && sectionContent.length > 0) {
          break; // Hit next section, stop
        }
        const sectionName = line.replace(/^#+\s*/, '').toLowerCase();
        if (sectionName.includes(topic.toLowerCase())) {
          inSection = true;
          sectionLevel = line.startsWith('### ') ? 3 : 2;
          sectionContent.push(line);
        }
      } else if (inSection) {
        // Stop at same or higher level heading
        if ((line.startsWith('## ') && sectionLevel <= 2) || 
            (line.startsWith('### ') && sectionLevel <= 3)) {
          break;
        }
        sectionContent.push(line);
      }
    }
    
    if (sectionContent.length === 0) {
      return {
        content: [{ type: 'text', text: `Topic "${topic}" not found. Try: tools, resources, prompts, OAuth, MRTR, stateless, transport, architecture` }]
      };
    }
    
    return {
      content: [{ type: 'text', text: sectionContent.join('\n') }]
    };
  }
);

/**
 * Tool: get_questions_by_tag
 * Get quiz questions for a specific topic
 */
server.tool(
  'get_questions_by_tag',
  'Get quiz questions filtered by topic tag. Returns question text and options (without answers for self-testing).',
  { 
    tag: z.string().describe('Tag to filter by (e.g., "security", "tools", "oauth", "mrtr")'),
    include_answers: z.boolean().optional().describe('Whether to include correct answers (default: false)')
  },
  async ({ tag, include_answers }) => {
    const questions = questionService.getQuestionsByTags([tag], 10);
    
    if (questions.length === 0) {
      const availableTags = questionService.getTags().slice(0, 20).map(t => t.name).join(', ');
      return {
        content: [{ type: 'text', text: `No questions found for tag "${tag}". Available tags include: ${availableTags}` }]
      };
    }
    
    const formatted = questions.map((q, i) => {
      let text = `**Q${i+1}:** ${q.question}\n`;
      text += q.options.map(o => `  ${o.letter}) ${o.text}`).join('\n');
      if (include_answers) {
        const correct = q.answer || (q.answers ? q.answers.join(', ') : '?');
        text += `\n**Answer:** ${correct}`;
      }
      return text;
    }).join('\n\n');
    
    return {
      content: [{ type: 'text', text: `**${questions.length} questions for "${tag}":**\n\n${formatted}` }]
    };
  }
);

/**
 * Tool: get_cheat_sheet_section
 * Get a specific section from the cheat sheet by heading
 */
server.tool(
  'get_cheat_sheet_section',
  'Get a specific section from the exam cheat sheet. List available sections or get one by name.',
  { 
    section: z.string().describe('Section name (or "list" to see all sections)')
  },
  async ({ section }) => {
    if (section.toLowerCase() === 'list') {
      const sections = cheatSheetContent.split('\n')
        .filter(l => l.startsWith('## ') || l.startsWith('### '))
        .map(l => l.replace(/^#+\s*/, ''));
      return {
        content: [{ type: 'text', text: `**Available sections:**\n\n${sections.join('\n')}` }]
      };
    }
    
    // Find section
    const lines = cheatSheetContent.split('\n');
    let found = false;
    let content = [];
    let sectionLevel = 0;
    
    for (const line of lines) {
      const isH2 = line.startsWith('## ');
      const isH3 = line.startsWith('### ');
      
      if (!found) {
        // Looking for the matching heading
        if ((isH2 || isH3) && line.includes(section)) {
          found = true;
          sectionLevel = isH2 ? 2 : 3;
          content.push(line);
        }
      } else {
        // Inside section: collect content lines
        // Stop ONLY at a new h2 (when our section is h2 or deeper)
        if (isH2 && sectionLevel <= 2) break;
        // Stop at h3 only if it's a NEW h3 (not our section heading repeated)
        if (isH3 && sectionLevel === 3) break;
        content.push(line);
      }
    }
    
    if (content.length === 0) {
      return {
        content: [{ type: 'text', text: `Section "${section}" not found. Use section: "list" to see available sections.` }]
      };
    }
    
    return {
      content: [{ type: 'text', text: content.join('\n') }]
    };
  }
);

// ==================== MORE TOOLS ====================

/**
 * Tool: get_weak_areas
 * Analyze quiz results and return weak topics
 */
server.tool(
  'get_weak_areas',
  'Analyze past quiz results and return topics the student struggles with, sorted by weakness.',
  { 
    min_questions: z.number().optional().describe('Minimum questions per tag to include (default: 2)')
  },
  async ({ min_questions }) => {
    const threshold = min_questions || 2;
    const allResults = loadQuizResults();
    
    if (allResults.length === 0) {
      return {
        content: [{ type: 'text', text: 'No quiz results found. Take a quiz first, then I can analyze your weak areas.' }]
      };
    }
    
    // Aggregate stats by tag
    const tagStats = {};
    for (const quiz of allResults) {
      for (const r of (quiz.results || [])) {
        for (const tag of (r.tags || [])) {
          if (!tagStats[tag]) {
            tagStats[tag] = { correct: 0, total: 0, recent: [] };
          }
          tagStats[tag].total++;
          if (r.isCorrect) tagStats[tag].correct++;
          tagStats[tag].recent.push({
            questionId: r.questionId,
            isCorrect: r.isCorrect,
            timestamp: quiz.timestamp
          });
        }
      }
    }
    
    // Calculate percentages and filter
    const weakAreas = Object.entries(tagStats)
      .filter(([_, stats]) => stats.total >= threshold)
      .map(([tag, stats]) => ({
        tag,
        percentage: Math.round((stats.correct / stats.total) * 100),
        correct: stats.correct,
        total: stats.total,
        missed: stats.total - stats.correct
      }))
      .sort((a, b) => a.percentage - b.percentage);
    
    if (weakAreas.length === 0) {
      return {
        content: [{ type: 'text', text: `Not enough data yet. You need at least ${threshold} questions per topic. Take more quizzes!` }]
      };
    }
    
    const totalQuizzes = allResults.length;
    const overallCorrect = allResults.reduce((sum, q) => sum + (q.score || 0), 0);
    const overallTotal = allResults.reduce((sum, q) => sum + (q.totalQuestions || 0), 0);
    
    let text = `**Quiz Analysis** (${totalQuizzes} quizzes taken, ${overallCorrect}/${overallTotal} overall = ${Math.round((overallCorrect/overallTotal)*100)}%)\n\n`;
    text += `**Weak Areas** (sorted by weakest first):\n\n`;
    
    for (const area of weakAreas.slice(0, 10)) {
      const bar = area.percentage < 50 ? '🔴' : area.percentage < 75 ? '🟡' : '🟢';
      text += `${bar} **${area.tag}**: ${area.percentage}% (${area.correct}/${area.total})\n`;
    }
    
    text += `\n**Recommendation:** Focus on ${weakAreas[0]?.tag || 'the weakest area'} first. Use "explain ${weakAreas[0]?.tag || 'topic'}" to study.`;
    
    return {
      content: [{ type: 'text', text }]
    };
  }
);

/**
 * Tool: get_similar_questions
 * Find questions related to a concept or weak area
 */
server.tool(
  'get_similar_questions',
  'Find questions similar to a topic or question. Useful for targeted practice on weak areas.',
  { 
    topic: z.string().describe('Topic or concept to find questions for'),
    count: z.number().optional().describe('Number of questions (default: 5)')
  },
  async ({ topic, count }) => {
    const numQuestions = count || 5;
    
    // Search by tag
    let questions = questionService.getQuestionsByTags([topic], numQuestions);
    
    // If no tag match, search by question text
    if (questions.length === 0) {
      const allQuestions = questionService.getAllQuestions();
      const topicLower = topic.toLowerCase();
      questions = allQuestions
        .filter(q => q.question.toLowerCase().includes(topicLower) || 
                     (q.explanation && q.explanation.toLowerCase().includes(topicLower)))
        .slice(0, numQuestions);
    }
    
    if (questions.length === 0) {
      const availableTags = questionService.getTags().slice(0, 15).map(t => t.name).join(', ');
      return {
        content: [{ type: 'text', text: `No questions found for "${topic}". Available tags: ${availableTags}` }]
      };
    }
    
    const formatted = questions.map((q, i) => {
      let text = `**Q${i+1}** (${q.id}): ${q.question}\n`;
      text += q.options.map(o => `  ${o.letter}) ${o.text}`).join('\n');
      if (q.explanation) {
        text += `\n> _${q.explanation.substring(0, 150)}..._`;
      }
      return text;
    }).join('\n\n');
    
    return {
      content: [{ 
        type: 'text', 
        text: `**${questions.length} questions about "${topic}":**\n\n${formatted}\n\n_Hint: Use "explain [concept]" to study the underlying topic._` 
      }]
    };
  }
);

// ==================== RESOURCES ====================

/**
 * Resource: mcpa://cheat-sheet
 * Full exam cheat sheet
 */
server.resource(
  'cheat-sheet',
  'mcpa://cheat-sheet',
  { mimeType: 'text/markdown', description: 'Complete MCPA exam cheat sheet' },
  async () => ({
    contents: [{ uri: 'mcpa://cheat-sheet', mimeType: 'text/markdown', text: cheatSheetContent }]
  })
);

/**
 * Resource: mcpa://exam-domains
 * Exam domain weights
 */
server.resource(
  'exam-domains',
  'mcpa://exam-domains',
  { mimeType: 'text/markdown', description: 'Exam domain weights and topic mapping' },
  async () => {
    const domains = `# MCPA Exam Domains

| Domain | Weight | Topics |
|--------|--------|--------|
| Interactions & Execution | 26% | Server Features, Client Features, Building Servers, Client Best Practices, Debugging |
| Security & Governance | 24% | OAuth 2.1, Security & Trust, Lifecycle, Governance |
| Use Cases & Ecosystem | 20% | Inspector, Extensions, Registry, AGENTS.md, AgentGateway |
| MCP Fundamentals | 16% | Protocol basics, JSON-RPC |
| Architecture & Components | 14% | Architecture, Transports, Headers |

**Rule of thumb:** Interactions + Security = 50% of the exam.
`;
    return {
      contents: [{ uri: 'mcpa://exam-domains', mimeType: 'text/markdown', text: domains }]
    };
  }
);

/**
 * Resource: mcpa://glossary
 * MCP terms glossary
 */
server.resource(
  'glossary',
  'mcpa://glossary',
  { mimeType: 'text/markdown', description: 'MCP terms and definitions' },
  async () => {
    const glossary = `# MCP Glossary

| Term | Definition |
|------|------------|
| MCP | Model Context Protocol — open standard connecting AI apps to tools/data |
| Host | Application that spawns AI models (e.g., Claude Desktop, VS Code) |
| Client | Protocol bridge inside the host (one per server connection) |
| Server | Process that exposes tools, resources, prompts |
| Tool | Model-controlled function the AI can call |
| Resource | Application-controlled data the AI can read |
| Prompt | User-controlled template for interactions |
| MRTR | Multi-Round-Trip Request — server asks user/host for more info mid-tool |
| Transport | Communication layer (stdio or Streamable HTTP) |
| Stateless Core | 2026-07-28 revision removing protocol-level sessions |
| OAuth 2.1 | Authorization framework for remote MCP servers |
| AAIF | Agentic AI Foundation — governs MCP standard |
| AGENTS.md | Standard for AI coding agent configuration |
| AgentGateway | AAIF gateway/proxy for agent/MCP traffic |
| SEP | Specification Enhancement Proposal — how MCP evolves |
| Inspector | Official MCP debugging tool |
| Extension | Optional opt-in feature (both sides must enable) |
| MCPB | MCP Bundle — local server packaged with runtime |
`;
    return {
      contents: [{ uri: 'mcpa://glossary', mimeType: 'text/markdown', text: glossary }]
    };
  }
);

// ==================== PROMPTS ====================

/**
 * Prompt: teach-concept
 * Template for teaching an MCP concept
 */
server.prompt(
  'teach-concept',
  'Teach an MCP concept with explanation, examples, and common pitfalls',
  { concept: z.string().describe('MCP concept to teach (e.g., "tools", "MRTR", "OAuth flow")') },
  async ({ concept }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Explain the MCP concept "${concept}" in detail. Include:
1. What it is and why it matters
2. How it works (step by step if applicable)
3. Real-world analogy
4. Common exam pitfalls/traps
5. A quick quiz question to test understanding`
      }
    }]
  })
);

/**
 * Prompt: compare
 * Template for comparing two MCP concepts
 */
server.prompt(
  'compare',
  'Compare two MCP concepts — similarities, differences, and when to use each',
  { 
    topic_a: z.string().describe('First concept (e.g., "tools")'),
    topic_b: z.string().describe('Second concept (e.g., "resources")')
  },
  async ({ topic_a, topic_b }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Compare "${topic_a}" and "${topic_b}" in the context of MCP:
1. What each one is
2. Key similarities
3. Key differences
4. When to use each
5. Common confusion points on the exam`
      }
    }]
  })
);

// ==================== SERVER START ====================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCPA Teaching Bot MCP server running on stdio');
}

main().catch(err => {
  console.error('Failed to start MCP server:', err);
  process.exit(1);
});
