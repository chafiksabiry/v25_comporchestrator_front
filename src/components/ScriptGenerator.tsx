import React, { useEffect, useMemo, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { ArrowLeft, Bot, Loader2, Send, Sparkles, User } from 'lucide-react';
import apiClient from '../api/knowledgeClient';

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
    // Some backends return a JSON string instead of parsed JSON.
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
        // Keep original text when string is not valid JSON.
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

  return lines.map((line) => {
    const normalized = line.replace(/^\[[^\]]+\]\s*/, '');
    const match = normalized.match(/^(agent|lead|candidate|client)\s*:\s*(.+)$/i);
    if (!match) {
      return { side: 'other', label: 'Script', text: line };
    }
    const actor = String(match[1] || '').toLowerCase();
    const text = String(match[2] || '').trim();
    if (actor === 'agent') return { side: 'agent', label: 'Agent', text };
    return { side: 'lead', label: 'Lead', text };
  });
};

const collectProbableLeadReplies = (rows: StyledDialogueLine[]): string[] => {
  const unique = new Set<string>();
  rows.forEach((row) => {
    if (row.side === 'lead' && row.text) {
      unique.add(row.text);
    }
  });
  return Array.from(unique).slice(0, 4);
};

const ScriptGenerator: React.FC = () => {
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
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const lastAutoGigIdRef = useRef<string | null>(null);

  const getCompanyId = () => {
    const runMode = import.meta.env.VITE_RUN_MODE || 'in-app';
    if (runMode === 'standalone') {
      // Utilise la variable d'environnement en standalone
      return import.meta.env.VITE_STANDALONE_COMPANY_ID;
    } else {
      // Utilise le cookie en in-app
      return Cookies.get('companyId');
    }
  };

  const handleBackToOrchestrator = () => {
    const event = new CustomEvent('tabChange', {
      detail: { tab: 'company-onboarding' }
    });
    window.dispatchEvent(event);
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

  useEffect(() => {
    if (!selectedGig) return;
    setMessages([]);
    setError(null);
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
    const backendUrl = import.meta.env.VITE_BACKEND_KNOWLEDGEBASE_API;
    if (!backendUrl) {
      setError('Backend API URL not configured');
      return;
    }

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
      const scriptPayload = {
        companyId,
        gig: selectedGig,
        typeClient: 'general',
        langueTon: 'simple et direct',
        contexte: trimmedMessage,
      };
      // KB API only (no training chat endpoint)
      const { data: body } = await apiClient.post('/rag/generate-script', scriptPayload);
      const assistantText =
        body?.data?.script || body?.script || body?.response || body?.data?.text || body?.text;
      const generatedScriptId =
        body?.data?.metadata?.scriptId || body?.data?.scriptId || body?.scriptId || undefined;
      const normalizedText = normalizeScriptText(assistantText);
      const assistantTextSafe =
        normalizedText || 'Je n’ai pas pu générer de réponse.';

      setMessages((prev) => [
        ...prev.filter((m) => !m.id.startsWith('assistant-pending-')),
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: assistantTextSafe,
          scriptId: generatedScriptId,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('assistant-pending-')));
      setError(err?.response?.data?.error || err?.message || 'Failed to generate response');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!selectedGigSummary || !selectedGig?._id) return;
    if (lastAutoGigIdRef.current === selectedGig._id) return;
    lastAutoGigIdRef.current = selectedGig._id;

    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-pending-${Date.now()}`,
        role: 'assistant',
        content: 'Generation automatique en cours...',
      },
    ]);

    const autoPrompt = [
      'Generate a simple ready-to-use call script.',
      `Gig title: ${selectedGigSummary.title}`,
      `Gig description: ${selectedGigSummary.description}`,
      'Keep it short and practical.',
    ].join('\n');
    sendMessageToApi(autoPrompt, false);
  }, [selectedGig?._id, selectedGigSummary?.title, selectedGigSummary?.description]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageToApi(input, true);
  };

  const validateScript = async (scriptId: string) => {
    if (!scriptId || validatingScriptId) return;
    setValidatingScriptId(scriptId);
    setError(null);
    try {
      await apiClient.put(`/scripts/${scriptId}/status`, { isActive: true });
      setValidatedScriptIds((prev) => ({ ...prev, [scriptId]: true }));
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to validate script');
    } finally {
      setValidatingScriptId(null);
    }
  };

  const renderAssistantMessage = (content: string) => {
    const rows = parseStyledDialogue(content);
    const hasStructured = rows.some((row) => row.side !== 'other');
    if (!hasStructured) {
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className="whitespace-pre-wrap text-slate-800">{content}</span>
        </div>
      );
    }
    const probableLeadReplies = collectProbableLeadReplies(rows);
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Script Dialogue</p>
          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div
                key={`${row.label}-${idx}`}
                className={`rounded-xl px-3 py-2 ${
                  row.side === 'agent'
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
                    : row.side === 'lead'
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200'
                      : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <p
                  className={`text-[11px] font-bold uppercase tracking-wide ${
                    row.side === 'agent'
                      ? 'text-blue-700'
                      : row.side === 'lead'
                        ? 'text-emerald-700'
                        : 'text-gray-600'
                  }`}
                >
                  {row.label}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800">{row.text}</p>
              </div>
            ))}
          </div>
        </div>

        {probableLeadReplies.length > 0 && (
          <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3 shadow-sm">
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-violet-700">
              Reponses probables du lead
            </p>
            <div className="grid gap-2">
              {probableLeadReplies.map((reply, index) => (
                <div
                  key={`probable-${index}`}
                  className="rounded-lg border border-violet-200 bg-white/80 px-3 py-2 text-slate-700"
                >
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                    {index + 1}
                  </span>
                  {reply}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full py-2 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-harx p-6 shadow-lg shadow-harx-500/20">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Script Chat</h2>
                <p className="text-[14px] font-medium text-white/90">
                  Simple chat based only on gig title and description
                </p>
              </div>
            </div>
            <button
              className="px-5 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-black rounded-2xl shadow-xl border border-white/20 transition-all duration-200 uppercase tracking-widest text-[10px] flex items-center gap-2"
              onClick={handleBackToOrchestrator}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Gig <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedGig?._id || ''}
            onChange={(e) => {
              const gig = gigs.find((g) => g._id === e.target.value) || null;
              setSelectedGig(gig);
            }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
            disabled={isLoadingGigs}
          >
            <option value="">Choose a gig...</option>
            {gigs.map((gig) => (
              <option key={gig._id} value={gig._id}>
                {gig.title || 'Untitled gig'}
              </option>
            ))}
          </select>

          {isLoadingGigs && <p className="text-sm text-gray-500 mt-2">Loading gigs...</p>}
          {gigsError && <p className="text-sm text-red-600 mt-2">{gigsError}</p>}

        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
          <div
            ref={messagesContainerRef}
            className="h-[420px] overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-white to-gray-50"
          >
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-center text-gray-500">
                <div>
                  <Bot className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Select a gig and start chatting.</p>
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-harx-100 text-harx-600 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="space-y-3">
                      {renderAssistantMessage(message.content)}
                      {message.scriptId && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => validateScript(message.scriptId as string)}
                            disabled={Boolean(validatedScriptIds[message.scriptId]) || validatingScriptId === message.scriptId}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {validatedScriptIds[message.scriptId]
                              ? 'Script valide'
                              : validatingScriptId === message.scriptId
                                ? 'Validation...'
                                : 'Valider le script'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Writing script reply...
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for a script line, opening, objection answer..."
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                disabled={!selectedGig || isSending}
              />
              <button
                type="submit"
                disabled={!selectedGig || !input.trim() || isSending}
                className="px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptGenerator; 
