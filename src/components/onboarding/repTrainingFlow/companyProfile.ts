import axios from 'axios';
import Cookies from 'js-cookie';

const COMPANY_API = 'https://v25searchcompanywizardbackend-production.up.railway.app/api/companies';

export function getCompanyIdFromCookies(): string | undefined {
  return Cookies.get('companyId') || localStorage.getItem('companyId') || undefined;
}

export async function fetchCompanyProfile(companyId: string): Promise<{ name?: string; industry?: string } | null> {
  try {
    const d = await fetchCompanyRaw(companyId);
    if (!d) return null;
    return { name: d.name, industry: d.industry };
  } catch {
    return null;
  }
}

/** Full company payload (for legacy id / training backend compatibility). */
export async function fetchCompanyRaw(companyId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await axios.get(`${COMPANY_API}/${companyId}`);
    const d = (res.data?.data ?? res.data) as Record<string, unknown> | null;
    return d && typeof d === 'object' ? d : null;
  } catch {
    return null;
  }
}
