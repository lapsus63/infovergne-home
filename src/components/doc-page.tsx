import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, Navigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { RichContent } from '@/components/rich-content';
import { docQuery } from '@/lib/queries';

type DocResult = Awaited<ReturnType<typeof import('@/lib/content.functions').getDoc>>;

export function docHead(loaderData: DocResult | undefined) {
  if (!loaderData || loaderData.status !== 'ok') {
    return { meta: [{ title: 'Contenu indisponible' }, { name: 'robots', content: 'noindex' }] };
  }
  const { doc, space } = loaderData;
  const title = `${doc.title} — ${space.name}`;
  const restricted = doc.visibility === 'restricted' || space.visibility === 'restricted' || doc.status !== 'published';
  return {
    meta: [
      { title },
      { name: 'description', content: doc.excerpt },
      { property: 'og:title', content: title },
      { property: 'og:description', content: doc.excerpt },
      { property: 'og:type', content: 'article' },
      { name: 'twitter:card', content: 'summary_large_image' },
      ...(restricted ? [{ name: 'robots', content: 'noindex' }] : []),
    ],
  };
}

export function DocPage({ type, space, slug }: { type: 'wiki' | 'blog'; space: string; slug: string }) {
  const { data } = useSuspenseQuery(docQuery(type, space, slug));

  if (data.status === 'redirect') {
    return <Navigate to={type === 'blog' ? '/blog/$space/$slug' : '/wiki/$space/$slug'} params={{ space, slug: data.slug }} replace />;
  }

  if (data.status !== 'ok') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl">Contenu indisponible</h1>
        <p className="mt-2 text-muted-foreground">
          {data.status === 'forbidden' ? 'Ce contenu est réservé. Connectez-vous avec un compte autorisé.' : "Cette page n'existe pas ou n'est pas encore publiée."}
        </p>
        <Link to="/espaces" className="mt-6 inline-block text-primary underline underline-offset-4">
          Retour aux espaces
        </Link>
      </div>
    );
  }

  const { doc, toc, html, siblings } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/espaces/$slug" params={{ slug: doc.space_slug }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {data.space.name}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_16rem]">
        <article>
          <header>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{new Date(doc.published_at).toLocaleDateString('fr-FR')}</span>
              {doc.status !== 'published' ? <span className="rounded bg-secondary px-2 py-0.5">{doc.status === 'draft' ? 'brouillon' : 'archivé'}</span> : null}
              {doc.visibility === 'restricted' ? <span className="rounded border border-border px-2 py-0.5">réservé</span> : null}
            </div>
            <h1 className="mt-2 text-3xl">{doc.title}</h1>
            <p className="mt-2 text-muted-foreground">{doc.excerpt}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {doc.tags.map((tag) => (
                <span key={tag} className="rounded bg-secondary px-2 py-0.5 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </header>

          <div className="mt-8">
            <RichContent html={html} />
          </div>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          {toc.length ? (
            <nav className="surface p-4">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Sommaire</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {toc.map((item) => (
                  <li key={item.id} style={{ paddingLeft: (item.level - 2) * 12 }}>
                    <a href={`#${item.id}`} className="text-muted-foreground hover:text-foreground">
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {siblings.length ? (
            <nav className="surface mt-4 p-4">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Dans cet espace</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {siblings.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.space_type === 'blog' ? '/blog/$space/$slug' : '/wiki/$space/$slug'}
                      params={{ space: item.space_slug, slug: item.slug }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
