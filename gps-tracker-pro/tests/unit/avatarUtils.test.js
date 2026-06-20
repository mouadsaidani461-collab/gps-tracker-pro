import { describe, it, expect } from 'vitest';
import { estimateDataUrlBytes } from '../../src/utils/avatarUtils';

describe('avatarUtils', () => {
  it('estimates data URL byte size from base64 payload', () => {
    const dataUrl = `data:image/jpeg;base64,${'A'.repeat(100)}`;
    expect(estimateDataUrlBytes(dataUrl)).toBe(75);
  });

  it('rejects unsupported file types', async () => {
    const { processAvatarFile } = await import('../../src/utils/avatarUtils');
    const t = (key) => key;
    await expect(processAvatarFile({ type: 'application/pdf', size: 100 }, t))
      .rejects.toThrow('settings.profile.photoInvalidType');
  });

  it('rejects files larger than 5 MB', async () => {
    const { processAvatarFile } = await import('../../src/utils/avatarUtils');
    const t = (key) => key;
    await expect(processAvatarFile({ type: 'image/jpeg', size: 6 * 1024 * 1024 }, t))
      .rejects.toThrow('settings.profile.photoTooLarge');
  });
});
