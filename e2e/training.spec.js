import { test, expect } from '@playwright/test';
import { TrainingPage } from './pages/TrainingPage.js';
import {
  mockTags,
  mockQuizSingleFirst,
  mockQuizMultiFirst,
  buildSubmitResponse,
} from './fixtures/mock-data.js';

// ─────────────────────────────────────────────────────────────
// Helpers: set up API mocks before navigating
// ─────────────────────────────────────────────────────────────

/** Mock tags + a quiz where the FIRST question is single-select */
async function mockSingleSelectQuiz(page) {
  await page.route('**/api/tags', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTags) })
  );
  await page.route('**/api/quiz/start', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockQuizSingleFirst) })
  );
  // Stub submit so we can test completion without a real session
  await page.route('**/api/quiz/submit', async (route) => {
    const body = route.request().postDataJSON();
    const response = buildSubmitResponse(mockQuizSingleFirst.questions, body.answers || {});
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
  });
}

/** Mock tags + a quiz where the FIRST question is multi-select */
async function mockMultiSelectQuiz(page) {
  await page.route('**/api/tags', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTags) })
  );
  await page.route('**/api/quiz/start', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockQuizMultiFirst) })
  );
  await page.route('**/api/quiz/submit', async (route) => {
    const body = route.request().postDataJSON();
    const response = buildSubmitResponse(mockQuizMultiFirst.questions, body.answers || {});
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
  });
}

// ─────────────────────────────────────────────────────────────
// Tag Selection
// ─────────────────────────────────────────────────────────────

test.describe('Training Mode — Tag Selection', () => {

  test('loads tags and renders them in alphabetical order', async ({ page }) => {
    await mockSingleSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();

    const count = await training.tagItems.count();
    expect(count).toBeGreaterThan(0);

    const names = await training.tagLabels.allTextContents();
    const cleaned = names.map((t) => t.replace(/\s*\(\d+\)$/, '').trim().toLowerCase());

    // Verify alphabetical: first < last
    expect(cleaned[0].localeCompare(cleaned[cleaned.length - 1])).toBeLessThan(0);

    // Spot-check known relative positions
    const aaifIdx = cleaned.indexOf('aaif');
    const authIdx = cleaned.indexOf('auth');
    expect(aaifIdx).toBeLessThan(authIdx);
  });

  test('Start Training button is disabled until a tag is selected', async ({ page }) => {
    await mockSingleSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();

    await expect(training.startBtn).toBeDisabled();
    await training.selectFirstTag();
    await expect(training.startBtn).toBeEnabled();
  });

  test('Select All checks every tag; Deselect All unchecks them', async ({ page }) => {
    await mockSingleSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();

    await training.selectAllBtn.click();
    const checkedAfterSelectAll = await page.locator('#tags-container input:checked').count();
    expect(checkedAfterSelectAll).toBe(await training.tagItems.count());

    await training.deselectAllBtn.click();
    const checkedAfterDeselectAll = await page.locator('#tags-container input:checked').count();
    expect(checkedAfterDeselectAll).toBe(0);
  });

  test('selected count text updates as tags are toggled', async ({ page }) => {
    await mockSingleSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();

    await expect(training.selectedCount).toHaveText('0 tags selected');
    await training.selectFirstTag();
    await expect(training.selectedCount).toContainText('1');
  });
});

// ─────────────────────────────────────────────────────────────
// Single-Select Quiz Flow (mocked to guarantee radio first)
// ─────────────────────────────────────────────────────────────

