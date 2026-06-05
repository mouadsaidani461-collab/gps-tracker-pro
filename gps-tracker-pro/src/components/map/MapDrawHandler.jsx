import { useMapEvents } from 'react-leaflet';

/**
 * Handles map clicks for geofence draw modes.
 * drawMode: 'create-circle' | 'create-polygon' | 'reposition' | null
 */
export default function MapDrawHandler({ drawMode, onMapClick }) {
  const active = drawMode != null;

  useMapEvents({
    click(e) {
      if (!active) return;
      const point = [e.latlng.lat, e.latlng.lng];

      if (drawMode === 'create-circle') {
        onMapClick?.(point, { mode: 'circle' });
        return;
      }

      if (drawMode === 'create-polygon') {
        onMapClick?.(point, { mode: 'polygon' });
        return;
      }

      if (drawMode === 'reposition') {
        onMapClick?.(point, { mode: 'reposition' });
      }
    },
  });

  return null;
}
