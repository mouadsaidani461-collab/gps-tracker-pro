import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Map as MapIcon, Car, CircleDot } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useFormatters } from '../hooks/useFormatters';
import { NUMERIC_DISPLAY_CLASS } from '../utils/formatters';
import { useVehicles } from '../hooks/useVehicles';
import { useGeofences } from '../hooks/useGeofences';
import MapView from '../components/map/MapView';
import VehicleList from '../components/dashboard/VehicleList';
import GeofenceEditorPanel from '../components/map/GeofenceEditorPanel';
import LiveIndicator from '../components/dashboard/LiveIndicator';
import Button from '../components/ui/Button';
import { getLatestFleetTimestamp } from './map/utils';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const SIDEBAR_TAB_IDS = [
  { id: 'vehicles', labelKey: 'mapPage.tabVehicles', icon: Car },
  { id: 'geofences', labelKey: 'mapPage.tabGeofences', icon: CircleDot },
];

export default function MapPage() {
  const { dir, t } = useLocale();
  const { formatCoordinates } = useFormatters();
  const {
    vehicles,
    positionedVehicles,
    filteredVehicles,
    selectedVehicle,
    selectedId,
    filter,
    loading: vehiclesLoading,
    error: vehiclesError,
    isSimulating,
    isConnected,
    setFilter,
    selectVehicle,
    clearSelection,
    refreshFleet,
  } = useVehicles();

  const {
    geofences,
    selectedId: selectedGeofenceId,
    selectedGeofence,
    drawMode,
    polygonDraft,
    loading: geofencesLoading,
    saving: geofencesSaving,
    error: geofencesError,
    selectGeofence,
    clearSelection: clearGeofenceSelection,
    updateGeofence,
    deleteGeofence,
    refreshGeofences,
    startCreateCircleMode,
    startCreatePolygonMode,
    startRepositionMode,
    cancelDrawMode,
    undoPolygonPoint,
    finishPolygon,
    addPresetGeofence,
    handleMapClick,
    linkedDeviceIds,
    linksLoading,
    toggleDeviceLink,
  } = useGeofences();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('vehicles');
  const [flyTrigger, setFlyTrigger] = useState(0);

  const slideClosed = dir === 'rtl' ? 'translate-x-full' : '-translate-x-full';
  const CollapseIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const ExpandIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const lastUpdate = useMemo(() => getLatestFleetTimestamp(vehicles), [vehicles]);
  const mapLoading = vehiclesLoading || geofencesLoading;

  const handleSelectVehicle = (id) => {
    selectVehicle(id);
    if (selectedGeofenceId != null) clearGeofenceSelection();
    setSidebarTab('vehicles');
  };

  const handleSelectGeofence = (id) => {
    selectGeofence(id);
    if (selectedId != null) clearSelection();
    setSidebarTab('geofences');
  };

  const handleFlyToGeofence = (gf) => {
    handleSelectGeofence(gf.id);
    setFlyTrigger((n) => n + 1);
  };

  const requestSidebarTab = (id) => {
    if (id === sidebarTab) return;
    if (drawMode && !window.confirm(t('mapPage.drawModeConfirm'))) return;
    setSidebarTab(id);
  };

  return (
    <div dir={dir} className="relative -m-4 lg:-m-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="absolute top-4 start-4 z-[1001] flex flex-wrap items-center gap-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-capture-card/90 backdrop-blur-md border border-slate-600/25 shadow-glow-sm">
          <MapIcon className="w-4 h-4 text-capture-glow" />
          <div>
            <h1 className="text-sm font-bold text-slate-100">{t('mapPage.title')}</h1>
            <p className="text-[10px] text-capture-metallic">{t('mapPage.subtitle')}</p>
          </div>
        </div>
        <div className="pointer-events-auto">
          <LiveIndicator
            isLive={isSimulating && isConnected}
            lastUpdate={lastUpdate ? new Date(lastUpdate).toISOString() : null}
          />
        </div>
        {vehiclesError && (
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 max-w-xs">
            <span>{vehiclesError}</span>
            <Button variant="secondary" size="sm" onClick={refreshFleet}>
              {t('common.retry')}
            </Button>
          </div>
        )}
        {selectedVehicle?.location && (
          <div
            className={cn(
              'pointer-events-auto px-2.5 py-1.5 rounded-lg',
              'bg-capture-card/90 backdrop-blur-md border border-slate-600/25',
              'capture-map-coords',
            )}
            dir="ltr"
          >
            <span className={cn(NUMERIC_DISPLAY_CLASS, 'text-[10px] text-capture-metallic block')} dir="ltr">
              {formatCoordinates(selectedVehicle.location.lat, selectedVehicle.location.lng)}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 relative">
        {mapLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-capture-bg/60 backdrop-blur-sm">
            <div className="w-8 h-8 border-2 border-capture-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <MapView
          vehicles={positionedVehicles}
          selectedId={selectedId}
          selectedVehicle={selectedVehicle}
          onSelectVehicle={(v) => handleSelectVehicle(v.id)}
          geofences={geofences}
          selectedGeofenceId={selectedGeofenceId}
          selectedGeofence={selectedGeofence}
          onSelectGeofence={handleSelectGeofence}
          drawMode={drawMode}
          polygonDraft={polygonDraft}
          onMapClick={handleMapClick}
          flyToGeofenceTrigger={flyTrigger}
          showVehicleCard={!sidebarOpen && sidebarTab === 'vehicles'}
          className="rounded-none h-full min-h-0"
        />
      </div>

      <aside
        className={cn(
          'absolute top-0 bottom-0 start-0 z-[1000]',
          'w-80 max-w-[85vw] flex flex-col',
          'bg-capture-surface/95 backdrop-blur-xl',
          'border-s border-slate-600/25 shadow-glow-md',
          'transition-transform duration-300 ease-out',
          sidebarOpen ? 'translate-x-0' : slideClosed,
        )}
      >
        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-600/20 shrink-0 mt-16">
          {SIDEBAR_TAB_IDS.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={sidebarTab === id ? 'page' : undefined}
              onClick={() => requestSidebarTab(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors',
                sidebarTab === id
                  ? 'bg-capture-primary/15 text-capture-glow border border-capture-primary/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-capture-card/40',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t(labelKey)}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-600/20 shrink-0">
          <h2 className="text-sm font-semibold text-slate-200">
            {sidebarTab === 'vehicles' ? t('mapPage.tabVehicles') : t('mapPage.geofencesTitle')}
          </h2>
          <div className="flex items-center gap-1">
            {sidebarTab === 'vehicles' && selectedVehicle && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-[10px] text-capture-metallic hover:text-capture-glow px-2 py-1 rounded transition-colors"
              >
                {t('mapPage.cancelSelection')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-capture-metallic hover:text-capture-glow hover:bg-capture-card/60 transition-colors lg:hidden"
              aria-label={t('mapPage.closeSidebar')}
            >
              <CollapseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-3 min-h-0">
          {sidebarTab === 'vehicles' ? (
            vehiclesLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-capture-metallic">
                {t('dashboard.loadingVehicles')}
              </div>
            ) : (
              <VehicleList
                vehicles={filteredVehicles}
                filter={filter}
                onFilterChange={setFilter}
                selectedId={selectedId}
                onSelectVehicle={handleSelectVehicle}
              />
            )
          ) : (
            <GeofenceEditorPanel
              geofences={geofences}
              selectedGeofence={selectedGeofence}
              selectedId={selectedGeofenceId}
              drawMode={drawMode}
              polygonDraft={polygonDraft}
              loading={geofencesLoading}
              saving={geofencesSaving}
              error={geofencesError}
              onSelect={handleSelectGeofence}
              onUpdate={updateGeofence}
              onDelete={deleteGeofence}
              onStartCreateCircle={startCreateCircleMode}
              onStartCreatePolygon={startCreatePolygonMode}
              onStartReposition={startRepositionMode}
              onCancelDraw={cancelDrawMode}
              onUndoPolygonPoint={undoPolygonPoint}
              onFinishPolygon={async () => {
                const created = await finishPolygon();
                if (created) setFlyTrigger((n) => n + 1);
              }}
              onAddPreset={async (city) => {
                const created = await addPresetGeofence(city);
                if (created) setFlyTrigger((n) => n + 1);
              }}
              onRefresh={refreshGeofences}
              onFlyTo={handleFlyToGeofence}
              vehicles={vehicles}
              linkedDeviceIds={linkedDeviceIds}
              linksLoading={linksLoading}
              onToggleDeviceLink={toggleDeviceLink}
            />
          )}
        </div>
      </aside>

      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 start-0 z-[1001]',
            'p-2 rounded-s-none rounded-e-lg',
            'bg-capture-card/90 backdrop-blur-md',
            'border border-s-0 border-slate-600/30',
            'text-capture-glow hover:shadow-glow-sm transition-all',
          )}
          aria-label={t('mapPage.openSidebar')}
        >
          <ExpandIcon className="w-5 h-5" />
        </button>
      )}

      <button
        type="button"
        onClick={() => setSidebarOpen((p) => !p)}
        className={cn(
          'hidden lg:flex absolute top-1/2 -translate-y-1/2 z-[1001]',
          'p-1.5 rounded-lg',
          'bg-capture-card/90 backdrop-blur-md border border-slate-600/30',
          'text-capture-metallic hover:text-capture-glow hover:shadow-glow-sm',
          'transition-all duration-300',
          sidebarOpen ? 'start-[19.5rem]' : 'start-2',
        )}
        aria-label={sidebarOpen ? t('mapPage.hideSidebar') : t('mapPage.showSidebar')}
      >
        {sidebarOpen ? <CollapseIcon className="w-4 h-4" /> : <ExpandIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}
