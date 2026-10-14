import { useEffect, useState } from 'react';
import { getMyCompanyAccess } from '../services/companyMembersApi';

type MemberAccess = { isOwner: boolean; permissions: Record<string, boolean> } | null;

let cached: MemberAccess | undefined;
let inFlight: Promise<MemberAccess> | null = null;

function fetchMemberAccess(): Promise<MemberAccess> {
  if (cached !== undefined) return Promise.resolve(cached);
  if (!inFlight) {
    inFlight = getMyCompanyAccess()
      .then((access) => {
        cached = access ? { isOwner: access.isOwner, permissions: access.permissions || {} } : null;
        return cached;
      })
      .catch(() => {
        cached = null;
        return cached;
      });
  }
  return inFlight;
}

/**
 * AUTH-11: same gating MasterSidebar already uses to hide whole sections
 * for a "lecture seule" member — reused here to hide/disable individual
 * create/edit/delete actions. Fails open (true) for the owner, for a
 * member with no restriction on that key, and while access hasn't loaded
 * yet or the lookup failed — matches the sidebar's own fail-open rule, so
 * a transient error never locks the owner out of their own actions.
 */
export function useCompanyPermission(permissionKey: string): boolean {
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMemberAccess().then((access) => {
      if (cancelled) return;
      if (!access || access.isOwner || !access.permissions) {
        setAllowed(true);
        return;
      }
      setAllowed(Boolean(access.permissions[permissionKey]));
    });
    return () => {
      cancelled = true;
    };
  }, [permissionKey]);

  return allowed;
}
