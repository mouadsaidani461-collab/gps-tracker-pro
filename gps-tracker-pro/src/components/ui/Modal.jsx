import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from '../../context/LocaleContext';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  closeOnEscape = true,
  showClose = true,
  className = '',
  closeLabel,
}) {
  const { t } = useLocale();
  const overlayRef = useRef(null);
  const panelRef = useRef(null);

  const handleEscape = useCallback(
    (e) => {
      if (closeOnEscape && e.key === 'Escape') onClose?.();
    },
    [closeOnEscape, onClose],
  );

  // Lock body scroll + keyboard listener
  useEffect(() => {
    if (!open) return undefined;

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    // Focus trap — focus panel on open
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, handleEscape]);

  if (!open) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-capture-bg/80 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative w-full',
          sizes[size] ?? sizes.md,
          'bg-capture-card/90 backdrop-blur-xl',
          'border border-slate-600/25 rounded-2xl',
          'shadow-glow-md',
          'animate-[slide-in-rtl_0.3s_ease-out]',
          'before:absolute before:inset-x-0 before:top-0 before:h-px',
          'before:bg-gradient-to-r before:from-transparent before:via-capture-primary/30 before:to-transparent',
          'outline-none',
          className,
        )}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-0">
            <div>
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-slate-100">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="text-sm text-capture-metallic mt-1">
                  {description}
                </p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'shrink-0 p-1.5 rounded-lg',
                  'text-capture-metallic hover:text-slate-200',
                  'hover:bg-capture-surface/80 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-capture-primary/50',
                )}
                aria-label={closeLabel ?? t('common.close')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-0 border-t border-slate-600/20 mt-2 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
