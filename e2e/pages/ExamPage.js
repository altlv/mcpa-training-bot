import { expect } from '@playwright/test';

/**
 * Page Object for Exam Mode (index.html).
 * Encapsulates all locators and actions for the exam quiz flow.
 */
export class ExamPage {
  constructor(page) {
    this.page = page;

    // Tag selection
    this.tagContainer = page.locator('#tags-container');
    this.tagItems = page.locator('#tags-container .tag-item');
    this.tagLabels = page.locator('#tags-container .tag-item label');
    this.selectAllBtn = page.locator('#select-all-btn');
    this.deselectAllBtn = page.locator('#deselect-all-btn');
    this.selectedCount = page.locator('#selected-count');
    this.startBtn = page.locator('#start-quiz-btn');

    // Quiz screen
    this.quizScreen = page.locator('#quiz-screen');
    this.questionText = page.locator('#question-text');
    this.questionMeta = page.locator('#question-meta');
    this.optionsContainer = page.locator('#options-container');
    this.options = page.locator('#options-container .option-item');

    // Navigation
    this.prevBtn = page.locator('#prev-btn');
    this.nextBtn = page.locator('#next-btn');
    this.submitBtn = page.locator('#submit-btn');
    this.skipBtn = page.locator('#skip-btn');

    // Timer
    this.timer = page.locator('#quiz-timer');

    // Progress
    this.progressText = page.locator('#progress-text');
    this.progressFill = page.locator('#progress-fill');

    // Feedback modal (should NOT appear in exam mode)
    this.feedbackModal = page.locator('#feedback-modal');

    // Summary screen
    this.summaryScreen = page.locator('#summary-screen');
    this.scorePercentage = page.locator('#score-percentage');
    this.scoreCorrect = page.locator('#score-correct');
    this.scoreTotal = page.locator('#score-total');
    this.scoreTime = page.locator('#score-time');
    this.resultsList = page.locator('#results-list');
  }

  /** Navigate to exam page */
  async goto() {
    await this.page.goto('/');
    await this.tagItems.first().waitFor({ timeout: 5000 });
  }

  /** Select the first tag */
  async selectFirstTag() {
    await this.tagItems.first().click();
  }

  /** Start the exam */
  async startQuiz() {
    await this.startBtn.click();
    await this.quizScreen.waitFor({ state: 'visible', timeout: 5000 });
  }

  /** Click the first option */
  async clickFirstOption() {
    await this.options.first().click();
  }

  /** Click Next button */
  async clickNext() {
    await this.nextBtn.click();
  }

  /** Click Skip button */
  async clickSkip() {
    await this.skipBtn.click();
  }

  /** Click Previous button */
  async clickPrev() {
    await this.prevBtn.click();
  }

  /** Click Submit button */
  async clickSubmit() {
    await this.submitBtn.click();
  }

  /** Get current progress text */
  async getProgressText() {
    return this.progressText.textContent();
  }

  /** Get current question text */
  async getQuestionText() {
    return this.questionText.textContent();
  }

  /** Check if feedback modal is visible */
  async isModalVisible() {
    return this.feedbackModal.isVisible();
  }

  /** Wait for summary screen to be visible */
  async waitForSummary() {
    await this.summaryScreen.waitFor({ state: 'visible', timeout: 10000 });
  }
}
