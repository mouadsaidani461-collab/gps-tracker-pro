// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DevicesPage from '../../src/pages/DevicesPage';
import { renderWithLocale } from '../helpers/renderWithLocale';

const mockDevices = [
  {
    id: 1,
    name: 'Tracker A',
    uniqueId: '123456789012345',
    status: 'online',
    lastUpdate: '2026-06-01T10:00:00Z',
    groupId: null,
    groupName: '—',
    phone: '',
    model: '',
    contact: '',
    raw: { id: 1 },
  },
  {
    id: 2,
    name: 'Tracker B',
    uniqueId: '987654321098765',
    status: 'offline',
    lastUpdate: null,
    groupId: null,
    groupName: '—',
    phone: '',
    model: '',
    contact: '',
    raw: { id: 2 },
  },
];

const fetchDevicesMock = vi.fn();
const createDeviceMock = vi.fn();
const deleteDeviceMock = vi.fn();

vi.mock('../../src/hooks/useDevices', () => ({
  useDevices: vi.fn(),
}));

import { useDevices } from '../../src/hooks/useDevices';

function setupHook(overrides = {}) {
  useDevices.mockReturnValue({
    devices: mockDevices,
    filteredDevices: mockDevices,
    groups: [],
    loading: false,
    error: null,
    search: '',
    statusFilter: 'all',
    groupFilter: 'all',
    selectedIds: new Set(),
    setSearch: vi.fn(),
    setStatusFilter: vi.fn(),
    setGroupFilter: vi.fn(),
    toggleSelected: vi.fn(),
    clearSelected: vi.fn(),
    fetchDevices: fetchDevicesMock,
    createDevice: createDeviceMock,
    updateDevice: vi.fn(),
    deleteDevice: deleteDeviceMock,
    bulkDelete: vi.fn(),
    ...overrides,
  });
}

function renderPage() {
  return render(
    renderWithLocale(
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>,
    ),
  );
}

describe('DevicesPage', () => {
  beforeEach(() => {
    setupHook();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders devices list and stats', () => {
    renderPage();
    expect(screen.getByText('إدارة الأجهزة')).toBeTruthy();
    expect(screen.getAllByText('Tracker A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('123456789012345').length).toBeGreaterThan(0);
  });

  it('shows search empty state when filters match nothing', () => {
    setupHook({ filteredDevices: [], devices: mockDevices });
    renderPage();
    expect(screen.getAllByText('لا توجد أجهزة تطابق البحث أو الفلاتر').length).toBeGreaterThan(0);
  });

  it('shows retry button on load error', () => {
    setupHook({ error: 'Network error', loading: false });
    renderPage();
    expect(screen.getByText('Network error')).toBeTruthy();
    expect(screen.getByText('إعادة المحاولة')).toBeTruthy();
  });

  it('opens delete modal for a device', () => {
    renderPage();
    const deleteButtons = screen.getAllByLabelText('حذف');
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByText('حذف الجهاز')).toBeTruthy();
  });

  it('passes existing devices to form and rejects short IMEI', () => {
    renderPage();
    fireEvent.click(screen.getAllByText('إضافة جهاز')[0]);
    fireEvent.change(screen.getByLabelText('اسم الجهاز'), { target: { value: 'New Device' } });
    fireEvent.change(screen.getByLabelText('IMEI / المعرّف الفريد'), { target: { value: '12345' } });
    fireEvent.click(screen.getAllByText('إضافة الجهاز').at(-1));
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('15');
    expect(createDeviceMock).not.toHaveBeenCalled();
  });

  it('shows pagination on mobile viewport', () => {
    setupHook({
      filteredDevices: Array.from({ length: 15 }, (_, i) => ({
        ...mockDevices[0],
        id: i + 1,
        name: `Tracker ${i + 1}`,
        uniqueId: `12345678901234${i}`,
      })),
      devices: Array.from({ length: 15 }, (_, i) => ({
        ...mockDevices[0],
        id: i + 1,
        name: `Tracker ${i + 1}`,
        uniqueId: `12345678901234${i}`,
      })),
    });
    renderPage();
    expect(screen.getAllByText(/صفحة 1 من 2/).length).toBeGreaterThan(0);
  });
});
