// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from '../../src/components/notifications/NotificationBell';
import { renderWithLocale } from '../helpers/renderWithLocale';

const markReadMock = vi.fn();
const markAllReadMock = vi.fn();
const removeMock = vi.fn();
const clearAllMock = vi.fn();
const reconnectMock = vi.fn();

let contextValue = {};

vi.mock('../../src/context/NotificationContext', () => ({
  useNotificationContext: () => contextValue,
}));

function setupContext(overrides = {}) {
  contextValue = {
    notifications: [],
    unreadCount: 0,
    markRead: markReadMock,
    markAllRead: markAllReadMock,
    remove: removeMock,
    clearAll: clearAllMock,
    isConnected: true,
    wsState: 'connected',
    reconnect: reconnectMock,
    ...overrides,
  };
}

function renderBell() {
  return render(
    renderWithLocale(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    ),
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    setupContext();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('opens panel and shows empty state', () => {
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: 'الإشعارات' }));
    expect(screen.getByText('لا توجد إشعارات')).toBeTruthy();
    expect(screen.getByText('إعدادات الإشعارات').closest('a')?.getAttribute('href')).toBe('/settings?tab=notifications');
  });

  it('marks all notifications as read', () => {
    setupContext({
      notifications: [{ id: '1', title: 'Alert', message: 'Test', read: false, timestamp: new Date().toISOString() }],
      unreadCount: 1,
    });
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: /غير مقروء/ }));
    fireEvent.click(screen.getByText('قراءة الكل'));
    expect(markAllReadMock).toHaveBeenCalled();
  });

  it('shows reconnect action when socket is offline', () => {
    setupContext({ isConnected: false, wsState: 'disconnected' });
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: 'الإشعارات' }));
    fireEvent.click(screen.getByText('إعادة الاتصال'));
    expect(reconnectMock).toHaveBeenCalled();
  });

  it('clears all notifications from footer', () => {
    setupContext({
      notifications: [{ id: '1', title: 'Alert', message: 'Test', read: true, timestamp: new Date().toISOString() }],
      unreadCount: 0,
    });
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: 'الإشعارات' }));
    fireEvent.click(screen.getByText('مسح الكل'));
    expect(clearAllMock).toHaveBeenCalled();
  });

  it('closes panel on Escape', () => {
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: 'الإشعارات' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
