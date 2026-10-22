import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BookText, CalendarClock, CreditCard, Gauge, Headphones, Hash, ListOrdered, Lock, PhoneCall, RotateCcw, Sparkles, Users,
} from 'lucide-react';
import { balanceLevel, formatEur, pricePerMinuteUnits } from '@/domain/billing';
import { formatCountdown } from '@/domain/dunning';
import { hasFeature, type FeatureGroupId } from '@/domain/plans';
import { DATA_MODE } from '@/lib/session';
import { resetState, useAppState } from '@/store/store';
import { currentDunning } from '@/store/selectors';
import { Notice } from '@/components/ui';

const NAV: Array<{ to: string; label: string; icon: typeof Gauge; group: FeatureGroupId }> = [
  { to: '/app/dashboard', label: 'Tableau de bord', icon: Gauge, group: 'A' },
  { to: '/app/calls', label: 'Appels', icon: PhoneCall, group: 'B' },
  { to: '/app/agents', label: 'Agents', icon: Users, group: 'A' },
  { to: '/app/queues', label: 'Files d’attente', icon: ListOrdered, group: 'B' },
  { to: '/app/planning', label: 'Planning', icon: CalendarClock, group: 'D' },
  { to: '/app/numbers', label: 'Numéros et lignes', icon: Hash, group: 'B' },
  { to: '/app/scripts', label: 'Scripts', icon: BookText, group: 'C' },
  { to: '/app/quality', label: 'Qualité et IA', icon: Sparkles, group: 'E' },
  { to: '/app/billing', label: 'Facturation', icon: CreditCard, group: 'A' },
];

export default function AppLayout() {
  const state = useAppState();
  const navigate = useNavigate();
  const level = balanceLevel(state.wallet, pricePerMinuteUnits(state.settings.rateCard, 'outbound_fixed_fr'));
  const dunning = currentDunning(state);

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 flex-col bg-harx-sidebar text-white md:flex">
        <div className="flex items-center gap-2 px-5 py-6">
          <Headphones className="h-6 w-6 text-harx-orange" />
          <div>
            <p className="text-sm font-black leading-tight">HARX Call Center</p>
            <p className="text-[11px] font-medium text-slate-400">{state.company?.name ?? '—'}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {NAV.map(({ to, label, icon: Icon, group }) => {
            const locked = !hasFeature(state.subscription?.planId, group);
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
                    isActive ? 'bg-gradient-harx text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{label}</span>
                {locked ? <Lock className="h-3.5 w-3.5 opacity-60" /> : null}
              </NavLink>
            );
          })}
        </nav>
        {DATA_MODE === 'mock' ? (
          <button
            className="m-3 flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-400 hover:bg-white/5 hover:text-white"
            onClick={() => {
              if (window.confirm('Réinitialiser toutes les données de démonstration ?')) {
                resetState();
                navigate('/onboarding');
              }
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser la démo
          </button>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-harx-border bg-white px-6 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-harx-muted">
            {DATA_MODE === 'mock' ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">Mode démonstration</span> : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Connecté aux API HARX</span>}
          </div>
          <button
            onClick={() => navigate('/app/billing')}
            data-testid="wallet-chip"
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-black ${
              level === 'empty' ? 'border-red-200 bg-red-50 text-red-700' : level === 'low' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-harx-border bg-white'
            }`}
          >
            <CreditCard className="h-4 w-4" /> Solde {formatEur(state.wallet.balanceUnits)}
          </button>
        </header>

        {dunning.stage !== 'ok' ? (
          <div className="px-6 pt-4">
            <Notice tone={dunning.stage === 'retrying' ? 'warn' : 'bad'}>
              <strong>Échec de paiement.</strong>{' '}
              {dunning.stage === 'released'
                ? 'Le numéro a été libéré.'
                : `Numéro libéré dans ${formatCountdown(dunning.msUntilRelease ?? 0)}.`}
              {!dunning.outboundAllowed && dunning.stage !== 'released' ? ' Appels sortants suspendus.' : ''}{' '}
              <button className="underline" onClick={() => navigate('/app/billing')}>Régulariser</button>
            </Notice>
          </div>
        ) : null}
        {level === 'empty' ? (
          <div className="px-6 pt-4"><Notice tone="bad">Solde épuisé : les nouveaux appels sont bloqués. Les appels en cours se terminent normalement.</Notice></div>
        ) : level === 'low' ? (
          <div className="px-6 pt-4"><Notice tone="warn">Solde bas : rechargez avant d’être à zéro.</Notice></div>
        ) : null}

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
