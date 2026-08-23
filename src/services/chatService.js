/**
 * Chat Service
 * Teaching assistant that explains MCP concepts using cheat sheet + question data
 * 
 * Hybrid approach: AI-powered responses when a provider key is available,
 * falling back to BM25 search + template responses otherwise.
 */

const fs = require('fs');
const path = require('path');
const questionService = require('./questionService');
const { SearchIndex } = require('./searchIndex');

// Load cheat sheet content
const cheatSheetPath = path.join(__dirname, '../../docs/learning-notes/EXAM-CHEAT-SHEET.md');
const cheatSheetContent = fs.readFileSync(cheatSheetPath, 'utf8');

// Load BM25 search index
const searchIndex = new SearchIndex(path.join(__dirname, '../..'));
searchIndex.load();

// Lazy-load model config and OpenAI client
let modelConfig = null;
let aiClient = null;

function ensureModelConfig() {
  if (!modelConfig) {
    try {
      modelConfig = require('./modelConfig');
    } catch (_) { /* model config not available */ }
  }
  return modelConfig;
}

function getAIClient() {
  const config = ensureModelConfig();
  if (!config) return null;
  try {
    if (!aiClient) {
      aiClient = config.createClient();
    }
    return aiClient;
  } catch (_) {
    return null;
  }
}

// System prompt for the AI teaching assistant
const SYSTEM_PROMPT = `You are a friendly, knowledgeable MCPA (Model Context Protocol Associate) exam tutor.

Your role:
- Help students understand MCP (Model Context Protocol) concepts
- Explain why answers are correct or incorrect
- Provide clear, concise explanations suitable for exam preparation
- Reference official MCP specification concepts when relevant
- Be encouraging but accurate

Key MCP domains:
- Security & Governance (24%) — OAuth 2.1, authentication, authorization, attack patterns
- Interactions & Execution (26%) — Tools, Resources, Prompts, control model
- MCP Fundamentals (16%) — Protocol basics, capabilities, lifecycle
- Architecture & Components (14%) — Transport (stdio, Streamable HTTP), server/client architecture
- Use Cases & Ecosystem (20%) — Inspector, registry, extensions, real-world applications

Keep responses concise (2-4 paragraphs max) unless the student asks for more detail.`;

class ChatService {
  constructor() {
    // Chat sessions: sessionId -> { messages: [], context: {} }
    this.sessions = new Map();
    this.MAX_MESSAGES = 10;
  }

