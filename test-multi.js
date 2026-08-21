const http = require('http');

// Start quiz
const startBody = JSON.stringify({ tags: ['security'], count: 5 });

const startReq = http.request('http://localhost:3000/api/quiz/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const quiz = JSON.parse(data);
    console.log('Session:', quiz.sessionId);
    console.log('Questions:', quiz.questions.length);
    
    // Build answers (mix correct + wrong)
    const answers = {};
    quiz.questions.forEach(q => {
      if (q.type === 'multi_select') {
        // Pick first 2 options
        answers[q.id] = q.options.slice(0, 2).map(o => o.letter);
        console.log(`Multi: ${q.id} -> ${answers[q.id].join(',')} (${q.options.map(o => o.letter).join(',')})`);
      } else {
        answers[q.id] = q.options[0].letter;
        console.log(`Single: ${q.id} -> ${answers[q.id]}`);
      }
    });
    
    // Submit
    const submitBody = JSON.stringify({ sessionId: quiz.sessionId, answers });
    const submitReq = http.request('http://localhost:3000/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        const results = JSON.parse(data2);
        console.log('\n=== RESULTS ===');
        console.log(`Score: ${results.score}/${results.total} (${results.percentage}%)`);
        results.results.forEach(r => {
          console.log(`\n${r.questionId} [${r.type}] ${r.isCorrect ? '✓' : '✗'}`);
          console.log(`  Tags: ${(r.tags || []).join(', ')}`);
          console.log(`  Your answer: ${r.yourAnswer}`);
          console.log(`  Correct: ${r.correctAnswer}`);
        });
      });
    });
    submitReq.write(submitBody);
    submitReq.end();
  });
});
startReq.write(startBody);
startReq.end();
