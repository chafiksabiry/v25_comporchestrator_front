import React, { useState } from 'react';
import { Bot, Loader2, Send, User, CheckCircle, History, Trash2, Plus, X, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  
  // New props for saved scripts
  savedScripts: any[];
  isLoadingSavedScripts: boolean;
  onOpenSavedScript: (script: any) => void;
  onDeleteSavedScript: (scriptId: string) => Promise<void>;
  onStartNewChat: () => void;
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
  savedScripts,
  isLoadingSavedScripts,
  onOpenSavedScript,
  onDeleteSavedScript,
  onStartNewChat,
}) => {
  const { t } = useTranslation();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const hasValidatedScriptForGig = Object.values(validatedScriptIds).some(Boolean);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col min-h-[580px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header section of Chat Panel */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Assistant Script HARX AI</span>
        </div>

        <div className="flex items-center gap-2 relative z-50">
          {selectedGigId && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onStartNewChat}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Plus className="w-3 h-3" />
                Nouveau
              </button>

              <button
                type="button"
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`px-3.5 py-1.5 border rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  isHistoryOpen 
                    ? 'bg-slate-200 text-slate-950 border-slate-300' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <History className="w-3 h-3" />
                Scripts ({savedScripts.length})
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isHistoryOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}

          <span className="text-[10px] font-black text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-full uppercase tracking-wide">
            En ligne
          </span>

          {/* Floating Dropdown for Saved Scripts */}
          {isHistoryOpen && selectedGigId && (
            <div className="absolute top-10 right-0 w-80 bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 mt-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[420px] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Scripts enregistrés</span>
                <button 
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {isLoadingSavedScripts ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                  </div>
                ) : savedScripts.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-100 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold">Aucun script disponible</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5 px-2">Validez un script pour le sauvegarder ici.</p>
                  </div>
                ) : (
                  savedScripts.map((script, idx) => {
                    const isScriptActive = Boolean(script?.isActive);
                    return (
                      <div
                        key={script._id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 group ${
                          isScriptActive
                            ? 'bg-emerald-50/40 border-emerald-100/60 hover:border-emerald-200'
                            : 'bg-slate-50 border-slate-100/60 hover:border-slate-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-black text-slate-800 truncate">Script #{savedScripts.length - idx}</p>
                            {isScriptActive && (
                              <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[6px] font-black uppercase tracking-wider shrink-0">
                                Validé
                              </span>
                            )}
                          </div>
                          <p className="text-[8px] text-slate-400 font-semibold mt-0.5">
                            {script.createdAt ? new Date(script.createdAt).toLocaleDateString() : 'Date inconnue'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onOpenSavedScript(script);
                              setIsHistoryOpen(false);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-all shadow-sm"
                          >
                            Ouvrir
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteSavedScript(script._id);
                            }}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 h-[450px] overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white to-slate-50/50">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-center text-slate-500 py-12">
            <div className="max-w-md space-y-3">
              <div className="w-16 h-16 bg-slate-100 text-slate-500 flex items-center justify-center rounded-full mx-auto shadow-sm animate-pulse">
                <Bot className="w-8 h-8" />
              </div>
              <p className="font-extrabold text-slate-800 text-lg uppercase tracking-tight">Générateur de Script conversationnel</p>
              <p className="text-sm text-slate-400 font-bold leading-relaxed">
                {t('scriptGenerator.chatPanel.startConversation')}
              </p>
            </div>
          </div>
        )}
        
        {messages.map((message) => {
          const isAI = message.role === 'assistant';
          const isWelcome = message.id.startsWith('welcome-');
          const scriptIdToValidate = message.scriptId || message.id;
          const isValidated = validatedScriptIds[scriptIdToValidate];

          return (
            <div
              key={message.id}
              className={`flex items-start gap-3.5 ${
                isAI ? 'justify-start' : 'justify-end'
              } animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {isAI && (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
              )}
              
              <div
                className={`max-w-[85%] rounded-[1.8rem] p-5 shadow-sm text-sm leading-relaxed ${
                  isAI
                    ? 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                    : 'bg-slate-900 text-white rounded-tr-none shadow-lg'
                }`}
              >
                {isAI && (
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="text-[9px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      HARX AI
                    </span>
                  </div>
                )}
                
                <div className="whitespace-pre-wrap font-bold text-slate-700 leading-relaxed">
                  {isAI ? (
                    <div className="space-y-4">
                      {renderAssistantMessage(message.id, message.content, message.playbook)}
                      
                      {/* Validate Script Button inside Assistant Balloon (for non-welcome messages) */}
                      {!isWelcome && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            {hasValidatedScriptForGig && !isValidated ? (
                              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 font-bold leading-normal">
                                {t('scriptGenerator.chatPanel.alreadyValidatedWarning')}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 font-semibold">
                                Validez ce script pour l'activer sur vos appels.
                              </p>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => onValidateScript(message)}
                            disabled={
                              Boolean(isValidated) ||
                              validatingScriptId === scriptIdToValidate ||
                              (hasValidatedScriptForGig && !isValidated)
                            }
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                              isValidated
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 animate-none'
                                : hasValidatedScriptForGig
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                  : validatingScriptId === scriptIdToValidate
                                    ? 'bg-slate-50 text-slate-600 border border-slate-200 animate-pulse'
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 active:scale-95'
                            }`}
                          >
                            {isValidated && <CheckCircle className="w-3.5 h-3.5" />}
                            {isValidated
                              ? t('scriptGenerator.chatPanel.statusValid')
                              : hasValidatedScriptForGig
                                ? t('scriptGenerator.chatPanel.statusValidationBlocked')
                                : validatingScriptId === scriptIdToValidate
                                  ? t('scriptGenerator.chatPanel.statusValidating')
                                  : t('scriptGenerator.chatPanel.validateScript')}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-white font-bold">{message.content}</span>
                  )}
                </div>
              </div>

              {!isAI && (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-start gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center shrink-0 shadow-md">
              <Bot className="w-5 h-5 animate-bounce" />
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white px-5 py-3 text-xs font-bold text-slate-500 flex items-center gap-2 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
              {t('scriptGenerator.chatPanel.generatingScript')}
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={onSubmit} className="border-t border-slate-100 bg-white p-5">
        <div className="flex items-center gap-3">
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isSending && selectedGigId) {
                  onSubmit(e as any);
                }
              }
            }}
            placeholder={t('scriptGenerator.chatPanel.inputPlaceholder')}
            className="flex-1 px-5 py-3.5 border border-slate-200 rounded-2xl font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-800 transition-all text-sm bg-slate-50/50 resize-none"
            disabled={!selectedGigId || isSending}
            rows={2}
          />
          <button
            type="submit"
            disabled={!selectedGigId || !input.trim() || isSending}
            className="px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 font-black uppercase tracking-widest text-xs transition-all shadow-md shadow-slate-900/10 active:scale-95 shrink-0 h-[56px]"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {t('scriptGenerator.chatPanel.send')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScriptChatPanel;
