import type { AppEntry, Category, Doc, Favorite, MediaItem, SiteSettings, Space } from './types';

const API_BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:8080/api';

let _getToken: (() => string | null) | null = null;

export function setTokenProvider(fn: () => string | null) {
  _getToken = fn;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = _getToken?.();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error((err as { message?: string }).message ?? response.statusText);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/* -------------------------------------------------------------------------------------- */
/* Spaces                                                                                 */
/* -------------------------------------------------------------------------------------- */

export const spacesApi = {
  list: () => api<Space[]>('/spaces'),
  create: (space: Space) => api<Space>('/spaces', { method: 'POST', body: JSON.stringify(space) }),
  update: (slug: string, space: Space) => api<Space>(`/spaces/${slug}`, { method: 'PUT', body: JSON.stringify(space) }),
  delete: (slug: string) => api<void>(`/spaces/${slug}`, { method: 'DELETE' }),
  getDeletionImpact: (id: string) =>
    api<{ spaceName: string; spaceType: string; docsCount: number; publishedDocsCount: number }>(`/spaces/by-id/${id}/deletion-impact`),
};

/* -------------------------------------------------------------------------------------- */
/* Docs                                                                                   */
/* -------------------------------------------------------------------------------------- */

export const docsApi = {
  listBySpace: (spaceSlug: string) => api<Doc[]>(`/docs/space/${spaceSlug}`),
  create: (doc: Doc) => api<Doc>('/docs', { method: 'POST', body: JSON.stringify(doc) }),
  update: (id: string, doc: Doc) => api<Doc>(`/docs/${id}`, { method: 'PUT', body: JSON.stringify(doc) }),
  delete: (id: string) => api<void>(`/docs/${id}`, { method: 'DELETE' }),
};

/* -------------------------------------------------------------------------------------- */
/* Apps                                                                                   */
/* -------------------------------------------------------------------------------------- */

export const appsApi = {
  list: () => api<AppEntry[]>('/apps'),
  create: (app: AppEntry) => api<AppEntry>('/apps', { method: 'POST', body: JSON.stringify(app) }),
  update: (id: string, app: AppEntry) => api<AppEntry>(`/apps/${id}`, { method: 'PUT', body: JSON.stringify(app) }),
  delete: (id: string) => api<void>(`/apps/${id}`, { method: 'DELETE' }),
};

/* -------------------------------------------------------------------------------------- */
/* Categories                                                                             */
/* -------------------------------------------------------------------------------------- */

export const categoriesApi = {
  list: () => api<Category[]>('/categories'),
  create: (name: string) => api<Category>('/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id: string, name: string, position?: number) =>
    api<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name, position }) }),
  delete: (id: string) => api<void>(`/categories/${id}`, { method: 'DELETE' }),
};

/* -------------------------------------------------------------------------------------- */
/* Favorites                                                                              */
/* -------------------------------------------------------------------------------------- */

export const favoritesApi = {
  listPublic: () => api<Favorite[]>('/favorites/public'),
  savePublic: (favorites: Favorite[]) =>
    api<Favorite[]>('/favorites/public', { method: 'PUT', body: JSON.stringify(favorites) }),
};

/* -------------------------------------------------------------------------------------- */
/* Media                                                                                  */
/* -------------------------------------------------------------------------------------- */

export const mediaApi = {
  list: () => api<MediaItem[]>('/media'),
  upload: (file: File, name: string, width: number, height: number) => {
    const token = _getToken?.();
    const form = new FormData();
    form.append('file', file);
    form.append('name', name);
    form.append('width', String(width));
    form.append('height', String(height));
    return fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({ message: r.statusText }));
        throw new Error((err as { message?: string }).message ?? r.statusText);
      }
      return r.json() as Promise<MediaItem>;
    });
  },
  delete: (id: string) => api<void>(`/media/${id}`, { method: 'DELETE' }),
};

/* -------------------------------------------------------------------------------------- */
/* Settings                                                                               */
/* -------------------------------------------------------------------------------------- */

export const settingsApi = {
  get: () => api<SiteSettings>('/settings'),
  save: (settings: SiteSettings) => api<SiteSettings>('/settings', { method: 'PUT', body: JSON.stringify(settings) }),
};

/* -------------------------------------------------------------------------------------- */
/* Search                                                                                 */
/* -------------------------------------------------------------------------------------- */

export const searchApi = {
  search: (q: string) => api<{ results: { kind: string; title: string; href: string; context: string; snippet: string; score: number }[] }>(`/search?q=${encodeURIComponent(q)}`),
};
