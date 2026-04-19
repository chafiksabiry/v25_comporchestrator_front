import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, PencilLine, BarChart3 } from 'lucide-react';
import Cookies from 'js-cookie';

export function CompanyDashboardPage() {
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = Cookies.get('userId');
    if (!userId) {
      setLoading(false);
      return;
    }

    const base = import.meta.env.VITE_BACKEND_URL_COMPANY;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${base}/companies/user/${userId}`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const data = json?.data ?? json;
        const name = data?.name;
        if (typeof name === 'string' && name.trim()) setCompanyName(name.trim());
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-600">
            <BarChart3 className="h-3.5 w-3.5" />
            company/dashboard
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Tableau de bord entreprise</h1>
          <p className="mt-2 text-slate-600">
            {loading ? 'Chargement…' : companyName ? `Société : ${companyName}` : 'Aucune société chargée pour ce compte.'}
          </p>
        </div>
        <Link
          to="/company/profile"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-rose-300 hover:text-rose-700"
        >
          <PencilLine className="h-4 w-4" />
          Fiche entreprise
        </Link>
      </header>

      <div className="grid gap-6 sm:grid-cols-3">
        {['Pipeline', 'Activité', 'Objectifs'].map((title) => (
          <div
            key={title}
            className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Building2 className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-black text-slate-900">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">
              Emplacement pour vos widgets métier (API, graphiques, listes).
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CompanyDashboardPage;
