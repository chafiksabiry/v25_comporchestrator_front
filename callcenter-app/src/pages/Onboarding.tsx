import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CreditCard, FileUp, Headphones, Loader2, Search, Wallet } from 'lucide-react';
import { ONBOARDING_STEPS, TOTAL_BUDGET_MINUTES, isValidSiren, overBudgetSteps, parseEmails, stepElapsedMs, totalElapsedMs, type OnboardingStepId } from '@/domain/onboarding';
import { PLANS, FEATURE_GROUPS, type PlanId } from '@/domain/plans';
import { TEMPLATES, type TemplateId } from '@/domain/templates';
import { formatEur } from '@/domain/billing';
import { useAppState } from '@/store/store';
import { buyNumber, chooseTemplate, completeStep, inviteAgents, saveCompany, saveQueue, saveScript, startStep, subscribeToPlan, topUp } from '@/store/actions';
import { AREA_OPTIONS, formatFrNumber, searchNumbers, type NumberCandidate } from '@/api/numbers';
import { resolveCompanyId } from '@/lib/session';
import { Badge, Notice } from '@/components/ui';
import { Softphone } from '@/features/softphone/Softphone';

function useTick() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function Onboarding() {
  const state = useAppState();
  const navigate = useNavigate();
  const now = useTick();
  const current = state.onboarding.currentStep;
  const idx = ONBOARDING_STEPS.findIndex((s) => s.id === current);

  useEffect(() => {
    startStep(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.onboarding.done) navigate('/app/dashboard', { replace: true });
  }, [state.onboarding.done, navigate]);

  const timings = state.onboarding.timings;
  const total = totalElapsedMs(timings, now);
  const over = overBudgetSteps(timings, now);
  const stepElapsed = stepElapsedMs(timings[current], now);
  const step = ONBOARDING_STEPS[idx];

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-harx-sidebar text-harx-orange"><Headphones className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-black">Votre centre d’appels en 10 minutes</h1>
            <p className="text-xs font-medium text-harx-muted">Objectif : {TOTAL_BUDGET_MINUTES} minutes dans l’application, plus 1 minute de création de compte.</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 !py-3" data-testid="onboarding-clock">
          <div>
            <p className="label !mb-0">Temps écoulé</p>
            <p className={`font-mono text-xl font-black ${total > TOTAL_BUDGET_MINUTES * 60_000 ? 'text-red-600' : ''}`}>{mmss(total)}</p>
          </div>
          <div>
            <p className="label !mb-0">Cette étape</p>
            <p className={`font-mono text-xl font-black ${stepElapsed > step.budgetMinutes * 60_000 ? 'text-amber-600' : ''}`}>
              {mmss(stepElapsed)} <span className="text-xs font-bold text-harx-muted">/ {step.budgetMinutes} min</span>
            </p>
          </div>
        </div>
      </header>

      <ol className="flex flex-wrap gap-2" aria-label="Étapes">
        {ONBOARDING_STEPS.map((s, i) => {
          const done = Boolean(timings[s.id]?.completedAt);
          const isCurrent = s.id === current;
          return (
            <li
              key={s.id}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
                isCurrent ? 'border-harx-400 bg-harx-50 text-harx-700' : done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-harx-border bg-white text-harx-muted'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
              {s.title}
              {over.includes(s.id) ? <span title="Budget de temps dépassé">⏱</span> : null}
            </li>
          );
        })}
      </ol>

      <section className="card">
        <div className="mb-5">
          <h2 className="text-lg font-black">
            {idx + 1}. {step.title}
          </h2>
          <p className="text-sm font-medium text-harx-muted">{step.hint}</p>
        </div>
        <StepBody id={current} />
      </section>
    </div>
  );
}

function StepBody({ id }: { id: OnboardingStepId }) {
  switch (id) {
    case 'company':
      return <CompanyStep />;
    case 'template':
      return <TemplateStep />;
    case 'team':
      return <TeamStep />;
    case 'plan':
      return <PlanStep />;
    case 'telephony':
      return <TelephonyStep />;
    case 'queue':
      return <QueueStep />;
    case 'test':
      return <TestStep />;
  }
}

