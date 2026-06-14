/**
 * Capture Tracking GPS — Formatters
 * Numeric output uses Western digits (en-US); dates/units follow selected language.
 */

import { getIntlLocale, translate } from '../i18n';
import { LOCALE } from './constants';

/** Always Western Arabic numerals (0-9) regardless of UI locale */
export const NUMBER_LOCALE = 'en-US';

/** Keep Western digits LTR inside RTL layout (see index.css `.NUMERIC_DISPLAY_CLASS`) */
export const NUMERIC_DISPLAY_CLASS = 'NUMERIC_DISPLAY_CLASS tabular-nums inline-block';

function resolveLanguage(language) {
  return language && LOCALE.supported.includes(language) ? language : LOCALE.fallback;
}

function unitsFor(language) {
  const lang = resolveLanguage(language);
  return {
    speed: translate(lang, 'units.speed'),
    distance: translate(lang, 'units.distance'),
    meters: translate(lang, 'units.meters'),
    durationHours: translate(lang, 'units.durationHours'),
    dateTimeSeparator: translate(lang, 'units.dateTimeSeparator'),
    listSeparator: translate(lang, 'units.listSeparator'),
  };
}

function intlLocaleFor(language) {
  return getIntlLocale(resolveLanguage(language));
}

// ── Core number formatting ──

/**
 * Format any numeric value with en-US locale (Western digits + grouping).
 */
export function formatNumber(value, options = {}) {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';

  return num.toLocaleString(NUMBER_LOCALE, options);
}

function formatDecimal(value, decimals = 0) {
  return formatNumber(value, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** @deprecated Use formatNumber — kept for backward compatibility */
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

// ── Date & Time ──

export function formatDate(isoString, options = {}, language = LOCALE.fallback) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(intlLocaleFor(language), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
    ...options,
  });
}

export function formatTime(isoString, options = {}, language = LOCALE.fallback) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleTimeString(intlLocaleFor(language), {
    hour: '2-digit',
    minute: '2-digit',
    numberingSystem: 'latn',
    ...options,
  });
}

export function formatDateTime(isoString, language = LOCALE.fallback) {
  if (!isoString) return '—';
  const units = unitsFor(language);
  return `${formatDate(isoString, {}, language)}${units.dateTimeSeparator}${formatTime(isoString, {}, language)}`;
}

export function formatRelativeTime(isoString, language = LOCALE.fallback) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';

  const lang = resolveLanguage(language);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return translate(lang, 'time.now');
  if (diffMin < 60) {
    const key = diffMin === 1 ? 'time.agoOneMinute' : 'time.agoMinutes';
    return translate(lang, key, { count: diffMin });
  }
  if (diffHour < 24) {
    const key = diffHour === 1 ? 'time.agoOneHour' : 'time.agoHours';
    return translate(lang, key, { count: diffHour });
  }
  if (diffDay < 7) {
    const key = diffDay === 1 ? 'time.agoOneDay' : 'time.agoDays';
    return translate(lang, key, { count: diffDay });
  }

  return formatDate(isoString, {}, language);
}

/** Structured parts for RTL/LTR UI — numeric span uses Western digits + dir=ltr */
export function formatRelativeTimeParts(isoString, language = LOCALE.fallback) {
  if (!isoString) return { type: 'empty', text: '—' };
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return { type: 'empty', text: '—' };

  const lang = resolveLanguage(language);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return { type: 'now', text: translate(lang, 'time.now') };
  if (diffMin < 60) {
    return {
      type: 'relative',
      prefix: translate(lang, 'time.prefixAgo'),
      value: diffMin,
      suffix: diffMin === 1 ? translate(lang, 'time.minute') : translate(lang, 'time.minutes'),
    };
  }
  if (diffHour < 24) {
    return {
      type: 'relative',
      prefix: translate(lang, 'time.prefixAgo'),
      value: diffHour,
      suffix: diffHour === 1 ? translate(lang, 'time.hour') : translate(lang, 'time.hours'),
    };
  }
  if (diffDay < 7) {
    return {
      type: 'relative',
      prefix: translate(lang, 'time.prefixAgo'),
      value: diffDay,
      suffix: diffDay === 1 ? translate(lang, 'time.day') : translate(lang, 'time.days'),
    };
  }
  return { type: 'date', text: formatDate(isoString, {}, language) };
}

// ── Distance ──

export function formatDistance(km, decimals = 1, language = LOCALE.fallback) {
  if (km == null || Number.isNaN(km)) return '—';
  const units = unitsFor(language);
  return `${formatDecimal(km, decimals)} ${units.distance}`;
}

export function formatDistanceAuto(meters, language = LOCALE.fallback) {
  if (meters == null || Number.isNaN(meters)) return '—';
  const units = unitsFor(language);
  if (meters >= 1000) return formatDistance(meters / 1000, 1, language);
  return `${formatNumber(Math.round(meters), { maximumFractionDigits: 0 })} ${units.meters}`;
}

// ── Speed ──

export function formatSpeed(speed, decimals = 0, language = LOCALE.fallback) {
  if (speed == null || Number.isNaN(speed)) return '—';
  const units = unitsFor(language);
  return `${formatDecimal(speed, decimals)} ${units.speed}`;
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

export function formatOdometer(km, language = LOCALE.fallback) {
  if (km == null || Number.isNaN(km)) return '—';
  const units = unitsFor(language);
  return `${formatNumber(km, { maximumFractionDigits: 0 })} ${units.distance}`;
}

// ── Coordinates ──

export function formatCoordinate(value, decimals = 4) {
  if (value == null || Number.isNaN(value)) return '—';
  return formatDecimal(value, decimals);
}

export function formatCoordinates(lat, lng, decimals = 4, language = LOCALE.fallback) {
  if (lat == null || lng == null) return '—';
  const units = unitsFor(language);
  return `${formatCoordinate(lat, decimals)}${units.listSeparator}${formatCoordinate(lng, decimals)}`;
}

// ── Plate Number ──

export function formatPlate(plate) {
  if (!plate) return '—';
  return plate.toUpperCase();
}

// ── Duration ──

export function formatDuration(hours, language = LOCALE.fallback) {
  if (hours == null || Number.isNaN(hours)) return '—';
  const units = unitsFor(language);
  return `${formatDecimal(hours, 1)} ${units.durationHours}`;
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
