/**
 * Simple API Test
 */

const express = require('express');
const cors = require('cors');
const questionService = require('./src/services/questionService');
const quizRoutes = require('./src/routes/quiz');

const app = express();
app.use(cors());
app.use(express.json());

// Load questions first
questionService.loadQuestions();

// Mount routes
app.use('/api', quizRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', questions: questionService.getTotalCount() });
});

const server = app.listen(3000, () => {
  console.log('Server started');
  
  // Simple test
  const http = require('http');
  http.get('http://localhost:3000/api/health', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('Response:', data);
      server.close();
    });
  });
});
