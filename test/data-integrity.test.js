/**
 * Data Integrity Tests
 * Validates question bank structure, schema, and content quality
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const QUESTIONS_DIR = path.join(__dirname, '../data/questions');
const SCHEMA_PATH = path.join(__dirname, '../data/schemas/question.json');

describe('Question Bank Data Integrity', () => {
  
  describe('File Structure', () => {
    it('should have question files in data/questions/', () => {
      const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
      assert.ok(files.length > 0, 'No JSON files found in data/questions/');
    });

    it('should have both single and multi-select files for each chapter', () => {
      const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
      for (let ch = 1; ch <= 17; ch++) {
        const padded = ch.toString().padStart(2, '0');
        const prefix = `ch${padded}`;
        const single = files.find(f => f.startsWith(prefix) && !f.includes('-multi'));
        const multi = files.find(f => f.startsWith(prefix) && f.includes('-multi'));
        assert.ok(single, `Missing single-select file for chapter ${ch}`);
        assert.ok(multi, `Missing multi-select file for chapter ${ch}`);
      }
    });

    it('should have a schema file', () => {
      assert.ok(fs.existsSync(SCHEMA_PATH), 'Missing data/schemas/question.json');
    });
  });

  describe('Question Structure', () => {
    let allQuestions = [];

    before(() => {
      const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf8'));
        if (Array.isArray(data)) {
          allQuestions.push(...data);
        } else if (data.questions && Array.isArray(data.questions)) {
          allQuestions.push(...data.questions);
        }
      }
    });

    it('should have at least 300 questions total', () => {
      assert.ok(allQuestions.length >= 300, `Only ${allQuestions.length} questions found, expected 300+`);
    });

    it('every question should have required fields', () => {
      const errors = [];
      for (const q of allQuestions) {
        if (!q.id) errors.push(`Missing id: ${JSON.stringify(q).substring(0, 100)}`);
        if (!q.question || q.question.trim().length === 0) errors.push(`Missing/empty question text for ${q.id}`);
        if (!q.type) errors.push(`Missing type for ${q.id}`);
        if (!q.options || !Array.isArray(q.options)) errors.push(`Missing options array for ${q.id}`);
        if (!q.explanation || q.explanation.trim().length < 10) errors.push(`Missing/short explanation for ${q.id}`);
      }
      assert.strictEqual(errors.length, 0, `Structure errors:\n${errors.join('\n')}`);
    });

    it('every question should have valid type', () => {
      const validTypes = ['mcq', 'mcq-multi', 'multi_select', 'true-false', 'scenario'];
      const errors = [];
      for (const q of allQuestions) {
        if (!validTypes.includes(q.type)) {
          errors.push(`${q.id}: invalid type "${q.type}"`);
        }
      }
      assert.strictEqual(errors.length, 0, `Invalid types:\n${errors.join('\n')}`);
    });

    it('every question should have 4-6 options with letter labels', () => {
      const errors = [];
      for (const q of allQuestions) {
        if (!q.options) continue;
        if (q.options.length < 4 || q.options.length > 6) {
          errors.push(`${q.id}: ${q.options.length} options (expected 4-6)`);
        }
        for (const opt of q.options) {
          if (!opt.letter || !opt.text) {
            errors.push(`${q.id}: option missing letter or text`);
          }
        }
      }
      assert.strictEqual(errors.length, 0, `Option errors:\n${errors.join('\n')}`);
    });

    it('single-select questions should have exactly one answer', () => {
      const errors = [];
      for (const q of allQuestions) {
        if (q.type === 'mcq' || q.type === 'mcq-multi' || q.type === 'true-false') {
          if (!q.answer) {
            errors.push(`${q.id}: single-select missing answer`);
          }
          if (q.answers) {
            errors.push(`${q.id}: single-select should not have answers array`);
          }
        }
      }
      assert.strictEqual(errors.length, 0, `Single-select errors:\n${errors.join('\n')}`);
    });

    it('multi-select questions should have answers array', () => {
      const errors = [];
      for (const q of allQuestions) {
        if (q.type === 'multi_select') {
          if (!q.answers || !Array.isArray(q.answers) || q.answers.length < 2) {
            errors.push(`${q.id}: multi_select missing answers array`);
          }
          if (q.answer) {
            errors.push(`${q.id}: multi_select should not have single answer field`);
          }
        }
      }
      assert.strictEqual(errors.length, 0, `Multi-select errors:\n${errors.join('\n')}`);
    });

    it('answer letters should match option letters', () => {
      const errors = [];
      for (const q of allQuestions) {
        if (!q.options) continue;
        const validLetters = q.options.map(o => o.letter);
        
        if (q.answer && !validLetters.includes(q.answer)) {
          errors.push(`${q.id}: answer "${q.answer}" not in options [${validLetters}]`);
        }
        if (q.answers) {
          for (const a of q.answers) {
            if (!validLetters.includes(a)) {
              errors.push(`${q.id}: answers contains "${a}" not in options [${validLetters}]`);
            }
          }
        }
      }
      assert.strictEqual(errors.length, 0, `Letter mismatch errors:\n${errors.join('\n')}`);
    });

    it('every question should have tags', () => {
      const errors = [];
      for (const q of allQuestions) {
        if (!q.tags || !Array.isArray(q.tags) || q.tags.length === 0) {
          errors.push(`${q.id}: missing or empty tags`);
        }
      }
      assert.strictEqual(errors.length, 0, `Tag errors:\n${errors.join('\n')}`);
    });

    it('no duplicate question IDs within the same file', () => {
      const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
      const errors = [];
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf8'));
        const questions = Array.isArray(data) ? data : (data.questions || []);
        const ids = questions.map(q => q.id);
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        if (dupes.length > 0) {
          errors.push(`${file}: duplicate IDs: ${[...new Set(dupes)].join(', ')}`);
        }
      }
      assert.strictEqual(errors.length, 0, `Duplicate IDs found:\n${errors.join('\n')}`);
    });
  });

  describe('Data Quality', () => {
    let allQuestions = [];

    before(() => {
      const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf8'));
        if (Array.isArray(data)) {
          allQuestions.push(...data);
        } else if (data.questions && Array.isArray(data.questions)) {
          allQuestions.push(...data.questions);
        }
      }
    });

    it('no duplicate question text across different chapters', () => {
      const seen = new Map();
      const errors = [];
      for (const q of allQuestions) {
        const key = q.question?.toLowerCase().trim();
        if (!key) continue;
        if (seen.has(key)) {
          const prev = seen.get(key);
          // Only flag if different chapter (same chapter = single/multi pair, expected)
          if (q.chapter !== prev.chapter) {
            errors.push(`Cross-chapter duplicate: "${q.id}" (ch${q.chapter}) matches "${prev.id}" (ch${prev.chapter})`);
          }
        }
        seen.set(key, q);
      }
      assert.strictEqual(errors.length, 0, `Duplicate questions:\n${errors.join('\n')}`);
    });

    it('multi-select has at least 2 correct answers', () => {
      const errors = [];
      for (const q of allQuestions) {
        if (q.type === 'multi_select' && q.answers) {
          if (q.answers.length < 2) {
            errors.push(`${q.id}: multi_select with only ${q.answers.length} answer(s)`);
          }
        }
      }
      assert.strictEqual(errors.length, 0, `Multi-select answer count issues:\n${errors.join('\n')}`);
    });

    it('no option text is empty or whitespace', () => {
      const errors = [];
      for (const q of allQuestions) {
        if (!q.options) continue;
        for (const opt of q.options) {
          if (!opt.text || opt.text.trim().length === 0) {
            errors.push(`${q.id}: option ${opt.letter} has empty text`);
          }
        }
      }
      assert.strictEqual(errors.length, 0, `Empty option text:\n${errors.join('\n')}`);
    });

    it('question text is at least 10 characters', () => {
      const errors = [];
      for (const q of allQuestions) {
        if (q.question && q.question.trim().length < 10) {
          errors.push(`${q.id}: question too short (${q.question.trim().length} chars): "${q.question}"`);
        }
      }
      assert.strictEqual(errors.length, 0, `Short questions:\n${errors.join('\n')}`);
    });
  });

  describe('Explanation Quality', () => {
    let allQuestions = [];

    before(() => {
      const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf8'));
        if (Array.isArray(data)) {
          allQuestions.push(...data);
        } else if (data.questions && Array.isArray(data.questions)) {
          allQuestions.push(...data.questions);
        }
      }
    });

    it('every question has explanation >= 20 characters', () => {
      const errors = [];
      for (const q of allQuestions) {
        if (!q.explanation || q.explanation.trim().length < 20) {
          const len = q.explanation ? q.explanation.trim().length : 0;
          errors.push(`${q.id}: explanation too short (${len} chars): "${(q.explanation || '').substring(0, 50)}"`);
        }
      }
      assert.strictEqual(errors.length, 0, `Short explanations:\n${errors.join('\n')}`);
    });

    it('no explanation is just "placeholder" or "TODO"', () => {
      const placeholderPattern = /^(placeholder|todo|fixme|tbd|n\/a|lorem|test)\s*$/i;
      const errors = [];
      for (const q of allQuestions) {
        if (q.explanation && placeholderPattern.test(q.explanation.trim())) {
          errors.push(`${q.id}: explanation is placeholder: "${q.explanation}"`);
        }
      }
      assert.strictEqual(errors.length, 0, `Placeholder explanations:\n${errors.join('\n')}`);
    });

    it('explanation mentions the correct answer concept (basic check)', () => {
      const errors = [];
      for (const q of allQuestions) {
        if (!q.explanation) continue;

        // Get the correct answer option text
        let correctText = '';
        if (q.answer && q.options) {
          const opt = q.options.find(o => o.letter === q.answer);
          correctText = opt ? opt.text : '';
        } else if (q.answers && q.options) {
          correctText = q.answers
            .map(a => { const opt = q.options.find(o => o.letter === a); return opt ? opt.text : ''; })
            .filter(Boolean)
            .join(' ');
        }

        if (!correctText) continue;

        // Extract meaningful words (>3 chars) from the correct answer
        const answerWords = correctText.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 3);

        if (answerWords.length === 0) continue;

        // Check if at least one significant word from the answer appears in the explanation
        const explanationLower = q.explanation.toLowerCase();
        const matches = answerWords.filter(w => explanationLower.includes(w));

        // Relaxed: at least 1 word match OR explanation references tags
        if (matches.length === 0) {
          // Check if explanation mentions any of the question tags as fallback
          const tagMatches = (q.tags || []).filter(t =>
            t.length > 3 && explanationLower.includes(t.toLowerCase())
          );
          if (tagMatches.length === 0) {
            errors.push(`${q.id}: explanation may not reference correct answer concept (${answerWords.slice(0, 3).join(', ')}). Explanation: "${q.explanation.substring(0, 80)}..."`);
          }
        }
      }
      // Allow up to 5% of questions to fail this heuristic (it's a basic check, not definitive)
      const maxFailures = Math.ceil(allQuestions.length * 0.05);
      assert.ok(errors.length <= maxFailures,
        `${errors.length} questions may have explanations not referencing the answer (max allowed: ${maxFailures}):\n${errors.slice(0, 10).join('\n')}`);
    });
  });

  describe('Cross-File Option Text Dedup', () => {
    let allQuestions = [];

    before(() => {
      const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, file), 'utf8'));
        if (Array.isArray(data)) {
          allQuestions.push(...data);
        } else if (data.questions && Array.isArray(data.questions)) {
          allQuestions.push(...data.questions);
        }
      }
    });

    it('no option text appears in 5+ different questions (excluding common phrases)', () => {
      // Common phrases that are expected to repeat across questions
      const COMMON = new Set([
        'all of the above', 'none of the above', 'not applicable',
        'depends on the implementation', 'not enough information',
        'cannot be determined', 'varies by server'
      ]);

      const optionTextMap = new Map();
      for (const q of allQuestions) {
        if (!q.options) continue;
        for (const opt of q.options) {
          const text = opt.text.trim().toLowerCase();
          if (!text || text.length < 10) continue;
          if (COMMON.has(text)) continue;
          if (!optionTextMap.has(text)) optionTextMap.set(text, new Set());
          optionTextMap.get(text).add(q.id);
        }
      }

      const dupes = [];
      for (const [text, questionIds] of optionTextMap) {
        if (questionIds.size >= 5) {
          dupes.push(`"${text}" in ${questionIds.size} questions: ${[...questionIds].slice(0, 3).join(', ')}`);
        }
      }
      assert.strictEqual(dupes.length, 0,
        `Suspicious duplicate options:\n${dupes.join('\n')}`);
    });
  });
});
