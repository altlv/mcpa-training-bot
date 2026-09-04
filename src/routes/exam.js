/**
 * Practice Exam Routes
 * 
 * Simulates the real MCPA exam:
 * - 60 questions
 * - 90-minute timer
 * - Domain-weighted selection (26/24/20/16/14)
 * - Domain-scored results
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const questionService = require('../services/questionService');

// In-memory exam sessions
const examSessions = new Map();

/**
 * Exam domain definitions
 * Maps each domain to its chapter numbers and target weight
 */
const EXAM_DOMAINS = [
  {
    id: 'interactions',
    name: 'Interactions & Execution',
    weight: 0.26,
    chapters: [3, 4, 5, 6, 10],
    description: 'Server Features, Client Features, Building Servers, Client Best Practices, Debugging'
  },
  {
    id: 'security',
    name: 'Security & Governance',
    weight: 0.24,
    chapters: [7, 8, 15, 16],
    description: 'Authorization, Security, Lifecycle/Changelog, Governance & Security Policy'
  },
  {
    id: 'ecosystem',
    name: 'Use Cases & Ecosystem',
    weight: 0.20,
    chapters: [9, 13, 14],
    description: 'Inspector, Extensions, Registry'
  },
  {
    id: 'fundamentals',
    name: 'MCP Fundamentals',
    weight: 0.16,
    chapters: [1],
    description: 'MCP Basics and Introduction'
  },
  {
    id: 'architecture',
    name: 'Architecture & Components',
    weight: 0.14,
    chapters: [2, 11, 12],
    description: 'Architecture, JSON-RPC, Transports'
  }
];

const EXAM_TOTAL_QUESTIONS = 60;
const EXAM_TIME_MINUTES = 90;

/**
 * Get chapter number from question ID (fallback for questions missing chapter field)
 * e.g., "ch3-q25" → 3, "ch3-m10" → 3
 */
