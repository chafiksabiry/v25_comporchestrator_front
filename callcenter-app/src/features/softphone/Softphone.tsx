import { useEffect, useState } from 'react';
import { Phone, PhoneForwarded, PhoneIncoming, PhoneOff } from 'lucide-react';
import { callCharge, formatEur } from '@/domain/billing';
import { useAppState } from '@/store/store';
import { inboundBlockReason, outboundBlockReason } from '@/store/selectors';
import { buildLegs, PHASE_LABEL, simulatedProvider, useActiveCall } from './callEngine';
import { Notice } from '@/components/ui';

const provider = simulatedProvider;

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export function Softphone({ defaultNumber = '' }: { defaultNumber?: string }) {
  const state = useAppState();
  const call = useActiveCall();
  const [number, setNumber] = useState(defaultNumber);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(Boolean(call));

  const agentLabel = state.agents[0] ? `${state.agents[0].firstName} ${state.agents[0].lastName}`.trim() : 'Administrateur';
  const outReason = outboundBlockReason(state);
  const inReason = inboundBlockReason(state);

  const dial = () => {
    const r = provider.placeOutbound(number.trim(), agentLabel);
    setError(r.ok ? null : r.reason);
  };
  const inbound = () => {
    const r = provider.simulateInbound(agentLabel);
    setError(r.ok ? null : r.reason);
  };

  const projection = call
    ? (() => {
        const { legs } = buildLegs(call, now);
        return callCharge(state.settings.rateCard, legs);
      })()
    : null;
  const seconds = call ? Math.max(0, Math.floor((now - call.startedAt) / 1000)) : 0;

  return (
    <div className="space-y-3" data-testid="softphone">
      {!call ? (
        <>
          <div>
            <label className="label" htmlFor="dial">Numéro à appeler</label>
            <input
              id="dial"
              className="input"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="01 23 45 67 89 ou 06 12 34 56 78"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={dial} disabled={!number.trim() || Boolean(outReason)}>
              <Phone className="h-4 w-4" /> Appeler
            </button>
            <button className="btn-secondary" onClick={inbound} disabled={Boolean(inReason)}>
              <PhoneIncoming className="h-4 w-4" /> Simuler un appel entrant
            </button>
          </div>
          {outReason ? <Notice tone="warn">{outReason}</Notice> : null}
          {error ? <Notice tone="bad">{error}</Notice> : null}
        </>
      ) : (
        <div className="space-y-3 rounded-xl border border-harx-border bg-slate-50 p-4" data-testid="active-call">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black">{call.remote}</p>
              <p className="text-xs font-bold uppercase tracking-wide text-harx-muted">
                {call.direction === 'inbound' ? 'Entrant' : 'Sortant'} · {PHASE_LABEL[call.phase]}
              </p>
            </div>
            <p className="font-mono text-xl font-black" data-testid="call-timer">
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
            </p>
          </div>
          {projection ? (
            <p className="text-xs font-medium text-slate-600" data-testid="call-projection">
              Facturation en cours : <strong>{projection.minutes} min</strong> ·{' '}
              <strong>{formatEur(projection.units, 4)}</strong>
              {call.direction === 'outbound' && call.phase === 'ringing' ? ' (la sonnerie n’est pas facturée)' : ''}
              {call.direction === 'inbound' && call.phase !== 'talking' ? ' (menu vocal et attente facturés)' : ''}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => provider.transfer()} disabled={call.phase !== 'talking' || call.transferredAt !== undefined}>
              <PhoneForwarded className="h-4 w-4" /> Transférer
            </button>
            <button className="btn-danger" onClick={() => provider.hangup()} data-testid="hangup">
              <PhoneOff className="h-4 w-4" /> Raccrocher
            </button>
          </div>
          {call.transferredAt !== undefined ? (
            <p className="text-xs font-medium text-amber-700">Transfert effectué : une seconde communication est facturée.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
