/** Date d'expiration (ms) d'un JWT, lue sans vérifier la signature ; null si absente ou illisible. */
export function jwtExpiryMs(token: string | null | undefined): number | null {
  if (!token) return null;
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    return typeof json?.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Vrai seulement si le jeton porte une date d'expiration déjà passée. */
export function isJwtExpired(token: string | null | undefined, now: number = Date.now()): boolean {
  const exp = jwtExpiryMs(token);
  return exp !== null && exp <= now;
}
