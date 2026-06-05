import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Wifi, WifiOff } from 'lucide-react';
import { useNotificationContext } from '../../context/NotificationContext';
import NotificationItem, { isCriticalNotification } from './NotificationItem';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/** Simulated critical alert sound via Web Audio API */
function playCriticalSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.45);

    oscillator.onended = () => ctx.close();
  } catch {
    // Silent fallback — sound is simulated best-effort
  }
}

function useClickOutside(ref, handler) {
  useEffect(() => {
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) handler();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [ref, handler]);
}

export default function NotificationBell({ onOpenChange, className = '' }) {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    isConnected,
    wsState,
  } = useNotificationContext();

  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const knownIdsRef = useRef(new Set(notifications.map((n) => n.id)));

  useClickOutside(ref, () => setOpen(false));

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      onOpenChange?.(next);
      return next;
    });
  }, [onOpenChange]);

  // Play sound when new critical notifications arrive via WebSocket simulation
  useEffect(() => {
    const known = knownIdsRef.current;
    let played = false;

    notifications.forEach((notif) => {
      if (!known.has(notif.id)) {
        known.add(notif.id);
        if (!notif.read && isCriticalNotification(notif) && !played) {
          playCriticalSound();
          played = true;
        }
      }
    });
  }, [notifications]);

  const handleMarkAllRead = () => {
    markAllRead();
  };

  return (
    <div className={cn('relative', className)} ref={ref}>
      {/* Bell button */}
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          'relative p-2.5 rounded-lg transition-all duration-200',
          'text-capture-metallic',
          'hover:text-capture-glow hover:bg-capture-card/60 hover:shadow-glow-sm',
          unreadCount > 0 && 'text-capture-glow',
          open && 'bg-capture-card/80 text-capture-glow shadow-glow-sm',
        )}
        aria-label="الإشعارات"
        aria-expanded={open}
      >
        {/* Cyan glow ring when unread */}
        {unreadCount > 0 && (
          <span
            className="absolute inset-0 rounded-lg bg-capture-primary/10 animate-pulse-glow pointer-events-none"
            aria-hidden="true"
          />
        )}

        <Bell
          className={cn(
            'w-5 h-5 relative z-10',
            unreadCount > 0 && 'drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]',
          )}
        />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -start-0.5 z-20 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-capture-danger text-white text-[10px] font-bold shadow-[0_0_10px_rgba(244,63,94,0.7)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* WebSocket connection indicator */}
        <span
          className={cn(
            'absolute bottom-1 end-1 z-20 w-1.5 h-1.5 rounded-full',
            isConnected
              ? 'bg-capture-success shadow-[0_0_4px_rgba(16,185,129,0.8)]'
              : 'bg-slate-500',
          )}
          title={isConnected ? 'متصل — WebSocket' : wsState}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute start-0 mt-2 w-80 sm:w-96',
            'bg-capture-card/95 backdrop-blur-xl',
            'border border-slate-600/25 rounded-xl',
            'shadow-glow-md overflow-hidden',
            'animate-[fade-in_0.2s_ease-out]',
            'z-50',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600/20">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-sm">الإشعارات</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-capture-danger/20 text-capture-danger border border-capture-danger/30">
                  {unreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* WS status */}
              <span
                className={cn(
                  'flex items-center gap-1 text-[10px]',
                  isConnected ? 'text-capture-success' : 'text-slate-500',
                )}
                title={isConnected ? 'WebSocket متصل' : 'WebSocket غير متصل'}
              >
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isConnected ? 'مباشر' : 'غير متصل'}
              </span>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-capture-glow hover:text-capture-primary transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  قراءة الكل
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onMarkRead={markRead}
                  onClick={(n) => {
                    if (!n.read) markRead(n.id);
                  }}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-600/20 text-center">
              <p className="text-[10px] text-slate-500">
                {notifications.length} إشعار · تحديثات WebSocket مباشرة
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
