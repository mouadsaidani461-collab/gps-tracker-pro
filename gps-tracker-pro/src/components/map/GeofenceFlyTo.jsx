import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { latLngBounds } from 'leaflet';
import { MAP } from '../../utils/constants';
import { getGeofenceCenter, isPolygonGeofence } from '../../utils/geofenceUtils';

/** Fly map to geofence when trigger changes */
export default function GeofenceFlyTo({ geofence, trigger = 0, zoom = MAP.selectedZoom }) {
  const map = useMap();

  useEffect(() => {
    if (!geofence) return;

    if (isPolygonGeofence(geofence) && geofence.coordinates?.length >= 3) {
      map.flyToBounds(latLngBounds(geofence.coordinates), {
        padding: [48, 48],
        duration: 1,
        maxZoom: zoom,
      });
      return;
    }

    const center = getGeofenceCenter(geofence);
    if (center) {
      map.flyTo(center, zoom, { duration: 1 });
    }
  }, [geofence, trigger, map, zoom]);

  return null;
}
