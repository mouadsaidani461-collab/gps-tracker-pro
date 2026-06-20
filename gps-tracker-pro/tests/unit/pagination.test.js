import { describe, it, expect } from 'vitest';
import { getVisiblePageNumbers } from '../../src/utils/pagination';

describe('pagination utils', () => {
  it('returns all pages when total fits window', () => {
    expect(getVisiblePageNumbers(1, 5, 7)).toEqual([1, 2, 3, 4, 5]);
  });

  it('slides window around current page', () => {
    expect(getVisiblePageNumbers(5, 10, 7)).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });
});
