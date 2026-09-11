/** Call-center workspace shares the company MF but with softer onboarding gates. */

export function isCallCenterWorkspace(): boolean {
  try {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/call-center')) {
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    return localStorage.getItem('userType') === 'call-center';
  } catch {
    return false;
  }
}

/** Company-like product surfaces (dashboard, training builder, APIs). */
export function isCompanyLikeWorkspace(): boolean {
  try {
    const type = localStorage.getItem('userType') || localStorage.getItem('role');
    if (type === 'company' || type === 'call-center' || type === 'admin') return true;
  } catch {
    /* ignore */
  }
  return isCallCenterWorkspace();
}

const DASHBOARD_PREF_KEY = 'callCenterPreferDashboard';

export function preferCallCenterDashboard(): boolean {
  if (!isCallCenterWorkspace()) return false;
  try {
    return localStorage.getItem(DASHBOARD_PREF_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPreferCallCenterDashboard(value: boolean): void {
  try {
    if (value) localStorage.setItem(DASHBOARD_PREF_KEY, 'true');
    else localStorage.removeItem(DASHBOARD_PREF_KEY);
  } catch {
    /* ignore */
  }
}
