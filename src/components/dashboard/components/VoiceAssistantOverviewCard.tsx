import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchVoiceAssistant, saveVoiceAssistant } from '../lib/aiVoiceApi';

type GigOption = { _id: string; title: string };

export function VoiceAssistantOverviewCard({
  selectedGigId,
  gigs,
}: {
  selectedGigId: string;
  gigs: GigOption[];
}) {
  const { t } = useTranslation();
  const gig = useMemo(
    () => (selectedGigId && selectedGigId !== 'all' ? gigs.find((g) => g._id === selectedGigId) : null),
    [gigs, selectedGigId]
  );
  const gigId = gig?._id || '';

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(Boolean(gigId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!gigId) {
      setEnabled(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchVoiceAssistant(gigId)
      .then((cfg) => {
        if (!cancelled) setEnabled(Boolean(cfg?.enabled));
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gigId]);

  const href = gigId
    ? `/dashboard/voice-assistant?gigId=${encodeURIComponent(gigId)}`
    : '/dashboard/voice-assistant';

  const onEnable = async () => {
    if (!gigId) return;
    setSaving(true);
    try {
      await saveVoiceAssistant({ gigId, enabled: true, gigTitle: gig?.title });
      setEnabled(true);
      toast.success(t('aiVoice.enabled', 'Assistant vocal activé pour ce gig.'));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('aiVoice.saveFailed', "Impossible d'enregistrer l'assistant.")
      );
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = !gigId
    ? t('opsDashboard.overview.voiceCard.statusPick', 'Choisir un gig')
    : loading
      ? '…'
      : enabled
        ? t('opsDashboard.overview.voiceCard.statusReady', 'Prêt')
        : t('opsDashboard.overview.voiceCard.statusOff', 'Inactif');

  const statusClass = !gigId
    ? 'bg-slate-100 text-slate-600'
    : enabled
      ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
      : 'bg-amber-50 text-amber-800 border-amber-100';

  return (
    <section className="rounded-harx border border-harx-border bg-white p-5 shadow-harx">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <Bot size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black text-harx-ink">
                {t('opsDashboard.overview.voiceCard.title', 'Assistant vocal')}
              </h2>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${statusClass}`}
              >
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 text-[12px] font-medium text-slate-600">
              {gig
                ? enabled
                  ? t('opsDashboard.overview.voiceCard.readySub', {
                      gig: gig.title,
                      defaultValue: 'L’IA peut composer et suivre le script de {{gig}}.',
                    })
                  : t('opsDashboard.overview.voiceCard.offSub', {
                      gig: gig.title,
                      defaultValue: 'Activez l’assistant pour que l’IA appelle sur {{gig}}.',
                    })
                : t(
                    'opsDashboard.overview.voiceCard.allGigsSub',
                    'L’IA compose et parle. Sélectionnez un gig pour voir le statut.'
                  )}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t(
                'opsDashboard.overview.voiceCard.pipeline',
                'Telnyx → Script → Assistant'
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {gigId && !enabled && !loading ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void onEnable()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-700 bg-emerald-600 px-3 py-2 text-[11px] font-black text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? '…' : t('aiVoice.enable', "Activer l'assistant")}
            </button>
          ) : null}
          <Link
            to={href}
            className="inline-flex items-center gap-1.5 rounded-xl border border-harx-border bg-white px-3 py-2 text-[11px] font-black text-harx-ink shadow-harx hover:bg-slate-50"
          >
            {enabled
              ? t('aiVoice.openPage', 'Lancer des appels')
              : t('opsDashboard.overview.voiceCard.open', 'Ouvrir')}
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}
