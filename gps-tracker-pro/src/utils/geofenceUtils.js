import { GEOFENCE_COLORS, GEOFENCE_TYPES } from './constants';

/** Parse Traccar POLYGON WKT (lat lon pairs) */
function parsePolygonArea(area) {
  const match = area?.match(/POLYGON\s*\(\(([^)]+)\)\)/i);
  if (!match) return [];
  return match[1].split(',').map((pair) => {
    const [lat, lon] = pair.trim().split(/\s+/).map(Number);
    return [lat, lon];
  }).filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
}

/** Parse Traccar CIRCLE area: CIRCLE (lat lon, radius) */
function parseCircleArea(area) {
  const parts = area?.replace(/CIRCLE|\(|\)|,/g, ' ').trim().split(/\s+/).map(Number);
  if (!parts || parts.length < 3) return null;
  return {
    center: [parts[0], parts[1]],
    radius: parts[2],
  };
}

/** Traccar uses numeric ids — keep consistent for selection/API URLs */
export function normalizeGeofenceId(id) {
  if (id == null) return id;
  const numeric = Number(id);
  return Number.isFinite(numeric) ? numeric : id;
}

export function sameGeofenceId(a, b) {
  return String(a) === String(b);
}

export function traccarGeofenceToApp(item, colorIndex = 0) {
  const color = item.attributes?.color ?? GEOFENCE_COLORS[colorIndex % GEOFENCE_COLORS.length];

  if (item.area?.includes('CIRCLE')) {
    const circle = parseCircleArea(item.area);
    if (!circle) return null;
    return normalizeGeofence({
      id: normalizeGeofenceId(item.id),
      name: item.name,
      type: GEOFENCE_TYPES.CIRCLE,
      center: circle.center,
      radius: circle.radius,
      color,
      attributes: item.attributes ?? {},
    });
  }

  const coordinates = parsePolygonArea(item.area);
  if (coordinates.length < 3) return null;

  return normalizeGeofence({
    id: normalizeGeofenceId(item.id),
    name: item.name,
    type: GEOFENCE_TYPES.POLYGON,
    coordinates,
    color,
    attributes: item.attributes ?? {},
  });
}

export function traccarGeofencesToApp(items) {
  return (items ?? [])
    .map((item, index) => traccarGeofenceToApp(item, index))
    .filter(Boolean);
}

export function appGeofenceToTraccar(geofence) {
  const attributes = { ...(geofence.attributes ?? {}), color: geofence.color };

  if (isPolygonGeofence(geofence)) {
    const coords = geofence.coordinates ?? [];
    const pairs = coords.map((p) => `${p[0]} ${p[1]}`);
    if (coords.length >= 3) {
      const [lat0, lon0] = coords[0];
      const [latN, lonN] = coords[coords.length - 1];
      if (lat0 !== latN || lon0 !== lonN) {
        pairs.push(`${lat0} ${lon0}`);
      }
    }
    return {
      id: normalizeGeofenceId(geofence.id),
      name: geofence.name,
      area: `POLYGON ((${pairs.join(', ')}))`,
      attributes,
    };
  }

  const [lat, lon] = geofence.center ?? [0, 0];
  return {
    id: normalizeGeofenceId(geofence.id),
    name: geofence.name,
    area: `CIRCLE (${lat} ${lon}, ${geofence.radius ?? 500})`,
    attributes,
  };
}

/** Normalize legacy geofences (no type field) */
export function normalizeGeofence(geofence) {
  if (!geofence) return geofence;

  if (geofence.type === GEOFENCE_TYPES.POLYGON && geofence.coordinates?.length >= 3) {
    return {
      ...geofence,
      type: GEOFENCE_TYPES.POLYGON,
      center: getGeofenceCenter(geofence),
    };
  }

  return {
    ...geofence,
    type: GEOFENCE_TYPES.CIRCLE,
    center: geofence.center,
  };
}

export function normalizeGeofences(list) {
  return (list ?? []).map(normalizeGeofence);
}

/** Centroid for fly-to / list display */
export function getGeofenceCenter(geofence) {
  if (geofence?.type === GEOFENCE_TYPES.POLYGON && geofence.coordinates?.length) {
    const lat = geofence.coordinates.reduce((sum, p) => sum + p[0], 0) / geofence.coordinates.length;
    const lng = geofence.coordinates.reduce((sum, p) => sum + p[1], 0) / geofence.coordinates.length;
    return [lat, lng];
  }
  return geofence?.center ?? null;
}

export function isCircleGeofence(geofence) {
  return !geofence?.type || geofence.type === GEOFENCE_TYPES.CIRCLE;
}

export function isPolygonGeofence(geofence) {
  return geofence?.type === GEOFENCE_TYPES.POLYGON;
}

export function geofenceSummary(geofence, formatNumber, t) {
  if (isPolygonGeofence(geofence)) {
    const count = geofence.coordinates?.length ?? 0;
    return t('geofence.summary.polygon', {
      count: formatNumber(count, { maximumFractionDigits: 0 }),
    });
  }
  const meters = geofence.radius ?? 0;
  if (meters >= 1000) {
    return t('geofence.summary.circleKm', {
      radius: formatNumber(meters / 1000, { maximumFractionDigits: 1 }),
    });
  }
  return t('geofence.summary.circleM', {
    radius: formatNumber(meters, { maximumFractionDigits: 0 }),
  });
}
