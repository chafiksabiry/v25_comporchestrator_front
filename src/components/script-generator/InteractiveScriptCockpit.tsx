import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  User, 
  MessageSquare, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Square, 
  Save, 
  Sparkles,
  Check,
  Shield,
  Phone,
  Info,
  Layers,
  GraduationCap,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ScriptReminder {
  type: 'warning' | 'clock' | 'info';
  text: string;
}

export interface ScriptOption {
  id: string;
  label: string;
  subtext: string;
  recommendedResponse: string;
}

export interface ConditionalTab {
  id: string;
  label: string;
  boxTitle: string;
  boxReplica: string;
  badgeText: string;
}

export interface InteractiveStage {
  id: string;
  stepNumber: number;
  label: string;
  type: 'regulatory' | 'collection' | 'discovery' | 'presentation' | 'objection' | 'compliance' | 'closing' | 'followup';
  typeLabel: string;
  introTitle: string;
  introReplica: string;
  reminders?: ScriptReminder[];
  optionsTitle?: string;
  options?: ScriptOption[];
  checklistTitle?: string;
  checklist?: string[];
  conditionalTabs?: ConditionalTab[];
}

interface InteractiveScriptCockpitProps {
  scriptTitle: string;
  stages?: InteractiveStage[]; // Expanded rich stages
  onClose: () => void;
  onValidate?: () => void;
  isValidating?: boolean;
}

