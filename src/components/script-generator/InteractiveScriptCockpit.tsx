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
  X,
  RotateCcw,
  Award
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
}

interface InteractiveScriptCockpitProps {
  scriptTitle: string;
  stages?: InteractiveStage[];
  onClose?: () => void;
  onValidate?: () => void;
  isValidating?: boolean;
  isInline?: boolean;
}

const cleanTrainingText = (text: string): string => {
  if (!text) return '';
  return text.replace(/^(module\s+\d+\s*[:\-]\s*)/i, '').trim();
};

export function InteractiveScriptCockpit({ 
  scriptTitle, 
  stages = [], 
  onClose,
  onValidate,
  isValidating = false,
  isInline = false
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
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  
  // Scoring Simulation States
  const [showScoringSimulation, setShowScoringSimulation] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateScoring = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setShowScoringSimulation(true);
    }, 1500);
  };

  // Reset interactive states when changing stages
  useEffect(() => {
    setSelectedOptionId(null);
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
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-100 rounded-2xl text-center">
        <LoaderSpinner />
      </div>
    );
  }

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

  const renderContent = () => {
    return (
      <div className="bg-white w-full h-full rounded-2xl flex flex-col overflow-hidden border border-slate-100">
        
        {/* TOP STATUS NAVIGATION BAR */}
        <div className="bg-slate-50 px-5 py-3 flex flex-col space-y-2.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest truncate max-w-[200px] md:max-w-xs">{scriptTitle}</h2>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Timer UI */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-white rounded-lg border border-slate-100 shadow-sm shrink-0">
                <Clock className={`w-3 h-3 ${isTimerActive ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black text-slate-800 font-mono">{formatTime(seconds)}</span>
                <button 
                  onClick={() => setIsTimerActive(!isTimerActive)}
                  className="p-0.5 hover:bg-slate-100 rounded text-slate-500 transition-all"
                >
                  {isTimerActive ? <Square size={8} fill="currentColor" /> : <Play size={8} fill="currentColor" />}
                </button>
              </div>

              {/* Close Button if not inline */}
              {!isInline && onClose && (
                <button 
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Stepper Progress bar indicators */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex-1 flex gap-1">
              {stages.map((stg, idx) => (
                <div 
                  key={stg.id}
                  onClick={() => setCurrentStageIdx(idx)}
                  className={`h-1 rounded-full flex-1 transition-all duration-300 cursor-pointer ${
                    idx < currentStageIdx 
                      ? 'bg-red-600' 
                      : idx === currentStageIdx 
                        ? 'bg-red-500' 
                        : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-black text-slate-500 tracking-tight ml-2 shrink-0">
              {currentStageIdx + 1}/{stages.length}
            </span>
          </div>
        </div>

        {/* WORKABLE CONTENT PANEL */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar bg-slate-50/20">
          
          {/* Header Title with classification capsules */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-black text-[10px] ${currentColors.dot}`}>
                {currentStageIdx + 1}
              </div>
              <h3 className="text-xs font-black text-slate-900 leading-tight">{currentStage.label}</h3>
            </div>
            <span className={`px-2 py-0.5 border rounded-full text-[8px] font-black uppercase tracking-wider ${currentColors.bg}`}>
              {currentStage.typeLabel}
            </span>
          </div>

          {/* Primary Speech Bubble box */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 bottom-0 left-0 w-1 ${currentColors.dot}`} />
            <div className="space-y-1.5">
              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">
                {currentStage.introTitle}
              </span>
              <p className="text-[11.5px] font-bold text-slate-800 leading-relaxed italic select-all">
                {currentStage.introReplica}
              </p>
            </div>
          </div>

          {/* Alert messages & reminders list */}
          {currentStage.reminders && currentStage.reminders.length > 0 && (
            <div className="space-y-1.5 shrink-0">
              {currentStage.reminders.map((rem, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                    rem.type === 'warning' 
                      ? 'bg-red-50/50 border-red-100 text-red-800' 
                      : rem.type === 'clock' 
                        ? 'bg-orange-50/40 border-orange-100/50 text-orange-900' 
                        : 'bg-emerald-50/40 border-emerald-100/40 text-emerald-900'
                  }`}
                >
                  {rem.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
                  {rem.type === 'clock' && <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />}
                  {rem.type === 'info' && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5 border border-emerald-500 rounded-full p-0.5" />}
                  <p className="text-[9.5px] font-bold leading-normal">{cleanTrainingText(rem.text)}</p>
                </div>
              ))}
            </div>
          )}

          {/* OPTIONAL AREA: Interactive choice blocks */}
          {currentStage.options && currentStage.options.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">
                {currentStage.optionsTitle || "Gérer les réponses"}
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentStage.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`p-3 rounded-lg border text-left transition-all duration-200 outline-none flex flex-col justify-between cursor-pointer ${
                      selectedOptionId === opt.id
                        ? 'bg-blue-50/60 border-blue-500 shadow-sm'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] font-black text-slate-800 flex items-center gap-1">
                      {opt.id === 'prospect_confirms' ? '✓' : '↻'} {opt.label}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold mt-0.5 leading-snug">
                      {opt.subtext}
                    </span>
                  </button>
                ))}
              </div>

              {/* Reveal recommended response box if selected */}
              {selectedOptionId && (
                <div className="p-3 bg-emerald-50/40 border border-emerald-100/50 rounded-xl space-y-1 animate-in fade-in duration-200">
                  <span className="text-[8px] font-extrabold text-emerald-600 uppercase tracking-widest block">
                    Réponse Recommandée
                  </span>
                  <p className="text-[10px] font-black text-slate-800 leading-normal italic">
                    {currentStage.options.find(o => o.id === selectedOptionId)?.recommendedResponse}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* OPTIONAL AREA: Checklist Fields for CRM Data Collection */}
          {currentStage.checklist && currentStage.checklist.length > 0 && (
            <div className="space-y-2">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">
                {currentStage.checklistTitle || "Données à collecter"}
              </span>

              <div className="bg-white rounded-lg border border-slate-100 overflow-hidden divide-y divide-slate-100 shadow-sm">
                {currentStage.checklist.map((item, idx) => {
                  const key = `${currentStage.id}-${idx}`;
                  const isChecked = !!checkedItems[key];
                  return (
                    <label 
                      key={idx}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer transition-all"
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-3.5 w-3.5"
                      />
                      <span className={`text-[9.5px] font-bold ${isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

        </div>
        
        {/* SIMULATE SCORING BUTTON (ONLY ON LAST STEP) */}
        {currentStageIdx === stages.length - 1 && (
          <div className="flex justify-center py-2 bg-slate-50 border-t border-slate-100 shrink-0">
            <button
              onClick={handleSimulateScoring}
              disabled={isSimulating}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-extrabold rounded-lg shadow-sm text-[10px] uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-slate-600 ${isSimulating ? 'animate-spin' : ''}`} />
              {isSimulating ? "Analyse HARX en cours..." : "Simuler scoring HARX"}
            </button>
          </div>
        )}

        {/* BOTTOM NAVIGATION ACTIONS FOOTER */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            onClick={handlePrev}
            disabled={currentStageIdx === 0}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold rounded-lg transition-all text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            ← Précédent
          </button>

          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
            Étape {currentStageIdx + 1} sur {stages.length}
          </span>

          {currentStageIdx === stages.length - 1 ? (
            <button
              onClick={onValidate}
              disabled={isValidating}
              className="px-4 py-2 bg-[#f4f4f5] border border-slate-200 hover:bg-slate-100 text-slate-800 font-extrabold rounded-lg transition-all text-[9px] uppercase tracking-widest flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              Save Script ✓
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-lg transition-all text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
            >
              Suivant →
            </button>
          )}
        </div>

        {/* EXPLANATORY TEXT BELOW FOOTER */}
        {currentStageIdx === stages.length - 1 && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[11px] font-bold text-slate-800 text-left shrink-0 leading-relaxed">
            Voici le script dynamique complet en 8 étapes. Voici ce qu'il intègre :
          </div>
        )}

        {/* PREMIUM SIMULATED SCORING RESULTS MODAL */}
        {showScoringSimulation && (
          <div className="absolute inset-0 z-[100] bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-100 shadow-2xl overflow-hidden p-5 space-y-4 animate-in zoom-in-95 duration-200 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-red-600" />
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">Scoring de Vente HARX</span>
                </div>
                <button 
                  onClick={() => setShowScoringSimulation(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3.5">
                {/* Circular Score display */}
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-red-50 border-2 border-red-500 flex items-center justify-center font-black text-red-600 text-base shadow-sm shrink-0">
                    A+
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Qualité Globale</h4>
                    <p className="text-[9.5px] text-slate-500 font-bold leading-normal mt-0.5">Le script est ultra-performant et respecte 100% des règles d'acquisition.</p>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Loi Naegelen</span>
                    <span className="block text-xs font-black text-emerald-600 mt-1">Conforme ✓</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bloctel Fine Risk</span>
                    <span className="block text-xs font-black text-emerald-600 mt-1">0 € Risk ✓</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Analyse IA Comportementale :</span>
                  <p className="text-[9.5px] text-slate-600 font-bold leading-relaxed bg-slate-50/50 p-2.5 border border-slate-100 rounded-lg">
                    "Ton de l'agent chaleureux, empathie élevée, conformité Naegelen & Bloctel respectée à l'ouverture de l'appel."
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowScoringSimulation(false)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-lg text-[10px] uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

      </div>
    );
  };

  if (isInline) {
    return <div className="w-full h-full flex flex-col">{renderContent()}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-2 md:p-4 overflow-hidden animate-in fade-in duration-300">
      <div className="bg-white w-full h-full max-w-5xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {renderContent()}
      </div>
    </div>
  );
}

function LoaderSpinner() {
  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="relative">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200/60 border-t-red-600 animate-spin" />
        <Sparkles className="w-3.5 h-3.5 text-red-600 animate-pulse absolute inset-0 m-auto" />
      </div>
      <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Génération du script interactif...</p>
    </div>
  );
}
