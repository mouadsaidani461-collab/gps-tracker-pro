/**
 * Capture Tracking GPS — notifications from Traccar WebSocket events
 */

import { useState, useCallback, useEffect } from 'react';
import { mapEventToNotification } from '../services/deviceMapper';
import { NOTIFICATION_TYPES } from '../utils/constants';
import { useSocket } from '../context/SocketContext';

export function useNotifications(options = {}) {
  const { maxNotifications = 50 } = options;
  const { wsState, isConnected, subscribe, reconnect } = useSocket();

  const [notifications, setNotifications] = useState([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => subscribe((data) => {
    if (!data.events?.length) return;

    setNotifications((prev) => {
      const incoming = data.events.map((event) => mapEventToNotification(event, data.devices));
      const merged = [...incoming, ...prev];
      const seen = new Set();
      return merged.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      }).slice(0, maxNotifications);
    });
  }), [subscribe, maxNotifications]);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const pushNotification = useCallback((notification) => {
    const entry = {
      id: notification.id ?? `local-${Date.now()}`,
      type: notification.type ?? NOTIFICATION_TYPES.INFO,
      vehicleId: notification.vehicleId ?? null,
      title: notification.title,
      message: notification.message,
      timestamp: notification.timestamp ?? new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [entry, ...prev].slice(0, maxNotifications));
    return entry;
  }, [maxNotifications]);

  return {
    notifications,
    unreadCount,
    wsState,
    isConnected,
    connect: reconnect,
    disconnect: () => {},
    reconnect,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    pushNotification,
  };
}

export default useNotifications;
