// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Reports from '../../src/pages/Reports';
import { renderWithLocale } from '../helpers/renderWithLocale';

vi.mock('../../src/hooks/useVehicles', () => ({
  useVehicles: vi.fn(() => ({
    vehicles: [{ id: '1', deviceId: 1, plate: 'TN-1234', name: 'Car', driver: 'Driver' }],
    reportFleet: [{ id: '1', deviceId: 1, plate: 'TN-1234', name: 'Car', driver: 'Driver' }],
    allVehicles: [],
  })),
}));

const useReportsMock = vi.fn(() => ({
  rows: [],
  loading: false,
  error: null,
  refetch: vi.fn(),
}));

vi.mock('../../src/hooks/useReports', () => ({
  useReports: (...args) => useReportsMock(...args),
}));

describe('Reports page', () => {
  beforeEach(() => {
    useReportsMock.mockReturnValue({
      rows: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders without crashing', () => {
    render(
      renderWithLocale(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>,
      ),
    );
    expect(screen.getByText('التقارير')).toBeTruthy();
    expect(screen.getByText('لا توجد بيانات للفترة المحددة')).toBeTruthy();
  });

  it('renders trip rows in the table', () => {
    useReportsMock.mockReturnValue({
      rows: [{
        id: 'trip-1',
        vehicle: 'TN-1234',
        driver: 'Driver',
        type: 'رحلة',
        date: '2026-06-01',
        distance: 12.5,
        duration: 1.2,
        status: 'completed',
      }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      renderWithLocale(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>,
      ),
    );

    expect(screen.getByText('TN-1234')).toBeTruthy();
  });

  it('renders charts when trip rows exist', () => {
    useReportsMock.mockReturnValue({
      rows: [
        {
          id: 'trip-1',
          vehicle: 'TN-1234',
          driver: 'Driver',
          type: 'رحلة',
          date: '2026-06-01',
          distance: 12.5,
          duration: 1.2,
          status: 'completed',
        },
        {
          id: 'trip-2',
          vehicle: 'TN-5678',
          driver: 'Driver 2',
          type: 'رحلة',
          date: '2026-06-02',
          distance: 8,
          duration: 0.5,
          status: 'completed',
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      renderWithLocale(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>,
      ),
    );

    expect(screen.getByText('TN-1234')).toBeTruthy();
    expect(screen.getByText('TN-5678')).toBeTruthy();
    expect(screen.queryByText('حدث خطأ غير متوقع')).toBeNull();
  });

  it('passes fleet data to useReports (no undefined vehicles)', () => {
    render(
      renderWithLocale(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>,
      ),
    );

    expect(useReportsMock).toHaveBeenCalled();
    const call = useReportsMock.mock.calls[0][0];
    expect(call.vehicles).toBeDefined();
    expect(Array.isArray(call.vehicles)).toBe(true);
    expect(call.vehicles.length).toBeGreaterThan(0);
  });

  it('renders Stops report type tab and selects it', () => {
    render(
      renderWithLocale(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>,
      ),
    );

    const stopsTab = screen.getByText('التوقفات');
    expect(stopsTab).toBeTruthy();
    fireEvent.click(stopsTab);

    const lastCall = useReportsMock.mock.calls[useReportsMock.mock.calls.length - 1][0];
    expect(lastCall.reportType).toBe('stops');
  });

  it('disables export buttons while loading', () => {
    useReportsMock.mockReturnValue({
      rows: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(
      renderWithLocale(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>,
      ),
    );

    expect(screen.getByRole('button', { name: /PDF/i })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: /CSV/i })).toHaveProperty('disabled', true);
  });

  it('shows chart empty state for alerts without distance data', () => {
    useReportsMock.mockReturnValue({
      rows: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      renderWithLocale(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>,
      ),
    );

    fireEvent.click(screen.getByText('التنبيهات'));
    expect(screen.getByText('لا توجد بيانات للرسم')).toBeTruthy();
  });

  it('renders unknown status badge text', () => {
    useReportsMock.mockReturnValue({
      rows: [{
        id: 'x-1',
        vehicle: 'TN-9999',
        driver: 'Driver',
        type: 'test',
        date: '2026-06-01',
        distance: 0,
        duration: 0,
        status: 'customStatus',
      }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      renderWithLocale(
        <MemoryRouter>
          <Reports />
        </MemoryRouter>,
      ),
    );

    expect(screen.getByText('customStatus')).toBeTruthy();
  });
});
