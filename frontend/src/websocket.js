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

export const getStompClient = () => stompClient;

export const initWebSocket = (userId) => {
  if (!userId) return null;
  if (stompClient && stompClient.active) return stompClient;

  try {
    const wsUrl = getWebSocketUrl();
    const token = localStorage.getItem('token');
    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
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

export const subscribeToGroup = (groupId, callbacks = {}) => {
  if (!stompClient || !stompClient.active || !groupId) {
    return () => {};
  }

  const subs = [];

  try {
    if (callbacks.onMessage) {
      const subMsg = stompClient.subscribe(`/topic/group.${groupId}.messages`, (msg) => {
        try {
          const payload = JSON.parse(msg.body);
          callbacks.onMessage(payload);
        } catch (e) {
          console.warn('Lỗi parse message body:', e);
        }
      });
      subs.push(subMsg);
    }

    if (callbacks.onReaction) {
      const subReact = stompClient.subscribe(`/topic/group.${groupId}.reactions`, (msg) => {
        try {
          const payload = JSON.parse(msg.body);
          callbacks.onReaction(payload);
        } catch (e) {}
      });
      subs.push(subReact);
    }

    if (callbacks.onPinned) {
      const subPin = stompClient.subscribe(`/topic/group.${groupId}.pinned`, (msg) => {
        try {
          const payload = JSON.parse(msg.body);
          callbacks.onPinned(payload);
        } catch (e) {}
      });
      subs.push(subPin);
    }

    if (callbacks.onTyping) {
      const subTyping = stompClient.subscribe(`/topic/group.${groupId}.typing`, (msg) => {
        try {
          const payload = JSON.parse(msg.body);
          callbacks.onTyping(payload);
        } catch (e) {}
      });
      subs.push(subTyping);
    }
  } catch (err) {
    console.warn('Lỗi đăng ký STOMP nhóm:', err);
  }

  return () => {
    subs.forEach(s => {
      try { s.unsubscribe(); } catch (e) {}
    });
  };
};

export const publishGroupMessage = (groupId, payload) => {
  if (stompClient && stompClient.active) {
    stompClient.publish({
      destination: `/app/group/${groupId}/send`,
      body: JSON.stringify(payload),
    });
    return true;
  }
  return false;
};

export const publishGroupReaction = (groupId, messageId, emoji) => {
  if (stompClient && stompClient.active) {
    stompClient.publish({
      destination: `/app/group/${groupId}/react`,
      body: JSON.stringify({ messageId, emoji }),
    });
    return true;
  }
  return false;
};

export const publishGroupTyping = (groupId, isTyping) => {
  if (stompClient && stompClient.active) {
    stompClient.publish({
      destination: `/app/group/${groupId}/typing`,
      body: JSON.stringify({ isTyping }),
    });
    return true;
  }
  return false;
};

export const disconnectWebSocket = () => {
  if (stompClient) {
    try {
      stompClient.deactivate();
    } catch (ignored) {}
    stompClient = null;
  }
};
