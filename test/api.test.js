/**
 * API Tests — Fixed
 * Tests quiz API endpoints with meaningful assertions
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const BASE = 'http://localhost:3000';
let serverProcess = null;

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

async function startQuiz(tags, count) {
  const res = await request('POST', '/api/quiz/start', { tags, count });
  assert.strictEqual(res.status, 200, `Quiz setup failed: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.sessionId, 'Missing sessionId in response');
  assert.ok(Array.isArray(res.body.questions), 'Missing questions array');
  return res.body;
}

describe('Quiz API', () => {

  before(async () => {
    // Start server if not already running
    try {
      await new Promise((resolve, reject) => {
        http.get(BASE + '/api/health', (res) => {
          res.resume();
          resolve();
        }).on('error', reject);
      });
      // Server already running
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

  describe('GET /api/health', () => {
    it('should return status ok with question count', async () => {
      const res = await request('GET', '/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'ok');
      assert.ok(res.body.questions > 300, `Expected 300+ questions, got ${res.body.questions}`);
    });
  });

  describe('GET /api/tags', () => {
    it('should return tags with counts', async () => {
      const res = await request('GET', '/api/tags');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.tags));
      assert.ok(res.body.tags.length > 50, `Expected 50+ tags, got ${res.body.tags.length}`);
      assert.ok(res.body.tags[0].name);
      assert.ok(res.body.tags[0].count > 0);
    });
  });

  describe('GET /api/questions/:id', () => {
    it('should return a question by valid ID', async () => {
      const res = await request('GET', '/api/questions/ch7-q1');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.question, 'Missing question object');
      assert.strictEqual(res.body.question.id, 'ch7-q1');
      assert.ok(res.body.question.question, 'Missing question text');
      assert.ok(Array.isArray(res.body.question.options), 'Missing options');
      assert.ok(res.body.question.options.length >= 4, 'Should have 4+ options');
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request('GET', '/api/questions/nonexistent');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'QUESTION_NOT_FOUND');
    });
  });

  describe('POST /api/quiz/start', () => {
    it('should start a quiz with valid tags', async () => {
      const quiz = await startQuiz(['security'], 3);
      assert.strictEqual(quiz.questions.length, 3);
      for (const q of quiz.questions) {
        assert.ok(q.id, 'Question missing id');
        assert.ok(q.question, 'Question missing text');
        assert.ok(Array.isArray(q.options), 'Question missing options');
        assert.ok(q.options.length >= 4, `Question ${q.id} has ${q.options.length} options`);
      }
    });

    it('should NOT return correct answers', async () => {
      const quiz = await startQuiz(['oauth'], 2);
      for (const q of quiz.questions) {
        assert.strictEqual(q.answer, undefined, `Question ${q.id} leaked answer`);
        assert.strictEqual(q.answers, undefined, `Question ${q.id} leaked answers`);
        assert.strictEqual(q.explanation, undefined, `Question ${q.id} leaked explanation`);
        assert.strictEqual(q.correctAnswers, undefined, `Question ${q.id} leaked correctAnswers`);
      }
    });

    it('should require at least one tag', async () => {
      const res = await request('POST', '/api/quiz/start', { tags: [], count: 5 });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'INVALID_TAGS');
    });

    it('should require tags field', async () => {
      const res = await request('POST', '/api/quiz/start', { count: 5 });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'INVALID_TAGS');
    });

    it('should use default count when not provided', async () => {
      const res = await request('POST', '/api/quiz/start', { tags: ['security'] });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.questions.length > 0, 'Should return questions with default count');
    });
  });

  describe('POST /api/quiz/submit — Scoring Accuracy', () => {

    it('should score 100% with all correct answers', async () => {
      const quiz = await startQuiz(['tools'], 3);

      // Extract correct answers from the service
      const questionService = require('../src/services/questionService');
      questionService.loadQuestions();
      const raw = questionService.getQuestionsByTags(['tools'], 3);
      const prepared = questionService.prepareQuizQuestions(raw);

      // Build correct answer map matching quiz question IDs
      const answers = {};
      for (const q of quiz.questions) {
        const p = prepared.find(x => x.id === q.id);
        if (p && p.correctAnswers) {
          answers[q.id] = p.correctAnswers.length === 1
            ? p.correctAnswers[0]
            : p.correctAnswers;
        }
      }

      const res = await request('POST', '/api/quiz/submit', {
        sessionId: quiz.sessionId,
        answers
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.score, 3, 'Should score 3/3');
      assert.strictEqual(res.body.percentage, 100, 'Should be 100%');
      assert.strictEqual(res.body.total, 3);
    });

    it('should score 0% with all wrong answers', async () => {
      const quiz = await startQuiz(['security'], 2);

      // Use questionService to find correct answers, then pick wrong ones
      const questionService = require('../src/services/questionService');
      questionService.loadQuestions();
      const raw = questionService.getQuestionsByTags(['security'], 2);
      const prepared = questionService.prepareQuizQuestions(raw);

      const answers = {};
      for (const q of quiz.questions) {
        const p = prepared.find(x => x.id === q.id);
        if (p && p.correctAnswers && p.correctAnswers.length > 0) {
          // Find an option that is NOT in the correct answers
          const wrongOpt = q.options.find(o => !p.correctAnswers.includes(o.letter));
          answers[q.id] = wrongOpt ? wrongOpt.letter : q.options[q.options.length - 1].letter;
        } else {
          answers[q.id] = q.options[q.options.length - 1].letter;
        }
      }

      const res = await request('POST', '/api/quiz/submit', {
        sessionId: quiz.sessionId,
        answers
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.score, 0, 'Should score 0/2');
      assert.strictEqual(res.body.percentage, 0, 'Should be 0%');
    });

    it('should calculate percentage correctly for partial score', async () => {
      const quiz = await startQuiz(['fundamentals'], 3);

      const questionService = require('../src/services/questionService');
      const raw = questionService.getQuestionsByTags(['fundamentals'], 3);
      const prepared = questionService.prepareQuizQuestions(raw);

      // Answer only the first question correctly
      const answers = {};
      const firstQ = quiz.questions[0];
      const p = prepared.find(x => x.id === firstQ.id);
      if (p && p.correctAnswers) {
        answers[firstQ.id] = p.correctAnswers.length === 1
          ? p.correctAnswers[0]
          : p.correctAnswers;
      }

      const res = await request('POST', '/api/quiz/submit', {
        sessionId: quiz.sessionId,
        answers
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.score, 1, 'Should score 1/3');
      assert.strictEqual(res.body.percentage, 33, 'Should be 33%');
    });

    it('should handle unanswered questions as wrong', async () => {
      const quiz = await startQuiz(['tools'], 2);

      const res = await request('POST', '/api/quiz/submit', {
        sessionId: quiz.sessionId,
        answers: {}
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.score, 0, 'Unanswered = 0 correct');
      assert.strictEqual(res.body.percentage, 0);
    });

    it('should return results with question details', async () => {
      const quiz = await startQuiz(['security'], 2);

      const res = await request('POST', '/api/quiz/submit', {
        sessionId: quiz.sessionId,
        answers: {}
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.results));
      assert.strictEqual(res.body.results.length, 2);

      for (const r of res.body.results) {
        assert.ok(r.questionId, 'Missing questionId');
        assert.ok(r.question, 'Missing question text');
        assert.ok(typeof r.isCorrect === 'boolean', 'Missing isCorrect');
        assert.ok(Array.isArray(r.options), 'Missing options array');
        assert.ok(Array.isArray(r.tags), 'Missing tags');
      }
    });

    it('should reject missing sessionId', async () => {
      const res = await request('POST', '/api/quiz/submit', { answers: {} });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'MISSING_SESSION_ID');
    });

    it('should reject invalid session', async () => {
      const res = await request('POST', '/api/quiz/submit', {
        sessionId: 'nonexistent_session',
        answers: {}
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'SESSION_NOT_FOUND');
    });

    it('should reject duplicate submission', async () => {
      const quiz = await startQuiz(['oauth'], 2);

      // First submission
      const res1 = await request('POST', '/api/quiz/submit', {
        sessionId: quiz.sessionId,
        answers: {}
      });
      assert.strictEqual(res1.status, 200);

      // Duplicate submission
      const res2 = await request('POST', '/api/quiz/submit', {
        sessionId: quiz.sessionId,
        answers: {}
      });
      assert.strictEqual(res2.status, 400);
      assert.strictEqual(res2.body.code, 'ALREADY_SUBMITTED');
    });
  });

  describe('Question Service — Unit Tests', () => {
    const questionService = require('../src/services/questionService');

    before(() => {
      questionService.loadQuestions();
    });

    it('should load all questions', () => {
      assert.ok(questionService.getTotalCount() >= 300);
    });

    it('should return tags with counts', () => {
      const tags = questionService.getTags();
      assert.ok(tags.length > 50);
      assert.ok(tags[0].name);
      assert.ok(tags[0].count > 0);
    });

    it('should filter questions by tag', () => {
      const questions = questionService.getQuestionsByTags(['security'], 5);
      assert.ok(questions.length > 0);
      assert.ok(questions.length <= 5);
      for (const q of questions) {
        assert.ok(q.tags.includes('security'));
      }
    });

    it('should get question by ID', () => {
      const q = questionService.getQuestionById('ch7-q1');
      assert.ok(q, 'Should find ch7-q1');
      assert.strictEqual(q.id, 'ch7-q1');
    });

    it('should return null for unknown ID', () => {
      const q = questionService.getQuestionById('nonexistent');
      assert.strictEqual(q, null);
    });

    it('should prepare questions with correct answer tracking', () => {
      const questions = questionService.getQuestionsByTags(['tools'], 3);
      const prepared = questionService.prepareQuizQuestions(questions);

      for (const q of prepared) {
        assert.ok(q.correctAnswers.length > 0,
          `Question ${q.id}: no correct answer tracked after preparation`);
        // Verify correct letters match option letters
        for (const letter of q.correctAnswers) {
          const matchingOpt = q.options.find(o => o.letter === letter);
          assert.ok(matchingOpt,
            `Question ${q.id}: correct letter "${letter}" not in options`);
        }
      }
    });

    it('should score 100% with correct answers', () => {
      const questions = questionService.getQuestionsByTags(['tools'], 2);
      const prepared = questionService.prepareQuizQuestions(questions);

      const correctAnswers = {};
      for (const q of prepared) {
        correctAnswers[q.id] = q.correctAnswers.length === 1
          ? q.correctAnswers[0]
          : q.correctAnswers;
      }

      const results = questionService.scoreAnswers(prepared, correctAnswers);
      assert.strictEqual(results.score, 2, 'Should score 2/2');
      assert.strictEqual(results.total, 2);
      assert.strictEqual(results.percentage, 100);
    });

    it('should score 0% with wrong answers', () => {
      const questions = questionService.getQuestionsByTags(['tools'], 2);
      const prepared = questionService.prepareQuizQuestions(questions);

      const wrongAnswers = {};
      for (const q of prepared) {
        const wrongLetter = q.options[q.options.length - 1].letter;
        wrongAnswers[q.id] = wrongLetter;
      }

      const results = questionService.scoreAnswers(prepared, wrongAnswers);
      assert.strictEqual(results.score, 0, 'Should score 0/2');
      assert.strictEqual(results.percentage, 0);
    });

    it('should score multi-select correctly (order-independent)', () => {
      // Find a multi-select question
      const allQ = questionService.getQuestionsByTags(['tools'], 20);
      const multiQ = allQ.find(q => q.type === 'multi_select');
      if (!multiQ) return; // Skip if no multi-select found

      const prepared = questionService.prepareQuizQuestions([multiQ]);
      const q = prepared[0];

      // Correct answer in original order
      const res1 = questionService.scoreAnswers(prepared, {
        [q.id]: q.correctAnswers
      });
      assert.strictEqual(res1.score, 1, 'Correct order should score');

      // Correct answer in reversed order
      const reversed = [...q.correctAnswers].reverse();
      const res2 = questionService.scoreAnswers(prepared, {
        [q.id]: reversed
      });
      assert.strictEqual(res2.score, 1, 'Reversed order should still score');

      // Wrong answer
      const wrongLetters = q.options
        .filter(o => !q.correctAnswers.includes(o.letter))
        .slice(0, 2)
        .map(o => o.letter);
      const res3 = questionService.scoreAnswers(prepared, {
        [q.id]: wrongLetters
      });
      assert.strictEqual(res3.score, 0, 'Wrong answers should not score');
    });

    it('should handle empty answers (all unanswered)', () => {
      const questions = questionService.getQuestionsByTags(['tools'], 2);
      const prepared = questionService.prepareQuizQuestions(questions);

      const results = questionService.scoreAnswers(prepared, {});
      assert.strictEqual(results.score, 0);
      assert.strictEqual(results.percentage, 0);
      assert.strictEqual(results.total, 2);
    });

    it('should score multi-select partial correct (some right, some wrong)', () => {
      // Find a multi-select question with 3+ correct answers
      const allQ = questionService.getQuestionsByTags(['tools'], 30);
      const multiQ = allQ.find(q => q.type === 'multi_select' && q.answers && q.answers.length >= 3);
      if (!multiQ) return; // Skip if no suitable multi-select found

      const prepared = questionService.prepareQuizQuestions([multiQ]);
      const q = prepared[0];

      // Submit only some correct answers (partial)
      const partialAnswers = q.correctAnswers.slice(0, 2);
      const results = questionService.scoreAnswers(prepared, {
        [q.id]: partialAnswers
      });
      assert.strictEqual(results.score, 0, 'Partial multi-select should score 0 (all-or-nothing)');
      assert.strictEqual(results.percentage, 0);
    });

    it('getAllQuestions should return all loaded questions', () => {
      const all = questionService.getAllQuestions();
      assert.ok(Array.isArray(all), 'getAllQuestions should return array');
      assert.ok(all.length >= 300, `Expected 300+ questions, got ${all.length}`);
      // Should match total count
      assert.strictEqual(all.length, questionService.getTotalCount(),
        'getAllQuestions length should match getTotalCount');
    });
  });

  describe('Root Endpoint', () => {
    it('GET / should serve the quiz interface (HTML)', async () => {
      const res = await request('GET', '/');
      assert.strictEqual(res.status, 200);
      // Static middleware serves index.html for /
      const html = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
      assert.ok(html.includes('MCPA') || html.includes('mcpa'),
        'Root should serve the quiz interface HTML');
    });
  });

  describe('POST /api/quiz/start — Edge Cases', () => {
    it('count=0 should return all matching questions', async () => {
      const res = await request('POST', '/api/quiz/start', { tags: ['security'], count: 0 });
      assert.strictEqual(res.status, 200);
      // Should return all security questions (more than default)
      const qs = require('../src/services/questionService');
      const securityCount = qs.getQuestionsByTags(['security']).length;
      assert.strictEqual(res.body.questions.length, securityCount,
        `count=0 should return all ${securityCount} security questions`);
    });

    it('count="all" should return all matching questions', async () => {
      const res = await request('POST', '/api/quiz/start', { tags: ['tools'], count: 'all' });
      assert.strictEqual(res.status, 200);
      const qs = require('../src/services/questionService');
      const toolsCount = qs.getQuestionsByTags(['tools']).length;
      assert.strictEqual(res.body.questions.length, toolsCount,
        `count="all" should return all ${toolsCount} tools questions`);
    });

    it('negative count should return 400', async () => {
      const res = await request('POST', '/api/quiz/start', { tags: ['security'], count: -5 });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'INVALID_COUNT');
    });

    it('non-existent tag should return NO_QUESTIONS', async () => {
      const res = await request('POST', '/api/quiz/start', { tags: ['xyzzy_nonexistent_tag'] });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.code, 'NO_QUESTIONS');
    });

    it('should not leak isCorrect or correctAnswers in quiz questions', async () => {
      const quiz = await startQuiz(['security'], 3);
      for (const q of quiz.questions) {
        assert.strictEqual(q.isCorrect, undefined, `Question ${q.id} leaked isCorrect`);
        assert.strictEqual(q.correctAnswers, undefined, `Question ${q.id} leaked correctAnswers`);
        assert.strictEqual(q.correctAnswer, undefined, `Question ${q.id} leaked correctAnswer`);
        // Options should NOT have isCorrect markers
        for (const opt of (q.options || [])) {
          assert.strictEqual(opt.isCorrect, undefined,
            `Question ${q.id} option ${opt.letter} leaked isCorrect`);
        }
      }
    });
  });

  describe('POST /api/quiz/submit — Edge Cases', () => {
    it('should reject submit with missing answers field', async () => {
      const quiz = await startQuiz(['tools'], 2);
      const res = await request('POST', '/api/quiz/submit', {
        sessionId: quiz.sessionId
        // no answers field
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.code, 'MISSING_ANSWERS');
    });
  });
});
