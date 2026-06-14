/**
 * Trip replay — distance, stops, stats (Traccar positions)
 */

const KNOTS_TO_KMH = 1.852;
const STOP_SPEED_KMH = 5;
const STOP_MIN_MS = 5 * 60 * 1000;

export const SPEED_COLORS = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#ef4444',
};

export function knotsToKmh(knots) {
  return (knots || 0) * KNOTS_TO_KMH;
}

export function speedColor(speedKmh) {
  if (speedKmh == null || Number.isNaN(speedKmh)) return SPEED_COLORS.low;
  if (speedKmh > 80) return SPEED_COLORS.high;
  if (speedKmh >= 60) return SPEED_COLORS.medium;
  return SPEED_COLORS.low;
}

export function normalizePosition(pos) {
  const speedKmh = knotsToKmh(pos.speed);
  return {
    ...pos,
    speedKmh,
    fixTime: pos.fixTime || pos.deviceTime || pos.serverTime,
  };
}

export function normalizePositions(positions) {
  return (positions ?? [])
    .map(normalizePosition)
    .filter((p) => p.latitude != null && p.longitude != null)
    .sort((a, b) => new Date(a.fixTime) - new Date(b.fixTime));
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180)
    * Math.cos((lat2 * Math.PI) / 180)
    * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function detectStops(positions) {
  const stops = [];
  let currentStop = null;

  for (let i = 0; i < positions.length; i += 1) {
    const pos = positions[i];
    const speed = pos.speedKmh ?? knotsToKmh(pos.speed);

    if (speed < STOP_SPEED_KMH) {
      if (!currentStop) {
        currentStop = {
          startIndex: i,
          startTime: pos.fixTime,
          latitude: pos.latitude,
          longitude: pos.longitude,
        };
      }
    } else if (currentStop) {
      const endTime = positions[i - 1]?.fixTime ?? pos.fixTime;
      const duration = new Date(endTime) - new Date(currentStop.startTime);
      if (duration >= STOP_MIN_MS) {
        stops.push({
          ...currentStop,
          endIndex: i - 1,
          endTime,
          duration,
        });
      }
      currentStop = null;
    }
  }

  if (currentStop && positions.length > 0) {
    const last = positions[positions.length - 1];
    const duration = new Date(last.fixTime) - new Date(currentStop.startTime);
    if (duration >= STOP_MIN_MS) {
      stops.push({
        ...currentStop,
        endIndex: positions.length - 1,
        endTime: last.fixTime,
        duration,
      });
    }
  }

  return stops;
}

export function computeTripStats(positions, stops = []) {
  if (!positions?.length) {
    return {
      distanceKm: 0,
      durationMs: 0,
      durationHours: 0,
      maxSpeedKmh: 0,
      avgSpeedKmh: 0,
      stopCount: stops.length,
    };
  }

  let distanceKm = 0;
  for (let i = 1; i < positions.length; i += 1) {
    const prev = positions[i - 1];
    const curr = positions[i];
    distanceKm += calculateDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude,
    );
  }

  const startMs = new Date(positions[0].fixTime).getTime();
  const endMs = new Date(positions[positions.length - 1].fixTime).getTime();
  const durationMs = Math.max(0, endMs - startMs);
  const durationHours = durationMs / (1000 * 60 * 60);

  const speeds = positions.map((p) => p.speedKmh ?? knotsToKmh(p.speed));
  const maxSpeedKmh = speeds.length ? Math.max(...speeds) : 0;
  const avgSpeedKmh = durationHours > 0 ? distanceKm / durationHours : 0;

  return {
    distanceKm,
    durationMs,
    durationHours,
    maxSpeedKmh,
    avgSpeedKmh,
    stopCount: stops.length,
  };
}

export function formatDurationMs(ms) {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
