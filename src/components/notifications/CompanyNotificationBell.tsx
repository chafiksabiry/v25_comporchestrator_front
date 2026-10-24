import React, { useCallback, useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Ban,
  CheckCheck,
  Coins,
  Cpu,
  CreditCard,
  Mail,
  MailOpen,
  Phone,
  Timer,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { authFetch } from '../../lib/authFetch';
import { getOrchestratorApiBase } from '../../lib/paypalCheckout';
import { playNotificationSound } from '../../utils/notificationSound';

type CompanyNotification = {
  id: string;
  kind: string;
  title: string;
  message: string;
  actionPath: string | null;
  read: boolean;
  createdAt: string;
};

const POLL_MS = 30000;
/** Other parts of the app can ask for an immediate refresh with `window.dispatchEvent(new Event(COMPANY_NOTIFICATIONS_REFRESH))`. */
export const COMPANY_NOTIFICATIONS_REFRESH = 'COMPANY_NOTIFICATIONS_REFRESH';

function timeAgo(value: string, isFr: boolean): string {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return isFr ? "À l'instant" : 'Just now';
  if (m < 60) return isFr ? `Il y a ${m} min` : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return isFr ? `Il y a ${h} h` : `${h} h ago`;
  const d = Math.floor(h / 24);
  return isFr ? `Il y a ${d} j` : `${d} d ago`;
}

function KindIcon({ kind }: { kind: string }) {
  const wrap = (bg: string, icon: React.ReactNode) => (
    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${bg}`}>{icon}</div>
  );
  switch (kind) {
    case 'enrollment_request':
      return wrap('bg-indigo-500/40', <UserPlus className="h-4 w-4" />);
    case 'enrollment_accepted':
      return wrap('bg-emerald-500/40', <CheckCheck className="h-4 w-4" />);
    case 'enrollment_rejected':
      return wrap('bg-slate-500/45', <Ban className="h-4 w-4" />);
    case 'wallet':
      return wrap('bg-amber-500/40', <Coins className="h-4 w-4" />);
    case 'tokens':
      return wrap('bg-fuchsia-500/40', <Cpu className="h-4 w-4" />);
    case 'minutes':
      return wrap('bg-sky-500/40', <Timer className="h-4 w-4" />);
    case 'phone':
      return wrap('bg-teal-500/40', <Phone className="h-4 w-4" />);
    case 'subscription':
      return wrap('bg-violet-500/40', <CreditCard className="h-4 w-4" />);
    default:
      return wrap('bg-white/20', <Bell className="h-4 w-4" />);
  }
}

/**
 * Header bell for the company: durable notifications (REP applications, payments…) stored by the
 * orchestrator backend, refreshed every 30 s while the tab is visible.
 */
export function CompanyNotificationBell({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { i18n } = useTranslation();
  const isFr = (i18n.language || '').toLowerCase().startsWith('fr');
  const [items, setItems] = useState<CompanyNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const rootRef = useRef<HTMLDivElement>(null);
  const knownUnreadRef = useRef<number | null>(null);

  const base = getOrchestratorApiBase();
  const companyId = () => Cookies.get('companyId') || '';

  const load = useCallback(async () => {
    const id = companyId();
    if (!id) return;
    try {
      const res = await authFetch(`${base}/company-notifications/${id}?limit=50`);
      if (!res.ok) return;
      const json = await res.json();
      const rows: CompanyNotification[] = Array.isArray(json?.data) ? json.data : [];
      setItems(rows);
      const unread = rows.filter((n) => !n.read).length;
      // Chime only when a new unread notification arrives after the first load.
      if (knownUnreadRef.current !== null && unread > knownUnreadRef.current) playNotificationSound();
      knownUnreadRef.current = unread;
    } catch {
      /* offline or unauthenticated: keep what is shown */
    }
  }, [base]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);
    const refresh = () => void load();
    window.addEventListener(COMPANY_NOTIFICATIONS_REFRESH, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(COMPANY_NOTIFICATIONS_REFRESH, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;
  const visible = filter === 'unread' ? items.filter((n) => !n.read) : items;

  const call = (path: string, init: RequestInit) => authFetch(`${base}/company-notifications/${companyId()}${path}`, init).catch(() => null);
  const json = { 'Content-Type': 'application/json' };

  const setRead = (id: string, read: boolean) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read } : n)));
    knownUnreadRef.current = null;
    void call(`/${id}/read`, { method: 'PUT', headers: json, body: JSON.stringify({ read }) });
  };
  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    knownUnreadRef.current = null;
    void call('/read-all', { method: 'PUT' });
  };
  const remove = (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    knownUnreadRef.current = null;
    void call(`/${id}`, { method: 'DELETE' });
  };
  const clearAll = () => {
    setItems([]);
    knownUnreadRef.current = 0;
    void call('', { method: 'DELETE' });
  };

  const openNotification = (n: CompanyNotification) => {
    if (!n.read) setRead(n.id, true);
    if (n.actionPath) onNavigate(n.actionPath);
    setOpen(false);
  };

  if (!companyId()) return null;

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-200"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#0B0F19]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[210] mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/20 bg-gradient-harx shadow-2xl animate-fade-in">
          <div className="space-y-2 border-b border-white/20 bg-white/10 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="block text-sm font-black text-white">Notifications</span>
                <span className="text-[10px] font-medium text-white/60">
                  {isFr ? 'Historique' : 'History'} · {items.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    title={isFr ? 'Tout marquer comme lu' : 'Mark all read'}
                  >
                    <MailOpen className="h-4 w-4" />
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    title={isFr ? 'Tout effacer' : 'Clear all'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              {(['all', 'unread'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
                    filter === f ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {f === 'all' ? (isFr ? 'Toutes' : 'All') : isFr ? 'Non lues' : 'Unread'} ({f === 'all' ? items.length : unreadCount})
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-4 py-10 text-center text-white/70">
                <Bell className="mx-auto mb-2 h-8 w-8 opacity-60" />
                <p className="text-sm font-medium">
                  {filter === 'unread'
                    ? isFr ? 'Aucune notification non lue' : 'No unread notifications'
                    : isFr ? 'Aucune notification' : 'No notifications'}
                </p>
              </div>
            ) : (
              visible.map((n) => (
                <div
                  key={n.id}
                  className={`group flex items-start gap-2 border-b border-white/10 px-3 py-3 transition-colors ${
                    n.read ? 'hover:bg-white/5' : 'bg-white/10 hover:bg-white/15'
                  }`}
                >
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read ? '' : 'bg-sky-300 shadow-sm'}`} aria-hidden />
                  <KindIcon kind={n.kind} />
                  <button type="button" onClick={() => openNotification(n)} className="min-w-0 flex-1 text-left">
                    <p className={`text-sm leading-tight ${n.read ? 'font-semibold text-white/90' : 'font-bold text-white'}`}>{n.title}</p>
                    <p className="mt-0.5 line-clamp-3 text-xs leading-snug text-white/80">{n.message}</p>
                    <p className="mt-1 text-[10px] font-medium text-white/50">{timeAgo(n.createdAt, isFr)}</p>
                  </button>
                  <div className="flex shrink-0 flex-col gap-0.5 opacity-80 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setRead(n.id, !n.read)}
                      className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
                      title={n.read ? (isFr ? 'Marquer non lu' : 'Mark unread') : isFr ? 'Marquer lu' : 'Mark read'}
                    >
                      {n.read ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(n.id)}
                      className="rounded-md p-1 text-white/70 hover:bg-rose-500/20 hover:text-rose-200"
                      title={isFr ? 'Supprimer' : 'Delete'}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyNotificationBell;
