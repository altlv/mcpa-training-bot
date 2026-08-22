#!/usr/bin/env node
/**
 * Build or rebuild the BM25 search index
 * 
 * Usage: node scripts/build-index.js
 * 
 * Reads all questions + learning materials and writes data/search-index.json
 */

const path = require('path');
const { SearchIndex } = require('../src/services/searchIndex');

const root = path.join(__dirname, '..');

console.log('Building search index...');
const index = new SearchIndex(root);
index.build();
index.save();

const stats = index.stats();
console.log(`Index built successfully!`);
console.log(`  Total documents: ${stats.total}`);
for (const [type, count] of Object.entries(stats.types)) {
  console.log(`  - ${type}: ${count}`);
}
console.log(`Saved to: data/search-index.json`);