function chapterFromId(id) {
  const match = id.match(/^ch(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Get the chapter for a question (field or ID-based fallback)
 */
function getChapter(q) {
  return q.chapter || chapterFromId(q.id) || 0;
}

/**
 * Weighted Fisher-Yates shuffle (for domain-specific question selection)
 * Picks `count` random items from `arr`
 */
function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

/**
 * POST /api/exam/start
 * Start a new practice exam session
 * 
 * Returns 60 questions with domain-weighted distribution.
 * Each question includes its domain metadata for scoring.
 */
router.post('/exam/start', (req, res) => {
  try {
    if (!questionService.loaded) {
      questionService.loadQuestions();
    }

    const allQuestions = questionService.getAllQuestions();
    const totalAvailable = allQuestions.length;

    // Calculate target count per domain (proportional to weight)
    let selectedQuestions = [];
    const domainCounts = {};

    for (const domain of EXAM_DOMAINS) {
      const targetCount = Math.round(EXAM_TOTAL_QUESTIONS * domain.weight);
      
      // Get questions belonging to this domain's chapters
      const domainQuestions = allQuestions.filter(q => {
        const ch = getChapter(q);
        return domain.chapters.includes(ch);
      });

      // Pick random questions (may be fewer than target if pool is small)
      const picked = pickRandom(domainQuestions, targetCount);
      
      domainCounts[domain.id] = {
        target: targetCount,
        selected: picked.length,
        poolSize: domainQuestions.length
      };

      picked.forEach(q => {
        selectedQuestions.push({
          ...q,
          examDomain: domain.id,
          examDomainName: domain.name
        });
      });
    }

    // Deduplicate (a question could theoretically appear in multiple domains)
    const seen = new Set();
    selectedQuestions = selectedQuestions.filter(q => {
      if (seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });

    // If we have fewer than 60, pad from remaining questions
    if (selectedQuestions.length < EXAM_TOTAL_QUESTIONS) {
      const selectedIds = new Set(selectedQuestions.map(q => q.id));
      const remaining = allQuestions.filter(q => !selectedIds.has(q.id));
      const padding = pickRandom(remaining, EXAM_TOTAL_QUESTIONS - selectedQuestions.length);
      padding.forEach(q => {
        const ch = getChapter(q);
        const domain = EXAM_DOMAINS.find(d => d.chapters.includes(ch));
        selectedQuestions.push({
          ...q,
          examDomain: domain?.id || 'other',
          examDomainName: domain?.name || 'Other'
        });
      });
    }

    // Shuffle final selection
    selectedQuestions.sort(() => Math.random() - 0.5);

    // Prepare for client (strip answers)
    const preparedQuestions = selectedQuestions.map(q => ({
      id: q.id,
      chapter: getChapter(q),
      chapterName: q.chapterName,
      type: q.type,
      difficulty: q.difficulty,
      question: q.question,
      options: q.options.map(o => ({ letter: o.letter, text: q.options.find(o2 => o2.letter === o.letter)?.text || o.text })),
      tags: q.tags,
      examDomain: q.examDomain,
      examDomainName: q.examDomainName
    }));

    // Create session
    const sessionId = `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      questions: selectedQuestions.map(q => ({
        ...q,
        correctAnswers: q.answers || (q.answer ? [q.answer] : [])
      })),
      domainCounts,
      startedAt: new Date().toISOString(),
      timeLimitMinutes: EXAM_TIME_MINUTES,
      submitted: false
    };
    examSessions.set(sessionId, session);

    res.json({
      sessionId,
      questions: preparedQuestions,
      totalQuestions: preparedQuestions.length,
      timeLimitMinutes: EXAM_TIME_MINUTES,
      domains: EXAM_DOMAINS.map(d => ({
        id: d.id,
        name: d.name,
        weight: Math.round(d.weight * 100) + '%',
        selected: domainCounts[d.id]?.selected || 0,
        target: domainCounts[d.id]?.target || 0
      }))
    });

  } catch (error) {
    console.error('Error starting exam:', error);
    res.status(500).json({
      error: 'Failed to start exam',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/exam/submit
 * Submit exam answers and get domain-scored results
 * 
 * Body: { sessionId, answers: { questionId: "A" or ["A","C"] } }
 */
router.post('/exam/submit', (req, res) => {
  try {
    const { sessionId, answers } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required',
        code: 'MISSING_SESSION_ID'
      });
    }

    const session = examSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Exam session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    if (session.submitted) {
      return res.status(400).json({
        error: 'Exam already submitted',
        code: 'ALREADY_SUBMITTED'
      });
    }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        error: 'Answers object is required',
        code: 'MISSING_ANSWERS'
      });
    }

    session.submitted = true;

    // Calculate elapsed time
    const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
    const elapsedMinutes = Math.round(elapsedMs / 60000);
    const overtime = elapsedMinutes > EXAM_TIME_MINUTES;

    // Score each question and group by domain
    let correct = 0;
    const domainResults = {};
    const questionResults = [];

    EXAM_DOMAINS.forEach(d => {
      domainResults[d.id] = {
        name: d.name,
        weight: Math.round(d.weight * 100) + '%',
        correct: 0,
        total: 0,
        percentage: 0
      };
    });

    session.questions.forEach(q => {
      const userAnswer = answers[q.id];
      const correctAnswers = (q.correctAnswers || []).sort().join(',');
      const userAnswerStr = Array.isArray(userAnswer)
        ? userAnswer.sort().join(',')
        : (userAnswer || '');

      const isCorrect = correctAnswers === userAnswerStr;
      if (isCorrect) correct++;

      // Domain scoring
      const domainId = q.examDomain;
      if (domainResults[domainId]) {
        domainResults[domainId].total++;
        if (isCorrect) domainResults[domainId].correct++;
      }

      // Options with correctness markers
      const optionsWithMarkers = q.options.map(opt => ({
        letter: opt.letter,
        text: opt.text,
        isCorrect: correctAnswers.includes(opt.letter)
      }));

      questionResults.push({
        questionId: q.id,
        question: q.question,
        type: q.type,
        tags: q.tags || [],
        examDomain: domainId,
        examDomainName: q.examDomainName,
        yourAnswer: userAnswer,
        correctAnswer: q.correctAnswers.length === 1 ? q.correctAnswers[0] : q.correctAnswers,
        isCorrect,
        explanation: q.explanation,
        options: optionsWithMarkers
      });
    });

    // Calculate domain percentages
    Object.values(domainResults).forEach(d => {
      d.percentage = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
    });

    // Overall score
    const percentage = Math.round((correct / session.questions.length) * 100);

    // Build domain summary for weak area identification
    const domainSummary = Object.values(domainResults)
      .filter(d => d.total > 0)
      .sort((a, b) => a.percentage - b.percentage);

    // Save results to file
    const resultsDir = path.join(__dirname, '../../data/results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    const resultFile = {
      sessionId,
      type: 'practice-exam',
      timestamp: new Date().toISOString(),
      elapsedMinutes,
      overtime,
      totalQuestions: session.questions.length,
      score: correct,
      percentage,
      domainResults: Object.values(domainResults),
      questions: questionResults.map(r => ({
        questionId: r.questionId,
        tags: r.tags,
        examDomain: r.examDomain,
        isCorrect: r.isCorrect,
        yourAnswer: r.yourAnswer,
        correctAnswer: r.correctAnswer
      }))
    };
    fs.writeFileSync(
      path.join(resultsDir, `exam_${Date.now()}.json`),
      JSON.stringify(resultFile, null, 2)
    );

    res.json({
      score: correct,
      total: session.questions.length,
      percentage,
      elapsedMinutes,
      overtime,
      timeLimitMinutes: EXAM_TIME_MINUTES,
      passPercentage: 80,
      passed: percentage >= 80,
      domainResults: domainSummary,
      results: questionResults
    });

  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({
      error: 'Failed to submit exam',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/exam/domains
 * Get exam domain definitions (for UI display before starting)
 */
router.get('/exam/domains', (req, res) => {
  if (!questionService.loaded) {
    questionService.loadQuestions();
  }

  const allQuestions = questionService.getAllQuestions();

  const domains = EXAM_DOMAINS.map(d => {
    const poolSize = allQuestions.filter(q => {
      const ch = getChapter(q);
      return d.chapters.includes(ch);
    }).length;

    return {
      id: d.id,
      name: d.name,
      weight: Math.round(d.weight * 100) + '%',
      weightDecimal: d.weight,
      targetQuestions: Math.round(EXAM_TOTAL_QUESTIONS * d.weight),
      poolSize,
      chapters: d.chapters,
      description: d.description
    };
  });

  res.json({
    totalQuestions: EXAM_TOTAL_QUESTIONS,
    timeLimitMinutes: EXAM_TIME_MINUTES,
    passPercentage: 80,
    domains
  });
});

module.exports = router;
module.exports.EXAM_DOMAINS = EXAM_DOMAINS;
module.exports.EXAM_TOTAL_QUESTIONS = EXAM_TOTAL_QUESTIONS;
module.exports.EXAM_TIME_MINUTES = EXAM_TIME_MINUTES;
