const http = require('http');

function post(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testQuiz() {
  console.log('=== Testing Quiz Flow After Fix ===\n');
  
  const startResult = await post('/api/quiz/start', { tags: ['control-model'], count: 3 });
  
  if (!startResult.data.sessionId) {
    console.log('Failed to start quiz:', startResult.data);
    return;
  }
  
  console.log('Session started:', startResult.data.sessionId);
  console.log('Questions:');
  startResult.data.questions.forEach((q, i) => {
    console.log((i+1) + '. ' + q.id);
    console.log('   ' + q.question.substring(0, 60) + '...');
    console.log('   Options:');
    q.options.forEach(o => {
      console.log('     ' + o.letter + ') ' + o.text.substring(0, 50));
    });
    console.log('');
  });
  
  console.log('Note: Correct answers are NOT shown (anti-cheat)\n');
  
  console.log('Submitting answers (always picking A)...');
  const answers = {};
  startResult.data.questions.forEach(q => {
    answers[q.id] = 'A';
  });
  console.log('Answers:', answers);
  console.log('');
  
  const submitResult = await post('/api/quiz/submit', {
    sessionId: startResult.data.sessionId,
    answers
  });
  
  console.log('Submit result:');
  console.log('  Score:', submitResult.data.score + '/' + submitResult.data.total);
  console.log('  Percentage:', submitResult.data.percentage + '%');
  
  if (submitResult.data.results) {
    submitResult.data.results.forEach((r, i) => {
      console.log('');
      console.log('  Question ' + (i+1) + ':');
      console.log('    Your answer:', r.yourAnswer);
      console.log('    Correct:', r.correctAnswer);
      console.log('    Is correct:', r.isCorrect);
    });
  }
}

testQuiz().catch(console.error);
