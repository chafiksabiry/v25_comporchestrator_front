import React, { useState, useEffect } from 'react';
import { 
    Clock, 
    User, 
    MessageSquare, 
    ChevronRight, 
    ChevronLeft, 
    CheckCircle2, 
    AlertCircle, 
    Play, 
    Square, 
    Save, 
    Sparkles,
    Users,
    StickyNote,
    Flag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ScriptStage {
    id: string;
    label: string;
    agent: string;
    responses: Array<{
        text: string;
        nextStageId: string;
    }>;
    compliance?: string;
}

interface InteractiveScriptCockpitProps {
    scriptTitle: string;
    stages: ScriptStage[];
    onClose: () => void;
    onValidate?: () => void;
    isValidating?: boolean;
    onRefineStage?: (stageId: string, currentContent: string) => Promise<string>;
    onEditStage?: (stageId: string, newContent: string) => void;
}

export function InteractiveScriptCockpit({ 
    scriptTitle, 
    stages, 
    onClose,
    onValidate,
    isValidating,
    onRefineStage,
    onEditStage
}: InteractiveScriptCockpitProps) {
    const { t } = useTranslation();
    const [currentStageIdx, setCurrentStageIdx] = useState(0);
    const [history, setHistory] = useState<number[]>([]);
    const [notes, setNotes] = useState('');
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    const currentStage = stages[currentStageIdx];

    // Timer logic
    useEffect(() => {
        let interval: any = null;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds((prev) => prev + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleJumpToStage = (id: string) => {
        const idx = stages.findIndex(s => s.id === id);
        if (idx !== -1) {
            setHistory(prev => [...prev, currentStageIdx]);
            setCurrentStageIdx(idx);
        }
    };

    const handleNext = () => {
        if (currentStageIdx < stages.length - 1) {
            setHistory(prev => [...prev, currentStageIdx]);
            setCurrentStageIdx(currentStageIdx + 1);
        }
    };

    const handlePrev = () => {
        if (history.length > 0) {
            const lastIdx = history[history.length - 1];
            setHistory(prev => prev.slice(0, -1));
            setCurrentStageIdx(lastIdx);
        }
    };

    const startEditing = () => {
        setEditValue(currentStage.agent);
        setIsEditing(true);
    };

    const saveEdit = () => {
        if (onEditStage) {
            onEditStage(currentStage.id, editValue);
        }
        setIsEditing(false);
    };

    const handleRefine = async () => {
        if (!onRefineStage || isRefining) return;
        setIsRefining(true);
        try {
            const newContent = await onRefineStage(currentStage.id, currentStage.agent);
            if (newContent && onEditStage) {
                onEditStage(currentStage.id, newContent);
            }
        } catch (err) {
            console.error('Refinement failed:', err);
        } finally {
            setIsRefining(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-2 md:p-4 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-50 w-full h-full max-w-7xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/20">
                
                {/* Header Section */}
                <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-harx-500/10 rounded-2xl">
                            <MessageSquare className="w-6 h-6 text-harx-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{scriptTitle}</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('scriptGenerator.cockpit.dynamicNavigation')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                            <Clock className={`w-4 h-4 ${isActive ? 'text-harx-500 animate-pulse' : 'text-slate-400'}`} />
                            <span className="text-lg font-black text-slate-900 font-mono tracking-tighter">{formatTime(seconds)}</span>
                            <button 
                                onClick={() => setIsActive(!isActive)}
                                className={`ml-2 p-1.5 rounded-xl transition-all ${isActive ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-harx-50 text-harx-600 hover:bg-harx-100'}`}
                            >
                                {isActive ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                            </button>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all"
                        >
                            <AlertCircle size={24} />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* Script Area (Left/Center) */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-4 scroll-smooth">
                        
                        {/* Current Phase Title */}
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-black text-harx-500 uppercase tracking-[0.2em]">{t('scriptGenerator.cockpit.currentPhase')}</span>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{currentStage.label}</h3>
                        </div>


                        {/* Dialogue Card */}
                        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 relative group overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-harx-500 opacity-20" />
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare size={14} className="text-harx-500" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('scriptGenerator.cockpit.oralScript')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={startEditing}
                                            className="p-1.5 text-slate-400 hover:text-harx-500 hover:bg-harx-50 rounded-lg transition-all"
                                            title={t('scriptGenerator.cockpit.manualEdit')}
                                        >
                                            <Save size={14} />
                                        </button>
                                        <button 
                                            onClick={handleRefine}
                                            disabled={isRefining}
                                            className={`p-1.5 text-slate-400 hover:text-fuchsia-500 hover:bg-fuchsia-50 rounded-lg transition-all ${isRefining ? 'animate-pulse' : ''}`}
                                            title={t('scriptGenerator.cockpit.refineWithAI')}
                                        >
                                            <Sparkles size={14} />
                                        </button>
                                    </div>
                                </div>
                                
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <textarea 
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="w-full h-32 p-4 text-lg font-bold text-slate-800 bg-slate-50 border border-harx-100 rounded-2xl focus:ring-2 focus:ring-harx-500/20 focus:border-harx-500 outline-none resize-none"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => setIsEditing(false)}
                                                className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-all"
                                            >
                                                {t('scriptGenerator.cockpit.cancel')}
                                            </button>
                                            <button 
                                                onClick={saveEdit}
                                                className="px-4 py-2 bg-harx-500 text-white text-[10px] font-black uppercase rounded-xl shadow-md hover:bg-harx-600 transition-all"
                                            >
                                                {t('scriptGenerator.cockpit.apply')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xl font-bold text-slate-800 leading-snug italic">
                                        « {currentStage.agent} »
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Suggestions / Branches */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {currentStage.responses.map((s, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleJumpToStage(s.nextStageId)}
                                    className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-harx-200 text-left transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 group-hover:text-harx-600 transition-colors">{s.text}</span>
                                        <ChevronRight size={16} className="text-slate-300 group-hover:text-harx-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Bottom Navigation */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                            <button 
                                onClick={handlePrev}
                                disabled={currentStageIdx === 0}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all text-xs"
                            >
                                <ChevronLeft size={16} />
                                {t('scriptGenerator.cockpit.previous')}
                            </button>
                            {currentStageIdx === stages.length - 1 ? (
                                <button 
                                    onClick={onValidate}
                                    disabled={isValidating}
                                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest hover:bg-emerald-700 hover:shadow-lg transition-all disabled:opacity-30 text-xs"
                                >
                                    <CheckCircle2 size={16} />
                                    {isValidating ? t('scriptGenerator.cockpit.validating') : t('scriptGenerator.cockpit.validateAndSave')}
                                </button>
                            ) : currentStage.responses.length === 0 ? (
                                <button 
                                    onClick={handleNext}
                                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest hover:bg-harx-600 hover:shadow-lg transition-all disabled:opacity-30 text-xs"
                                >
                                    {t('scriptGenerator.cockpit.continue')}
                                    <ChevronRight size={16} />
                                </button>
                            ) : (
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                    {t('scriptGenerator.cockpit.chooseOption')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar (Right) */}
                    <div className="w-72 bg-white border-l border-slate-100 p-6 flex flex-col gap-6 overflow-y-auto">
                        

                        {/* Quick Notes */}
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-2">
                                <StickyNote size={16} className="text-harx-500" />
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('scriptGenerator.cockpit.quickNotes')}</h4>
                            </div>
                            <textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t('scriptGenerator.cockpit.notesPlaceholder')}
                                className="w-full h-40 bg-slate-50 border border-slate-100 rounded-3xl p-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-harx-500/20 focus:border-harx-500 transition-all resize-none shadow-inner"
                            />
                           </div>

                        {/* Action Buttons */}
                        <div className="pt-4 border-t border-slate-100">
                            <button className="w-full py-4 bg-harx-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group">
                                <Save size={18} />
                                {t('scriptGenerator.cockpit.saveAndFinish')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
