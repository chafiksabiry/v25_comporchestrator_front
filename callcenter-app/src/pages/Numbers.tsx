import { useState } from 'react';
import { Loader2, Minus, Plus, Search, Trash2 } from 'lucide-react';
import { billableExtraLines } from '@/domain/plans';
import { AREA_OPTIONS, formatFrNumber, searchNumbers, type NumberCandidate } from '@/api/numbers';
import { useAppState } from '@/store/store';
import { addLine, buyNumber, releaseNumber, removeLine } from '@/store/actions';
import { totalLines } from '@/store/selectors';
import { Badge, Empty, Notice, PageHeader } from '@/components/ui';
import { fmtDate } from '@/lib/format';

export default function Numbers() {
  const s = useAppState();
  const [area, setArea] = useState('01');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<NumberCandidate[]>([]);
  const lines = totalLines(s);
  const extra = s.subscription ? billableExtraLines(s.subscription.planId, lines) : Math.max(0, lines - 1);

  return (
    <div>
      <PageHeader title="Numéros et lignes" subtitle="Une ligne est incluse dans l’abonnement ; les lignes supplémentaires sont facturées en licence. Les numéros se louent au mois." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-black">Lignes téléphoniques</h2>
          <p className="text-sm font-medium">
            <strong>{lines}</strong> ligne(s) · <strong>1</strong> incluse · <strong data-testid="extra-lines">{extra}</strong> facturée(s) en licence
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={addLine}><Plus className="h-4 w-4" /> Ajouter une ligne</button>
            <button className="btn-secondary" onClick={removeLine} disabled={s.extraLines === 0}><Minus className="h-4 w-4" /> Retirer</button>
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="font-black">Acheter un numéro</h2>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="label" htmlFor="n-area">Zone</label>
              <select id="n-area" className="input" value={area} onChange={(e) => setArea(e.target.value)}>
                {AREA_OPTIONS.map((o) => <option key={o.prefix} value={o.prefix}>{o.label}</option>)}
              </select>
            </div>
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setResults(await searchNumbers(area));
                setBusy(false);
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Rechercher
            </button>
          </div>
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-harx-border p-2.5">
                <span className="font-mono font-black">{formatFrNumber(r.e164)}</span>
                <button className="btn-primary !py-1.5" onClick={() => { buyNumber(r); setResults((x) => x.filter((y) => y.id !== r.id)); }}>Acheter</button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card mt-4">
        <h2 className="mb-3 font-black">Vos numéros</h2>
        {s.numbers.length === 0 ? (
          <Empty title="Aucun numéro" />
        ) : (
          <ul className="divide-y divide-harx-border">
            {s.numbers.map((n) => (
              <li key={n.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-mono text-base font-black">{formatFrNumber(n.e164)}</p>
                  <p className="text-xs font-medium text-harx-muted">{n.label} · acheté le {fmtDate(n.boughtAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="info">Ligne {n.lineIndex + 1}</Badge>
                  <button className="btn-danger !px-2.5" aria-label={`Libérer ${n.e164}`} onClick={() => window.confirm('Libérer ce numéro ? Il pourrait ne pas être récupérable.') && releaseNumber(n.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="mt-4"><Notice tone="info">Un numéro dont le paiement échoue est libéré après un compte à rebours, voir « Facturation ».</Notice></div>
    </div>
  );
}
