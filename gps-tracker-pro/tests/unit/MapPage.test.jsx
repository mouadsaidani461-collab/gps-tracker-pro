// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import MapPage from '../../src/pages/MapPage';
import { renderWithLocale } from '../helpers/renderWithLocale';

const selectVehicleMock = vi.fn();
const clearSelectionMock = vi.fn();
const refreshFleetMock = vi.fn();
const selectGeofenceMock = vi.fn();
const clearGeofenceSelectionMock = vi.fn();

const mockVehicle = {
  id: 'v1',
  name: 'Fleet Alpha',
  lastUpdate: '2026-06-01T12:00:00.000Z',
  location: { lat: 33.5, lng: -7.6 },
  hasPosition: true,
};

let vehiclesHook = {};
let geofencesHook = {};

vi.mock('../../src/hooks/useVehicles', () => ({
  useVehicles: () => vehiclesHook,
}));

vi.mock('../../src/hooks/useGeofences', () => ({
  useGeofences: () => geofencesHook,
}));

vi.mock('../../src/components/map/MapView', () => ({
  default: ({ onSelectVehicle }) => (
    <button type="button" data-testid="map-select-vehicle" onClick={() => onSelectVehicle?.({ id: 'v1' })}>
      Map
    </button>
  ),
}));

vi.mock('../../src/components/dashboard/VehicleList', () => ({
  default: () => <div data-testid="vehicle-list">VehicleList</div>,
}));

vi.mock('../../src/components/map/GeofenceEditorPanel', () => ({
  default: ({ onSelect }) => (
    <button type="button" data-testid="select-geofence" onClick={() => onSelect?.('gf1')}>
      Geofences
    </button>
  ),
}));

vi.mock('../../src/components/dashboard/LiveIndicator', () => ({
  default: () => <div data-testid="live-indicator">Live</div>,
}));

function setupHooks(vehicleOverrides = {}, geofenceOverrides = {}) {
  vehiclesHook = {
    vehicles: [mockVehicle],
    positionedVehicles: [mockVehicle],
    filteredVehicles: [mockVehicle],
    selectedVehicle: null,
    selectedId: null,
    filter: 'all',
    loading: false,
    error: null,
    isSimulating: true,
    isConnected: true,
    setFilter: vi.fn(),
    selectVehicle: selectVehicleMock,
    clearSelection: clearSelectionMock,
    refreshFleet: refreshFleetMock,
    ...vehicleOverrides,
  };

  geofencesHook = {
    geofences: [],
    selectedId: null,
    selectedGeofence: null,
    drawMode: null,
    polygonDraft: [],
    loading: false,
    saving: false,
    error: null,
    selectGeofence: selectGeofenceMock,
    clearSelection: clearGeofenceSelectionMock,
    updateGeofence: vi.fn(),
    deleteGeofence: vi.fn(),
    refreshGeofences: vi.fn(),
    startCreateCircleMode: vi.fn(),
    startCreatePolygonMode: vi.fn(),
    startRepositionMode: vi.fn(),
    cancelDrawMode: vi.fn(),
    undoPolygonPoint: vi.fn(),
    finishPolygon: vi.fn(),
    addPresetGeofence: vi.fn(),
    handleMapClick: vi.fn(),
    linkedDeviceIds: [],
    linksLoading: false,
    toggleDeviceLink: vi.fn(),
    ...geofenceOverrides,
  };
}

function renderPage() {
  return render(renderWithLocale(<MapPage />));
}

describe('MapPage', () => {
  beforeEach(() => {
    setupHooks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders map header and sidebar tabs', () => {
    renderPage();
    expect(screen.getByText('الخريطة')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'المركبات' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'المناطق' })).toBeTruthy();
  });

  it('shows fleet error with retry action', () => {
    setupHooks({ error: 'Network error', vehicles: [], filteredVehicles: [], positionedVehicles: [] });
    renderPage();
    expect(screen.getByText('Network error')).toBeTruthy();
    fireEvent.click(screen.getByText('إعادة المحاولة'));
    expect(refreshFleetMock).toHaveBeenCalled();
  });

  it('blocks tab switch while draw mode is active', () => {
    setupHooks({}, { drawMode: 'create-polygon' });
    const confirmMock = vi.fn(() => false);
    vi.stubGlobal('confirm', confirmMock);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'المناطق' }));

    expect(confirmMock).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'المركبات' }).getAttribute('aria-current')).toBe('page');
    vi.unstubAllGlobals();
  });

  it('clears geofence selection when selecting a vehicle', () => {
    setupHooks({}, { selectedId: 'gf1' });
    renderPage();
    fireEvent.click(screen.getByTestId('map-select-vehicle'));
    expect(selectVehicleMock).toHaveBeenCalledWith('v1');
    expect(clearGeofenceSelectionMock).toHaveBeenCalled();
  });

  it('clears vehicle selection when selecting a geofence', () => {
    setupHooks({ selectedId: 'v1', selectedVehicle: mockVehicle });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'المناطق' }));
    fireEvent.click(screen.getByTestId('select-geofence'));
    expect(selectGeofenceMock).toHaveBeenCalledWith('gf1');
    expect(clearSelectionMock).toHaveBeenCalled();
  });

  it('uses RTL slide class when sidebar is closed', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('إخفاء القائمة'));
    const aside = document.querySelector('aside');
    expect(aside?.className).toContain('translate-x-full');
  });
});
