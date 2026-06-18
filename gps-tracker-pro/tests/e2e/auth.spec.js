import { test, expect } from '@playwright/test';
import { installApiMocks, loginViaUi } from './helpers/network.js';

test.describe('Auth / Login', () => {
  test('login with valid credentials', async ({ page }) => {
    await installApiMocks(page, 'loggedOut');
    await loginViaUi(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Admin')).toBeVisible();
  });

  test('login with invalid credentials', async ({ page }) => {
    await installApiMocks(page, 'invalidLogin');
    await page.goto('/login');
    await page.locator('#email').fill('bad@test.com');
    await page.locator('#password').fill('wrong12');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/البريد الإلكتروني أو كلمة المرور غير صحيحة/)).toBeVisible();
  });

  test('logout clears session', async ({ page }) => {
    await installApiMocks(page, 'loggedOut');
    await loginViaUi(page);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('button', { name: /Admin/i }).click();
    await page.getByRole('button', { name: 'تسجيل الخروج' }).click();

    await expect(page).toHaveURL(/\/login/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('2FA login flow', async ({ page }) => {
    await installApiMocks(page, 'totpRequired');
    await loginViaUi(page);
    await expect(page).toHaveURL(/\/login\/totp/);

    await page.getByLabel('رمز المصادقة الثنائية (2FA)').fill('123456');
    await page.getByRole('button', { name: 'تحقق' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
