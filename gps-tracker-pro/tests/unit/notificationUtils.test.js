import { describe, it, expect } from 'vitest';
import { mergeNotifications } from '../../src/utils/notificationUtils';

describe('mergeNotifications', () => {
  it('prepends incoming notifications and deduplicates by id', () => {
    const prev = [{ id: 'a', title: 'Old A' }];
    const incoming = [{ id: 'b', title: 'New B' }, { id: 'a', title: 'Dup A' }];

    const merged = mergeNotifications(prev, incoming, 10);

    expect(merged.map((item) => item.id)).toEqual(['b', 'a']);
    expect(merged[1].title).toBe('Dup A');
  });

  it('respects max notification limit', () => {
    const prev = [{ id: '1' }, { id: '2' }];
    const incoming = [{ id: '3' }];

    expect(mergeNotifications(prev, incoming, 2)).toHaveLength(2);
    expect(mergeNotifications(prev, incoming, 2)[0].id).toBe('3');
  });
});
