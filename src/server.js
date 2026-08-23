// src/server.js
// This is our Express server - the heart of our MCPA Training Bot!

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');
const questionService = require('./services/questionService');
const quizRoutes = require('./routes/quiz');
const chatRoutes = require('./routes/chat');
const modelRoutes = require('./routes/models');
const specRoutes = require('./routes/specs');
const modelConfig = require('./services/modelConfig');

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Load OpenAPI spec
const openapiPath = __dirname + '/../docs/openapi.yaml';
const openapiSpec = yaml.load(fs.readFileSync(openapiPath, 'utf8'));

// Middleware
app.use(cors()); // Enable CORS for frontend
app.use(express.json()); // Parse JSON bodies
app.use(express.static('public')); // Serve static files from public/

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MCPA Training Bot API Docs'
}));

// Load questions on startup
console.log('🚀 Starting MCPA Training Bot...\n');
const stats = questionService.loadQuestions();
console.log(`📊 Database: ${stats.totalQuestions} questions, ${stats.totalTags} tags\n`);

// Log model configuration
const modelInfo = modelConfig.getConfigSummary();
console.log(`🤖 Active AI provider: ${modelInfo.activeProvider} (${modelInfo.activeModel})`);
for (const p of modelInfo.providers) {
  console.log(`   ${p.name}: ${p.keyDefined ? '✅ key defined' : '❌ no key'} → ${p.model}`);
}
console.log('');

// Routes
app.use('/api', quizRoutes); // Mount quiz routes
app.use('/api/chat', chatRoutes); // Mount chat routes
app.use('/api/models', modelRoutes); // Mount model configuration routes
app.use('/api/specs', specRoutes); // Mount specification content routes

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'MCPA Training Bot API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      tags: '/api/tags',
      startQuiz: 'POST /api/quiz/start',
      submitQuiz: 'POST /api/quiz/submit',
      getQuestion: 'GET /api/questions/:id'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📚 API available at http://localhost:${PORT}/api`);
  console.log(`💡 Press Ctrl+C to stop\n`);
});
