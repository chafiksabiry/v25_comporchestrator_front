import React, { useEffect, useMemo, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { ArrowLeft, Brain, Pencil, Sparkles } from 'lucide-react';
import apiClient from '../api/knowledgeClient';
import ScriptListPanel from './script-generator/ScriptListPanel';
import ScriptChatPanel from './script-generator/ScriptChatPanel';
import ScriptViewPage from './script-generator/ScriptViewPage';

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

interface SavedScript {
  _id: string;
  gigId: string;
  script?: ScriptStep[];
  playbook?: ChatMessage['playbook'];
  createdAt?: string;
  isActive?: boolean;
}

interface EditModalState {
  open: boolean;
  mode: 'manual' | 'ai';
  messageId: string;
  turnIdx: number;
  role: 'agent' | 'lead';
  optionIdx?: number;
  value: string;
  title: string;
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
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [isLoadingSavedScripts, setIsLoadingSavedScripts] = useState(false);
  const [activeScriptMessage, setActiveScriptMessage] = useState<ChatMessage | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'view' | 'chat'>('list');
  const [editModal, setEditModal] = useState<EditModalState>({
    open: false,
    mode: 'manual',
    messageId: '',
    turnIdx: 0,
    role: 'agent',
    value: '',
    title: 'Modifier',
  });
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

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
    setActiveScriptMessage(null);
    setCurrentView('list');
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
        chatHistory: messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            role: m.role,
            content: String(m.content || '').trim(),
          }))
          .filter((m) => m.content),
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

      const generatedMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantTextSafe,
        playbook: generatedPlaybook,
      };
      setMessages((prev) => {
        const cleanPrev = prev.filter((m) => !m.id.startsWith('assistant-pending-'));
        if (!addUserBubble) return [...cleanPrev, generatedMessage];
        // Chat message acts as regeneration command: keep user history, replace prior generated script view.
        const withoutAssistants = cleanPrev.filter((m) => m.role !== 'assistant');
        return [...withoutAssistants, generatedMessage];
      });
      setActiveScriptMessage(generatedMessage);
      setCurrentView('chat');
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('assistant-pending-')));
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
    setMessages((prev) => [...prev, message]);
    setActiveScriptMessage(message);
    setCurrentView('view');
    setValidatedScriptIds((prev) => ({ ...prev, [item._id]: Boolean(item?.isActive) }));
  };

  const handleViewSavedScript = (scriptId: string) => {
    const item = savedScripts.find((s) => s._id === scriptId);
    if (!item) return;
    openSavedScript(item);
  };

  const handleEditSavedScript = (scriptId: string) => {
    const item = savedScripts.find((s) => s._id === scriptId);
    if (!item) return;
    openSavedScript(item);
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
        setActiveScriptMessage(null);
        setCurrentView('list');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to delete script');
    }
  };

  const handleGenerateScript = async () => {
    if (!selectedGigSummary) return;
    setCurrentView('chat');
    const autoPrompt = [
      'Generate a simple ready-to-use call script.',
      `Gig title: ${selectedGigSummary.title}`,
      `Gig description: ${selectedGigSummary.description}`,
      'Keep it short and practical.',
    ].join('\n');
    await sendMessageToApi(autoPrompt, false);
  };

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
      if (selectedGig?._id) {
        fetchSavedScripts(selectedGig._id);
      }
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

  const applyManualEditWithValue = (params: {
    messageId: string;
    turnIdx: number;
    role: 'agent' | 'lead';
    optionIdx?: number;
    value: string;
  }) => {
    const { messageId, turnIdx, role, optionIdx, value } = params;
    const nextValue = String(value || '').trim();
    if (!nextValue) return;
    const selectedIdx = Number.isFinite(optionIdx as number) ? Number(optionIdx) : 0;

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

  const getSourceLine = (params: {
    messageId: string;
    turnIdx: number;
    role: 'agent' | 'lead';
    optionIdx?: number;
  }): string => {
    const { messageId, turnIdx, role, optionIdx } = params;
    const targetMessage = messages.find((m) => m.id === messageId);
    const turns = Array.isArray(targetMessage?.playbook?.turns) ? targetMessage!.playbook!.turns! : [];
    const turn = turns[turnIdx];
    if (!turn) return '';
    const options = Array.isArray(turn.leadOptions) ? turn.leadOptions : [];
    const selectedIdx = Number.isFinite(optionIdx as number) ? Number(optionIdx) : 0;
    return role === 'agent'
      ? String(turn.agentLine || '').trim()
      : String(options[selectedIdx]?.leadReply || '').trim();
  };

  const openEditModal = (params: {
    mode: 'manual' | 'ai';
    messageId: string;
    turnIdx: number;
    role: 'agent' | 'lead';
    optionIdx?: number;
  }) => {
    const source = getSourceLine(params);
    if (!source) return;
    setEditModal({
      open: true,
      mode: params.mode,
      messageId: params.messageId,
      turnIdx: params.turnIdx,
      role: params.role,
      optionIdx: params.optionIdx,
      value: params.mode === 'manual' ? source : '',
      title:
        params.mode === 'manual'
          ? 'Modifier la ligne'
          : params.role === 'agent'
            ? 'Instruction IA pour modifier la ligne agent'
            : 'Instruction IA pour modifier la reponse lead selectionnee',
    });
  };

  const submitEditModal = async () => {
    const payload = { ...editModal };
    const value = String(payload.value || '').trim();
    if (!value) return;
    if (payload.mode === 'manual') {
      applyManualEditWithValue({
        messageId: payload.messageId,
        turnIdx: payload.turnIdx,
        role: payload.role,
        optionIdx: payload.optionIdx,
        value,
      });
      setEditModal((prev) => ({ ...prev, open: false }));
      return;
    }
    await applyPromptEdit({
      messageId: payload.messageId,
      turnIdx: payload.turnIdx,
      role: payload.role,
      optionIdx: payload.optionIdx,
      prompt: value,
    });
    setEditModal((prev) => ({ ...prev, open: false }));
  };

  const renderAssistantMessage = (messageId: string, content: string, playbook?: ChatMessage['playbook']) => {
    const turns = Array.isArray(playbook?.turns) ? playbook?.turns : [];
    if (turns && turns.length > 0) {
      const normalizeLine = (text?: string) =>
        String(text || '')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim();
      const byTurnId = new Map<string, number>();
      turns.forEach((turn, idx) => {
        const key = String(turn?.id || '').trim();
        if (key) byTurnId.set(key, idx);
      });

      // Show only the active scenario branch based on selected lead options.
      const visibleTurnIndexes: number[] = [];
      const visited = new Set<number>();
      let terminalAgentReply = '';
      let cursor = 0;
      while (
        Number.isFinite(cursor) &&
        cursor >= 0 &&
        cursor < turns.length &&
        !visited.has(cursor) &&
        visibleTurnIndexes.length < 30
      ) {
        visibleTurnIndexes.push(cursor);
        visited.add(cursor);
        const turn = turns[cursor];
        const options = Array.isArray(turn?.leadOptions)
          ? turn!.leadOptions!.filter((o) => o?.leadReply && o?.agentReply)
          : [];
        if (options.length === 0) break;
        const turnKey = `${messageId}-${cursor}`;
        const selectedIdx = Number.isFinite(selectedLeadOptionByTurnKey[turnKey])
          ? selectedLeadOptionByTurnKey[turnKey]
          : 0;
        const safeIdx = Math.max(0, Math.min(selectedIdx, options.length - 1));
        const selected = options[safeIdx];
        const nextTurnId = String(selected?.nextTurnId || '').trim();
        const nextIdxFromLink = nextTurnId ? byTurnId.get(nextTurnId) : undefined;
        const selectedAgentReplyKey = normalizeLine(selected?.agentReply);
        const nextIdxFromReply =
          selectedAgentReplyKey
            ? turns.findIndex((t) => normalizeLine(t?.agentLine) === selectedAgentReplyKey)
            : -1;
        const nextIdx =
          typeof nextIdxFromLink === 'number'
            ? nextIdxFromLink
            : nextIdxFromReply >= 0
              ? nextIdxFromReply
              : options.length === 1 && cursor + 1 < turns.length
                ? cursor + 1
              : undefined;
        if (typeof nextIdx !== 'number') {
          terminalAgentReply = String(selected?.agentReply || '').trim();
          break;
        }
        cursor = nextIdx;
      }

      return (
        <div className="space-y-3">
          {visibleTurnIndexes.map((turnIdx) => {
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
                        onClick={() => openEditModal({ mode: 'manual', messageId, turnIdx, role: 'agent' })}
                        title="Edit"
                        aria-label="Edit"
                        className="inline-flex items-center justify-center w-7 h-7 text-[11px] rounded-md border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal({ mode: 'ai', messageId, turnIdx, role: 'agent' })}
                        disabled={rewritingKey === `${messageId}-${turnIdx}-agent`}
                        title="Edit with AI"
                        aria-label="Edit with AI"
                        className="inline-flex items-center justify-center w-7 h-7 text-[11px] rounded-md border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                      >
                        <Brain className="w-3 h-3" />
                        {rewritingKey === `${messageId}-${turnIdx}-agent` ? '...' : null}
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
                      onClick={() => openEditModal({ mode: 'manual', messageId, turnIdx, role: 'lead', optionIdx: safeIdx })}
                      title="Edit lead"
                      aria-label="Edit lead"
                      className="inline-flex items-center justify-center w-7 h-7 text-[11px] rounded-md border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal({ mode: 'ai', messageId, turnIdx, role: 'lead', optionIdx: safeIdx })}
                      disabled={rewritingKey === `${messageId}-${turnIdx}-lead-${safeIdx}`}
                      title="Edit lead with AI"
                      aria-label="Edit lead with AI"
                      className="inline-flex items-center justify-center w-7 h-7 text-[11px] rounded-md border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                    >
                      <Brain className="w-3 h-3" />
                      {rewritingKey === `${messageId}-${turnIdx}-lead-${safeIdx}` ? '...' : null}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {terminalAgentReply && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Agent</p>
                <p className="mt-1 text-slate-800">{terminalAgentReply}</p>
              </div>
            </div>
          )}
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
    <div className="w-full py-4 min-h-[calc(100vh-100px)]">
      <div className="max-w-6xl mx-auto px-2 md:px-4 space-y-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-harx px-6 py-5 shadow-md shadow-harx-500/20">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Call Script</h2>
                <p className="text-sm font-medium text-white/90">
                  Call scripts Agent/Lead
                </p>
              </div>
            </div>
            <button
              className="px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all duration-200 uppercase tracking-wide text-[10px] flex items-center gap-2"
              onClick={handleBackToOrchestrator}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/10 rounded-full blur-2xl" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2.5">
            Select Gig <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedGig?._id || ''}
            onChange={(e) => {
              const gig = gigs.find((g) => g._id === e.target.value) || null;
              setSelectedGig(gig);
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
            disabled={isLoadingGigs}
          >
            <option value="">Choose a gig...</option>
            {gigs.map((gig) => (
              <option key={gig._id} value={gig._id}>
                {gig.title || 'Untitled gig'}
              </option>
            ))}
          </select>

          {isLoadingGigs && <p className="text-sm text-gray-500 mt-2.5">Loading gigs...</p>}
          {gigsError && <p className="text-sm text-red-600 mt-2.5">{gigsError}</p>}
        </div>

        <ScriptListPanel
          selectedGigId={selectedGig?._id}
          isSending={isSending}
          isLoadingSavedScripts={isLoadingSavedScripts}
          savedScripts={savedScripts}
          showGenerateButton={currentView !== 'chat'}
          onGenerate={handleGenerateScript}
          onView={handleViewSavedScript}
          onEdit={handleEditSavedScript}
          onDelete={handleDeleteSavedScript}
        />

        {currentView === 'view' ? (
          <ScriptViewPage
            hasActiveScript={Boolean(activeScriptMessage)}
            content={
              activeScriptMessage ? (
                <div className="space-y-3">
                  {renderAssistantMessage(
                    activeScriptMessage.id,
                    activeScriptMessage.content,
                    activeScriptMessage.playbook
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Selectionne un script depuis la liste, ou genere un nouveau script.</p>
              )
            }
            onBackToList={() => setCurrentView('list')}
            onValidate={activeScriptMessage ? () => validateScript(activeScriptMessage) : undefined}
            validateDisabled={
              !activeScriptMessage ||
              Boolean(validatedScriptIds[activeScriptMessage.scriptId || activeScriptMessage.id]) ||
              validatingScriptId === (activeScriptMessage.scriptId || activeScriptMessage.id)
            }
            validateLabel={
              !activeScriptMessage
                ? 'Valider le script'
                : validatedScriptIds[activeScriptMessage.scriptId || activeScriptMessage.id]
                  ? 'Script valide'
                  : validatingScriptId === (activeScriptMessage.scriptId || activeScriptMessage.id)
                    ? 'Validation...'
                    : 'Valider le script'
            }
          />
        ) : currentView === 'chat' ? (
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
        ) : null}

        {editModal.open && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">{editModal.title}</p>
              </div>
              <div className="p-5 space-y-3">
                {editModal.mode === 'manual' ? (
                  <textarea
                    value={editModal.value}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, value: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Modifier la ligne..."
                  />
                ) : (
                  <input
                    type="text"
                    value={editModal.value}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, value: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Ecrire l'instruction IA..."
                  />
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModal((prev) => ({ ...prev, open: false }))}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={submitEditModal}
                    className="px-3 py-1.5 text-sm rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptGenerator; 
