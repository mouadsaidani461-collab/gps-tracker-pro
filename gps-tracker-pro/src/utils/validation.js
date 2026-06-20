import { translate } from '../i18n';
import { APP_MIN_PASSWORD_LENGTH } from './constants';

export const MIN_PASSWORD_LENGTH = APP_MIN_PASSWORD_LENGTH;

const IMEI_PATTERN = /^\d{15}$/;
const MOROCCO_PHONE_PATTERN = /^\+212[5-7]\d{8}$/;

function t(language, key, params) {
  return translate(language, key, params);
}

/** @returns {string | null} error message or null if valid */
export function validateImei(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return t(undefined, 'validation.imeiRequired');
  if (!IMEI_PATTERN.test(raw)) return t(undefined, 'validation.imeiInvalid');
  return null;
}

/** @returns {string | null} */
export function validateMoroccoPhone(value, { language } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (MOROCCO_PHONE_PATTERN.test(raw)) return null;
  return t(language, 'validation.phoneInvalid');
}

/** @returns {string | null} */
export function validatePassword(value, { language, min = MIN_PASSWORD_LENGTH } = {}) {
  const raw = String(value ?? '');
  if (!raw) return t(language, 'validation.passwordRequired');
  if (raw.length < min) {
    return t(language, 'validation.passwordMinLength', { min });
  }
  return null;
}

/** @returns {string | null} */
export function validateRequiredName(value, labelKey, language) {
  const raw = String(value ?? '').trim();
  const label = t(language, labelKey);
  if (!raw) return t(language, 'validation.nameRequired', { label });
  if (raw.length < 2) return t(language, 'validation.nameMinLength', { label });
  return null;
}

/** @returns {string | null} */
export function validateUniqueId(value, { minLength = 5, required = true, language } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required ? t(language, 'validation.uniqueIdRequired') : null;
  }
  if (raw.length < minLength) {
    return t(language, 'validation.uniqueIdMinLength', { min: minLength });
  }
  return null;
}

/** @returns {string | null} */
export function checkDuplicateUniqueId(uniqueId, existingDevices, editingId, language) {
  const raw = String(uniqueId ?? '').trim().toLowerCase();
  if (!raw) return null;
  const duplicate = (existingDevices ?? []).some(
    (d) => String(d.uniqueId ?? '').trim().toLowerCase() === raw
      && String(d.id) !== String(editingId),
  );
  return duplicate ? t(language, 'validation.uniqueIdDuplicate') : null;
}
