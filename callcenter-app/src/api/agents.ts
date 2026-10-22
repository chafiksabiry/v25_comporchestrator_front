import { DATA_MODE, authHeaders, registrationBase } from '@/lib/session';
import { nameFromEmail } from '@/domain/onboarding';
import type { Agent } from '@/store/types';
import { uid } from '@/store/store';

export interface InviteResult {
  agents: Agent[];
  failed: Array<{ email: string; message: string }>;
}

/**
 * Mode `live` : réutilise le contrat de l'API d'inscription existante (`/api/call-center/agents`,
 * déjà consommée par le micro-frontend entreprise). Le champ `phone` y est typé obligatoire côté
 * client : il est envoyé vide ici, à vérifier côté serveur (voir README).
 */
async function inviteLive(companyId: string, emails: string[]): Promise<InviteResult> {
  const agents: Agent[] = [];
  const failed: InviteResult['failed'] = [];
  for (const email of emails) {
    const { firstName, lastName } = nameFromEmail(email);
    try {
      const res = await fetch(`${registrationBase()}/api/call-center/agents`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ companyId, firstName, lastName, email, phone: '', sendEmail: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Échec de la création');
      const a = json.data?.agent ?? {};
      agents.push({
        id: String(a.userId ?? uid('agent')),
        email,
        firstName,
        lastName,
        invitationStatus: a.invitationStatus === 'active' ? 'active' : 'invited',
        invitedAt: a.invitedAt ?? new Date().toISOString(),
      });
    } catch (err) {
      failed.push({ email, message: err instanceof Error ? err.message : 'Erreur inconnue' });
    }
  }
  return { agents, failed };
}

async function inviteMock(emails: string[]): Promise<InviteResult> {
  await new Promise((r) => setTimeout(r, 250));
  return {
    agents: emails.map((email) => ({
      id: uid('agent'),
      email,
      ...nameFromEmail(email),
      invitationStatus: 'invited' as const,
      invitedAt: new Date().toISOString(),
    })),
    failed: [],
  };
}

export function inviteAgents(companyId: string, emails: string[]): Promise<InviteResult> {
  return DATA_MODE === 'live' ? inviteLive(companyId, emails) : inviteMock(emails);
}

export async function resendInvite(companyId: string, agentId: string): Promise<boolean> {
  if (DATA_MODE !== 'live') return true;
  const res = await fetch(
    `${registrationBase()}/api/call-center/agents/${encodeURIComponent(agentId)}/resend-invite`,
    { method: 'POST', headers: authHeaders(), body: JSON.stringify({ companyId }) }
  );
  return res.ok;
}
