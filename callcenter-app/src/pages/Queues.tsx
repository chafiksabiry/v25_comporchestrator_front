import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAppState } from '@/store/store';
import { addQueue, removeQueue, saveQueue } from '@/store/actions';
import { Badge, Empty, PageHeader } from '@/components/ui';

export default function Queues() {
  const { queues } = useAppState();
  const [name, setName] = useState('');
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('inbound');

  return (
    <div>
      <PageHeader title="Files d’attente" subtitle="Les appels entrants sont distribués aux agents en poste selon le planning." />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="card h-fit space-y-3">
          <h2 className="font-black">Nouvelle file</h2>
          <div>
            <label className="label" htmlFor="nq-name">Nom</label>
            <input id="nq-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="nq-dir">Sens</label>
            <select id="nq-dir" className="input" value={direction} onChange={(e) => setDirection(e.target.value as 'inbound' | 'outbound')}>
              <option value="inbound">Entrant</option>
              <option value="outbound">Sortant</option>
            </select>
          </div>
          <button
            className="btn-primary w-full"
            disabled={!name.trim()}
            onClick={() => {
              addQueue({ name: name.trim(), direction, strategy: direction === 'inbound' ? 'longest_idle' : 'round_robin' });
              setName('');
            }}
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </section>
        <section className="space-y-3">
          {queues.length === 0 ? <Empty title="Aucune file" /> : null}
          {queues.map((q) => (
            <div key={q.id} className="card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <input className="input !w-auto min-w-[220px] font-bold" value={q.name} aria-label={`Nom de la file ${q.name}`} onChange={(e) => saveQueue({ ...q, name: e.target.value })} />
                <div className="flex items-center gap-2">
                  <Badge tone={q.direction === 'inbound' ? 'info' : 'warn'}>{q.direction === 'inbound' ? 'Entrant' : 'Sortant'}</Badge>
                  <button className="btn-danger !px-2.5" aria-label={`Supprimer ${q.name}`} onClick={() => removeQueue(q.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor={`st-${q.id}`}>Distribution</label>
                  <select id={`st-${q.id}`} className="input" value={q.strategy} onChange={(e) => saveQueue({ ...q, strategy: e.target.value as typeof q.strategy })}>
                    <option value="longest_idle">Agent libre depuis le plus longtemps</option>
                    <option value="round_robin">Tour à tour</option>
                  </select>
                </div>
                {q.direction === 'inbound' ? (
                  <div>
                    <label className="label" htmlFor={`gr-${q.id}`}>Message du menu vocal</label>
                    <input id={`gr-${q.id}`} className="input" value={q.greeting ?? ''} onChange={(e) => saveQueue({ ...q, greeting: e.target.value })} />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
