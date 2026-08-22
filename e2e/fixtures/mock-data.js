/**
 * Mock API data for deterministic E2E tests.
 * Ensures we always get a single-select question first, or a multi-select question first.
 */

/** Mock tags response */
const mockTags = {
  tags: [
    { name: 'aaif', count: 12 },
    { name: 'auth', count: 8 },
    { name: 'data-model', count: 15 },
    { name: 'security', count: 20 },
    { name: 'tool-use', count: 10 },
  ],
  totalQuestions: 65,
};

/** Single-select quiz: first question is radio (single answer) */
const mockQuizSingleFirst = {
  sessionId: 'test_single_session',
  totalQuestions: 3,
  questions: [
    {
      id: 'single-q1',
      chapter: 'auth',
      chapterName: 'Authentication',
      type: 'single',
      difficulty: 'easy',
      question: 'What does MCP stand for in this context?',
      options: [
        { letter: 'A', text: 'Model Context Protocol' },
        { letter: 'B', text: 'Master Control Program' },
        { letter: 'C', text: 'Multi Channel Processing' },
        { letter: 'D', text: 'Machine Code Parser' },
      ],
      tags: ['auth', 'security'],
      correctAnswers: ['A'],
    },
    {
      id: 'single-q2',
      chapter: 'security',
      chapterName: 'Security',
      type: 'single',
      difficulty: 'medium',
      question: 'Which protocol is used for secure authentication?',
      options: [
        { letter: 'A', text: 'HTTP' },
        { letter: 'B', text: 'OAuth 2.0' },
        { letter: 'C', text: 'FTP' },
        { letter: 'D', text: 'SMTP' },
      ],
      tags: ['security'],
      correctAnswers: ['B'],
    },
    {
      id: 'single-q3',
      chapter: 'data-model',
      chapterName: 'Data Model',
      type: 'single',
      difficulty: 'easy',
      question: 'What format does JSON use?',
      options: [
        { letter: 'A', text: 'Key-value pairs' },
        { letter: 'B', text: 'Tags only' },
        { letter: 'C', text: 'Binary' },
        { letter: 'D', text: 'Plain text' },
      ],
      tags: ['data-model'],
      correctAnswers: ['A'],
    },
  ],
};

/** Multi-select quiz: first question is checkbox (multiple answers) */
const mockQuizMultiFirst = {
  sessionId: 'test_multi_session',
  totalQuestions: 2,
  questions: [
    {
      id: 'multi-q1',
      chapter: 'security',
      chapterName: 'Security',
      type: 'multi',
      difficulty: 'medium',
      question: 'Which of the following are valid authentication methods?',
      options: [
        { letter: 'A', text: 'API Key' },
        { letter: 'B', text: 'OAuth 2.0' },
        { letter: 'C', text: 'Plaintext password in URL' },
        { letter: 'D', text: 'JWT Token' },
      ],
      tags: ['security', 'auth'],
      correctAnswers: ['A', 'B', 'D'],
    },
    {
      id: 'multi-q2',
      chapter: 'tool-use',
      chapterName: 'Tool Use',
      type: 'multi',
      difficulty: 'hard',
      question: 'Which are valid MCP transport types?',
      options: [
        { letter: 'A', text: 'stdio' },
        { letter: 'B', text: 'HTTP+SSE' },
        { letter: 'C', text: 'WebSocket' },
        { letter: 'D', text: 'gRPC' },
      ],
      tags: ['tool-use'],
      correctAnswers: ['A', 'B'],
    },
  ],
};

/** Submit response (scored results) */
function buildSubmitResponse(questions, answers) {
  let score = 0;
  const results = questions.map((q) => {
    const userAns = answers[q.id] || '';
    const correctSorted = [...q.correctAnswers].sort().join(',');
    const userSorted = Array.isArray(userAns)
      ? [...userAns].sort().join(',')
      : userAns;
    const isCorrect = correctSorted === userSorted;
    if (isCorrect) score++;
    return {
      questionId: q.id,
      question: q.question,
      type: q.type,
      tags: q.tags,
      isCorrect,
      yourAnswer: userAns,
      correctAnswer: q.correctAnswers.length === 1 ? q.correctAnswers[0] : q.correctAnswers,
      explanation: `Explanation for ${q.id}`,
      options: q.options.map((o) => ({
        letter: o.letter,
        text: o.text,
        isCorrect: q.correctAnswers.includes(o.letter),
      })),
    };
  });
  return {
    score,
    total: questions.length,
    percentage: Math.round((score / questions.length) * 100),
    results,
  };
}

export {
  mockTags,
  mockQuizSingleFirst,
  mockQuizMultiFirst,
  buildSubmitResponse,
};
