import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Car,
  FileText,
  Users,
  Settings,
  Truck,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVehicles } from '../../hooks/useVehicles';
import { APP_NAME } from '../../utils/constants';
import { formatNumber, NUMERIC_DISPLAY_CLASS } from '../../utils/formatters';
import MobileDrawer from './MobileDrawer';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { to: '/map', icon: Map, label: 'الخريطة' },
  { to: '/vehicles', icon: Car, label: 'المركبات' },
  { to: '/reports', icon: FileText, label: 'التقارير' },
  { to: '/users', icon: Users, label: 'المستخدمون', adminOnly: true },
  { to: '/settings', icon: Settings, label: 'الإعدادات' },
];

function NavContent({ onNavigate }) {
  const { isAdmin } = useAuth();
  const { stats } = useVehicles();
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin());

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Brand header (mobile) */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-600/20 lg:hidden">
        <img src="/logo.svg" alt={APP_NAME} className="h-10 w-auto" />
        <div>
          <p className="font-bold text-slate-100 text-sm">
            CAPTURE <span className="text-capture-glow">GPS</span>
          </p>
          <p className="text-[10px] text-capture-metallic">نظام تتبع الأسطول</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, label }) => (
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
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Quick stats */}
      <div className="p-4 border-t border-slate-600/20 bg-capture-bg/40">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
          إحصائيات سريعة
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="capture-card p-3">
            <div className="flex items-center gap-1.5 text-capture-glow mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[10px] text-slate-400">نشط</span>
            </div>
            <p dir="ltr" className={cn('text-xl font-bold text-slate-100', NUMERIC_DISPLAY_CLASS)}>{formatNumber(stats.moving + stats.idle + stats.online, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="capture-card p-3">
            <div className="flex items-center gap-1.5 text-capture-danger mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[10px] text-slate-400">تنبيهات</span>
            </div>
            <p dir="ltr" className={cn('text-xl font-bold text-slate-100', NUMERIC_DISPLAY_CLASS)}>{formatNumber(stats.activeAlerts, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="capture-card p-3 col-span-2">
            <div className="flex items-center gap-1.5 text-capture-metallic mb-1">
              <Truck className="w-3.5 h-3.5" />
              <span className="text-[10px] text-slate-400">إجمالي المركبات</span>
            </div>
            <p dir="ltr" className={cn('text-xl font-bold text-slate-100', NUMERIC_DISPLAY_CLASS)}>{formatNumber(stats.total, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen = false, onClose }) {
  const handleNavigate = () => onClose?.();

  return (
    <>
      {/* Desktop sidebar — anchored to start (right in RTL) */}
      <aside
        className={cn(
          'hidden lg:flex flex-col',
          'w-64 shrink-0 h-full',
          'bg-capture-surface/80 backdrop-blur-xl',
          'border-s border-slate-600/20',
        )}
      >
        {/* Desktop brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-600/20">
          <img src="/logo.svg" alt={APP_NAME} className="h-10 w-auto" />
          <div>
            <p className="font-bold text-slate-100 text-sm leading-tight">
              CAPTURE <span className="text-capture-glow">GPS</span>
            </p>
            <p className="text-[10px] text-capture-metallic">نظام تتبع الأسطول</p>
          </div>
        </div>

        <NavContent />
      </aside>

      {/* Mobile drawer */}
      <MobileDrawer open={isOpen} onClose={onClose}>
        <NavContent onNavigate={handleNavigate} />
      </MobileDrawer>
    </>
  );
}
