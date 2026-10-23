import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { canWriteSpace, isAdmin, type AppEntry, type Doc, type Favorite, type MediaItem, type SiteSettings, type Space } from './types';

async function currentUser() {
  const { readUser } = await import('./auth.server');
  return readUser(getRequest());
}

async function requireAdminUser() {
  const user = await currentUser();
  if (!isAdmin(user)) throw new Error('Accès réservé aux administrateurs');
  return user!;
}

export const getAdminData = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await import('./db.server');
  const user = await currentUser();
  if (!user) throw new Error('Connexion requise');
  const [spaces, docs, apps, media, favorites, backups, settings] = await Promise.all([
    db.listSpaces(),
    db.listDocs(),
    db.listApps(),
    db.listMedia(),
    db.listFavorites(),
    db.listBackups(),
    db.getSettings(),
  ]);
  const admin = isAdmin(user);
  const writable = spaces.filter((s) => canWriteSpace(s, user));
  const writableSlugs = new Set(writable.map((s) => s.slug));
  return {
    user,
    admin,
    spaces: admin ? spaces : writable,
    docs: admin ? docs : docs.filter((d) => writableSlugs.has(d.space_slug)),
    apps: admin ? apps : [],
    media,
    favorites: admin ? favorites.filter((f) => f.user_id === null) : [],
    backups: admin ? backups : [],
    settings,
    memoryMode: db.memoryMode(),
  };
});

export const saveSpace = createServerFn({ method: 'POST' })
  .inputValidator((data: { space: Space }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    await db.upsertRow('spaces', { ...data.space });
    return { ok: true };
  });

export const removeSpace = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    await db.deleteRow('spaces', data.id);
    return { ok: true };
  });

export const saveDoc = createServerFn({ method: 'POST' })
  .inputValidator((data: { doc: Doc }) => data)
  .handler(async ({ data }) => {
    const db = await import('./db.server');
    const user = await currentUser();
    const spaces = await db.listSpaces();
    const space = spaces.find((s) => s.slug === data.doc.space_slug);
    if (!space || !canWriteSpace(space, user)) throw new Error('Droits de rédaction manquants');

    const existing = (await db.listDocs()).find((d) => d.id === data.doc.id);
    if (existing && existing.slug !== data.doc.slug) {
      await db.upsertRow('slug_redirects', {
        id: `${existing.space_slug}:${existing.slug}`,
        kind: space.type,
        space_slug: existing.space_slug,
        old_slug: existing.slug,
        new_slug: data.doc.slug,
      });
    }
    await db.upsertRow('docs', { ...data.doc, updated_at: new Date().toISOString() });
    return { ok: true };
  });

export const removeDoc = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const db = await import('./db.server');
    const user = await currentUser();
    const doc = (await db.listDocs()).find((d) => d.id === data.id);
    if (!doc) return { ok: true };
    const space = (await db.listSpaces()).find((s) => s.slug === doc.space_slug);
    if (!space || !canWriteSpace(space, user)) throw new Error('Droits de rédaction manquants');
    await db.deleteRow('docs', data.id);
    return { ok: true };
  });

export const saveApp = createServerFn({ method: 'POST' })
  .inputValidator((data: { app: AppEntry }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    const existing = (await db.listApps()).find((app) => app.id === data.app.id);
    const app: AppEntry = {
      id: data.app.id,
      name: data.app.name,
      description: data.app.description,
      category: data.app.category,
      url: data.app.url,
      tags: data.app.tags,
      container_name: data.app.container_name,
      visibility: data.app.visibility,
      allowed_roles: data.app.allowed_roles,
      state: existing?.state ?? 'unknown',
      state_at: existing?.state_at ?? new Date().toISOString(),
    };
    await db.upsertRow('apps', app);
    return { ok: true };
  });

export const removeApp = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    await db.deleteRow('apps', data.id);
    return { ok: true };
  });

export const savePublicFavorites = createServerFn({ method: 'POST' })
  .inputValidator((data: { favorites: Omit<Favorite, 'user_id'>[] }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    await db.deleteFavoritesFor(null);
    let position = 1;
    for (const fav of data.favorites) {
      await db.upsertRow('favorites', { ...fav, user_id: null, position: position++ });
    }
    return { ok: true };
  });

export const saveSiteSettings = createServerFn({ method: 'POST' })
  .inputValidator((data: { settings: SiteSettings }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    await db.saveSettings(data.settings);
    return { ok: true };
  });

export const addMedia = createServerFn({ method: 'POST' })
  .inputValidator((data: { item: MediaItem }) => data)
  .handler(async ({ data }) => {
    const user = await currentUser();
    if (!user) throw new Error('Connexion requise');
    const db = await import('./db.server');
    await db.upsertRow('media', { ...data.item });
    return { ok: true };
  });

export const removeMedia = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await currentUser();
    if (!user) throw new Error('Connexion requise');
    const db = await import('./db.server');
    await db.deleteRow('media', data.id);
    return { ok: true };
  });

export const previewMarkdown = createServerFn({ method: 'POST' })
  .inputValidator((data: { body: string }) => data)
  .handler(async ({ data }) => {
    const user = await currentUser();
    if (!user) throw new Error('Connexion requise');
    const { renderDocument } = await import('./render.server');
    return renderDocument(data.body);
  });
