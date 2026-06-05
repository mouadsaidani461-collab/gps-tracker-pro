import { useCallback } from 'react';
import { useMap } from 'react-leaflet';
import {
  Plus, Minus, Layers, Maximize, Minimize, Crosshair,
} from 'lucide-react';
import { MAP } from '../../utils/constants';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export const TILE_LAYERS = {
  dark: {
    label: 'داكن',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
  street: {
    label: 'شارع',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
  },
  satellite: {
    label: 'قمر صناعي',
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
  const map = useMap();

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

  const btnClass = cn(
    'w-9 h-9 flex items-center justify-center rounded-lg',
    'bg-capture-card/90 backdrop-blur-md',
    'border border-slate-600/30 text-slate-300',
    'hover:text-capture-glow hover:border-capture-primary/40 hover:shadow-glow-sm',
    'transition-all duration-200',
  );

  return (
    <div className="absolute bottom-6 end-6 z-[1000] flex flex-col gap-1.5">
      {/* Zoom */}
      <button type="button" onClick={handleZoomIn} className={btnClass} aria-label="تكبير">
        <Plus className="w-4 h-4" />
      </button>
      <button type="button" onClick={handleZoomOut} className={btnClass} aria-label="تصغير">
        <Minus className="w-4 h-4" />
      </button>

      {/* Layer toggle */}
      <button
        type="button"
        onClick={cycleLayer}
        className={cn(btnClass, 'mt-1')}
        title={TILE_LAYERS[layer]?.label}
        aria-label="تبديل طبقة الخريطة"
      >
        <Layers className="w-4 h-4" />
      </button>

      {/* Center on vehicle */}
      <button
        type="button"
        onClick={handleCenterVehicle}
        disabled={!selectedVehicle}
        className={cn(btnClass, !selectedVehicle && 'opacity-40 cursor-not-allowed')}
        aria-label="توسيط على المركبة"
      >
        <Crosshair className="w-4 h-4" />
      </button>

      {/* Fullscreen */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className={btnClass}
        aria-label={isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}
      >
        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
      </button>

      {/* Layer label */}
      <div className="mt-1 px-2 py-1 rounded-lg bg-capture-card/90 backdrop-blur-md border border-slate-600/30 text-[10px] text-capture-metallic text-center">
        {TILE_LAYERS[layer]?.label}
      </div>
    </div>
  );
}