function CompanyStep() {
  const { company } = useAppState();
  const [name, setName] = useState(company?.name ?? '');
  const [siren, setSiren] = useState(company?.siren ?? '');
  const [email, setEmail] = useState(company?.representativeEmail ?? '');
  const [docs, setDocs] = useState(company?.documents ?? []);
  const sirenOk = isValidSiren(siren);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const ok = name.trim().length > 1 && sirenOk && emailOk && docs.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="co-name">Raison sociale</label>
          <input id="co-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="co-siren">SIREN</label>
          <input id="co-siren" className="input" value={siren} onChange={(e) => setSiren(e.target.value)} placeholder="732 829 320" />
          {siren && !sirenOk ? <p className="mt-1 text-xs font-bold text-red-600">SIREN invalide (9 chiffres, clé de contrôle).</p> : null}
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="co-email">Email du représentant légal</label>
          <input id="co-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="co-docs">Justificatifs KYB (Kbis, pièce d’identité du représentant)</label>
        <label htmlFor="co-docs" className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-harx-border bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:border-harx-300">
          <FileUp className="h-5 w-5" /> Ajouter des documents
        </label>
        <input
          id="co-docs"
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => setDocs(Array.from(e.target.files ?? []).map((f) => ({ name: f.name, size: f.size })))}
        />
        {docs.length ? (
          <ul className="mt-2 space-y-1 text-sm font-medium">
            {docs.map((d) => (
              <li key={d.name} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />{d.name}</li>
            ))}
          </ul>
        ) : null}
        <p className="mt-2 text-xs font-medium text-harx-muted">Les documents sont conservés par HARX. En mode démonstration, seuls les noms de fichiers sont enregistrés.</p>
      </div>
      <button
        className="btn-primary"
        disabled={!ok}
        onClick={() => {
          saveCompany({ name: name.trim(), siren: siren.replace(/\s/g, ''), representativeEmail: email.trim(), documents: docs, kybStatus: 'submitted' });
          completeStep('company');
        }}
      >
        Continuer
      </button>
    </div>
  );
}

function TemplateStep() {
  const { templateId } = useAppState();
  const [selected, setSelected] = useState<TemplateId | null>(templateId);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t.id)}
            aria-pressed={selected === t.id}
            className={`rounded-harx border-2 p-4 text-left transition ${selected === t.id ? 'border-harx-400 bg-harx-50' : 'border-harx-border bg-white hover:border-harx-200'}`}
          >
            <p className="font-black">{t.name}</p>
            <p className="mt-1 text-sm font-medium text-harx-muted">{t.description}</p>
            {t.needsConsent ? <div className="mt-3"><Badge tone="warn">Consentement requis</Badge></div> : null}
          </button>
        ))}
      </div>
      {selected && TEMPLATES.find((t) => t.id === selected)?.needsConsent ? (
        <Notice tone="warn">
          La prospection téléphonique en France nécessite le consentement préalable du contact. Vous devrez pouvoir en apporter la preuve ; vérifiez le texte applicable (Code de la consommation) avant de lancer une campagne.
        </Notice>
      ) : null}
      <button
        className="btn-primary"
        disabled={!selected}
        onClick={() => {
          if (selected) {
            if (selected !== templateId) chooseTemplate(selected);
            completeStep('template');
          }
        }}
      >
        Continuer
      </button>
    </div>
  );
}

