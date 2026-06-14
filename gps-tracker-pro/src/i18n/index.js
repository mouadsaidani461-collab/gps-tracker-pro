import { LOCALE } from '../utils/constants';
import { messages } from './messages';

export const SETTINGS_KEY = 'capture_settings';

export const LANGUAGES = [
  { id: 'ar', flag: '🇲🇦', dir: 'rtl' },
  { id: 'fr', flag: '🇫🇷', dir: 'ltr' },
  { id: 'en', flag: '🇬🇧', dir: 'ltr' },
];

export function normalizeLanguageCode(value) {
  if (typeof value === 'string' && LOCALE.supported.includes(value)) {
    return value;
  }
  if (value && typeof value === 'object') {
    const code = value.code ?? value.id ?? value.lang;
    if (typeof code === 'string' && LOCALE.supported.includes(code)) {
      return code;
    }
  }
  return LOCALE.fallback;
}

function resolvePath(obj, path) {
  return path.split('.').reduce(
    (acc, part) => (acc && acc[part] != null ? acc[part] : undefined),
    obj,
  );
}

export function translate(language, key, params = {}) {
  const lang = normalizeLanguageCode(language);
  let text = resolvePath(messages[lang], key)
    ?? resolvePath(messages[LOCALE.fallback], key)
    ?? key;

  if (typeof text !== 'string') return key;

  Object.entries(params).forEach(([name, value]) => {
    text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
  });

  return text;
}

export function getStoredLanguage() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.language && LOCALE.supported.includes(parsed.language)) {
        return parsed.language;
      }
    }
  } catch {
    /* ignore */
  }
  return LOCALE.fallback;
}

export function persistLanguage(language) {
  const code = normalizeLanguageCode(language);
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data.language = code;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    localStorage.setItem('gps-language', code);
  } catch {
    /* ignore */
  }
  return code;
}

export function getDirectionForLanguage(language) {
  const code = normalizeLanguageCode(language);
  return LANGUAGES.find((l) => l.id === code)?.dir ?? 'rtl';
}

export function applyDocumentLanguage(language) {
  const code = normalizeLanguageCode(language);
  const dir = getDirectionForLanguage(code);
  document.documentElement.lang = code;
  document.documentElement.dir = dir;
  document.body.lang = code;
  document.body.dir = dir;
  document.documentElement.style.setProperty('--app-direction', dir);
  try {
    localStorage.setItem('gps-language', code);
    localStorage.setItem('gps-direction', dir);
  } catch {
    /* ignore */
  }
}

export function getIntlLocale(language) {
  const code = normalizeLanguageCode(language);
  const map = { ar: 'ar-MA', fr: 'fr-FR', en: 'en-US' };
  return map[code] ?? map[LOCALE.fallback];
}

export function getLanguageMeta(idOrMeta) {
  const id = typeof idOrMeta === 'string' ? idOrMeta : idOrMeta?.id;
  const meta = LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];
  return {
    ...meta,
    label: translate(meta.id, `settings.language.${meta.id}`),
  };
}
