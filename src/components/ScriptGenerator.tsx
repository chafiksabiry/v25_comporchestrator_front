import React, { useEffect, useMemo, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { ArrowLeft, Bot, Sparkles, Plus, Trash2, Loader2 } from 'lucide-react';
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

  let autoTurn: 'agent' | 'lead' = 'agent';
  return lines.map((line) => {
    const normalized = line
      .replace(/^\[[^\]]+\]\s*/, '')
      .replace(/^\[?\s*r[ée]ponse\s+du\s+candidat\s*\]?\s*:?\s*/i, '')
      .trim();
    const match = normalized.match(/^(agent|lead|candidate|client)\s*:\s*(.+)$/i);
    if (!match) {
      const inferredSide: 'agent' | 'lead' = autoTurn;
      autoTurn = autoTurn === 'agent' ? 'lead' : 'agent';
      return {
        side: inferredSide,
        label: inferredSide === 'agent' ? 'Agent' : 'Lead',
        text: normalized || line,
      };
    }
    const actor = String(match[1] || '').toLowerCase();
    const text = String(match[2] || '').trim();
    if (actor === 'agent') {
      autoTurn = 'lead';
      return { side: 'agent', label: 'Agent', text };
    }
    autoTurn = 'agent';
    return { side: 'lead', label: 'Lead', text };
  });
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
  const [currentView, setCurrentView] = useState<'chat'>('chat');

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
    const onboardingUrl = `${apiUrl}/onboarding/companies/${companyId}/onboarding`;
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
    const welcomeMsg: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: `Bonjour ! Je suis l'assistant HARX AI. 🤖\n\nJe vais vous aider à concevoir le script de vente idéal pour votre mission : **${selectedGig.title}**.\n\nJe peux générer une première version complète du script pour vous, ou vous pouvez me donner des consignes particulières (style de communication, objections spécifiques, etc.).\n\nQue souhaitez-vous faire ?`,
    };
    setMessages([welcomeMsg]);
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
    return rows.map((row) => ({
      phase: 'General',
      actor: row.side === 'agent' ? 'agent' : 'lead',
      replica: row.text,
    }));
  };

  const validateScript = async (message: ChatMessage) => {
    const key = message.scriptId || message.id;
    if (!key || validatingScriptId) return;
    const alreadyValidatedId = savedScripts.find((s) => Boolean((s as any)?.isActive))?._id;
    if (alreadyValidatedId && (!message.scriptId || String(message.scriptId) !== String(alreadyValidatedId))) {
      setError(t('scriptGenerator.scriptAlreadyValidated'));
      return;
    }
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

  const renderAssistantMessage = (messageId: string, content: string, playbook?: ChatMessage['playbook']) => {
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
    <div className="w-full py-4 min-h-[calc(100vh-100px)]">
      <div className="max-w-6xl mx-auto px-2 md:px-4 space-y-6">

        {/* Top Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-6 shadow-xl shadow-slate-900/10 border border-slate-800/50">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Script d'Appel Intelligent</h2>
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  Concevez et validez votre script de vente idéal en dialoguant avec l'IA
                </p>
              </div>
            </div>
            <button
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-extrabold rounded-2xl border border-white/10 transition-all duration-200 uppercase tracking-wider text-[10px] flex items-center gap-2"
              onClick={handleBackToOrchestrator}
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-fuchsia-500/5 rounded-full blur-2xl" />
        </div>

        {/* Selection Card */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-6 md:p-8">
          <label className="block text-xs font-black text-slate-800 uppercase tracking-widest mb-3">
            Sélectionnez une mission / Gig <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedGig?._id || ''}
            onChange={(e) => {
              const gig = gigs.find((g) => g._id === e.target.value) || null;
              setSelectedGig(gig);
            }}
            className="w-full px-5 py-4 border border-slate-200 rounded-2xl font-bold text-slate-700 bg-slate-50/50 focus:ring-4 focus:ring-slate-900/5 focus:border-slate-800 focus:bg-white transition-all text-sm outline-none cursor-pointer"
            disabled={isLoadingGigs}
          >
            <option value="">Sélectionnez un Gig...</option>
            {gigs.map((gig) => (
              <option key={gig._id} value={gig._id}>
                {gig.title || 'Untitled gig'}
              </option>
            ))}
          </select>

          {isLoadingGigs && <p className="text-xs font-bold text-slate-400 mt-3 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement des missions...</p>}
          {gigsError && <p className="text-xs font-bold text-red-500 mt-3">{gigsError}</p>}
        </div>

        {/* Unified Chat & History Dashboard */}
        {selectedGig ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Column: Saved Scripts & New Session */}
            <div className="lg:col-span-4 bg-white rounded-[2rem] border border-slate-100 shadow-xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
                    <Bot className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Scripts Enregistrés</h3>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  {savedScripts.length}
                </span>
              </div>

              <button
                onClick={handleStartNewChat}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md shadow-slate-900/10 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Nouveau Script
              </button>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {isLoadingSavedScripts ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                  </div>
                ) : savedScripts.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-100 rounded-2xl">
                    <p className="text-xs text-slate-400 font-bold">Aucun script disponible</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 px-4">Utilisez le chat pour générer votre premier script.</p>
                  </div>
                ) : (
                  savedScripts.map((script, idx) => {
                    const isScriptActive = Boolean(script?.isActive);
                    return (
                      <div
                        key={script._id}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-2 group ${isScriptActive
                            ? 'bg-emerald-50/50 border-emerald-100 hover:border-emerald-200'
                            : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                          }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-black text-slate-800 truncate">Script #{savedScripts.length - idx}</p>
                            {isScriptActive && (
                              <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-full text-[7px] font-black uppercase tracking-wider shrink-0">
                                Validé
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {script.createdAt ? new Date(script.createdAt).toLocaleDateString() : 'Date inconnue'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openSavedScript(script)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-all shadow-sm"
                          >
                            Ouvrir
                          </button>
                          <button
                            onClick={() => handleDeleteSavedScript(script._id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Dynamic Conversational Chat */}
            <div className="lg:col-span-8">
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
              />
            </div>

          </div>
        ) : (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 flex items-center justify-center rounded-full mx-auto mb-4">
              <Bot className="w-8 h-8" />
            </div>
            <p className="font-extrabold text-slate-800 uppercase tracking-tight">Aucun Gig sélectionné</p>
            <p className="text-xs text-slate-400 font-bold leading-relaxed mt-1">
              Veuillez sélectionner une mission / Gig dans la liste déroulante ci-dessus pour commencer à concevoir votre script avec l'assistant.
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl shadow-sm flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-bold text-xs">!</div>
            <p className="red-700 text-xs font-bold leading-normal">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptGenerator;
