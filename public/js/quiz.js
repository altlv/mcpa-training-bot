/**
 * MCPA Training Bot - Quiz Engine
 * Manages quiz state, navigation, and localStorage persistence
 */

import API from './api.js';

const QuizEngine = {
  // State
  state: {
    sessionId: null,
    questions: [],
    currentIndex: 0,
    answers: {},
    skippedQuestions: [],
    startTime: null,
    endTime: null,
  },
  
  // LocalStorage key
  STORAGE_KEY: 'mcpa-quiz-state',
  
  /**
   * Initialize the quiz engine
   */
  init() {
    this.loadState();
    this.setupKeyboardNavigation();
  },
  
  /**
   * Start a new quiz
   * @param {string[]} tags - Selected tags
   * @param {number} count - Number of questions
   * @returns {Promise<object>} Quiz session
   */
  async startQuiz(tags, count) {
    try {
      // Call API to create session
      const session = await API.startQuiz(tags, count);
      
      // Update state
      this.state.sessionId = session.sessionId;
      this.state.questions = session.questions;
      this.state.currentIndex = 0;
      this.state.answers = {};
      this.state.skippedQuestions = [];
      this.state.startTime = new Date().toISOString();
      this.state.endTime = null;
      
      // Save to localStorage
      this.saveState();
      
      return session;
    } catch (error) {
      console.error('Failed to start quiz:', error);
      throw error;
    }
  },
  
  /**
   * Get current question
   * @returns {object|null} Current question
   */
  getCurrentQuestion() {
    if (this.state.questions.length === 0) {
      return null;
    }
    return this.state.questions[this.state.currentIndex] || null;
  },
  
  /**
   * Get total questions count
   * @returns {number} Total questions
   */
  getTotalQuestions() {
    return this.state.questions.length;
  },
  
  /**
   * Get current question number (1-based)
   * @returns {number} Current question number
   */
  getCurrentQuestionNumber() {
    return this.state.currentIndex + 1;
  },
  
  /**
   * Check if this is the last question
   * @returns {boolean} True if last question
   */
  isLastQuestion() {
    return this.state.currentIndex === this.state.questions.length - 1;
  },
  
  /**
   * Check if this is the first question
   * @returns {boolean} True if first question
   */
  isFirstQuestion() {
    return this.state.currentIndex === 0;
  },
  
  /**
   * Set answer for current question
   * @param {string|string[]} answer - Answer(s)
   */
  setAnswer(answer) {
    const question = this.getCurrentQuestion();
    if (!question) return;
    
    this.state.answers[question.id] = answer;
    this.saveState();
  },
  
  /**
   * Get answer for current question
   * @returns {string|string[]|null} Current answer
   */
  getCurrentAnswer() {
    const question = this.getCurrentQuestion();
    if (!question) return null;
    
    return this.state.answers[question.id] || null;
  },
  
  /**
   * Navigate to next question
   * @returns {boolean} True if navigation successful
   */
  nextQuestion() {
    if (this.isLastQuestion()) {
      return false;
    }
    
    this.state.currentIndex++;
    this.saveState();
    return true;
  },
  
  /**
   * Navigate to previous question
   * @returns {boolean} True if navigation successful
   */
  previousQuestion() {
    if (this.isFirstQuestion()) {
      return false;
    }
    
    this.state.currentIndex--;
    this.saveState();
    return true;
  },
  
  /**
   * Skip current question (move to end)
   * @returns {boolean} True if skip successful
   */
  skipQuestion() {
    const question = this.getCurrentQuestion();
    if (!question) return false;
    
    // Check if already skipped
    if (this.state.skippedQuestions.includes(question.id)) {
      return false;
    }
    
    // Add to skipped list
    this.state.skippedQuestions.push(question.id);
    
    // Move question to end
    const skippedQuestion = this.state.questions.splice(this.state.currentIndex, 1)[0];
    this.state.questions.push(skippedQuestion);
    
    // Adjust index if needed
    if (this.state.currentIndex >= this.state.questions.length) {
      this.state.currentIndex = this.state.questions.length - 1;
    }
    
    this.saveState();
    return true;
  },
  
  /**
   * Check if current question is skipped
   * @returns {boolean} True if question is skipped
   */
  isCurrentQuestionSkipped() {
    const question = this.getCurrentQuestion();
    if (!question) return false;
    
    return this.state.skippedQuestions.includes(question.id);
  },
  
  /**
   * Get skipped questions count
   * @returns {number} Number of skipped questions
   */
  getSkippedCount() {
    return this.state.skippedQuestions.length;
  },
  
  /**
   * Get answered questions count
   * @returns {number} Number of answered questions
   */
  getAnsweredCount() {
    return Object.keys(this.state.answers).length;
  },
  
  /**
   * Get unanswered questions count
   * @returns {number} Number of unanswered questions
   */
  getUnansweredCount() {
    return this.getTotalQuestions() - this.getAnsweredCount();
  },
  
  /**
   * Check if all questions are answered
   * @returns {boolean} True if all answered
   */
  areAllAnswered() {
    return this.getUnansweredCount() === 0;
  },
  
  /**
   * Submit quiz and get results
   * @returns {Promise<object>} Quiz results
   */
  async submitQuiz() {
    try {
      this.state.endTime = new Date().toISOString();
      
      const results = await API.submitQuiz(
        this.state.sessionId,
        this.state.answers
      );
      
      // Clear saved state
      this.clearState();
      
      return results;
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      throw error;
    }
  },
  
  /**
   * Calculate quiz statistics
   * @returns {object} Quiz statistics
   */
  getStats() {
    const totalTime = this.state.endTime 
      ? new Date(this.state.endTime) - new Date(this.state.startTime)
      : new Date() - new Date(this.state.startTime);
    
    return {
      totalQuestions: this.getTotalQuestions(),
      answered: this.getAnsweredCount(),
      skipped: this.getSkippedCount(),
      unanswered: this.getUnansweredCount(),
      timeSpent: Math.floor(totalTime / 1000), // seconds
      timeFormatted: this.formatTime(totalTime),
    };
  },
  
  /**
   * Format time in milliseconds to MM:SS
   * @param {number} ms - Time in milliseconds
   * @returns {string} Formatted time
   */
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  },
  
  /**
   * Save state to localStorage
   */
  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  },
  
  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore if quiz is in progress
        if (parsed.sessionId && parsed.questions.length > 0 && !parsed.endTime) {
          this.state = parsed;
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
    return false;
  },
  
  /**
   * Clear saved state
   */
  clearState() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear state:', error);
    }
  },
  
  /**
   * Check if there's a saved quiz in progress
   * @returns {boolean} True if quiz in progress
   */
  hasSavedQuiz() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.sessionId && parsed.questions.length > 0 && !parsed.endTime;
      } catch {
        return false;
      }
    }
    return false;
  },
  
  /**
   * Resume saved quiz
   * @returns {object|null} Restored state or null
   */
  resumeQuiz() {
    if (this.loadState()) {
      return this.state;
    }
    return null;
  },
  
  /**
   * Abandon current quiz
   */
  abandonQuiz() {
    this.clearState();
    this.state = {
      sessionId: null,
      questions: [],
      currentIndex: 0,
      answers: {},
      skippedQuestions: [],
      startTime: null,
      endTime: null,
    };
  },
  
  /**
   * Setup keyboard navigation
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Only handle if quiz is active
      if (!this.state.sessionId) return;
      
      // Don't handle if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (e.key) {
        case 'ArrowRight':
        case 'n':
          // Next question
          if (!this.isLastQuestion()) {
            document.getElementById('next-btn')?.click();
          }
          break;
        case 'ArrowLeft':
        case 'p':
          // Previous question
          if (!this.isFirstQuestion()) {
            document.getElementById('prev-btn')?.click();
          }
          break;
        case 's':
          // Skip question
          if (!this.isCurrentQuestionSkipped()) {
            document.getElementById('skip-btn')?.click();
          }
          break;
        case 'Enter':
          // Submit on last question
          if (this.isLastQuestion()) {
            document.getElementById('submit-btn')?.click();
          }
          break;
      }
    });
  },
};

export default QuizEngine;