function TeamStep() {
  const { agents } = useAppState();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const parsed = useMemo(() => parseEmails(text), [text]);

  const invite = async () => {
    const companyId = resolveCompanyId();
    if (!companyId) return setMessage('Entreprise introuvable : reconnectez-vous.');
    setBusy(true);
    const r = await inviteAgents(companyId, parsed.valid);
    setBusy(false);
    setText('');
    setMessage(
      `${r.agents.length} invitation(s) envoyée(s)` +
        (r.failed.length ? `, ${r.failed.length} en échec (${r.failed.map((f) => f.email).join(', ')})` : '') +
        (r.skipped.length ? `, ${r.skipped.length} déjà invité(s)` : '') +
        '.'
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="emails">Adresses email des agents</label>
        <textarea
          id="emails"
          className="input min-h-[110px] font-mono"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'marie.dupont@entreprise.fr\njean.martin@entreprise.fr'}
        />
        <p className="mt-1 text-xs font-medium text-harx-muted">Une adresse par ligne, ou séparées par des virgules ou des points-virgules.</p>
      </div>
      {parsed.valid.length || parsed.invalid.length ? (
        <div className="flex flex-wrap gap-2">
          {parsed.valid.map((e) => <Badge key={e} tone="good">{e}</Badge>)}
          {parsed.invalid.map((e) => <Badge key={e} tone="bad">{e} · invalide</Badge>)}
          {parsed.duplicates.map((e) => <Badge key={`d-${e}`} tone="warn">{e} · doublon</Badge>)}
        </div>
      ) : null}
      {message ? <Notice tone="good">{message}</Notice> : null}
      {agents.length ? <p className="text-sm font-bold">{agents.length} agent(s) invité(s) : {agents.map((a) => a.email).join(', ')}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={!parsed.valid.length || busy} onClick={invite}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Envoyer les invitations
        </button>
        <button className="btn-secondary" onClick={() => completeStep('team')}>
          {agents.length ? 'Continuer' : 'Passer cette étape'}
        </button>
      </div>
    </div>
  );
}

function PlanStep() {
  const { subscription, wallet } = useAppState();
  const [plan, setPlan] = useState<PlanId>(subscription?.planId ?? 'equipe');
  const [amount, setAmount] = useState(50);
  const funded = wallet.balanceUnits > 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={Boolean(subscription)}
            onClick={() => setPlan(p.id)}
            aria-pressed={plan === p.id}
            className={`rounded-harx border-2 p-4 text-left transition disabled:cursor-default ${plan === p.id ? 'border-harx-400 bg-harx-50' : 'border-harx-border bg-white hover:border-harx-200'}`}
          >
            <p className="font-black">{p.name}</p>
            <p className="mt-1 text-sm font-medium text-harx-muted">{p.tagline}</p>
            <p className="mt-3 text-xs font-bold text-slate-600">
              {p.groups.map((g) => FEATURE_GROUPS.find((x) => x.id === g)?.name).join(' · ')}
            </p>
            <p className="mt-3 text-xs font-bold text-harx-muted">1 ligne incluse · prix à définir</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-harx border border-harx-border p-4">
          <p className="mb-2 flex items-center gap-2 font-black"><CreditCard className="h-4 w-4" /> Abonnement (carte)</p>
          {subscription ? (
            <Notice tone="good">Forfait « {PLANS.find((p) => p.id === subscription.planId)?.name} » actif — carte •••• {subscription.cardLast4}.</Notice>
          ) : (
            <>
              <p className="mb-3 text-sm font-medium text-harx-muted">L’abonnement, les lignes et les numéros se règlent par carte au début de chaque période.</p>
              <button className="btn-primary" onClick={() => subscribeToPlan(plan)}>Enregistrer une carte de démonstration</button>
            </>
          )}
        </div>
        <div className="rounded-harx border border-harx-border p-4">
          <p className="mb-2 flex items-center gap-2 font-black"><Wallet className="h-4 w-4" /> Solde prépayé</p>
          <p className="mb-3 text-sm font-medium text-harx-muted">Les minutes et les jetons IA sont débités de ce solde. Solde actuel : <strong>{formatEur(wallet.balanceUnits)}</strong></p>
          <div className="flex flex-wrap items-center gap-2">
            {[20, 50, 100].map((v) => (
              <button key={v} type="button" onClick={() => setAmount(v)} aria-pressed={amount === v} className={`btn ${amount === v ? 'bg-harx-500 text-white' : 'border border-harx-border bg-white'}`}>{v} €</button>
            ))}
            <button className="btn-primary" onClick={() => topUp(amount)}>Recharger</button>
          </div>
        </div>
      </div>

      <button className="btn-primary" disabled={!subscription || !funded} onClick={() => completeStep('plan')}>Continuer</button>
      {!subscription || !funded ? <p className="text-xs font-medium text-harx-muted">Un forfait et une première recharge sont nécessaires pour passer des appels.</p> : null}
    </div>
  );
}

