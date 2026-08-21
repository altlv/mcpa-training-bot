/**
 * Chat Service
 * Teaching assistant that explains MCP concepts using cheat sheet + question data
 * 
 * No AI dependency — pure rule-based search + template responses
 */

const fs = require('fs');
const path = require('path');
const questionService = require('./questionService');

// Load cheat sheet content
const cheatSheetPath = path.join(__dirname, '../../docs/learning-notes/EXAM-CHEAT-SHEET.md');
const cheatSheetContent = fs.readFileSync(cheatSheetPath, 'utf8');

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

    let response;

    // Route based on message type / content
    const msgLower = userMessage.toLowerCase().trim();

    if (ctx.questionId && (msgLower.includes('why') || msgLower.includes('correct') || msgLower.includes('answer'))) {
      // User is asking about the correct answer
      response = this.explainAnswer(ctx);
    } else if (msgLower.includes('concept') || msgLower.includes('what is') || msgLower.includes('what are') || msgLower.includes('test')) {
      // User is asking about the concept being tested
      response = this.identifyConcept(ctx);
    } else if (msgLower.includes('explain') || msgLower.includes('tell me') || msgLower.includes('how')) {
      // General explanation request — search cheat sheet
      response = this.searchAndExplain(userMessage, ctx);
    } else {
      // Default: search cheat sheet for the user's query
      response = this.searchAndExplain(userMessage, ctx);
    }

    // Add assistant response to history
    this.addMessage(sessionId, 'assistant', response.text);

    return {
      response: response.text,
      references: response.references || [],
      messageCount: this.getSession(sessionId).messages.length
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

    // Search cheat sheet for related content
    const tags = question.tags || [];
    const relatedSections = this.searchCheatSheet(tags.join(' '));
    if (relatedSections.length > 0) {
      text += `**Related concepts:**\n${relatedSections.slice(0, 2).map(s => `• ${s}`).join('\n')}`;
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
    const sections = this.searchCheatSheet(tags.join(' '));
    if (sections.length > 0) {
      text += `**Key points to remember:**\n${sections.slice(0, 3).map(s => `• ${s}`).join('\n')}\n\n`;
    }

    // Add exam context
    text += `**Exam tip:** This topic falls under the ${this.getDomainForTag(topic)} domain of the MCPA exam.`;

    return { text, references: tags };
  }

  /**
   * Search cheat sheet and explain based on user query
   */
  searchAndExplain(query, ctx) {
    const results = this.searchCheatSheet(query);

    let text = '';
    if (results.length > 0) {
      text = `**Here's what I found about "${query}":**\n\n`;
      text += results.slice(0, 3).map(r => `• ${r}`).join('\n\n');
    } else {
      text = `I couldn't find specific information about "${query}" in the cheat sheet. `;
      text += `Try asking about:\n`;
      text += `• **OAuth 2.1** — authentication flow\n`;
      text += `• **Tools vs Resources** — control model\n`;
      text += `• **MRTR** — multi-round-trip requests\n`;
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

    return { text, references: results.slice(0, 2) };
  }

  /**
   * Search cheat sheet content for relevant lines
   */
  searchCheatSheet(query) {
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

    // Deduplicate
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
