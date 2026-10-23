import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { BookOpen, Newspaper } from 'lucide-react';

import { spacesQuery } from '@/lib/queries';

export const Route = createFileRoute('/espaces')({
  head: () => ({
    meta: [
      { title: 'Espaces wiki et blog du lab' },
      {
        name: 'description',
        content: 'Espaces de documentation et de publication du home lab : maison, famille, professionnel.',
      },
      { property: 'og:title', content: 'Espaces wiki et blog du lab' },
      { property: 'og:description', content: 'Documentation et journaux du home lab, publics ou réservés.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(spacesQuery),
  component: SpacesLayout,
});

function SpacesLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== '/espaces') return <Outlet />;
  return <SpacesIndex />;
}

function SpacesIndex() {
  const { data } = useSuspenseQuery(spacesQuery);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl">Espaces</h1>
      <p className="mt-2 text-muted-foreground">Chaque espace regroupe soit un wiki, soit un journal.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.spaces.map((space) => (
          <Link
            key={space.id}
            to="/espaces/$slug"
            params={{ slug: space.slug }}
            className="surface block p-5 transition-colors hover:border-primary"
            style={{ borderLeft: `3px solid ${space.accent}` }}
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {space.type === 'blog' ? <Newspaper className="size-4" /> : <BookOpen className="size-4" />}
              {space.type === 'blog' ? 'Journal' : 'Wiki'}
              {space.visibility === 'restricted' ? <span className="ml-auto rounded bg-secondary px-2 py-0.5 text-xs">réservé</span> : null}
            </div>
            <h2 className="mt-2 font-mono text-lg">{space.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{space.description}</p>
            <p className="mt-3 font-mono text-xs text-primary">{space.count} contenu(s) publié(s)</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
