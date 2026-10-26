import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  fetchFraudCalls,
  reviewFraudCall,
  type FraudCallRow,
  type FraudCallsApi,
  type FraudReviewState,
} from '../../../lib/fraudStatsApi';

const TABS: FraudReviewState[] = ['pending', 'confirmed', 'overturned'];

function playableUrl(url: string): string {
  return url.includes('twilio.com') && !url.endsWith('.mp3') ? `${url}.mp3` : url;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`;
}

/**
 * Review queue of the calls flagged as fraud: the company listens to / reads the call, then confirms the fraud
 * or marks it as a false positive. Decisions are kept (audit trail) and can be changed.
 */
const FraudReviewPanel: React.FC<{
  companyId: string;
  gigId?: string;
  /** Called after a decision so the dashboard counters can refresh. */
  onChanged?: () => void;
}> = ({ companyId, gigId, onChanged }) => {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<FraudReviewState>('pending');
  const [data, setData] = useState<FraudCallsApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const english = i18n.language.toLowerCase().startsWith('en');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await fetchFraudCalls(companyId, { status: tab, gigId }));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [companyId, gigId, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (call: FraudCallRow, decision: 'confirm' | 'overturn') => {
    if (busyId) return;
    setBusyId(call.id);
    try {
      await reviewFraudCall(call.id, decision, { reason: reasons[call.id]?.trim() || undefined });
      setExpandedId(null);
      await load();
      onChanged?.();
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  const counts = data?.counts;
  const calls = data?.calls ?? [];

  const renderActions = (call: FraudCallRow) => {
    const state = call.review.state;
    const busy = busyId === call.id;
    const confirmBtn = (label: string) => (
      <button
        type="button"
        disabled={busy}
        onClick={() => void decide(call, 'confirm')}
        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        <ShieldAlert size={13} />
        {label}
      </button>
    );
    const overturnBtn = (label: string) => (
      <button
        type="button"
        disabled={busy}
        onClick={() => void decide(call, 'overturn')}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <ShieldCheck size={13} />
        {label}
      </button>
    );
    return (
      <div className="flex flex-wrap items-center gap-2">
        {busy && <Loader2 size={14} className="animate-spin text-slate-400" />}
        {state !== 'confirmed' && confirmBtn(state === 'overturned' ? t('fraudReview.confirmAfterAll', 'Finalement, c’est une fraude') : t('fraudReview.confirm', 'Confirmer la fraude'))}
        {state !== 'overturned' && overturnBtn(state === 'confirmed' ? t('fraudReview.overturnAfterAll', 'Finalement, ce n’est pas une fraude') : t('fraudReview.overturn', 'Ce n’est pas une fraude'))}
      </div>
    );
  };

  return (
    <div className="space-y-4 text-slate-800">
      <p className="text-xs text-slate-500">
        {t(
          'fraudReview.intro',
          'Écoutez l’appel ou lisez la transcription, puis confirmez la fraude ou indiquez qu’il s’agit d’un faux positif. Tous les appels signalés sont listés ici, quelle que soit la période affichée.'
        )}
      </p>

      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setExpandedId(null);
            }}
            className={`rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors ${
              tab === id ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300'
            }`}
          >
            {t(`fraudReview.tabs.${id}`, id === 'pending' ? 'À examiner' : id === 'confirmed' ? 'Confirmées' : 'Écartées')}
            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${tab === id ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>
              {counts ? counts[id] : '–'}
            </span>
          </button>
        ))}
      </div>

      {tab === 'overturned' && calls.length > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          {t(
            'fraudReview.overturnedNote',
            'Ces appels ne comptent plus contre le rep. Leurs commissions et leur résultat ne sont recalculés qu’après une nouvelle analyse de l’appel (page Appels).'
          )}
        </p>
      )}

      {loading && !data ? (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          {t('fraudReview.loading', 'Chargement des appels signalés…')}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {t('fraudReview.error', 'Impossible de charger ou d’enregistrer. Réessayez.')}{' '}
          <button type="button" className="font-bold underline" onClick={() => void load()}>
            {t('fraudReview.retry', 'Réessayer')}
          </button>
        </div>
      ) : calls.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          <CheckCircle2 size={18} className="text-emerald-500" />
          {tab === 'pending'
            ? t('fraudReview.emptyPending', 'Aucun appel signalé en attente de vérification.')
            : t('fraudReview.emptyOther', 'Aucun appel dans cette liste.')}
        </div>
      ) : (
        <ul className="space-y-3">
          {calls.map((call) => {
            const open = expandedId === call.id;
            const reason = (english ? call.reason.en : call.reason.fr) || (call.selfCall ? t('fraudReview.selfCall', 'Le même interlocuteur semble tenir les deux rôles (appel à soi-même).') : null);
            return (
              <li key={call.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold text-slate-900">
                      {call.agentName}
                      <span className="mx-1.5 font-normal text-slate-400">→</span>
                      {call.leadName || t('fraudReview.unknownLead', 'Prospect inconnu')}
                      {call.leadPhone ? <span className="ml-2 text-xs font-normal text-slate-500">{call.leadPhone}</span> : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {call.createdAt ? new Date(call.createdAt).toLocaleString(i18n.language) : '—'} · {formatDuration(call.duration)}
                      {call.gigTitle ? ` · ${call.gigTitle}` : ''}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-700">
                    <ShieldAlert size={12} />
                    {call.fraudScore !== null
                      ? t('fraudReview.score', 'Intégrité IA {{score}}/100', { score: Math.round(call.fraudScore) })
                      : t('fraudReview.flagged', 'Signalé')}
                  </span>
                </div>

                {reason && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{reason}</p>}

                {call.review.state !== 'pending' && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    {call.review.state === 'confirmed'
                      ? t('fraudReview.confirmedOn', 'Fraude confirmée')
                      : t('fraudReview.overturnedOn', 'Écartée comme faux positif')}
                    {call.review.reviewedAt ? ` · ${new Date(call.review.reviewedAt).toLocaleDateString(i18n.language)}` : ''}
                    {call.review.reason ? ` · « ${call.review.reason} »` : ''}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : call.id)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-harx-600 hover:underline"
                  aria-expanded={open}
                >
                  {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {open ? t('fraudReview.hideEvidence', 'Masquer les éléments') : t('fraudReview.showEvidence', 'Écouter / lire l’appel')}
                </button>

                {open && (
                  <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                    {call.recordingUrl ? (
                      <audio controls preload="none" src={playableUrl(call.recordingUrl)} className="w-full" />
                    ) : (
                      <p className="text-xs italic text-slate-500">{t('fraudReview.noRecording', 'Aucun enregistrement disponible pour cet appel.')}</p>
                    )}
                    {call.transcriptPreview.length > 0 ? (
                      <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs">
                        {call.transcriptPreview.map((turn, i) => (
                          <p key={i}>
                            <span className="font-bold text-slate-600">{turn.speaker || '—'} : </span>
                            {turn.text}
                          </p>
                        ))}
                        <p className="pt-1 italic text-slate-400">{t('fraudReview.transcriptExcerpt', 'Début de la transcription (extrait).')}</p>
                      </div>
                    ) : (
                      <p className="text-xs italic text-slate-500">{t('fraudReview.noTranscript', 'Aucune transcription disponible.')}</p>
                    )}
                    <textarea
                      value={reasons[call.id] || ''}
                      onChange={(e) => setReasons((prev) => ({ ...prev, [call.id]: e.target.value }))}
                      maxLength={500}
                      rows={2}
                      placeholder={t('fraudReview.reasonPlaceholder', 'Motif de votre décision (facultatif)')}
                      className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-harx-400 focus:outline-none"
                    />
                    {renderActions(call)}
                    <p className="text-[11px] text-slate-400">
                      {t(
                        'fraudReview.consequence',
                        'Confirmer : l’appel reste compté contre le rep et aucune commission n’est due. Écarter : il ne compte plus contre le rep.'
                      )}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {data?.truncated && (
        <p className="text-[11px] text-slate-400">
          {t('fraudReview.truncated', 'Seuls les appels signalés les plus récents sont analysés pour cette liste.')}
        </p>
      )}
    </div>
  );
};

export default FraudReviewPanel;
