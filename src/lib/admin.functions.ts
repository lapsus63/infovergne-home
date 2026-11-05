/**
 * Couche de compatibilité : redirige les appels vers le backend Spring Boot via api-client.ts.
 * Les server functions TanStack Start sont conservées pour le mode mémoire (démo sans base).
 */
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { appsApi, categoriesApi, docsApi, favoritesApi, mediaApi, settingsApi, spacesApi } from './api-client';
import { canWriteSpace, isAdmin, type AppEntry, type Category, type Doc, type Favorite, type MediaItem, type SiteSettings, type Space } from './types';

async function currentUser() {
  const { readUser } = await import('./auth.server');
  return readUser(getRequest());
}

async function requireAdminUser() {
  const user = await currentUser();
  if (!isAdmin(user)) throw new Error('Accès réservé aux administrateurs');
  return user!;
}

/* -------------------------------------------------------------------------------------- */
/* Données admin (lecture initiale — conserve l'accès direct DB pour le mode mémoire/démo)*/
/* -------------------------------------------------------------------------------------- */

export const getAdminData = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await import('./db.server');
  const user = await currentUser();
  if (!user) throw new Error('Connexion requise');
  const [spaces, docs, apps, media, favorites, backups, settings, categories] = await Promise.all([
    db.listSpaces(),
    db.listDocs(),
    db.listApps(),
    db.listMedia(),
    db.listFavorites(),
    db.listBackups(),
    db.getSettings(),
    db.listCategories(),
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
    categories: admin
      ? categories
          .map((c) => ({
            ...c,
            apps_count: apps.filter((a) => a.category === c.name).length,
            favorites_count: favorites.filter((f) => f.category === c.name).length,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
      : [],
    backups: admin ? backups : [],
    settings,
    memoryMode: db.memoryMode(),
  };
});

/* -------------------------------------------------------------------------------------- */
/* Espaces                                                                                */
/* -------------------------------------------------------------------------------------- */

export const saveSpace = createServerFn({ method: 'POST' })
  .inputValidator((data: { space: Space }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    if (db.memoryMode()) {
      await db.upsertRow('spaces', { ...data.space });
      return { ok: true };
    }
    const existing = (await db.listSpaces()).find((s) => s.id === data.space.id);
    if (existing) {
      await spacesApi.update(existing.slug, data.space);
    } else {
      await spacesApi.create(data.space);
    }
    return { ok: true };
  });

export const removeSpace = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    const spaces = await db.listSpaces();
    const space = spaces.find((s) => s.id === data.id);
    if (!space) throw new Error('Espace introuvable');
    if (db.memoryMode()) {
      const docs = await db.listDocs();
      const linked = docs.filter((d) => d.space_slug === space.slug);
      for (const doc of linked) await db.deleteRow('docs', doc.id);
      await db.deleteRow('spaces', data.id);
      return { ok: true, deletedDocs: linked.length };
    }
    const impact = await spacesApi.getDeletionImpact(data.id);
    await spacesApi.delete(space.slug);
    return { ok: true, deletedDocs: impact.docsCount };
  });

export const getSpaceDeletionImpact = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    if (db.memoryMode()) {
      const spaces = await db.listSpaces();
      const space = spaces.find((s) => s.id === data.id);
      if (!space) throw new Error('Espace introuvable');
      const docs = await db.listDocs();
      const linked = docs.filter((d) => d.space_slug === space.slug);
      return { spaceName: space.name, spaceType: space.type, docsCount: linked.length, publishedDocsCount: linked.filter((d) => d.status === 'published').length };
    }
    return spacesApi.getDeletionImpact(data.id);
  });

/* -------------------------------------------------------------------------------------- */
/* Documents                                                                              */
/* -------------------------------------------------------------------------------------- */

export const saveDoc = createServerFn({ method: 'POST' })
  .inputValidator((data: { doc: Doc }) => data)
  .handler(async ({ data }) => {
    const db = await import('./db.server');
    const user = await currentUser();
    const spaces = await db.listSpaces();
    const space = spaces.find((s) => s.slug === data.doc.space_slug);
    if (!space || !canWriteSpace(space, user)) throw new Error('Droits de rédaction manquants');
    if (db.memoryMode()) {
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
    }
    const existing = (await db.listDocs()).find((d) => d.id === data.doc.id);
    if (existing) {
      await docsApi.update(data.doc.id, data.doc);
    } else {
      await docsApi.create(data.doc);
    }
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
    if (db.memoryMode()) {
      await db.deleteRow('docs', data.id);
      return { ok: true };
    }
    await docsApi.delete(data.id);
    return { ok: true };
  });

/* -------------------------------------------------------------------------------------- */
/* Applications                                                                           */
/* -------------------------------------------------------------------------------------- */

