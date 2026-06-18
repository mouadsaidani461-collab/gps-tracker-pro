/**
 * Playwright API mocks — mirrors tests/mocks/handlers.js (MSW) scenarios.
 */
import {
  mockUser,
  mockDevices,
  mockPositions,
  mockGeofences,
  mockServer,
} from '../../mocks/fixtures.js';

function apiPath(url) {
  const u = new URL(url);
  const idx = u.pathname.indexOf('/api');
  return idx >= 0 ? u.pathname.slice(idx) : u.pathname;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {'loggedOut'|'loggedIn'|'totpRequired'|'invalidLogin'} scenario
 */
export async function installApiMocks(page, scenario = 'loggedIn') {
  let sessionUser = scenario === 'loggedIn' ? { ...mockUser } : null;
  let totpPending = scenario === 'totpRequired';
  let geofences = [...mockGeofences];

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = apiPath(req.url());
    const method = req.method();

    if (path.includes('/api/socket')) {
      await route.abort();
      return;
    }

    if (path === '/api/_csrf-bootstrap') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (path === '/api/session' && method === 'GET') {
      if (!sessionUser) {
        await route.fulfill({ status: 401, body: '' });
        return;
      }
      await route.fulfill({ json: sessionUser });
      return;
    }

    if (path === '/api/session' && method === 'POST') {
      const body = req.postData() ?? '';
      const params = new URLSearchParams(body);
      const email = params.get('email');
      const password = params.get('password');
      const code = params.get('code');

      if (scenario === 'invalidLogin' || email === 'bad@test.com' || password === 'wrong') {
        await route.fulfill({ status: 401, body: 'Unauthorized' });
        return;
      }

      if (totpPending && !code) {
        await route.fulfill({
          status: 401,
          headers: { 'WWW-Authenticate': 'TOTP' },
          body: 'TOTP',
        });
        return;
      }

      if (totpPending && code !== '123456') {
        await route.fulfill({ status: 401, body: 'Invalid TOTP' });
        return;
      }

      sessionUser = { ...mockUser, email: email ?? mockUser.email };
      totpPending = false;
      await route.fulfill({ json: sessionUser });
      return;
    }

    if (path === '/api/session' && method === 'DELETE') {
      sessionUser = null;
      await route.fulfill({ status: 204 });
      return;
    }

    if (path === '/api/server') {
      await route.fulfill({ json: mockServer });
      return;
    }

    if (path === '/api/devices') {
      await route.fulfill({ json: mockDevices });
      return;
    }

    if (path === '/api/positions') {
      await route.fulfill({ json: mockPositions });
      return;
    }

    if (path === '/api/geofences' && method === 'GET') {
      await route.fulfill({ json: geofences });
      return;
    }

    if (path === '/api/geofences' && method === 'POST') {
      const payload = JSON.parse(req.postData() ?? '{}');
      const created = { id: 99, ...payload };
      geofences = [...geofences, created];
      await route.fulfill({ json: created });
      return;
    }

    if (['/api/permissions', '/api/notifications', '/api/groups', '/api/drivers', '/api/calendars'].includes(path)) {
      await route.fulfill({ json: [] });
      return;
    }

    if (path === '/api/users') {
      await route.fulfill({ json: [mockUser] });
      return;
    }

    await route.fulfill({ status: 404, body: `unmocked ${method} ${path}` });
  });
}

export async function loginViaUi(page, email = 'admin@test.com', password = 'secret123') {
  await page.goto('/login');
  await page.locator('#email').waitFor({ state: 'visible' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
}

/** Navigate to a protected route when session is already established via mocks. */
export async function gotoAuthenticated(page, path = '/dashboard') {
  await page.goto(path);
  await page.waitForURL(`**${path}`, { timeout: 15_000 });
}
