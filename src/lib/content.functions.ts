import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { canRead, canWriteSpace, isAdmin, type AppEntry, type Doc, type Favorite, type SessionUser, type Space } from './types';

export interface PublicDoc extends Omit<Doc, 'body'> {
  href: string;
  space_name: string;
  space_type: 'wiki' | 'blog';
}

async function context() {
  const { readUser } = await import('./auth.server');
  const request = getRequest();
  const user = await readUser(request);
  return { user };
}

function visibleDocs(docs: Doc[], spaces: Space[], user: SessionUser | null, includeDrafts = false) {
  const spaceBySlug = new Map(spaces.map((s) => [s.slug, s]));
  return docs.filter((doc) => {
    const space = spaceBySlug.get(doc.space_slug);
    if (!space || !canRead(space, user)) return false;
    if (!canRead(doc, user)) return false;
    if (doc.status === 'published') return true;
    if (!includeDrafts) return false;
    return isAdmin(user) || canWriteSpace(space, user);
  });
}

function toPublic(doc: Doc, spaces: Space[]): PublicDoc {
  const space = spaces.find((s) => s.slug === doc.space_slug)!;
  const { body: _body, ...rest } = doc;
  return {
    ...rest,
    space_name: space?.name ?? doc.space_slug,
    space_type: space?.type ?? 'wiki',
    href: `/${space?.type === 'blog' ? 'blog' : 'wiki'}/${doc.space_slug}/${doc.slug}`,
  };
}

/* ------------------------------ session ------------------------------ */

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { keycloakConfigured } = await import('./auth.server');
  const { databaseConfigured } = await import('./db.server');
  const { user } = await context();
  return {
    user,
    keycloak: keycloakConfigured(),
    database: databaseConfigured(),
    admin: isAdmin(user),
  };
});

/* -------------------------------- home -------------------------------- */

export const getHome = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await import('./db.server');
  const { user } = await context();
  const [spaces, docs, apps, favorites, settings] = await Promise.all([db.listSpaces(), db.listDocs(), db.listApps(), db.listFavorites(), db.getSettings()]);

  const readableSpaces = spaces.filter((s) => canRead(s, user));
  const readableApps = apps.filter((a) => canRead(a, user));
  const published = visibleDocs(docs, spaces, user).filter((d) => d.status === 'published');
  const mine = user ? favorites.filter((f) => f.user_id === user.id) : [];
  const chosen = mine.length ? mine : favorites.filter((f) => f.user_id === null);

  return {
    user,
    settings,
    spaces: readableSpaces,
    favorites: chosen.sort((a, b) => a.position - b.position),
    favoritesArePersonal: mine.length > 0,
    latest: published
      .sort((a, b) => b.published_at.localeCompare(a.published_at))
      .slice(0, 6)
      .map((d) => toPublic(d, spaces)),
    stats: {
      apps: readableApps.length,
      running: readableApps.filter((a) => a.state === 'running').length,
      spaces: readableSpaces.length,
      docs: published.length,
    },
  };
});

/* ----------------------------- applications ---------------------------- */

export const getApps = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await import('./db.server');
  const { user } = await context();
  const apps = (await db.listApps()).filter((a) => canRead(a, user));
  return { apps, user };
});

/* -------------------------------- spaces ------------------------------- */

export const getSpaces = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await import('./db.server');
  const { user } = await context();
  const [spaces, docs] = await Promise.all([db.listSpaces(), db.listDocs()]);
  const readable = spaces.filter((s) => canRead(s, user));
  const visible = visibleDocs(docs, spaces, user);
  return {
    spaces: readable.map((space) => ({
      ...space,
      count: visible.filter((d) => d.space_slug === space.slug && d.status === 'published').length,
    })),
  };
});

export const getSpace = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const db = await import('./db.server');
    const { user } = await context();
    const [spaces, docs] = await Promise.all([db.listSpaces(), db.listDocs()]);
    const space = spaces.find((s) => s.slug === data.slug);
    if (!space || !canRead(space, user)) return { space: null, docs: [] as PublicDoc[], canWrite: false };
    const list = visibleDocs(docs, spaces, user, true)
      .filter((d) => d.space_slug === space.slug && d.status !== 'archived')
      .sort((a, b) => b.published_at.localeCompare(a.published_at))
      .map((d) => toPublic(d, spaces));
    return { space, docs: list, canWrite: canWriteSpace(space, user) };
  });

/* ------------------------------ document ------------------------------ */

