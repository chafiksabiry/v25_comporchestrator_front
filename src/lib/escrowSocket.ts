import Cookies from 'js-cookie';

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

  const RELEVANT_TYPES = new Set([
    'escrow_update',
    'reconciliation_complete',
    'company_wallet_update',
  ]);

  const connect = () => {
    if (disposed) return;
    try {
      socket = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }

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

    socket.onclose = () => {
      socket = null;
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

  const scheduleReconnect = () => {
    if (disposed || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 5000);
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
