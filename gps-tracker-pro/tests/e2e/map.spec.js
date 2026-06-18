import { test, expect } from '@playwright/test';
import { installApiMocks, gotoAuthenticated } from './helpers/network.js';
import { installWebSocketMock } from './helpers/websocket-mock.js';

const TILE_STUB = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAD0lEQVQ42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function mockMapTiles(page) {
  const fulfillTile = async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/png', body: TILE_STUB });
  };
  await page.route('**/*cartocdn.com/**', fulfillTile);
  await page.route('**/*openstreetmap.org/**', fulfillTile);
  await page.route('**/*arcgisonline.com/**', fulfillTile);
}

test.describe('Map / Geofences', () => {
  test.beforeEach(async ({ page }) => {
    await installWebSocketMock(page);
    await installApiMocks(page, 'loggedIn');
    await mockMapTiles(page);
    await gotoAuthenticated(page, '/map');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20_000 });
  });

  test('load map tiles', async ({ page }) => {
    await expect.poll(async () => page.locator('.leaflet-tile').count()).toBeGreaterThan(0);
  });

  test('add geofence polygon', async ({ page }) => {
    await page.getByRole('button', { name: 'المناطق' }).click();
    await page.getByRole('button', { name: 'مضلع' }).click();
    await expect(page.getByText(/انقر لإضافة كل رأس/i)).toBeVisible();

    await page.evaluate(() => {
      document.querySelector('aside')?.style.setProperty('pointer-events', 'none');
    });

    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    expect(box).toBeTruthy();
    const clickOnMap = async (rx, ry) => {
      await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry);
    };
    await clickOnMap(0.5, 0.45);
    await clickOnMap(0.58, 0.4);
    await clickOnMap(0.54, 0.58);

    await expect(page.getByText(/انقر لإضافة نقاط المضلع.*3 نقطة/)).toBeVisible({ timeout: 5000 });
  });

  test('display vehicle markers', async ({ page }) => {
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 15_000 });
    const markerCount = await page.locator('.leaflet-marker-icon').count();
    expect(markerCount).toBeGreaterThan(0);
  });

  test('filter vehicles by status', async ({ page }) => {
    await page.getByRole('button', { name: 'المركبات' }).click();
    await page.getByRole('button', { name: 'متحرك', exact: true }).click();
    const sidebar = page.locator('aside');
    await expect(sidebar.getByText('Fleet Alpha')).toBeVisible();
    await expect(sidebar.getByText('Fleet Beta')).not.toBeVisible();
  });
});
