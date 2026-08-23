#!/usr/bin/env node

/**
 * Build Spec Index
 * 
 * Fetches and indexes specification content from:
 * - https://www.jsonrpc.org/specification
 * - https://modelcontextprotocol.io/specification/2026-07-28
 * 
 * Usage: node scripts/build-spec-index.js
 */

const { SpecIndexer } = require('../src/services/specIndexer');
const path = require('path');

async function main() {
  console.log('🔧 Building specification index...\n');
  
  const indexer = new SpecIndexer(path.join(__dirname, '..'));
  const index = await indexer.buildIndex();
  
  console.log('\n📊 Summary:');
  console.log(`   Sources: ${index.sources.length}`);
  console.log(`   Chunks: ${index.chunks.length}`);
  console.log(`   Built: ${index.builtAt}`);
  
  // Show chunk distribution
  const bySource = {};
  for (const chunk of index.chunks) {
    bySource[chunk.meta.source] = (bySource[chunk.meta.source] || 0) + 1;
  }
  console.log('\n   By source:');
  for (const [source, count] of Object.entries(bySource)) {
    console.log(`     - ${source}: ${count} chunks`);
  }
}

main().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
