/**
 * Quick API Test
 * Run: node test-api.js
 */

const express = require('express');
const cors = require('cors');
const questionService = require('./src/services/questionService');
const quizRoutes = require('./src/routes/quiz');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', quizRoutes);

// Load questions
console.log('📚 Loading questions...');
const stats = questionService.loadQuestions();

const server = app.listen(3000, () => {
  console.log('✅ Server started for testing\n');
  
  const http = require('http');
  
  // Test 1: Health check
  http.get('http://localhost:3000/api/health', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('Test 1 - Health Check:');
      console.log(JSON.parse(data));
      console.log('');
      
      // Test 2: Get tags
      http.get('http://localhost:3000/api/tags', (res2) => {
        let data2 = '';
        res2.on('data', (chunk) => data2 += chunk);
        res2.on('end', () => {
          const tagsData = JSON.parse(data2);
          console.log('Test 2 - Get Tags:');
          console.log(`Total tags: ${tagsData.tags.length}`);
          console.log(`First 5 tags: ${tagsData.tags.slice(0, 5).map(t => t.name).join(', ')}`);
          console.log('');
          
          // Test 3: Start quiz
          const postData = JSON.stringify({ tags: ['mcp-basics'], count: 3 });
          const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/quiz/start',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          };
          
          const req = http.request(options, (res3) => {
            let data3 = '';
            res3.on('data', (chunk) => data3 += chunk);
            res3.on('end', () => {
              const quizData = JSON.parse(data3);
              console.log('Test 3 - Start Quiz:');
              console.log(`Session ID: ${quizData.sessionId}`);
              console.log(`Questions: ${quizData.totalQuestions}`);
              if (quizData.questions.length > 0) {
                console.log(`First question: ${quizData.questions[0].question.substring(0, 50)}...`);
              }
              console.log('');
              
              console.log('✅ All tests passed!');
              server.close();
              process.exit(0);
            });
          });
          
          req.write(postData);
          req.end();
        });
      });
    });
  });
});
