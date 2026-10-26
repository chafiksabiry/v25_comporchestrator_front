import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../../api/knowledgeClient';

export type TopicId = 'offer' | 'pricing' | 'objections' | 'compliance' | 'process' | 'faq' | 'arguments';
export type TopicStatus = 'covered' | 'partial' | 'missing';
export type DimensionId = 'coverage' | 'depth' | 'exploitable' | 'freshness' | 'alignment';
export type LevelId = 'starting' | 'basic' | 'operational' | 'solid' | 'reference';

export interface KnowledgeRecommendation {
  code: string;
  priority: number;
  topic?: TopicId;
  partial?: boolean;
  count?: number;
}

export interface KnowledgeScore {
  score: number;
  level: { level: number; id: LevelId };
  nextLevel: { level: number; id: LevelId; minScore: number; missingTopics: TopicId[]; pointsToGo: number } | null;
  dimensions: Record<DimensionId, number | null>;
  topics: Array<{ id: TopicId; status: TopicStatus; documents: number }>;
  documents: Array<{ id: string; quality: number; relevance: number | null; usable: boolean }>;
  stats: { documents: number; usable: number; words: number };
  recommendations: KnowledgeRecommendation[];
}

export interface GigRef {
  id: string;
  title?: string;
  description?: string;
}

export interface AgentPassage {
  documentId: string;
  title: string;
  score: number;
  content: string;
}

export async function fetchKnowledgeScores(userId: string, gigs: GigRef[]): Promise<Record<string, KnowledgeScore>> {
  const response = await apiClient.post('/rag/score', {
    userId,
    gigs: gigs.map((g) => ({ id: g.id, title: g.title, description: String(g.description || '').slice(0, 600) })),
  });
  return ((response.data as any)?.data?.scores || {}) as Record<string, KnowledgeScore>;
}

export async function searchAgentPassages(companyId: string, gigId: string | null, query: string): Promise<{ found: boolean; passages: AgentPassage[] }> {
  const token = localStorage.getItem('token');
  const response = await apiClient.post(
    '/rag/agent-search',
    { companyId, gigId: gigId || undefined, query, topK: 3 },
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
  const data = (response.data as any)?.data;
  return { found: Boolean(data?.found), passages: Array.isArray(data?.passages) ? data.passages : [] };
}

/** Scores of every gig in one call ("all" when there is no gig); re-fetched when `refreshKey` changes. */
export function useKnowledgeScores(userId: string | null, gigs: GigRef[], refreshKey: unknown) {
  const [scores, setScores] = useState<Record<string, KnowledgeScore>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const gigsKey = gigs.map((g) => g.id).join(',');
  const gigsRef = useRef(gigs);
  gigsRef.current = gigs;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    try {
      // Per gig, plus the company-level score (shown while no gig is selected).
      const [perGig, company] = await Promise.all([
        gigsRef.current.length ? fetchKnowledgeScores(userId, gigsRef.current) : Promise.resolve({}),
        fetchKnowledgeScores(userId, []),
      ]);
      setScores({ ...company, ...perGig });
    } catch (e) {
      console.error('Error loading knowledge score:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId, gigsKey]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return { scores, loading, error, reload: load };
}
