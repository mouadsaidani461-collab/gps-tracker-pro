/**
 * MSW handlers — shared API mocks for Vitest (msw/node) and Playwright (via network helper).
 */
import { http, HttpResponse } from 'msw';
import {
  mockUser,
  mockDevices,
  mockPositions,
  mockGeofences,
  mockServer,
} from './fixtures.js';

export function createHandlers(options = {}) {
  let sessionUser = options.sessionUser ?? null;
  let totpPending = options.totpPending ?? false;
  let geofences = [...mockGeofences];

  return [
    http.get('/api/session', () => {
      if (!sessionUser) {
        return new HttpResponse(null, { status: 401 });
      }
      return HttpResponse.json(sessionUser);
    }),

    http.post('/api/session', async ({ request }) => {
      const body = await request.text();
      const params = new URLSearchParams(body);
      const email = params.get('email');
      const password = params.get('password');
      const code = params.get('code');

      if (email === 'bad@test.com' || password === 'wrong') {
        return new HttpResponse('Unauthorized', { status: 401 });
      }

      if (totpPending && !code) {
        return new HttpResponse('TOTP', {
          status: 401,
          headers: { 'WWW-Authenticate': 'TOTP' },
        });
      }

      if (totpPending && code !== '123456') {
        return new HttpResponse('Invalid TOTP', { status: 401 });
      }

      if (email && password) {
        sessionUser = { ...mockUser, email };
        totpPending = false;
        return HttpResponse.json(sessionUser);
      }

      return new HttpResponse('Unauthorized', { status: 401 });
    }),

    http.delete('/api/session', () => {
      sessionUser = null;
      return new HttpResponse(null, { status: 204 });
    }),

    http.post('/api/_csrf-bootstrap', () => new HttpResponse(null, { status: 204 })),
    http.delete('/api/_csrf-bootstrap', () => new HttpResponse(null, { status: 204 })),

    http.get('/api/server', () => HttpResponse.json(mockServer)),

    http.get('/api/devices', () => HttpResponse.json(mockDevices)),
    http.get('/api/positions', () => HttpResponse.json(mockPositions)),

    http.get('/api/geofences', () => HttpResponse.json(geofences)),

    http.post('/api/geofences', async ({ request }) => {
      const payload = await request.json();
      const created = { id: 99, ...payload };
      geofences = [...geofences, created];
      return HttpResponse.json(created);
    }),

    http.get('/api/permissions', () => HttpResponse.json([])),
    http.get('/api/notifications', () => HttpResponse.json([])),
    http.get('/api/groups', () => HttpResponse.json([])),
    http.get('/api/drivers', () => HttpResponse.json([])),
    http.get('/api/calendars', () => HttpResponse.json([])),
    http.get('/api/users', () => HttpResponse.json([mockUser])),
  ];
}

/** Default handlers for Vitest setupServer */
export const handlers = createHandlers();
