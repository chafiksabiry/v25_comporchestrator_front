import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';

type GigOption = { _id: string; title: string };

/** Grayed-out Voice Assistant teaser on the company ops dashboard. */
export function VoiceAssistantOverviewCard({
  selectedGigId: _selectedGigId,
  gigs: _gigs,
}: {
  selectedGigId: string;
  gigs: GigOption[];
}) {
  const { t } = useTranslation();

  return (
    <section
      aria-disabled="true"
      className="relative overflow-hidden rounded-harx border border-slate-200 bg-slate-50 p-5 shadow-harx opacity-60 grayscale cursor-not-allowed select-none"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pointer-events-none">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-300 text-slate-600">
            <Bot size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black text-slate-600">
                {t('opsDashboard.overview.voiceCard.title', 'Assistant vocal')}
              </h2>
              <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {t('sidebar.comingSoonShort', 'Bientôt')}
              </span>
            </div>
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              {t(
                'aiVoice.comingSoonBody',
                'Cette fonctionnalité sera bientôt disponible pour les entreprises.'
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
