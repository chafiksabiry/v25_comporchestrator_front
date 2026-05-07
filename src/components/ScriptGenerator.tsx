import React, { useEffect, useMemo, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { ArrowLeft, Bot, Sparkles, Plus, Trash2, Loader2, Briefcase, FileText, CheckCircle, Shield, Compass, BookOpen } from 'lucide-react';
import apiClient from '../api/knowledgeClient';
import ScriptChatPanel from './script-generator/ScriptChatPanel';
import { useTranslation } from 'react-i18next';

interface Gig {
  _id: string;
  title: string;
  description: string;
  category: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  scriptId?: string;
  playbook?: {
    dialogue?: Array<{
      role?: 'agent' | 'lead';
      text?: string;
    }>;
    turns?: Array<{
      id?: string;
      agentLine?: string;
      leadOptions?: Array<{
        leadReply?: string;
        agentReply?: string;
        nextTurnId?: string | null;
      }>;
    }>;
    title?: string;
    format?: string;
  };
}

interface ScriptStep {
  phase?: string;
  actor?: string;
  replica?: string;
}

interface StyledDialogueLine {
  side: 'agent' | 'lead' | 'other';
  label: string;
  text: string;
}

interface SavedScript {
  _id: string;
  gigId: string;
  script?: ScriptStep[];
  playbook?: ChatMessage['playbook'];
  createdAt?: string;
  isActive?: boolean;
}

const formatScriptSteps = (steps: ScriptStep[]): string => {
  const lines = steps
    .map((step: ScriptStep) => {
      const phase = String(step?.phase || '').trim();
      const actor = String(step?.actor || '').trim();
      const replica = String(step?.replica || '').trim();
      const actorLabel = actor ? actor.toUpperCase() : 'AGENT';
      if (phase && replica) return `[${phase}] ${actorLabel}: ${replica}`;
      if (replica) return `${actorLabel}: ${replica}`;
      return '';
    })
    .filter(Boolean);
  return lines.join('\n\n');
};

const normalizeScriptText = (value: any): string => {
  if (Array.isArray(value)) {
    return formatScriptSteps(value as ScriptStep[]);
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const looksLikeJson = trimmed.startsWith('[') || trimmed.startsWith('{');
    if (looksLikeJson) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return formatScriptSteps(parsed as ScriptStep[]);
        if (parsed && typeof parsed === 'object') {
          const nestedScript = (parsed as any)?.script ?? (parsed as any)?.data?.script ?? null;
          if (Array.isArray(nestedScript)) return formatScriptSteps(nestedScript as ScriptStep[]);
          if (typeof nestedScript === 'string' && nestedScript.trim()) return nestedScript.trim();
          return JSON.stringify(parsed, null, 2);
        }
      } catch {
        // Keep original text
      }
    }
    return trimmed;
  }
  return '';
};

const parseStyledDialogue = (content: string): StyledDialogueLine[] => {
  const lines = String(content || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: StyledDialogueLine[] = [];

  for (const line of lines) {
    const normalized = line
      .replace(/^\[[^\]]+\]\s*/, '')
      .replace(/^\[?\s*r[ée]ponse\s+du\s+candidat\s*\]?\s*:?\s*/i, '')
      .trim();
    const match = normalized.match(/^(agent|lead)\s*:\s*(.+)$/i);

    let currentSide: 'agent' | 'lead' | 'other' = 'other';
    let currentLabel = '';
    let currentText = line;

    if (match) {
      const actor = String(match[1] || '').toLowerCase();
      const text = String(match[2] || '').trim();
      if (actor === 'agent') {
        currentSide = 'agent';
        currentLabel = 'Agent';
        currentText = text;
      } else {
        currentSide = 'lead';
        currentLabel = 'Lead';
        currentText = text;
      }
    }

    const last = parsed[parsed.length - 1];
    if (last && last.side !== 'other' && last.side === currentSide) {
      last.text = `${last.text}\n${currentText}`;
    } else {
      parsed.push({
        side: currentSide,
        label: currentLabel,
        text: currentText,
      });
    }
  }

  return parsed;
};

