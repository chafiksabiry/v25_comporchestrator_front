import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2 } from 'lucide-react';
import apiClient from '../api/knowledgeClient';
import { listSectorCases } from './training/data/sectorCatalog';
import { detectSectorIds } from './training/data/gigMethodology';
import { contentLanguageLabel, resolveContentLanguage } from './training/utils/contentLanguage';

interface SectorKnowledgePanelProps {
  userId: string | null;
  gig: any | null;
  onCreated: () => void;
}

/**
 * Creates, with the AI, the knowledge base of one sector case for the selected gig. The document is attached to
 * that gig only, so other gigs are never fed with sector content that does not concern them.
 */
export default function SectorKnowledgePanel({ userId, gig, onCreated }: SectorKnowledgePanelProps) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || i18n.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
  const country: string | undefined = gig?.destination_zone?.name?.common;
  const cases = useMemo(() => listSectorCases(lang, country), [lang, country]);
  const suggested = useMemo(() => detectSectorIds(gig), [gig]);
  const [chosen, setChosen] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const sectorId = chosen || suggested[0] || '';
  const selected = cases.find((c) => c.id === sectorId);
  const gigId = gig ? String(gig._id || gig.id || '') : '';

  const generate = async (force = false) => {
    if (!selected || !gigId || !userId) return;
    setBusy(true);
    setMessage(null);
    try {
      const language = resolveContentLanguage(gigId, i18n.language, gig?.title, gig?.description);
      const res = await apiClient.post(
        '/documents/sector-knowledge',
        {
          userId,
          gigId,
          sectorId: selected.id,
          sectorName: selected.name,
          outline: selected.outline,
          language,
          country,
          gigTitle: gig?.title,
          gigDescription: gig?.description,
          force,
        },
        { timeout: 180000 }
      );
      const data = res.data as any;
      if (data?.alreadyExists) {
        setMessage({ ok: true, text: t('knowledgeBase.sectorKb.exists', { name: selected.name }) });
      } else {
        setMessage({ ok: true, text: t('knowledgeBase.sectorKb.created', { name: selected.name, language: contentLanguageLabel(language) }) });
        onCreated();
      }
    } catch (error: any) {
      setMessage({ ok: false, text: error?.response?.data?.details || error?.response?.data?.error || t('knowledgeBase.sectorKb.error') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-harx-500" />
        <h3 className="text-sm font-extrabold text-gray-900">{t('knowledgeBase.sectorKb.title')}</h3>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-gray-600">{t('knowledgeBase.sectorKb.help')}</p>
      {!gigId ? (
        <p className="mt-3 text-xs font-semibold text-amber-700">{t('knowledgeBase.sectorKb.needGig')}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={sectorId}
            onChange={(e) => setChosen(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            <option value="">{t('knowledgeBase.sectorKb.choose')}</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {suggested.includes(c.id) ? ` — ${t('knowledgeBase.sectorKb.suggested')}` : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selected || busy}
            onClick={() => void generate(false)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-harx px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? t('knowledgeBase.sectorKb.generating') : t('knowledgeBase.sectorKb.generate')}
          </button>
        </div>
      )}
      {message && <p className={`mt-2 text-xs font-semibold ${message.ok ? 'text-green-700' : 'text-red-700'}`}>{message.text}</p>}
    </div>
  );
}
