/**
 * Capture Tracking GPS — Theme Context
 * Dark mode + accent color with CSS variable injection
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { COLORS } from '../utils/constants';

const THEME_STORAGE_KEY = 'capture_theme';
const ACCENT_STORAGE_KEY = 'capture_accent';

const DEFAULT_ACCENT = COLORS.primary;

const PRESET_ACCENTS = [
  { id: 'cyan', label: 'سماوي', value: '#06b6d4', glow: '#67e8f9' },
  { id: 'emerald', label: 'زمردي', value: '#10b981', glow: '#6ee7b7' },
  { id: 'violet', label: 'بنفسجي', value: '#8b5cf6', glow: '#c4b5fd' },
  { id: 'rose', label: 'وردي', value: '#f43f5e', glow: '#fda4af' },
  { id: 'amber', label: 'كهرماني', value: '#f59e0b', glow: '#fcd34d' },
];

const ThemeContext = createContext(null);

function loadStoredTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { mode: 'dark', accent: DEFAULT_ACCENT };
  } catch {
    return { mode: 'dark', accent: DEFAULT_ACCENT };
  }
}

function applyThemeVariables(accent, glow) {
  const root = document.documentElement;
  root.style.setProperty('--color-capture-primary', accent);
  root.style.setProperty('--color-capture-glow', glow);
  root.style.setProperty('--accent-color', accent);
  root.style.setProperty('--accent-glow', glow);
}

export function ThemeProvider({ children }) {
  const stored = loadStoredTheme();
  const [mode, setMode] = useState(stored.mode ?? 'dark');
  const [accentColor, setAccentColorState] = useState(
    () => localStorage.getItem(ACCENT_STORAGE_KEY) ?? stored.accent ?? DEFAULT_ACCENT,
  );

  const activePreset = useMemo(
    () => PRESET_ACCENTS.find((p) => p.value === accentColor) ?? PRESET_ACCENTS[0],
    [accentColor],
  );

  // Apply dark class + CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.classList.toggle('light', mode === 'light');
    applyThemeVariables(activePreset.value, activePreset.glow);
  }, [mode, activePreset]);

  const setAccentColor = useCallback((color) => {
    setAccentColorState(color);
    localStorage.setItem(ACCENT_STORAGE_KEY, color);
    const preset = PRESET_ACCENTS.find((p) => p.value === color);
    applyThemeVariables(color, preset?.glow ?? COLORS.glow);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: next, accent: accentColor }));
      return next;
    });
  }, [accentColor]);

  const setThemeMode = useCallback(
    (newMode) => {
      setMode(newMode);
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: newMode, accent: accentColor }));
    },
    [accentColor],
  );

  const resetTheme = useCallback(() => {
    setMode('dark');
    setAccentColorState(DEFAULT_ACCENT);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: 'dark', accent: DEFAULT_ACCENT }));
    localStorage.setItem(ACCENT_STORAGE_KEY, DEFAULT_ACCENT);
    applyThemeVariables(DEFAULT_ACCENT, COLORS.glow);
  }, []);

  const isDark = mode === 'dark';

  const value = useMemo(
    () => ({
      mode,
      isDark,
      accentColor,
      accentGlow: activePreset.glow,
      presets: PRESET_ACCENTS,
      setAccentColor,
      toggleMode,
      setThemeMode,
      resetTheme,
    }),
    [mode, isDark, accentColor, activePreset.glow, setAccentColor, toggleMode, setThemeMode, resetTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export default ThemeContext;
