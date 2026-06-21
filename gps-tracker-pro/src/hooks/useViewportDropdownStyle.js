import { useEffect, useLayoutEffect, useState, useRef } from 'react';

const VIEWPORT_EDGE = 8;
const DEFAULT_PANEL_HEIGHT = 320;

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Fixed, horizontally centered dropdown positioning that stays in viewport while scrolling.
 */
export function useViewportDropdownStyle(open, triggerRef, panelRef, { maxHeightRatio = 0.75 } = {}) {
  const [style, setStyle] = useState(null);
  const maxHeightRatioRef = useRef(maxHeightRatio);
  maxHeightRatioRef.current = maxHeightRatio;

  useIsomorphicLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return undefined;
    }

    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = VIEWPORT_EDGE;
      const safeTop = gap;
      const safeBottom = gap;

      const widthPx = Math.min(vw * 0.95, vw - gap * 2);
      const panelHeight = panelRef.current?.offsetHeight ?? DEFAULT_PANEL_HEIGHT;

      let top = rect.bottom + gap;
      let availableHeight = vh - top - safeBottom;

      if (availableHeight < 140 && rect.top > panelHeight + gap * 3) {
        top = Math.max(safeTop, rect.top - gap - panelHeight);
        availableHeight = rect.top - gap - safeTop;
      }

      const maxHeight = Math.min(
        vh * maxHeightRatioRef.current,
        Math.max(120, availableHeight),
      );

      setStyle({
        position: 'fixed',
        top: `${Math.max(safeTop, top)}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${widthPx}px`,
        maxWidth: '95vw',
        maxHeight: `${maxHeight}px`,
        zIndex: 100,
      });
    };

    update();
    const raf = requestAnimationFrame(update);

    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [open, triggerRef, panelRef]);

  return style;
}
