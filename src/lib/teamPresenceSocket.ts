import Cookies from 'js-cookie';
import { getRegistrationBackendBase } from '../utils/registrationBackend';

export type TeamPresenceEvent = {
  type?: string;
  companyId?: string;
  userId?: string;
  online?: boolean;
  status?: string;
  onlineUserIds?: string[];
};

function presenceUrl(userId: string, companyId: string): string | null {
  try {
    const url = new URL(getRegistrationBackendBase());
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws/team-presence';
    url.search = new URLSearchParams({ userId, companyId }).toString();
    return url.toString();
  } catch {
    return null;
  }
}

export function connectTeamPresenceSocket(): () => void {
  let innerStop = () => {};
  let stopped = false;
  let activeKey = '';

  const start = () => {
    if (stopped) return;
    const userId = Cookies.get('userId') || localStorage.getItem('userId') || '';
    const companyId = Cookies.get('companyId') || localStorage.getItem('companyId') || '';
    const key = `${userId}:${companyId}`;
    if (!userId || !companyId || key === activeKey) return;
    innerStop();
    activeKey = key;
    innerStop = openSocket(userId, companyId);
  };

  start();
  window.addEventListener('harx:company-ready', start);
  return () => {
    stopped = true;
    activeKey = '';
    innerStop();
    window.removeEventListener('harx:company-ready', start);
  };
}

function openSocket(userId: string, companyId: string): () => void {
  const wsUrl = presenceUrl(userId, companyId);
  if (!wsUrl) return () => {};

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const publish = (detail: TeamPresenceEvent) => {
    window.dispatchEvent(new CustomEvent('harx:team-presence', { detail }));
  };

  const connect = () => {
    if (disposed) return;
    try {
      socket = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as TeamPresenceEvent;
        if (data?.type === 'presence' || data?.type === 'presence_snapshot') publish(data);
      } catch {
        /* ignore malformed frames */
      }
    };
    socket.onclose = () => scheduleReconnect();
    socket.onerror = () => socket?.close();
  };

  const scheduleReconnect = () => {
    if (disposed || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 2000);
  };

  connect();

  return () => {
    disposed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket?.close();
  };
}
