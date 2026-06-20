import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, Car, Settings } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const TABS = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard', end: true },
  { to: '/map', icon: Map, labelKey: 'nav.map' },
  { to: '/vehicles', icon: Car, labelKey: 'nav.vehicles' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function MobileBottomNav() {
  const { t } = useLocale();

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 lg:hidden',
        'border-t border-slate-600/25',
        'bg-capture-surface/95 backdrop-blur-xl',
        'shadow-[0_-8px_32px_rgba(0,0,0,0.45)]',
        'pb-[env(safe-area-inset-bottom,0px)]',
      )}
      aria-label={t('nav.mobileNav')}
    >
      <div className="grid grid-cols-4 h-16">
        {TABS.map(({ to, icon: Icon, labelKey, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-1',
                'text-[10px] font-medium leading-none transition-colors duration-200',
                'min-h-[44px] touch-manipulation',
                isActive
                  ? 'text-capture-glow'
                  : 'text-slate-500 active:text-slate-300',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-200',
                    isActive && 'bg-capture-primary/15 shadow-glow-sm',
                  )}
                >
                  <Icon className={cn('w-5 h-5', isActive && 'text-capture-glow')} />
                </span>
                <span className="truncate max-w-full px-0.5">{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
