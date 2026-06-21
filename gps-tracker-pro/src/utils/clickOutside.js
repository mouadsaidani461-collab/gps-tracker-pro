import { useEffect, useRef } from 'react';

/**
 * Close when clicking outside any of the provided refs (supports portaled panels).
 */
export function useClickOutside(refs, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    function onPointerDown(event) {
      const refList = Array.isArray(refs) ? refs : [refs];
      const inside = refList.some(
        (ref) => ref?.current && ref.current.contains(event.target),
      );
      if (!inside) handlerRef.current();
    }

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [refs]);
}
