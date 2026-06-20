import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocaleProvider, useLocale } from './context/LocaleContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { VehicleProvider } from './context/VehicleContext';
import { GeofenceProvider } from './context/GeofenceContext';
import { NotificationProvider } from './context/NotificationContext';
import { DeviceProvider } from './context/DeviceContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Login from './pages/Login';
import TotpVerify from './pages/TotpVerify';
import Dashboard from './pages/Dashboard';
import VehiclesPage from './pages/VehiclesPage';
import DevicesPage from './pages/DevicesPage';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import PricingPage from './pages/PricingPage';
import ErrorBoundary from './components/ErrorBoundary';
import LazyRoute from './components/LazyRoute';
import LoadingSpinner from './components/LoadingSpinner';
import AppUpdateBanner from './components/AppUpdateBanner';
import LoadingScreen from './components/ui/LoadingScreen';
import { canAccessRoute } from './utils/routeAccess';

const Reports = lazy(() => import(/* webpackChunkName: "reports" */ './pages/Reports'));
const MapPage = lazy(() => import(/* webpackChunkName: "map" */ './pages/MapPage'));
const UsersPage = lazy(() => import(/* webpackChunkName: "users" */ './pages/UsersPage'));

const SIDEBAR_WIDTH = '280px';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function AppLayout() {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const { dir, t } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();

  const fleetSearch = useMemo(() => {
    if (location.pathname !== '/vehicles') return '';
    return new URLSearchParams(location.search).get('q') ?? '';
  }, [location.pathname, location.search]);

  const handleFleetSearchChange = useCallback((value) => {
    if (location.pathname !== '/vehicles') return;
    const params = new URLSearchParams(location.search);
    const trimmed = value.trim();
    if (trimmed) params.set('q', trimmed);
    else params.delete('q');
    const search = params.toString();
    navigate({ pathname: '/vehicles', search: search ? `?${search}` : '' }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const handleFleetSearchSubmit = useCallback((value) => {
    const trimmed = value.trim();
    const search = trimmed ? `?q=${encodeURIComponent(trimmed)}` : '';
    navigate(`/vehicles${search}`);
  }, [navigate]);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (mobile) setOpen(false);
  }, [location.pathname, mobile]);

  useEffect(() => {
    document.body.style.overflow = mobile && open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobile, open]);

  const slideClosed = dir === 'rtl' ? 'translate-x-full' : '-translate-x-full';

  return (
    <div dir={dir} className="min-h-screen bg-capture-bg">
      <aside
        className={cn(
          'fixed top-0 bottom-0 z-40 flex flex-col overflow-hidden',
          'w-[280px] max-w-[80vw]',
          'bg-capture-surface/95 backdrop-blur-xl',
          'border-slate-600/20 shadow-2xl',
          'transition-transform duration-300 ease-out',
          dir === 'rtl' ? 'right-0 border-s' : 'left-0 border-e',
          mobile ? (open ? 'translate-x-0' : slideClosed) : 'translate-x-0',
          'lg:translate-x-0 lg:shadow-none',
        )}
        aria-hidden={mobile && !open}
      >
        <Sidebar onClose={() => setOpen(false)} mobile={mobile} />
      </aside>

      {mobile && open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-label={t('drawer.closeMenu')}
        />
      )}

      <div
        className={cn(
          'flex flex-col min-h-screen min-w-0',
          dir === 'rtl' ? 'lg:mr-[280px]' : 'lg:ml-[280px]',
        )}
        style={{ '--sidebar-width': SIDEBAR_WIDTH }}
      >
        <Navbar
          showMenu={mobile}
          onMenuClick={() => setOpen((prev) => !prev)}
          searchQuery={fleetSearch}
          onSearchChange={handleFleetSearchChange}
          onSearchSubmit={handleFleetSearchSubmit}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 capture-grid-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen showText={false} />;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();

  if (loading) return <LoadingScreen showText={false} />;

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function PermissionRoute({ children }) {
  const { role, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) return <LoadingScreen showText={false} />;

  if (!canAccessRoute(role, pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function TotpRoute({ children }) {
  const { needsTotpVerification, isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen showText={false} />;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!needsTotpVerification) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <AppUpdateBanner />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
        <Route
          path="/login"
          element={(
            <PublicRoute>
              <Login />
            </PublicRoute>
          )}
        />

        <Route
          path="/login/totp"
          element={(
            <TotpRoute>
              <TotpVerify />
            </TotpRoute>
          )}
        />

        <Route path="/pricing" element={<PricingPage />} />

        <Route
          element={(
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          )}
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/map"
            element={(
              <LazyRoute>
                <MapPage />
              </LazyRoute>
            )}
          />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route
            path="/devices"
            element={(
              <PermissionRoute>
                <DevicesPage />
              </PermissionRoute>
            )}
          />
          <Route
            path="/reports"
            element={(
              <PermissionRoute>
                <LazyRoute>
                  <Reports />
                </LazyRoute>
              </PermissionRoute>
            )}
          />
          <Route
            path="/users"
            element={(
              <AdminRoute>
                <LazyRoute>
                  <UsersPage />
                </LazyRoute>
              </AdminRoute>
            )}
          />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LocaleProvider>
          <ThemeProvider>
            <SocketProvider>
              <VehicleProvider>
                <GeofenceProvider>
                  <NotificationProvider>
                    <DeviceProvider>
                      <AppRoutes />
                    </DeviceProvider>
                  </NotificationProvider>
                </GeofenceProvider>
              </VehicleProvider>
            </SocketProvider>
          </ThemeProvider>
        </LocaleProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
