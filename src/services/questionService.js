/**
 * Question Service
 * Loads and manages questions from JSON files
 */

const fs = require('fs');
const path = require('path');

class QuestionService {
  constructor() {
    this.questions = [];
    this.tags = new Set();
    this.questionsByTag = {};
    this.loaded = false;
  }

  /**
   * Load all questions from data/questions/ directory
   */
  loadQuestions() {
    const questionsDir = path.join(__dirname, '../../data/questions');
    
    // Load all question files (both single-select and multi-select)
    const files = fs.readdirSync(questionsDir)
      .filter(f => f.endsWith('.json') && !f.includes('bank'));

    console.log(`📚 Loading questions from ${files.length} files...`);

    files.forEach(file => {
      const filePath = path.join(questionsDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (data.questions && Array.isArray(data.questions)) {
        data.questions.forEach(q => {
          // Add chapter name from metadata
          q.chapterName = data.meta?.chapterName || `Chapter ${q.chapter}`;
          
          // Mark multi-select questions from -multi files
          if (file.includes('-multi') && q.type === 'mcq') {
            q.type = 'multi_select';
          }
          
          this.questions.push(q);
          
          // Collect unique tags
          if (q.tags && Array.isArray(q.tags)) {
            q.tags.forEach(tag => {
              this.tags.add(tag);
              
              // Group questions by tag
              if (!this.questionsByTag[tag]) {
                this.questionsByTag[tag] = [];
              }
              this.questionsByTag[tag].push(q);
            });
          }
        });
      }
    });

    this.loaded = true;
    console.log(`✅ Loaded ${this.questions.length} questions with ${this.tags.size} unique tags`);
    
    return {
      totalQuestions: this.questions.length,
      totalTags: this.tags.size
    };
  }

  /**
   * Get all available tags with question counts
   */
  getTags() {
    const tagsArray = Array.from(this.tags).sort();
    return tagsArray.map(tag => ({
      name: tag,
      count: this.questionsByTag[tag]?.length || 0
    }));
  }

  /**
   * Get questions filtered by tags
   * @param {string[]} selectedTags - Tags to include
   * @param {number} limit - Max questions to return (0 = all)
   */
  getQuestionsByTags(selectedTags, limit = 0) {
    // Collect unique question IDs from selected tags
    const questionIds = new Set();
    const filteredQuestions = [];

    selectedTags.forEach(tag => {
      const questions = this.questionsByTag[tag] || [];
      questions.forEach(q => {
        if (!questionIds.has(q.id)) {
          questionIds.add(q.id);
          filteredQuestions.push(q);
        }
      });
    });

    // Apply limit
    if (limit > 0 && filteredQuestions.length > limit) {
      return filteredQuestions.slice(0, limit);
    }

    return filteredQuestions;
  }

  /**
   * Get a single question by ID
   */
  getQuestionById(id) {
    return this.questions.find(q => q.id === id) || null;
  }

  /**
   * Get all loaded questions
   */
  getAllQuestions() {
    return this.questions;
  }

  /**
   * Get total question count
   */
  getTotalCount() {
    return this.questions.length;
  }

  /**
   * Shuffle array (Fisher-Yates algorithm)
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Prepare questions for quiz (re-assign letters, mark correct)
   * No shuffle — with 300+ questions, memorization isn't a concern
   */
  prepareQuizQuestions(questions) {
    return questions.map(q => {
      // Re-assign letters A, B, C... based on position
      const optionsWithNewLetters = q.options.map((opt, index) => ({
        letter: String.fromCharCode(65 + index),
        text: opt.text
      }));
      
      // Determine correct answers by matching text content
      let correctTexts = [];
      if (q.answers && Array.isArray(q.answers)) {
        correctTexts = q.answers.map(letter => {
          const opt = q.options.find(o => o.letter === letter);
          return opt ? opt.text : null;
        }).filter(Boolean);
      } else if (q.answer) {
        const opt = q.options.find(o => o.letter === q.answer);
        correctTexts = opt ? [opt.text] : [];
      }

      // Find new letters for correct answers AFTER re-lettering
      const correctLetters = correctTexts.map(text => {
        const opt = optionsWithNewLetters.find(o => o.text === text);
        return opt ? opt.letter : null;
      }).filter(Boolean);

      return {
        id: q.id,
        chapter: q.chapter,
        chapterName: q.chapterName,
        type: q.type,
        difficulty: q.difficulty,
        question: q.question,
        options: optionsWithNewLetters,
        correctAnswers: correctLetters,
        explanation: q.explanation,
        tags: q.tags
      };
    });
  }

  /**
   * Score answers
   * @param {Object} questions - Quiz questions with correctAnswers
   * @param {Object} userAnswers - { questionId: "A" or ["A", "C"] }
   */
  scoreAnswers(questions, userAnswers) {
    let correct = 0;
    const results = [];

    questions.forEach(q => {
      const userAnswer = userAnswers[q.id];
      const correctAnswers = q.correctAnswers.sort().join(',');
      const userAnswerStr = Array.isArray(userAnswer) 
        ? userAnswer.sort().join(',') 
        : (userAnswer || '');

      const isCorrect = correctAnswers === userAnswerStr;
      if (isCorrect) correct++;

      // Get options with correctness markers
      const optionsWithMarkers = q.options.map(opt => ({
        letter: opt.letter,
        text: opt.text,
        isCorrect: correctAnswers.includes(opt.letter)
      }));

      results.push({
        questionId: q.id,
        question: q.question,
        type: q.type,
        tags: q.tags || [],
        yourAnswer: userAnswer,
        correctAnswer: q.correctAnswers.length === 1 ? q.correctAnswers[0] : q.correctAnswers,
        isCorrect: isCorrect,
        explanation: q.explanation,
        options: optionsWithMarkers
      });
    });

    return {
      score: correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
      results: results
    };
  }
}

// Singleton instance
const questionService = new QuestionService();

module.exports = questionService;
