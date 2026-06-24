import { describe, it, expect } from 'vitest';
import { parseTotpServerEnabled } from '../../src/utils/serverAttributes';

describe('parseTotpServerEnabled', () => {
  it('returns true when totpEnable is boolean true', () => {
    expect(parseTotpServerEnabled({ attributes: { totpEnable: true } })).toBe(true);
  });

  it('returns true when totpEnable is string "true"', () => {
    expect(parseTotpServerEnabled({ attributes: { totpEnable: 'true' } })).toBe(true);
  });

  it('returns false when missing or false', () => {
    expect(parseTotpServerEnabled({})).toBe(false);
    expect(parseTotpServerEnabled({ attributes: { totpEnable: false } })).toBe(false);
    expect(parseTotpServerEnabled(null)).toBe(false);
  });
});