function TelephonyStep() {
  const { numbers } = useAppState();
  const [area, setArea] = useState('01');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<NumberCandidate[]>([]);

  const search = async () => {
    setBusy(true);
    setResults(await searchNumbers(area));
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <Notice tone="info">
        Le numéro est acheté au moment du besoin par la structure locale de HARX et rattaché à votre ligne. Aucune attente de validation côté opérateur.
      </Notice>
      {numbers.length ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          Numéro actif : {formatFrNumber(numbers[0].e164)} — {numbers[0].label}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label" htmlFor="area">Zone</label>
              <select id="area" className="input" value={area} onChange={(e) => setArea(e.target.value)}>
                {AREA_OPTIONS.map((o) => <option key={o.prefix} value={o.prefix}>{o.label}</option>)}
              </select>
            </div>
            <button className="btn-secondary" onClick={search} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Rechercher
            </button>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-harx-border p-3">
                <div>
                  <p className="font-mono font-black">{formatFrNumber(r.e164)}</p>
                  <p className="text-xs font-medium text-harx-muted">{r.label}</p>
                </div>
                <button className="btn-primary !py-1.5" onClick={() => buyNumber(r)}>Choisir</button>
              </li>
            ))}
          </ul>
        </>
      )}
      <button className="btn-primary" disabled={!numbers.length} onClick={() => completeStep('telephony')}>Continuer</button>
    </div>
  );
}

function QueueStep() {
  const { queues, script } = useAppState();
  const queue = queues[0];
  const [name, setName] = useState(queue?.name ?? '');
  const [text, setText] = useState(script);
  if (!queue) return <Notice tone="warn">Choisissez d’abord un modèle.</Notice>;
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="q-name">Nom de la file</label>
        <input id="q-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        <p className="mt-1 text-xs font-medium text-harx-muted">
          {queue.direction === 'inbound' ? 'File entrante' : 'Campagne sortante'} · distribution : {queue.strategy === 'longest_idle' ? 'agent libre depuis le plus longtemps' : 'tour à tour'}
        </p>
      </div>
      {queue.greeting ? (
        <div>
          <p className="label">Message du menu vocal</p>
          <p className="rounded-xl bg-slate-50 p-3 text-sm font-medium">{queue.greeting}</p>
        </div>
      ) : null}
      <div>
        <label className="label" htmlFor="script">Script d’appel</label>
        <textarea id="script" className="input min-h-[170px] font-mono" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <button
        className="btn-primary"
        disabled={!name.trim() || !text.trim()}
        onClick={() => {
          saveQueue({ ...queue, name: name.trim() });
          saveScript(text);
          completeStep('queue');
        }}
      >
        Valider
      </button>
    </div>
  );
}

function TestStep() {
  const { calls } = useAppState();
  const navigate = useNavigate();
  const answered = calls.some((c) => c.answered);
  return (
    <div className="space-y-4">
      <Notice tone="info">Passez un appel de test vers votre propre téléphone, laissez-le sonner puis décrochez. Cet appel consomme du solde prépayé.</Notice>
      <Softphone />
      {answered ? <Notice tone="good">Appel de test réussi.</Notice> : null}
      <button
        className="btn-primary"
        disabled={!answered}
        onClick={() => {
          completeStep('test');
          navigate('/app/dashboard');
        }}
      >
        Terminer la mise en route
      </button>
    </div>
  );
}
