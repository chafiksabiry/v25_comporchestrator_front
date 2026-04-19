import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Building2, Sparkles, ArrowRight } from 'lucide-react';

export function OverviewDashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-600">
          <Sparkles className="h-3.5 w-3.5" />
          Overview
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Tableau de bord</h1>
        <p className="text-slate-600 max-w-2xl">
          Vue d’ensemble de votre espace entreprise : accédez au tableau de bord société ou poursuivez l’onboarding dans l’orchestrateur.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          to="/company/dashboard"
          className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm transition hover:border-orange-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-lg shadow-rose-500/25">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-xl font-black text-slate-900">Entreprise</h2>
          <p className="mt-2 text-sm text-slate-600">
            Indicateurs et raccourcis liés à votre société (URI dédiée&nbsp;: <code className="text-xs font-mono text-rose-600">company/dashboard</code>).
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-rose-600">
            Ouvrir
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </Link>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('openComporchestrator'))}
          className="group relative w-full text-left overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-900 p-8 text-white shadow-sm transition hover:border-slate-600 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <LayoutDashboard className="h-6 w-6 text-orange-300" />
          </div>
          <h2 className="mt-6 text-xl font-black">Orchestrateur</h2>
          <p className="mt-2 text-sm text-slate-300">
            Poursuivre l’onboarding, les gigs et les étapes guidées dans l’application principale.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-orange-300">
            Retour orchestrateur
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </button>
      </div>
    </div>
  );
}

export default OverviewDashboardPage;
