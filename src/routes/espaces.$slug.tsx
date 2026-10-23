import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Rss } from 'lucide-react';

import { spaceQuery } from '@/lib/queries';

export const Route = createFileRoute('/espaces/$slug')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(spaceQuery(params.slug)),
  head: ({ loaderData }) => {
    const space = loaderData?.space;
    if (!space) return { meta: [{ title: 'Espace indisponible' }, { name: 'robots', content: 'noindex' }] };
    const title = `${space.name} — ${space.type === 'blog' ? 'journal' : 'wiki'} du lab`;
    return {
      meta: [
        { title },
        { name: 'description', content: space.description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: space.description },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        ...(space.visibility === 'restricted' ? [{ name: 'robots', content: 'noindex' }] : []),
      ],
      links: [
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          href: `/rss/${space.slug}`,
          title: space.name,
        },
      ],
    };
  },
  component: SpacePage,
});

function SpacePage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(spaceQuery(slug));

  if (!data.space) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl">Espace indisponible</h1>
        <p className="mt-2 text-muted-foreground">Cet espace est réservé. Connectez-vous avec un compte disposant du rôle de lecture correspondant.</p>
        <Link to="/espaces" className="mt-6 inline-block text-primary underline underline-offset-4">
          Tous les espaces
        </Link>
      </div>
    );
  }

  const space = data.space;
  const isBlog = space.type === 'blog';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/espaces" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Espaces
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{space.name}</h1>
        <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">{isBlog ? 'journal' : 'wiki'}</span>
        <a href={`/rss/${space.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <Rss className="size-4" /> RSS
        </a>
      </div>
      <p className="mt-2 text-muted-foreground">{space.description}</p>

      <ul className="mt-8 space-y-3">
        {data.docs.map((doc) => (
          <li key={doc.id}>
            <Link to={isBlog ? '/blog/$space/$slug' : '/wiki/$space/$slug'} params={{ space: doc.space_slug, slug: doc.slug }} className="surface block p-4 transition-colors hover:border-primary">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-medium">{doc.title}</h2>
                {doc.status === 'draft' ? <span className="rounded bg-secondary px-2 py-0.5 text-xs">brouillon</span> : null}
                {doc.visibility === 'restricted' ? <span className="rounded border border-border px-2 py-0.5 text-xs">réservé</span> : null}
                <span className="ml-auto font-mono text-xs text-muted-foreground">{new Date(doc.published_at).toLocaleDateString('fr-FR')}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{doc.excerpt}</p>
            </Link>
          </li>
        ))}
        {data.docs.length === 0 ? <li className="text-sm text-muted-foreground">Espace encore vide.</li> : null}
      </ul>
    </div>
  );
}
