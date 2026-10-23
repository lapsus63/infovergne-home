import { useEffect, useSyncExternalStore } from 'react';

import { currentUser, startSessionWatcher, subscribe } from './keycloak';
import { ADMIN_ROLE, type SessionUser } from './types';

function getSnapshot(): SessionUser | null {
  return currentUser();
}

export function useAuth() {
  const user = useSyncExternalStore(
    (listener) => subscribe(listener),
    getSnapshot,
    () => null,
  );

  useEffect(() => startSessionWatcher(), []);

  return {
    user,
    signedIn: !!user,
    isAdmin: !!user?.roles.includes(ADMIN_ROLE),
  };
}
