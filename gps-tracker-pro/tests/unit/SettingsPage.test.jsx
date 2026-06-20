// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from '../../src/pages/Settings';
import { renderWithLocale } from '../helpers/renderWithLocale';

const {
  mockUser,
  updateProfileMock,
  verifyCurrentPasswordMock,
  updateUserAttributeMock,
  pushNotificationMock,
} = vi.hoisted(() => ({
  mockUser: {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    phone: '+212612345678',
    role: 'admin',
    twoFactorEnabled: false,
    avatar: null,
  },
  updateProfileMock: vi.fn(),
  verifyCurrentPasswordMock: vi.fn(),
  updateUserAttributeMock: vi.fn(),
  pushNotificationMock: vi.fn(),
}));

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    role: 'admin',
    updateProfile: (...args) => updateProfileMock(...args),
    verifyCurrentPassword: (...args) => verifyCurrentPasswordMock(...args),
    updateUserAttribute: (...args) => updateUserAttributeMock(...args),
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

function renderPage(initialEntries = ['/settings']) {
  return render(
    renderWithLocale(
      <MemoryRouter initialEntries={initialEntries}>
        <Settings />
      </MemoryRouter>,
    ),
  );
}

describe('Settings page', () => {
  beforeEach(() => {
    localStorage.clear();
    updateProfileMock.mockResolvedValue({});
    verifyCurrentPasswordMock.mockResolvedValue(undefined);
    updateUserAttributeMock.mockResolvedValue({});
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

  it('enables profile photo upload button', () => {
    renderPage(['/settings?tab=profile']);
    expect(screen.getByRole('button', { name: 'تغيير الصورة' }).disabled).toBe(false);
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

  it('opens profile tab from deep link', () => {
    renderPage(['/settings?tab=profile']);
    expect(screen.getByRole('region', { name: 'الملف الشخصي' })).toBeTruthy();
    expect(screen.getByLabelText('الاسم').value).toBe('Admin User');
  });

  it('opens security tab from deep link', () => {
    renderPage(['/settings?tab=security']);
    expect(screen.getByLabelText('كلمة المرور الحالية')).toBeTruthy();
  });

  it('validates empty profile name on save', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('الاسم'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));

    expect(await screen.findByText('الاسم مطلوب')).toBeTruthy();
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it('saves profile via Traccar API', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('الاسم'), { target: { value: 'Updated Name' } });
    fireEvent.change(screen.getByLabelText('الشركة'), { target: { value: 'Capture SARL' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith({
        name: 'Updated Name',
        email: 'admin@example.com',
        phone: '+212612345678',
      });
      const stored = JSON.parse(localStorage.getItem('capture_settings') || '{}');
      expect(stored.profile?.company).toBe('Capture SARL');
      expect(pushNotificationMock).toHaveBeenCalled();
    });
  });
});
