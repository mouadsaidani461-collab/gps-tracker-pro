import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function AppUpdateBanner() {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  const applyUpdate = useCallback(() => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
    setVisible(false);
  }, [waitingWorker]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;

    const onControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const onSwUpdate = (event) => {
      setWaitingWorker(event.detail?.worker ?? null);
      setVisible(true);
    };

    window.addEventListener('capture:sw-update', onSwUpdate);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      window.removeEventListener('capture:sw-update', onSwUpdate);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-4 z-[2000] mx-auto max-w-lg capture-floating-above-nav',
        'flex items-start gap-3 px-4 py-3 rounded-xl',
        'bg-capture-card/95 backdrop-blur-md border border-capture-primary/40 shadow-glow-md',
      )}
      role="status"
    >
      <RefreshCw className="w-5 h-5 text-capture-glow shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100">{t('pwa.updateAvailable')}</p>
        <p className="text-xs text-capture-metallic mt-0.5">{t('pwa.updateHint')}</p>
      </div>
      <button
        type="button"
        onClick={applyUpdate}
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-capture-primary text-capture-bg hover:opacity-90 transition-opacity"
      >
        {t('pwa.reload')}
      </button>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="shrink-0 p-1 rounded-lg text-capture-metallic hover:text-slate-200 transition-colors"
        aria-label={t('common.close')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
