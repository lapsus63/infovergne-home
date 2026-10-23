import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Search as SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { searchQuery } from '@/lib/queries';

export const Route = createFileRoute('/recherche')({
  head: () => ({
    meta: [
      { title: 'Recherche dans le home lab' },
      {
        name: 'description',
        content: 'Recherche unique sur les applications, les pages wiki et les articles du lab.',
      },
      { property: 'og:title', content: 'Recherche dans le home lab' },
      {
        property: 'og:description',
        content: 'Trouvez une application, une note ou un article, même mal orthographié.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: SearchPage,
});

const KIND_LABEL: Record<string, string> = { app: 'application', wiki: 'wiki', blog: 'article' };

function SearchPage() {
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setTerm(input), 250);
    return () => window.clearTimeout(id);
  }, [input]);

  const { data, isFetching } = useQuery(searchQuery(term));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl">Recherche</h1>
      <p className="mt-2 text-muted-foreground">Applications, pages wiki et articles, classés par pertinence. Les fautes de frappe sont tolérées.</p>

      <div className="surface mt-6 flex items-center gap-2 p-2">
        <SearchIcon className="ml-2 size-4 text-muted-foreground" aria-hidden />
        <input autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="ex. kubernets, sauvgarde, jellyfin…" className="w-full bg-transparent px-1 py-2 text-sm outline-none" />
      </div>

      <div className="mt-6 space-y-3">
        {isFetching ? <p className="text-sm text-muted-foreground">Recherche…</p> : null}
        {(data?.results ?? []).map((result) => (
          <a
            key={result.href}
            href={result.href}
            target={result.kind === 'app' ? '_blank' : undefined}
            rel={result.kind === 'app' ? 'noopener noreferrer' : undefined}
            className="surface block p-4 transition-colors hover:border-primary"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded bg-secondary px-2 py-0.5">{KIND_LABEL[result.kind] ?? result.kind}</span>
              <span>{result.context}</span>
            </div>
            <p className="mt-1 font-medium">{result.title}</p>
            <p className="prose-lab mt-1 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: result.snippet }} />
          </a>
        ))}
        {term.length >= 2 && !isFetching && (data?.results.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">Aucun résultat accessible avec vos droits actuels.</p> : null}
      </div>
    </div>
  );
}
