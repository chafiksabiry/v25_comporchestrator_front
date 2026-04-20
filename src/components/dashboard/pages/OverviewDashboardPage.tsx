import React from 'react';
import { LayoutDashboard, ArrowRight, Sparkles } from 'lucide-react';

export function OverviewDashboardPage() {
  const handleRedirect = () => {
    window.dispatchEvent(new CustomEvent('openComporchestrator'));
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      {/* Decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-harx-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-xl text-center space-y-12">
        {/* Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-harx-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-harx-600 border border-harx-500/20 shadow-sm animate-in fade-in zoom-in duration-700">
            <Sparkles className="h-3.5 w-3.5" />
            Overview
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <h1 className="text-5xl font-black tracking-tight text-slate-900 uppercase">
            Tableau de <span className="text-transparent bg-clip-text bg-gradient-harx">Bord</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-md mx-auto leading-relaxed italic">
            Return to the orchestrator to manage your setup and onboarding.
          </p>
        </div>

        {/* The Button */}
        <div className="pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <button
            onClick={handleRedirect}
            className="group relative inline-flex items-center gap-4 px-10 py-5 rounded-[2rem] bg-slate-900 text-white shadow-2xl shadow-slate-900/20 transition-all duration-300 hover:scale-105 hover:shadow-slate-900/30 active:scale-95 overflow-hidden border border-slate-800"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
            
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 transition-transform duration-300 group-hover:rotate-12">
              <LayoutDashboard className="h-6 w-6 text-harx-300" />
            </div>
            
            <div className="flex flex-col items-start leading-none text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-harx-400 transition-colors">
                Return to
              </span>
              <span className="text-2xl font-black mt-1">Orchestrator</span>
            </div>
            
            <div className="ml-4 p-2 rounded-full bg-white/5 transition-transform duration-300 group-hover:translate-x-2">
              <ArrowRight className="h-5 w-5" />
            </div>
          </button>
        </div>

        {/* Footer Hint */}
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] animate-in fade-in duration-1000 delay-500">
          Streamlined Access System
        </p>
      </div>
    </div>
  );
}

export default OverviewDashboardPage;
