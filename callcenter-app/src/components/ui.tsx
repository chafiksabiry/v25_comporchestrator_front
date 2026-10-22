import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cheapestPlanWith, hasFeature, type FeatureGroupId } from '@/domain/plans';
import { useAppState } from '@/store/store';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-black tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm font-medium text-harx-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: string; tone?: 'default' | 'warn' | 'bad' | 'good' }) {
  const color = { default: 'text-harx-ink', warn: 'text-amber-600', bad: 'text-red-600', good: 'text-emerald-600' }[tone];
  return (
    <div className="card">
      <p className="label !mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs font-medium text-harx-muted">{hint}</p> : null}
    </div>
  );
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad' | 'info' }) {
  const cls = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    good: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warn: 'bg-amber-50 text-amber-700 border-amber-100',
    bad: 'bg-red-50 text-red-700 border-red-100',
    info: 'bg-sky-50 text-sky-700 border-sky-100',
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${cls}`}>{children}</span>;
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'bad' | 'good'; children: ReactNode }) {
  const cls = {
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    bad: 'border-red-200 bg-red-50 text-red-800',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${cls}`}>{children}</div>;
}

/** Affiche le contenu seulement si le forfait donne accès au groupe de fonctionnalités. */
export function Gate({ group, children }: { group: FeatureGroupId; children: ReactNode }) {
  const { subscription } = useAppState();
  if (hasFeature(subscription?.planId, group)) return <>{children}</>;
  const needed = cheapestPlanWith(group);
  return (
    <div className="card flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Lock className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-black">Cette fonction n’est pas incluse dans votre forfait</h2>
      <p className="max-w-md text-sm font-medium text-harx-muted">
        Elle est disponible à partir du forfait <strong>{needed?.name ?? '—'}</strong>.
      </p>
      <Link to="/app/billing" className="btn-primary">Voir les forfaits</Link>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-harx-border bg-slate-50 px-6 py-10 text-center">
      <p className="text-sm font-bold text-slate-600">{title}</p>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
