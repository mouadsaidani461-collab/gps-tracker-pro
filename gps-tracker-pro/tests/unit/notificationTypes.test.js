import { describe, it, expect } from 'vitest';
import {
  normalizeNotificationType,
  isCriticalNotification,
} from '../../src/components/notifications/notificationTypes';

describe('notificationTypes', () => {
  it('normalizes legacy and current type names', () => {
    expect(normalizeNotificationType('alert')).toBe('critical');
    expect(normalizeNotificationType('critical')).toBe('critical');
    expect(normalizeNotificationType('warning')).toBe('warning');
    expect(normalizeNotificationType('unknown')).toBe('info');
  });

  it('detects critical notifications', () => {
    expect(isCriticalNotification({ type: 'alert' })).toBe(true);
    expect(isCriticalNotification({ type: 'warning' })).toBe(false);
  });
});
