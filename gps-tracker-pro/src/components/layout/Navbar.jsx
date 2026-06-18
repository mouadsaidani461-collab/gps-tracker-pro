import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Menu,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { getRoleLabel } from '../../utils/authRoles';
import NotificationBell from '../notifications/NotificationBell';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
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

export default function Navbar({ onMenuClick, showMenu = false, searchQuery = '', onSearchChange }) {
  const { user, logout, role } = useAuth();
  const { t, language } = useLocale();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const profileRef = useRef(null);

  useClickOutside(profileRef, () => setProfileOpen(false));

  const handleSearch = useCallback(
    (e) => {
      const val = e.target.value;
      setLocalSearch(val);
      onSearchChange?.(val);
    },
    [onSearchChange],
  );

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 h-16',
        'bg-capture-surface/70 backdrop-blur-xl',
        'border-b border-slate-600/20',
        'shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
      )}
    >
      <div className="h-full px-4 lg:px-6 grid grid-cols-[1fr_minmax(0,28rem)_1fr] items-center gap-3">

        {/* ── Visual RIGHT: actions (start in RTL) ── */}
        <div className="flex items-center gap-1.5 justify-self-start">
          {showMenu && (
            <button
              type="button"
              onClick={onMenuClick}
              className={cn(
                'lg:hidden p-2.5 rounded-lg',
                'text-capture-metallic hover:text-capture-glow',
                'hover:bg-capture-card/60 hover:shadow-glow-sm',
                'transition-all duration-200',
              )}
              aria-label={t('navbar.openMenu')}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Notifications — WebSocket simulation via NotificationContext */}
          <NotificationBell onOpenChange={(isOpen) => { if (isOpen) setProfileOpen(false); }} />

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => { setProfileOpen((p) => !p); }}
              className={cn(
                'flex items-center gap-2 p-1.5 pe-2.5 rounded-lg',
                'hover:bg-capture-card/60 hover:shadow-glow-sm',
                'transition-all duration-200',
                profileOpen && 'bg-capture-card/80 shadow-glow-sm',
              )}
              aria-expanded={profileOpen}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-capture-primary to-cyan-700 flex items-center justify-center shadow-glow-sm">
                <User className="w-4 h-4 text-slate-950" />
              </div>
              <span className="hidden md:block text-sm font-medium text-slate-200 max-w-[100px] truncate">
                {user?.name}
              </span>
              <ChevronDown className={cn('hidden md:block w-4 h-4 text-capture-metallic transition-transform', profileOpen && 'rotate-180')} />
            </button>

            {profileOpen && (
              <div
                className={cn(
                  'absolute start-0 mt-2 w-56',
                  'bg-capture-card/95 backdrop-blur-xl',
                  'border border-slate-600/25 rounded-xl',
                  'shadow-glow-md overflow-hidden',
                  'animate-[fade-in_0.2s_ease-out]',
                )}
              >
                <div className="px-4 py-3 border-b border-slate-600/20">
                  <p className="font-semibold text-sm text-slate-100">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  {role && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-capture-primary/15 text-capture-glow border border-capture-primary/25">
                      {getRoleLabel(role, language)}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-capture-surface/60 hover:text-capture-glow transition-colors"
                >
                  <Settings className="w-4 h-4 text-capture-metallic" />
                  {t('navbar.settings')}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-capture-danger hover:bg-capture-danger/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t('navbar.logout')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: search ── */}
        <div className="justify-self-center w-full hidden sm:block">
          <div className="relative group">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-capture-glow transition-colors pointer-events-none" />
            <input
              type="search"
              value={localSearch}
              onChange={handleSearch}
              placeholder={t('navbar.searchPlaceholder')}
              className={cn(
                'w-full ps-10 pe-4 py-2 rounded-lg text-sm',
                'bg-capture-bg/60 border border-slate-600/30',
                'text-slate-200 placeholder:text-slate-500',
                'transition-all duration-200',
                'focus:outline-none focus:border-capture-primary/50 focus:shadow-glow-sm',
                'hover:border-slate-500/40',
              )}
            />
          </div>
        </div>

        {/* ── Visual LEFT: shield mark only (end in RTL) ── */}
        <div className="flex items-center justify-self-end shrink-0">
          <img
            src="/icon-source.svg"
            alt="Capture Tracking GPS"
            className="h-8 w-8"
            width={32}
            height={32}
          />
        </div>
      </div>
    </header>
  );
}
