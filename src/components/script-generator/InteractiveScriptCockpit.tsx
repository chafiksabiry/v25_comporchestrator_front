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

interface ScriptPhase {
    id: string;
    title: string;
    content: string;
    suggestions: Array<{
        text: string;
        nextPhaseId: string;
    }>;
    compliance?: string;
}

interface InteractiveScriptCockpitProps {
    scriptTitle: string;
    phases: ScriptPhase[];
    onClose: () => void;
}

export function InteractiveScriptCockpit({ scriptTitle, phases, onClose }: InteractiveScriptCockpitProps) {
    const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
    const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [outcome, setOutcome] = useState<string | null>(null);
    const [complianceChecked, setComplianceChecked] = useState(false);

    const profiles = ['Salarié', 'Indépendant / TNS', 'Retraité', 'Jeune actif', 'Famille'];
    const currentPhase = phases[currentPhaseIdx];

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

    const handleJumpToPhase = (id: string) => {
        const idx = phases.findIndex(p => p.id === id);
        if (idx !== -1) {
            setCurrentPhaseIdx(idx);
        }
    };

    const handleNext = () => {
        if (currentPhaseIdx < phases.length - 1) {
            setCurrentPhaseIdx(currentPhaseIdx + 1);
        }
    };

    const handlePrev = () => {
        if (currentPhaseIdx > 0) {
            setCurrentPhaseIdx(currentPhaseIdx - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-50 w-full h-full max-w-7xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
                
                {/* Header Section */}
                <div className="bg-white px-8 py-6 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-harx-500/10 rounded-2xl">
                            <MessageSquare className="w-6 h-6 text-harx-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{scriptTitle}</h2>
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    {phases.map((_, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                                idx === currentPhaseIdx ? 'w-6 bg-harx-500' : 
                                                idx < currentPhaseIdx ? 'bg-slate-300' : 'bg-slate-100'
                                            }`} 
                                        />
                                    ))}
                                </div>
                                <span className="text-xs font-bold text-slate-400 ml-2 uppercase">Étape {currentPhaseIdx + 1}/{phases.length}</span>
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
                    <div className="flex-1 p-8 overflow-y-auto space-y-8 scroll-smooth">
                        
                        {/* Current Phase Title */}
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-harx-500 uppercase tracking-[0.2em]">Phase actuelle</span>
                            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{currentPhase.title}</h3>
                        </div>

                        {/* Compliance Alert (if any) */}
                        {currentPhase.compliance && (
                            <div className={`p-5 rounded-3xl border transition-all duration-500 flex items-start gap-4 ${
                                complianceChecked ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'
                            }`}>
                                <div className={`p-2 rounded-xl ${complianceChecked ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                    <AlertCircle size={20} />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <p className="text-sm font-bold leading-relaxed">{currentPhase.compliance}</p>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={complianceChecked}
                                            onChange={() => setComplianceChecked(!complianceChecked)}
                                            className="w-5 h-5 rounded-lg border-slate-300 text-harx-500 focus:ring-harx-500/20"
                                        />
                                        <span className="text-xs font-black uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">Information communiquée</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Dialogue Card */}
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 relative group overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-harx-500 opacity-20" />
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare size={16} className="text-harx-500" />
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Script à l'oral</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-800 leading-snug italic">
                                    « {currentPhase.content} »
                                </p>
                            </div>
                        </div>

                        {/* Suggestions / Branches */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentPhase.suggestions.map((s, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => handleJumpToPhase(s.nextPhaseId)}
                                    className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-harx-200 text-left transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-harx-600 transition-colors">{s.text}</span>
                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-harx-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Bottom Navigation */}
                        <div className="flex items-center justify-between pt-8 border-t border-slate-200">
                            <button 
                                onClick={handlePrev}
                                disabled={currentPhaseIdx === 0}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft size={20} />
                                Précédent
                            </button>
                            <button 
                                onClick={handleNext}
                                disabled={currentPhaseIdx === phases.length - 1}
                                className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest hover:bg-harx-600 hover:shadow-lg transition-all disabled:opacity-30"
                            >
                                Suivant
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Sidebar (Right) */}
                    <div className="w-80 bg-white border-l border-slate-100 p-8 flex flex-col gap-8 overflow-y-auto">
                        
                        {/* Prospect Profile */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-harx-500" />
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Profil Prospect</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {profiles.map(p => (
                                    <button 
                                        key={p}
                                        onClick={() => setSelectedProfile(p)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                            selectedProfile === p ? 'bg-harx-500 text-white border-harx-500 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Notes */}
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-2">
                                <StickyNote size={16} className="text-harx-500" />
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Notes Rapides</h4>
                            </div>
                            <textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Saisir des notes ici..."
                                className="w-full h-40 bg-slate-50 border border-slate-100 rounded-3xl p-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-harx-500/20 focus:border-harx-500 transition-all resize-none shadow-inner"
                            />
                        </div>

                        {/* Outcome */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Flag size={16} className="text-harx-500" />
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Issue de l'appel</h4>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {['Signé', 'Rappel', 'Refus'].map(o => (
                                    <button 
                                        key={o}
                                        onClick={() => setOutcome(o)}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                            outcome === o ? 
                                            (o === 'Signé' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 
                                             o === 'Rappel' ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 
                                             'bg-red-500 text-white border-red-500 shadow-lg') : 
                                            'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                                        }`}
                                    >
                                        {o}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 border-t border-slate-100">
                            <button className="w-full py-4 bg-harx-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group">
                                <Save size={18} />
                                Enregistrer & Terminer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
