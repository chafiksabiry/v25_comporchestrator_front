import React, { useState } from 'react';
import { Bot, Loader2, Send, User, CheckCircle, History, Trash2, Plus, X, ChevronDown, Sparkles, Check } from 'lucide-react';
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

  // Wizard auto-generation props
  onAutoGenerate: () => void;
  isAutoGenerateWizardActive: boolean;
  setIsAutoGenerateWizardActive: (val: boolean) => void;
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
  onAutoGenerate,
  isAutoGenerateWizardActive,
  setIsAutoGenerateWizardActive,
}) => {
  const { t } = useTranslation();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const hasValidatedScriptForGig = Object.values(validatedScriptIds).some(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden flex flex-col h-full min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header section of Chat Panel */}
      <div className="px-4 py-2.5 bg-[#111111] border-b border-neutral-800 flex items-center justify-between relative shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-[11px] font-black text-white uppercase tracking-wider">Assistant Script HARX AI</span>
        </div>

        <div className="flex items-center gap-2 relative z-50">
          {selectedGigId && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onStartNewChat}
                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm active:scale-95 border border-red-500/20"
              >
                <Plus className="w-3 h-3" />
                Nouveau
              </button>

              <button
                type="button"
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`px-2.5 py-1.5 border rounded-lg font-black text-[9px] uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm active:scale-95 ${
                  isHistoryOpen 
                    ? 'bg-neutral-800 text-white border-neutral-700' 
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                <History className="w-3 h-3 text-red-500" />
                Scripts ({savedScripts.length})
                <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isHistoryOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}

          <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
            En ligne
          </span>

          {/* Floating Dropdown for Saved Scripts */}
          {isHistoryOpen && selectedGigId && (
            <div className="absolute top-9 right-0 w-80 bg-white border border-slate-100 rounded-xl shadow-2xl p-3.5 mt-1 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[380px] overflow-y-auto">

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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50/30 via-slate-50/50 to-slate-100/40 min-h-0 custom-scrollbar">
        {messages.length === 0 && (
          isAutoGenerateWizardActive ? (
            /* Auto-Generation Wizard card */
            <div className="h-full flex items-center justify-center text-center py-6">
              <div className="max-w-xs bg-white border border-slate-100/80 rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-500 text-left">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="w-10 h-10 bg-red-50 border border-red-100 text-red-600 flex items-center justify-center rounded-xl shadow-inner shrink-0">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Générateur Automatique</h3>
                    <p className="text-[10px] text-slate-400 font-bold">Initialisez votre script en un clic</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={onAutoGenerate}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-md hover:shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-red-500/20"
                  >
                    <Sparkles className="w-4 h-4" />
                    Générer le script
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAutoGenerateWizardActive(false)}
                    className="w-full py-1.5 text-slate-400 hover:text-slate-600 font-extrabold text-[9px] uppercase tracking-wider active:scale-95 transition-all text-center"
                  >
                    Sauter et prompter manuellement
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Original empty state */
            <div className="h-full flex items-center justify-center text-center py-12">
              <div className="max-w-md space-y-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-gradient-to-br from-red-50 to-red-100/40 border border-red-200/50 text-red-600 flex items-center justify-center rounded-2xl mx-auto shadow-md animate-bounce">
                  <Bot className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <p className="font-black text-slate-900 text-lg uppercase tracking-tight">Générateur de Script conversationnel</p>
                  <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">
                    {t('scriptGenerator.chatPanel.startConversation')}
                  </p>
                </div>
              </div>
            </div>
          )
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
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center shrink-0 shadow-md border border-red-500/20">
                  <Bot className="w-5 h-5" />
                </div>
              )}
              
              <div
                className={`max-w-[85%] rounded-2xl p-5 shadow-sm text-sm leading-relaxed ${
                  isAI
                    ? 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                    : 'bg-[#111111] border border-neutral-800 text-white rounded-tr-none shadow-md'
                }`}
              >
                {isAI && (
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="text-[9px] font-black text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
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
                                En validant ce script, il remplacera et écrasera l'ancien script actif de cette mission.
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
                              validatingScriptId === scriptIdToValidate
                            }
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                              isValidated
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 animate-none'
                                : validatingScriptId === scriptIdToValidate
                                  ? 'bg-slate-50 text-slate-600 border border-slate-200 animate-pulse'
                                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 active:scale-95'
                            }`}
                          >
                            {isValidated && <CheckCircle className="w-3.5 h-3.5" />}
                            {isValidated
                              ? t('scriptGenerator.chatPanel.statusValid')
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
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 text-white flex items-center justify-center shrink-0 shadow-md">
                  <User className="w-5 h-5 text-red-500" />
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
      <form onSubmit={onSubmit} className={`border-t border-slate-100 bg-white p-3 shrink-0 transition-opacity duration-300 ${isAutoGenerateWizardActive ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2">
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
            placeholder={isAutoGenerateWizardActive ? "Choisissez une option de génération ci-dessus..." : t('scriptGenerator.chatPanel.inputPlaceholder')}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-600 transition-all text-xs bg-slate-50/30 resize-none h-[42px]"
            disabled={!selectedGigId || isSending || isAutoGenerateWizardActive}
            rows={1}
          />
          <button
            type="submit"
            disabled={!selectedGigId || !input.trim() || isSending || isAutoGenerateWizardActive}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 font-black uppercase tracking-wider text-[10px] transition-all shadow-sm active:scale-95 shrink-0 h-[42px]"
          >
            {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {t('scriptGenerator.chatPanel.send')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScriptChatPanel;
