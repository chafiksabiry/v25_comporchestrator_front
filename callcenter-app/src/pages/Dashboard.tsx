import { Link } from 'react-router-dom';
import { Check, Circle } from 'lucide-react';
import { formatEur } from '@/domain/billing';
import { getPlan } from '@/domain/plans';
import { getTemplate } from '@/domain/templates';
import { useAppState } from '@/store/store';
import { setupChecklist, totalLines } from '@/store/selectors';
import { Badge, Empty, PageHeader, Stat } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';

export default function Dashboard() {
  const s = useAppState();
  const checklist = setupChecklist(s);
  const remaining = checklist.filter((c) => !c.done);
  const today = new Date().toDateString();
  const todayCalls = s.calls.filter((c) => new Date(c.at).toDateString() === today);
  const minutes = todayCalls.reduce((sum, c) => sum + c.minutes, 0);
  const answeredRate = todayCalls.length ? Math.round((todayCalls.filter((c) => c.answered).length / todayCalls.length) * 100) : null;
  const template = s.templateId ? getTemplate(s.templateId) : null;

  return (
    <div>
      <PageHeader
        title={`Bonjour${s.company ? `, ${s.company.name}` : ''}`}
        subtitle={s.subscription ? `Forfait ${getPlan(s.subscription.planId).name} · ${totalLines(s)} ligne(s)` : 'Aucun forfait actif'}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Solde prépayé" value={formatEur(s.wallet.balanceUnits)} />
        <Stat label="Appels aujourd’hui" value={todayCalls.length} hint={answeredRate === null ? '—' : `${answeredRate} % décrochés`} />
        <Stat label="Minutes facturées" value={minutes} hint="Aujourd’hui" />
        <Stat label="Agents" value={s.agents.length} hint={`${s.agents.filter((a) => a.invitationStatus === 'active').length} actif(s)`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-black">Mise en route</h2>
          <ul className="space-y-2">
            {checklist.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm font-medium">
                {c.done ? <Check className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-slate-300" />}
                <span className={c.done ? 'text-slate-500' : 'font-bold'}>{c.label}</span>
              </li>
            ))}
          </ul>
          {remaining.length === 0 ? <p className="mt-3 text-sm font-bold text-emerald-700">Tout est prêt.</p> : null}
        </section>

        <section className="card">
          <h2 className="mb-3 font-black">Derniers appels</h2>
          {s.calls.length === 0 ? (
            <Empty title="Aucun appel pour le moment"><Link className="btn-primary" to="/app/calls">Passer un appel</Link></Empty>
          ) : (
            <ul className="divide-y divide-harx-border">
              {s.calls.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-bold">{c.remote}</p>
                    <p className="text-xs font-medium text-harx-muted">{fmtDateTime(c.at)} · {c.direction === 'inbound' ? 'Entrant' : 'Sortant'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{c.minutes} min</p>
                    <p className="text-xs font-medium text-harx-muted">{formatEur(c.units, 4)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {template ? (
        <section className="card mt-4">
          <h2 className="mb-2 font-black">Indicateurs suivis — {template.name}</h2>
          <div className="flex flex-wrap gap-2">{template.kpis.map((k) => <Badge key={k} tone="info">{k}</Badge>)}</div>
        </section>
      ) : null}
    </div>
  );
}