export function InteractiveScriptCockpit({ 
  scriptTitle, 
  stages = [], 
  onClose,
  onValidate,
  isValidating
}: InteractiveScriptCockpitProps) {
  const { t } = useTranslation();
  
  // Timer States
  const [seconds, setSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(true);

  // Stage Navigation States
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  // Interactive UI States
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Reset interactive states when changing stages
  useEffect(() => {
    setSelectedOptionId(null);
    if (stages[currentStageIdx]?.conditionalTabs?.length) {
      setActiveTabId(stages[currentStageIdx].conditionalTabs[0].id);
    } else {
      setActiveTabId(null);
    }
  }, [currentStageIdx, stages]);

  // Timer logic
  useEffect(() => {
    let interval: any = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    if (currentStageIdx < stages.length - 1) {
      setHistory(prev => [...prev, currentStageIdx]);
      setCurrentStageIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStageIdx > 0) {
      setCurrentStageIdx(prev => prev - 1);
    } else if (history.length > 0) {
      const lastIdx = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setCurrentStageIdx(lastIdx);
    }
  };

  const currentStage = stages[currentStageIdx];

  if (!currentStage) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 text-white">
        <div className="text-center space-y-3">
          <p className="text-sm font-black uppercase tracking-widest text-red-500 animate-pulse">Chargement du script d'appel...</p>
          <p className="text-xs text-slate-400">Génération du graphe d'étapes interactives en cours</p>
        </div>
      </div>
    );
  }

  // Define styling based on stage category type
  const getTypeColors = (type: InteractiveStage['type']) => {
    switch (type) {
      case 'regulatory':
        return { bg: 'bg-red-50 text-red-600 border-red-100', dot: 'bg-red-500' };
      case 'collection':
        return { bg: 'bg-blue-50 text-blue-600 border-blue-100', dot: 'bg-blue-500' };
      case 'discovery':
        return { bg: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-500' };
      case 'presentation':
        return { bg: 'bg-purple-50 text-purple-600 border-purple-100', dot: 'bg-purple-500' };
      case 'objection':
        return { bg: 'bg-orange-50 text-orange-600 border-orange-100', dot: 'bg-orange-500' };
      case 'compliance':
        return { bg: 'bg-indigo-50 text-indigo-600 border-indigo-100', dot: 'bg-indigo-500' };
      case 'closing':
        return { bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' };
      default:
        return { bg: 'bg-slate-50 text-slate-600 border-slate-100', dot: 'bg-slate-500' };
    }
  };

  const currentColors = getTypeColors(currentStage.type);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-2 md:p-4 overflow-hidden animate-in fade-in duration-300">
      <div className="bg-white w-full h-full max-w-5xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        
        {/* TOP STATUS NAVIGATION BAR */}
        <div className="bg-slate-50 px-6 py-4 flex flex-col space-y-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">{scriptTitle}</h2>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Timer UI */}
              <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl border border-slate-100 shadow-sm shrink-0">
                <Clock className={`w-3.5 h-3.5 ${isTimerActive ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-xs font-black text-slate-800 font-mono">{formatTime(seconds)}</span>
                <button 
                  onClick={() => setIsTimerActive(!isTimerActive)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-all"
                >
                  {isTimerActive ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                </button>
              </div>

              {/* Close Button */}
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Stepper Progress bar indicators */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex-1 flex gap-1.5">
              {stages.map((stg, idx) => (
                <div 
                  key={stg.id}
                  onClick={() => setCurrentStageIdx(idx)}
                  className={`h-1.5 rounded-full flex-1 transition-all duration-300 cursor-pointer ${
                    idx < currentStageIdx 
                      ? 'bg-red-600' 
                      : idx === currentStageIdx 
                        ? 'bg-red-500' 
                        : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] font-black text-slate-500 tracking-tight ml-3 shrink-0">
              {currentStageIdx + 1}/{stages.length}
            </span>
          </div>
        </div>

        {/* WORKABLE CONTENT PANEL */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar bg-slate-50/30">
          
          {/* Header Title with classification capsules */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs ${currentColors.dot}`}>
                {currentStageIdx + 1}
              </div>
              <h3 className="text-base font-black text-slate-900">{currentStage.label}</h3>
            </div>
            <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-black uppercase tracking-wider ${currentColors.bg}`}>
              {currentStage.typeLabel}
            </span>
          </div>

          {/* Primary Speech Bubble box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 bottom-0 left-0 w-1 ${currentColors.dot}`} />
            <div className="space-y-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                {currentStage.introTitle}
              </span>
              <p className="text-[13px] font-black text-slate-800 leading-relaxed italic select-all">
                {currentStage.introReplica}
              </p>
            </div>
          </div>

          {/* Alert messages & reminders list */}
          {currentStage.reminders && currentStage.reminders.length > 0 && (
            <div className="space-y-2 shrink-0">
              {currentStage.reminders.map((rem, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    rem.type === 'warning' 
                      ? 'bg-red-50/50 border-red-100 text-red-800' 
                      : rem.type === 'clock' 
                        ? 'bg-orange-50/40 border-orange-100/50 text-orange-900' 
                        : 'bg-emerald-50/40 border-emerald-100/40 text-emerald-900'
                  }`}
                >
                  {rem.type === 'warning' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                  {rem.type === 'clock' && <Clock className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />}
                  {rem.type === 'info' && <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 border border-emerald-500 rounded-full p-0.5" />}
                  <p className="text-[10px] font-bold leading-normal">{rem.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* OPTIONAL AREA 1: Interactive choice blocks (GESTION DE L'ACCUEIL) */}
          {currentStage.options && currentStage.options.length > 0 && (
            <div className="space-y-3.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">
                {currentStage.optionsTitle || "Gérer les réponses"}
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentStage.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 outline-none flex flex-col justify-between cursor-pointer ${
                      selectedOptionId === opt.id
                        ? 'bg-blue-50/60 border-blue-500 shadow-sm'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                      {opt.id === 'prospect_confirms' ? '✓' : '↻'} {opt.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold mt-1 leading-snug">
                      {opt.subtext}
                    </span>
                  </button>
                ))}
              </div>

              {/* Reveal recommended response box if an option is selected */}
              {selectedOptionId && (
                <div className="p-4 bg-emerald-50/40 border border-emerald-100/50 rounded-xl space-y-1 animate-in fade-in duration-200">
                  <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest block">
                    Réponse Recommandée
                  </span>
                  <p className="text-[11px] font-black text-slate-800 leading-normal italic">
                    {currentStage.options.find(o => o.id === selectedOptionId)?.recommendedResponse}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* OPTIONAL AREA 2: Segmented Tabs Control for Conditional Dialogues */}
          {currentStage.conditionalTabs && currentStage.conditionalTabs.length > 0 && (
            <div className="space-y-4">
              {/* Tabs button bar */}
              <div className="flex border border-slate-200 rounded-xl overflow-hidden p-0.5 bg-slate-100/60">
                {currentStage.conditionalTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider text-center transition-all outline-none rounded-lg cursor-pointer ${
                      activeTabId === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab details container */}
              {activeTabId && (() => {
                const activeTab = currentStage.conditionalTabs.find(t => t.id === activeTabId);
                if (!activeTab) return null;
                return (
                  <div className="space-y-3.5 animate-in fade-in duration-200">
                    <div className="bg-white p-4.5 rounded-xl border border-slate-100 shadow-sm space-y-1 relative overflow-hidden">
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-500" />
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                        {activeTab.boxTitle}
                      </span>
                      <p className="text-[11.5px] font-black text-slate-800 leading-relaxed italic">
                        {activeTab.boxReplica}
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-50/40 border border-emerald-100/30 rounded-xl flex items-start gap-2 text-emerald-950">
                      <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold leading-normal">{activeTab.badgeText}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* OPTIONAL AREA 3: Checklist Fields for CRM Data Collection */}
          {currentStage.checklist && currentStage.checklist.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">
                {currentStage.checklistTitle || "Données à collecter"}
              </span>

              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100 shadow-sm">
                {currentStage.checklist.map((item, idx) => {
                  const key = `${currentStage.id}-${idx}`;
                  const isChecked = !!checkedItems[key];
                  return (
                    <label 
                      key={idx}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-all"
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                      <span className={`text-[10.5px] font-bold ${isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM NAVIGATION ACTIONS FOOTER */}
        <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            onClick={handlePrev}
            disabled={currentStageIdx === 0}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold rounded-xl transition-all text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            ← Précédent
          </button>

          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
            Étape {currentStageIdx + 1} sur {stages.length}
          </span>

          {currentStageIdx === stages.length - 1 ? (
            <button
              onClick={onValidate}
              disabled={isValidating}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition-all text-[11px] uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-emerald-600/10 active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              Terminer & Sauvegarder
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl transition-all text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
            >
              Suivant →
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
