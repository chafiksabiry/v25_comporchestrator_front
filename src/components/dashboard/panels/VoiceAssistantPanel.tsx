import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, PhoneOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { getOrchestratorApiBase } from '../../../lib/paypalCheckout';
import {
  fetchVoiceAssistant,
  hangupAiOutboundCall,
  saveVoiceAssistant,
  startAiOutboundCall,
  type AiOutboundSession,
} from '../lib/aiVoiceApi';

type GigRow = { gigId: string; title: string };

type LeadRow = {
  _id: string;
  First_Name?: string;
  Last_Name?: string;
  Deal_Name?: string;
  Phone?: string;
  gigId?: string;
};

function dashboardApi(): string {
  const raw = String(import.meta.env.VITE_DASHBOARD_API || '').replace(/\/$/, '');
  return raw;
}

function leadName(lead: LeadRow): string {
  const name = `${lead.First_Name || ''} ${lead.Last_Name || ''}`.trim();
  return name || lead.Deal_Name || 'Lead';
}

export function VoiceAssistantPanel() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const queryGigId = searchParams.get('gigId') || '';
  const companyId = Cookies.get('companyId') || '';

  const [gigs, setGigs] = useState<GigRow[]>([]);
  const [gigId, setGigId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [active, setActive] = useState<{ leadId: string; session: AiOutboundSession } | null>(
    null
  );

  const loadGigs = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getOrchestratorApiBase()}/escrow/gigs-and-reps/${companyId}`);
      const json = await res.json().catch(() => ({}));
      const rows: GigRow[] = Array.isArray(json?.data) ? json.data : [];
      setGigs(rows);
      setGigId((prev) => {
        if (queryGigId && rows.some((r) => r.gigId === queryGigId)) return queryGigId;
        return prev || rows[0]?.gigId || '';
      });
    } catch (err) {
      console.error('[VoiceAssistant] gigs', err);
      toast.error(t('aiVoice.saveFailed', 'Impossible de charger les gigs.'));
    } finally {
      setLoading(false);
    }
  }, [companyId, queryGigId, t]);

  useEffect(() => {
    void loadGigs();
  }, [loadGigs]);

  useEffect(() => {
    if (!gigId) {
      setEnabled(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchVoiceAssistant(gigId);
        if (!cancelled) setEnabled(Boolean(cfg?.enabled));
      } catch {
        if (!cancelled) setEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gigId]);

  const loadLeads = useCallback(async () => {
    if (!gigId || !dashboardApi()) {
      setLeads([]);
      return;
    }
    setLoadingLeads(true);
    try {
      const res = await fetch(
        `${dashboardApi()}/leads/gig/${encodeURIComponent(gigId)}?page=1&limit=50`
      );
      const json = await res.json().catch(() => ({}));
      const raw = json?.data ?? json?.leads ?? [];
      const list = (Array.isArray(raw) ? raw : []).map((row: Record<string, unknown>) => {
        const idRaw = row._id ?? row.id;
        const id =
          idRaw && typeof idRaw === 'object' && idRaw !== null && '$oid' in idRaw
            ? String((idRaw as { $oid: string }).$oid)
            : String(idRaw || '');
        return { ...row, _id: id } as LeadRow;
      }).filter((row: LeadRow) => row._id);
      setLeads(list);
    } catch (err) {
      console.error('[VoiceAssistant] leads', err);
      setLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  }, [gigId]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const onToggle = async () => {
    if (!gigId) {
      toast.error(t('aiVoice.selectGig', 'Sélectionnez un gig.'));
      return;
    }
    const next = !enabled;
    setSaving(true);
    try {
      const gigTitle = gigs.find((g) => g.gigId === gigId)?.title;
      await saveVoiceAssistant({ gigId, enabled: next, gigTitle });
      setEnabled(next);
      toast.success(
        next
          ? t('aiVoice.enabled', 'Assistant vocal activé pour ce gig.')
          : t('aiVoice.disabled', 'Assistant vocal désactivé.')
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('aiVoice.saveFailed', 'Impossible d’enregistrer l’assistant.')
      );
    } finally {
      setSaving(false);
    }
  };

  const onCall = async (lead: LeadRow) => {
    if (!lead._id) return;
    if (!lead.Phone) {
      toast.error(t('aiVoice.noPhone', 'Ce lead n’a pas de numéro de téléphone.'));
      return;
    }
    setCallingLeadId(lead._id);
    try {
      const session = await startAiOutboundCall({
        leadId: lead._id,
        gigId: gigId || undefined,
        companyId: companyId || undefined,
      });
      setActive({ leadId: lead._id, session });
      toast.success(
        t('aiVoice.callStarted', 'Appel IA lancé vers {{phone}}', { phone: lead.Phone })
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('aiVoice.callFailed', 'Impossible de lancer l’appel IA.')
      );
    } finally {
      setCallingLeadId(null);
    }
  };

  const onHangup = async () => {
    if (!active) return;
    setEnding(true);
    try {
      await hangupAiOutboundCall(active.session);
      setActive(null);
      toast.success(t('aiVoice.callEnded', 'Appel terminé.'));
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('aiVoice.endCallFailed', 'Impossible de terminer l’appel.')
      );
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-emerald-600 text-white">
            <Bot size={18} />
          </span>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {t('aiVoice.pageTitle', 'Assistant vocal')}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {t(
                'aiVoice.pageSub',
                'L’IA compose et suit le script du gig. Une ligne Telnyx et un script actif sont requis.'
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadGigs();
            void loadLeads();
          }}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={14} />
          {t('uploadContacts.list.refresh', 'Actualiser')}
        </button>
      </div>

      <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-5 space-y-4">
        <p className="text-[11px] text-slate-600">
          {t(
            'aiVoice.panelHint',
            'Activez l’assistant sur le même gig que vos leads (celui lié à la ligne Telnyx).'
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={gigId}
            onChange={(e) => setGigId(e.target.value)}
            disabled={loading}
            className="flex-1 px-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white"
          >
            {gigs.length === 0 ? (
              <option value="">{t('aiVoice.selectGig', 'Sélectionnez un gig.')}</option>
            ) : (
              gigs.map((g) => (
                <option key={g.gigId} value={g.gigId}>
                  {g.title}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            disabled={!gigId || saving || loading}
            onClick={() => void onToggle()}
            className={`px-4 py-2.5 text-xs font-black rounded-xl border transition-all disabled:opacity-50 ${
              enabled
                ? 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
            }`}
          >
            {saving
              ? '…'
              : enabled
                ? t('aiVoice.disable', 'Désactiver')
                : t('aiVoice.enable', 'Activer l’assistant')}
          </button>
        </div>
        {enabled ? (
          <p className="text-[11px] font-bold text-emerald-800">
            {t('aiVoice.ready', 'Assistant actif — choisissez un lead ci-dessous.')}
          </p>
        ) : (
          <p className="text-[11px] font-semibold text-slate-500">
            {t('aiVoice.notReady', 'Activez l’assistant avant de lancer un appel.')}
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900">
            {t('aiVoice.leadsTitle', 'Leads à appeler')}
          </h2>
        </div>
        {loadingLeads ? (
          <p className="px-5 py-10 text-sm text-slate-500 text-center">
            {t('uploadContacts.list.loading', 'Chargement…')}
          </p>
        ) : leads.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-500 text-center">
            {t('aiVoice.noLeads', 'Aucun lead pour ce gig.')}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {leads.map((lead) => {
              const isActive = active?.leadId === lead._id;
              const isCalling = callingLeadId === lead._id;
              return (
                <li
                  key={lead._id}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {leadName(lead)}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {lead.Phone || t('aiVoice.noPhone', 'Pas de numéro')}
                    </p>
                  </div>
                  {isActive ? (
                    <button
                      type="button"
                      disabled={ending}
                      onClick={() => void onHangup()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-black text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50"
                    >
                      <PhoneOff size={14} />
                      {ending
                        ? t('aiVoice.endingCall', 'Fin d’appel…')
                        : t('aiVoice.endCall', 'Terminer l’appel')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isCalling || !lead.Phone || Boolean(active)}
                      onClick={() => void onCall(lead)}
                      title={t(
                        'aiVoice.callWithAssistantHint',
                        'Appel sortant via OpenAI Realtime + Telnyx'
                      )}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-black text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Bot size={14} />
                      {isCalling
                        ? t('aiVoice.calling', 'Appel…')
                        : t('aiVoice.callWithAssistant', 'Appeler avec l’assistant')}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default VoiceAssistantPanel;
