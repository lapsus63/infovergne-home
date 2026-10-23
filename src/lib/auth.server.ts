import { createRemoteJWKSet, jwtVerify } from 'jose';

import { ADMIN_ROLE, type SessionUser } from './types';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export function keycloakConfigured(): boolean {
  return !!process.env['KEYCLOAK_ISSUER'];
}

function getJwks() {
  const issuer = process.env['KEYCLOAK_ISSUER'];
  if (!issuer) return null;
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${issuer.replace(/\/$/, '')}/protocol/openid-connect/certs`));
  return jwks;
}

interface KeycloakClaims {
  sub?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
}

/**
 * Lit l'utilisateur à partir de l'en-tête Authorization.
 * Sans Keycloak configuré, un mode démonstration local est accepté
 * afin que le site reste utilisable avant le branchement du realm.
 */
export async function readUser(request: Request): Promise<SessionUser | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;

  if (!keycloakConfigured()) {
    if (!token.startsWith('demo.')) return null;
    try {
      const payload = JSON.parse(atob(token.slice(5))) as SessionUser;
      return { id: payload.id, name: payload.name, email: payload.email, roles: payload.roles ?? [] };
    } catch {
      return null;
    }
  }

  const keys = getJwks();
  if (!keys) return null;
  try {
    const issuer = process.env['KEYCLOAK_ISSUER']!.replace(/\/$/, '');
    const { payload } = await jwtVerify(token, keys, { issuer });
    const claims = payload as KeycloakClaims;
    const realmRoles = claims.realm_access?.roles ?? [];
    const clientId = process.env['KEYCLOAK_CLIENT_ID'] ?? '';
    const clientRoles = clientId ? (claims.resource_access?.[clientId]?.roles ?? []) : [];
    const roles = [...new Set([...realmRoles, ...clientRoles].map((r) => r.toUpperCase()))];
    return {
      id: claims.sub ?? '',
      name: claims.name ?? claims.preferred_username ?? 'Utilisateur',
      email: claims.email ?? '',
      roles,
    };
  } catch (error) {
    console.error('[auth] jeton refusé', error);
    return null;
  }
}

export function requireAdmin(user: SessionUser | null): SessionUser {
  if (!user || !user.roles.includes(ADMIN_ROLE)) throw new Error('Accès refusé');
  return user;
}
