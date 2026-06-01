import apiBaseUrl from '../config/apiBaseUrl';

const resolveRealtimeUrl = (token) => {
  const base = apiBaseUrl || window.location.origin;
  const url = new URL(base, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/api/realtime/ws';
  url.searchParams.set('token', token);
  return url.toString();
};

export const connectRealtime = ({ token, onMessage, onOpen, onClose }) => {
  if (!token || !('WebSocket' in window)) return null;
  const socket = new WebSocket(resolveRealtimeUrl(token));
  let heartbeat = null;

  socket.addEventListener('open', () => {
    onOpen?.();
    heartbeat = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.send('ping');
    }, 25000);
  });

  socket.addEventListener('message', (event) => {
    try {
      onMessage?.(JSON.parse(event.data));
    } catch {
      onMessage?.({ type: 'message', payload: event.data });
    }
  });

  socket.addEventListener('close', () => {
    if (heartbeat) window.clearInterval(heartbeat);
    onClose?.();
  });

  return socket;
};
