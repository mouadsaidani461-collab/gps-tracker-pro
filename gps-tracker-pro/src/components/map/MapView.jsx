import { useEffect, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { MAP } from '../../utils/constants';
import { sameGeofenceId } from '../../utils/geofenceUtils';
import VehicleMarker from './VehicleMarker';
import RoutePolyline from './RoutePolyline';
import GeofenceShape from './GeofenceShape';
import PolygonDraftLayer from './PolygonDraftLayer';
import MapControls, { TILE_LAYERS } from './MapControls';
import VehicleCard from '../dashboard/VehicleCard';
import MapDrawHandler from './MapDrawHandler';
import GeofenceFlyTo from './GeofenceFlyTo';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function MapView({
  vehicles = [],
  selectedId,
  selectedVehicle,
  onSelectVehicle,
  geofences = [],
  selectedGeofenceId,
  selectedGeofence,
  onSelectGeofence,
  drawMode = null,
  polygonDraft = [],
  onMapClick,
  flyToGeofenceTrigger = 0,
  showGeofences = true,
  showRoute = false,
  routeCoordinates = [],
  showVehicleCard = true,
  className = '',
  defaultLayer = 'dark',
}) {
  const [layer, setLayer] = useState(defaultLayer);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentTile = TILE_LAYERS[layer] ?? TILE_LAYERS.dark;
  const isDrawing = drawMode !== null;

  const drawBanner = (() => {
    switch (drawMode) {
      case 'create-circle':
        return '📍 انقر على الخريطة لإنشاء دائرة';
      case 'create-polygon':
        return `📐 انقر لإضافة نقاط المضلع (${polygonDraft.length} نقطة — 3 على الأقل)`;
      case 'reposition':
        return '📍 انقر على موقع جديد لنقل مركز الدائرة';
      default:
        return null;
    }
  })();

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  return (
    <div className={cn('relative w-full h-full min-h-[400px] rounded-xl overflow-hidden', className)}>
      {drawBanner && (
        <div className="absolute top-3 inset-x-3 z-[1000] pointer-events-none flex justify-center">
          <div className="px-4 py-2 rounded-lg bg-capture-primary/20 backdrop-blur-md border border-capture-primary/40 text-xs text-capture-glow shadow-glow-sm">
            {drawBanner}
          </div>
        </div>
      )}

      <MapContainer
        center={MAP.center}
        zoom={MAP.defaultZoom}
        scrollWheelZoom
        zoomControl={false}
        className={cn('w-full h-full z-0', isDrawing && 'cursor-crosshair')}
        style={{ background: '#020617' }}
      >
        <TileLayer
          key={layer}
          attribution={currentTile.attribution}
          url={currentTile.url}
        />

        {showRoute && routeCoordinates?.length > 0 && (
          <RoutePolyline coordinates={routeCoordinates} />
        )}

        {showGeofences && geofences.map((gf) => (
          <GeofenceShape
            key={gf.id}
            geofence={gf}
            isSelected={sameGeofenceId(selectedGeofenceId, gf.id)}
            onSelect={(g) => onSelectGeofence?.(g.id)}
          />
        ))}

        {drawMode === 'create-polygon' && polygonDraft.length > 0 && (
          <PolygonDraftLayer points={polygonDraft} />
        )}

        {vehicles.map((vehicle) => (
          <VehicleMarker
            key={vehicle.id}
            vehicle={vehicle}
            isSelected={selectedId === vehicle.id}
            onSelect={onSelectVehicle}
          />
        ))}

        <MapDrawHandler drawMode={drawMode} onMapClick={onMapClick} />

        {selectedGeofence && (
          <GeofenceFlyTo geofence={selectedGeofence} trigger={flyToGeofenceTrigger} />
        )}

        {selectedVehicle && !isDrawing && (
          <GeofenceFlyTo
            geofence={{
              center: [selectedVehicle.location.lat, selectedVehicle.location.lng],
            }}
            trigger={selectedVehicle.id}
            zoom={MAP.selectedZoom}
          />
        )}

        <MapControls
          layer={layer}
          onLayerChange={setLayer}
          selectedVehicle={selectedVehicle}
          isFullscreen={isFullscreen}
          onFullscreenChange={setIsFullscreen}
        />
      </MapContainer>

      {/* Selected vehicle card overlay */}
      {showVehicleCard && selectedVehicle && !isDrawing && (
        <div
          className={cn(
            'absolute bottom-4 start-4 z-[1000] w-80 max-w-[calc(100%-2rem)]',
            'animate-[fade-in_0.25s_ease-out]',
          )}
        >
          <VehicleCard
            vehicle={selectedVehicle}
            isSelected
            onClick={() => onSelectVehicle?.(selectedVehicle)}
          />
        </div>
      )}

      {/* Inject marker pulse keyframes */}
      <style>{`
        @keyframes marker-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .capture-vehicle-marker { background: transparent !important; border: none !important; }
        .leaflet-popup-content-wrapper {
          background: rgba(30,41,59,0.95);
          border: 1px solid rgba(148,163,184,0.2);
          border-radius: 12px;
          color: #f1f5f9;
          backdrop-filter: blur(8px);
        }
        .leaflet-popup-tip { background: rgba(30,41,59,0.95); }
        .capture-geofence-tooltip {
          background: rgba(30,41,59,0.95) !important;
          border: 1px solid rgba(6,182,212,0.3) !important;
          color: #f1f5f9 !important;
          border-radius: 8px !important;
          box-shadow: 0 0 12px rgba(6,182,212,0.15) !important;
        }
      `}</style>
    </div>
  );
}
