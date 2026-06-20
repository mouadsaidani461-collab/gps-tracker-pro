import { validatePassword } from '../../utils/validation';
import { MIN_SETTINGS_PASSWORD_LENGTH } from './constants';

export function validateProfile(profile, t) {
  const errors = {};
  if (!profile.name?.trim()) errors.name = t('settings.validation.nameRequired');
  else if (profile.name.trim().length < 2) errors.name = t('settings.validation.nameMin');
  if (!profile.email?.trim()) errors.email = t('settings.validation.emailRequired');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
    errors.email = t('settings.validation.emailInvalid');
  }
  if (profile.phone?.trim() && !/^\+?[\d\s-]{8,}$/.test(profile.phone.trim())) {
    errors.phone = t('settings.validation.phoneInvalid');
  }
  return errors;
}

export function validateSecurity(passwords, changing, t, language) {
  if (!changing) return {};
  const errors = {};
  if (!passwords.current) errors.current = t('settings.validation.currentPasswordRequired');
  if (!passwords.next) errors.next = t('settings.validation.newPasswordRequired');
  else {
    const passwordError = validatePassword(passwords.next, {
      language,
      min: MIN_SETTINGS_PASSWORD_LENGTH,
    });
    if (passwordError) errors.next = passwordError;
  }
  if (passwords.next !== passwords.confirm) errors.confirm = t('settings.validation.passwordMismatch');
  return errors;
}
