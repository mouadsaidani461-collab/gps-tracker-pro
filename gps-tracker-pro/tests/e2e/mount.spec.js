import { test, expect } from '@playwright/test';
import { installApiMocks } from './helpers/network.js';

function isBenignConsoleError(text) {
  return /401|Unauthorized|Failed to load resource/i.test(text);
}

test.describe('App mount', () => {
  test('login page mounts without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isBenignConsoleError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await installApiMocks(page, 'loggedOut');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('#email').waitFor({ state: 'visible' });

    const rootText = await page.locator('#root').innerText();
    const title = await page.title();

    expect(title.length).toBeGreaterThan(0);
    expect(await page.getByText('تسجيل الدخول').count()).toBeGreaterThan(0);
    expect(rootText.length).toBeGreaterThan(20);
    expect(errors).toEqual([]);
  });
});
