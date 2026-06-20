import { describe, it, expect } from 'vitest';
import { SETTINGS_KEY } from '../../src/i18n';
import { loadSoundEnabled } from '../../src/utils/notificationPreferences';

describe('loadSoundEnabled', () => {
  it('defaults to true when settings are missing', () => {
    localStorage.removeItem(SETTINGS_KEY);
    expect(loadSoundEnabled()).toBe(true);
  });

  it('returns false when sound is disabled in settings', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ soundEnabled: false }));
    expect(loadSoundEnabled()).toBe(false);
  });
});