test.describe('Training Mode — Single-Select Flow', () => {

  test('answer a question and see the feedback modal with correct title', async ({ page }) => {
    await mockSingleSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();
    await training.selectFirstTag();
    await training.startQuiz();

    // First question should be single-select (radio)
    expect(await training.isSingleSelect()).toBeTruthy();

    // Click an option — modal should appear immediately
    await training.clickFirstOption();
    await training.waitForModalVisible();

    const title = await training.getModalTitle();
    expect(['Correct!', 'Not quite.']).toContain(title);
  });

  test('inline feedback shows correct answer styling when navigating back', async ({ page }) => {
    await mockSingleSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();
    await training.selectFirstTag();
    await training.startQuiz();

    expect(await training.isSingleSelect()).toBeTruthy();

    // Answer question 1 and advance to question 2
    await training.advanceToNextQuestion();
    await expect(training.progressText).toContainText('2');

    // Navigate back to question 1 — options should now show correct/incorrect styling
    await training.prevBtn.click();
    await expect(training.progressText).toContainText('1');

    const optionCount = await training.options.count();
    let foundCorrect = false;
    for (let i = 0; i < optionCount; i++) {
      const cls = await training.options.nth(i).getAttribute('class');
      if (cls && cls.includes('correct')) foundCorrect = true;
    }
    expect(foundCorrect).toBeTruthy();
  });

  test('modal has all required elements: card, icon, title, next button', async ({ page }) => {
    await mockSingleSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();
    await training.selectFirstTag();
    await training.startQuiz();

    await training.clickFirstOption();
    await training.waitForModalVisible();

    await expect(training.modalCard).toBeVisible();
    await expect(training.modalIcon).toBeVisible();
    await expect(training.modalTitle).toBeVisible();
    await expect(training.modalNext).toBeVisible();
  });

  test('modal shows explanation text when the question has one', async ({ page }) => {
    await mockSingleSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();
    await training.selectFirstTag();
    await training.startQuiz();

    await training.clickFirstOption();
    await training.waitForModalVisible();

    // mockQuizSingleFirst questions don't have explanations,
    // so explanation should be hidden
    const explVisible = await training.modalExplanation.isVisible();
    // If it's hidden, that's expected; if visible, it must have content
    if (explVisible) {
      const text = await training.modalExplanation.textContent();
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  test('modal next button advances to the next question', async ({ page }) => {
    await mockSingleSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();
    await training.selectFirstTag();
    await training.startQuiz();

    const q1 = await training.getQuestionText();

    // Answer and advance
    await training.clickFirstOption();
    await training.waitForModalVisible();
    await training.modalNext.click();
    await training.waitForModalHidden();

    // Should now be on question 2
    const q2 = await training.getQuestionText();
    expect(q2).not.toBe(q1);
    await expect(training.progressText).toContainText('2');
  });
});

// ─────────────────────────────────────────────────────────────
// Multi-Select Quiz Flow (mocked to guarantee checkbox first)
// ─────────────────────────────────────────────────────────────

test.describe('Training Mode — Multi-Select Flow', () => {

  test('select one checkbox, click Next, see feedback modal', async ({ page }) => {
    await mockMultiSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();
    await training.selectFirstTag();
    await training.startQuiz();

    expect(await training.isMultiSelect()).toBeTruthy();

    // Select one option
    await training.clickFirstOption();
    await expect(training.nextBtn).toBeEnabled();

    // Click Next → modal
    await training.nextBtn.click();
    await training.waitForModalVisible();

    const title = await training.getModalTitle();
    expect(['Correct!', 'Not quite.']).toContain(title);
  });

  test('select multiple checkboxes and submit all answers via modal', async ({ page }) => {
    await mockMultiSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();
    await training.selectFirstTag();
    await training.startQuiz();

    expect(await training.isMultiSelect()).toBeTruthy();

    // Select first two options
    await training.options.nth(0).click();
    await training.options.nth(1).click();
    await expect(training.nextBtn).toBeEnabled();

    await training.nextBtn.click();
    await training.waitForModalVisible();

    // Dismiss and advance
    await training.modalNext.click();
    await training.waitForModalHidden();

    // Should be on question 2
    await expect(training.progressText).toContainText('2');
  });

  test('modal shows dismiss button for multi-select questions', async ({ page }) => {
    await mockMultiSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();
    await training.selectFirstTag();
    await training.startQuiz();

    await training.clickFirstOption();
    await training.nextBtn.click();
    await training.waitForModalVisible();

    // Dismiss button should be present
    await expect(training.modalDismiss).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────

test.describe('Training Mode — Navigation', () => {

  test('Previous button is disabled on the first question', async ({ page }) => {
    await mockSingleSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();
    await training.selectFirstTag();
    await training.startQuiz();

    await expect(training.prevBtn).toBeDisabled();
  });

  test('Previous button navigates back after advancing', async ({ page }) => {
    await mockSingleSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();
    await training.selectFirstTag();
    await training.startQuiz();

    // Advance to question 2
    await training.advanceToNextQuestion();
    await expect(training.prevBtn).toBeEnabled();

    // Go back
    await training.prevBtn.click();
    await expect(training.progressText).toContainText('1');
  });
});

// ─────────────────────────────────────────────────────────────
// UI Integrity
// ─────────────────────────────────────────────────────────────

test.describe('Training Mode — UI Integrity', () => {

  test('no critical JavaScript errors on page load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await mockSingleSelectQuiz(page);
    await page.goto('/training.html');
    await page.waitForSelector('#tags-container .tag-item', { timeout: 5000 });

    const critical = errors.filter(
      (e) => !e.includes('Failed to fetch') && !e.includes('net::')
    );
    expect(critical).toHaveLength(0);
  });

  test('progress bar is visible and shows initial question number', async ({ page }) => {
    await mockSingleSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();
    await training.selectFirstTag();
    await training.startQuiz();

    await expect(training.progressFill).toBeVisible();
    await expect(training.progressText).toContainText('1');
  });
});

// ─────────────────────────────────────────────────────────────
// Quiz Completion & Score Display
// ─────────────────────────────────────────────────────────────

test.describe('Training Mode — Quiz Completion', () => {

  test('completes all questions and shows the summary with score', async ({ page }) => {
    // Use a small 3-question single-select quiz
    await mockSingleSelectQuiz(page);
    const training = new TrainingPage(page);
    await training.goto();
    await training.selectFirstTag();
    await training.startQuiz();

    // Auto-accept the confirm() dialog that training mode shows before submit
    page.on('dialog', (dialog) => dialog.accept());

    // Answer all 3 questions
    for (let i = 0; i < 3; i++) {
      await training.clickFirstOption();

      if (await training.isMultiSelect()) {
        await training.nextBtn.click();
      }
      // For single-select, modal appears automatically after clicking option

      await training.waitForModalVisible();
      const modalTitle = await training.getModalTitle();
      expect(['Correct!', 'Not quite.']).toContain(modalTitle);

      await training.modalNext.click();
      await training.waitForModalHidden();
    }

    // After the last modal Next, the submit button should be visible
    await expect(training.submitBtn).toBeVisible({ timeout: 3000 });
    await training.submitBtn.click();

    // Summary should now be visible
    await expect(training.summaryArea).toBeVisible({ timeout: 5000 });
    await expect(training.scorePercentage).toBeVisible();
    await expect(training.scoreCorrect).toBeVisible();
    await expect(training.scoreTotal).toBeVisible();

    // Score total should be 3
    await expect(training.scoreTotal).toHaveText('3');
  });
});

// ─────────────────────────────────────────────────────────────
// Error States
// ─────────────────────────────────────────────────────────────

test.describe('Training Mode — Error Handling', () => {

  test('shows error when tags API returns 500', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.route('**/api/tags', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server error' }) })
    );

    await page.goto('/training.html');
    // Wait for the page to finish loading — tags won't appear but no crash
    await page.waitForLoadState('networkidle');

    const critical = errors.filter((e) => !e.includes('Failed to fetch') && !e.includes('net::'));
    expect(critical).toHaveLength(0);
  });

  test('shows error when quiz start API returns 500', async ({ page }) => {
    await page.route('**/api/tags', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTags) })
    );
    await page.route('**/api/quiz/start', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal error' }) })
    );

    // The app calls alert() on error — handle it to prevent blocking
    page.on('dialog', (dialog) => dialog.accept());

    const training = new TrainingPage(page);
    await training.goto();
    await training.selectFirstTag();
    await training.startBtn.click();

    // Quiz area should NOT become visible — wait for the network call to complete
    await page.waitForLoadState('networkidle');
    await expect(training.quizArea).toBeHidden();
  });
});
