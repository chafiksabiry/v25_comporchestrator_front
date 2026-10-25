import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, CheckCircle2, Loader2, Search, XCircle } from 'lucide-react';
import apiClient from '../../api/knowledgeClient';
import { fetchVoiceAssistant } from '../dashboard/lib/aiVoiceApi';
import { searchAgentPassages, type AgentPassage, type GigRef, type KnowledgeScore } from './knowledgeInsights';

/** Level from which the knowledge base is considered good enough for an AI agent to rely on. */
const MIN_AGENT_LEVEL = 3;

type GigStatus = { voice: boolean | null; script: boolean | null };

async function loadGigStatus(gigId: string): Promise<GigStatus> {
  const [voice, script] = await Promise.allSettled([
    fetchVoiceAssistant(gigId),
    apiClient.get('/rag/scripts', { params: { gigId, isActive: true } }),
  ]);
  return {
    voice: voice.status === 'fulfilled' ? Boolean(voice.value?.enabled) : null,
    script:
      script.status === 'fulfilled'
        ? Array.isArray((script.value.data as any)?.data) && (script.value.data as any).data.length > 0
        : null,
  };
}

export default function KnowledgeAgentsPanel({
  companyId,
  gigs,
  scores,
  selectedGigId,
}: {
  companyId: string | null;
  gigs: GigRef[];
  scores: Record<string, KnowledgeScore>;
  selectedGigId: string;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Record<string, GigStatus>>({});
  const [testGigId, setTestGigId] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<{ found: boolean; passages: AgentPassage[] } | null>(null);
  const [searchError, setSearchError] = useState(false);

  const gigsKey = gigs.map((g) => g.id).join(',');
  useEffect(() => {
    let cancelled = false;
    void Promise.all(gigs.map(async (g) => [g.id, await loadGigStatus(g.id)] as const)).then((entries) => {
      if (!cancelled) setStatus(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigsKey]);

  const effectiveTestGig = testGigId || (selectedGigId && selectedGigId !== 'all' ? selectedGigId : gigs[0]?.id || '');

  const runSearch = async () => {
    const q = question.trim();
    if (!q || !companyId) return;
    setSearching(true);
    setSearchError(false);
    setResult(null);
    try {
      setResult(await searchAgentPassages(companyId, effectiveTestGig || null, q));
    } catch (e) {
      console.error('Error searching the knowledge base as an agent:', e);
      setSearchError(true);
    } finally {
      setSearching(false);
    }
  };

  const check = (ok: boolean | null, label: string) => (
    <li className="flex items-center gap-2 text-xs">
      {ok === null ? (
        <Loader2 size={14} className="animate-spin text-gray-300" />
      ) : ok ? (
        <CheckCircle2 size={14} className="text-emerald-600" />
      ) : (
        <XCircle size={14} className="text-red-500" />
      )}
      <span className={ok ? 'text-gray-700' : 'font-semibold text-gray-900'}>{label}</span>
    </li>
  );

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <header>
          <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-gray-900">
            <Bot size={18} className="text-harx-500" />
            {t('knowledgeBase.agents.title', 'Agents IA par gig')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t(
              'knowledgeBase.agents.subtitle',
              'L’agent vocal IA appelle vos prospects en suivant le script du gig et consulte cette base pour répondre aux questions (produit, prix, conditions) sans rien inventer.'
            )}
          </p>
        </header>

        {gigs.length === 0 ? (
          <p className="text-sm text-gray-500">{t('knowledgeBase.agents.noGigs', 'Aucun gig pour le moment.')}</p>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {gigs.map((gig) => {
              const s = status[gig.id];
              const gigScore = scores[gig.id];
              const kbOk = gigScore ? gigScore.level.level >= MIN_AGENT_LEVEL : null;
              const voice = s ? s.voice : null;
              const script = s ? s.script : null;
              const ready = kbOk === true && voice === true && script === true;
              return (
                <li key={gig.id} className="rounded-2xl border border-gray-100 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-black uppercase tracking-wide text-gray-900" title={gig.title}>{gig.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                        ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {ready ? t('knowledgeBase.agents.ready', 'Prêt à travailler') : t('knowledgeBase.agents.incomplete', 'À compléter')}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {check(
                      kbOk,
                      gigScore
                        ? t('knowledgeBase.agents.checks.kb', 'Base de connaissances : {{score}}/100, niveau {{level}}/5 (niveau {{min}} requis)', {
                            score: gigScore.score,
                            level: gigScore.level.level,
                            min: MIN_AGENT_LEVEL,
                          })
                        : t('knowledgeBase.agents.checks.kbLoading', 'Base de connaissances : calcul en cours')
                    )}
                    {check(script, script === false ? t('knowledgeBase.agents.checks.scriptMissing', 'Aucun script actif — créez et activez le script du gig (Script d’appel)') : t('knowledgeBase.agents.checks.script', 'Script d’appel actif'))}
                    {check(voice, voice === false ? t('knowledgeBase.agents.checks.voiceMissing', 'Agent vocal IA désactivé pour ce gig — à activer dans la configuration vocale du gig') : t('knowledgeBase.agents.checks.voice', 'Agent vocal IA activé'))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <header>
          <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">{t('knowledgeBase.agents.testTitle', 'Ce que l’agent trouverait')}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {t('knowledgeBase.agents.testSubtitle', 'Posez la question d’un prospect : voici les passages que l’agent IA recevrait pour répondre.')}
          </p>
        </header>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={effectiveTestGig}
            onChange={(e) => setTestGigId(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            aria-label={t('knowledgeBase.agents.testGig', 'Gig')}
          >
            {gigs.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runSearch();
            }}
            placeholder={t('knowledgeBase.agents.testPlaceholder', 'Ex. : quelle est la franchise en cas de vol ?')}
            className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={searching || !question.trim() || !companyId}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-harx px-5 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {t('knowledgeBase.agents.testButton', 'Tester')}
          </button>
        </div>
        {searchError && <p role="alert" className="text-sm text-red-700">{t('knowledgeBase.agents.testError', 'La recherche a échoué. Réessayez.')}</p>}
        {result && !result.found && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            {t('knowledgeBase.agents.testNothing', 'Rien trouvé dans la base : l’agent répondrait qu’un conseiller rappellera. Ajoutez un document qui traite ce point.')}
          </p>
        )}
        {result && result.found && (
          <ul className="space-y-2">
            {result.passages.map((p, i) => (
              <li key={`${p.documentId}-${i}`} className="rounded-xl border border-gray-100 p-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-harx-600">
                  {p.title} · {t('knowledgeBase.agents.matchScore', 'pertinence {{score}}', { score: Math.round(p.score * 100) })}
                </p>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-gray-700">{p.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
