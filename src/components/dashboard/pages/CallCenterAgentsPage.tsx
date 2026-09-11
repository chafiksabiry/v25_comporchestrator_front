import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, Phone, Plus, RefreshCw, UserPlus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import {
  createCallCenterAgent,
  listCallCenterAgents,
  resendCallCenterAgentInvite,
  type CallCenterAgent,
} from '../../../services/callCenterAgentsApi';
import { isCallCenterWorkspace } from '../../../utils/callCenterWorkspace';

function statusLabel(
  status: string,
  t: (key: string, fallback: string) => string
): string {
  switch (status) {
    case 'invited':
      return t('callCenterAgents.statusInvited', 'Invited');
    case 'active':
      return t('callCenterAgents.statusActive', 'Active');
    case 'pending':
      return t('callCenterAgents.statusPending', 'Pending email');
    default:
      return status || '—';
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'invited':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'active':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'pending':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

export default function CallCenterAgentsPage() {
  const { t } = useTranslation();
  const isOps = isCallCenterWorkspace();
  const companyId = Cookies.get('companyId') || localStorage.getItem('companyId') || '';

  const [agents, setAgents] = useState<CallCenterAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setError(t('callCenterAgents.noCompany', 'Company not found. Complete onboarding first.'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listCallCenterAgents(companyId);
      setAgents(list);
    } catch (e: any) {
      setError(e?.message || t('callCenterAgents.loadError', 'Could not load agents.'));
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSaving(true);
    setSuccessMsg(null);
    setError(null);
    try {
      const result = await createCallCenterAgent({
        companyId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        sendEmail: true,
      });
      if (result.emailSent) {
        setSuccessMsg(
          t('callCenterAgents.createdSent', 'Agent created and invitation email sent.')
        );
      } else if (result.temporaryPassword) {
        setSuccessMsg(
          t(
            'callCenterAgents.createdNoEmail',
            'Agent created, but email failed. Temporary password: {{password}}',
            { password: result.temporaryPassword }
          ) as string
        );
      } else {
        setSuccessMsg(t('callCenterAgents.created', 'Agent created.'));
      }
      setForm({ firstName: '', lastName: '', email: '', phone: '' });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err?.message || t('callCenterAgents.createError', 'Could not create agent.'));
    } finally {
      setSaving(false);
    }
  };

  const onResend = async (userId: string) => {
    if (!companyId) return;
    setResendingId(userId);
    setError(null);
    setSuccessMsg(null);
    try {
      await resendCallCenterAgentInvite(companyId, userId);
      setSuccessMsg(t('callCenterAgents.resent', 'Invitation email resent.'));
      await load();
    } catch (err: any) {
      setError(err?.message || t('callCenterAgents.resendError', 'Could not resend invitation.'));
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className={`max-w-5xl mx-auto ${isOps ? 'space-y-4 pb-10' : 'space-y-6 pb-12'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={`font-black tracking-tight text-slate-900 ${isOps ? 'text-xl' : 'text-2xl'}`}>
            {t('callCenterAgents.title', 'Agents')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t(
              'callCenterAgents.subtitle',
              'Add agents, send invitation emails with temporary passwords, and manage your team.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} />
            {t('callCenterAgents.refresh', 'Refresh')}
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
          >
            <Plus size={14} />
            {t('callCenterAgents.add', 'Add agent')}
          </button>
        </div>
      </div>

      {successMsg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {successMsg}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center gap-2 text-emerald-700">
            <UserPlus size={16} />
            <h2 className="text-sm font-black uppercase tracking-wide">
              {t('callCenterAgents.formTitle', 'New agent')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-slate-600">
              {t('callCenterAgents.firstName', 'First name')}
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              {t('callCenterAgents.lastName', 'Last name')}
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              {t('callCenterAgents.email', 'Email')}
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              {t('callCenterAgents.phone', 'Phone')}
              <input
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              {t('callCenterAgents.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              {t('callCenterAgents.createInvite', 'Create & invite')}
            </button>
          </div>
        </form>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Users size={16} className="text-emerald-600" />
          <span className="text-sm font-black text-slate-900">
            {t('callCenterAgents.listTitle', 'Team agents')}
          </span>
          <span className="ml-auto text-xs font-bold text-slate-400 tabular-nums">
            {agents.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-semibold">{t('callCenterAgents.loading', 'Loading…')}</span>
          </div>
        ) : agents.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="text-sm font-semibold text-slate-500">
              {t('callCenterAgents.empty', 'No agents yet. Add your first agent to send an invitation.')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {agents.map((agent) => (
              <li
                key={agent.userId}
                className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50/80"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 truncate">{agent.fullName}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-slate-500">
                    <span className="inline-flex items-center gap-1 truncate">
                      <Mail size={12} /> {agent.email}
                    </span>
                    {agent.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={12} /> {agent.phone}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${statusClass(
                    agent.invitationStatus
                  )}`}
                >
                  {statusLabel(agent.invitationStatus, t)}
                </span>
                <button
                  type="button"
                  onClick={() => onResend(agent.userId)}
                  disabled={resendingId === agent.userId}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {resendingId === agent.userId ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Mail size={12} />
                  )}
                  {t('callCenterAgents.resend', 'Resend invite')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
