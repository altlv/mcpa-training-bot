/**
 * Specs Routes
 * 
 * API endpoints for specification content management
 */

const express = require('express');
const router = express.Router();
const { SpecIndexer, SPEC_SOURCES } = require('../services/specIndexer');
const { SearchIndex } = require('../services/searchIndex');
const path = require('path');

const indexer = new SpecIndexer(path.join(__dirname, '../..'));

/**
 * GET /api/specs/status
 * Get specification index status
 */
router.get('/status', (req, res) => {
  const index = indexer.loadIndex();
  
  if (!index) {
    return res.json({
      built: false,
      sources: SPEC_SOURCES.map(s => ({
        id: s.id,
        name: s.name,
        url: s.url,
      })),
      message: 'Spec index not built. Run: npm run build:specs',
    });
  }

  // Count chunks by source
  const bySource = {};
  for (const chunk of index.chunks) {
    bySource[chunk.meta.source] = (bySource[chunk.meta.source] || 0) + 1;
  }

  res.json({
    built: true,
    builtAt: index.builtAt,
    totalChunks: index.chunks.length,
    sources: SPEC_SOURCES.map(s => ({
      id: s.id,
      name: s.name,
      url: s.url,
      chunks: bySource[s.id] || 0,
    })),
  });
});

/**
 * POST /api/specs/build
 * Build/rebuild the specification index
 */
router.post('/build', async (req, res) => {
  try {
    console.log('🔨 Building spec index via API...');
    const index = await indexer.buildIndex();
    
    // Also rebuild the main search index
    const searchIndex = new SearchIndex(path.join(__dirname, '../..'));
    searchIndex.build().save();
    
    res.json({
      success: true,
      totalChunks: index.chunks.length,
      builtAt: index.builtAt,
      message: 'Spec index built and search index updated',
    });
  } catch (error) {
    console.error('❌ Spec build failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/specs/search
 * Search specification content
 */
router.get('/search', (req, res) => {
  const { q, limit = 5 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const searchIndex = new SearchIndex(path.join(__dirname, '../..'));
  searchIndex.load();
  
  const results = searchIndex.search(q, parseInt(limit), { type: 'spec' });
  
  res.json({
    query: q,
    results: results.map(r => ({
      id: r.doc.id,
      source: r.doc.meta.sourceName || r.doc.meta.source,
      section: r.doc.meta.section,
      chunk: r.doc.chunk.substring(0, 500),
      url: r.doc.meta.url,
      score: r.score,
    })),
  });
});

module.exports = router;
