/**
 * Capture Tracking GPS — Formatters
 * Arabic text/RTL preserved; all numeric output uses Western digits (en-US).
 */

import { LOCALE, UNITS } from './constants';

/** Always Western Arabic numerals (0-9) regardless of UI locale */
export const NUMBER_LOCALE = 'en-US';

/** Keep Western digits LTR inside RTL Arabic layout (see index.css `.NUMERIC_DISPLAY_CLASS`) */
export const NUMERIC_DISPLAY_CLASS = 'NUMERIC_DISPLAY_CLASS tabular-nums inline-block';

const dateLocale = LOCALE.default;

// ── Core number formatting ──

/**
 * Format any numeric value with en-US locale (Western digits + grouping).
 * @example formatNumber(1234) → "1,234"
 * @example formatNumber(1234.5, { maximumFractionDigits: 1 }) → "1,234.5"
 */
export function formatNumber(value, options = {}) {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';

  return num.toLocaleString(NUMBER_LOCALE, options);
}

/** Fixed decimal places without grouping ambiguity for small values */
function formatDecimal(value, decimals = 0) {
  return formatNumber(value, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** @deprecated Use formatNumber — kept for backward compatibility (returns Western digits) */
export function toArabicNumerals(value) {
  if (value == null || value === '') return '';
  const str = String(value);
  const num = Number(str);
  if (!Number.isNaN(num)) {
    return str.includes('.')
      ? formatDecimal(num, (str.split('.')[1] ?? '').length)
      : formatNumber(num, { maximumFractionDigits: 0 });
  }
  return str;
}

/** Convert Eastern Arabic-Indic digits to Western if present */
export function toWesternNumerals(value) {
  const str = String(value);
  const map = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
  return str.replace(/[٠-٩]/g, (d) => map[d] ?? d);
}

// ── Date & Time (Arabic month names; times may use locale — no digit conversion in dates from locale) ──

export function formatDate(isoString, options = {}) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
    ...options,
  });
}

export function formatTime(isoString, options = {}) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleTimeString(dateLocale, {
    hour: '2-digit',
    minute: '2-digit',
    numberingSystem: 'latn',
    ...options,
  });
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  return `${formatDate(isoString)}، ${formatTime(isoString)}`;
}

export function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'الآن';
  if (diffMin < 60) return `منذ ${formatNumber(diffMin, { maximumFractionDigits: 0 })} ${diffMin === 1 ? 'دقيقة' : 'دقائق'}`;
  if (diffHour < 24) return `منذ ${formatNumber(diffHour, { maximumFractionDigits: 0 })} ${diffHour === 1 ? 'ساعة' : 'ساعات'}`;
  if (diffDay < 7) return `منذ ${formatNumber(diffDay, { maximumFractionDigits: 0 })} ${diffDay === 1 ? 'يوم' : 'أيام'}`;

  return formatDate(isoString);
}

/** Structured parts for RTL UI — numeric span uses Western digits + dir=ltr */
export function formatRelativeTimeParts(isoString) {
  if (!isoString) return { type: 'empty', text: '—' };
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return { type: 'empty', text: '—' };

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return { type: 'now', text: 'الآن' };
  if (diffMin < 60) {
    return {
      type: 'relative',
      prefix: 'منذ',
      value: diffMin,
      suffix: diffMin === 1 ? 'دقيقة' : 'دقائق',
    };
  }
  if (diffHour < 24) {
    return {
      type: 'relative',
      prefix: 'منذ',
      value: diffHour,
      suffix: diffHour === 1 ? 'ساعة' : 'ساعات',
    };
  }
  if (diffDay < 7) {
    return {
      type: 'relative',
      prefix: 'منذ',
      value: diffDay,
      suffix: diffDay === 1 ? 'يوم' : 'أيام',
    };
  }
  return { type: 'date', text: formatDate(isoString) };
}

// ── Distance ──

/** Format km value → "245.3 km" (Western digits) */
export function formatDistance(km, decimals = 1) {
  if (km == null || Number.isNaN(km)) return '—';
  return `${formatDecimal(km, decimals)} ${UNITS.distance}`;
}

export function formatDistanceAuto(meters) {
  if (meters == null || Number.isNaN(meters)) return '—';
  if (meters >= 1000) return formatDistance(meters / 1000);
  return `${formatNumber(Math.round(meters), { maximumFractionDigits: 0 })} م`;
}

// ── Speed ──

/** Format speed → "72 km/h" (Western digits) */
export function formatSpeed(speed, decimals = 0) {
  if (speed == null || Number.isNaN(speed)) return '—';
  return `${formatDecimal(speed, decimals)} ${UNITS.speed}`;
}

// ── Percentage ──

export function formatPercent(value, decimals = 0) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${formatDecimal(value, decimals)}%`;
}

export const formatBattery = formatPercent;
export const formatSignal = formatPercent;
export const formatFuel = formatPercent;

// ── Odometer ──

/** Format odometer → "45,620 km" */
export function formatOdometer(km) {
  if (km == null || Number.isNaN(km)) return '—';
  return `${formatNumber(km, { maximumFractionDigits: 0 })} ${UNITS.distance}`;
}

// ── Coordinates ──

/** Format single coordinate → "36.8065" */
export function formatCoordinate(value, decimals = 4) {
  if (value == null || Number.isNaN(value)) return '—';
  return formatDecimal(value, decimals);
}

/** Format lat/lng → "36.8065، 10.1815" */
export function formatCoordinates(lat, lng, decimals = 4) {
  if (lat == null || lng == null) return '—';
  return `${formatCoordinate(lat, decimals)}، ${formatCoordinate(lng, decimals)}`;
}

// ── Plate Number ──

export function formatPlate(plate) {
  if (!plate) return '—';
  return plate.toUpperCase();
}

// ── Duration ──

export function formatDuration(hours) {
  if (hours == null || Number.isNaN(hours)) return '—';
  return `${formatDecimal(hours, 1)} س`;
}

export default {
  NUMBER_LOCALE,
  NUMERIC_DISPLAY_CLASS,
  formatNumber,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatDistance,
  formatDistanceAuto,
  formatSpeed,
  formatPercent,
  formatBattery,
  formatSignal,
  formatFuel,
  formatOdometer,
  formatCoordinate,
  formatCoordinates,
  formatPlate,
  formatDuration,
  toArabicNumerals,
  toWesternNumerals,
};
