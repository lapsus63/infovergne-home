export type Visibility = 'public' | 'restricted';
export type DocStatus = 'draft' | 'published' | 'archived';
export type SpaceType = 'wiki' | 'blog';
export type RunState = 'running' | 'stopped' | 'error' | 'unknown';

export interface Space {
  id: string;
  slug: string;
  name: string;
  type: SpaceType;
  description: string;
  accent: string;
  visibility: Visibility;
  allowed_roles: string[];
  write_roles: string[];
  position: number;
}

export interface Doc {
  id: string;
  space_slug: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  status: DocStatus;
  visibility: Visibility;
  allowed_roles: string[];
  author: string;
  published_at: string;
  updated_at: string;
}

export interface AppEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  url: string;
  tags: string[];
  container_name: string;
  visibility: Visibility;
  allowed_roles: string[];
  state: RunState;
  state_at: string;
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  width: number;
  height: number;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string | null;
  label: string;
  href: string;
  kind: 'app' | 'wiki' | 'blog' | 'link';
  position: number;
}

export interface BackupEntry {
  id: string;
  created_at: string;
  size_bytes: number;
  status: 'ok' | 'failed';
  message: string;
}

export interface SiteSettings {
  memo_space: string;
  site_title: string;
  site_tagline: string;
  backup_cron: string;
  backup_keep: number;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export const ADMIN_ROLE = 'ADMIN';

export function isAdmin(user: SessionUser | null): boolean {
  return !!user?.roles.includes(ADMIN_ROLE);
}

export function canRead(item: { visibility: Visibility; allowed_roles: string[] }, user: SessionUser | null): boolean {
  if (item.visibility === 'public') return true;
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (item.allowed_roles.length === 0) return true;
  return item.allowed_roles.some((r) => user.roles.includes(r));
}

export function canWriteSpace(space: Space, user: SessionUser | null): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return space.write_roles.some((r) => user.roles.includes(r));
}

export function spaceRoleNames(slug: string) {
  const key = slug.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return { read: `ESPACE_${key}_LECTURE`, write: `ESPACE_${key}_REDACTION` };
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function docHref(doc: { space_slug: string; slug: string }, type: SpaceType): string {
  return `/${type === 'blog' ? 'blog' : 'wiki'}/${doc.space_slug}/${doc.slug}`;
}
