import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Settings, Trash2, Wifi, WifiOff } from 'lucide-react';
import { useNotificationContext } from '../../context/NotificationContext';
import { useLocale } from '../../context/LocaleContext';
import NotificationItem from './NotificationItem';
import { isCriticalNotification } from './notificationTypes';
import { loadSoundEnabled } from '../../utils/notificationPreferences';
import { formatNumber, NUMERIC_DISPLAY_CLASS } from '../../utils/formatters';
import NavbarDropdownPanel from '../layout/NavbarDropdownPanel';
import { useClickOutside } from '../../utils/clickOutside';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

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
    /* silent fallback */
  }
}

export default function NotificationBell({ onOpenChange, className = '' }) {
  const { dir, t } = useLocale();
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    remove,
    clearAll,
    isConnected,
    wsState,
    reconnect,
  } = useNotificationContext();

  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const knownIdsRef = useRef(new Set(notifications.map((n) => n.id)));

  const closePanel = useCallback(() => {
    setOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  useClickOutside([triggerRef, panelRef], closePanel);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closePanel();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closePanel]);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      onOpenChange?.(next);
      return next;
    });
  }, [onOpenChange]);

  useEffect(() => {
    const known = knownIdsRef.current;
    let played = false;

    notifications.forEach((notif) => {
      if (!known.has(notif.id)) {
        known.add(notif.id);
        if (!notif.read && isCriticalNotification(notif) && !played && loadSoundEnabled()) {
          playCriticalSound();
          played = true;
        }
      }
    });
  }, [notifications]);

  const unreadLabel = unreadCount > 0
    ? t('notifications.unreadCount', {
      count: formatNumber(unreadCount, { maximumFractionDigits: 0 }),
    })
    : t('notifications.title');

  return (
    <div className={cn('relative', className)} ref={triggerRef}>
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
        aria-label={unreadLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
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

        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -start-0.5 z-20 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-capture-danger text-white text-[10px] font-bold shadow-[0_0_10px_rgba(244,63,94,0.7)]',
              NUMERIC_DISPLAY_CLASS,
            )}
            dir="ltr"
          >
            {unreadCount > 9 ? `${formatNumber(9)}+` : formatNumber(unreadCount)}
          </span>
        )}

        <span
          className={cn(
            'absolute bottom-1 end-1 z-20 w-1.5 h-1.5 rounded-full',
            isConnected
              ? 'bg-capture-success shadow-[0_0_4px_rgba(16,185,129,0.8)]'
              : 'bg-slate-500',
          )}
          title={isConnected ? t('notifications.wsConnectedTitle') : wsState}
          aria-hidden="true"
        />
      </button>

      <NavbarDropdownPanel
        open={open}
        triggerRef={triggerRef}
        panelRef={panelRef}
        dir={dir}
        ariaLabel={t('notifications.title')}
        maxHeightRatio={0.72}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600/20 gap-2 shrink-0">
          <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0 flex-1">
            <h3 className="font-semibold text-slate-100 text-sm text-center sm:text-start">{t('notifications.title')}</h3>
              {unreadCount > 0 && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-capture-danger/20 text-capture-danger border border-capture-danger/30',
                  NUMERIC_DISPLAY_CLASS,
                )}
                dir="ltr"
                >
                  {formatNumber(unreadCount, { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={cn(
                  'hidden sm:flex items-center gap-1 text-[10px]',
                  isConnected ? 'text-capture-success' : 'text-slate-500',
                )}
                title={isConnected ? t('notifications.wsConnected') : t('notifications.wsDisconnected')}
              >
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isConnected ? t('notifications.live') : t('notifications.offline')}
              </span>

              {!isConnected && (
                <button
                  type="button"
                  onClick={reconnect}
                  className="text-[10px] text-capture-glow hover:text-capture-primary transition-colors"
                >
                  {t('notifications.reconnect')}
                </button>
              )}

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-capture-glow hover:text-capture-primary transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('notifications.markAllRead')}</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto" aria-live="polite">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Bell className="w-8 h-8 text-slate-600 mb-2" aria-hidden="true" />
                <p className="text-sm text-slate-500">{t('notifications.empty')}</p>
                <Link
                  to="/settings?tab=notifications"
                  onClick={closePanel}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-capture-glow hover:text-capture-primary transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  {t('notifications.settingsLink')}
                </Link>
              </div>
            ) : (
              notifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onMarkRead={markRead}
                  onRemove={remove}
                  onClick={(n) => {
                    if (!n.read) markRead(n.id);
                  }}
                />
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-600/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <p className="text-[10px] text-slate-500">
                {t('notifications.footer', {
                  count: formatNumber(notifications.length, { maximumFractionDigits: 0 }),
                })}
              </p>
              <div className="flex items-center gap-3">
                <Link
                  to="/settings?tab=notifications"
                  onClick={closePanel}
                  className="inline-flex items-center gap-1 text-[10px] text-capture-metallic hover:text-capture-glow transition-colors"
                >
                  <Settings className="w-3 h-3" />
                  {t('notifications.settingsLink')}
                </Link>
                <button
                  type="button"
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  {t('notifications.clearAll')}
                </button>
              </div>
            </div>
          )}
      </NavbarDropdownPanel>
    </div>
  );
}
