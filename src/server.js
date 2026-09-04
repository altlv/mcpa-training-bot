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
const examRoutes = require('./routes/exam');
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
app.use('/api', examRoutes); // Mount practice exam routes

// Root route — landing page linking to all modes
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCPA Training Bot</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 80px auto; text-align: center; background: #f5f5f5; color: #333; }
    h1 { font-size: 2em; margin-bottom: 8px; }
    .subtitle { color: #666; margin-bottom: 32px; }
    .modes { display: flex; flex-direction: column; gap: 16px; }
    .mode-card { display: block; background: #fff; padding: 24px; border-radius: 12px; text-decoration: none; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,.08); transition: transform .15s, box-shadow .15s; }
    .mode-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,.12); }
    .mode-card h2 { margin: 0 0 6px; font-size: 1.2em; }
    .mode-card p { margin: 0; color: #666; font-size: .9em; }
    .mode-card .tag { display: inline-block; font-size: .75em; padding: 2px 8px; border-radius: 4px; margin-top: 8px; }
    .tag.exam { background: #e3f2fd; color: #1565c0; }
    .tag.training { background: #e8f5e9; color: #2e7d32; }
  </style>
</head>
<body>
  <h1>🎓 MCPA Training Bot</h1>
  <p class="subtitle">Model Context Protocol Associate — Exam Prep</p>
  <div class="modes">
    <a href="/exam.html" class="mode-card">
      <h2>📝 Practice Exam</h2>
      <p>60 questions · 90 min timer · Domain-weighted · Pass = 80%</p>
      <span class="tag exam">Simulates real exam</span>
    </a>
    <a href="/training.html" class="mode-card">
      <h2>📚 Training Mode</h2>
      <p>Study by topic · Instant feedback · AI tutor · Chat assistance</p>
      <span class="tag training">Learn & practice</span>
    </a>
  </div>
</body>
</html>`);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📚 API available at http://localhost:${PORT}/api`);
  console.log(`💡 Press Ctrl+C to stop\n`);
});
