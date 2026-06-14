/**
 * Traccar WebSocket — reconnect with delay + full cleanup
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getWebSocketUrl } from '../services/api';
import { SIMULATION } from '../utils/constants';
import { useAuth } from './AuthContext';

const LOGOUT_CODE = 4000;
const RECONNECT_DELAY = SIMULATION.websocketReconnectDelay;

const WS_STATES = {
  CONNECTING: 'connecting',
  OPEN: 'open',
  CLOSED: 'closed',
  ERROR: 'error',
};

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectSocketRef = useRef(null);
  const listenersRef = useRef(new Set());

  const [wsState, setWsState] = useState(WS_STATES.CLOSED);
  const [isConnected, setIsConnected] = useState(false);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const notifyListeners = useCallback((data) => {
    listenersRef.current.forEach((listener) => {
      try {
        listener(data);
      } catch {
        // ignore listener errors
      }
    });
  }, []);

  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const connectSocket = useCallback(() => {
    if (!isAuthenticated) return;

    clearReconnectTimeout();

    const existing = socketRef.current;
    if (existing && existing.readyState !== WebSocket.CLOSED) {
      existing.close();
    }

    const socket = new WebSocket(getWebSocketUrl());
    socketRef.current = socket;
    setWsState(WS_STATES.CONNECTING);

    socket.onopen = () => {
      if (socketRef.current !== socket) return;
      setWsState(WS_STATES.OPEN);
      setIsConnected(true);
    };

    socket.onclose = (event) => {
      if (socketRef.current === socket) {
        setWsState(WS_STATES.CLOSED);
        setIsConnected(false);
      }
      if (event.code === LOGOUT_CODE) return;
      if (socketRef.current !== socket) return;

      clearReconnectTimeout();
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connectSocketRef.current?.();
      }, RECONNECT_DELAY);
    };

    socket.onerror = () => {
      if (socketRef.current === socket) {
        setWsState(WS_STATES.ERROR);
      }
    };

    socket.onmessage = (event) => {
      if (socketRef.current !== socket) return;
      try {
        notifyListeners(JSON.parse(event.data));
      } catch {
        // ignore malformed payloads
      }
    };
  }, [isAuthenticated, clearReconnectTimeout, notifyListeners]);

  useEffect(() => {
    connectSocketRef.current = connectSocket;
  }, [connectSocket]);

  const disconnectSocket = useCallback(() => {
    clearReconnectTimeout();
    const socket = socketRef.current;
    if (socket) {
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(LOGOUT_CODE);
      }
      socketRef.current = null;
    }
    setWsState(WS_STATES.CLOSED);
    setIsConnected(false);
  }, [clearReconnectTimeout]);

  const reconnect = useCallback(() => {
    disconnectSocket();
    connectSocket();
  }, [disconnectSocket, connectSocket]);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return undefined;
    }

    connectSocket();

    const reconnectIfNeeded = () => {
      const socket = socketRef.current;
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        connectSocket();
      } else if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send('{}');
        } catch {
          // connection test failed — onclose will schedule reconnect
        }
      }
    };

    const onVisibility = () => {
      if (!document.hidden) reconnectIfNeeded();
    };

    window.addEventListener('online', reconnectIfNeeded);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearReconnectTimeout();
      window.removeEventListener('online', reconnectIfNeeded);
      document.removeEventListener('visibilitychange', onVisibility);
      disconnectSocket();
    };
  }, [isAuthenticated, connectSocket, disconnectSocket, clearReconnectTimeout]);

  const value = useMemo(
    () => ({
      wsState,
      isConnected,
      subscribe,
      reconnect,
      disconnect: disconnectSocket,
    }),
    [wsState, isConnected, subscribe, reconnect, disconnectSocket],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

export default SocketContext;
