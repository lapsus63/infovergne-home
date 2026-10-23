import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Boxes, FileText, Layers, Star } from 'lucide-react';

import { homeQuery } from '@/lib/queries';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Home Lab — applications, wiki et journal auto-hébergés' },
      {
        name: 'description',
        content: 'Catalogue des applications Docker du lab, espaces wiki et blog, favoris et état des conteneurs, en accès public ou réservé.',
      },
      { property: 'og:title', content: 'Home Lab — applications, wiki et journal auto-hébergés' },
      {
        property: 'og:description',
        content: 'Catalogue des applications Docker, espaces wiki et blog, favoris personnalisés.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'alternate', type: 'application/rss+xml', href: '/rss.xml', title: 'Home Lab' }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(homeQuery);
  const stats = [
    { label: 'Applications', value: data.stats.apps, icon: Boxes },
    { label: 'En fonctionnement', value: data.stats.running, icon: Layers },
    { label: 'Espaces', value: data.stats.spaces, icon: Layers },
    { label: 'Contenus publiés', value: data.stats.docs, icon: FileText },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="surface p-6 sm:p-10">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">{data.settings.site_title}</p>
        <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">{data.settings.site_tagline}</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Toutes les petites applications du lab, leur état, et la documentation qui va avec. Connectez-vous pour retrouver vos favoris et les espaces qui vous sont réservés.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/applications" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Voir les applications <ArrowRight className="size-4" />
          </Link>
          <Link to="/espaces" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm">
            Parcourir les espaces
          </Link>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="surface p-4">
            <stat.icon className="size-4 text-primary" aria-hidden />
            <p className="mt-2 font-mono text-2xl">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="text-xl">Derniers contenus</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.latest.map((doc) => (
              <Link
                key={doc.id}
                to={doc.space_type === 'blog' ? '/blog/$space/$slug' : '/wiki/$space/$slug'}
                params={{ space: doc.space_slug, slug: doc.slug }}
                className="surface block p-4 transition-colors hover:border-primary"
              >
                <p className="font-mono text-xs text-primary">{doc.space_name}</p>
                <p className="mt-1 font-medium">{doc.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{doc.excerpt}</p>
              </Link>
            ))}
            {data.latest.length === 0 ? <p className="text-sm text-muted-foreground">Aucun contenu publié pour le moment.</p> : null}
          </div>
        </div>

        <aside>
          <h2 className="flex items-center gap-2 text-xl">
            <Star className="size-4 text-primary" aria-hidden />
            {data.favoritesArePersonal ? 'Vos favoris' : 'Favoris'}
          </h2>
          <ul className="mt-4 space-y-2">
            {data.favorites.map((fav) => (
              <li key={fav.id}>
                <a href={fav.href} className="surface flex items-center justify-between p-3 text-sm transition-colors hover:border-primary">
                  <span>{fav.label}</span>
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                </a>
              </li>
            ))}
            {data.favorites.length === 0 ? <li className="text-sm text-muted-foreground">Aucun favori configuré.</li> : null}
          </ul>
          {data.user ? (
            <Link to="/favoris" className="mt-3 inline-block text-sm text-primary underline underline-offset-4">
              Gérer mes favoris
            </Link>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
