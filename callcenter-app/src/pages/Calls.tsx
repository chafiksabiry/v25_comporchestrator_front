import { formatEur, RATE_CLASS_LABEL } from '@/domain/billing';
import { useAppState } from '@/store/store';
import { Badge, Empty, PageHeader } from '@/components/ui';
import { Softphone } from '@/features/softphone/Softphone';
import { fmtDateTime, fmtDuration } from '@/lib/format';

export default function Calls() {
  const { calls } = useAppState();
  return (
    <div>
      <PageHeader title="Appels" subtitle="Minute commencée = minute facturée. Entrant : menu vocal et attente inclus. Transfert : seconde communication." />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="card h-fit">
          <h2 className="mb-3 font-black">Téléphone</h2>
          <Softphone />
        </section>
        <section className="card overflow-x-auto">
          <h2 className="mb-3 font-black">Historique</h2>
          {calls.length === 0 ? (
            <Empty title="Aucun appel enregistré" />
          ) : (
            <table className="w-full text-left text-sm" data-testid="calls-table">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-harx-muted">
                  <th className="pb-2">Date</th><th className="pb-2">Contact</th><th className="pb-2">Détail facturé</th><th className="pb-2 text-right">Minutes</th><th className="pb-2 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-harx-border">
                {calls.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-3 font-medium">{fmtDateTime(c.at)}</td>
                    <td className="py-2 pr-3">
                      <p className="font-bold">{c.remote}</p>
                      <p className="text-xs text-harx-muted">{c.direction === 'inbound' ? 'Entrant' : 'Sortant'} · {c.agentLabel}</p>
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {c.charges.length === 0 ? <Badge>Sans réponse</Badge> : c.charges.map((l) => (
                        <p key={l.legId}>
                          {l.kind === 'transfer' ? 'Transfert' : RATE_CLASS_LABEL[l.rateClass]} : {fmtDuration(l.seconds)} → <strong>{l.minutes} min</strong>
                        </p>
                      ))}
                    </td>
                    <td className="py-2 pr-3 text-right font-bold">{c.minutes}</td>
                    <td className="py-2 text-right font-bold">{formatEur(c.units, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
