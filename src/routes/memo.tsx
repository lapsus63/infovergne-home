import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';

import { memoQuery } from '@/lib/queries';

export const Route = createFileRoute('/memo')({
  head: () => ({
    meta: [
      { title: 'Mémo — accès rapide du home lab' },
      { name: 'description', content: "Adresse courte et permanente vers l'espace mémo public du home lab." },
      { property: 'og:title', content: 'Mémo — accès rapide du home lab' },
      { property: 'og:description', content: 'Les notes publiques essentielles du lab, en une adresse courte.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(memoQuery),
  component: Memo,
});

function Memo() {
  const { data } = useSuspenseQuery(memoQuery);

  if (!data.space) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl">Mémo non configuré</h1>
        <p className="mt-2 text-muted-foreground">Choisissez un espace public comme mémo dans l'administration.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">/memo</p>
      <h1 className="mt-2 text-3xl">{data.space.name}</h1>
      <p className="mt-2 text-muted-foreground">{data.space.description}</p>

      <ul className="mt-8 space-y-3">
        {data.docs.map((doc) => (
          <li key={doc.id}>
            <Link
              to={doc.space_type === 'blog' ? '/blog/$space/$slug' : '/wiki/$space/$slug'}
              params={{ space: doc.space_slug, slug: doc.slug }}
              className="surface block p-4 transition-colors hover:border-primary"
            >
              <p className="font-medium">{doc.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{doc.excerpt}</p>
            </Link>
          </li>
        ))}
        {data.docs.length === 0 ? <li className="text-sm text-muted-foreground">Aucune note publique.</li> : null}
      </ul>
    </div>
  );
}
