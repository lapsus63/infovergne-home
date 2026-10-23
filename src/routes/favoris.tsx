import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { saveMyFavorites } from '@/lib/content.functions';
import { favoritesQuery } from '@/lib/queries';
import type { Favorite } from '@/lib/types';
import { useAuth } from '@/lib/use-auth';

export const Route = createFileRoute('/favoris')({
  head: () => ({
    meta: [
      { title: 'Mes favoris — home lab' },
      {
        name: 'description',
        content: 'Liste de raccourcis personnalisée vers les applications et contenus du lab.',
      },
      { name: 'robots', content: 'noindex' },
      { property: 'og:title', content: 'Mes favoris — home lab' },
      {
        property: 'og:description',
        content: 'Vos raccourcis personnels vers les applications et contenus du lab.',
      },
    ],
  }),
  component: FavoritesPage,
});

type Item = Omit<Favorite, 'user_id'>;

function FavoritesPage() {
  const { signedIn } = useAuth();
  const { data } = useQuery(favoritesQuery);
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (data) setItems(data.personal.length ? data.personal : data.publicList);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (favorites: Item[]) => saveMyFavorites({ data: { favorites } }),
    onSuccess: () => {
      toast.success('Favoris enregistrés');
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
      void queryClient.invalidateQueries({ queryKey: ['home'] });
    },
    onError: () => toast.error('Enregistrement impossible'),
  });

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl">Connexion requise</h1>
        <p className="mt-2 text-muted-foreground">Connectez-vous pour composer votre liste de favoris.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl">Mes favoris</h1>
      <p className="mt-2 text-muted-foreground">Ces raccourcis s'affichent sur votre page d'accueil. Pour une application, utilisez directement son lien d'accès.</p>

      <ul className="mt-6 space-y-3">
        {items.map((item, index) => (
          <li key={item.id} className="surface flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
            <input
              value={item.label}
              onChange={(e) => setItems(items.map((it, i) => (i === index ? { ...it, label: e.target.value } : it)))}
              placeholder="Intitulé"
              className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm sm:w-48"
            />
            <input
              value={item.href}
              onChange={(e) => setItems(items.map((it, i) => (i === index ? { ...it, href: e.target.value } : it)))}
              placeholder="https://… ou /chemin-interne"
              className="w-full flex-1 rounded-md border border-border bg-card px-2 py-1.5 font-mono text-sm"
            />
            <button
              onClick={() => setItems(items.filter((_, i) => i !== index))}
              className="self-end rounded-md border border-border p-2 text-muted-foreground hover:text-destructive"
              aria-label="Supprimer"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() =>
            setItems([
              ...items,
              {
                id: crypto.randomUUID(),
                label: '',
                href: '',
                kind: 'link',
                position: items.length + 1,
              },
            ])
          }
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm"
        >
          <Plus className="size-4" /> Ajouter un favori
        </button>
        <button
          onClick={() => mutation.mutate(items.filter((i) => i.label && i.href))}
          disabled={mutation.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}