export const getDoc = createServerFn({ method: 'GET' })
  .inputValidator((data: { space: string; slug: string; type: 'wiki' | 'blog' }) => data)
  .handler(async ({ data }) => {
    const db = await import('./db.server');
    const { renderDocument } = await import('./render.server');
    const { user } = await context();
    const [spaces, docs, redirects] = await Promise.all([db.listSpaces(), db.listDocs(), db.listRedirects()]);
    const space = spaces.find((s) => s.slug === data.space && s.type === data.type);
    if (!space || !canRead(space, user)) return { status: 'forbidden' as const };

    const doc = docs.find((d) => d.space_slug === data.space && d.slug === data.slug);
    if (!doc) {
      const redirect = redirects.find((r) => r.space_slug === data.space && r.old_slug === data.slug);
      if (redirect) return { status: 'redirect' as const, slug: redirect.new_slug };
      return { status: 'missing' as const };
    }
    if (!canRead(doc, user)) return { status: 'forbidden' as const };
    if (doc.status !== 'published' && !(isAdmin(user) || canWriteSpace(space, user))) return { status: 'missing' as const };

    const rendered = renderDocument(doc.body);
    const siblings = visibleDocs(docs, spaces, user)
      .filter((d) => d.space_slug === space.slug && d.id !== doc!.id && d.status === 'published')
      .slice(0, 12)
      .map((d) => toPublic(d, spaces));

    return {
      status: 'ok' as const,
      doc,
      space,
      html: rendered.html,
      toc: rendered.toc,
      siblings,
      canWrite: canWriteSpace(space, user),
    };
  });

/* -------------------------------- memo -------------------------------- */

export const getMemo = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await import('./db.server');
  const [settings, spaces, docs] = await Promise.all([db.getSettings(), db.listSpaces(), db.listDocs()]);
  const space = spaces.find((s) => s.slug === settings.memo_space);
  if (!space || space.visibility !== 'public') return { space: null, docs: [] as PublicDoc[] };
  const list = docs
    .filter((d) => d.space_slug === space.slug && d.status === 'published' && d.visibility === 'public')
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .map((d) => toPublic(d, spaces));
  return { space, docs: list };
});

/* ------------------------------ recherche ------------------------------ */

export const search = createServerFn({ method: 'GET' })
  .inputValidator((data: { q: string }) => data)
  .handler(async ({ data }) => {
    const db = await import('./db.server');
    const { scoreItem, highlight } = await import('./search.server');
    const { plainText } = await import('./render.server');
    const { user } = await context();
    const query = (data.q ?? '').trim();
    if (query.length < 2) return { results: [] };

    const [spaces, docs, apps] = await Promise.all([db.listSpaces(), db.listDocs(), db.listApps()]);

    const docResults = visibleDocs(docs, spaces, user).map((doc) => {
      const body = plainText(doc.body);
      const pub = toPublic(doc, spaces);
      return {
        kind: pub.space_type as 'wiki' | 'blog' | 'app',
        title: doc.title,
        href: pub.href,
        context: pub.space_name,
        snippet: highlight(query, body || doc.excerpt),
        score: scoreItem(query, {
          title: doc.title,
          tags: doc.tags,
          body: `${doc.excerpt} ${body}`,
        }),
      };
    });

    const appResults = apps
      .filter((a) => canRead(a, user))
      .map((app) => ({
        kind: 'app' as const,
        title: app.name,
        href: app.url,
        context: app.category,
        snippet: highlight(query, app.description),
        score: scoreItem(query, {
          title: app.name,
          tags: [...app.tags, app.category],
          body: app.description,
        }),
      }));

    const results = [...docResults, ...appResults]
      .filter((r) => r.score > 0.45)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    return { results };
  });

/* ------------------------------- favoris ------------------------------- */

export const getMyFavorites = createServerFn({ method: 'GET' }).handler(async () => {
  const db = await import('./db.server');
  const { user } = await context();
  const favorites = await db.listFavorites();
  return {
    personal: user ? favorites.filter((f) => f.user_id === user.id).sort((a, b) => a.position - b.position) : [],
    publicList: favorites.filter((f) => f.user_id === null).sort((a, b) => a.position - b.position),
    signedIn: !!user,
  };
});

export const saveMyFavorites = createServerFn({ method: 'POST' })
  .inputValidator((data: { favorites: Omit<Favorite, 'user_id'>[] }) => data)
  .handler(async ({ data }) => {
    const db = await import('./db.server');
    const { user } = await context();
    if (!user) throw new Error('Connexion requise');
    await db.deleteFavoritesFor(user.id);
    let position = 1;
    for (const fav of data.favorites) {
      await db.upsertRow('favorites', { ...fav, user_id: user.id, position: position++ });
    }
    return { ok: true };
  });
