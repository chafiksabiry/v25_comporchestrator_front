import React, { useEffect, useMemo, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { ArrowLeft, Bot, Loader2, Send, Sparkles, User } from 'lucide-react';

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
}

const ScriptGenerator: React.FC = () => {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [isLoadingGigs, setIsLoadingGigs] = useState(false);
  const [gigsError, setGigsError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
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
    setSessionId(null);
    setMessages([
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `Chat prêt pour "${selectedGig.title}". Pose une question, ou demande directement un script court.`,
      },
    ]);
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
      const contextPayload = {
        app: 'HARX Script Chat',
        chatStyle: 'free_chat',
        requestedOutput: 'general_chat',
        sourceMode: 'knowledge_base',
        useKnowledgeBase: true,
        useUploadedDocuments: false,
        selectedGigId: selectedGig._id,
        selectedGigTitle: selectedGigSummary.title,
        gigSnapshot: {
          title: selectedGigSummary.title,
          description: selectedGigSummary.description,
        },
      };

      const response = await fetch(`${backendUrl}/api/ai/chat?stream=false`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedMessage,
          context: contextPayload,
          gigId: selectedGig._id,
          companyId,
          sessionId: sessionId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const body = await response.json();
      const nextSessionId = response.headers.get('X-Chat-Session-Id');
      if (nextSessionId) {
        setSessionId(nextSessionId);
      } else if (typeof body?.sessionId === 'string' && body.sessionId.trim()) {
        setSessionId(body.sessionId.trim());
      }

      const assistantText =
        body?.response ||
        body?.data?.response ||
        body?.data?.text ||
        body?.text ||
        'Je n’ai pas pu générer de réponse.';

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: String(assistantText),
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to generate response');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!selectedGigSummary) return;
    const autoPrompt = [
      'Generate a simple ready-to-use call script.',
      `Gig title: ${selectedGigSummary.title}`,
      `Gig description: ${selectedGigSummary.description}`,
      'Keep it short and practical.',
    ].join('\n');
    sendMessageToApi(autoPrompt, false);
  }, [selectedGigSummary?.title, selectedGigSummary?.description]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageToApi(input, true);
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

          {selectedGigSummary && (
            <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-xs uppercase font-semibold text-gray-500">Gig title</p>
              <p className="font-semibold text-gray-900">{selectedGigSummary.title}</p>
              <p className="text-xs uppercase font-semibold text-gray-500 mt-2">Gig description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedGigSummary.description}</p>
            </div>
          )}
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
                  {message.content}
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
