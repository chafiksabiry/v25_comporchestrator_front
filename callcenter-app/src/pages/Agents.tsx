import { useMemo, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { parseEmails } from '@/domain/onboarding';
import { resendInvite } from '@/api/agents';
import { resolveCompanyId } from '@/lib/session';
import { useAppState } from '@/store/store';
import { inviteAgents } from '@/store/actions';
import { Badge, Empty, Notice, PageHeader } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';

export default function Agents() {
  const { agents } = useAppState();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const parsed = useMemo(() => parseEmails(text), [text]);

  const invite = async () => {
    const companyId = resolveCompanyId();
    if (!companyId) return;
    setBusy(true);
    const r = await inviteAgents(companyId, parsed.valid);
    setBusy(false);
    setText('');
    setMessage(`${r.agents.length} invitation(s) envoyée(s)${r.failed.length ? `, ${r.failed.length} en échec` : ''}${r.skipped.length ? `, ${r.skipped.length} déjà invité(s)` : ''}.`);
  };

  return (
    <div>
      <PageHeader title="Agents" subtitle="Invitez vos agents par adresse email." />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="card h-fit space-y-3">
          <label className="label" htmlFor="agent-emails">Adresses email</label>
          <textarea id="agent-emails" className="input min-h-[120px] font-mono" value={text} onChange={(e) => setText(e.target.value)} placeholder="prenom.nom@entreprise.fr" />
          {parsed.invalid.length ? <p className="text-xs font-bold text-red-600">Invalide(s) : {parsed.invalid.join(', ')}</p> : null}
          <button className="btn-primary w-full" disabled={!parsed.valid.length || busy} onClick={invite}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Inviter {parsed.valid.length || ''}
          </button>
          {message ? <Notice tone="good">{message}</Notice> : null}
        </section>
        <section className="card overflow-x-auto">
          {agents.length === 0 ? (
            <Empty title="Aucun agent invité" />
          ) : (
            <table className="w-full text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wider text-harx-muted"><th className="pb-2">Agent</th><th className="pb-2">Statut</th><th className="pb-2">Invité le</th><th /></tr></thead>
              <tbody className="divide-y divide-harx-border">
                {agents.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2"><p className="font-bold">{`${a.firstName} ${a.lastName}`.trim() || '—'}</p><p className="text-xs text-harx-muted">{a.email}</p></td>
                    <td className="py-2"><Badge tone={a.invitationStatus === 'active' ? 'good' : 'warn'}>{a.invitationStatus === 'active' ? 'Actif' : 'Invitation envoyée'}</Badge></td>
                    <td className="py-2 text-xs font-medium">{fmtDateTime(a.invitedAt)}</td>
                    <td className="py-2 text-right">
                      {a.invitationStatus !== 'active' ? (
                        <button className="btn-secondary !py-1.5 !text-xs" onClick={() => void resendInvite(resolveCompanyId() ?? '', a.id)}>Renvoyer</button>
                      ) : null}
                    </td>
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
