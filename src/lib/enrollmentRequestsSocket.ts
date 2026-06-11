type EnrollmentMessage = {
  type?: string;
  companyId?: string;
  repId?: string;
  gigId?: string;
  status?: string;
  [key: string]: unknown;
};

function getWsUrl(): string | null {
  const base =
    import.meta.env.VITE_MATCHING_API_URL ||
    'https://v25matchingbackend-production.up.railway.app/api';

  try {
    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    // The WS server is mounted at `/enrollment-updates` on the server root, not under /api.
    url.pathname = '/enrollment-updates';
    url.search = '';
    return url.toString();
  } catch {
    return null;
  }
}

export type EnrollmentRequestsSocketOptions = {
  /** Company id used to filter incoming events to this company only. */
  companyId?: string;
  /** Called on every successful connect/reconnect (catches missed broadcasts while offline). */
  onConnect?: () => void;
};

/**
 * Connect to the matching backend enrollment WebSocket and invoke
 * `onRequestUpdate` whenever a rep applies to one of this company's gigs
 * (dashboard "requests" list updates live, without a page reload).
 * Returns a disposer that closes the socket and stops reconnection.
 */
export function connectCompanyEnrollmentRequestsSocket(
  onRequestUpdate: (data: EnrollmentMessage) => void,
  options?: EnrollmentRequestsSocketOptions
): () => void {
  const wsUrl = getWsUrl();
  if (!wsUrl) return () => {};

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const RELEVANT_TYPES = new Set(['request_received', 'enrollment_update']);

  const connect = () => {
    if (disposed) return;
    try {
      socket = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      options?.onConnect?.();
    };

    socket.onmessage = (event) => {
      let data: EnrollmentMessage;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!data?.type || !RELEVANT_TYPES.has(data.type)) return;

      // Only react to events targeting this company (when both ids are known).
      if (
        options?.companyId &&
        data.companyId &&
        String(data.companyId) !== String(options.companyId)
      ) {
        return;
      }
      onRequestUpdate(data);
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
