// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act, cleanup } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../src/context/AuthContext.jsx';
import { LocaleProvider } from '../../src/context/LocaleContext.jsx';

const sessionMocks = vi.hoisted(() => ({
  get: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../src/services/traccarApi.js', () => ({
  sessionApi: {
    get: (...args) => sessionMocks.get(...args),
    login: (...args) => sessionMocks.login(...args),
    logout: (...args) => sessionMocks.logout(...args),
  },
  userApi: { get: vi.fn(), update: vi.fn() },
}));

vi.mock('../../src/utils/csrf.js', () => ({
  initCsrfToken: vi.fn(async () => 'token'),
  clearCsrfToken: vi.fn(async () => {}),
  getCsrfHeaders: vi.fn(() => ({})),
}));

function AuthProbe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="auth">{auth.isAuthenticated ? 'in' : 'out'}</span>
      <span data-testid="totp">{auth.needsTotpVerification ? 'yes' : 'no'}</span>
      <button type="button" onClick={() => auth.login('a@test.com', 'pass')}>login</button>
      <button type="button" onClick={() => auth.verifyTotp('123456')}>verify</button>
      <button type="button" onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

function renderAuth() {
  return render(
    <LocaleProvider>
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    </LocaleProvider>,
  );
}

describe('AuthContext login flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMocks.get.mockRejectedValue(new Error('no session'));
    sessionMocks.logout.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it('login with valid credentials', async () => {
    sessionMocks.login.mockResolvedValue({
      id: 1, email: 'a@test.com', name: 'Admin', administrator: true,
    });

    renderAuth();
    await waitFor(() => expect(sessionMocks.get).toHaveBeenCalled());

    const loginBtn = [...document.querySelectorAll('button')].find((b) => b.textContent === 'login');
    await act(async () => loginBtn?.click());

    await waitFor(() => {
      expect(document.querySelector('[data-testid="auth"]')?.textContent).toBe('in');
    });
  });

  it('login with invalid credentials', async () => {
    const { ApiError } = await import('../../src/services/api.js');
    sessionMocks.login.mockRejectedValue(new ApiError('Unauthorized', 401));

    renderAuth();
    await waitFor(() => expect(sessionMocks.get).toHaveBeenCalled());

    const loginBtn = [...document.querySelectorAll('button')].find((b) => b.textContent === 'login');
    await act(async () => loginBtn?.click());

    await waitFor(() => {
      expect(document.querySelector('[data-testid="auth"]')?.textContent).toBe('out');
    });
  });

  it('logout clears session', async () => {
    sessionMocks.login.mockResolvedValue({
      id: 1, email: 'a@test.com', name: 'Admin', administrator: true,
    });

    renderAuth();
    await waitFor(() => expect(sessionMocks.get).toHaveBeenCalled());

    const [loginBtn, , logoutBtn] = document.querySelectorAll('button');
    await act(async () => loginBtn.click());
    await waitFor(() => expect(document.querySelector('[data-testid="auth"]')?.textContent).toBe('in'));

    await act(async () => logoutBtn.click());
    await waitFor(() => {
      expect(sessionMocks.logout).toHaveBeenCalled();
      expect(document.querySelector('[data-testid="auth"]')?.textContent).toBe('out');
    });
  });

  it('2FA login flow sets needsTotpVerification', async () => {
    const { ApiError } = await import('../../src/services/api.js');
    sessionMocks.login
      .mockRejectedValueOnce(new ApiError('TOTP', 401, { totpRequired: true }))
      .mockResolvedValueOnce({
        id: 1, email: 'a@test.com', name: 'Admin', administrator: true,
      });

    renderAuth();
    await waitFor(() => expect(sessionMocks.get).toHaveBeenCalled());

    const buttons = [...document.querySelectorAll('button')];
    await act(async () => buttons.find((b) => b.textContent === 'login')?.click());

    await waitFor(() => {
      expect(document.querySelector('[data-testid="totp"]')?.textContent).toBe('yes');
    });

    await act(async () => buttons.find((b) => b.textContent === 'verify')?.click());

    await waitFor(() => {
      expect(document.querySelector('[data-testid="auth"]')?.textContent).toBe('in');
      expect(document.querySelector('[data-testid="totp"]')?.textContent).toBe('no');
    });
  });
});
