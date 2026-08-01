import { Client } from '@stomp/stompjs';

// Polyfill global for any legacy dependencies if needed
if (typeof window !== 'undefined' && !window.global) {
  window.global = window;
}

const getWebSocketUrl = () => {
  const envApi = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  const cleanApi = envApi.replace('/api', '');
  const isHttps = cleanApi.startsWith('https');
  const protocol = isHttps ? 'wss' : 'ws';
  const host = cleanApi.replace(/^https?:\/\//, '');
  return `${protocol}://${host}/ws/websocket`;
};

let stompClient = null;
const messageListeners = new Set();

export const initWebSocket = (userId) => {
  if (!userId) return null;
  if (stompClient && stompClient.active) return stompClient;

  try {
    const wsUrl = getWebSocketUrl();
    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {}, // silence console logs
    });

    client.onConnect = () => {
      try {
        client.subscribe(`/user/${userId}/queue/messages`, (message) => {
          try {
            const payload = JSON.parse(message.body);
            messageListeners.forEach((listener) => {
              try { listener(payload); } catch (e) {}
            });
          } catch (err) {
            console.warn('Lỗi parse tin nhắn STOMP:', err);
          }
        });
      } catch (subErr) {
        console.warn('Lỗi đăng ký channel STOMP:', subErr);
      }
    };

    client.onStompError = (frame) => {
      console.warn('Lỗi STOMP Server:', frame?.headers?.['message']);
    };

    client.onWebSocketError = () => {
      // Quietly ignore connection failure - fallback polling handles it
    };

    client.activate();
    stompClient = client;
    return stompClient;
  } catch (err) {
    console.warn('Không thể tạo kết nối STOMP WebSocket:', err);
    return null;
  }
};

export const subscribeToMessages = (listener) => {
  messageListeners.add(listener);
  return () => {
    messageListeners.delete(listener);
  };
};

export const disconnectWebSocket = () => {
  if (stompClient) {
    try {
      stompClient.deactivate();
    } catch (ignored) {}
    stompClient = null;
  }
};
