// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import Settings from '../../src/pages/Settings';
import { renderWithLocale } from '../helpers/renderWithLocale';

const {
  mockUser,
  updateProfileMock,
  verifyCurrentPasswordMock,
  pushNotificationMock,
} = vi.hoisted(() => ({
  mockUser: {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    phone: '+212612345678',
    role: 'admin',
    twoFactorEnabled: false,
  },
  updateProfileMock: vi.fn(),
  verifyCurrentPasswordMock: vi.fn(),
  pushNotificationMock: vi.fn(),
}));

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    role: 'admin',
    updateProfile: (...args) => updateProfileMock(...args),
    verifyCurrentPassword: (...args) => verifyCurrentPasswordMock(...args),
  }),
}));

vi.mock('../../src/context/ThemeContext', () => ({
  useTheme: () => ({
    mode: 'dark',
    accentColor: '#22d3ee',
    presets: [{ id: 'cyan', value: '#22d3ee' }],
    setAccentColor: vi.fn(),
    setThemeMode: vi.fn(),
  }),
}));

vi.mock('../../src/context/NotificationContext', () => ({
  useNotificationContext: () => ({
    isConnected: true,
    pushNotification: pushNotificationMock,
  }),
}));

vi.mock('../../src/components/settings/TotpEnrollmentPanel', () => ({
  default: () => <div data-testid="totp-panel">TOTP</div>,
}));

vi.mock('../../src/components/settings/NotificationDeviceFilter', () => ({
  default: () => <div data-testid="device-filter">Filter</div>,
}));

function renderPage() {
  return render(renderWithLocale(<Settings />));
}

describe('Settings page', () => {
  beforeEach(() => {
    localStorage.clear();
    updateProfileMock.mockResolvedValue({});
    verifyCurrentPasswordMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders settings tabs', () => {
    renderPage();
    expect(screen.getByText('الإعدادات')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'الملف الشخصي' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'الإشعارات' })).toBeTruthy();
  });

  it('shows company local-only hint', () => {
    renderPage();
    expect(screen.getByText(/محلياً على هذا الجهاز/)).toBeTruthy();
  });

  it('validates short password on security tab', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'الأمان' }));
    fireEvent.change(screen.getByLabelText('كلمة المرور الحالية'), { target: { value: 'current-pass-12' } });
    fireEvent.change(screen.getByLabelText('كلمة المرور الجديدة'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('تأكيد كلمة المرور'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));

    expect(await screen.findByText(/12/)).toBeTruthy();
    expect(verifyCurrentPasswordMock).not.toHaveBeenCalled();
  });

  it('verifies current password before updating', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'الأمان' }));
    fireEvent.change(screen.getByLabelText('كلمة المرور الحالية'), { target: { value: 'current-pass-12' } });
    fireEvent.change(screen.getByLabelText('كلمة المرور الجديدة'), { target: { value: 'new-password-12' } });
    fireEvent.change(screen.getByLabelText('تأكيد كلمة المرور'), { target: { value: 'new-password-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));

    await waitFor(() => {
      expect(verifyCurrentPasswordMock).toHaveBeenCalledWith('current-pass-12');
      expect(updateProfileMock).toHaveBeenCalledWith({ password: 'new-password-12' });
    });
  });

  it('persists notification settings to localStorage', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'الإشعارات' }));
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('capture_settings') || '{}');
      expect(stored.notifications).toBeTruthy();
      expect(pushNotificationMock).toHaveBeenCalled();
    });
  });
});