export const saveApp = createServerFn({ method: 'POST' })
  .inputValidator((data: { app: AppEntry }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    if (db.memoryMode()) {
      const existing = (await db.listApps()).find((a) => a.id === data.app.id);
      const app: AppEntry = { ...data.app, state: existing?.state ?? 'unknown', state_at: existing?.state_at ?? new Date().toISOString() };
      await db.upsertRow('apps', app as unknown as Record<string, unknown> & { id: string });
      return { ok: true };
    }
    const existing = (await db.listApps()).find((a) => a.id === data.app.id);
    if (existing) {
      await appsApi.update(data.app.id, data.app);
    } else {
      await appsApi.create(data.app);
    }
    return { ok: true };
  });

export const removeApp = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    if (db.memoryMode()) {
      await db.deleteRow('apps', data.id);
      return { ok: true };
    }
    await appsApi.delete(data.id);
    return { ok: true };
  });

/* -------------------------------------------------------------------------------------- */
/* Catégories                                                                             */
/* -------------------------------------------------------------------------------------- */

export const saveCategory = createServerFn({ method: 'POST' })
  .inputValidator((data: { category: Category; oldName?: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    if (db.memoryMode()) {
      await db.renameCategoryCascade(data.category.id, data.oldName ?? data.category.name, data.category.name, data.category.position);
      return { ok: true };
    }
    const existing = (await db.listCategories()).find((c) => c.id === data.category.id);
    if (existing) {
      await categoriesApi.update(data.category.id, data.category.name, data.category.position);
    } else {
      await categoriesApi.create(data.category.name);
    }
    return { ok: true };
  });

export const removeCategory = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; name: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    if (db.memoryMode()) {
      const [apps, favorites] = await Promise.all([db.listApps(), db.listFavorites()]);
      const appsCount = apps.filter((a) => a.category === data.name).length;
      const favsCount = favorites.filter((f) => f.category === data.name).length;
      if (appsCount > 0 || favsCount > 0) {
        throw new Error(`Impossible de supprimer la catégorie « ${data.name} » : elle est utilisée par ${appsCount} application(s) et ${favsCount} favori(s).`);
      }
      await db.deleteCategoryCascade(data.id, data.name);
      return { ok: true };
    }
    await categoriesApi.delete(data.id);
    return { ok: true };
  });

/* -------------------------------------------------------------------------------------- */
/* Favoris publics                                                                        */
/* -------------------------------------------------------------------------------------- */

export const savePublicFavorites = createServerFn({ method: 'POST' })
  .inputValidator((data: { favorites: Omit<Favorite, 'user_id'>[] }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    if (db.memoryMode()) {
      await db.deleteFavoritesFor(null);
      let position = 1;
      for (const fav of data.favorites) {
        await db.upsertRow('favorites', { ...fav, user_id: null, position: position++ });
      }
      return { ok: true };
    }
    await favoritesApi.savePublic(data.favorites.map((f, i) => ({ ...f, user_id: null, position: i + 1 })));
    return { ok: true };
  });

/* -------------------------------------------------------------------------------------- */
/* Paramètres                                                                             */
/* -------------------------------------------------------------------------------------- */

export const saveSiteSettings = createServerFn({ method: 'POST' })
  .inputValidator((data: { settings: SiteSettings }) => data)
  .handler(async ({ data }) => {
    await requireAdminUser();
    const db = await import('./db.server');
    if (db.memoryMode()) {
      await db.saveSettings(data.settings);
      return { ok: true };
    }
    await settingsApi.save(data.settings);
    return { ok: true };
  });

/* -------------------------------------------------------------------------------------- */
/* Médias                                                                                 */
/* -------------------------------------------------------------------------------------- */

export const addMedia = createServerFn({ method: 'POST' })
  .inputValidator((data: { item: MediaItem }) => data)
  .handler(async ({ data }) => {
    const user = await currentUser();
    if (!user) throw new Error('Connexion requise');
    const db = await import('./db.server');
    // Les médias sont toujours stockés via db.server (data URL en mode mémoire,
    // ou via l'endpoint multipart côté backend pour les vrais fichiers)
    await db.upsertRow('media', { ...data.item });
    return { ok: true };
  });

export const removeMedia = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const user = await currentUser();
    if (!user) throw new Error('Connexion requise');
    const db = await import('./db.server');
    if (db.memoryMode()) {
      await db.deleteRow('media', data.id);
      return { ok: true };
    }
    await mediaApi.delete(data.id);
    return { ok: true };
  });

/* -------------------------------------------------------------------------------------- */
/* Preview markdown                                                                       */
/* -------------------------------------------------------------------------------------- */

export const previewMarkdown = createServerFn({ method: 'POST' })
  .inputValidator((data: { body: string }) => data)
  .handler(async ({ data }) => {
    const user = await currentUser();
    if (!user) throw new Error('Connexion requise');
    const { renderDocument } = await import('./render.server');
    return renderDocument(data.body);
  });
