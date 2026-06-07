import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { VehicleProvider } from './context/VehicleContext';
import { GeofenceProvider } from './context/GeofenceContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import VehiclesPage from './pages/VehiclesPage';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import UsersPage from './pages/UsersPage';
import NotFound from './pages/NotFound';
import PricingPage from './pages/PricingPage';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div dir="rtl" className="flex h-screen bg-capture-bg overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 capture-grid-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-capture-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-capture-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-capture-metallic">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-capture-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-capture-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-capture-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-capture-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={(
            <PublicRoute>
              <Login />
            </PublicRoute>
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
          <Route path="/map" element={<MapPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/reports" element={<Reports />} />
          <Route
            path="/users"
            element={(
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            )}
          />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SocketProvider>
          <VehicleProvider>
            <GeofenceProvider>
              <NotificationProvider>
                <AppRoutes />
              </NotificationProvider>
            </GeofenceProvider>
          </VehicleProvider>
        </SocketProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
