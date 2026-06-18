const DEFAULT_DARK_TILE_URL = import.meta.env.VITE_MAP_TILE_URL
  || 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export const TILE_LAYERS = {
  dark: {
    url: DEFAULT_DARK_TILE_URL,
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
