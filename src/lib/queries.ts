import { queryOptions } from '@tanstack/react-query';

import { getAdminData } from './admin.functions';
import { getApps, getDoc, getHome, getMemo, getMyFavorites, getSpace, getSpaces, search } from './content.functions';

export const homeQuery = queryOptions({ queryKey: ['home'], queryFn: () => getHome() });
export const appsQuery = queryOptions({ queryKey: ['apps'], queryFn: () => getApps() });
export const spacesQuery = queryOptions({ queryKey: ['spaces'], queryFn: () => getSpaces() });
export const memoQuery = queryOptions({ queryKey: ['memo'], queryFn: () => getMemo() });
export const adminQuery = queryOptions({ queryKey: ['admin'], queryFn: () => getAdminData() });
export const favoritesQuery = queryOptions({
  queryKey: ['favorites'],
  queryFn: () => getMyFavorites(),
});

export const spaceQuery = (slug: string) => queryOptions({ queryKey: ['space', slug], queryFn: () => getSpace({ data: { slug } }) });

export const docQuery = (type: 'wiki' | 'blog', space: string, slug: string) =>
  queryOptions({
    queryKey: ['doc', type, space, slug],
    queryFn: () => getDoc({ data: { type, space, slug } }),
  });

export const searchQuery = (q: string) =>
  queryOptions({
    queryKey: ['search', q],
    queryFn: () => search({ data: { q } }),
    enabled: q.trim().length >= 2,
  });
