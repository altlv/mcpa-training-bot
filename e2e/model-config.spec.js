// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Model Configuration', () => {

  test.describe('GET /api/models/status', () => {
    test('returns status for all providers', async ({ request }) => {
      const res = await request.get('/api/models/status');
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data).toHaveProperty('activeProvider');
      expect(data).toHaveProperty('activeModel');
      expect(data).toHaveProperty('providers');

      const providers = data.providers;
      expect(providers).toHaveProperty('openai');
      expect(providers).toHaveProperty('openrouter');
      expect(providers).toHaveProperty('groq');
      expect(providers).toHaveProperty('xai');
      expect(providers).toHaveProperty('ollama');

      // Each provider has required fields
      for (const [name, info] of Object.entries(providers)) {
        expect(info).toHaveProperty('name');
        expect(info).toHaveProperty('icon');
        expect(info).toHaveProperty('model');
        expect(info).toHaveProperty('isActive');
        expect(info).toHaveProperty('keyDefined');
        expect(info).toHaveProperty('status');
        expect(['available', 'rate_limited', 'error', 'missing']).toContain(info.status);
      }
    });

    test('exactly one provider is active', async ({ request }) => {
      const res = await request.get('/api/models/status');
      const data = await res.json();
      const activeCount = Object.values(data.providers).filter(p => p.isActive).length;
      expect(activeCount).toBe(1);
    });

    test('active provider matches activeProvider field', async ({ request }) => {
      const res = await request.get('/api/models/status');
      const data = await res.json();
      expect(data.providers[data.activeProvider].isActive).toBe(true);
    });

    test('missing keys show missing status', async ({ request }) => {
      const res = await request.get('/api/models/status');
      const data = await res.json();
      // Without .env keys set, providers should be missing
      for (const [name, info] of Object.entries(data.providers)) {
        if (info.keyDefined === false) {
          expect(info.status).toBe('missing');
        }
      }
    });

    test('each provider has a model name', async ({ request }) => {
      const res = await request.get('/api/models/status');
      const data = await res.json();
      for (const [name, info] of Object.entries(data.providers)) {
        expect(typeof info.model).toBe('string');
        expect(info.model.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('GET /api/models/config', () => {
    test('returns config summary without keys', async ({ request }) => {
      const res = await request.get('/api/models/config');
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data).toHaveProperty('activeProvider');
      expect(data).toHaveProperty('activeModel');
      expect(data).toHaveProperty('providers');
      // Should NOT contain any API keys
      const text = JSON.stringify(data);
      expect(text).not.toContain('api_key');
      expect(text).not.toContain('API_KEY');
    });

    test('lists all providers with keyDefined flag', async ({ request }) => {
      const res = await request.get('/api/models/config');
      const data = await res.json();
      expect(Array.isArray(data.providers)).toBe(true);
      expect(data.providers.length).toBe(5);
      for (const p of data.providers) {
        expect(p).toHaveProperty('name');
        expect(p).toHaveProperty('keyDefined');
        expect(typeof p.keyDefined).toBe('boolean');
      }
    });
  });

  test.describe('POST /api/models/validate/:provider', () => {
    test('validates a specific provider', async ({ request }) => {
      const res = await request.post('/api/models/validate/ollama');
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data).toHaveProperty('status');
      expect(['available', 'rate_limited', 'error', 'missing']).toContain(data.status);
      expect(data).toHaveProperty('model');
    });

    test('returns error for unknown provider', async ({ request }) => {
      const res = await request.post('/api/models/validate/nonexistent');
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.status).toBe('error');
    });
  });

  test.describe('GET /api/chat/provider', () => {
    test('returns provider info', async ({ request }) => {
      const res = await request.get('/api/chat/provider');
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data).toHaveProperty('available');
      expect(data).toHaveProperty('provider');
      expect(data).toHaveProperty('model');
      expect(data).toHaveProperty('providerName');
      expect(typeof data.available).toBe('boolean');
      expect(typeof data.provider).toBe('string');
    });
  });

  test.describe('Model selector UI on training page', () => {
    test('model selector is visible in chat header', async ({ page }) => {
      await page.goto('/training.html');
      await page.waitForLoadState('domcontentloaded');

      const selector = page.locator('#model-selector');
      await expect(selector).toBeVisible();

      const select = page.locator('#model-select');
      await expect(select).toBeVisible();

      const dot = page.locator('#model-status-dot');
      await expect(dot).toBeVisible();
    });

    test('model dropdown is populated after page load', async ({ page }) => {
      await page.goto('/training.html');
      await page.waitForLoadState('domcontentloaded');

      // Wait for model status to load
      const select = page.locator('#model-select');
      await expect(select).toBeVisible();

      // Wait for options to be populated (not just the loading placeholder)
      await page.waitForFunction(() => {
        const sel = document.getElementById('model-select');
        return sel && sel.options.length >= 5;
      }, { timeout: 5000 });

      const options = await select.locator('option').allTextContents();
      expect(options.length).toBeGreaterThanOrEqual(5);
    });

    test('status dot has a valid status class', async ({ page }) => {
      await page.goto('/training.html');
      await page.waitForLoadState('domcontentloaded');

      const dot = page.locator('#model-status-dot');
      await expect(dot).toBeVisible();

      // Wait for status to be set
      await page.waitForFunction(() => {
        const d = document.getElementById('model-status-dot');
        return d && d.className.includes('model-status-dot');
      }, { timeout: 5000 });

      const className = await dot.getAttribute('class');
      expect(className).toMatch(/model-status-dot (available|rate_limited|error|missing)/);
    });

    test('no JavaScript errors from model loading', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto('/training.html');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Filter out expected network errors (Ollama not running)
      const criticalErrors = errors.filter(e =>
        !e.includes('fetch') && !e.includes('ECONNREFUSED') && !e.includes('Failed to load')
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe('API mocking for provider statuses', () => {
    test('mock: openai available shows green dot', async ({ page }) => {
      await page.route('**/api/models/status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            activeProvider: 'openai',
            activeModel: 'gpt-4o-mini',
            providers: {
              openai: { name: 'OpenAI', icon: '🟢', model: 'gpt-4o-mini', isActive: true, keyDefined: true, status: 'available' },
              openrouter: { name: 'OpenRouter', icon: '🔀', model: 'llama-3.3-70b', isActive: false, keyDefined: false, status: 'missing' },
              groq: { name: 'Groq', icon: '⚡', model: 'llama-3.3-70b', isActive: false, keyDefined: false, status: 'missing' },
              xai: { name: 'xAI', icon: '🤖', model: 'grok-3-mini', isActive: false, keyDefined: false, status: 'missing' },
              ollama: { name: 'Ollama', icon: '🏠', model: 'llama3.2', isActive: false, keyDefined: false, status: 'missing' },
            }
          })
        });
      });

      await page.goto('/training.html');
      await page.waitForLoadState('domcontentloaded');

      const dot = page.locator('#model-status-dot');
      await expect(dot).toHaveClass(/available/, { timeout: 5000 });
      await expect(dot).toHaveCSS('background-color', 'rgb(76, 175, 80)');
    });

    test('mock: openai rate limited shows orange dot', async ({ page }) => {
      await page.route('**/api/models/status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            activeProvider: 'openai',
            activeModel: 'gpt-4o-mini',
            providers: {
              openai: { name: 'OpenAI', icon: '🟢', model: 'gpt-4o-mini', isActive: true, keyDefined: true, status: 'rate_limited', error: 'Rate limit exceeded' },
              openrouter: { name: 'OpenRouter', icon: '🔀', model: 'llama-3.3-70b', isActive: false, keyDefined: false, status: 'missing' },
              groq: { name: 'Groq', icon: '⚡', model: 'llama-3.3-70b', isActive: false, keyDefined: false, status: 'missing' },
              xai: { name: 'xAI', icon: '🤖', model: 'grok-3-mini', isActive: false, keyDefined: false, status: 'missing' },
              ollama: { name: 'Ollama', icon: '🏠', model: 'llama3.2', isActive: false, keyDefined: false, status: 'missing' },
            }
          })
        });
      });

      await page.goto('/training.html');
      await page.waitForLoadState('domcontentloaded');

      const dot = page.locator('#model-status-dot');
      await expect(dot).toHaveClass(/rate_limited/, { timeout: 5000 });
    });

    test('mock: openai key invalid shows red dot', async ({ page }) => {
      await page.route('**/api/models/status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            activeProvider: 'openai',
            activeModel: 'gpt-4o-mini',
            providers: {
              openai: { name: 'OpenAI', icon: '🟢', model: 'gpt-4o-mini', isActive: true, keyDefined: true, status: 'error', error: 'Invalid API key' },
              openrouter: { name: 'OpenRouter', icon: '🔀', model: 'llama-3.3-70b', isActive: false, keyDefined: false, status: 'missing' },
              groq: { name: 'Groq', icon: '⚡', model: 'llama-3.3-70b', isActive: false, keyDefined: false, status: 'missing' },
              xai: { name: 'xAI', icon: '🤖', model: 'grok-3-mini', isActive: false, keyDefined: false, status: 'missing' },
              ollama: { name: 'Ollama', icon: '🏠', model: 'llama3.2', isActive: false, keyDefined: false, status: 'missing' },
            }
          })
        });
      });

      await page.goto('/training.html');
      await page.waitForLoadState('domcontentloaded');

      const dot = page.locator('#model-status-dot');
      await expect(dot).toHaveClass(/error/, { timeout: 5000 });
    });

    test('mock: all providers missing shows gray dot', async ({ page }) => {
      await page.route('**/api/models/status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            activeProvider: 'none',
            activeModel: null,
            providers: {
              openai: { name: 'OpenAI', icon: '🟢', model: 'gpt-4o-mini', isActive: false, keyDefined: false, status: 'missing' },
              openrouter: { name: 'OpenRouter', icon: '🔀', model: 'llama-3.3-70b', isActive: false, keyDefined: false, status: 'missing' },
              groq: { name: 'Groq', icon: '⚡', model: 'llama-3.3-70b', isActive: false, keyDefined: false, status: 'missing' },
              xai: { name: 'xAI', icon: '🤖', model: 'grok-3-mini', isActive: false, keyDefined: false, status: 'missing' },
              ollama: { name: 'Ollama', icon: '🏠', model: 'llama3.2', isActive: false, keyDefined: false, status: 'missing' },
            }
          })
        });
      });

      await page.goto('/training.html');
      await page.waitForLoadState('domcontentloaded');

      const dot = page.locator('#model-status-dot');
      await expect(dot).toHaveClass(/missing/, { timeout: 5000 });
    });

    test('mock: dropdown shows all providers with correct selection', async ({ page }) => {
      await page.route('**/api/models/status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            activeProvider: 'groq',
            activeModel: 'llama-3.3-70b-versatile',
            providers: {
              openai: { name: 'OpenAI', icon: '🟢', model: 'gpt-4o-mini', isActive: false, keyDefined: true, status: 'available' },
              openrouter: { name: 'OpenRouter', icon: '🔀', model: 'llama-3.3-70b', isActive: false, keyDefined: false, status: 'missing' },
              groq: { name: 'Groq', icon: '⚡', model: 'llama-3.3-70b-versatile', isActive: true, keyDefined: true, status: 'available' },
              xai: { name: 'xAI', icon: '🤖', model: 'grok-3-mini', isActive: false, keyDefined: false, status: 'missing' },
              ollama: { name: 'Ollama', icon: '🏠', model: 'llama3.2', isActive: false, keyDefined: false, status: 'missing' },
            }
          })
        });
      });

      await page.goto('/training.html');
      await page.waitForLoadState('domcontentloaded');

      const select = page.locator('#model-select');
      await page.waitForFunction(() => {
        const sel = document.getElementById('model-select');
        return sel && sel.options.length >= 5;
      }, { timeout: 5000 });

      // Groq should be selected
      const selectedValue = await select.inputValue();
      expect(selectedValue).toBe('groq');

      // Missing providers should be disabled
      const openrouter = select.locator('option[value="openrouter"]');
      await expect(openrouter).toBeDisabled();
      const xai = select.locator('option[value="xai"]');
      await expect(xai).toBeDisabled();

      // Available providers should be enabled
      const openai = select.locator('option[value="openai"]');
      await expect(openai).toBeEnabled();
    });
  });
});
