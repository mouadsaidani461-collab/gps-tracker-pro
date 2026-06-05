import { useMemo } from 'react';
import { Polyline } from 'react-leaflet';

const GRADIENT_START = '#0891b2';
const GRADIENT_END = '#67e8f9';

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 6, g: 182, b: 212 };
}

function interpolateColor(start, end, t) {
  const s = hexToRgb(start);
  const e = hexToRgb(end);
  const r = Math.round(s.r + (e.r - s.r) * t);
  const g = Math.round(s.g + (e.g - s.g) * t);
  const b = Math.round(s.b + (e.b - s.b) * t);
  return `rgb(${r},${g},${b})`;
}

export default function RoutePolyline({
  coordinates = [],
  weight = 4,
  dashArray = '12, 8',
  opacity = 0.85,
}) {
  const segments = useMemo(() => {
    if (coordinates.length < 2) return [];

    const result = [];
    for (let i = 0; i < coordinates.length - 1; i += 1) {
      const t = i / (coordinates.length - 2);
      result.push({
        key: `seg-${i}`,
        positions: [coordinates[i], coordinates[i + 1]],
        color: interpolateColor(GRADIENT_START, GRADIENT_END, t),
      });
    }
    return result;
  }, [coordinates]);

  if (segments.length === 0) return null;

  return (
    <>
      {/* Glow underlay */}
      <Polyline
        positions={coordinates}
        pathOptions={{
          color: '#06b6d4',
          weight: weight + 4,
          opacity: 0.15,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      {segments.map(({ key, positions, color }) => (
        <Polyline
          key={key}
          positions={positions}
          pathOptions={{
            color,
            weight,
            opacity,
            dashArray,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      ))}
    </>
  );
}
