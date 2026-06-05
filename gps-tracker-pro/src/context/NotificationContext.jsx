/**
 * Capture Tracking GPS — Notification Context
 * Wraps WebSocket simulation hook for global notification state
 */

import { createContext, useContext, useMemo } from 'react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationContext = createContext(null);

export function NotificationProvider({ children, options }) {
  const notificationState = useNotifications(options);

  const value = useMemo(
    () => ({
      ...notificationState,
      // Aliases for component-friendly API
      markRead: notificationState.markAsRead,
      markAllRead: notificationState.markAllAsRead,
      remove: notificationState.removeNotification,
    }),
    [notificationState],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}

/** Shorthand alias */
export const useNotificationsContext = useNotificationContext;

export default NotificationContext;
