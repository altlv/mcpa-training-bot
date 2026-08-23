import { expect } from '@playwright/test';

/**
 * Page Object for Training Mode (training.html).
 * Encapsulates all locators and actions for the training quiz flow.
 */
export class TrainingPage {
  constructor(page) {
    this.page = page;

    // Tag selection
    this.tagContainer = page.locator('#tags-container');
    this.tagItems = page.locator('#tags-container .tag-item');
    this.tagLabels = page.locator('#tags-container .tag-item label');
    this.tagSearch = page.locator('#tag-search');
    this.selectAllBtn = page.locator('#select-all-btn');
    this.deselectAllBtn = page.locator('#deselect-all-btn');
    this.selectedCount = page.locator('#selected-count');
    this.startBtn = page.locator('#start-quiz-btn');

    // Quiz area
    this.quizArea = page.locator('#quiz-area');
    this.questionText = page.locator('#question-text');
    this.questionMeta = page.locator('#question-meta');
    this.optionsContainer = page.locator('#options-container');
    this.options = page.locator('#options-container .option-item');
    this.radioOptions = page.locator('#options-container input[type="radio"]');
    this.checkboxOptions = page.locator('#options-container input[type="checkbox"]');

    // Navigation
    this.prevBtn = page.locator('#prev-btn');
    this.nextBtn = page.locator('#next-btn');
    this.submitBtn = page.locator('#submit-btn');

    // Progress
    this.progressText = page.locator('#progress-text');
    this.progressFill = page.locator('#progress-fill');

    // Feedback
    this.answerFeedback = page.locator('#answer-feedback');
    this.feedbackModal = page.locator('#feedback-modal');
    this.modalCard = page.locator('#modal-card');
    this.modalIcon = page.locator('#modal-icon');
    this.modalTitle = page.locator('#modal-title');
    this.modalCorrectAnswer = page.locator('#modal-correct-answer');
    this.modalExplanation = page.locator('#modal-explanation');
    this.modalNext = page.locator('#modal-next');
    this.modalDismiss = page.locator('#modal-dismiss');

    // Summary
    this.summaryArea = page.locator('#summary-area');
    this.scorePercentage = page.locator('#score-percentage');
    this.scoreCorrect = page.locator('#score-correct');
    this.scoreTotal = page.locator('#score-total');
  }

  /** Navigate to training page */
  async goto() {
    await this.page.goto('/training.html');
    await this.tagItems.first().waitFor({ timeout: 5000 });
  }

  /** Select the first tag in the list */
  async selectFirstTag() {
    await this.tagItems.first().click();
  }

  /** Select a tag by its label text (case-insensitive partial match) */
  async selectTagByName(name) {
    const label = this.tagLabels.filter({ hasText: new RegExp(name, 'i') });
    await label.first().click();
  }

  /** Start the quiz */
  async startQuiz() {
    await this.startBtn.click();
    await this.questionText.waitFor({ state: 'visible', timeout: 5000 });
  }

  /** Get the current question text */
  async getQuestionText() {
    return this.questionText.textContent();
  }

  /** Check if current question is single-select (radio) */
  async isSingleSelect() {
    return (await this.radioOptions.count()) > 0;
  }

  /** Check if current question is multi-select (checkbox) */
  async isMultiSelect() {
    return (await this.checkboxOptions.count()) > 0;
  }

  /** Click the first option (works for both radio and checkbox) */
  async clickFirstOption() {
    await this.options.first().click();
  }

  /** Click specific options by letter (for multi-select) */
  async clickOptionsByLetter(...letters) {
    for (const letter of letters) {
      const option = this.page.locator(
        `#options-container .option-item:has(.option-letter:text-is("${letter}"))`
      );
      await option.click();
    }
  }

  /**
   * Advance to next question: handles both single-select (click option → modal)
   * and multi-select (click option → Next button → modal).
   */
  async advanceToNextQuestion() {
    // Always click the first option to trigger the answer flow
    await this.clickFirstOption();

    if (await this.isMultiSelect()) {
      // Multi-select: need to click Next to show the modal
      await this.nextBtn.click();
    }
    // For single-select, the modal appears automatically after clicking

    await this.waitForModalVisible();
    await this.modalNext.click();
    await this.waitForModalHidden();
  }

  /** Wait for feedback modal to be visible */
  async waitForModalVisible() {
    await this.feedbackModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  /** Wait for feedback modal to be hidden */
  async waitForModalHidden() {
    await this.feedbackModal.waitFor({ state: 'hidden', timeout: 3000 });
  }

  /** Check if feedback modal is currently visible */
  async isModalVisible() {
    return this.feedbackModal.isVisible();
  }

  /** Get the modal title text */
  async getModalTitle() {
    return this.modalTitle.textContent();
  }

  /** Close modal via dismiss button (if present) */
  async dismissModal() {
    if (await this.modalDismiss.isVisible()) {
      await this.modalDismiss.click();
      await this.waitForModalHidden();
    }
  }
}
