import React, { useEffect, useMemo, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { ArrowLeft, Bot, Sparkles, Plus, Trash2, Loader2, Briefcase, FileText, CheckCircle, Shield, Compass, BookOpen, Check, ChevronDown } from 'lucide-react';
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
  const [isGigSelectorOpen, setIsGigSelectorOpen] = useState(false);
  const [allSavedScripts, setAllSavedScripts] = useState<any[]>([]);
  const [isLoadingAllSavedScripts, setIsLoadingAllSavedScripts] = useState(true);
  const [showNewScriptSelection, setShowNewScriptSelection] = useState(false);
  const [isAutoGenerateWizardActive, setIsAutoGenerateWizardActive] = useState(true);

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

  const fetchAllSavedScriptsForGigs = async (gigsList: Gig[]) => {
    if (!gigsList || gigsList.length === 0) return;
    setIsLoadingAllSavedScripts(true);
    try {
      const allItems: any[] = [];
      for (const g of gigsList) {
        try {
          const { data } = await apiClient.get('/rag/scripts', { params: { gigId: g._id } });
          const items = Array.isArray(data?.data) ? data.data : [];
          items.forEach((item: any) => {
            allItems.push({
              ...item,
              gigTitle: g.title,
              category: g.category,
              gig: g,
            });
          });
        } catch (e) {
          console.error("Error fetching scripts for gig:", g._id, e);
        }
      }
      setAllSavedScripts(allItems);
    } catch (err) {
      console.error("Error in fetchAllSavedScriptsForGigs:", err);
    } finally {
      setIsLoadingAllSavedScripts(false);
    }
  };

  useEffect(() => {
    fetchGigs();
  }, []);

  useEffect(() => {
    if (gigs && gigs.length > 0) {
      fetchAllSavedScriptsForGigs(gigs);
    }
  }, [gigs]);

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
    setIsAutoGenerateWizardActive(true);
  };

  const handleAutoGenerateInitialScript = () => {
    setIsAutoGenerateWizardActive(false);
    sendMessageToApi("Génère un script d'appel complet pour cette mission", false);
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
      
      // If the Gig already has saved scripts, automatically load the active/first one and deactivate the wizard
      if (items.length > 0) {
        const activeItem = items.find((item: any) => item.isActive) || items[0];
        openSavedScript(activeItem);
      } else {
        setIsAutoGenerateWizardActive(true);
      }
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
    setIsAutoGenerateWizardActive(false);
  };

  const handleDeleteSavedScript = async (scriptId: string) => {
    if (!scriptId) return;
    setError(null);
    try {
      await apiClient.delete(`/rag/scripts/${scriptId}`);
      setSavedScripts((prev) => prev.filter((s) => s._id !== scriptId));
      setAllSavedScripts((prev) => prev.filter((s) => s._id !== scriptId));
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
              ? 'bg-gradient-to-r from-red-50/50 to-rose-50/40 border border-red-100/60'
              : row.side === 'lead'
                ? 'bg-gradient-to-r from-emerald-50/40 to-teal-50/30 border border-emerald-100/40'
                : 'bg-slate-50 border border-slate-100'
              }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${row.side === 'agent'
                  ? 'bg-red-100 text-red-700'
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
    <div className="w-full h-[calc(100vh-125px)] flex flex-col px-3 py-1 bg-transparent overflow-hidden">
      <div className="w-full max-w-7xl mx-auto flex flex-col h-full min-h-0 space-y-3">

        {/* Top Header Card */}
        <div className="relative overflow-hidden rounded-xl bg-[#111111] px-4 py-2.5 shadow-md border border-slate-800 shrink-0">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-inner">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-tight">Script d'Appel Intelligent</h2>
                <p className="text-[10px] font-bold text-slate-400">
                  Concevez votre script de vente idéal en dialoguant avec l'IA HARX
                </p>
              </div>
            </div>
            <button
              className="px-3 py-1.5 border border-red-600 text-red-500 hover:bg-red-600 hover:text-white font-extrabold rounded-lg transition-all duration-200 uppercase tracking-wider text-[9px] flex items-center gap-1.5 shadow-sm active:scale-95"
              onClick={handleBackToOrchestrator}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour
            </button>
          </div>
        </div>

        {/* Global Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl shadow-sm flex items-start gap-2 shrink-0">
            <div className="w-5 h-5 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-extrabold text-[10px]">!</div>
            <div>
              <p className="text-[10px] font-black text-red-800 uppercase tracking-wider">Une erreur est survenue</p>
              <p className="text-[10px] font-bold text-red-600 mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Main Work Area */}
        {selectedGig ? (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden min-h-0">
            
            {/* Left Column: Context Card & Selector */}
            <div className="lg:col-span-4 h-full flex flex-col overflow-hidden min-h-0">
              
              {/* Cohesive Sidebar Card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-4 flex flex-col h-full min-h-0 overflow-hidden">
                
                {/* Header selector group */}
                <div className="space-y-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">Mission Active</h3>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsGigSelectorOpen(!isGigSelectorOpen)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-extrabold text-slate-700 bg-slate-50/50 hover:bg-slate-100/50 focus:border-red-600 transition-all text-xs flex items-center justify-between cursor-pointer"
                      disabled={isLoadingGigs}
                    >
                      <span className="truncate">{selectedGig?.title || 'Sélectionnez un Gig...'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isGigSelectorOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isGigSelectorOpen && (
                      <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setIsGigSelectorOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-xl shadow-2xl p-1 z-[110] max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1.5 duration-150">
                          {gigs.map((gig) => (
                            <button
                              key={gig._id}
                              type="button"
                              onClick={() => {
                                setSelectedGig(gig);
                                setIsGigSelectorOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between gap-2 ${
                                selectedGig?._id === gig._id
                                  ? 'bg-red-50 text-red-600'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="truncate">{gig.title}</span>
                              {selectedGig?._id === gig._id && <Check className="w-3.5 h-3.5 shrink-0 text-red-600" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {isLoadingGigs && (
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-red-600" /> Chargement...
                    </p>
                  )}
                  {gigsError && <p className="text-[10px] font-bold text-red-500">{gigsError}</p>}
                </div>

                {/* Separator line */}
                <hr className="my-2.5 border-slate-100 shrink-0" />

                {/* Scrollable details panel */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 min-h-0 custom-scrollbar">
                  
                  {/* Category & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-red-100">
                      {selectedGig.category || 'Général'}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                      Sélectionné
                    </span>
                  </div>

                  {/* Title and context */}
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-black text-slate-900 leading-snug">{selectedGig.title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-slate-400" /> Détails de la mission
                    </p>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Long description */}
                  <div className="space-y-1">
                    <h5 className="text-[9px] font-black text-slate-800 uppercase tracking-wider">Description & Contexte</h5>
                    <div className="text-slate-600 text-[11px] font-semibold leading-relaxed whitespace-pre-line">
                      {selectedGig.description || 'Aucune description disponible.'}
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* Right Column: Interactive Chat Panel */}
            <div className="lg:col-span-8 h-full flex flex-col overflow-hidden min-h-0">
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
                onAutoGenerate={handleAutoGenerateInitialScript}
                isAutoGenerateWizardActive={isAutoGenerateWizardActive}
                setIsAutoGenerateWizardActive={setIsAutoGenerateWizardActive}
              />
            </div>

          </div>
        ) : (
          /* Empty / Onboarding state */
          <div className="max-w-3xl mx-auto py-4 px-4 flex-1 flex flex-col justify-center min-h-0 overflow-hidden w-full">
            {isLoadingAllSavedScripts ? (
              /* Sleek initial loading state */
              <div className="relative overflow-hidden bg-white border border-slate-100 rounded-2xl shadow-xl p-8 text-center flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto w-full">
                <div className="w-16 h-16 bg-red-50 border border-red-100 text-red-600 flex items-center justify-center rounded-2xl shadow-inner">
                  <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest">Initialisation du cockpit...</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Vérification de vos scripts en cours</p>
                </div>
              </div>
            ) : allSavedScripts.length > 0 && !showNewScriptSelection ? (
              /* Screen 1: Existing Scripts List Dashboard */
              <div className="relative overflow-hidden bg-white border border-slate-100 rounded-2xl shadow-xl p-5 text-center flex flex-col h-full max-h-[500px] w-full">
                
                {/* Header Row */}
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 mb-4 shrink-0">
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-md">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Vos Scripts Enregistrés</h3>
                      <p className="text-[10px] text-slate-400 font-bold">Sélectionnez un script validé ou concevez-en un nouveau</p>
                    </div>
                  </div>
                  
                  {/* Action button "+ Nouveau Script" */}
                  <button
                    onClick={() => setShowNewScriptSelection(true)}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] rounded-lg shadow-md hover:shadow-red-500/10 transition-all duration-200 uppercase tracking-wider flex items-center gap-1.5 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Nouveau Script
                  </button>
                </div>

                {isLoadingAllSavedScripts ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-red-600" />
                    <p className="text-xs font-bold text-slate-400">Chargement de vos scripts...</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar text-left">
                    {allSavedScripts.map((script) => (
                      <div
                        key={script._id}
                        className="p-3 bg-slate-50 hover:bg-red-50/10 border border-slate-200/60 hover:border-red-500 rounded-xl transition-all duration-200 flex items-center justify-between gap-4 group"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[8px] font-black uppercase tracking-widest border border-red-100">
                              {script.category || 'Général'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold">
                              Mis à jour le {new Date(script.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                            {script.isActive && (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[7px] font-extrabold uppercase tracking-widest flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                Actif
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">
                            {script.gigTitle || 'Sans titre'}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-semibold truncate">
                            {script.details || 'Aucune consigne spécifique'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedGig(script.gig);
                              openSavedScript(script);
                            }}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:border-red-500 hover:text-red-600 font-extrabold text-[9px] rounded-lg transition-all duration-200 uppercase tracking-wider shadow-sm active:scale-95 flex items-center gap-1"
                          >
                            Ouvrir
                          </button>
                          
                          <button
                            onClick={async () => {
                              if (confirm("Êtes-vous sûr de vouloir supprimer ce script ?")) {
                                await handleDeleteSavedScript(script._id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 border border-slate-200/40 hover:border-red-100"
                            title="Supprimer le script"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Screen 2: Gigs grid selection screen (for New Script, showing ONLY Gigs without scripts) */
              <div className="relative overflow-hidden bg-white border border-slate-100 rounded-2xl shadow-xl p-6 text-center space-y-5 w-full">
                
                {/* Mascot / Icon Container */}
                <div className="relative w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center mx-auto shadow-md">
                  <Bot className="w-8 h-8 text-white animate-bounce mt-0.5" />
                  <div className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-emerald-500 rounded-full border-2 border-white" />
                </div>

                {/* Informative text */}
                <div className="space-y-1.5">
                  <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-100">
                    ASSISTANT HARX AI
                  </span>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Prêt à créer votre script d'appel ?</h3>
                  <p className="text-[11px] text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">
                    Sélectionnez une de vos missions (Gigs) ci-dessous pour charger son contexte. L'assistant concevra instantanément un script de vente linéaire, ultra-performant et 100% conforme.
                  </p>
                </div>

                {/* Beautiful Clickable Grid of Gigs without scripts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                  {gigs
                    .filter((gig) => !allSavedScripts.some((s) => s.gigId === gig._id))
                    .map((gig) => (
                      <button
                        key={gig._id}
                        onClick={() => {
                          setSelectedGig(gig);
                          handleStartNewChat();
                        }}
                        className="p-3 text-left bg-slate-50 hover:bg-red-50/15 border border-slate-200/80 hover:border-red-500 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex flex-col gap-1 active:scale-[0.98] group"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="px-2 py-0.5 bg-red-50/50 text-red-600 rounded text-[8px] font-black uppercase tracking-widest border border-red-100">
                            {gig.category || 'Général'}
                          </span>
                          <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[7px] font-black uppercase tracking-widest flex items-center gap-1">
                            Nouveau
                          </span>
                        </div>
                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight mt-1 truncate w-full group-hover:text-red-600 transition-colors">
                          {gig.title}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-bold truncate w-full">
                          {gig.description || 'Détails de la mission'}
                        </p>
                      </button>
                    ))}
                  
                  {/* Fallback if all gigs already have scripts */}
                  {gigs.filter((gig) => !allSavedScripts.some((s) => s.gigId === gig._id)).length === 0 && (
                    <div className="col-span-1 sm:col-span-2 p-5 bg-slate-50 rounded-xl text-center space-y-1.5 border border-dashed border-slate-200">
                      <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Toutes vos missions ont déjà un script !</p>
                      <p className="text-[9px] text-slate-400 font-bold">Retournez à la liste des scripts pour les ouvrir et les éditer.</p>
                    </div>
                  )}
                </div>

                {/* Return to scripts list button */}
                {allSavedScripts.length > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => setShowNewScriptSelection(false)}
                      className="px-4 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 font-extrabold text-[10px] rounded-lg transition-all duration-200 uppercase tracking-wider shadow-sm active:scale-95"
                    >
                      Retour aux scripts
                    </button>
                  </div>
                )}

                {isLoadingGigs && (
                  <p className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-red-600" /> Chargement des missions...
                  </p>
                )}
                {gigsError && <p className="text-[10px] font-bold text-red-500">{gigsError}</p>}

                {/* Background Glow effects */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -ml-10 -mt-10" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mb-10" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptGenerator;
