import Cookies from 'js-cookie';

function registrationBase(): string {
  const raw =
    import.meta.env.VITE_REGISTRATION_BACKEND_URL ||
    import.meta.env.VITE_REGISTRATION_BACK_URL ||
    import.meta.env.VITE_REGISTRATION_API_URL ||
    '';
  return String(raw).replace(/\/$/, '');
}

function sessionUserId(): string {
  return (
    Cookies.get('userId') ||
    localStorage.getItem('userId') ||
    ''
  );
}

function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token') ||
    Cookies.get('token') ||
    Cookies.get('auth_token') ||
    '';
  const userId = sessionUserId();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { 'X-User-Id': userId } : {}),
  };
}

export type CallCenterAgent = {
  userId: string;
  agentId: string | null;
  fullName: string;
  email: string;
  phone: string;
  invitationStatus: 'none' | 'pending' | 'invited' | 'active' | string;
  mustChangePassword: boolean;
  invitedAt: string | null;
  createdAt?: string;
};

export type CreateAgentPayload = {
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sendEmail?: boolean;
};

export async function listCallCenterAgents(companyId: string): Promise<CallCenterAgent[]> {
  const userId = sessionUserId();
  const qs = new URLSearchParams({ companyId });
  if (userId) qs.set('userId', userId);
  const res = await fetch(
    `${registrationBase()}/api/call-center/agents?${qs.toString()}`,
    { headers: authHeaders() }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || 'Failed to load agents');
  }
  return Array.isArray(json.data) ? json.data : [];
}

export async function createCallCenterAgent(payload: CreateAgentPayload): Promise<{
  agent: CallCenterAgent;
  emailSent: boolean;
  emailError?: string | null;
  temporaryPassword?: string;
}> {
  const res = await fetch(`${registrationBase()}/api/call-center/agents`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || 'Failed to create agent');
  }
  return json.data;
}

export async function resendCallCenterAgentInvite(
  companyId: string,
  agentUserId: string
): Promise<{ agent: CallCenterAgent; emailSent: boolean }> {
  const res = await fetch(
    `${registrationBase()}/api/call-center/agents/${encodeURIComponent(agentUserId)}/resend-invite`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ companyId }),
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || 'Failed to resend invitation');
  }
  return json.data;
}
