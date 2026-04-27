import React from 'react';
import { Bot, Loader2, Send, User } from 'lucide-react';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  scriptId?: string;
  playbook?: any;
};

interface ScriptChatPanelProps {
  messages: ChatMessage[];
  input: string;
  isSending: boolean;
  validatingScriptId: string | null;
  validatedScriptIds: Record<string, boolean>;
  selectedGigId?: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onValidateScript: (message: ChatMessage) => Promise<void>;
  renderAssistantMessage: (messageId: string, content: string, playbook?: any) => React.ReactNode;
}

const ScriptChatPanel: React.FC<ScriptChatPanelProps> = ({
  messages,
  input,
  isSending,
  validatingScriptId,
  validatedScriptIds,
  selectedGigId,
  onInputChange,
  onSubmit,
  onValidateScript,
  renderAssistantMessage,
}) => {
  const hasValidatedScriptForGig = Object.values(validatedScriptIds).some(Boolean);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-[420px] overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-white to-gray-50">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-center text-gray-500">
            <div>
              <Bot className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Commencez la conversation pour generer le script.</p>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-harx-100 text-harx-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${message.role === 'user' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
              {message.role === 'assistant' ? (
                <div className="space-y-3">
                  {renderAssistantMessage(message.id, message.content, message.playbook)}
                  {hasValidatedScriptForGig && !validatedScriptIds[message.scriptId || message.id] && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                      Un script est deja valide pour ce gig.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onValidateScript(message)}
                    disabled={
                      Boolean(validatedScriptIds[message.scriptId || message.id]) ||
                      validatingScriptId === (message.scriptId || message.id) ||
                      (hasValidatedScriptForGig && !validatedScriptIds[message.scriptId || message.id])
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {validatedScriptIds[message.scriptId || message.id]
                      ? 'Script valide'
                      : hasValidatedScriptForGig
                        ? 'Validation bloquee'
                      : validatingScriptId === (message.scriptId || message.id)
                        ? 'Validation...'
                        : 'Valider le script'}
                  </button>
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
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 flex items-center gap-2 w-fit shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
            Generating professional script...
          </div>
        )}
      </div>
      <form onSubmit={onSubmit} className="border-t border-gray-200 bg-white">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Ask for a script line, opening, objection answer..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              disabled={!selectedGigId || isSending}
            />
            <button
              type="submit"
              disabled={!selectedGigId || !input.trim() || isSending}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ScriptChatPanel;
