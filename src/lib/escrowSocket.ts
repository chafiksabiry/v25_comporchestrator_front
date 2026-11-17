import Cookies from 'js-cookie';
import { getAuthToken } from './authFetch';

export type EscrowMessage = {
  type?: string;
  companyId?: string;
  callId?: string;
  repName?: string;
  leadName?: string;
  message?: string;
  requestedAt?: string;
  requestCount?: number;
  [key: string]: unknown;
};

export type EscrowSocketOptions = {
  /** Called for every parsed WS message (after companyId filter when set). */
  onEvent?: (data: EscrowMessage) => void;
};

function getWsUrl(): string | null {
  const base =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_COMPORCHESTRATOR_BACK_URL ||
    'http://localhost:3003/api';

  try {
    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    // The WS server is mounted at `/escrow-updates` on the server root, not under /api.
    url.pathname = '/escrow-updates';
    url.search = '';
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Connect to the escrow WebSocket and invoke `onCompanyUpdate` whenever the
 * server broadcasts a wallet-affecting event for the current company. Returns
 * a disposer that closes the socket and stops reconnection.
 */
export function connectEscrowSocket(
  onCompanyUpdate: () => void,
  options?: EscrowSocketOptions
): () => void {
  const wsUrl = getWsUrl();
  if (!wsUrl) return () => {};

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  // Consecutive failed attempts (closed before opening, or auth refused): backs off instead of hammering the server.
  let failures = 0;

  const RELEVANT_TYPES = new Set([
    'escrow_update',
    'reconciliation_complete',
    'company_wallet_update',
  ]);

  const connect = () => {
    if (disposed) return;
    // The server requires the user's JWT (sub-protocol `bearer, <token>`): no session, no connection and no retry loop.
    const token = getAuthToken();
    if (!token) return;
    let opened = false;
    try {
      socket = new WebSocket(wsUrl, ['bearer', token]);
    } catch {
      failures += 1;
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      opened = true;
      failures = 0;
    };

    socket.onmessage = (event) => {
      let data: EscrowMessage;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!data?.type) return;

      const myCompanyId = Cookies.get('companyId');
      if (data.companyId && myCompanyId && String(data.companyId) !== String(myCompanyId)) {
        return;
      }

      options?.onEvent?.(data);

      if (!RELEVANT_TYPES.has(data.type)) return;
      onCompanyUpdate();
    };

    socket.onclose = (event) => {
      socket = null;
      // 4401: token expired mid-connection; 401: refused. Reconnect with the current token
      // right away if it changed, otherwise back off (no token => no reconnect, see connect()).
      const authClose = event.code === 4401 || event.code === 401;
      if (authClose && getAuthToken() && getAuthToken() !== token) {
        failures = 0;
        scheduleReconnect(0);
        return;
      }
      if (authClose || !opened) failures += 1;
      scheduleReconnect();
    };

    socket.onerror = () => {
      try {
        socket?.close();
      } catch {
        /* ignore */
      }
    };
  };

  const scheduleReconnect = (delayMs?: number) => {
    if (disposed || reconnectTimer || !getAuthToken()) return;
    const delay = delayMs ?? Math.min(60000, 5000 * 2 ** Math.min(failures, 4));
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  connect();

  return () => {
    disposed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    try {
      socket?.close();
    } catch {
      /* ignore */
    }
  };
}
