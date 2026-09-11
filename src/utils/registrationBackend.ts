/**
 * Registration API base URL.
 * Dev Netlify sometimes points at registrationbackend-development, but shell
 * logins (and databases.txt) use production users — remap so Agents/settings work.
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
