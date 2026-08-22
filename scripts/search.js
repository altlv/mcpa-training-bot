#!/usr/bin/env node
/**
 * CLI search utility for the question bank + learning materials
 * 
 * Usage:
 *   node scripts/search.js "OAuth flow"
 *   node scripts/search.js "MRTR retry" --type question
 *   node scripts/search.js "error codes" --top 5
 *   node scripts/search.js --stats
 */

const path = require('path');
const { SearchIndex } = require('../src/services/searchIndex');

const root = path.join(__dirname, '..');
const index = new SearchIndex(root);
index.load();

// Parse args
const args = process.argv.slice(2);
const statsFlag = args.includes('--stats');
const typeIdx = args.indexOf('--type');
const filterType = typeIdx >= 0 ? args[typeIdx + 1] : null;
const topIdx = args.indexOf('--top');
const topK = topIdx >= 0 ? parseInt(args[topIdx + 1]) || 10 : 10;
const query = args.filter(a => !a.startsWith('--')).join(' ');

if (statsFlag) {
  const stats = index.stats();
  console.log('Index stats:');
  console.log(`  Total documents: ${stats.total}`);
  for (const [type, count] of Object.entries(stats.types)) {
    console.log(`  - ${type}: ${count}`);
  }
  process.exit(0);
}

if (!query) {
  console.log('Usage: node scripts/search.js <query> [--type question|cheat-sheet|learning-note] [--top N] [--stats]');
  process.exit(1);
}

const filter = filterType ? { type: filterType } : {};
const results = index.search(query, topK, filter);

if (results.length === 0) {
  console.log(`No results for "${query}"`);
  process.exit(0);
}

console.log(`Results for "${query}" (${results.length} hits):\n`);

for (let i = 0; i < results.length; i++) {
  const { doc, score } = results[i];
  const meta = doc.meta || {};

  console.log(`─── #${i + 1} [${doc.type}] score=${score.toFixed(3)} ───`);

  if (doc.type === 'question') {
    console.log(`Q: ${meta.question}`);
    if (meta.options) {
      for (const opt of meta.options) {
        const marker = (meta.answer === opt.letter || (Array.isArray(meta.answer) && meta.answer.includes(opt.letter))) ? '✓' : ' ';
        console.log(`  ${marker} ${opt.letter}) ${opt.text}`);
      }
    }
    if (meta.tags) console.log(`Tags: ${meta.tags.join(', ')}`);
    if (meta.explanation) console.log(`Explanation: ${meta.explanation.substring(0, 120)}...`);
  } else {
    // Cheat sheet / learning note
    const preview = doc.chunk.substring(0, 200).replace(/\n/g, ' ');
    console.log(`Section: ${meta.section || '?'}`);
    console.log(`Source: ${meta.source || '?'}`);
    console.log(`Preview: ${preview}...`);
  }
  console.log('');
}
