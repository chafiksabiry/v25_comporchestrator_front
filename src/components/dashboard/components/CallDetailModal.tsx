import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, MessageSquare, Activity as ActivityIcon, Globe, ShieldAlert, ShieldCheck,
  TrendingUp, Star, Clock, Phone, CreditCard, Check, Brain, Calendar,
} from 'lucide-react';
import { PremiumAudioPlayer } from './PremiumAudioPlayer';
import { useTranslation } from 'react-i18next';
import { isCallRejectedByAI, isCallFraudDetected, isCallVoicemail, resolveUnvalidatedTransactionStatus, getDisplayTranscript, getFraudCommissionNotice, getCompanyAgentFraudWarning, getSelfCallTranscriptNotice, isSimulatedTranscriptTurn, getVoicemailCallNotice } from '../../../utils/callStatusDisplay';

export interface NormalizedCall {
  id: string;
  leadName: string;
  agentName?: string;
  status?: string;
  createdAt: string;
  recording_url?: string | null;
  recording_url_cloudinary?: string | null;
  transcript?: { speaker: string; text: string; timestamp?: string }[];
  ai_call_score?: Record<string, { passed?: boolean; score?: number }> | null;
  ai_summary_en?: string;
  ai_summary_fr?: string;
  validByAI?: boolean | null;
  callOutcome?: string | null;
  flags?: { fraud?: boolean; selfCall?: boolean };
  transaction?: { validByCompany?: boolean | null; validByAI?: boolean | null };
}

/** L'entreprise peut valider/refuser dès que l'appel est analysé (transaction optionnelle). */
export function companyTransactionCanValidate(
  call: { validByAI?: boolean | null; status?: string },
  transaction?: { validByAI?: boolean | null; validByCompany?: boolean | null } | null
): boolean {
  if (transaction?.validByCompany === true) return false;
  if (call.status?.toLowerCase() !== 'completed') return false;
  return call.validByAI === true;
}

/** @deprecated alias */
export function companyTransactionNeedsValidation(
  transaction?: { validByAI?: boolean | null; validByCompany?: boolean | null } | null
): boolean {
  return !!transaction && transaction.validByCompany !== true;
}

interface Props {
  call: NormalizedCall;
  agentFraudCount?: number;
  onClose: () => void;
  onAnalyze?: (callId: string) => void;
  analyzingCallId?: string | null;
  analysisError?: string | null;
  onValidateTransaction?: (callId: string, current: boolean | null, next: boolean) => void;
}

