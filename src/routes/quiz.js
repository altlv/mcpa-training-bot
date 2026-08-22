/**
 * Quiz Routes
 * API endpoints for quiz functionality
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const questionService = require('../services/questionService');

// In-memory quiz sessions (could use Redis/DB in production)
const quizSessions = new Map();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    questions: questionService.getTotalCount(),
    tags: questionService.getTags().length
  });
});

/**
 * GET /api/tags
 * Get all available tags with question counts
 */
router.get('/tags', (req, res) => {
  try {
    const tags = questionService.getTags();
    res.json({ 
      tags: tags,
      totalQuestions: questionService.getTotalCount()
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tags',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/quiz/start
 * Start a new quiz session
 * Body: { tags: ["security", "oauth"], count: 20 }
 */
router.post('/quiz/start', (req, res) => {
  try {
    const { tags, count } = req.body;

    // Validate tags
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        error: 'At least one tag must be selected',
        code: 'INVALID_TAGS'
      });
    }

    // Validate count
    const limit = count === 'all' || !count ? 0 : parseInt(count);
    if (isNaN(limit) || limit < 0) {
      return res.status(400).json({
        error: 'Invalid count value',
        code: 'INVALID_COUNT'
      });
    }

    // Get questions by tags
    let questions = questionService.getQuestionsByTags(tags, limit);
    
    if (questions.length === 0) {
      return res.status(404).json({
        error: 'No questions found for selected tags',
        code: 'NO_QUESTIONS',
        availableTags: questionService.getTags()
      });
    }

    // Prepare questions for quiz (standardize answers)
    const preparedQuestions = questionService.prepareQuizQuestions(questions);

    // Create session
    const sessionId = `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      questions: preparedQuestions,
      createdAt: new Date().toISOString(),
      submitted: false
    };
    quizSessions.set(sessionId, session);

    // Return questions — include correctAnswers only in training mode (for immediate feedback)
    const mode = req.body.mode || 'exam';
    const questionsForClient = preparedQuestions.map(q => {
      const clientQ = {
        id: q.id,
        chapter: q.chapter,
        chapterName: q.chapterName,
        type: q.type,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options, // Already shuffled
        tags: q.tags
      };
      if (mode === 'training') {
        clientQ.correctAnswers = q.correctAnswers;
      }
      return clientQ;
    });

    res.json({
      sessionId: sessionId,
      questions: questionsForClient,
      totalQuestions: questionsForClient.length
    });

  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({
      error: 'Failed to start quiz',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/quiz/submit
 * Submit quiz answers and get results
 * Body: { sessionId: "quiz_123", answers: { "ch1-q1": "A", "ch2-m1": ["A", "C"] } }
 */
router.post('/quiz/submit', (req, res) => {
  try {
    const { sessionId, answers } = req.body;

    // Validate session
    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required',
        code: 'MISSING_SESSION_ID'
      });
    }

    const session = quizSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Quiz session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    if (session.submitted) {
      return res.status(400).json({
        error: 'Quiz already submitted',
        code: 'ALREADY_SUBMITTED'
      });
    }

    // Validate answers
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        error: 'Answers object is required',
        code: 'MISSING_ANSWERS'
      });
    }

    // Mark session as submitted
    session.submitted = true;

    // Score answers
    const results = questionService.scoreAnswers(session.questions, answers);

    // Save results to file for MCP tools to read
    const resultsDir = path.join(__dirname, '../data/results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    const resultFile = {
      sessionId,
      timestamp: new Date().toISOString(),
      tags: session.questions.flatMap(q => q.tags || []),
      totalQuestions: results.total,
      score: results.score,
      percentage: results.percentage,
      results: results.results.map(r => ({
        questionId: r.questionId,
        question: r.question,
        tags: r.tags,
        isCorrect: r.isCorrect,
        yourAnswer: r.yourAnswer,
        correctAnswer: r.correctAnswer
      }))
    };
    fs.writeFileSync(
      path.join(resultsDir, `quiz_${Date.now()}.json`),
      JSON.stringify(resultFile, null, 2)
    );

    res.json(results);

  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({
      error: 'Failed to submit quiz',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/questions/:id
 * Get a single question by ID (for review)
 */
router.get('/questions/:id', (req, res) => {
  try {
    const question = questionService.getQuestionById(req.params.id);
    
    if (!question) {
      return res.status(404).json({
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    res.json({ question });

  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({
      error: 'Failed to fetch question',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
