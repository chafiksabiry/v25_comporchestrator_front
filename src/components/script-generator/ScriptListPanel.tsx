import React, { useState } from 'react';
import { Sparkles, MessageSquare, Plus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type SavedScript = {
  _id: string;
  isActive?: boolean;
};

interface ScriptListPanelProps {
  selectedGigId?: string;
  isSending: boolean;
  isLoadingSavedScripts: boolean;
  savedScripts: SavedScript[];
  showGenerateButton?: boolean;
  onGenerate: (prompt?: string) => void;
  onView: (scriptId: string) => void;
  onEdit: (scriptId: string) => void;
  onDelete: (scriptId: string) => void;
}

const ScriptListPanel: React.FC<ScriptListPanelProps> = ({
  selectedGigId,
  isSending,
  isLoadingSavedScripts,
  savedScripts,
  showGenerateButton = true,
  onGenerate,
  onView,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');

  const handleGenerate = () => {
    onGenerate(prompt);
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 space-y-8">
        
        {/* Generation Area */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-harx-500/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-harx-500" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t('scriptGenerator.listPanel.generatorTitle')}</h3>
          </div>
          
          <div className="relative group">
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('scriptGenerator.listPanel.promptPlaceholder')}
              className="w-full h-32 bg-slate-50 border border-slate-200 rounded-3xl p-6 text-base font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-harx-500/10 focus:border-harx-500 transition-all resize-none shadow-inner"
              disabled={!selectedGigId || isSending}
            />
            <div className="absolute bottom-4 right-4">
              <button
                onClick={handleGenerate}
                disabled={!selectedGigId || isSending}
                className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-harx-600 hover:shadow-lg transition-all disabled:opacity-30 flex items-center gap-2"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t('scriptGenerator.listPanel.generateCockpit')}
              </button>
            </div>
          </div>
        </div>

        {/* Saved Scripts List */}
        <div className="space-y-6 pt-8 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-xl">
                <MessageSquare className="w-5 h-5 text-slate-500" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t('scriptGenerator.listPanel.savedScriptsTitle')}</h3>
            </div>
            <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase">{savedScripts.length} {t('scriptGenerator.listPanel.scriptsCount')}</span>
          </div>

          {isLoadingSavedScripts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
          ) : savedScripts.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
              <p className="text-sm font-bold text-slate-400">{t('scriptGenerator.listPanel.noScripts')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedScripts.map((item, idx) => (
                <div key={item._id} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-black text-slate-900 uppercase">{t('scriptGenerator.listPanel.scriptNumber')}{savedScripts.length - idx}</span>
                    <span
                      className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-wider ${
                        item?.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {item?.isActive ? t('scriptGenerator.listPanel.statusValidated') : t('scriptGenerator.listPanel.statusDraft')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onView(item._id)}
                      className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      {t('scriptGenerator.listPanel.openScript')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item._id)}
                      className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Loader2 size={16} className="rotate-45" /> {/* Use as cross icon if needed or import X */}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScriptListPanel;
