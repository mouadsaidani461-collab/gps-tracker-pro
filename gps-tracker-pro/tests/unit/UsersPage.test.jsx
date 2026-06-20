// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UsersPage from '../../src/pages/UsersPage';
import { renderWithLocale } from '../helpers/renderWithLocale';

const mockUsers = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@example.com',
    administrator: true,
    readonly: false,
    disabled: false,
  },
  {
    id: 2,
    name: 'Viewer User',
    email: 'viewer@example.com',
    administrator: false,
    readonly: true,
    disabled: false,
  },
];

const listMock = vi.fn();
const removeMock = vi.fn();

vi.mock('../../src/services/traccarApi', () => ({
  userApi: {
    list: (...args) => listMock(...args),
    create: vi.fn(),
    update: vi.fn(),
    remove: (...args) => removeMock(...args),
  },
}));

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Admin User' } }),
}));

function renderPage() {
  return render(
    renderWithLocale(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>,
    ),
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    listMock.mockResolvedValue(mockUsers);
    removeMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders users and stats after load', async () => {
    renderPage();

    expect(await screen.findByText('Admin User')).toBeTruthy();
    expect(screen.getByText('viewer@example.com')).toBeTruthy();
    expect(screen.getByText('المستخدمون')).toBeTruthy();
  });

  it('filters users by search query', async () => {
    renderPage();
    await screen.findByText('Admin User');

    fireEvent.change(screen.getByPlaceholderText('بحث بالاسم أو البريد...'), {
      target: { value: 'viewer@' },
    });

    expect(screen.queryByText('Admin User')).toBeNull();
    expect(screen.getByText('Viewer User')).toBeTruthy();
  });

  it('shows retry button when load fails', async () => {
    listMock.mockRejectedValueOnce(new Error('Network error'));
    renderPage();

    expect(await screen.findByText('Network error')).toBeTruthy();
    expect(screen.getByText('إعادة المحاولة')).toBeTruthy();
  });

  it('opens delete modal instead of window.confirm', async () => {
    renderPage();
    await screen.findByText('Viewer User');

    const deleteButtons = screen.getAllByLabelText('حذف');
    fireEvent.click(deleteButtons[1]);

    expect(await screen.findByText('حذف المستخدم')).toBeTruthy();
    expect(screen.getByText(/هل تريد حذف المستخدم «Viewer User»/)).toBeTruthy();
  });

  it('blocks delete for current user', async () => {
    renderPage();
    await screen.findByText('Admin User');

    const deleteButtons = screen.getAllByLabelText('حذف');
    expect(deleteButtons[0]).toHaveProperty('disabled', true);
  });

  it('rejects short password on create', async () => {
    renderPage();
    await screen.findByText('Admin User');

    fireEvent.click(screen.getByText('مستخدم جديد'));
    fireEvent.change(screen.getByLabelText('الاسم'), { target: { value: 'New User' } });
    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText('كلمة المرور'), { target: { value: 'short' } });
    fireEvent.click(screen.getByText('حفظ'));

    expect(await screen.findByText(/12/)).toBeTruthy();
  });
});
