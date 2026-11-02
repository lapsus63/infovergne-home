import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';

import { RichContent } from '@/components/rich-content';
import { memoQuery } from '@/lib/queries';

export const Route = createFileRoute('/memo')({
  head: () => ({
    meta: [
      { title: 'Mémo — accès rapide du home lab' },
      { name: 'description', content: "Adresse courte et permanente vers le mémo du home lab." },
      { property: 'og:title', content: 'Mémo — accès rapide du home lab' },
      { property: 'og:description', content: 'Note publique essentielle du lab, en une adresse courte.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(memoQuery),
  component: Memo,
});

function Memo() {
  const { data } = useSuspenseQuery(memoQuery);

  if (!data.doc) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl">Mémo non configuré</h1>
        <p className="mt-2 text-muted-foreground">
          Choisissez un document publié comme mémo dans l'administration.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">/memo</p>
      <h1 className="mt-2 text-3xl">{data.doc.title}</h1>
      {data.doc.excerpt ? <p className="mt-2 text-muted-foreground">{data.doc.excerpt}</p> : null}
      
      <div className="mt-8">
        <RichContent html={data.html} />
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
        <Link
          to={data.doc.space_type === 'blog' ? '/blog/$space/$slug' : '/wiki/$space/$slug'}
          params={{ space: data.doc.space_slug, slug: data.doc.slug }}
          className="hover:text-foreground"
        >
          ← Voir dans {data.doc.space_type === 'blog' ? 'le blog' : 'le wiki'}
        </Link>
        {data.doc.published_at ? (
          <span>
            Publié le {new Date(data.doc.published_at).toLocaleDateString('fr-FR')}
          </span>
        ) : null}
      </div>
    </div>
  );
}
