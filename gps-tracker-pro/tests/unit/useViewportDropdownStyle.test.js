// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRef } from 'react';
import { useViewportDropdownStyle } from '../../src/hooks/useViewportDropdownStyle';

describe('useViewportDropdownStyle', () => {
  beforeEach(() => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(812);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns centered fixed styles when open', () => {
    const triggerEl = document.createElement('button');
    triggerEl.getBoundingClientRect = () => ({
      top: 60,
      bottom: 96,
      left: 300,
      right: 340,
      width: 40,
      height: 36,
      x: 300,
      y: 60,
    });
    document.body.appendChild(triggerEl);

    const { result } = renderHook(() => {
      const triggerRef = useRef(triggerEl);
      const panelRef = useRef(null);
      return useViewportDropdownStyle(true, triggerRef, panelRef);
    });

    act(() => {});

    expect(result.current).toMatchObject({
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      maxWidth: '95vw',
      zIndex: 100,
    });
    expect(parseInt(result.current.width, 10)).toBeLessThanOrEqual(375 * 0.95);

    triggerEl.remove();
  });

  it('clears styles when closed', () => {
    const { result, rerender } = renderHook(
      ({ open }) => {
        const triggerRef = useRef(null);
        const panelRef = useRef(null);
        return useViewportDropdownStyle(open, triggerRef, panelRef);
      },
      { initialProps: { open: true } },
    );

    rerender({ open: false });
    expect(result.current).toBeNull();
  });
});