const ScriptGenerator: React.FC = () => {
  const { t } = useTranslation();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [isLoadingGigs, setIsLoadingGigs] = useState(false);
  const [gigsError, setGigsError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [validatingScriptId, setValidatingScriptId] = useState<string | null>(null);
  const [validatedScriptIds, setValidatedScriptIds] = useState<Record<string, boolean>>({});
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [isLoadingSavedScripts, setIsLoadingSavedScripts] = useState(false);
  const [activeScriptMessage, setActiveScriptMessage] = useState<ChatMessage | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const getCompanyId = () => {
    const runMode = import.meta.env.VITE_RUN_MODE || 'in-app';
    if (runMode === 'standalone') {
      return import.meta.env.VITE_STANDALONE_COMPANY_ID;
    } else {
      return Cookies.get('companyId');
    }
  };

  const handleBackToOrchestrator = () => {
    const event = new CustomEvent('tabChange', {
      detail: { tab: 'company-onboarding' }
    });
    window.dispatchEvent(event);
  };

  const markOnboardingScriptStepCompleted = async () => {
    const companyId = getCompanyId();
    if (!companyId) return;

    const phaseId = Number(import.meta.env.VITE_CALL_SCRIPT_ONBOARDING_PHASE_ID || 3);
    const stepId = Number(import.meta.env.VITE_CALL_SCRIPT_ONBOARDING_STEP_ID || 10);
    const apiUrl =
      import.meta.env.VITE_COMPANY_API_URL ||
      'https://v25searchcompanywizardbackend-production.up.railway.app/api';
    const onboardingUrl = `${apiUrl}/onboarding/companies/${companyId}/onboarding/`;
    const stepUrl = `${apiUrl}/onboarding/companies/${companyId}/onboarding/phases/${phaseId}/steps/${stepId}`;

    try {
      await fetch(stepUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
    } catch (error) {
      console.error('[ScriptGenerator] Failed to mark onboarding step completed:', error);
      window.dispatchEvent(new Event('refreshOnboardingProgress'));
      return;
    }

    try {
      const response = await fetch(onboardingUrl);
      const progress = await response.json();
      const raw = (progress || {}) as Record<string, unknown>;
      const completedSteps = Array.isArray(raw?.completedSteps)
        ? [...(raw.completedSteps as number[])]
        : [];
      if (!completedSteps.includes(stepId)) completedSteps.push(stepId);
      const currentPhase = typeof raw?.currentPhase === 'number' ? (raw.currentPhase as number) : phaseId;
      const cookiePayload = { ...raw, completedSteps };
      Cookies.set('companyOnboardingProgress', JSON.stringify(cookiePayload), { expires: 7 });
      window.dispatchEvent(
        new CustomEvent('stepCompleted', {
          detail: {
            stepId,
            phaseId: currentPhase,
            status: 'completed',
            completedSteps,
          },
        })
      );
    } catch (error) {
      console.error('[ScriptGenerator] Failed to refresh onboarding progress:', error);
      window.dispatchEvent(new Event('refreshOnboardingProgress'));
    }
  };

  const fetchGigs = async () => {
    const companyId = getCompanyId();
    if (!companyId) {
      setGigsError('Company ID not found');
      return;
    }

    setIsLoadingGigs(true);
    setGigsError(null);

    try {
      const gigsApiUrl = import.meta.env.VITE_GIGS_API_URL;
      if (!gigsApiUrl) {
        throw new Error('Gigs API URL not configured');
      }

      const response = await fetch(`${gigsApiUrl}/gigs/company/${companyId}?populate=companyId`);
      if (!response.ok) {
        throw new Error(`Failed to fetch gigs: ${response.statusText}`);
      }

      const data = await response.json();
      setGigs(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      console.error('[GIGS] Error fetching gigs:', err);
      setGigsError(err.message || 'Failed to fetch gigs');
    } finally {
      setIsLoadingGigs(false);
    }
  };

  useEffect(() => {
    fetchGigs();
  }, []);

  useEffect(() => {
    const event = new CustomEvent('setGlobalBack', {
      detail: {
        label: 'Back to onboarding',
        action: handleBackToOrchestrator,
      },
    });
    window.dispatchEvent(event);
    return () => {
      window.dispatchEvent(new CustomEvent('setGlobalBack', { detail: null }));
    };
  }, []);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  // Handle start fresh conversation
  const handleStartNewChat = () => {
    if (!selectedGig) return;
    setMessages([]);
    setActiveScriptMessage(null);
    setError(null);
  };

  useEffect(() => {
    if (!selectedGig) return;
    handleStartNewChat();
    fetchSavedScripts(selectedGig._id);
  }, [selectedGig?._id]);

  const selectedGigSummary = useMemo(() => {
    if (!selectedGig) return null;
    return {
      title: selectedGig.title?.trim() || 'Untitled gig',
      description: selectedGig.description?.trim() || 'No description',
      category: selectedGig.category?.trim() || 'No category',
    };
  }, [selectedGig]);

  const sendMessageToApi = async (rawMessage: string, addUserBubble: boolean) => {
    const trimmedMessage = rawMessage.trim();
    if (!trimmedMessage || !selectedGigSummary) return;

    const companyId = getCompanyId();
    if (!companyId) {
      setError('Company ID not found');
      return;
    }

    if (addUserBubble) {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmedMessage,
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
    }
    setIsSending(true);
    setError(null);

    try {
      const currentDialogue = Array.isArray(activeScriptMessage?.playbook?.dialogue)
        ? activeScriptMessage!.playbook!.dialogue!
          .map((row) => {
            const role = row?.role === 'lead' ? 'Lead' : 'Agent';
            const text = String(row?.text || '').trim();
            return text ? `${role}: ${text}` : '';
          })
          .filter(Boolean)
          .join('\n')
        : '';
      const currentScriptText = currentDialogue || String(activeScriptMessage?.content || '').trim();
      const regenInstruction = addUserBubble
        ? [
          'Regenerate the full script from start to end.',
          'Use the current script as base and apply the user update.',
          currentScriptText ? `Current script:\n${currentScriptText}` : '',
          `User update:\n${trimmedMessage}`,
        ]
          .filter(Boolean)
          .join('\n\n')
        : trimmedMessage;

      const scriptPayload = {
        companyId,
        gig: selectedGig,
        typeClient: 'general',
        langueTon: 'simple et direct',
        contexte: regenInstruction,
        currentScript: currentScriptText || undefined,
        currentPlaybook: activeScriptMessage?.playbook || undefined,
        chatHistory: messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            role: m.role,
            content: String(m.content || '').trim(),
          }))
          .filter((m) => m.content),
      };

      const { data: body } = (await apiClient.post('/rag/generate-script', scriptPayload)) as { data: any };
      const assistantText =
        body?.data?.script || body?.script || body?.response || body?.data?.text || body?.text;
      const generatedPlaybook = body?.data?.playbook;
      const normalizedText = normalizeScriptText(assistantText);
      const assistantTextSafe = normalizedText || 'Je n’ai pas pu générer de réponse.';

      const generatedMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantTextSafe,
        playbook: generatedPlaybook,
      };

      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.id.startsWith('assistant-pending-'));
        return [...filtered, generatedMessage];
      });

      setActiveScriptMessage(generatedMessage);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to generate response');
    } finally {
      setIsSending(false);
    }
  };

  const fetchSavedScripts = async (gigId: string) => {
    if (!gigId) {
      setSavedScripts([]);
      return;
    }
    setIsLoadingSavedScripts(true);
    try {
      const { data } = (await apiClient.get('/rag/scripts', { params: { gigId } })) as { data: any };
      const items = Array.isArray(data?.data) ? data.data : [];
      setSavedScripts(items);
      const nextValidated: Record<string, boolean> = {};
      items.forEach((item: any) => {
        if (item?._id && item?.isActive) nextValidated[item._id] = true;
      });
      setValidatedScriptIds(nextValidated);
    } catch (err: any) {
      setSavedScripts([]);
      setError(err?.response?.data?.error || err?.message || 'Failed to load scripts');
    } finally {
      setIsLoadingSavedScripts(false);
    }
  };

  const openSavedScript = (item: SavedScript) => {
    const normalizedText = normalizeScriptText(item?.script);
    const message: ChatMessage = {
      id: `assistant-saved-${item._id}-${Date.now()}`,
      role: 'assistant',
      content: normalizedText || 'Saved script',
      scriptId: item._id,
      playbook: item.playbook,
    };
    setMessages([message]);
    setActiveScriptMessage(message);
    setValidatedScriptIds((prev) => ({ ...prev, [item._id]: Boolean(item?.isActive) }));
  };

  const handleDeleteSavedScript = async (scriptId: string) => {
    if (!scriptId) return;
    setError(null);
    try {
      await apiClient.delete(`/rag/scripts/${scriptId}`);
      setSavedScripts((prev) => prev.filter((s) => s._id !== scriptId));
      setValidatedScriptIds((prev) => {
        const next = { ...prev };
        delete next[scriptId];
        return next;
      });
      if (activeScriptMessage?.scriptId === scriptId) {
        handleStartNewChat();
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to delete script');
    }
  };

  const buildScriptStepsFromMessage = (message: ChatMessage): ScriptStep[] => {
    const rows = parseStyledDialogue(message.content);
    return rows
      .filter((row) => row.side === 'agent' || row.side === 'lead')
      .map((row) => ({
        phase: 'General',
        actor: row.side === 'agent' ? 'agent' : 'lead',
        replica: row.text,
      }));
  };

  const validateScript = async (message: ChatMessage) => {
    const key = message.scriptId || message.id;
    if (!key || validatingScriptId) return;
    setValidatingScriptId(key);
    setError(null);
    try {
      let savedScriptId = message.scriptId;
      if (!savedScriptId) {
        if (!selectedGig?._id) throw new Error('Gig selection is required');
        const script = buildScriptStepsFromMessage(message);
        if (!Array.isArray(script) || script.length === 0) {
          throw new Error('No dialogue to save');
        }
        const payload = {
          gigId: selectedGig._id,
          targetClient: 'general',
          language: 'simple et direct',
          details: input?.trim() || '',
          script,
          playbook: message.playbook,
          isActive: true,
        };
        const { data } = (await apiClient.post('/rag/scripts', payload)) as { data: any };
        savedScriptId = data?.data?._id || data?._id;
        if (!savedScriptId) throw new Error('Script save failed');
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, scriptId: String(savedScriptId) } : m))
        );
      } else {
        await apiClient.put(`/rag/scripts/${savedScriptId}/status`, { isActive: true });
      }
      setValidatedScriptIds((prev) => ({ ...prev, [String(savedScriptId)]: true, [message.id]: true }));
      if (selectedGig?._id) {
        fetchSavedScripts(selectedGig._id);
      }
      await markOnboardingScriptStepCompleted();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to validate script');
    } finally {
      setValidatingScriptId(null);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageToApi(input, true);
  };

  const renderAssistantMessage = (messageId: string, content: string, playbook?: any) => {
    const rows = parseStyledDialogue(content);
    const hasStructured = rows.some((row) => row.side !== 'other');
    if (!hasStructured) {
      return (
        <div className="prose max-w-none text-slate-800 leading-relaxed text-sm">
          {content}
        </div>
      );
    }

    return (
      <div className="space-y-3 mt-2">
        {rows.map((row, idx) => (
          <div
            key={`${row.label}-${idx}`}
            className={`rounded-2xl p-4 transition-all duration-200 hover:shadow-sm ${row.side === 'agent'
              ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/60'
              : row.side === 'lead'
                ? 'bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border border-emerald-100/60'
                : 'bg-slate-50 border border-slate-100'
              }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${row.side === 'agent'
                  ? 'bg-blue-100 text-blue-700'
                  : row.side === 'lead'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-700'
                  }`}
              >
                {row.side === 'agent' ? 'Agent' : row.side === 'lead' ? 'Lead' : 'Autre'}
              </span>
            </div>
            <p className="text-slate-800 text-sm font-semibold leading-relaxed mt-1.5">{row.text}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full py-6 min-h-[calc(100vh-100px)] bg-slate-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Top Header Card */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 px-8 py-8 shadow-2xl border border-slate-800/60">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-3xl bg-white/10 flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md">
                <Sparkles className="h-6 w-6 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-400/20">
                  COCKPIT DE CONCEPTION
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mt-1">Script d'Appel Intelligent</h2>
                <p className="text-xs font-bold text-slate-400 mt-0.5 leading-relaxed">
                  Concevez et validez votre script de vente idéal en dialoguant avec l'IA HARX
                </p>
              </div>
            </div>
            <button
              className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white font-extrabold rounded-2xl border border-white/10 transition-all duration-200 uppercase tracking-wider text-[11px] flex items-center justify-center gap-2.5 shadow-md active:scale-95"
              onClick={handleBackToOrchestrator}
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              Retour à l'onboarding
            </button>
          </div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-fuchsia-500/5 rounded-full blur-2xl" />
        </div>

        {/* Global Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl shadow-sm flex items-start gap-3">
            <div className="w-6 h-6 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-extrabold text-xs">!</div>
            <div>
              <p className="text-xs font-black text-red-800 uppercase tracking-wider">Une erreur est survenue</p>
              <p className="text-xs font-bold text-red-600 mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Main Work Area */}
        {selectedGig ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Context Card & Selector */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Mission Selector Card */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-6 md:p-8 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Mission Active</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Changez de Gig à tout moment</p>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={selectedGig?._id || ''}
                    onChange={(e) => {
                      const gig = gigs.find((g) => g._id === e.target.value) || null;
                      setSelectedGig(gig);
                    }}
                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl font-bold text-slate-700 bg-slate-50/50 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 focus:bg-white transition-all text-sm outline-none cursor-pointer appearance-none animate-none"
                    disabled={isLoadingGigs}
                  >
                    <option value="">Sélectionnez un Gig...</option>
                    {gigs.map((gig) => (
                      <option key={gig._id} value={gig._id}>
                        {gig.title || 'Untitled gig'}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>

                {isLoadingGigs && (
                  <p className="text-xs font-bold text-slate-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> Chargement des missions...
                  </p>
                )}
                {gigsError && <p className="text-xs font-bold text-red-500">{gigsError}</p>}
              </div>

              {/* Selected Gig Informational Details Card */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                  
                  {/* Category / Industry Badge */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                      {selectedGig.category || 'Général'}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Sélectionné
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h4 className="text-lg font-black text-slate-900 leading-snug">{selectedGig.title}</h4>
                    <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Détails de la mission
                    </p>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Long Description scrollable summary */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Description & Contexte</h5>
                    <div className="text-slate-600 text-xs font-semibold leading-relaxed max-h-48 overflow-y-auto pr-2 custom-scrollbar whitespace-pre-line">
                      {selectedGig.description || 'Aucune description disponible.'}
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Sales Compliance Checklist */}
                  <div className="space-y-3.5">
                    <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-500" /> Exigences Légales & Conseils
                    </h5>
                    
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2 text-xs font-bold text-slate-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Avis d'enregistrement obligatoire (RGPD France)</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs font-bold text-slate-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Alternance stricte : 1 réplique Agent pour 1 réplique Lead</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs font-bold text-slate-600">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>Compact et dynamique (limite totale de 8 messages)</span>
                      </li>
                    </ul>
                  </div>

                </div>
              </div>

            </div>

            {/* Right Column: Interactive Chat Panel */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <ScriptChatPanel
                  messages={messages}
                  input={input}
                  isSending={isSending}
                  validatingScriptId={validatingScriptId}
                  validatedScriptIds={validatedScriptIds}
                  selectedGigId={selectedGig?._id}
                  onInputChange={setInput}
                  onSubmit={sendMessage}
                  onValidateScript={validateScript}
                  renderAssistantMessage={renderAssistantMessage}
                  savedScripts={savedScripts}
                  isLoadingSavedScripts={isLoadingSavedScripts}
                  onOpenSavedScript={openSavedScript}
                  onDeleteSavedScript={handleDeleteSavedScript}
                  onStartNewChat={handleStartNewChat}
                />
              </div>
            </div>

          </div>
        ) : (
          /* Empty / Onboarding state */
          <div className="max-w-2xl mx-auto py-12 px-6">
            <div className="relative overflow-hidden bg-white border border-slate-100 rounded-[3rem] shadow-2xl p-8 md:p-12 text-center space-y-8">
              
              {/* Mascot / Icon Container */}
              <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20">
                <Bot className="w-12 h-12 text-white animate-bounce mt-1" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-white" />
              </div>

              {/* Informative text */}
              <div className="space-y-3">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                  ASSISTANT HARX AI
                </span>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Prêt à créer votre script d'appel ?</h3>
                <p className="text-xs text-slate-400 font-bold max-w-md mx-auto leading-relaxed">
                  Sélectionnez une de vos missions (Gigs) ci-dessous pour charger son contexte. L'assistant concevra instantanément un script de vente linéaire, ultra-performant et 100% conforme.
                </p>
              </div>

              {/* Dropdown Selector card */}
              <div className="max-w-md mx-auto p-1.5 bg-slate-50 border border-slate-200/60 rounded-3xl flex flex-col md:flex-row items-stretch gap-2 shadow-inner">
                <div className="relative flex-1">
                  <select
                    value={selectedGig?._id || ''}
                    onChange={(e) => {
                      const gig = gigs.find((g) => g._id === e.target.value) || null;
                      setSelectedGig(gig);
                    }}
                    className="w-full h-full px-5 py-4 border-0 rounded-2xl font-bold text-slate-700 bg-transparent focus:ring-0 text-sm outline-none cursor-pointer appearance-none"
                    disabled={isLoadingGigs}
                  >
                    <option value="">Sélectionnez un Gig...</option>
                    {gigs.map((gig) => (
                      <option key={gig._id} value={gig._id}>
                        {gig.title || 'Untitled gig'}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {isLoadingGigs && (
                <p className="text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> Chargement des missions...
                </p>
              )}
              {gigsError && <p className="text-xs font-bold text-red-500">{gigsError}</p>}

              {/* Background Glow effects */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -ml-10 -mt-10" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl -mr-10 -mb-10" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptGenerator;
