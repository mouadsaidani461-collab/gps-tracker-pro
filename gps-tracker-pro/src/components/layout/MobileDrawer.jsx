import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function MobileDrawer({
  open,
  onClose,
  children,
  title,
  width = 'w-72',
}) {
  const handleEscape = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
    },
    [onClose],
  );

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return undefined;

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, handleEscape]);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          'bg-capture-bg/70 backdrop-blur-sm',
          'transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel — slides from start (right edge in RTL) */}
      <div
        className={cn(
          'fixed inset-y-0 start-0 z-50 lg:hidden',
          'flex flex-col',
          width,
          'bg-capture-surface/95 backdrop-blur-xl',
          'border-s border-slate-600/25',
          'shadow-glow-md',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'القائمة'}
        aria-hidden={!open}
      >
        {/* Drawer header with close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600/20 shrink-0">
          {title && (
            <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg ms-auto',
              'text-capture-metallic hover:text-capture-glow',
              'hover:bg-capture-card/60 hover:shadow-glow-sm',
              'transition-all duration-200',
            )}
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer content */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </>
  );
}
