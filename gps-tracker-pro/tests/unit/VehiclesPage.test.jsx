// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
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

vi.mock('../../src/hooks/useVehicles', () => ({
  useVehicles: vi.fn(() => ({
    vehicles: [mockVehicle],
    selectVehicle: vi.fn(),
  })),
}));

describe('VehiclesPage bulk actions', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not render bulk send-alert (no Traccar bulk notification API)', () => {
    render(
      renderWithLocale(
        <MemoryRouter>
          <VehiclesPage />
        </MemoryRouter>,
      ),
    );

    fireEvent.click(screen.getByText('تحديد الكل'));

    expect(screen.getByText('تصدير')).toBeTruthy();
    expect(screen.queryByText('إرسال تنبيه')).toBeNull();
  });
});
