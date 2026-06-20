// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VehiclesPage from '../../src/pages/VehiclesPage';
import { renderWithLocale } from '../helpers/renderWithLocale';

const mockVehicle = {
  id: 'v1',
  deviceId: 1,
  name: 'Test Car',
  plate: 'TN-1234',
  driver: 'Driver One',
  status: 'online',
  type: 'car',
  speed: 40,
  fuel: 80,
  battery: 90,
  signal: 85,
  odometer: 120000,
  lastUpdate: new Date().toISOString(),
  location: { address: 'Casablanca' },
  alerts: [],
  geofence: null,
};

const refreshFleetMock = vi.fn();

vi.mock('../../src/hooks/useVehicles', () => ({
  useVehicles: vi.fn(),
}));

import { useVehicles } from '../../src/hooks/useVehicles';

function setupHook(overrides = {}) {
  useVehicles.mockReturnValue({
    vehicles: [mockVehicle],
    selectVehicle: vi.fn(),
    loading: false,
    error: null,
    refreshFleet: refreshFleetMock,
    ...overrides,
  });
}

function renderPage() {
  return render(
    renderWithLocale(
      <MemoryRouter>
        <VehiclesPage />
      </MemoryRouter>,
    ),
  );
}

describe('VehiclesPage', () => {
  beforeEach(() => {
    setupHook();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders fleet list and header count', () => {
    renderPage();
    expect(screen.getByText('المركبات')).toBeTruthy();
    expect(screen.getAllByText('Test Car').length).toBeGreaterThan(0);
  });

  it('shows loading skeletons while fleet loads', () => {
    setupHook({ loading: true, vehicles: [] });
    renderPage();
    expect(document.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it('shows retry button on load error', () => {
    setupHook({ error: 'Network error', vehicles: [] });
    renderPage();
    expect(screen.getByText('Network error')).toBeTruthy();
    expect(screen.getByText('إعادة المحاولة')).toBeTruthy();
  });

  it('shows filter empty state when search matches nothing', () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('بحث بالاسم، اللوحة، السائق...'), {
      target: { value: 'zzzz-no-match' },
    });
    expect(screen.getByText('لا توجد مركبات تطابق الفلاتر')).toBeTruthy();
    expect(screen.getByText('جرّب تغيير الفلتر أو البحث')).toBeTruthy();
  });

  it('does not render bulk send-alert (no Traccar bulk notification API)', () => {
    renderPage();
    fireEvent.click(screen.getByText('تحديد الكل'));
    expect(screen.getByText('تصدير')).toBeTruthy();
    expect(screen.queryByText('إرسال تنبيه')).toBeNull();
  });

  it('opens detail modal from grid card', () => {
    renderPage();
    fireEvent.click(screen.getAllByText('Test Car')[0]);
    expect(screen.getByText('تتبع على الخريطة')).toBeTruthy();
    expect(screen.getByText('TN-1234')).toBeTruthy();
  });

  it('shows noResults when fleet is empty', () => {
    setupHook({ vehicles: [] });
    renderPage();
    expect(screen.getByText('لا توجد مركبات')).toBeTruthy();
  });
});
