import { Polygon, Tooltip } from 'react-leaflet';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function GeofencePolygon({
  geofence,
  color,
  showLabel = true,
  isSelected = false,
  onSelect,
}) {
  const fillColor = color ?? geofence.color ?? '#06b6d4';
  const positions = geofence.coordinates ?? [];

  if (positions.length < 3) return null;

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: fillColor,
        fillColor,
        fillOpacity: isSelected ? 0.22 : 0.1,
        weight: isSelected ? 3 : 2,
        dashArray: isSelected ? undefined : '6, 6',
        opacity: isSelected ? 1 : 0.7,
      }}
      eventHandlers={{
        click: (e) => {
          e.originalEvent?.stopPropagation?.();
          onSelect?.(geofence);
        },
      }}
    >
      {showLabel && (
        <Tooltip
          direction="center"
          permanent={isSelected}
          className="capture-geofence-tooltip"
        >
          <span className={cn('text-xs font-medium', isSelected && 'text-capture-glow')}>
            {geofence.name}
          </span>
        </Tooltip>
      )}
    </Polygon>
  );
}
