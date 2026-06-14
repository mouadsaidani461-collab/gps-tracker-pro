import { useCallback, useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import {
  Plus, Minus, Layers, Maximize, Minimize, Crosshair,
} from 'lucide-react';
import { MAP } from '../../utils/constants';
import { useLocale } from '../../context/LocaleContext';
import { useFormatters } from '../../hooks/useFormatters';
import { formatNumber, NUMERIC_DISPLAY_CLASS } from '../../utils/formatters';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
};

export default function MapControls({
  layer = 'dark',
  onLayerChange,
  selectedVehicle,
  isFullscreen = false,
  onFullscreenChange,
}) {
  const { t } = useLocale();
  const { formatCoordinates } = useFormatters();
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useEffect(() => {
    const syncZoom = () => setZoom(map.getZoom());
    syncZoom();
    map.on('zoomend', syncZoom);
    return () => {
      map.off('zoomend', syncZoom);
    };
  }, [map]);

  const handleZoomIn = useCallback(() => map.zoomIn(), [map]);
  const handleZoomOut = useCallback(() => map.zoomOut(), [map]);

  const cycleLayer = useCallback(() => {
    const keys = Object.keys(TILE_LAYERS);
    const idx = keys.indexOf(layer);
    const next = keys[(idx + 1) % keys.length];
    onLayerChange?.(next);
  }, [layer, onLayerChange]);

  const handleCenterVehicle = useCallback(() => {
    if (!selectedVehicle) return;
    map.flyTo(
      [selectedVehicle.location.lat, selectedVehicle.location.lng],
      MAP.selectedZoom,
      { duration: 1.2 },
    );
  }, [map, selectedVehicle]);

  const toggleFullscreen = useCallback(() => {
    const container = map.getContainer().parentElement ?? map.getContainer();
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().then(() => onFullscreenChange?.(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => onFullscreenChange?.(false)).catch(() => {});
    }
  }, [map, onFullscreenChange]);

  const layerLabel = t(`map.layers.${layer}`);

  const btnClass = cn(
    'w-9 h-9 flex items-center justify-center rounded-lg',
    'bg-capture-card/90 backdrop-blur-md',
    'border border-slate-600/30 text-slate-300',
    'hover:text-capture-glow hover:border-capture-primary/40 hover:shadow-glow-sm',
    'transition-all duration-200',
  );

  const panelClass = cn(
    'px-2 py-1 rounded-lg bg-capture-card/90 backdrop-blur-md',
    'border border-slate-600/30 text-[10px] text-capture-metallic text-center',
  );

  return (
    <div className="absolute bottom-6 end-6 z-[1000] flex flex-col gap-1.5">
      <button type="button" onClick={handleZoomIn} className={btnClass} aria-label={t('mapControls.zoomIn')}>
        <Plus className="w-4 h-4" />
      </button>
      <button type="button" onClick={handleZoomOut} className={btnClass} aria-label={t('mapControls.zoomOut')}>
        <Minus className="w-4 h-4" />
      </button>

      <div className={cn(panelClass, 'leaflet-control-zoom-level')} dir="ltr">
        <span className={NUMERIC_DISPLAY_CLASS} dir="ltr">
          {formatNumber(zoom, { maximumFractionDigits: 0 })}
        </span>
      </div>

      <button
        type="button"
        onClick={cycleLayer}
        className={cn(btnClass, 'mt-1')}
        title={layerLabel}
        aria-label={t('mapControls.toggleLayer')}
      >
        <Layers className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={handleCenterVehicle}
        disabled={!selectedVehicle}
        className={cn(btnClass, !selectedVehicle && 'opacity-40 cursor-not-allowed')}
        aria-label={t('mapControls.centerVehicle')}
      >
        <Crosshair className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={toggleFullscreen}
        className={btnClass}
        aria-label={isFullscreen ? t('mapControls.exitFullscreen') : t('mapControls.enterFullscreen')}
      >
        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
      </button>

      <div className={cn(panelClass, 'mt-1')}>
        {layerLabel}
      </div>

      {selectedVehicle && (
        <div className={cn(panelClass, 'capture-map-coords mt-1 max-w-[9rem]')} dir="ltr">
          <span className={cn(NUMERIC_DISPLAY_CLASS, 'text-[9px] leading-tight block')} dir="ltr">
            {formatCoordinates(selectedVehicle.location.lat, selectedVehicle.location.lng)}
          </span>
        </div>
      )}
    </div>
  );
}
