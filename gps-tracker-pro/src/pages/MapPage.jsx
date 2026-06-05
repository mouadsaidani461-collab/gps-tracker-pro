import { useState } from 'react';
import { ChevronLeft, ChevronRight, Map as MapIcon, Car, CircleDot } from 'lucide-react';
import { useVehicles } from '../hooks/useVehicles';
import { useGeofences } from '../hooks/useGeofences';
import MapView from '../components/map/MapView';
import VehicleList from '../components/dashboard/VehicleList';
import GeofenceEditorPanel from '../components/map/GeofenceEditorPanel';
import LiveIndicator from '../components/dashboard/LiveIndicator';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const SIDEBAR_TABS = [
  { id: 'vehicles', label: 'المركبات', icon: Car },
  { id: 'geofences', label: 'المناطق', icon: CircleDot },
];

export default function MapPage() {
  const {
    vehicles,
    filteredVehicles,
    selectedVehicle,
    selectedId,
    filter,
    isSimulating,
    setFilter,
    selectVehicle,
    clearSelection,
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
    updateGeofence,
    deleteGeofence,
    refreshGeofences,
    startCreateCircleMode,
    startCreatePolygonMode,
    startRepositionMode,
    cancelDrawMode,
    undoPolygonPoint,
    finishPolygon,
    handleMapClick,
    linkedDeviceIds,
    linksLoading,
    toggleDeviceLink,
  } = useGeofences();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('vehicles');
  const [flyTrigger, setFlyTrigger] = useState(0);

  const lastUpdate = vehicles.reduce((latest, v) => {
    const t = new Date(v.lastUpdate).getTime();
    return t > latest ? t : latest;
  }, 0);

  const handleSelectGeofence = (id) => {
    selectGeofence(id);
    setSidebarTab('geofences');
  };

  const handleFlyToGeofence = (gf) => {
    selectGeofence(gf.id);
    setFlyTrigger((t) => t + 1);
  };

  return (
    <div dir="rtl" className="relative -m-4 lg:-m-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="absolute top-4 start-4 z-[1001] flex items-center gap-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-capture-card/90 backdrop-blur-md border border-slate-600/25 shadow-glow-sm">
          <MapIcon className="w-4 h-4 text-capture-glow" />
          <div>
            <h1 className="text-sm font-bold text-slate-100">الخريطة</h1>
            <p className="text-[10px] text-capture-metallic">تتبع الأسطول — المغرب 🇲🇦</p>
          </div>
        </div>
        <div className="pointer-events-auto">
          <LiveIndicator
            isLive={isSimulating}
            lastUpdate={lastUpdate ? new Date(lastUpdate).toISOString() : null}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <MapView
          vehicles={vehicles}
          selectedId={selectedId}
          selectedVehicle={selectedVehicle}
          onSelectVehicle={(v) => {
            selectVehicle(v.id);
            setSidebarTab('vehicles');
          }}
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
          sidebarOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-600/20 shrink-0 mt-16">
          {SIDEBAR_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSidebarTab(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors',
                sidebarTab === id
                  ? 'bg-capture-primary/15 text-capture-glow border border-capture-primary/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-capture-card/40',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-600/20 shrink-0">
          <h2 className="text-sm font-semibold text-slate-200">
            {sidebarTab === 'vehicles' ? 'المركبات' : 'المناطق الجغرافية'}
          </h2>
          <div className="flex items-center gap-1">
            {sidebarTab === 'vehicles' && selectedVehicle && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-[10px] text-capture-metallic hover:text-capture-glow px-2 py-1 rounded transition-colors"
              >
                إلغاء
              </button>
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-capture-metallic hover:text-capture-glow hover:bg-capture-card/60 transition-colors lg:hidden"
              aria-label="إغلاق القائمة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-3 min-h-0">
          {sidebarTab === 'vehicles' ? (
            <VehicleList
              vehicles={filteredVehicles}
              filter={filter}
              onFilterChange={setFilter}
              selectedId={selectedId}
              onSelectVehicle={selectVehicle}
            />
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
              onSelect={selectGeofence}
              onUpdate={updateGeofence}
              onDelete={deleteGeofence}
              onStartCreateCircle={startCreateCircleMode}
              onStartCreatePolygon={startCreatePolygonMode}
              onStartReposition={startRepositionMode}
              onCancelDraw={cancelDrawMode}
              onUndoPolygonPoint={undoPolygonPoint}
              onFinishPolygon={async () => {
                const created = await finishPolygon();
                if (created) setFlyTrigger((t) => t + 1);
              }}
              onAddPreset={async (city) => {
                const created = await addPresetGeofence(city);
                if (created) setFlyTrigger((t) => t + 1);
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
          aria-label="فتح القائمة"
        >
          <ChevronLeft className="w-5 h-5" />
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
        aria-label={sidebarOpen ? 'إخفاء القائمة' : 'إظهار القائمة'}
      >
        {sidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );
}