export default function CallDetailModal({ call, agentFraudCount = 0, onClose, onAnalyze, analyzingCallId, analysisError, onValidateTransaction }: Props) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'transcript' | 'insights'>('transcript');
  const isFraud = isCallFraudDetected(call);
  const isVoicemail = isCallVoicemail(call);

  const recordingUrl = call.recording_url_cloudinary || call.recording_url;
  const finalUrl = recordingUrl
    ? (recordingUrl.includes('twilio.com') && !recordingUrl.endsWith('.mp3') ? `${recordingUrl}.mp3` : recordingUrl)
    : null;

  const colorMap: Record<string, { bg: string; text: string; bgBar: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bgBar: 'bg-emerald-500' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    bgBar: 'bg-blue-500'    },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',    bgBar: 'bg-rose-500'    },
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  bgBar: 'bg-indigo-500'  },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   bgBar: 'bg-amber-500'   },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  bgBar: 'bg-violet-500'  },
  };

  const primaryMetrics = [
    { label: t('calls.metrics.fluency', 'Agent Fluency'),         key: 'Agent fluency',       icon: Globe,       color: 'emerald' },
    { label: t('calls.metrics.sentiment', 'Sentiment Analysis'),  key: 'Sentiment analysis',  icon: ActivityIcon,color: 'blue'    },
    { label: t('calls.metrics.fraud', 'Fraud Detection'),         key: 'Fraud detection',     icon: ShieldAlert, color: 'rose'    },
    { label: t('calls.metrics.coherence', 'Script Coherence'),    key: 'Script coherence',    icon: ShieldCheck, color: 'indigo'  },
    { label: t('calls.metrics.argumentation', 'Argumentation'),   key: 'Argumentation',       icon: TrendingUp,  color: 'amber'   },
    { label: t('calls.metrics.transaction', 'Transaction Anal.'), key: 'Transaction analysis',icon: TrendingUp,  color: 'emerald' },
  ];

  const prospectMetrics = [
    { label: 'Pas intéressé',           key: 'PAS INTÉRESSÉS', icon: ShieldAlert, color: 'rose'   },
    { label: 'Pas au courant',           key: 'PAS AU COURANT', icon: Globe,       color: 'blue'   },
    { label: 'Déjà équipé / Fourni',     key: 'DÉJÀ ÉQUIPÉS',  icon: ShieldCheck, color: 'indigo' },
    { label: 'Prise de RDV',             key: 'RDV',            icon: Calendar,    color: 'emerald'},
    { label: 'À plus tard / Rappel',     key: 'A plus tard',    icon: Clock,       color: 'amber'  },
  ];

  const renderAnalysisErrorBanner = () =>
    analysisError ? (
      <div
        role="alert"
        className="w-full max-w-lg mx-auto flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium text-left"
      >
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
        <p>{analysisError}</p>
      </div>
    ) : null;

  const displayTranscript = getDisplayTranscript(call.transcript, call.ai_call_score);
  const selfCallNotice = getSelfCallTranscriptNotice(call.ai_call_score, i18n.language);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full md:max-w-5xl h-[92vh] md:h-[88vh] rounded-[24px] md:rounded-[36px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-100/80"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-4 py-4 md:px-8 md:py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex justify-between items-start md:items-center w-full md:w-auto flex-1">
            <div>
              <h2 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-widest leading-snug">
                {call.leadName || 'Call Details'}
              </h2>
              {call.agentName && (
                <p className="text-[10px] font-bold text-harx-500 uppercase tracking-widest mt-0.5">
                  {call.agentName}
                </p>
              )}
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 italic">
                {new Date(call.createdAt).toLocaleString()}
              </p>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                Call ID: {call.id}
              </span>
            </div>
            {/* Close – mobile */}
            <div className="md:hidden">
              <button onClick={onClose} className="p-2 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-all shadow-sm">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Audio player */}
          <div className="w-full md:w-auto md:flex-1 max-w-full md:max-w-md shrink-0">
            {finalUrl
              ? <PremiumAudioPlayer url={finalUrl} />
              : <div className="text-[10px] font-black text-slate-400 uppercase text-center py-2 bg-slate-100/50 rounded-xl italic">No recording</div>
            }
          </div>

          {/* Close – desktop */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button onClick={onClose} className="p-2 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-all shadow-sm">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isVoicemail && (
          <div className="px-4 md:px-8 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
            <p className="text-[11px] font-bold text-slate-700 leading-relaxed flex items-start gap-2">
              <Phone className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
              <span>{getVoicemailCallNotice(i18n.language)}</span>
            </p>
          </div>
        )}

        {isFraud && (
          <div className="px-4 md:px-8 py-4 border-b border-rose-100 bg-rose-50/60 space-y-2 shrink-0">
            <p className="text-[11px] font-bold text-rose-800 leading-relaxed">
              {getFraudCommissionNotice(i18n.language)}
            </p>
            {agentFraudCount > 0 && (
              <p className="text-[11px] font-semibold text-rose-700 leading-relaxed flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{getCompanyAgentFraudWarning(agentFraudCount, i18n.language)}</span>
              </p>
            )}
          </div>
        )}

        {/* ── Tabs + AI decision ── */}
        <div className="px-4 py-3 md:px-8 md:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap scrollbar-none pb-1 lg:pb-0">
            <button
              onClick={() => setActiveTab('transcript')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'transcript' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              <MessageSquare className="w-4 h-4" />
              Transcript
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'insights' ? 'bg-gradient-harx text-white shadow-lg shadow-harx-500/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              <ActivityIcon className="w-4 h-4" />
              AI Insights
            </button>
          </div>

          {/* AI Decision badges */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Décision de l'IA:</span>

              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-100">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Appel</span>
                {call.validByAI === true
                  ? <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100"><Check className="w-3 h-3" /></span>
                  : call.validByAI === false
                    ? <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100"><X className="w-3 h-3" /></span>
                    : <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100"><Clock className="w-3 h-3 animate-pulse" /></span>
                }
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-100">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Trans.</span>
                {call.transaction?.validByCompany === true
                  ? <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100" title="Validé par l'entreprise"><Check className="w-3 h-3" /></span>
                  : (() => {
                    const status = resolveUnvalidatedTransactionStatus(call);
                    return (
                      <span
                        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${status.tone}`}
                        title={status.title}
                      >
                        {status.label}
                      </span>
                    );
                  })()
                }
              </div>
            </div>

            {onValidateTransaction && companyTransactionCanValidate(call, call.transaction) && (
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Votre choix:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onValidateTransaction(call.id, call.transaction?.validByCompany ?? null, true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/60 hover:bg-emerald-100/60 transition-all shadow-sm text-[9px] font-black uppercase tracking-widest"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Valider
                  </button>
                  <button
                    type="button"
                    onClick={() => onValidateTransaction(call.id, call.transaction?.validByCompany ?? null, false)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200/60 hover:bg-slate-100/60 transition-all shadow-sm text-[9px] font-black uppercase tracking-widest"
                  >
                    <X className="w-3.5 h-3.5" />
                    Non signé
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50/20 custom-scrollbar">
          {activeTab === 'transcript' ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {selfCallNotice && (
                <div
                  role="alert"
                  className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium"
                >
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                  <p>{selfCallNotice}</p>
                </div>
              )}
              {displayTranscript.length > 0
                ? displayTranscript.map((entry, i) => {
                  const simulated = isSimulatedTranscriptTurn(entry);
                  const isAgent = !simulated && (entry.speaker?.toLowerCase().includes('agent') || entry.speaker === 'rep');
                  return (
                  <div key={i} className={`flex gap-4 ${isAgent || simulated ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className={`flex flex-col max-w-[75%] ${isAgent || simulated ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-center gap-2 mb-1.5 px-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${simulated ? 'text-amber-600' : 'text-slate-400'}`}>{entry.speaker}</span>
                        {entry.timestamp && <span className="text-[9px] font-bold text-slate-300">{entry.timestamp}</span>}
                      </div>
                      <div className={`px-5 py-4 rounded-3xl text-sm font-medium leading-relaxed ${simulated
                        ? 'bg-amber-50 text-amber-900 rounded-tl-none border border-amber-200 border-dashed shadow-sm'
                        : isAgent
                        ? 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm'
                        : 'bg-gradient-harx text-white rounded-tr-none shadow-lg shadow-harx-500/20'}`}>
                        {entry.text}
                      </div>
                    </div>
                  </div>
                  );
                })
                : (
                  <div className="py-10 text-center flex flex-col items-center justify-center gap-4">
                    {renderAnalysisErrorBanner()}
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Transcript not available for this call</p>
                    {onAnalyze && (
                      <button
                        onClick={() => onAnalyze(call.id)}
                        disabled={analyzingCallId === call.id}
                        className="flex items-center gap-2 px-6 py-3 bg-harx-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-harx-600 transition-all shadow-lg shadow-harx-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Brain className={`w-4 h-4 ${analyzingCallId === call.id ? 'animate-spin' : ''}`} />
                        {analyzingCallId === call.id ? 'Analyse...' : 'Analyze & Transcribe'}
                      </button>
                    )}
                  </div>
                )
              }
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-4 pb-2">
              {(!call.ai_call_score || !call.ai_call_score.overall?.score) ? (
                <div className="py-10 text-center flex flex-col items-center justify-center gap-4">
                  {renderAnalysisErrorBanner()}
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">No analysis available for this call</p>
                  {onAnalyze && (
                    <button
                      onClick={() => onAnalyze(call.id)}
                      disabled={analyzingCallId === call.id}
                      className="flex items-center gap-2 px-6 py-3 bg-harx-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-harx-600 transition-all shadow-lg shadow-harx-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Brain className={`w-4 h-4 ${analyzingCallId === call.id ? 'animate-spin' : ''}`} />
                      {analyzingCallId === call.id ? 'Analyse...' : 'Analyze & Transcribe'}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Primary metric cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {primaryMetrics.map((metric, mIdx) => {
                      const metricData = call.ai_call_score?.[metric.key];
                      const isFraud = metric.key === 'Fraud detection';
                      const raw = metricData?.score || 0;
                      const score = isFraud ? 100 - raw : raw;
                      const rawFeedback = i18n.language === 'en'
                        ? (metricData?.feedback_en || metricData?.feedback || '')
                        : (metricData?.feedback_fr || metricData?.feedback || '');
                      const theme = colorMap[metric.color];
                      return (
                        <div key={mIdx} className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                          <div>
                            <div className="flex justify-between items-start mb-4 sm:mb-6">
                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center shadow-sm shrink-0`}>
                                <metric.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                              </div>
                              <div className="text-right">
                                <span className={`text-base sm:text-lg font-black ${theme.text}`}>{score}%</span>
                                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Score</p>
                              </div>
                            </div>
                            <h5 className="text-[11px] sm:text-[12px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <span className={`w-1.5 h-3.5 ${theme.bgBar} rounded-full`} />
                              {metric.label}
                            </h5>
                          </div>
                          <div className="mt-2">
                            <div className="text-xs sm:text-[13px] font-medium text-slate-600 leading-relaxed bg-slate-50/50 rounded-xl sm:rounded-2xl p-4 border border-slate-50 group-hover:bg-white group-hover:border-slate-100 transition-all max-h-[160px] overflow-y-auto custom-scrollbar italic">
                              {rawFeedback
                                ? rawFeedback.split('"').map((part: string, i: number) =>
                                  i % 2 === 1
                                    ? <span key={i} className="bg-amber-100/50 text-amber-900 font-bold px-1 rounded border-b border-amber-200 not-italic">&quot;{part}&quot;</span>
                                    : part
                                )
                                : (i18n.language === 'en' ? 'Detailed analysis completed.' : 'Analyse détaillée terminée.')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Prospect response cards */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 px-4 pt-2">
                      <div className="h-px flex-1 bg-slate-200/60" />
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Statuts & Réponses Prospect</h5>
                      <div className="h-px flex-1 bg-slate-200/60" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {prospectMetrics.map((metric, mIdx) => {
                        const metricData = call.ai_call_score?.[metric.key];
                        if (!metricData) return null;
                        const score = metricData?.score || 0;
                        const passed = typeof metricData?.passed === 'boolean' ? metricData.passed : score >= 50;
                        const theme = colorMap[metric.color] || { bg: 'bg-slate-50', text: 'text-slate-600', bgBar: 'bg-slate-500' };
                        return (
                          <div key={mIdx} className="bg-white rounded-[24px] sm:rounded-[32px] p-5 sm:p-6 border border-slate-100 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                            <div>
                              <div className="flex justify-between items-start mb-4 sm:mb-6">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center shadow-sm shrink-0`}>
                                  <metric.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="text-right">
                                  <span className={`text-xs sm:text-sm font-black px-2.5 py-1 rounded-xl shadow-sm border border-transparent ${score >= 50 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                                    {passed ? 'Oui' : 'Non'} ({score}%)
                                  </span>
                                  <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Détecté</p>
                                </div>
                              </div>
                              <h5 className="text-[11px] sm:text-[12px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className={`w-1.5 h-3.5 ${theme.bgBar} rounded-full`} />
                                {metric.label}
                              </h5>
                            </div>
                            <div className="mt-2">
                              <div className="text-xs sm:text-[13px] font-medium text-slate-600 leading-relaxed bg-slate-50/50 rounded-xl sm:rounded-2xl p-4 border border-slate-50 group-hover:bg-white group-hover:border-slate-100 transition-all max-h-[160px] overflow-y-auto custom-scrollbar italic">
                                {metricData?.feedback
                                  ? metricData.feedback.split('"').map((part: string, i: number) =>
                                    i % 2 === 1
                                      ? <span key={i} className="bg-amber-100/50 text-amber-900 font-bold px-1 rounded border-b border-amber-200 not-italic">&quot;{part}&quot;</span>
                                      : part
                                  )
                                  : (i18n.language === 'en' ? 'No quote detected.' : 'Aucune citation détectée.')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[28px] sm:rounded-[40px] blur opacity-10 group-hover:opacity-20 transition duration-1000" />
                    <div className="relative bg-white rounded-[28px] sm:rounded-[40px] border border-emerald-100/50 shadow-2xl shadow-emerald-500/5 p-6 sm:p-10 overflow-hidden">
                      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full -mr-40 -mt-40 blur-3xl" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 sm:gap-6 mb-6">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                            <Star className="w-6 h-6 sm:w-8 sm:h-8" />
                          </div>
                          <div>
                            <h4 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-widest">Executive Summary</h4>
                            <p className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5 sm:mt-1 opacity-80">Overall AI Evaluation</p>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-slate-50 to-white rounded-[20px] sm:rounded-[32px] p-5 sm:p-8 border border-slate-100 shadow-inner">
                          <p className="text-base sm:text-xl font-bold text-slate-800 leading-relaxed italic relative">
                            <span className="absolute -left-2 -top-4 sm:-left-4 sm:-top-4 text-emerald-200 text-4xl sm:text-6xl font-serif opacity-50">&quot;</span>
                            {i18n.language === 'en'
                              ? (call.ai_summary_en || call.ai_call_score?.overall?.feedback_en || call.ai_call_score?.overall?.feedback || 'The agent demonstrated standard performance.')
                              : (call.ai_summary_fr || call.ai_call_score?.overall?.feedback_fr || call.ai_call_score?.overall?.feedback || "L'agent a fait preuve de performances standards.")}
                            <span className="text-emerald-200 text-4xl sm:text-6xl font-serif opacity-50 ml-1 leading-none align-bottom">&quot;</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-4 md:px-8 md:py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 sm:px-8 sm:py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 shrink-0"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
