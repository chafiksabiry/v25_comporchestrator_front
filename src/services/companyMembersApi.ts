import Cookies from 'js-cookie';
import { getRegistrationBackendBase } from '../utils/registrationBackend';
import type { PermissionMap, PresetId } from '../constants/companyPermissions';

function sessionUserId(): string {
  return Cookies.get('userId') || localStorage.getItem('userId') || '';
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

export type CompanyMember = {
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  isOwner: boolean;
  preset: PresetId;
  status: 'pending' | 'invited' | 'active' | string;
  permissions: PermissionMap;
  invitedAt?: string | null;
};

export type CompanyAccess = {
  isOwner: boolean;
  companyId: string | null;
  permissions: PermissionMap;
  preset: string | null;
};

async function parse(res: Response) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || 'Request failed');
  }
  return json;
}

export async function getMyCompanyAccess(): Promise<CompanyAccess | null> {
  const userId = sessionUserId();
  if (!userId) return null;
  const res = await fetch(`${getRegistrationBackendBase()}/api/company-members/me?userId=${encodeURIComponent(userId)}`, {
    headers: authHeaders(),
  });
  const json = await parse(res);
  return json.data || null;
}

export async function listCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const userId = sessionUserId();
  const qs = new URLSearchParams({ companyId });
  if (userId) qs.set('userId', userId);
  const res = await fetch(`${getRegistrationBackendBase()}/api/company-members?${qs.toString()}`, {
    headers: authHeaders(),
  });
  const json = await parse(res);
  return Array.isArray(json.data) ? json.data : [];
}

export async function inviteCompanyMember(payload: {
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  preset: string;
  permissions: PermissionMap;
}): Promise<{ member: CompanyMember; emailSent: boolean; emailError?: string | null; temporaryPassword?: string }> {
  const res = await fetch(`${getRegistrationBackendBase()}/api/company-members`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const json = await parse(res);
  return json.data;
}

export async function reinviteCompanyMember(
  companyId: string,
  userId: string,
  email?: string
): Promise<{ member: CompanyMember; emailSent: boolean; emailError?: string | null; temporaryPassword?: string }> {
  const res = await fetch(`${getRegistrationBackendBase()}/api/company-members/${userId}/reinvite`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ companyId, ...(email ? { email } : {}) }),
  });
  const json = await parse(res);
  return json.data;
}

export async function updateCompanyMember(
  companyId: string,
  userId: string,
  payload: { preset: string; permissions: PermissionMap }
): Promise<CompanyMember> {
  const qs = new URLSearchParams({ companyId });
  const res = await fetch(
    `${getRegistrationBackendBase()}/api/company-members/${userId}?${qs.toString()}`,
    {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ companyId, ...payload }),
    }
  );
  const json = await parse(res);
  return json.data;
}

export async function removeCompanyMember(companyId: string, userId: string): Promise<void> {
  const qs = new URLSearchParams({ companyId });
  const caller = sessionUserId();
  if (caller) qs.set('userId', caller);
  const res = await fetch(
    `${getRegistrationBackendBase()}/api/company-members/${userId}?${qs.toString()}`,
    { method: 'DELETE', headers: authHeaders() }
  );
  await parse(res);
}
