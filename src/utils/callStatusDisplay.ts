export interface StatusBadge {
  label: string;
  tone: string;
  title?: string;
}

/** Map `callOutcome` to a short label + tone for disposition pills. */
export function callOutcomeBadge(outcome: string | null | undefined): StatusBadge | null {
  if (!outcome) return null;
  const map: Record<string, StatusBadge> = {
    transaction: { label: 'Transaction', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    appointment: { label: 'RDV', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
    callback_requested: { label: 'Rappel', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    argued_interested: { label: 'Argumenté', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    refusal: { label: 'Refus', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
    not_interested: { label: 'Pas intéressé', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
    already_equipped: { label: 'Déjà équipé', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
    voicemail: { label: 'Messagerie', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    no_answer: { label: 'Non décroché', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    busy: { label: 'Occupé', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
    wrong_number: { label: 'Faux numéro', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
    fraud: { label: 'Fraude', tone: 'bg-rose-100 text-rose-800 border-rose-300' },
    too_short: { label: 'Trop court', tone: 'bg-slate-50 text-slate-500 border-slate-200' },
    connected_no_sale: { label: 'Sans suite', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
  };
  return map[outcome] || { label: outcome.replace(/_/g, ' '), tone: 'bg-slate-50 text-slate-600 border-slate-200' };
}

const PROSPECT_RUBRICS: Array<{ key: string; label: string; tone: string }> = [
  { key: 'RDV', label: 'RDV', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'A plus tard', label: 'Plus tard', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'PAS INTÉRESSÉS', label: 'Pas intéressé', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'PAS AU COURANT', label: 'Pas au courant', tone: 'bg-slate-50 text-slate-600 border-slate-200' },
  { key: 'DÉJÀ ÉQUIPÉS', label: 'Déjà équipé', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
];

/** Rubriques prospect passées — on affiche la plus pertinente (meilleur score). */
export function getProspectStatusBadge(
  aiCallScore?: Record<string, { passed?: boolean; score?: number }> | null
): StatusBadge | null {
  if (!aiCallScore) return null;

  let best: { rubric: typeof PROSPECT_RUBRICS[number]; score: number } | null = null;

  for (const rubric of PROSPECT_RUBRICS) {
    const metric = aiCallScore[rubric.key];
    if (!metric) continue;
    const passed = typeof metric.passed === 'boolean' ? metric.passed : (metric.score ?? 0) >= 50;
    if (!passed) continue;
    const score = metric.score ?? 0;
    if (!best || score >= best.score) {
      best = { rubric, score };
    }
  }

  if (!best) return null;
  return { label: best.rubric.label, tone: best.rubric.tone, title: best.rubric.key };
}

const PRIORITY_CALLOUTCOMES = new Set([
  'transaction',
  'fraud',
  'refusal',
  'voicemail',
  'no_answer',
  'busy',
  'wrong_number',
  'too_short',
]);

export type CallLike = {
  validByAI?: boolean | null;
  valid?: boolean | null;
  ai_call_status?: string | null;
  callOutcome?: string | null;
  ai_call_score?: Record<string, { passed?: boolean; score?: number }> | null;
  transaction?: { validByCompany?: boolean | null; validByAI?: boolean | null } | null;
};

export function isCallRejectedByAI(call: CallLike): boolean {
  if (call.validByAI === false || call.valid === false) return true;
  if (call.ai_call_status === 'auto_refused') return true;
  return false;
}

export function isCallApprovedByAI(call: CallLike): boolean {
  return call.validByAI === true || call.valid === true;
}

export type TranscriptEntry = {
  speaker?: string;
  text?: string;
  timestamp?: string;
  start?: string;
  end?: string;
  simulated?: boolean;
  originalSpeaker?: string;
};

type AiCallScoreWithVoice = Record<string, { passed?: boolean; score?: number; voiceAnalysis?: Record<string, unknown> }> | null | undefined;

function isAgentSpeakerLabel(label: string): boolean {
  return /agent|rep|commercial|vendeur|conseiller|seller|harx/i.test(label);
}

/** True when AI flagged fraud (including self-call). */
export function isCallFraudDetected(call: CallLike & { flags?: { fraud?: boolean; selfCall?: boolean } }): boolean {
  if (call.flags?.fraud === true || call.flags?.selfCall === true) return true;
  if (call.callOutcome === 'fraud') return true;
  const fraudScore = call.ai_call_score?.['Fraud detection']?.score;
  return typeof fraudScore === 'number' && fraudScore < 50;
}

/** Single-voice self-call: transcript Customer labels were inferred, not real. */
export function isSingleVoiceSelfCall(aiCallScore?: AiCallScoreWithVoice): boolean {
  const fraudScore = aiCallScore?.['Fraud detection']?.score;
  if (typeof fraudScore === 'number' && fraudScore >= 50) return false;

  const voiceAnalysis = aiCallScore?.['Fraud detection']?.voiceAnalysis as
    | { distinctVoices?: number; sameSpeakerSuspected?: boolean; fraudReason?: string }
    | undefined;
  if (!voiceAnalysis) return typeof fraudScore === 'number' && fraudScore < 50;

  if (voiceAnalysis.distinctVoices === 1) return true;
  if (voiceAnalysis.sameSpeakerSuspected === true) return true;
  return ['single_speaker_ai', 'same_voice_ai'].includes(String(voiceAnalysis.fraudReason || ''));
}

/** Relabel inferred Customer turns for display when audio fraud detected one voice. */
export function getDisplayTranscript(
  transcript: TranscriptEntry[] | undefined | null,
  aiCallScore?: AiCallScoreWithVoice
): TranscriptEntry[] {
  if (!transcript?.length) return [];
  if (!isSingleVoiceSelfCall(aiCallScore)) return transcript;

  return transcript.map((entry) => {
    const speaker = String(entry.speaker || '');
    if (entry.simulated || isAgentSpeakerLabel(speaker)) return entry;
    return {
      ...entry,
      originalSpeaker: entry.originalSpeaker || speaker,
      speaker: 'Voix simulée',
      simulated: true,
    };
  });
}

export function getSelfCallTranscriptNotice(
  aiCallScore?: AiCallScoreWithVoice,
  language: string = 'fr'
): string | null {
  if (!isSingleVoiceSelfCall(aiCallScore)) return null;
  return language === 'en'
    ? 'Only one human voice was detected on this recording. Customer labels in the transcript were inferred by AI and may be simulated by the same person (self-call).'
    : 'Une seule voix humaine a été détectée sur cet enregistrement. Les tours « Client » du transcript ont été inférés par l\'IA et peuvent être simulés par la même personne (auto-appel).';
}

export function isSimulatedTranscriptTurn(entry: TranscriptEntry): boolean {
  return entry.simulated === true || String(entry.speaker || '').toLowerCase().includes('simul');
}

function isEnglishLanguage(language: string): boolean {
  return String(language || '').toLowerCase().startsWith('en');
}

export function getFraudDetectedCountLabel(count: number, language: string = 'fr'): string {
  const n = Math.max(0, Math.round(count));
  if (isEnglishLanguage(language)) {
    return n === 1 ? '1 fraud detected' : `${n} frauds detected`;
  }
  return n === 1 ? '1 fraude détectée' : `${n} fraudes détectées`;
}

export function getFraudCommissionNotice(language: string = 'fr'): string {
  return isEnglishLanguage(language)
    ? 'Fraud detected — no call or transaction commission is due on this recording.'
    : 'Fraude détectée — aucune commission appel ni transaction n\'est due sur cet enregistrement.';
}

/** Bandeau global côté entreprise. */
export function getCompanyFraudGlobalWarning(count: number, language: string = 'fr'): string {
  const n = Math.max(0, Math.round(count));
  if (isEnglishLanguage(language)) {
    return n === 1
      ? '1 fraud detected on your calls. Monitor the agents involved — you may blacklist them at any time.'
      : `${n} frauds detected on your calls. Monitor the agents involved — you may blacklist them at any time.`;
  }
  return n === 1
    ? '1 fraude détectée sur vos appels. Surveillez les agents concernés — vous pouvez les blacklister à tout moment.'
    : `${n} fraudes détectées sur vos appels. Surveillez les agents concernés — vous pouvez les blacklister à tout moment.`;
}

export function getCompanyAgentFraudCountLabel(count: number, language: string = 'fr'): string {
  const n = Math.max(0, Math.round(count));
  if (isEnglishLanguage(language)) {
    return n === 1 ? '1 fraud' : `${n} frauds`;
  }
  return n === 1 ? '1 fraude' : `${n} fraudes`;
}

/** Avertissement par agent côté entreprise. */
export function getCompanyAgentFraudWarning(count: number, language: string = 'fr'): string {
  const n = Math.max(0, Math.round(count));
  if (isEnglishLanguage(language)) {
    return n === 1
      ? '1 fraud detected for this agent. You may blacklist them at any time if fraud continues.'
      : `${n} frauds detected for this agent. You may blacklist them at any time if fraud continues.`;
  }
  return n === 1
    ? '1 fraude détectée pour cet agent. Vous pouvez le blacklister à tout moment si les fraudes se poursuivent.'
    : `${n} fraudes détectées pour cet agent. Vous pouvez le blacklister à tout moment si les fraudes se poursuivent.`;
}

export function getCompanyAgentFraudSectionTitle(language: string = 'fr'): string {
  return isEnglishLanguage(language) ? 'Agents with fraud alerts' : 'Agents avec alertes fraude';
}

export type AgentFraudStat = {
  agentId: string;
  agentName: string;
  fraudCount: number;
};

export function computeAgentFraudStats<T extends CallLike>(
  calls: T[],
  resolveAgentId: (call: T) => string,
  resolveAgentName: (call: T) => string
): AgentFraudStat[] {
  const map = new Map<string, AgentFraudStat>();

  for (const call of calls) {
    if (!isCallFraudDetected(call)) continue;
    const agentId = resolveAgentId(call) || resolveAgentName(call);
    const agentName = resolveAgentName(call);
    const existing = map.get(agentId);
    if (existing) {
      existing.fraudCount += 1;
    } else {
      map.set(agentId, { agentId, agentName, fraudCount: 1 });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.fraudCount - a.fraudCount || a.agentName.localeCompare(b.agentName));
}

export const CALL_REJECTED_BADGE: StatusBadge = {
  label: 'Appel refusé',
  tone: 'bg-rose-50 text-rose-700 border-rose-200',
  title: 'L\'appel n\'a pas été validé par l\'IA — aucune transaction à traiter',
};

/** Disposition label (pills, modal) when the call itself is still valid. */
export function resolveCallDispositionStatus(call: CallLike): StatusBadge {
  const outcome = call.callOutcome;

  if (outcome && PRIORITY_CALLOUTCOMES.has(outcome)) {
    const badge = callOutcomeBadge(outcome);
    if (badge) return { ...badge, title: `Résultat appel : ${outcome}` };
  }

  const prospect = getProspectStatusBadge(call.ai_call_score);
  if (prospect) return prospect;

  const outcomeBadge = callOutcomeBadge(outcome);
  if (outcomeBadge) {
    return { ...outcomeBadge, title: `Résultat appel : ${outcome}` };
  }

  if (call.transaction?.validByAI === false) {
    return {
      label: 'Pas de vente IA',
      tone: 'bg-slate-50 text-slate-600 border-slate-200',
      title: 'L\'IA n\'a pas détecté de transaction',
    };
  }

  return {
    label: 'À confirmer',
    tone: 'bg-blue-50 text-blue-600 border-blue-200',
    title: 'En attente de validation entreprise',
  };
}

/** Transaction column — si l'appel est refusé, pas de statut prospect/transaction. */
export function resolveUnvalidatedTransactionStatus(call: CallLike): StatusBadge {
  if (call.transaction?.validByCompany === false) {
    return {
      label: 'Call refused',
      tone: 'bg-rose-50 text-rose-700 border-rose-200',
      title: 'Décision entreprise : refusé',
    };
  }

  if (isCallRejectedByAI(call)) {
    return CALL_REJECTED_BADGE;
  }

  return resolveCallDispositionStatus(call);
}
