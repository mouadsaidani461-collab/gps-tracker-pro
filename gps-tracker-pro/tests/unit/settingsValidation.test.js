import { describe, it, expect, vi } from 'vitest';
import { validateProfile, validateSecurity } from '../../src/pages/settings/validation';

vi.mock('../../src/i18n', () => ({
  translate: (_lang, key, params) => {
    if (params?.min) return `${key}:${params.min}`;
    return key;
  },
}));

const t = (key, params) => {
  if (params?.min) return `${key}:${params.min}`;
  if (params?.tab) return `${key}:${params.tab}`;
  return key;
};

describe('settings validation', () => {
  it('requires profile name and valid email', () => {
    const errors = validateProfile({ name: '', email: 'bad', phone: '' }, t);
    expect(errors.name).toBeTruthy();
    expect(errors.email).toBeTruthy();
  });

  it('accepts valid profile fields', () => {
    const errors = validateProfile({
      name: 'Admin User',
      email: 'admin@example.com',
      phone: '+212612345678',
    }, t);
    expect(errors).toEqual({});
  });

  it('rejects invalid phone format', () => {
    const errors = validateProfile({
      name: 'Admin User',
      email: 'admin@example.com',
      phone: '123',
    }, t);
    expect(errors.phone).toBe('settings.validation.phoneInvalid');
  });

  it('rejects short new password on security tab', () => {
    const errors = validateSecurity({
      current: 'old-password-ok',
      next: 'short',
      confirm: 'short',
    }, true, t, 'en');
    expect(errors.next).toContain('12');
  });

  it('requires matching password confirmation', () => {
    const errors = validateSecurity({
      current: 'old-password-ok',
      next: 'valid-password-12',
      confirm: 'different-password',
    }, true, t, 'en');
    expect(errors.confirm).toBe('settings.validation.passwordMismatch');
  });
});
