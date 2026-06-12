/**
 * Capture Tracking GPS — Auth Context (Traccar session cookie)
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { sessionApi, userApi } from '../services/traccarApi';
import { UNAUTHORIZED_EVENT } from '../services/api';
import { translate, getStoredLanguage } from '../i18n';
import { APP_NAME } from '../utils/constants';

import { ROLES, ROLE_LABELS, hasPermission, resolveRoleFromTraccarUser } from '../utils/authRoles';
import { parseTwoFactorEnabled } from '../utils/userAttributes';

export { ROLES, ROLE_LABELS } from '../utils/authRoles';

const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000;

const AuthContext = createContext(null);

function mapTraccarUser(user) {
  const role = resolveRoleFromTraccarUser(user);
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    company: APP_NAME,
    role,
    avatar: null,
    readonly: user.readonly,
    administrator: user.administrator,
    totpKey: user.totpKey ?? null,
    attributes: user.attributes ?? {},
    twoFactorEnabled: parseTwoFactorEnabled(user),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const idleTimerRef = useRef(null);

  const logout = useCallback(async (reason = 'manual') => {
    try {
      await sessionApi.logout();
    } catch {
      // session may already be gone
    }
    setUser(null);
    setError(null);
    if (reason === 'timeout' || reason === 'expired') {
      setSessionExpired(true);
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!user) return;

    idleTimerRef.current = setTimeout(() => {
      logout('timeout');
    }, SESSION_IDLE_TIMEOUT);
  }, [user, logout]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const sessionUser = await sessionApi.get();
        if (!cancelled && sessionUser?.id) {
          setUser(mapTraccarUser(sessionUser));
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout('expired');
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [logout]);

  useEffect(() => {
    if (!user) return undefined;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetIdleTimer();

    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetIdleTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, resetIdleTimer]);

  const login = useCallback(async (email, password, code) => {
    setError(null);
    setSessionExpired(false);
    setLoading(true);

    try {
      const sessionUser = await sessionApi.login(email.trim(), password, code);
      const authUser = mapTraccarUser(sessionUser);
      setUser(authUser);
      setLoading(false);
      return { success: true };
    } catch (err) {
      const lang = getStoredLanguage();
      const errMsg = err.status === 401
        ? translate(lang, 'login.invalidCredentials')
        : (err.message || translate(lang, 'login.failed'));
      setError(errMsg);
      setLoading(false);
      return { success: false, error: errMsg };
    }
  }, []);

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  const hasRole = useCallback(
    (role) => user?.role === role,
    [user],
  );

  const isAdmin = useCallback(() => hasRole(ROLES.ADMIN), [hasRole]);

  const can = useCallback(
    (permission) => hasPermission(user?.role, permission),
    [user],
  );

  const refreshUser = useCallback(async () => {
    const sessionUser = await sessionApi.get();
    if (sessionUser?.id) {
      setUser(mapTraccarUser(sessionUser));
    }
    return sessionUser;
  }, []);

  const updateProfile = useCallback(async ({ name, email, phone, password }) => {
    if (!user?.id) throw new Error(translate(getStoredLanguage(), 'auth.noActiveSession'));

    const current = await sessionApi.get();
    const payload = {
      ...current,
      name: name?.trim() ?? current.name,
      email: email?.trim() ?? current.email,
      phone: phone?.trim() || null,
    };
    if (password) payload.password = password;

    const updated = await userApi.update(Number(user.id), payload);
    setUser(mapTraccarUser(updated));
    return updated;
  }, [user]);

  const updateUserAttribute = useCallback(async (key, value) => {
    if (!user?.id) throw new Error(translate(getStoredLanguage(), 'auth.noActiveSession'));
    const updated = await userApi.updateAttribute(Number(user.id), key, value);
    setUser(mapTraccarUser(updated));
    return updated;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      token: user ? 'session' : null,
      loading,
      error,
      sessionExpired,
      isAuthenticated: !!user,
      role: user?.role ?? null,
      login,
      logout: () => logout('manual'),
      refreshUser,
      updateProfile,
      updateUserAttribute,
      refreshToken: () => true,
      clearSessionExpired,
      hasRole,
      isAdmin,
      can,
      ROLES,
      ROLE_LABELS,
    }),
    [
      user,
      loading,
      error,
      sessionExpired,
      login,
      logout,
      refreshUser,
      updateProfile,
      updateUserAttribute,
      clearSessionExpired,
      hasRole,
      isAdmin,
      can,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
