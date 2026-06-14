import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Car,
  HardDrive,
  FileText,
  Users,
  Settings,
  Truck,
  AlertTriangle,
  Activity,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { useVehicles } from '../../hooks/useVehicles';
import { APP_NAME } from '../../utils/constants';
import { formatNumber, NUMERIC_DISPLAY_CLASS } from '../../utils/formatters';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/map', icon: Map, labelKey: 'nav.map' },
  { to: '/vehicles', icon: Car, labelKey: 'nav.vehicles' },
  { to: '/devices', icon: HardDrive, labelKey: 'nav.devices', permission: 'vehicles:write' },
  { to: '/reports', icon: FileText, labelKey: 'nav.reports', permission: 'reports:read' },
  { to: '/users', icon: Users, labelKey: 'nav.users', adminOnly: true },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

function NavContent({ onNavigate }) {
  const { isAdmin, can } = useAuth();
  const { t } = useLocale();
  const { stats } = useVehicles();
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin()) return false;
    if (item.permission && !can(item.permission)) return false;
    return true;
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'text-sm font-medium transition-all duration-200',
                'border-e-[3px]',
                isActive
                  ? 'bg-capture-primary/10 text-capture-glow border-e-capture-primary shadow-glow-sm'
                  : 'text-capture-metallic border-e-transparent hover:bg-capture-card/60 hover:text-slate-200 hover:border-e-capture-primary/30',
              )
            }
          >
            <Icon
              className={cn(
                'w-5 h-5 shrink-0 transition-colors',
                'group-hover:text-capture-glow',
              )}
            />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-600/20 bg-capture-bg/40 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
          {t('nav.quickStats')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="capture-card p-3">
            <div className="flex items-center gap-1.5 text-capture-glow mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[10px] text-slate-400">{t('nav.active')}</span>
            </div>
            <p dir="ltr" className={cn('text-xl font-bold text-slate-100', NUMERIC_DISPLAY_CLASS)}>
              {formatNumber(stats.moving + stats.idle + stats.online, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="capture-card p-3">
            <div className="flex items-center gap-1.5 text-capture-danger mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[10px] text-slate-400">{t('nav.alerts')}</span>
            </div>
            <p dir="ltr" className={cn('text-xl font-bold text-slate-100', NUMERIC_DISPLAY_CLASS)}>
              {formatNumber(stats.activeAlerts, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="capture-card p-3 col-span-2">
            <div className="flex items-center gap-1.5 text-capture-metallic mb-1">
              <Truck className="w-3.5 h-3.5" />
              <span className="text-[10px] text-slate-400">{t('nav.totalVehicles')}</span>
            </div>
            <p dir="ltr" className={cn('text-xl font-bold text-slate-100', NUMERIC_DISPLAY_CLASS)}>
              {formatNumber(stats.total, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ onClose, mobile = false }) {
  const { t } = useLocale();
  const handleNavigate = () => onClose?.();

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Brand header */}
      <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-slate-600/20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.svg" alt={APP_NAME} className="h-10 w-auto shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-slate-100 text-sm leading-tight truncate">
              CAPTURE <span className="text-capture-glow">GPS</span>
            </p>
            <p className="text-[10px] text-capture-metallic truncate">{t('app.subtitle')}</p>
          </div>
        </div>

        {mobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg shrink-0',
              'text-capture-metallic hover:text-capture-glow',
              'hover:bg-capture-card/60 hover:shadow-glow-sm',
              'transition-all duration-200',
            )}
            aria-label={t('drawer.closeMenu')}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <NavContent onNavigate={handleNavigate} />
    </div>
  );
}
