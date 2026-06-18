/**
 * Injects a controllable WebSocket mock before the app loads.
 */
export async function installWebSocketMock(page) {
  await page.addInitScript(() => {
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
        window.__mockSockets = window.__mockSockets ?? [];
        window.__mockSockets.push(this);
        queueMicrotask(() => {
          this.readyState = MockWebSocket.OPEN;
          this.onopen?.({});
        });
      }

      send() {}

      close(code = 1000) {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.({ code });
      }

      simulateClose(code = 1006) {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.({ code });
      }

      simulateMessage(payload) {
        this.onmessage?.({ data: JSON.stringify(payload) });
      }
    }

    window.WebSocket = MockWebSocket;
  });
}

export async function getMockSockets(page) {
  return page.evaluate(() => window.__mockSockets ?? []);
}
