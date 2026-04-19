import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Building2, PencilLine, BarChart3, MapPin, Mail, Phone, Globe, Briefcase, ListChecks } from 'lucide-react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { getGigsByCompanyId } from '../matching';

type CompanyRecord = Record<string, any>;

function unwrapPayload(res: { data?: any }) {
  const body = res?.data;
  if (!body) return null;
  if (body.data !== undefined && body.data !== null) return body.data;
  return body;
}

function companyIdString(company: CompanyRecord | null): string | undefined {
  if (!company) return undefined;
  const id = company._id;
  if (typeof id === 'string') return id;
  if (id && typeof id === 'object' && '$oid' in id) return (id as { $oid: string }).$oid;
  return undefined;
}

export function CompanyDashboardPage() {
  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<{ completedSteps?: number[]; currentPhase?: number } | null>(null);
  const [gigsCount, setGigsCount] = useState<number | null>(null);

  const base = import.meta.env.VITE_BACKEND_URL_COMPANY;

  const loadCompany = useCallback(async () => {
    const userId = Cookies.get('userId');
    const cookieCompanyId = Cookies.get('companyId');

    let resolved: CompanyRecord | null = null;

    if (cookieCompanyId) {
      try {
        const res = await axios.get(`${base}/companies/${cookieCompanyId}/details`);
        resolved = unwrapPayload(res);
        if (resolved && typeof resolved === 'object' && !resolved._id) {
          resolved = { ...resolved, _id: cookieCompanyId };
        }
      } catch {
        /* try fallback below */
      }
    }

    if (!resolved && userId) {
      try {
        const res = await axios.get(`${base}/companies/user/${userId}`);
        const data = unwrapPayload(res);
        if (data && typeof data === 'object') resolved = data;
      } catch (e: any) {
        const msg = e?.response?.status === 404
          ? 'Aucune entreprise trouvée pour ce compte.'
          : 'Impossible de charger les données entreprise.';
        setLoadError(msg);
      }
    }

    if (!resolved && !userId) {
      setLoadError('Session invalide : identifiant utilisateur manquant.');
    }

    setCompany(resolved);
    return resolved;
  }, [base]);

  const loadExtras = useCallback(
    async (resolved: CompanyRecord | null) => {
      const cid = Cookies.get('companyId') || companyIdString(resolved);
      if (!cid) {
        setOnboarding(null);
        setGigsCount(null);
        return;
      }

      try {
        const res = await axios.get(`${base}/onboarding/companies/${cid}/onboarding`);
        const raw = res.data?.data ?? res.data;
        if (raw && typeof raw === 'object') setOnboarding(raw);
      } catch {
        setOnboarding(null);
      }

      try {
        const gigs = await getGigsByCompanyId(cid);
        setGigsCount(Array.isArray(gigs) ? gigs.length : 0);
      } catch {
        setGigsCount(null);
      }
    },
    [base]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const resolved = await loadCompany();
        if (!cancelled) await loadExtras(resolved);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCompany, loadExtras]);

  const completedCount = onboarding?.completedSteps?.length ?? 0;
  const contact = company?.contact || {};
  const logoSrc = company?.logo || company?.logoUrl;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-slate-200" />
        <div className="h-6 w-96 rounded-lg bg-slate-100" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-3xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto rounded-3xl border border-amber-200 bg-amber-50/80 p-8 text-center space-y-4">
        <BarChart3 className="h-10 w-10 text-amber-600 mx-auto" />
        <h1 className="text-xl font-black text-slate-900">Aucune entreprise chargée</h1>
        <p className="text-slate-600 text-sm">
          {loadError || 'Créez ou complétez votre entreprise depuis l’orchestrateur, puis revenez sur ce tableau de bord.'}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            to="/company/profile"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 to-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-md"
          >
            <PencilLine className="h-4 w-4" />
            Fiche entreprise
          </Link>
          <a
            href="/app11"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800"
          >
            Orchestrateur
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-5 min-w-0">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              <Building2 className="h-10 w-10 text-slate-300" />
            )}
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-600">
              <BarChart3 className="h-3.5 w-3.5" />
              Tableau de bord entreprise
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 truncate">{company.name || 'Entreprise'}</h1>
            <p className="mt-1 text-slate-600 text-sm">
              {[company.industry, company.headquarters].filter(Boolean).join(' · ') || 'Vue synthétique des informations clés.'}
            </p>
          </div>
        </div>
        <Link
          to="/company/profile"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-rose-300 hover:text-rose-700 shrink-0"
        >
          <PencilLine className="h-4 w-4" />
          Modifier la fiche
        </Link>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
            <Building2 className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-black text-slate-900">Identité</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Secteur</dt>
              <dd className="font-medium text-slate-800">{company.industry || '—'}</dd>
            </div>
            <div className="flex gap-2">
              <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Siège</dt>
                <dd className="font-medium text-slate-800">{company.headquarters || contact.address || '—'}</dd>
              </div>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
            <Mail className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-black text-slate-900">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-2 min-w-0">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="truncate text-slate-800">{contact.email || '—'}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-slate-800">{contact.phone || '—'}</span>
            </li>
            <li className="flex items-center gap-2 min-w-0">
              <Globe className="h-4 w-4 text-slate-400 shrink-0" />
              {contact.website ? (
                <a href={contact.website} target="_blank" rel="noreferrer" className="text-rose-600 font-medium truncate hover:underline">
                  {contact.website}
                </a>
              ) : (
                <span className="text-slate-800">—</span>
              )}
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <ListChecks className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-black text-slate-900">Onboarding</h2>
          {onboarding ? (
            <p className="mt-4 text-2xl font-black text-slate-900">
              {completedCount}
              <span className="text-sm font-semibold text-slate-500 ml-2">étapes complétées</span>
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Progression non disponible pour le moment.</p>
          )}
          {onboarding?.currentPhase != null && (
            <p className="mt-2 text-xs text-slate-500">Phase courante : {onboarding.currentPhase}</p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
            <Briefcase className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-black text-slate-900">Gigs</h2>
          <p className="mt-4 text-2xl font-black text-slate-900">
            {gigsCount === null ? '—' : gigsCount}
            <span className="text-sm font-semibold text-slate-500 ml-2">annonces liées</span>
          </p>
          <Link to="/gigs" className="mt-4 inline-block text-sm font-bold text-rose-600 hover:underline">
            Gérer les gigs →
          </Link>
        </section>
      </div>
    </div>
  );
}

export default CompanyDashboardPage;
