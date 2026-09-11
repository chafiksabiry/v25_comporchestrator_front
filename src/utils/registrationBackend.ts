/**
 * Registration API base URL used by company MF (Agents, account settings).
 *
 * Shell login lives at:
 *   https://harx26harxconnection-dev.netlify.app/auth/signin
 * Auth MF (harx26register-dev) calls production registration API, so when
 * company Netlify still points at registrationbackend-development we remap
 * to production to match the same user store as sign-in.
 */
export function getRegistrationBackendBase(): string {
  let raw =
    import.meta.env.VITE_REGISTRATION_BACKEND_URL ||
    import.meta.env.VITE_REGISTRATION_BACK_URL ||
    import.meta.env.VITE_REGISTRATION_API_URL ||
    'https://v25registrationbackend-production.up.railway.app';

  raw = String(raw).replace(/\/$/, '').replace(/\/api$/, '');

  if (/v25registrationbackend-development\.up\.railway\.app/i.test(raw)) {
    return 'https://v25registrationbackend-production.up.railway.app';
  }

  return raw;
}
