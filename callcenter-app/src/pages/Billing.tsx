import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  callCharge, formatEur, inboundLeg, outboundLeg, pricePerMinuteUnits, RATE_CLASS_LABEL, transferLeg, type RateClass,
} from '@/domain/billing';
import { formatCountdown } from '@/domain/dunning';
import { FEATURE_GROUPS, PLANS, getPlan } from '@/domain/plans';
import { DATA_MODE } from '@/lib/session';
import { useAppState } from '@/store/store';
import { setPaymentFailure, subscribeToPlan, topUp } from '@/store/actions';
import { currentDunning, totalLines } from '@/store/selectors';
import { Badge, Notice, PageHeader } from '@/components/ui';
import { fmtDate, fmtDateTime } from '@/lib/format';

export default function Billing() {
  const s = useAppState();
  const dunning = currentDunning(s);
  const [amount, setAmount] = useState(50);

  return (
    <div className="space-y-4">
      <PageHeader title="Facturation" subtitle="Abonnement, lignes et numéros par carte ; minutes et jetons IA depuis le solde prépayé." />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-black">Abonnement</h2>
          {s.subscription ? (
            <p className="text-sm font-medium">
              Forfait <strong>{getPlan(s.subscription.planId).name}</strong> · renouvellement le {fmtDate(s.subscription.nextRenewalAt)} · carte •••• {s.subscription.cardLast4}
            </p>
          ) : <p className="text-sm font-medium text-harx-muted">Aucun forfait actif.</p>}
          <div className="grid gap-2">
            {PLANS.map((p) => (
              <div key={p.id} className={`rounded-xl border p-3 ${s.subscription?.planId === p.id ? 'border-harx-400 bg-harx-50' : 'border-harx-border'}`}>
                <div className="flex items-center justify-between">
                  <p className="font-black">{p.name}</p>
                  {s.subscription?.planId === p.id ? <Badge tone="good">Actuel</Badge> : <button className="btn-secondary !py-1 !text-xs" onClick={() => subscribeToPlan(p.id)}>Choisir</button>}
                </div>
                <p className="text-xs font-medium text-harx-muted">{p.groups.map((g) => FEATURE_GROUPS.find((x) => x.id === g)?.name).join(' · ')}</p>
              </div>
            ))}
          </div>
          <p className="text-xs font-medium text-harx-muted">Prix des forfaits : à définir. {totalLines(s)} ligne(s), dont {Math.max(0, totalLines(s) - 1)} facturée(s) en licence.</p>
        </section>

        <section className="card space-y-3">
          <h2 className="font-black">Solde prépayé</h2>
          <p className="text-3xl font-black" data-testid="wallet-balance">{formatEur(s.wallet.balanceUnits)}</p>
          <div className="flex flex-wrap items-center gap-2">
            {[20, 50, 100, 200].map((v) => (
              <button key={v} className={`btn ${amount === v ? 'bg-harx-500 text-white' : 'border border-harx-border bg-white'}`} aria-pressed={amount === v} onClick={() => setAmount(v)}>{v} €</button>
            ))}
            <button className="btn-primary" onClick={() => topUp(amount)}>Recharger</button>
          </div>
          <p className="text-xs font-medium text-harx-muted">Solde nul : l’appel en cours se termine, les suivants sont bloqués.</p>
        </section>
      </div>

      <section className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-black">Grille de refacturation</h2>
          <Badge tone="warn">Tarifs de démonstration</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-wider text-harx-muted"><th className="pb-2">Destination</th><th className="pb-2 text-right">Coût opérateur</th><th className="pb-2 text-right">Marge</th><th className="pb-2 text-right">Prix par minute</th></tr></thead>
            <tbody className="divide-y divide-harx-border">
              {(Object.keys(s.settings.rateCard.costPerMinute) as RateClass[]).map((c) => (
                <tr key={c}>
                  <td className="py-2 font-bold">{RATE_CLASS_LABEL[c]}</td>
                  <td className="py-2 text-right">{formatEur(Math.round(s.settings.rateCard.costPerMinute[c] * 10_000), 4)}</td>
                  <td className="py-2 text-right">{Math.round(s.settings.rateCard.marginRate * 100)} %</td>
                  <td className="py-2 text-right font-black">{formatEur(pricePerMinuteUnits(s.settings.rateCard, c), 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs font-medium text-harx-muted">Valeurs fictives à remplacer par la grille contractuelle (coûts opérateur par destination, marges prédéfinies, jetons IA).</p>
      </section>

      <Simulator />

      <section className="card space-y-3">
        <h2 className="font-black">Échec de paiement des éléments récurrents</h2>
        {dunning.stage === 'ok' ? (
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Aucun incident de paiement.</p>
        ) : (
          <Notice tone={dunning.stage === 'retrying' ? 'warn' : 'bad'}>
            <p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> Étape : {({ retrying: 'nouvelle tentative', outbound_suspended: 'sortant suspendu', release_warning: 'dernier avertissement', released: 'numéro libéré', ok: '' } as const)[dunning.stage]}</p>
            <p className="mt-1">Libération du numéro dans <strong data-testid="release-countdown">{formatCountdown(dunning.msUntilRelease ?? 0)}</strong>. Appels sortants : {dunning.outboundAllowed ? 'actifs' : 'suspendus'} · entrants : {dunning.inboundAllowed ? 'actifs' : 'coupés'}.</p>
            {dunning.nextEventLabel ? <p className="mt-1">Prochaine étape : {dunning.nextEventLabel}.</p> : null}
          </Notice>
        )}
        <div className="flex flex-wrap gap-2">
          {DATA_MODE === 'mock' ? [0, 3, 6, 7].map((d) => (
            <button key={d} className="btn-secondary !text-xs" onClick={() => setPaymentFailure(new Date(Date.now() - d * 86_400_000 - 1000))}>
              Simuler : échec il y a {d} j
            </button>
          )) : null}
          {dunning.stage !== 'ok' ? <button className="btn-primary" onClick={() => setPaymentFailure(null)}>Régulariser le paiement</button> : null}
        </div>
        <p className="text-xs font-medium text-harx-muted">Durées par défaut (à valider) : nouvelles tentatives jours 1 et 3, sortant suspendu jour 3, dernier avertissement jour 6, libération jour 7.</p>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-2 font-black">Mouvements du solde</h2>
        {s.ledger.length === 0 ? <p className="text-sm font-medium text-harx-muted">Aucun mouvement.</p> : (
          <table className="w-full text-left text-sm" data-testid="ledger">
            <tbody className="divide-y divide-harx-border">
              {s.ledger.slice(0, 30).map((l) => (
                <tr key={l.id}>
                  <td className="py-2 pr-3 text-xs font-medium text-harx-muted">{fmtDateTime(l.at)}</td>
                  <td className="py-2 pr-3 font-medium">{l.label}</td>
                  <td className={`py-2 pr-3 text-right font-black ${l.units >= 0 ? 'text-emerald-600' : 'text-slate-800'}`}>{l.units >= 0 ? '+' : ''}{formatEur(l.units, 4)}</td>
                  <td className="py-2 text-right text-xs font-medium text-harx-muted">{formatEur(l.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Simulator() {
  const { settings } = useAppState();
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [rateClass, setRateClass] = useState<RateClass>('outbound_fixed_fr');
  const [ivr, setIvr] = useState(15);
  const [queue, setQueue] = useState(45);
  const [talk, setTalk] = useState(125);
  const [transfer, setTransfer] = useState(0);

  const result = useMemo(() => {
    const legs = [
      direction === 'inbound'
        ? inboundLeg({ id: 'm', ivrSeconds: ivr, queueSeconds: queue, talkSeconds: talk })
        : outboundLeg({ id: 'm', rateClass, talkSeconds: talk }),
    ];
    if (transfer > 0) legs.push(transferLeg({ id: 't', rateClass: 'outbound_fixed_fr', talkSeconds: transfer }));
    return callCharge(settings.rateCard, legs);
  }, [direction, rateClass, ivr, queue, talk, transfer, settings.rateCard]);

  const num = (set: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => set(Math.max(0, Number(e.target.value) || 0));

  return (
    <section className="card space-y-3">
      <h2 className="font-black">Simulateur de facturation</h2>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <label className="label" htmlFor="sim-dir">Sens</label>
          <select id="sim-dir" className="input" value={direction} onChange={(e) => setDirection(e.target.value as 'inbound' | 'outbound')}>
            <option value="outbound">Sortant</option><option value="inbound">Entrant</option>
          </select>
        </div>
        {direction === 'outbound' ? (
          <div>
            <label className="label" htmlFor="sim-class">Destination</label>
            <select id="sim-class" className="input" value={rateClass} onChange={(e) => setRateClass(e.target.value as RateClass)}>
              <option value="outbound_fixed_fr">Fixe</option><option value="outbound_mobile_fr">Mobile</option>
            </select>
          </div>
        ) : (
          <>
            <div><label className="label" htmlFor="sim-ivr">Menu vocal (s)</label><input id="sim-ivr" type="number" min={0} className="input" value={ivr} onChange={num(setIvr)} /></div>
            <div><label className="label" htmlFor="sim-queue">Attente (s)</label><input id="sim-queue" type="number" min={0} className="input" value={queue} onChange={num(setQueue)} /></div>
          </>
        )}
        <div><label className="label" htmlFor="sim-talk">Conversation (s)</label><input id="sim-talk" type="number" min={0} className="input" value={talk} onChange={num(setTalk)} /></div>
        <div><label className="label" htmlFor="sim-tr">Transfert (s)</label><input id="sim-tr" type="number" min={0} className="input" value={transfer} onChange={num(setTransfer)} /></div>
      </div>
      <div className="rounded-xl bg-slate-50 p-3 text-sm font-medium" data-testid="sim-result">
        {result.legs.map((l) => (
          <p key={l.legId}>{l.kind === 'transfer' ? 'Transfert' : 'Communication'} : {l.seconds} s → <strong>{l.minutes} min</strong> · {formatEur(l.units, 4)}</p>
        ))}
        <p className="mt-1 font-black">Total : {result.minutes} min · {formatEur(result.units, 4)}</p>
      </div>
    </section>
  );
}
