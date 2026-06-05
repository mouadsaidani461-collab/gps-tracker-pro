import { useMemo, useRef, useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { VEHICLE_STATUS, VEHICLE_STATUS_LABELS } from '../../utils/constants';
import { formatSpeed, formatPlate, NUMERIC_DISPLAY_CLASS } from '../../utils/formatters';

const STATUS_COLORS = {
  [VEHICLE_STATUS.MOVING]: { main: '#06b6d4', glow: '#67e8f9' },
  [VEHICLE_STATUS.IDLE]: { main: '#f59e0b', glow: '#fcd34d' },
  [VEHICLE_STATUS.ONLINE]: { main: '#10b981', glow: '#6ee7b7' },
  [VEHICLE_STATUS.OFFLINE]: { main: '#64748b', glow: '#94a3b8' },
  [VEHICLE_STATUS.ALERT]: { main: '#f43f5e', glow: '#fda4af' },
};

function computeBearing(from, to) {
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1r = (lat1 * Math.PI) / 180;
  const lat2r = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2r);
  const x = Math.cos(lat1r) * Math.sin(lat2r) - Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function createMarkerIcon(status, heading, isSelected, isPulsing) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS[VEHICLE_STATUS.ONLINE];
  const pulseRing = isPulsing
    ? `<span style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${colors.main};opacity:0.6;animation:marker-pulse 2s ease-out infinite;"></span>`
    : '';

  const selectedRing = isSelected
    ? `<span style="position:absolute;inset:-10px;border-radius:50%;border:2px solid #67e8f9;opacity:0.8;box-shadow:0 0 16px rgba(103,232,249,0.5);"></span>`
    : '';

  const showDirection = status === VEHICLE_STATUS.MOVING || status === VEHICLE_STATUS.ALERT;

  return L.divIcon({
    className: 'capture-vehicle-marker',
    html: `
      <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
        ${pulseRing}
        ${selectedRing}
        <div style="
          width:32px;height:32px;border-radius:50%;
          background:linear-gradient(135deg,${colors.glow},${colors.main});
          border:2px solid rgba(255,255,255,0.9);
          box-shadow:0 2px 12px ${colors.main}66;
          display:flex;align-items:center;justify-content:center;
          transform:rotate(${showDirection ? heading : 0}deg);
          transition:transform 0.4s ease;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style="margin-top:-2px;">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export default function VehicleMarker({
  vehicle,
  isSelected = false,
  onSelect,
}) {
  const prevPos = useRef(null);
  const [heading, setHeading] = useState(0);

  const position = [vehicle.location.lat, vehicle.location.lng];

  useEffect(() => {
    if (prevPos.current) {
      const dist = Math.abs(position[0] - prevPos.current[0]) + Math.abs(position[1] - prevPos.current[1]);
      if (dist > 0.00001) {
        setHeading(computeBearing(prevPos.current, position));
      }
    }
    prevPos.current = position;
  }, [position[0], position[1]]);

  const isPulsing = vehicle.status === VEHICLE_STATUS.MOVING
    || vehicle.status === VEHICLE_STATUS.ALERT;

  const icon = useMemo(
    () => createMarkerIcon(vehicle.status, heading, isSelected, isPulsing),
    [vehicle.status, heading, isSelected, isPulsing],
  );

  return (
    <Marker
      position={position}
      icon={icon}
      eventHandlers={{
        click: () => onSelect?.(vehicle),
      }}
    >
      <Popup className="capture-popup" minWidth={200}>
        <div dir="rtl" className="text-start space-y-1.5 p-1">
          <p className="font-semibold text-slate-800 text-sm">{vehicle.name}</p>
          <p className="text-xs text-slate-500">{formatPlate(vehicle.plate)}</p>
          <p className="text-xs">
            <span
              className="inline-block px-2 py-0.5 rounded-full font-medium"
              style={{
                background: `${STATUS_COLORS[vehicle.status]?.main}22`,
                color: STATUS_COLORS[vehicle.status]?.main,
              }}
            >
              {VEHICLE_STATUS_LABELS[vehicle.status]}
            </span>
          </p>
          <p dir="ltr" className={`text-sm text-slate-700 ${NUMERIC_DISPLAY_CLASS}`}>{formatSpeed(vehicle.speed)}</p>
          <p className="text-xs text-slate-500 line-clamp-2">{vehicle.location.address}</p>
        </div>
      </Popup>
    </Marker>
  );
}
