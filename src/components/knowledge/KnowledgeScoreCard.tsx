import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, CircleDashed, Loader2, Target } from 'lucide-react';
import type { DimensionId, KnowledgeRecommendation, KnowledgeScore, TopicId } from './knowledgeInsights';

const DIMENSIONS: DimensionId[] = ['coverage', 'depth', 'exploitable', 'freshness', 'alignment'];
const TOPICS: TopicId[] = ['offer', 'pricing', 'objections', 'compliance', 'process', 'faq', 'arguments'];
const LEVEL_TONES = ['text-red-600', 'text-orange-600', 'text-amber-600', 'text-emerald-600', 'text-emerald-700'];

export interface ScoreCardActions {
  onAddDocument: () => void;
  onShowUnreadable: () => void;
  onReindex: () => void;
  onAnalyzeAll: () => void;
}

const barTone = (value: number) => (value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500');

export default function KnowledgeScoreCard({
  score,
  loading,
  error,
  gigTitle,
  actions,
  onRetry,
}: {
  score: KnowledgeScore | null;
  loading: boolean;
  error: boolean;
  gigTitle: string | null;
  actions: ScoreCardActions;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  if (!score) {
    return (
      <section className="mb-8 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {t('knowledgeBase.score.error', 'Impossible de calculer le score de la base.')}{' '}
            <button type="button" onClick={onRetry} className="font-bold underline">
              {t('knowledgeBase.score.retry', 'Réessayer')}
            </button>
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            {t('knowledgeBase.score.loading', 'Calcul du score de votre base…')}
          </p>
        )}
      </section>
    );
  }

  const levelTone = LEVEL_TONES[score.level.level - 1] || LEVEL_TONES[0];
  const recommendationAction = (r: KnowledgeRecommendation): { label: string; run: () => void } | null => {
    if (r.code === 'add_first_document' || r.code.startsWith('add_') || r.code === 'refresh_documents' || r.code === 'align_with_gig') {
      return { label: t('knowledgeBase.score.actions.add', 'Ajouter un document'), run: actions.onAddDocument };
    }
    if (r.code === 'fix_unreadable_documents') return { label: t('knowledgeBase.score.actions.showUnreadable', 'Voir les documents concernés'), run: actions.onShowUnreadable };
    if (r.code === 'index_documents') return { label: t('knowledgeBase.score.actions.reindex', 'Indexer maintenant'), run: actions.onReindex };
    if (r.code === 'analyze_documents') return { label: t('knowledgeBase.score.actions.analyze', 'Analyser maintenant'), run: actions.onAnalyzeAll };
    return null;
  };

  return (
    <section className="mb-8 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm space-y-6" aria-label={t('knowledgeBase.score.title', 'Pertinence et maturité de la base')}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-gray-900">
            <Target size={18} className="text-harx-500" />
            {t('knowledgeBase.score.title', 'Pertinence et maturité de la base')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {gigTitle
              ? t('knowledgeBase.score.subtitleGig', 'Ce que vos REPS et vos agents IA peuvent exploiter pour le gig « {{gig}} ».', { gig: gigTitle })
              : t('knowledgeBase.score.subtitleAll', 'Ce que vos REPS et vos agents IA peuvent exploiter, tous gigs confondus.')}
          </p>
        </div>
        {loading && <Loader2 size={16} className="animate-spin text-gray-400" aria-label={t('knowledgeBase.score.loading', 'Calcul du score de votre base…')} />}
      </header>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 p-5 text-center">
          <p className={`text-6xl font-black tabular-nums ${levelTone}`}>
            {score.score}
            <span className="text-xl text-gray-400">/100</span>
          </p>
          <p className={`mt-2 text-sm font-black uppercase tracking-wide ${levelTone}`}>
            {t('knowledgeBase.score.level', 'Niveau {{level}}/5', { level: score.level.level })} · {t(`knowledgeBase.score.levels.${score.level.id}`, score.level.id)}
          </p>
          <div className="mt-3 flex gap-1" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`h-2 w-8 rounded-full ${n <= score.level.level ? 'bg-harx-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          {score.nextLevel ? (
            <p className="mt-3 text-xs text-gray-500">
              {t('knowledgeBase.score.next', 'Pour le niveau {{level}} : {{points}} points', { level: score.nextLevel.level, points: score.nextLevel.pointsToGo })}
              {score.nextLevel.missingTopics.length > 0 &&
                ` ${t('knowledgeBase.score.nextTopics', 'et documenter : {{topics}}', {
                  topics: score.nextLevel.missingTopics.map((id) => t(`knowledgeBase.score.topics.${id}`, id)).join(', '),
                })}`}
            </p>
          ) : (
            <p className="mt-3 text-xs text-emerald-700">{t('knowledgeBase.score.top', 'Niveau maximal atteint.')}</p>
          )}
        </div>

        <div className="space-y-3">
          {DIMENSIONS.map((id) => {
            const value = score.dimensions[id];
            if (value === null) return null;
            return (
              <div key={id}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-bold text-gray-800">{t(`knowledgeBase.score.dimensions.${id}.label`, id)}</span>
                  <span className="font-black tabular-nums text-gray-600">{value}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={t(`knowledgeBase.score.dimensions.${id}.label`, id)}>
                  <div className={`h-2 rounded-full ${barTone(value)}`} style={{ width: `${value}%` }} />
                </div>
                <p className="mt-0.5 text-[11px] text-gray-400">{t(`knowledgeBase.score.dimensions.${id}.help`, '')}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">{t('knowledgeBase.score.topicsTitle', 'Ce qu’un REP trouve dans la base')}</h4>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {TOPICS.map((id) => {
            const topic = score.topics.find((x) => x.id === id);
            const status = topic?.status || 'missing';
            const Icon = status === 'covered' ? CheckCircle2 : status === 'partial' ? CircleDashed : AlertTriangle;
            const tone = status === 'covered' ? 'text-emerald-700 bg-emerald-50' : status === 'partial' ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
            return (
              <li key={id} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${tone}`}>
                <Icon size={14} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{t(`knowledgeBase.score.topics.${id}`, id)}</span>
                <span className="text-[10px] font-semibold opacity-80">{t(`knowledgeBase.score.topicStatus.${status}`, status)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {score.recommendations.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">{t('knowledgeBase.score.recommendationsTitle', 'À faire en priorité')}</h4>
          <ol className="space-y-2">
            {score.recommendations.slice(0, 5).map((r) => {
              const action = recommendationAction(r);
              const topicLabel = r.topic ? t(`knowledgeBase.score.topics.${r.topic}`, r.topic) : '';
              return (
                <li key={`${r.code}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 p-3">
                  <p className="min-w-0 flex-1 text-sm text-gray-700">
                    {t(`knowledgeBase.score.recommendations.${r.topic ? `add.${r.topic}` : r.code}`, {
                      topic: topicLabel,
                      count: r.count ?? 0,
                      defaultValue: r.code,
                    })}
                  </p>
                  {action && (
                    <button type="button" onClick={action.run} className="shrink-0 rounded-lg border border-harx-200 px-3 py-1.5 text-xs font-bold text-harx-600 hover:bg-harx-50">
                      {action.label}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <p className="text-[11px] italic text-gray-400">
        {t('knowledgeBase.score.disclaimer', 'Estimation automatique : elle mesure la couverture et la qualité exploitable des documents (détection par mots-clés), pas l’exactitude de leur contenu.')}
      </p>
    </section>
  );
}