  /**
   * Get or create a chat session
   */
  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, { messages: [], context: {} });
    }
    return this.sessions.get(sessionId);
  }

  /**
   * Update the current question context for a session
   */
  setContext(sessionId, context) {
    const session = this.getSession(sessionId);
    session.context = context;
  }

  /**
   * Add a message to chat history
   */
  addMessage(sessionId, role, content) {
    const session = this.getSession(sessionId);
    session.messages.push({ role, content, timestamp: new Date().toISOString() });
    // Keep only last MAX_MESSAGES
    if (session.messages.length > this.MAX_MESSAGES) {
      session.messages = session.messages.slice(-this.MAX_MESSAGES);
    }
  }

  /**
   * Get chat history for a session
   */
  getHistory(sessionId) {
    const session = this.getSession(sessionId);
    return session.messages;
  }

  /**
   * Process a user message and return a teaching response
   */
  async processMessage(sessionId, userMessage) {
    const session = this.getSession(sessionId);
    const ctx = session.context || {};

    // Add user message to history
    this.addMessage(sessionId, 'user', userMessage);

    // Try AI-powered response first
    const aiResponse = await this.tryAIResponse(sessionId, userMessage, ctx);
    if (aiResponse) {
      this.addMessage(sessionId, 'assistant', aiResponse.text);
      return {
        response: aiResponse.text,
        references: aiResponse.references || [],
        messageCount: this.getSession(sessionId).messages.length
      };
    }

    // Fall back to BM25 search + templates
    let response;
    const msgLower = userMessage.toLowerCase().trim();

    if (ctx.questionId && (msgLower.includes('why') || msgLower.includes('correct') || msgLower.includes('answer'))) {
      response = this.explainAnswer(ctx);
    } else if (msgLower.includes('concept') || msgLower.includes('what is') || msgLower.includes('what are') || msgLower.includes('test')) {
      response = this.identifyConcept(ctx);
    } else if (msgLower.includes('explain') || msgLower.includes('tell me') || msgLower.includes('how')) {
      response = this.searchAndExplain(userMessage, ctx);
    } else {
      response = this.searchAndExplain(userMessage, ctx);
    }

    this.addMessage(sessionId, 'assistant', response.text);

    return {
      response: response.text,
      references: response.references || [],
      messageCount: this.getSession(sessionId).messages.length
    };
  }

  /**
   * Try to get an AI-powered response from the configured provider.
   * Returns null if no AI is available (falls back to BM25).
   * Uses a timeout to avoid hanging when the provider is unreachable.
   */
  async tryAIResponse(sessionId, userMessage, ctx) {
    const ai = getAIClient();
    if (!ai) return null;

    try {
      // Build context-enriched messages
      const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

      // Add question context if available
      if (ctx.questionId) {
        const question = questionService.getQuestionById(ctx.questionId);
        if (question) {
          const contextBlock = [
            `Current question: ${question.question}`,
            `Options: ${question.options.map(o => `${o.letter}) ${o.text}`).join(', ')}`,
            `Correct answer: ${Array.isArray(question.correctAnswers) ? question.correctAnswers.join(', ') : question.correctAnswers}`,
            `Tags: ${(question.tags || []).join(', ')}`,
            question.explanation ? `Explanation: ${question.explanation}` : '',
          ].filter(Boolean).join('\n');

          messages.push({ role: 'system', content: `Question context:\n${contextBlock}` });

          // Add answer context if provided
          if (ctx.userAnswer !== undefined) {
            const answerCtx = [
              `Student's answer: ${ctx.userAnswer}`,
              `Correct answer: ${ctx.correctAnswer}`,
              ctx.isCorrect === true ? 'Student answered correctly.' : 'Student answered incorrectly.',
            ].join('\n');
            messages.push({ role: 'system', content: answerCtx });
          }
        }
      }

      // Add recent chat history for continuity
      const history = this.getHistory(sessionId);
      for (const msg of history.slice(-6)) { // last 3 exchanges
        messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
      }

      // Add current user message
      messages.push({ role: 'user', content: userMessage });

      // Use a timeout to avoid hanging when the provider is unreachable
      const TIMEOUT_MS = 8000;
      const responsePromise = ai.client.chat.completions.create({
        model: ai.model,
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI request timed out')), TIMEOUT_MS)
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);

      const text = response.choices?.[0]?.message?.content;
      if (!text) return null;

      // Extract references from context
      const references = ctx.questionId
        ? (questionService.getQuestionById(ctx.questionId)?.tags || [])
        : [];

      return { text, references };
    } catch (error) {
      console.error('AI response error (falling back to BM25):', error.message);
      // Reset client so next request tries again (provider might recover)
      aiClient = null;
      return null;
    }
  }

  /**
   * Get the current AI provider status (for frontend display)
   */
  getProviderInfo() {
    const config = ensureModelConfig();
    if (!config) return { available: false, provider: 'none', model: null };
    const provider = config.getActiveProvider();
    return {
      available: true,
      provider,
      model: config.getModelForProvider(provider),
      providerName: config.PROVIDERS[provider]?.name || provider,
    };
  }

  /**
   * Explain why a specific answer is correct
   */
  explainAnswer(ctx) {
    const question = questionService.getQuestionById(ctx.questionId);
    if (!question) {
      return { text: "I don't have details about this question. Could you describe what you're asking about?", references: [] };
    }

    const correctAnswer = ctx.correctAnswer;
    const userAnswer = ctx.userAnswer;
    const isCorrect = ctx.isCorrect;

    // Get the correct option text
    let correctOptionText = '';
    if (question.answer && question.options) {
      const opt = question.options.find(o => o.letter === question.answer);
      correctOptionText = opt ? opt.text : question.answer;
    } else if (question.answers && question.options) {
      correctOptionText = question.answers
        .map(a => { const opt = question.options.find(o => o.letter === a); return opt ? opt.text : a; })
        .join(', ');
    }

    // Build explanation
    let text = '';
    if (isCorrect) {
      text = `✅ **Correct!** `;
    } else {
      text = `❌ **Not quite.** `;
      if (userAnswer) {
        text += `You answered "${userAnswer}", but `;
      }
      text += `the correct answer is **${correctAnswer}**: ${correctOptionText}\n\n`;
    }

    // Add the question's built-in explanation
    if (question.explanation) {
      text += `**Explanation:** ${question.explanation}\n\n`;
    }

    // Search for related content using BM25
    const tags = question.tags || [];
    const searchQuery = tags.join(' ');
    const relatedResults = searchIndex.search(searchQuery, 5);
    if (relatedResults.length > 0) {
      text += `**Related concepts:**\n`;
      for (const hit of relatedResults.slice(0, 2)) {
        if (hit.doc.type === 'cheat-sheet') {
          const preview = hit.doc.chunk.substring(0, 200).replace(/\n/g, ' ').replace(/#+\s*/g, '');
          text += `• ${hit.doc.meta.section}: ${preview}\n`;
        }
      }
    }

    return { text, references: tags };
  }

  /**
   * Identify what concept the question is testing
   */
  identifyConcept(ctx) {
    const question = questionService.getQuestionById(ctx.questionId);
    if (!question) {
      return { text: "Could you describe the topic you're interested in?", references: [] };
    }

    const tags = question.tags || [];
    const topic = tags[0] || 'this topic';

    let text = `**This question tests:** ${tags.join(', ')}\n\n`;

    // Get relevant cheat sheet section
    const sections = this.searchCheatSheetLegacy(tags.join(' '));
    if (sections.length > 0) {
      text += `**Key points to remember:**\n${sections.slice(0, 3).map(s => `• ${s}`).join('\n')}\n\n`;
    }

    // Add exam context
    text += `**Exam tip:** This topic falls under the ${this.getDomainForTag(topic)} domain of the MCPA exam.`;

    return { text, references: tags };
  }

  /**
   * Search cheat sheet, learning materials, and specs using BM25 index
   */
  searchAndExplain(query, ctx) {
    // Use BM25 search for high-quality results
    const bm25Results = searchIndex.search(query, 10);

    // Also do old-style cheat sheet search for broad coverage
    const legacyResults = this.searchCheatSheetLegacy(query);

    let text = '';
    if (bm25Results.length > 0) {
      text = `**Here's what I found about "${query}":**\n\n`;

      // Group by type for clean presentation
      const specHits = bm25Results.filter(r => r.doc.type === 'spec');
      const cheatHits = bm25Results.filter(r => r.doc.type === 'cheat-sheet');
      const questionHits = bm25Results.filter(r => r.doc.type === 'question');
      const noteHits = bm25Results.filter(r => r.doc.type === 'learning-note');

      // Specification content (highest priority for unexpected questions)
      if (specHits.length > 0) {
        text += `**📖 From Official Specifications:**\n\n`;
        for (const hit of specHits.slice(0, 3)) {
          const meta = hit.doc.meta;
          const preview = hit.doc.chunk.substring(0, 400).replace(/\n/g, ' ').replace(/#+\s*/g, '');
          text += `• **${meta.sourceName || meta.source}** — ${meta.section}\n`;
          text += `  ${preview}...\n`;
          if (meta.url) {
            text += `  🔗 [Read more](${meta.url})\n`;
          }
          text += '\n';
        }
      }

      // Cheat sheet / learning note sections
      const conceptHits = [...cheatHits, ...noteHits];
      if (conceptHits.length > 0) {
        text += `**📋 From Study Materials:**\n\n`;
        for (const hit of conceptHits.slice(0, 2)) {
          const meta = hit.doc.meta;
          const section = meta.section || meta.source;
          const preview = hit.doc.chunk.substring(0, 250).replace(/\n/g, ' ').replace(/#+\s*/g, '');
          text += `• **${section}**: ${preview}...\n\n`;
        }
      }

      // Related questions (without answers for self-testing)
      if (questionHits.length > 0) {
        text += `**📝 Related questions to test yourself:**\n\n`;
        for (const hit of questionHits.slice(0, 2)) {
          const meta = hit.doc.meta;
          const opts = (meta.options || []).map(o => `  ${o.letter}) ${o.text}`).join('\n');
          text += `${meta.question}\n${opts}\n\n`;
        }
      }
    } else if (legacyResults.length > 0) {
      // Fallback to legacy search
      text = `**Here's what I found about "${query}":**\n\n`;
      text += legacyResults.slice(0, 3).map(r => `• ${r}`).join('\n\n');
    } else {
      text = `I couldn't find specific information about "${query}" in the knowledge base. `;
      text += `Try asking about:\n`;
      text += `• **JSON-RPC 2.0** — request/response format\n`;
      text += `• **MCP Protocol** — tools, resources, prompts\n`;
      text += `• **OAuth 2.1** — authentication flow\n`;
      text += `• **Transport** — stdio vs Streamable HTTP\n`;
      text += `• **Security** — attack patterns and mitigations`;
    }

    // If we have a question context, add relevance
    if (ctx.questionId) {
      const question = questionService.getQuestionById(ctx.questionId);
      if (question && question.tags) {
        text += `\n\n💡 **Tip:** This relates to your current question about **${question.tags.join(', ')}**.`;
      }
    }

    return { text, references: bm25Results.slice(0, 3).map(r => r.doc.meta.section || r.doc.type) };
  }

  /**
   * Legacy cheat sheet search (line-by-line keyword match)
   */
  searchCheatSheetLegacy(query) {
    const lines = cheatSheetContent.split('\n');
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const results = [];
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('## ') || line.startsWith('### ')) {
        currentSection = line.replace(/^#+\s*/, '');
      }
      const lineLower = line.toLowerCase();
      const matches = queryTerms.filter(term => lineLower.includes(term));
      if (matches.length >= 2 || (queryTerms.length === 1 && matches.length === 1)) {
        if (line.trim().length > 10 && !line.startsWith('#')) {
          results.push(`**${currentSection}:** ${line.trim().substring(0, 200)}`);
        }
      }
    }

    return [...new Set(results)].slice(0, 5);
  }

  /**
   * Map a tag to its exam domain
   */
  getDomainForTag(tag) {
    const domainMap = {
      'security': 'Security & Governance (24%)',
      'oauth': 'Security & Governance (24%)',
      'tools': 'Interactions & Execution (26%)',
      'resources': 'Interactions & Execution (26%)',
      'prompts': 'Interactions & Execution (26%)',
      'mcp': 'MCP Fundamentals (16%)',
      'transport': 'Architecture & Components (14%)',
      'architecture': 'Architecture & Components (14%)',
      'inspector': 'Use Cases & Ecosystem (20%)',
      'extensions': 'Use Cases & Ecosystem (20%)',
      'registry': 'Use Cases & Ecosystem (20%)',
    };
    return domainMap[tag] || 'MCP Fundamentals (16%)';
  }
}

module.exports = new ChatService();
