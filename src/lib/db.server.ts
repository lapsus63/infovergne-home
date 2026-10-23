import postgres from 'postgres';

import { demoApps, demoBackups, demoDocs, demoFavorites, demoMedia, demoSettings, demoSpaces } from './demo-data.server';
import type { AppEntry, BackupEntry, Doc, Favorite, MediaItem, SiteSettings, Space } from './types';

export type TableName = 'spaces' | 'docs' | 'apps' | 'media' | 'favorites' | 'backups' | 'slug_redirects';

export interface SlugRedirect {
  id: string;
  kind: string;
  space_slug: string;
  old_slug: string;
  new_slug: string;
}

let client: ReturnType<typeof postgres> | null = null;
let checked = false;

export function databaseConfigured(): boolean {
  return !!process.env['DATABASE_URL'];
}

function getSql() {
  if (!databaseConfigured()) return null;
  if (!client) {
    client = postgres(process.env['DATABASE_URL']!, {
      max: 3,
      idle_timeout: 20,
      prepare: false,
      ssl: process.env['DATABASE_SSL'] === 'false' ? false : 'prefer',
    });
  }
  return client;
}

/* ------------------------------------------------------------------ */
/* Repli mémoire : permet de faire tourner le site sans base connectée */
/* ------------------------------------------------------------------ */

const memory = {
  spaces: [...demoSpaces],
  docs: [...demoDocs],
  apps: [...demoApps],
  media: [...demoMedia],
  favorites: [...demoFavorites],
  backups: [...demoBackups],
  slug_redirects: [] as SlugRedirect[],
  settings: { ...demoSettings },
};

export function memoryMode(): boolean {
  return !databaseConfigured();
}

async function safe<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error('[db]', error);
    checked = true;
    return fallback;
  }
}

export function dbHealthy(): boolean {
  return databaseConfigured() && !checked;
}

/* ------------------------------- lecture ------------------------------- */

export async function listSpaces(): Promise<Space[]> {
  const sql = getSql();
  if (!sql) return memory.spaces;
  return safe(async () => (await sql<Space[]>`select * from spaces order by position, name`).map((r) => r), memory.spaces);
}

export async function listDocs(): Promise<Doc[]> {
  const sql = getSql();
  if (!sql) return memory.docs;
  return safe(async () => await sql<Doc[]>`select * from docs order by published_at desc`, memory.docs);
}

export async function listApps(): Promise<AppEntry[]> {
  const sql = getSql();
  if (!sql) return memory.apps;
  return safe(async () => await sql<AppEntry[]>`select * from apps order by name`, memory.apps);
}

export async function listMedia(): Promise<MediaItem[]> {
  const sql = getSql();
  if (!sql) return memory.media;
  return safe(async () => await sql<MediaItem[]>`select * from media order by created_at desc`, memory.media);
}

export async function listFavorites(): Promise<Favorite[]> {
  const sql = getSql();
  if (!sql) return memory.favorites;
  return safe(async () => await sql<Favorite[]>`select * from favorites order by position`, memory.favorites);
}

export async function listBackups(): Promise<BackupEntry[]> {
  const sql = getSql();
  if (!sql) return memory.backups;
  return safe(async () => await sql<BackupEntry[]>`select * from backups order by created_at desc limit 50`, memory.backups);
}

export async function listRedirects(): Promise<SlugRedirect[]> {
  const sql = getSql();
  if (!sql) return memory.slug_redirects;
  return safe(async () => await sql<SlugRedirect[]>`select * from slug_redirects`, memory.slug_redirects);
}

export async function getSettings(): Promise<SiteSettings> {
  const sql = getSql();
  if (!sql) return memory.settings;
  return safe(async () => {
    const rows = await sql<{ key: string; value: string }[]>`select key, value from site_settings`;
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      memo_space: map['memo_space'] ?? demoSettings.memo_space,
      site_title: map['site_title'] ?? demoSettings.site_title,
      site_tagline: map['site_tagline'] ?? demoSettings.site_tagline,
      backup_cron: map['backup_cron'] ?? demoSettings.backup_cron,
      backup_keep: Number(map['backup_keep'] ?? demoSettings.backup_keep),
    };
  }, memory.settings);
}

/* ------------------------------- écriture ------------------------------ */

type Row = Record<string, unknown> & { id: string };

function memoryList(table: TableName): Row[] {
  return memory[table] as unknown as Row[];
}

export async function upsertRow(table: TableName, row: Row): Promise<void> {
  const sql = getSql();
  if (!sql) {
    const list = memoryList(table);
    const index = list.findIndex((r) => r.id === row.id);
    if (index >= 0) list[index] = { ...list[index], ...row };
    else list.push(row);
    return;
  }
  const cols = Object.keys(row);
  const updates = cols.filter((c) => c !== 'id');
  await safe(async () => {
    await sql`
        insert into ${sql(table)} ${sql(row, ...cols)}
        on conflict (id) do update set ${sql(row, ...updates)}
      `;
    return null;
  }, null);
}

export async function deleteRow(table: TableName, id: string): Promise<void> {
  const sql = getSql();
  if (!sql) {
    const list = memoryList(table);
    const index = list.findIndex((r) => r.id === id);
    if (index >= 0) list.splice(index, 1);
    return;
  }
  await safe(async () => {
    await sql`delete from ${sql(table)} where id = ${id}`;
    return null;
  }, null);
}

export async function saveSettings(next: SiteSettings): Promise<void> {
  const sql = getSql();
  if (!sql) {
    memory.settings = { ...next };
    return;
  }
  await safe(async () => {
    for (const [key, value] of Object.entries(next)) {
      await sql`
        insert into site_settings (key, value) values (${key}, ${String(value)})
        on conflict (key) do update set value = excluded.value
      `;
    }
    return null;
  }, null);
}

export async function deleteFavoritesFor(userId: string | null): Promise<void> {
  const sql = getSql();
  if (!sql) {
    memory.favorites = memory.favorites.filter((f) => f.user_id !== userId);
    return;
  }
  await safe(async () => {
    if (userId === null) await sql`delete from favorites where user_id is null`;
    else await sql`delete from favorites where user_id = ${userId}`;
    return null;
  }, null);
}
