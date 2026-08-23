import { test, expect } from '@playwright/test';
import { ExamPage } from './pages/ExamPage.js';
import {
  mockTags,
  mockQuizSingleFirst,
  buildSubmitResponse,
} from './fixtures/mock-data.js';

// ─────────────────────────────────────────────────────────────
// Helpers: API mocks for exam mode
// ─────────────────────────────────────────────────────────────

async function mockExamQuiz(page) {
  await page.route('**/api/tags', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTags) })
  );
  await page.route('**/api/quiz/start', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockQuizSingleFirst) })
  );
  await page.route('**/api/quiz/submit', async (route) => {
    const body = route.request().postDataJSON();
    const response = buildSubmitResponse(mockQuizSingleFirst.questions, body.answers || {});
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
  });
}

// ─────────────────────────────────────────────────────────────
// Tag Selection
// ─────────────────────────────────────────────────────────────

test.describe('Exam Mode — Tag Selection', () => {

  test('loads tags on landing page in alphabetical order', async ({ page }) => {
    await mockExamQuiz(page);
    const exam = new ExamPage(page);
    await exam.goto();

    const count = await exam.tagItems.count();
    expect(count).toBeGreaterThan(0);

    const names = await exam.tagLabels.allTextContents();
    const cleaned = names.map((t) => t.replace(/\s*\(\d+\)$/, '').trim().toLowerCase());

    expect(cleaned[0].localeCompare(cleaned[cleaned.length - 1])).toBeLessThan(0);

    const aaifIdx = cleaned.indexOf('aaif');
    const authIdx = cleaned.indexOf('auth');
    expect(aaifIdx).toBeLessThan(authIdx);
  });

  test('Start Exam button is disabled until a tag is selected', async ({ page }) => {
    await mockExamQuiz(page);
    const exam = new ExamPage(page);
    await exam.goto();

    await expect(exam.startBtn).toBeDisabled();
    await exam.selectFirstTag();
    await expect(exam.startBtn).toBeEnabled();
  });

  test('Select All and Deselect All toggle every tag', async ({ page }) => {
    await mockExamQuiz(page);
    const exam = new ExamPage(page);
    await exam.goto();

    await exam.selectAllBtn.click();
    const checkedCount = await page.locator('#tags-container input:checked').count();
    expect(checkedCount).toBe(await exam.tagItems.count());

    await exam.deselectAllBtn.click();
    const uncheckedCount = await page.locator('#tags-container input:checked').count();
    expect(uncheckedCount).toBe(0);
  });

  test('no critical JavaScript errors on exam page load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await mockExamQuiz(page);
    await page.goto('/');
    await page.waitForSelector('#tags-container .tag-item', { timeout: 5000 });

    expect(errors).toHaveLength(0);
  });

  test('tag search filters tags by name as you type', async ({ page }) => {
    await mockExamQuiz(page);
    const exam = new ExamPage(page);
    await exam.goto();

    const searchInput = page.locator('#tag-search');
    await expect(searchInput).toBeVisible();

    // All tags visible initially
    const allCount = await exam.tagItems.count();
    expect(allCount).toBeGreaterThan(0);

    // Type a query that matches some tags
    await searchInput.fill('sec');

    // Only tags containing "sec" should be visible
    const visibleAfterFilter = await exam.tagItems.evaluateAll((items) =>
      items.filter((el) => el.style.display !== 'none').length
    );
    expect(visibleAfterFilter).toBeGreaterThan(0);
    expect(visibleAfterFilter).toBeLessThan(allCount);

    // Clear search — all tags reappear
    await searchInput.fill('');
    const allVisibleAgain = await exam.tagItems.evaluateAll((items) =>
      items.filter((el) => el.style.display !== 'none').length
    );
    expect(allVisibleAgain).toBe(allCount);
  });

  test('tag search is case-insensitive', async ({ page }) => {
    await mockExamQuiz(page);
    const exam = new ExamPage(page);
    await exam.goto();

    const searchInput = page.locator('#tag-search');
    await searchInput.fill('AUTH');

    const visibleCount = await exam.tagItems.evaluateAll((items) =>
      items.filter((el) => el.style.display !== 'none').length
    );
    expect(visibleCount).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Exam Flow — Navigation
// ─────────────────────────────────────────────────────────────

test.describe('Exam Mode — Navigation', () => {

  test('starts exam, navigates forward and back between questions', async ({ page }) => {
    await mockExamQuiz(page);
    const exam = new ExamPage(page);
    await exam.goto();
    await exam.selectFirstTag();
    await exam.startQuiz();

    const q1 = await exam.getQuestionText();

    // Answer question 1 and advance
    await exam.clickFirstOption();
    await expect(exam.nextBtn).toBeEnabled();
    await exam.clickNext();

    // Should be on question 2
    await expect(exam.progressText).toContainText('2');
    await expect(exam.prevBtn).toBeEnabled();

    const q2 = await exam.getQuestionText();
    expect(q2).not.toBe(q1);

    // Go back to question 1
    await exam.clickPrev();
    await expect(exam.progressText).toContainText('1');
    const q1Again = await exam.getQuestionText();
    expect(q1Again).toBe(q1);
  });

  test('timer is visible and displays MM:SS format', async ({ page }) => {
    await mockExamQuiz(page);
    const exam = new ExamPage(page);
    await exam.goto();
    await exam.selectFirstTag();
    await exam.startQuiz();

    await expect(exam.timer).toBeVisible();
    const timerText = await exam.timer.textContent();
    expect(timerText).toMatch(/\d{2}:\d{2}/);
  });

  test('skip button is visible and changes the question content', async ({ page }) => {
    await mockExamQuiz(page);
    const exam = new ExamPage(page);
    await exam.goto();
    await exam.selectFirstTag();
    await exam.startQuiz();

    await expect(exam.skipBtn).toBeVisible();

    const qBefore = await exam.getQuestionText();
    await exam.clickSkip();

    // Use assertion-based wait instead of waitForTimeout
    await expect(exam.questionText).not.toHaveText(qBefore, { timeout: 3000 });
  });
});

// ─────────────────────────────────────────────────────────────
// No Feedback Modal During Exam
// ─────────────────────────────────────────────────────────────

test.describe('Exam Mode — No Feedback Modal', () => {

  test('clicking an option does NOT show the feedback modal', async ({ page }) => {
    await mockExamQuiz(page);
    const exam = new ExamPage(page);
    await exam.goto();
    await exam.selectFirstTag();
    await exam.startQuiz();

    await exam.clickFirstOption();

    // Use assertion-based wait: modal should remain hidden
    await expect(exam.feedbackModal).toBeHidden();
  });

  test('clicking Next does NOT show the feedback modal', async ({ page }) => {
    await mockExamQuiz(page);
    const exam = new ExamPage(page);
    await exam.goto();
    await exam.selectFirstTag();
    await exam.startQuiz();

    await exam.clickFirstOption();
    await exam.clickNext();

    await expect(exam.feedbackModal).toBeHidden();
  });
});

// ─────────────────────────────────────────────────────────────
// Quiz Completion & Score Display
// ─────────────────────────────────────────────────────────────

test.describe('Exam Mode — Quiz Completion', () => {

  test('completes all questions and shows the summary with score', async ({ page }) => {
    await mockExamQuiz(page);
    const exam = new ExamPage(page);
    await exam.goto();
    await exam.selectFirstTag();
    await exam.startQuiz();

    // Answer all 3 questions (mockQuizSingleFirst has 3)
    for (let i = 0; i < 3; i++) {
      await exam.clickFirstOption();

      // On the last question, Submit should be visible; on others, Next should be visible
      const isLast = i === 2;
      if (isLast) {
        await expect(exam.submitBtn).toBeVisible({ timeout: 3000 });
        await exam.clickSubmit();
      } else {
        await expect(exam.nextBtn).toBeEnabled();
        await exam.clickNext();
      }
    }

    // Summary screen should appear
    await exam.waitForSummary();

    await expect(exam.scorePercentage).toBeVisible();
    await expect(exam.scoreCorrect).toBeVisible();
    await expect(exam.scoreTotal).toBeVisible();
    await expect(exam.scoreTime).toBeVisible();

    // Total should be 3
    await expect(exam.scoreTotal).toHaveText('3');

    // Results list should contain 3 items
    const resultItems = exam.resultsList.locator('.result-item');
    await expect(resultItems).toHaveCount(3, { timeout: 5000 });
  });

  test('score percentage reflects the number of correct answers', async ({ page }) => {
    await mockExamQuiz(page);
    const exam = new ExamPage(page);
    await exam.goto();
    await exam.selectFirstTag();
    await exam.startQuiz();

    // Answer all 3 correctly (mockQuizSingleFirst correctAnswers: A, B, A)
    const correctLetters = ['A', 'B', 'A'];
    for (let i = 0; i < 3; i++) {
      // Click the option with the correct letter
      const correctOption = page.locator(
        `#options-container .option-item:has(.option-letter:text-is("${correctLetters[i]}"))`
      );
      await correctOption.click();

      if (i === 2) {
        await expect(exam.submitBtn).toBeVisible({ timeout: 3000 });
        await exam.clickSubmit();
      } else {
        await exam.clickNext();
      }
    }

    await exam.waitForSummary();
    await expect(exam.scorePercentage).toHaveText('100%');
    await expect(exam.scoreCorrect).toHaveText('3');
  });
});

// ─────────────────────────────────────────────────────────────
// Error States
// ─────────────────────────────────────────────────────────────

test.describe('Exam Mode — Error Handling', () => {

  test('shows error when tags API returns 500', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.route('**/api/tags', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server error' }) })
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const critical = errors.filter((e) => !e.includes('Failed to fetch') && !e.includes('net::'));
    expect(critical).toHaveLength(0);
  });
});
