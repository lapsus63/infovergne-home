/** Client OpenID Connect (Authorization Code + PKCE) pour Keycloak. */

import type { SessionUser } from './types';

const env = import.meta.env as Record<string, string | undefined>;

export const keycloakConfig = {
  url: (env['VITE_KEYCLOAK_URL'] ?? '').replace(/\/$/, ''),
  realm: env['VITE_KEYCLOAK_REALM'] ?? '',
  clientId: env['VITE_KEYCLOAK_CLIENT_ID'] ?? '',
};

export function keycloakReady(): boolean {
  return !!(keycloakConfig.url && keycloakConfig.realm && keycloakConfig.clientId);
}

function base() {
  return `${keycloakConfig.url}/realms/${encodeURIComponent(keycloakConfig.realm)}/protocol/openid-connect`;
}

const STORE_KEY = 'infovergne-home-session';
const VERIFIER_KEY = 'infovergne-home-pkce';

interface StoredSession {
  access_token: string;
  refresh_token?: string | undefined;
  id_token?: string | undefined;
  expires_at: number;
  user: SessionUser;
}

let session: StoredSession | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function load(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  if (!loaded) {
    loaded = true;
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      session = raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      session = null;
    }
  }
  return session;
}

function store(next: StoredSession | null) {
  session = next;
  loaded = true;
  if (typeof window !== 'undefined') {
    if (next) window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORE_KEY);
  }
  notify();
}

export function currentUser(): SessionUser | null {
  return load()?.user ?? null;
}

export function currentToken(): string | null {
  const s = load();
  if (!s) return null;
  return s.access_token;
}

function decode(token: string): Record<string, unknown> {
  const part = token.split('.')[1] ?? '';
  const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decodeURIComponent(escape(json))) as Record<string, unknown>;
}

function toUser(token: string): SessionUser {
  const claims = decode(token) as {
    sub?: string;
    name?: string;
    preferred_username?: string;
    email?: string;
    realm_access?: { roles?: string[] };
    resource_access?: Record<string, { roles?: string[] }>;
  };
  const roles = [...(claims.realm_access?.roles ?? []), ...(claims.resource_access?.[keycloakConfig.clientId]?.roles ?? [])].map((r) => r.toUpperCase());
  return {
    id: claims.sub ?? '',
    name: claims.name ?? claims.preferred_username ?? 'Utilisateur',
    email: claims.email ?? '',
    roles: [...new Set(roles)],
  };
}

/* ------------------------------ PKCE utils ----------------------------- */

function randomString(length = 64) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
}

async function challenge(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function redirectUri() {
  return `${window.location.origin}/auth/callback`;
}

/* -------------------------------- login -------------------------------- */

export async function login(returnTo = window.location.pathname + window.location.search) {
  if (!keycloakReady()) {
    // Mode démonstration : aucune fédération configurée pour l'instant.
    const demoUser: SessionUser = {
      id: 'demo',
      name: 'Utilisateur de démonstration',
      email: 'demo@lab.local',
      roles: ['ADMIN'],
    };
    store({
      access_token: `demo.${btoa(JSON.stringify(demoUser))}`,
      expires_at: Date.now() + 12 * 3600 * 1000,
      user: demoUser,
    });
    return;
  }
  const verifier = randomString();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem('infovergne-home-return', returnTo);
  const params = new URLSearchParams({
    client_id: keycloakConfig.clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid profile email',
    code_challenge: await challenge(verifier),
    code_challenge_method: 'S256',
    state: randomString(16),
  });
  window.location.assign(`${base()}/auth?${params.toString()}`);
}

export async function completeLogin(code: string): Promise<string> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY) ?? '';
  const response = await fetch(`${base()}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: keycloakConfig.clientId,
      redirect_uri: redirectUri(),
      code,
      code_verifier: verifier,
    }),
  });
  if (!response.ok) throw new Error('Échec de la connexion');
  const tokens = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in: number;
  };
  store({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    id_token: tokens.id_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
    user: toUser(tokens.access_token),
  });
  sessionStorage.removeItem(VERIFIER_KEY);
  const back = sessionStorage.getItem('infovergne-home-return') ?? '/';
  sessionStorage.removeItem('infovergne-home-return');
  return back;
}

/* ------------------------- rafraîchissement doux ------------------------ */

let refreshing: Promise<boolean> | null = null;

export async function refresh(): Promise<boolean> {
  const s = load();
  if (!s || !keycloakReady()) return !!s;
  if (!s.refresh_token) return false;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const response = await fetch(`${base()}/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: keycloakConfig.clientId,
          refresh_token: s.refresh_token!,
        }),
      });
      if (!response.ok) {
        store(null);
        return false;
      }
      const tokens = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        id_token?: string;
        expires_in: number;
      };
      store({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? s.refresh_token,
        id_token: tokens.id_token ?? s.id_token,
        expires_at: Date.now() + tokens.expires_in * 1000,
        user: toUser(tokens.access_token),
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Renouvelle le jeton s'il expire bientôt et que l'onglet est visible. */
export async function ensureFreshToken(): Promise<string | null> {
  const s = load();
  if (!s) return null;
  const soon = s.expires_at - Date.now() < 60_000;
  if (soon) {
    const ok = await refresh();
    if (!ok) return null;
  }
  return load()?.access_token ?? null;
}

export function startSessionWatcher() {
  if (typeof window === 'undefined') return () => {};
  const tick = () => {
    if (document.visibilityState !== 'visible') return;
    void ensureFreshToken();
  };
  const timer = window.setInterval(tick, 60_000);
  document.addEventListener('visibilitychange', tick);
  window.addEventListener('focus', tick);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', tick);
    window.removeEventListener('focus', tick);
  };
}

export function logout() {
  const s = load();
  store(null);
  if (!keycloakReady()) {
    window.location.assign('/');
    return;
  }
  const params = new URLSearchParams({
    client_id: keycloakConfig.clientId,
    post_logout_redirect_uri: window.location.origin,
  });
  if (s?.id_token) params.set('id_token_hint', s.id_token);
  window.location.assign(`${base()}/logout?${params.toString()}`);
}
