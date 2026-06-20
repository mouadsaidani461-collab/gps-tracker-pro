// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../../src/pages/Dashboard';
import { renderWithLocale } from '../helpers/renderWithLocale';

const refreshFleetMock = vi.fn();
const refreshGeofencesMock = vi.fn();
const selectVehicleMock = vi.fn();

let vehiclesHook = {};
let geofencesHook = {};
let authHook = { isAdmin: () => true };

vi.mock('../../src/hooks/useVehicles', () => ({
  useVehicles: () => vehiclesHook,
}));

vi.mock('../../src/hooks/useGeofences', () => ({
  useGeofences: () => geofencesHook,
}));

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => authHook,
}));

vi.mock('../../src/services/traccarApi', () => ({
  userApi: {
    list: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
  },
}));

vi.mock('../../src/components/map/MapView', () => ({
  default: ({ vehicleFlyTrigger }) => (
    <div data-testid="map-view" data-fly-trigger={vehicleFlyTrigger}>Map</div>
  ),
}));

function setupHooks(vehicleOverrides = {}, geofenceOverrides = {}) {
  vehiclesHook = {
    vehicles: [{ id: 'v1', name: 'Fleet Alpha', lastUpdate: '2026-06-01T12:00:00.000Z' }],
    positionedVehicles: [{ id: 'v1', name: 'Fleet Alpha', hasPosition: true, location: { lat: 1, lng: 2 } }],
    filteredVehicles: [{ id: 'v1', name: 'Fleet Alpha' }],
    selectedVehicle: { id: 'v1', name: 'Fleet Alpha', location: { lat: 1, lng: 2 } },
    selectedId: 'v1',
    filter: 'all',
    stats: { total: 1, moving: 0, idle: 1, online: 0, offline: 0, alert: 0, activeAlerts: 0 },
    loading: false,
    error: null,
    isSimulating: true,
    isConnected: true,
    setFilter: vi.fn(),
    selectVehicle: selectVehicleMock,
    refreshFleet: refreshFleetMock,
    ...vehicleOverrides,
  };

  geofencesHook = {
    geofences: [],
    loading: false,
    error: null,
    refreshGeofences: refreshGeofencesMock,
    ...geofenceOverrides,
  };
}

function renderPage() {
  return render(
    renderWithLocale(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    ),
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    authHook = { isAdmin: () => true };
    setupHooks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders dashboard header and stat cards', async () => {
    renderPage();
    expect(screen.getByText('لوحة التحكم')).toBeTruthy();
    expect(await screen.findByText('المستخدمون')).toBeTruthy();
  });

  it('shows fleet error with retry action', () => {
    setupHooks({ error: 'Fleet failed', vehicles: [], positionedVehicles: [], filteredVehicles: [], selectedVehicle: null, selectedId: null });
    renderPage();
    expect(screen.getByText('Fleet failed')).toBeTruthy();
    fireEvent.click(screen.getByText('إعادة المحاولة'));
    expect(refreshFleetMock).toHaveBeenCalled();
  });

  it('shows geofence error with retry action', () => {
    setupHooks({}, { error: 'Geofence failed' });
    renderPage();
    expect(screen.getByText('Geofence failed')).toBeTruthy();
    fireEvent.click(screen.getByText('إعادة المحاولة'));
    expect(refreshGeofencesMock).toHaveBeenCalled();
  });

  it('increments map fly trigger when center button is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText(/توسيط/));
    expect(screen.getByTestId('map-view').getAttribute('data-fly-trigger')).toBe('1');
  });

  it('links to the full map page', () => {
    renderPage();
    const link = screen.getByText('فتح الخريطة الكاملة').closest('a');
    expect(link?.getAttribute('href')).toBe('/map');
  });

  it('shows geofence stat card for non-admin users', async () => {
    authHook = { isAdmin: () => false };
    setupHooks({}, { geofences: [{ id: 'g1' }, { id: 'g2' }] });
    renderPage();
    expect(await screen.findByText('المناطق الجغرافية')).toBeTruthy();
    expect(screen.queryByText('المستخدمون')).toBeNull();
  });
});
