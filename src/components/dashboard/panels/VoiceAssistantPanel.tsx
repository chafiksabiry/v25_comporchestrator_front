import React from 'react';
import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Company-side Voice Assistant — temporarily disabled (grayed / coming soon).
 * Previous interactive UI is kept in git history if we re-enable it.
 */
export function VoiceAssistantPanel() {
  const { t } = useTranslation();

  return (
    <div className="relative min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/80 p-8 sm:p-12">
      <div className="pointer-events-none absolute inset-0 bg-slate-100/40 backdrop-blur-[1px]" />
      <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center text-center gap-4 opacity-70 grayscale">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-300 text-slate-600">
          <Bot size={26} />
        </span>
        <div>
          <h1 className="text-xl font-black text-slate-700 tracking-tight">
            {t('aiVoice.pageTitle', 'Assistant vocal')}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {t(
              'aiVoice.comingSoonBody',
              'Cette fonctionnalité sera bientôt disponible pour les entreprises.'
            )}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
          {t('sidebar.comingSoonShort', 'Bientôt')}
        </span>
      </div>
    </div>
  );
}

export default VoiceAssistantPanel;
