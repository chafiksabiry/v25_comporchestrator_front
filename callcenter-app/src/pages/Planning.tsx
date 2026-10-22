import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '@/store/store';
import { toggleShift } from '@/store/actions';
import { Empty, Gate, Notice, PageHeader } from '@/components/ui';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i);

function PlanningInner() {
  const { agents, queues, shifts } = useAppState();
  const [queueId, setQueueId] = useState(queues[0]?.id ?? '');
  const [agentId, setAgentId] = useState(agents[0]?.id ?? '');

  useEffect(() => {
    if (!queues.some((q) => q.id === queueId)) setQueueId(queues[0]?.id ?? '');
    if (!agents.some((a) => a.id === agentId)) setAgentId(agents[0]?.id ?? '');
  }, [queues, agents, queueId, agentId]);

  const coverage = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of shifts) if (s.queueId === queueId) m.set(`${s.day}-${s.hour}`, (m.get(`${s.day}-${s.hour}`) ?? 0) + 1);
    return m;
  }, [shifts, queueId]);

  const jsDay = (new Date().getDay() + 6) % 7;
  const hourNow = new Date().getHours();
  const onShift = shifts.filter((s) => s.queueId === queueId && s.day === jsDay && s.hour === hourNow);

  if (!queues.length || !agents.length) {
    return <Empty title="Le planning demande au moins une file et un agent." />;
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label" htmlFor="pl-queue">File</label>
          <select id="pl-queue" className="input" value={queueId} onChange={(e) => setQueueId(e.target.value)}>
            {queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pl-agent">Agent à planifier</label>
          <select id="pl-agent" className="input" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            {agents.map((a) => <option key={a.id} value={a.id}>{`${a.firstName} ${a.lastName}`.trim() || a.email}</option>)}
          </select>
        </div>
        <p className="text-sm font-medium text-harx-muted">Cliquez sur une case pour ajouter ou retirer une plage de travail d’une heure.</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-center text-xs" data-testid="planning-grid">
          <thead>
            <tr><th className="w-16" />{DAYS.map((d) => <th key={d} className="pb-1 font-black">{d}</th>)}</tr>
          </thead>
          <tbody>
            {HOURS.map((h) => (
              <tr key={h}>
                <th className="pr-2 text-right font-bold text-harx-muted">{String(h).padStart(2, '0')}h</th>
                {DAYS.map((_, d) => {
                  const mine = shifts.some((s) => s.agentId === agentId && s.queueId === queueId && s.day === d && s.hour === h);
                  const count = coverage.get(`${d}-${h}`) ?? 0;
                  return (
                    <td key={d}>
                      <button
                        type="button"
                        aria-label={`${DAYS[d]} ${h}h : ${count} agent(s)`}
                        aria-pressed={mine}
                        onClick={() => agentId && toggleShift(agentId, queueId, d, h)}
                        className={`h-8 w-full rounded-lg border text-[11px] font-black transition ${
                          mine ? 'border-harx-500 bg-harx-500 text-white' : count > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-300'
                        }`}
                      >
                        {count || ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs font-medium text-harx-muted">Rouge : aucune couverture. Vert : agents prévus. Plein : plage de l’agent sélectionné.</p>
      </div>

      <Notice tone="info">
        Routage : seuls les agents en poste reçoivent les appels de la file. En ce moment ({DAYS[jsDay]} {hourNow}h) :{' '}
        <strong>{onShift.length ? `${onShift.length} agent(s) en poste` : 'aucun agent en poste'}</strong>.
      </Notice>
    </div>
  );
}

export default function Planning() {
  return (
    <div>
      <PageHeader title="Planning" subtitle="Plages de travail par file : couverture, présence, routage." />
      <Gate group="D"><PlanningInner /></Gate>
    </div>
  );
}
