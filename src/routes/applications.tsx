import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { StateBadge } from '@/components/state-badge';
import { appsQuery } from '@/lib/queries';

export const Route = createFileRoute('/applications')({
  head: () => ({
    meta: [
      { title: 'Applications du lab — catalogue Docker' },
      {
        name: 'description',
        content: 'Catalogue des applications conteneurisées du home lab : rôle, catégorie, état, ports et accès.',
      },
      { property: 'og:title', content: 'Applications du lab — catalogue Docker' },
      {
        property: 'og:description',
        content: 'Toutes les applications Docker du lab et leur état en temps réel.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(appsQuery),
  component: Applications,
});

function Applications() {
  const { data } = useSuspenseQuery(appsQuery);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Toutes');

  const categories = useMemo(() => ['Toutes', ...[...new Set(data.apps.map((a) => a.category))].sort()], [data.apps]);

  const filtered = data.apps.filter((app) => {
    const matchesCategory = category === 'Toutes' || app.category === category;
    const haystack = `${app.name} ${app.description} ${app.tags.join(' ')}`.toLowerCase();
    return matchesCategory && haystack.includes(query.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl">Applications</h1>
      <p className="mt-2 text-muted-foreground">{data.apps.length} application(s) visibles avec vos droits actuels.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrer par nom, description, tag…"
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((app) => (
          <a
            key={app.id}
            href={app.url || undefined}
            target={app.url ? '_blank' : undefined}
            rel={app.url ? 'noopener noreferrer' : undefined}
            className="surface flex flex-col p-4 transition-colors hover:border-primary"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-mono text-base">{app.name}</h2>
              <StateBadge state={app.state} />
            </div>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{app.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">{app.category}</span>
              {app.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded bg-secondary px-2 py-0.5 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>

      {filtered.length === 0 ? <p className="mt-10 text-sm text-muted-foreground">Aucune application ne correspond à ce filtre.</p> : null}
    </div>
  );
}
