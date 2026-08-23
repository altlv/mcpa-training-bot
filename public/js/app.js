/**
 * MCPA Training Bot - Main Application
 * Handles UI rendering and user interactions
 */

import API from './api.js';
import QuizEngine from './quiz.js';

const App = {
  // DOM Elements cache
  elements: {},
  
  // Current view
  currentView: 'tag-selection', // tag-selection | quiz | summary
  
  /**
   * Initialize the application
   */
  async init() {
    // Cache DOM elements
    this.cacheElements();
    
    // Initialize quiz engine
    QuizEngine.init();
    
    // Check for saved quiz
    if (QuizEngine.hasSavedQuiz()) {
      this.showResumeDialog();
    }
    
    // Load tags
    await this.loadTags();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Show initial view
    this.showView('tag-selection');
  },
  
  /**
   * Cache DOM elements for performance
   */
  cacheElements() {
    // Screens
    this.elements.tagSelectionScreen = document.getElementById('tag-selection-screen');
    this.elements.quizScreen = document.getElementById('quiz-screen');
    this.elements.summaryScreen = document.getElementById('summary-screen');
    
    // Tag selection
    this.elements.tagsContainer = document.getElementById('tags-container');
    this.elements.tagSearch = document.getElementById('tag-search');
    this.elements.selectAllBtn = document.getElementById('select-all-btn');
    this.elements.deselectAllBtn = document.getElementById('deselect-all-btn');
    this.elements.questionCount = document.getElementById('question-count');
    this.elements.selectedCount = document.getElementById('selected-count');
    this.elements.startQuizBtn = document.getElementById('start-quiz-btn');
    
    // Quiz
    this.elements.questionText = document.getElementById('question-text');
    this.elements.questionMeta = document.getElementById('question-meta');
    this.elements.questionInstruction = document.getElementById('question-instruction');
    this.elements.optionsContainer = document.getElementById('options-container');
    this.elements.progressFill = document.getElementById('progress-fill');
    this.elements.progressText = document.getElementById('progress-text');
    this.elements.quizTimer = document.getElementById('quiz-timer');
    this.elements.prevBtn = document.getElementById('prev-btn');
    this.elements.nextBtn = document.getElementById('next-btn');
    this.elements.skipBtn = document.getElementById('skip-btn');
    this.elements.submitBtn = document.getElementById('submit-btn');
    
    // Summary
    this.elements.scorePercentage = document.getElementById('score-percentage');
    this.elements.scoreCorrect = document.getElementById('score-correct');
    this.elements.scoreTotal = document.getElementById('score-total');
    this.elements.scoreTime = document.getElementById('score-time');
    this.elements.resultsList = document.getElementById('results-list');
    
    // Loading
    this.elements.loadingContainer = document.getElementById('loading-container');
    
    // Resume dialog
    this.elements.resumeDialog = document.getElementById('resume-dialog');
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Tag selection
    this.elements.selectAllBtn?.addEventListener('click', () => this.selectAllTags());
    this.elements.deselectAllBtn?.addEventListener('click', () => this.deselectAllTags());
    this.elements.startQuizBtn?.addEventListener('click', () => this.startQuiz());
    
    // Quiz navigation
    this.elements.prevBtn?.addEventListener('click', () => this.previousQuestion());
    this.elements.nextBtn?.addEventListener('click', () => this.nextQuestion());
    this.elements.skipBtn?.addEventListener('click', () => this.skipQuestion());
    this.elements.submitBtn?.addEventListener('click', () => this.submitQuiz());
    
    // Resume dialog
    document.getElementById('resume-yes-btn')?.addEventListener('click', () => this.resumeQuiz());
    document.getElementById('resume-no-btn')?.addEventListener('click', () => this.abandonQuiz());
    
    // Question count change
    this.elements.questionCount?.addEventListener('change', () => this.updateStartButton());
  },
  
  /**
   * Load tags from API
   */
  async loadTags() {
    try {
      this.showLoading('Loading tags...');
      const data = await API.getTags();
      this.renderTags(data.tags);
    this.setupTagSearch();
      this.hideLoading();
    } catch (error) {
      this.showError('Failed to load tags. Please refresh the page.');
      this.hideLoading();
    }
  },
  
  /**
   * Render tags in the container
   * @param {object[]} tags - Array of tag objects
   */
  renderTags(tags) {
    // Sort tags alphabetically
    tags = [...tags].sort((a, b) => a.name.localeCompare(b.name));
    if (!this.elements.tagsContainer) return;
    
    this.elements.tagsContainer.innerHTML = tags.map(tag => `
      <div class="tag-item" data-tag="${tag.name}">
        <input type="checkbox" id="tag-${tag.name}" value="${tag.name}">
        <label for="tag-${tag.name}">${tag.name} (${tag.count})</label>
      </div>
    `).join('');
    
    // Add click handlers
    this.elements.tagsContainer.querySelectorAll('.tag-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
          const checkbox = item.querySelector('input[type="checkbox"]');
          checkbox.checked = !checkbox.checked;
        }
        item.classList.toggle('selected', item.querySelector('input').checked);
        this.updateSelectedCount();
        this.updateStartButton();
      });
    });
  },
  
  /**
   * Setup tag search filter
   */
  setupTagSearch() {
    if (!this.elements.tagSearch || !this.elements.tagsContainer) return;
    this.elements.tagSearch.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const tagItems = this.elements.tagsContainer.querySelectorAll('.tag-item');
      tagItems.forEach(item => {
        const tagName = (item.getAttribute('data-tag') || '').toLowerCase();
        item.style.display = (!query || tagName.includes(query)) ? '' : 'none';
      });
    });
  },

  /**
   * Get selected tags
   * @returns {string[]} Array of selected tag names
   */
  getSelectedTags() {
    const checkboxes = this.elements.tagsContainer?.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes || []).map(cb => cb.value);
  },
  
  /**
   * Select all tags
   */
  selectAllTags() {
    this.elements.tagsContainer?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = true;
      cb.closest('.tag-item')?.classList.add('selected');
    });
    this.updateSelectedCount();
    this.updateStartButton();
  },
  
  /**
   * Deselect all tags
   */
  deselectAllTags() {
    this.elements.tagsContainer?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
      cb.closest('.tag-item')?.classList.remove('selected');
    });
    this.updateSelectedCount();
    this.updateStartButton();
  },
  
  /**
   * Update selected count display
   */
  updateSelectedCount() {
    const count = this.getSelectedTags().length;
    if (this.elements.selectedCount) {
      this.elements.selectedCount.textContent = `${count} tag${count !== 1 ? 's' : ''} selected`;
    }
  },
  
  /**
   * Update start button state
   */
  updateStartButton() {
    const selectedTags = this.getSelectedTags();
    const count = this.elements.questionCount?.value || 'all';
    
    if (this.elements.startQuizBtn) {
      this.elements.startQuizBtn.disabled = selectedTags.length === 0;
    }
  },
  
  /**
   * Start quiz
   */
  async startQuiz() {
    const tags = this.getSelectedTags();
    if (tags.length === 0) {
      this.showError('Please select at least one tag');
      return;
    }
    
    const count = this.elements.questionCount?.value || 'all';
    
    try {
      this.showLoading('Creating quiz...');
      await QuizEngine.startQuiz(tags, count);
      this.hideLoading();
      this.showView('quiz');
      this.renderCurrentQuestion();
      this.startTimer();
    } catch (error) {
      this.hideLoading();
      this.showError('Failed to start quiz. Please try again.');
    }
  },
  
  /**
   * Render current question
   */
  renderCurrentQuestion() {
    const question = QuizEngine.getCurrentQuestion();
    if (!question) return;
    
    // Update question text
    if (this.elements.questionText) {
      this.elements.questionText.textContent = question.question;
    }
    
    // Update meta
    if (this.elements.questionMeta) {
      this.elements.questionMeta.innerHTML = `
        <span class="question-badge badge-difficulty-${question.difficulty}">${question.difficulty}</span>
        <span class="question-badge badge-type-${question.type}">${question.type === 'multi_select' ? 'Multi-select' : 'Single-select'}</span>
      `;
    }
    
    // Update instruction
    if (this.elements.questionInstruction) {
      this.elements.questionInstruction.textContent = question.type === 'multi_select' 
        ? 'Select all correct answers'
        : 'Select the best answer';
    }
    
    // Render options
    this.renderOptions(question);
    
    // Update progress
    this.updateProgress();
    
    // Update navigation buttons
    this.updateNavigationButtons();
    
    // Restore previous answer
    this.restoreAnswer();
  },
  
  /**
   * Render question options
   * @param {object} question - Question object
   */
  renderOptions(question) {
    if (!this.elements.optionsContainer) return;
    
    const isMultiSelect = question.type === 'multi_select';
    const inputType = isMultiSelect ? 'checkbox' : 'radio';
    
    this.elements.optionsContainer.innerHTML = question.options.map(option => `
      <div class="option-item" data-value="${option.letter}">
        <input type="${inputType}" 
               name="question-${question.id}" 
               value="${option.letter}" 
               id="option-${option.letter}">
        <span class="option-letter">${option.letter}</span>
        <span class="option-text">${option.text}</span>
      </div>
    `).join('');
    
    // Add click handlers
    this.elements.optionsContainer.querySelectorAll('.option-item').forEach(item => {
      item.addEventListener('click', () => {
        const input = item.querySelector('input');
        
        if (isMultiSelect) {
          // Toggle checkbox
          input.checked = !input.checked;
          item.classList.toggle('selected', input.checked);
          
          // Save all selected
          const selected = Array.from(this.elements.optionsContainer.querySelectorAll('input:checked'))
            .map(inp => inp.value);
          QuizEngine.setAnswer(selected.length > 0 ? selected : null);
        } else {
          // Single select: always select this one
          input.checked = true;
          
          // Update selected state
          this.elements.optionsContainer.querySelectorAll('.option-item').forEach(opt => {
            opt.classList.remove('selected');
          });
          item.classList.add('selected');
          
          // Save answer
          QuizEngine.setAnswer(input.value);
        }
      });
    });
  },
  
  /**
   * Restore previous answer
   */
  restoreAnswer() {
    const answer = QuizEngine.getCurrentAnswer();
    if (!answer) return;
    
    const question = QuizEngine.getCurrentQuestion();
    const isMultiSelect = question.type === 'multi_select';
    
    if (isMultiSelect && Array.isArray(answer)) {
      answer.forEach(letter => {
        const item = this.elements.optionsContainer?.querySelector(`[data-value="${letter}"]`);
        if (item) {
          item.classList.add('selected');
          item.querySelector('input').checked = true;
        }
      });
    } else if (!isMultiSelect && typeof answer === 'string') {
      const item = this.elements.optionsContainer?.querySelector(`[data-value="${answer}"]`);
      if (item) {
        item.classList.add('selected');
        item.querySelector('input').checked = true;
      }
    }
  },
  
  /**
   * Update progress bar
   */
  updateProgress() {
    const current = QuizEngine.getCurrentQuestionNumber();
    const total = QuizEngine.getTotalQuestions();
    const percentage = (current / total) * 100;
    
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = `${percentage}%`;
    }
    
    if (this.elements.progressText) {
      this.elements.progressText.textContent = `Question ${current} of ${total}`;
    }
  },
  
  /**
   * Update navigation buttons
   */
  updateNavigationButtons() {
    // Previous button
    if (this.elements.prevBtn) {
      this.elements.prevBtn.disabled = QuizEngine.isFirstQuestion();
    }
    
    // Next button
    if (this.elements.nextBtn) {
      this.elements.nextBtn.disabled = QuizEngine.isLastQuestion();
    }
    
    // Skip button
    if (this.elements.skipBtn) {
      this.elements.skipBtn.disabled = QuizEngine.isCurrentQuestionSkipped();
      this.elements.skipBtn.textContent = QuizEngine.isCurrentQuestionSkipped() 
        ? 'Skipped' 
        : 'Skip';
    }
    
    // Submit button - only show on last question
    if (this.elements.submitBtn) {
      this.elements.submitBtn.classList.toggle('hidden', !QuizEngine.isLastQuestion());
    }
  },
  
  /**
   * Previous question
   */
  previousQuestion() {
    if (QuizEngine.previousQuestion()) {
      this.renderCurrentQuestion();
    }
  },
  
  /**
   * Next question - requires an answer unless skipped
   */
  nextQuestion() {
    const currentAnswer = QuizEngine.getCurrentAnswer();
    if (!currentAnswer) {
      this.showError('Please select an answer before proceeding. Use Skip to skip this question.');
      return;
    }

    // In exam mode, just advance (no feedback until summary)
    if (QuizEngine.nextQuestion()) {
      this.renderCurrentQuestion();
    }
  },
  
  /**
   * Skip question
   */
  skipQuestion() {
    if (QuizEngine.skipQuestion()) {
      this.renderCurrentQuestion();
    }
  },
  
  /**
   * Submit quiz
   */
  async submitQuiz() {
    try {
      this.showLoading('Submitting answers...');
      const results = await QuizEngine.submitQuiz();
      this.hideLoading();
      this.renderSummary(results);
      this.showView('summary');
    } catch (error) {
      this.hideLoading();
      this.showError('Failed to submit quiz. Please try again.');
    }
  },
  
  /**
   * Render summary page
   * @param {object} results - Quiz results
   */
  renderSummary(results) {
    const percentage = Math.round((results.score / results.total) * 100);
    
    // Update score display
    if (this.elements.scorePercentage) {
      this.elements.scorePercentage.textContent = `${percentage}%`;
    }
    if (this.elements.scoreCorrect) {
      this.elements.scoreCorrect.textContent = results.score;
    }
    if (this.elements.scoreTotal) {
      this.elements.scoreTotal.textContent = results.total;
    }
    if (this.elements.scoreTime) {
      const stats = QuizEngine.getStats();
      this.elements.scoreTime.textContent = stats.timeFormatted;
    }
    
    // Render tag breakdown
    this.renderTagBreakdown(results.results);
    
    // Render results list
    this.renderResults(results.results);
  },
  
  /**
   * Render tag-based score breakdown
   * @param {object[]} results - Array of question results
   */
  renderTagBreakdown(results) {
    // Calculate per-tag stats
    const tagStats = {};
    
    results.forEach(result => {
      const tags = result.tags || [];
      tags.forEach(tag => {
        if (!tagStats[tag]) {
          tagStats[tag] = { correct: 0, total: 0 };
        }
        tagStats[tag].total++;
        if (result.isCorrect) {
          tagStats[tag].correct++;
        }
      });
    });
    
    // Sort by percentage (lowest first — so you see weak areas first)
    const sortedTags = Object.entries(tagStats)
      .map(([tag, stats]) => ({
        tag,
        correct: stats.correct,
        total: stats.total,
        percentage: Math.round((stats.correct / stats.total) * 100)
      }))
      .sort((a, b) => a.percentage - b.percentage);
    
    // Find or create container
    let container = document.getElementById('tag-breakdown-container');
    if (!container) {
      // Insert before results list
      const resultsList = document.getElementById('results-list');
      if (resultsList) {
        container = document.createElement('div');
        container.id = 'tag-breakdown-container';
        resultsList.parentNode.insertBefore(container, resultsList);
      }
    }
    
    if (!container || sortedTags.length === 0) return;
    
    container.innerHTML = `
      <div class="tag-breakdown">
        <h3>📊 Score by Topic</h3>
        <div class="tag-breakdown-list">
          ${sortedTags.map(item => {
            const barColor = item.percentage >= 80 ? 'var(--color-success)' 
              : item.percentage >= 50 ? 'var(--color-warning)' 
              : 'var(--color-error)';
            return `
              <div class="tag-breakdown-item">
                <div class="tag-breakdown-header">
                  <span class="tag-breakdown-name">${item.tag}</span>
                  <span class="tag-breakdown-score">${item.correct}/${item.total} (${item.percentage}%)</span>
                </div>
                <div class="tag-breakdown-bar">
                  <div class="tag-breakdown-fill" style="width: ${item.percentage}%; background: ${barColor}"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Render results list
   * @param {object[]} results - Array of question results
   */
  renderResults(results) {
    if (!this.elements.resultsList) return;
    
    this.elements.resultsList.innerHTML = results.map((result, index) => `
      <div class="result-item ${result.isCorrect ? 'correct' : 'incorrect'}">
        <div class="result-header">
          <span class="result-status ${result.isCorrect ? 'correct' : 'incorrect'}">
            ${result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
          </span>
          <span class="result-question-num">Question ${index + 1}</span>
        </div>
        
        <div class="result-question">${result.question}</div>
        
        <div class="result-answers">
          <span>
            <span class="answer-label">Your answer:</span>
            <span class="answer-value ${result.isCorrect ? 'correct' : 'incorrect'}">
              ${this.formatAnswerDisplay(result.yourAnswer, result.options)}
            </span>
          </span>
          ${!result.isCorrect ? `
          <span>
            <span class="answer-label">Correct answer:</span>
            <span class="answer-value correct">${this.formatAnswerDisplay(result.correctAnswer, result.options)}</span>
          </span>
          ` : ''}
        </div>
        
        <div class="explanation-toggle" onclick="this.nextElementSibling.classList.toggle('show')">
          📖 Show explanation
        </div>
        <div class="explanation-content">
          <p><strong>Explanation:</strong> ${result.explanation}</p>
          ${!result.isCorrect && result.whyWrong ? `
          <p><strong>Why other options are wrong:</strong></p>
          <ul>
            ${Object.entries(result.whyWrong).map(([letter, reason]) => `
              <li><strong>${letter}:</strong> ${reason}</li>
            `).join('')}
          </ul>
          ` : ''}
        </div>
      </div>
    `).join('');
  },
  

  /**
   * Format answer for display (letter + text)
   * @param {string|string[]} answer - Letter(s)
   * @param {object[]} options - Options array with letter and text
   * @returns {string} Formatted answer string
   */
  formatAnswerDisplay(answer, options) {
    if (!answer) return 'No answer';
    
    const lookup = (letter) => {
      const opt = options.find(o => o.letter === letter);
      return opt ? `${letter}) ${opt.text}` : letter;
    };
    
    if (Array.isArray(answer)) {
      return answer.map(lookup).join(', ');
    }
    return lookup(answer);
  },

  /**
   * Start quiz timer
   */
  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.elements.quizTimer && QuizEngine.state.startTime) {
        const elapsed = new Date() - new Date(QuizEngine.state.startTime);
        this.elements.quizTimer.textContent = QuizEngine.formatTime(elapsed);
      }
    }, 1000);
  },
  
  /**
   * Stop quiz timer
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },
  
  /**
   * Show a specific view
   * @param {string} view - View name
   */
  showView(view) {
    this.currentView = view;
    
    // Hide all screens
    this.elements.tagSelectionScreen?.classList.add('hidden');
    this.elements.quizScreen?.classList.add('hidden');
    this.elements.summaryScreen?.classList.add('hidden');
    
    // Show selected screen
    switch (view) {
      case 'tag-selection':
        this.elements.tagSelectionScreen?.classList.remove('hidden');
        this.stopTimer();
        break;
      case 'quiz':
        this.elements.quizScreen?.classList.remove('hidden');
        break;
      case 'summary':
        this.elements.summaryScreen?.classList.remove('hidden');
        this.stopTimer();
        break;
    }
  },
  
  /**
   * Show loading indicator
   * @param {string} message - Loading message
   */
  showLoading(message = 'Loading...') {
    if (this.elements.loadingContainer) {
      this.elements.loadingContainer.innerHTML = `
        <div class="spinner"></div>
        <div class="loading-text">${message}</div>
      `;
      this.elements.loadingContainer.classList.remove('hidden');
    }
  },
  
  /**
   * Hide loading indicator
   */
  hideLoading() {
    this.elements.loadingContainer?.classList.add('hidden');
  },
  
  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    this.showAlert(message, 'error');
  },
  
  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    this.showAlert(message, 'success');
  },
  
  /**
   * Show alert message
   * @param {string} message - Alert message
   * @param {string} type - Alert type (success, error, warning, info)
   */
  showAlert(message, type = 'info') {
    const alertHtml = `
      <div class="alert alert-${type}">
        <span class="alert-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
        <span>${message}</span>
      </div>
    `;
    
    // Insert at top of current view
    const screen = this.elements[`${this.currentView.replace('-', '')}Screen`];
    screen?.insertAdjacentHTML('afterbegin', alertHtml);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      screen?.querySelector('.alert')?.remove();
    }, 5000);
  },
  
  /**
   * Show resume dialog
   */
  showResumeDialog() {
    this.elements.resumeDialog?.classList.remove('hidden');
  },
  
  /**
   * Resume saved quiz
   */
  resumeQuiz() {
    QuizEngine.resumeQuiz();
    this.elements.resumeDialog?.classList.add('hidden');
    this.showView('quiz');
    this.renderCurrentQuestion();
    this.startTimer();
  },
  
  /**
   * Abandon saved quiz
   */
  abandonQuiz() {
    QuizEngine.abandonQuiz();
    this.elements.resumeDialog?.classList.add('hidden');
  },

  /**
   * Show feedback modal after answering a question
   */
  showFeedbackModal(question, userAnswer) {
    const modal = document.getElementById('feedback-modal');
    const modalCard = document.getElementById('modal-card');
    const modalIcon = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalCorrect = document.getElementById('modal-correct-answer');
    const modalExpl = document.getElementById('modal-explanation');
    const modalNext = document.getElementById('modal-next');
    if (!modal) return;

    const correctAnswers = question.correctAnswers || [];
    const userLetters = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
    const isCorrect = correctAnswers.length === userLetters.length &&
      correctAnswers.every(a => userLetters.includes(a));

    modalCard.className = 'modal-card ' + (isCorrect ? 'correct' : 'incorrect');
    modalIcon.textContent = isCorrect ? '\u2705' : '\u274C';
    modalTitle.textContent = isCorrect ? 'Correct!' : 'Not quite.';
    modalTitle.className = 'modal-title ' + (isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      modalCorrect.classList.add('hidden');
    } else {
      const labels = question.options
        .filter(o => correctAnswers.includes(o.letter))
        .map(o => o.letter + '. ' + o.text).join('<br>');
      modalCorrect.innerHTML = '<strong>Correct answer:</strong> ' + correctAnswers.join(', ') + '<br><small>' + labels + '</small>';
      modalCorrect.classList.remove('hidden');
    }

    if (question.explanation) {
      modalExpl.innerHTML = '<strong>\uD83D\uDCA1</strong> ' + question.explanation;
      modalExpl.classList.remove('hidden');
    } else {
      modalExpl.classList.add('hidden');
    }

    // 'Next \u2192' button text
    const isLast = QuizEngine.isLastQuestion();
    modalNext.textContent = isLast ? 'Submit Quiz' : 'Next \u2192';
    modalNext.onclick = () => {
      modal.classList.add('hidden');
      if (isLast) {
        this.submitQuiz();
      } else {
        this.nextQuestion();
      }
    };

    modal.classList.remove('hidden');
  },

};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

export default App;
