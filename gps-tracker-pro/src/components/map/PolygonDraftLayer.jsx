import { Polygon, Polyline, CircleMarker } from 'react-leaflet';
import { GEOFENCE_DEFAULTS } from '../../utils/constants';

export default function PolygonDraftLayer({ points = [], color = '#06b6d4' }) {
  if (points.length === 0) return null;

  return (
    <>
      {points.map((point, index) => (
        <CircleMarker
          key={`draft-vertex-${index}`}
          center={point}
          radius={6}
          pathOptions={{
            color: '#fff',
            fillColor: color,
            fillOpacity: 1,
            weight: 2,
          }}
        />
      ))}

      {points.length >= 2 && points.length < GEOFENCE_DEFAULTS.minPolygonPoints && (
        <Polyline
          positions={points}
          pathOptions={{
            color,
            weight: 2,
            dashArray: '8, 8',
            opacity: 0.9,
          }}
        />
      )}

      {points.length >= GEOFENCE_DEFAULTS.minPolygonPoints && (
        <Polygon
          positions={points}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '4, 4',
            opacity: 0.85,
          }}
        />
      )}
    </>
  );
}
