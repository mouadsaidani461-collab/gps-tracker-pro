import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useViewportDropdownStyle } from '../../hooks/useViewportDropdownStyle';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export const NAVBAR_DROPDOWN_PANEL_CLASS = cn(
  'bg-[#1a1f2e]/95 backdrop-blur-xl',
  'border border-capture-primary/20',
  'rounded-xl shadow-glow-md',
  'overflow-hidden',
  'animate-[fade-in_0.2s_ease-out]',
  'flex flex-col',
);

export default function NavbarDropdownPanel({
  open,
  triggerRef,
  panelRef,
  dir,
  role = 'dialog',
  ariaLabel,
  className = '',
  children,
  maxHeightRatio = 0.75,
}) {
  const internalPanelRef = useRef(null);
  const style = useViewportDropdownStyle(open, triggerRef, internalPanelRef, { maxHeightRatio });

  const setPanelRef = (node) => {
    internalPanelRef.current = node;
    if (panelRef) panelRef.current = node;
  };

  if (!open) return null;

  const panelStyle = style ?? {
    position: 'fixed',
    top: '-9999px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '95vw',
    maxWidth: '95vw',
    visibility: 'hidden',
    zIndex: 100,
  };

  return createPortal(
    <div
      ref={setPanelRef}
      dir={dir}
      role={role}
      aria-label={ariaLabel}
      style={panelStyle}
      className={cn(NAVBAR_DROPDOWN_PANEL_CLASS, className)}
    >
      {children}
    </div>,
    document.body,
  );
}
