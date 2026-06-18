import { test, expect } from '@playwright/test';
import { installApiMocks, gotoAuthenticated } from './helpers/network.js';
import { installWebSocketMock, getMockSockets } from './helpers/websocket-mock.js';

test.describe('WebSocket / SocketContext', () => {
  test.beforeEach(async ({ page }) => {
    await installWebSocketMock(page);
    await installApiMocks(page, 'loggedIn');
    await gotoAuthenticated(page, '/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect.poll(async () => (await getMockSockets(page)).length).toBeGreaterThan(0);
  });

  test('reconnect after disconnect', async ({ page }) => {
    const socketsBefore = await getMockSockets(page);
    expect(socketsBefore.length).toBeGreaterThan(0);

    await page.evaluate(() => {
      const s = window.__mockSockets.at(-1);
      s.simulateClose(1006);
    });

    await page.waitForTimeout(3200);

    const socketsAfter = await getMockSockets(page);
    expect(socketsAfter.length).toBeGreaterThan(socketsBefore.length);
  });

  test('cleanup on unmount', async ({ page }) => {
    await expect.poll(async () => (await getMockSockets(page)).length).toBeGreaterThan(0);
    const lastIdx = (await getMockSockets(page)).length - 1;

    await page.getByRole('button', { name: /Admin/i }).click();
    await page.getByRole('button', { name: 'تسجيل الخروج' }).click();
    await expect(page).toHaveURL(/\/login/);

    await expect.poll(async () => page.evaluate((idx) => {
      const socket = window.__mockSockets?.[idx];
      return socket?.readyState === 3;
    }, lastIdx)).toBe(true);
  });

  test('receive vehicle position update', async ({ page }) => {
    await page.goto('/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20_000 });

    await page.evaluate(() => {
      const socket = window.__mockSockets?.at(-1);
      socket?.simulateMessage({
        positions: [{
          id: 101,
          deviceId: 1,
          latitude: 33.6,
          longitude: -7.6,
          speed: 55,
          course: 180,
          valid: true,
          fixTime: new Date().toISOString(),
        }],
      });
    });

    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 15_000 });
  });
});
