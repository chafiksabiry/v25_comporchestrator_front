import React, { useEffect, useMemo, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { ArrowLeft, Bot, Brain, Loader2, Pencil, Send, Sparkles, User } from 'lucide-react';
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
  playbook?: {
    dialogue?: Array<{
      role?: 'agent' | 'lead';
      text?: string;
    }>;
    leadGuidance?: Array<{
      leadLine?: string;
      suggestedAgentReplies?: string[];
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

  let autoTurn: 'agent' | 'lead' = 'agent';
  return lines.map((line) => {
    const normalized = line
      .replace(/^\[[^\]]+\]\s*/, '')
      .replace(/^\[?\s*r[ée]ponse\s+du\s+candidat\s*\]?\s*:?\s*/i, '')
      .trim();
    const match = normalized.match(/^(agent|lead|candidate|client)\s*:\s*(.+)$/i);
    if (!match) {
      // If line looks like dialogue text without label, auto-assign alternating roles.
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

const buildLeadAgentSuggestions = (rows: StyledDialogueLine[]): Record<number, string[]> => {
  const suggestions: Record<number, string[]> = {};
  const fallbackSuggestions = [
    'Merci pour votre retour. Je vous explique rapidement les points cles du poste.',
    'Tres bien, est-ce que je peux vous poser 2 questions pour confirmer votre adequation ?',
    'Parfait. Si vous etes d accord, on planifie un court entretien de suivi.',
  ];

  rows.forEach((row, idx) => {
    if (row.side !== 'lead') return;
    const nextAgentLines: string[] = [];
    for (let i = idx + 1; i < rows.length; i += 1) {
      const candidate = rows[i];
      if (candidate.side === 'lead') break;
      if (candidate.side === 'agent' && candidate.text) {
        nextAgentLines.push(candidate.text);
      }
      if (nextAgentLines.length >= 3) break;
    }
    suggestions[idx] = nextAgentLines.length > 0 ? nextAgentLines : fallbackSuggestions;
  });

  return suggestions;
};

const buildLeadAgentSuggestionsFromPlaybook = (
  rows: StyledDialogueLine[],
  playbook?: {
    leadGuidance?: Array<{
      leadLine?: string;
      suggestedAgentReplies?: string[];
    }>;
  }
): Record<number, string[]> => {
  const suggestions: Record<number, string[]> = {};
  const guidance = Array.isArray(playbook?.leadGuidance) ? playbook!.leadGuidance! : [];
  if (guidance.length === 0) return suggestions;

  rows.forEach((row, idx) => {
    if (row.side !== 'lead') return;
    const leadText = String(row.text || '').trim().toLowerCase();
    const match = guidance.find((g) => String(g?.leadLine || '').trim().toLowerCase() === leadText);
    if (match && Array.isArray(match.suggestedAgentReplies) && match.suggestedAgentReplies.length > 0) {
      suggestions[idx] = match.suggestedAgentReplies.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 4);
    }
  });

  return suggestions;
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
  const [selectedLeadOptionByTurnKey, setSelectedLeadOptionByTurnKey] = useState<Record<string, number>>({});
  const [rewritingKey, setRewritingKey] = useState<string | null>(null);
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
      const { data: body } = (await apiClient.post('/rag/generate-script', scriptPayload)) as { data: any };
      const assistantText =
        body?.data?.script || body?.script || body?.response || body?.data?.text || body?.text;
      const generatedPlaybook = body?.data?.playbook;
      const normalizedText = normalizeScriptText(assistantText);
      const assistantTextSafe =
        normalizedText || 'Je n’ai pas pu générer de réponse.';

      console.log('[ScriptGenerator] Generated script:', assistantTextSafe);
      console.log('[ScriptGenerator] Generated playbook:', generatedPlaybook);

      setMessages((prev) => [
        ...prev.filter((m) => !m.id.startsWith('assistant-pending-')),
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: assistantTextSafe,
          playbook: generatedPlaybook,
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

  const buildScriptStepsFromMessage = (message: ChatMessage): ScriptStep[] => {
    const dialogue = Array.isArray(message?.playbook?.dialogue) ? message.playbook!.dialogue! : [];
    if (dialogue.length > 0) {
      return dialogue
        .map((row) => ({
          phase: 'Dialogue',
          actor: row?.role === 'lead' ? 'lead' : 'agent',
          replica: String(row?.text || '').trim(),
        }))
        .filter((row) => row.replica);
    }

    const rows = parseStyledDialogue(String(message?.content || ''));
    return rows
      .filter((r) => r.text)
      .map((r) => ({
        phase: 'Dialogue',
        actor: r.side === 'lead' ? 'lead' : 'agent',
        replica: String(r.text || '').trim(),
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
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to validate script');
    } finally {
      setValidatingScriptId(null);
    }
  };

  const rewriteLineWithPrompt = async (line: string, role: 'agent' | 'lead', prompt: string): Promise<string> => {
    const companyId = getCompanyId();
    if (!companyId || !selectedGig) return line;
    const rewritePrompt = [
      'Rewrite exactly one dialogue line.',
      `Role: ${role === 'agent' ? 'Agent' : 'Lead'}`,
      `Original line: ${line}`,
      `Instruction: ${prompt}`,
      'Return ONLY one line with the same role prefix format:',
      role === 'agent' ? 'Agent: ...' : 'Lead: ...',
    ].join('\n');

    const scriptPayload = {
      companyId,
      gig: selectedGig,
      typeClient: 'general',
      langueTon: 'simple et direct',
      contexte: rewritePrompt,
    };
    const { data: body } = (await apiClient.post('/rag/generate-script', scriptPayload)) as { data: any };
    const raw = String(body?.data?.script || body?.script || body?.response || body?.data?.text || body?.text || '').trim();
    const firstLine = raw.split(/\r?\n/).map((l: string) => l.trim()).find(Boolean) || '';
    const match = firstLine.match(/^(agent|lead)\s*:\s*(.+)$/i);
    if (match) return String(match[2] || '').trim() || line;
    return firstLine || line;
  };

  const applyPromptEdit = async (params: {
    messageId: string;
    turnIdx: number;
    role: 'agent' | 'lead';
    optionIdx?: number;
    prompt: string;
  }) => {
    const { messageId, turnIdx, role, optionIdx, prompt } = params;
    const key = role === 'agent' ? `${messageId}-${turnIdx}-agent` : `${messageId}-${turnIdx}-lead-${optionIdx}`;
    const safePrompt = String(prompt || '').trim();
    if (!safePrompt) return;
    setRewritingKey(key);
    setError(null);
    try {
      const targetMessage = messages.find((m) => m.id === messageId);
      const turns = Array.isArray(targetMessage?.playbook?.turns) ? targetMessage!.playbook!.turns! : [];
      const turn = turns[turnIdx];
      if (!turn) return;
      const options = Array.isArray(turn.leadOptions) ? turn.leadOptions : [];
      const selectedIdx = Number.isFinite(optionIdx as number) ? Number(optionIdx) : 0;
      const sourceLine =
        role === 'agent'
          ? String(turn.agentLine || '').trim()
          : String(options[selectedIdx]?.leadReply || '').trim();
      if (!sourceLine) return;

      const rewritten = await rewriteLineWithPrompt(sourceLine, role, safePrompt);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.playbook?.turns) return m;
          const nextTurns = m.playbook.turns.map((t, idx) => {
            if (idx !== turnIdx) return t;
            if (role === 'agent') {
              return { ...t, agentLine: rewritten };
            }
            const leadOptions = Array.isArray(t.leadOptions)
              ? t.leadOptions.map((opt, oi) => (oi === selectedIdx ? { ...opt, leadReply: rewritten } : opt))
              : t.leadOptions;
            return { ...t, leadOptions };
          });
          return { ...m, playbook: { ...m.playbook, turns: nextTurns } };
        })
      );
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to apply prompt modification');
    } finally {
      setRewritingKey(null);
    }
  };

  const applyManualEdit = (params: {
    messageId: string;
    turnIdx: number;
    role: 'agent' | 'lead';
    optionIdx?: number;
  }) => {
    const { messageId, turnIdx, role, optionIdx } = params;
    const targetMessage = messages.find((m) => m.id === messageId);
    const turns = Array.isArray(targetMessage?.playbook?.turns) ? targetMessage!.playbook!.turns! : [];
    const turn = turns[turnIdx];
    if (!turn) return;
    const options = Array.isArray(turn.leadOptions) ? turn.leadOptions : [];
    const selectedIdx = Number.isFinite(optionIdx as number) ? Number(optionIdx) : 0;
    const sourceLine =
      role === 'agent'
        ? String(turn.agentLine || '').trim()
        : String(options[selectedIdx]?.leadReply || '').trim();
    if (!sourceLine) return;

    const updated = window.prompt('Modifier la ligne:', sourceLine);
    const nextValue = String(updated || '').trim();
    if (!nextValue || nextValue === sourceLine) return;

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.playbook?.turns) return m;
        const nextTurns = m.playbook.turns.map((t, idx) => {
          if (idx !== turnIdx) return t;
          if (role === 'agent') {
            return { ...t, agentLine: nextValue };
          }
          const leadOptions = Array.isArray(t.leadOptions)
            ? t.leadOptions.map((opt, oi) => (oi === selectedIdx ? { ...opt, leadReply: nextValue } : opt))
            : t.leadOptions;
          return { ...t, leadOptions };
        });
        return { ...m, playbook: { ...m.playbook, turns: nextTurns } };
      })
    );
  };

  const renderAssistantMessage = (messageId: string, content: string, playbook?: ChatMessage['playbook']) => {
    const turns = Array.isArray(playbook?.turns) ? playbook?.turns : [];
    if (turns && turns.length > 0) {
      const byTurnId = new Map<string, number>();
      turns.forEach((turn, idx) => {
        const key = String(turn?.id || '').trim();
        if (key) byTurnId.set(key, idx);
      });

      return (
        <div className="space-y-3">
          {turns.map((_turn, turnIdx) => {
            const turn = turns[turnIdx];
            const options = Array.isArray(turn?.leadOptions) ? turn!.leadOptions!.filter((o) => o?.leadReply && o?.agentReply) : [];
            if (!turn?.agentLine || options.length === 0) return null;
            const turnKey = `${messageId}-${turnIdx}`;
            const selectedIdx = Number.isFinite(selectedLeadOptionByTurnKey[turnKey])
              ? selectedLeadOptionByTurnKey[turnKey]
              : 0;
            const safeIdx = Math.max(0, Math.min(selectedIdx, options.length - 1));
            return (
              <div key={turnKey} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Agent</p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyManualEdit({ messageId, turnIdx, role: 'agent' })}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const prompt = window.prompt('Instruction IA pour modifier cette ligne agent:');
                          if (!String(prompt || '').trim()) return;
                          await applyPromptEdit({ messageId, turnIdx, role: 'agent', prompt: String(prompt) });
                        }}
                        disabled={rewritingKey === `${messageId}-${turnIdx}-agent`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                      >
                        <Brain className="w-3 h-3" />
                        {rewritingKey === `${messageId}-${turnIdx}-agent` ? '...' : 'Edit with AI'}
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-slate-800">{String(turn.agentLine)}</p>
                </div>
                <div className="mt-2 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Choisir la reponse du lead</p>
                  <div className="grid gap-1.5">
                    {options.map((opt, optIdx) => {
                      const active = optIdx === safeIdx;
                      return (
                        <div
                          key={`${turnKey}-opt-${optIdx}`}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedLeadOptionByTurnKey((prev) => {
                              const next = { ...prev, [turnKey]: optIdx };
                              // Reset downstream choices so the flow re-aligns to the new branch.
                              Object.keys(next).forEach((k) => {
                                if (!k.startsWith(`${messageId}-`)) return;
                                const idxToken = Number(String(k).split('-').pop());
                                if (Number.isFinite(idxToken) && idxToken > turnIdx) {
                                  delete next[k];
                                }
                              });
                              return next;
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ' ') return;
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedLeadOptionByTurnKey((prev) => {
                              const next = { ...prev, [turnKey]: optIdx };
                              Object.keys(next).forEach((k) => {
                                if (!k.startsWith(`${messageId}-`)) return;
                                const idxToken = Number(String(k).split('-').pop());
                                if (Number.isFinite(idxToken) && idxToken > turnIdx) {
                                  delete next[k];
                                }
                              });
                              return next;
                            });
                          }}
                          className={`text-left rounded-lg border px-3 py-2 transition-colors cursor-pointer ${
                            active
                              ? 'border-emerald-400 bg-emerald-100 text-emerald-900'
                              : 'border-emerald-200 bg-white text-slate-700 hover:bg-emerald-50'
                          }`}
                        >
                          <span className="mr-1 text-[10px] font-bold uppercase text-emerald-700">Lead:</span>
                          {String(opt.leadReply)}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyManualEdit({ messageId, turnIdx, role: 'lead', optionIdx: safeIdx })}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit lead selectionne
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const prompt = window.prompt('Instruction IA pour modifier la reponse lead selectionnee:');
                        if (!String(prompt || '').trim()) return;
                        await applyPromptEdit({
                          messageId,
                          turnIdx,
                          role: 'lead',
                          optionIdx: safeIdx,
                          prompt: String(prompt),
                        });
                      }}
                      disabled={rewritingKey === `${messageId}-${turnIdx}-lead-${safeIdx}`}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      <Brain className="w-3 h-3" />
                      {rewritingKey === `${messageId}-${turnIdx}-lead-${safeIdx}` ? '...' : 'Edit with AI'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    const rows = parseStyledDialogue(content);
    const hasStructured = rows.some((row) => row.side !== 'other');
    if (!hasStructured) {
      return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className="whitespace-pre-wrap text-slate-800">{content}</span>
        </div>
      );
    }
    const byPlaybook = buildLeadAgentSuggestionsFromPlaybook(rows, playbook);
    const byFallback = buildLeadAgentSuggestions(rows);
    const leadAgentSuggestions: Record<number, string[]> = { ...byFallback, ...byPlaybook };
    return (
      <div className="space-y-3">
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
            {row.side === 'lead' && (
              <div className="mt-2">
                <details className="group rounded-lg border border-emerald-200 bg-white/90 px-2 py-1">
                  <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-emerald-700 flex items-center justify-between">
                    <span>Reponse agent probable</span>
                    <span className="text-emerald-600 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {(leadAgentSuggestions[idx] || []).map((suggestion, sIdx) => (
                      <div
                        key={`lead-${idx}-agent-${sIdx}`}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700"
                      >
                        <span className="mr-1 text-[10px] font-bold text-blue-700">Agent:</span>
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full py-2 animate-in fade-in duration-500 min-h-[calc(100vh-100px)]">
      <div className="max-w-5xl mx-auto space-y-4 h-[calc(100vh-120px)] flex flex-col">
        <div className="relative overflow-hidden rounded-xl bg-gradient-harx p-6 shadow-lg shadow-harx-500/20">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Call Script</h2>
                <p className="text-[14px] font-medium text-white/90">
                  Call scripts Agent/Lead
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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden relative flex-1 min-h-0">
          <div
            ref={messagesContainerRef}
            className="h-full overflow-y-auto p-5 pb-24 space-y-4 bg-gradient-to-b from-white to-gray-50"
          >
            {isSending && (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 flex items-center gap-2 w-fit shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                Generating professional script...
              </div>
            )}
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
                      {renderAssistantMessage(message.id, message.content, message.playbook)}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => validateScript(message)}
                          disabled={Boolean(validatedScriptIds[message.scriptId || message.id]) || validatingScriptId === (message.scriptId || message.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {validatedScriptIds[message.scriptId || message.id]
                            ? 'Script valide'
                            : validatingScriptId === (message.scriptId || message.id)
                              ? 'Validation...'
                              : 'Valider le script'}
                        </button>
                      </div>
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
          </div>

          <form
            onSubmit={sendMessage}
            className="absolute bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur-sm"
          >
            <div className="p-4">
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
