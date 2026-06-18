// @vitest-environment happy-dom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act, cleanup } from '@testing-library/react';
import { SocketProvider, useSocket } from '../../src/context/SocketContext.jsx';
import { SIMULATION } from '../../src/utils/constants.js';

function SocketProbe() {
  const { isConnected } = useSocket();
  return <span data-testid="connected">{isConnected ? 'yes' : 'no'}</span>;
}

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('../../src/services/api.js', () => ({
  getWebSocketUrl: () => 'ws://localhost/api/socket',
}));

class MockWebSocket {
  static CONNECTING = 0;

  static OPEN = 1;

  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    globalThis.__mockSockets = globalThis.__mockSockets ?? [];
    globalThis.__mockSockets.push(this);
    queueMicrotask(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.({});
    });
  }

  close(code = 1000) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code });
  }

  send() {}
}

async function flushSocketOpen() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('SocketContext', () => {
  beforeEach(() => {
    globalThis.__mockSockets = [];
    globalThis.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reconnect after disconnect', async () => {
    vi.useFakeTimers();

    render(
      <SocketProvider>
        <SocketProbe />
      </SocketProvider>,
    );

    await flushSocketOpen();
    expect(document.querySelector('[data-testid="connected"]')?.textContent).toBe('yes');

    const firstCount = globalThis.__mockSockets.length;
    const socket = globalThis.__mockSockets.at(-1);

    act(() => {
      socket.close(1006);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SIMULATION.websocketReconnectDelay + 100);
    });

    expect(globalThis.__mockSockets.length).toBeGreaterThan(firstCount);
  });

  it('cleanup on unmount', async () => {
    const { unmount } = render(
      <SocketProvider>
        <SocketProbe />
      </SocketProvider>,
    );

    await flushSocketOpen();
    expect(globalThis.__mockSockets.length).toBeGreaterThan(0);

    unmount();

    const open = globalThis.__mockSockets.filter((s) => s.readyState === MockWebSocket.OPEN);
    expect(open.length).toBe(0);
  });

  it('receive vehicle position update via subscribe', async () => {
    window.__socketMessages = [];

    function Listener() {
      const { subscribe } = useSocket();
      useEffect(() => subscribe((data) => {
        window.__socketMessages.push(data);
      }), [subscribe]);
      return null;
    }

    render(
      <SocketProvider>
        <Listener />
      </SocketProvider>,
    );

    await flushSocketOpen();
    expect(globalThis.__mockSockets.length).toBeGreaterThan(0);

    const socket = globalThis.__mockSockets.at(-1);
    act(() => {
      socket.onmessage?.({ data: JSON.stringify({ devices: [{ id: 1, name: 'X' }] }) });
    });

    expect(window.__socketMessages).toHaveLength(1);
    expect(window.__socketMessages[0].devices[0].name).toBe('X');
  });
});
