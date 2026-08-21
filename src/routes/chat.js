/**
 * Chat Routes
 * Teaching assistant endpoints for training mode
 */

const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');
const questionService = require('../services/questionService');

/**
 * POST /api/chat
 * Send a message to the teaching assistant
 * Body: { sessionId, message, questionContext? }
 */
router.post('/', (req, res) => {
  try {
    const { sessionId, message, questionContext } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required',
        code: 'MISSING_SESSION_ID'
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message is required',
        code: 'MISSING_MESSAGE'
      });
    }

    // Update context if provided
    if (questionContext) {
      chatService.setContext(sessionId, questionContext);
    }

    // Process the message
    chatService.processMessage(sessionId, message.trim()).then(result => {
      res.json({
        response: result.response,
        references: result.references,
        messageCount: result.messageCount
      });
    }).catch(err => {
      console.error('Chat processing error:', err);
      res.status(500).json({
        error: 'Failed to process message',
        code: 'CHAT_ERROR'
      });
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Chat service error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/chat/context
 * Update the current question context for the teaching assistant
 * Body: { sessionId, questionId, userAnswer, correctAnswer, isCorrect }
 */
router.post('/context', (req, res) => {
  try {
    const { sessionId, questionId, userAnswer, correctAnswer, isCorrect } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required',
        code: 'MISSING_SESSION_ID'
      });
    }

    // Look up the full question data
    const question = questionService.getQuestionById(questionId);
    
    chatService.setContext(sessionId, {
      questionId,
      question: question?.question || '',
      tags: question?.tags || [],
      userAnswer,
      correctAnswer,
      isCorrect,
      explanation: question?.explanation || ''
    });

    // Generate a welcome message based on the answer
    const isCorrectBool = isCorrect === true || isCorrect === 'true';
    let autoMessage = '';
    if (isCorrectBool) {
      autoMessage = `✅ Great job! You got question ${questionId} right.`;
    } else {
      autoMessage = `❌ Not quite on ${questionId}. Ask me "why" to understand the correct answer.`;
    }

    chatService.addMessage(sessionId, 'assistant', autoMessage);

    res.json({
      success: true,
      autoMessage,
      context: {
        questionId,
        tags: question?.tags || [],
        isCorrect: isCorrectBool
      }
    });

  } catch (error) {
    console.error('Context update error:', error);
    res.status(500).json({
      error: 'Failed to update context',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/chat/action
 * Handle quick action buttons
 * Body: { sessionId, action: 'explain_answer' | 'identify_concept' }
 */
router.post('/action', (req, res) => {
  try {
    const { sessionId, action } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required',
        code: 'MISSING_SESSION_ID'
      });
    }

    let userMessage = '';
    switch (action) {
      case 'explain_answer':
        userMessage = 'Why is this the correct answer?';
        break;
      case 'identify_concept':
        userMessage = 'What concept is this question testing?';
        break;
      default:
        return res.status(400).json({
          error: 'Invalid action. Use: explain_answer, identify_concept',
          code: 'INVALID_ACTION'
        });
    }

    chatService.processMessage(sessionId, userMessage).then(result => {
      res.json({
        response: result.response,
        references: result.references,
        messageCount: result.messageCount
      });
    }).catch(err => {
      console.error('Action processing error:', err);
      res.status(500).json({
        error: 'Failed to process action',
        code: 'CHAT_ERROR'
      });
    });

  } catch (error) {
    console.error('Action error:', error);
    res.status(500).json({
      error: 'Action service error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/chat/history/:sessionId
 * Get chat history for a session
 */
router.get('/history/:sessionId', (req, res) => {
  try {
    const history = chatService.getHistory(req.params.sessionId);
    res.json({ messages: history });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      error: 'Failed to get history',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
