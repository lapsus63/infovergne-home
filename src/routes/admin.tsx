import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Copy, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { RichContent } from '@/components/rich-content';
import { addMedia, previewMarkdown, removeApp, removeDoc, removeMedia, removeSpace, saveApp, saveDoc, savePublicFavorites, saveSiteSettings, saveSpace } from '@/lib/admin.functions';
import { adminQuery } from '@/lib/queries';
import { slugify, spaceRoleNames, type AppEntry, type Doc, type Favorite, type MediaItem, type SiteSettings, type Space } from '@/lib/types';
import { useAuth } from '@/lib/use-auth';

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { title: 'Administration du home lab' },
      {
        name: 'description',
        content: 'Gestion des applications, espaces, contenus, médias et sauvegardes.',
      },
      { name: 'robots', content: 'noindex' },
      { property: 'og:title', content: 'Administration du home lab' },
      { property: 'og:description', content: 'Espace de gestion réservé aux comptes autorisés.' },
    ],
  }),
  component: AdminPage,
});

const TABS = ['Contenus', 'Espaces', 'Applications', 'Médias', 'Favoris publics', 'Réglages'] as const;
type Tab = (typeof TABS)[number];

const field = 'w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';
const label = 'text-xs uppercase tracking-wide text-muted-foreground';
const primaryBtn = 'inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground';
const ghostBtn = 'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm';

function AdminPage() {
  const { signedIn } = useAuth();
  const { data, isLoading, error } = useQuery({ ...adminQuery, retry: false, enabled: signedIn });
  const [tab, setTab] = useState<Tab>('Contenus');

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl">Connexion requise</h1>
        <p className="mt-2 text-muted-foreground">Connectez-vous pour accéder à l'espace de gestion.</p>
      </div>
    );
  }
  if (isLoading || !data) {
    return <p className="mx-auto max-w-lg px-4 py-20 text-center text-muted-foreground">Chargement…</p>;
  }
  if (error) {
    return <p className="mx-auto max-w-lg px-4 py-20 text-center text-muted-foreground">Accès refusé.</p>;
  }

  const tabs = data.admin ? TABS : (['Contenus', 'Médias'] as const);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl">{data.admin ? 'Administration' : 'Rédaction'}</h1>
      {data.memoryMode ? (
        <p className="surface mt-4 p-3 text-sm text-muted-foreground">
          Base PostgreSQL non branchée : les modifications sont temporaires et servent de démonstration. Renseignez la chaîne de connexion pour les rendre permanentes.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={t === tab ? `${primaryBtn}` : ghostBtn}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'Contenus' ? <DocsPanel docs={data.docs} spaces={data.spaces} media={data.media} /> : null}
        {tab === 'Espaces' ? <SpacesPanel spaces={data.spaces} /> : null}
        {tab === 'Applications' ? <AppsPanel apps={data.apps} /> : null}
        {tab === 'Médias' ? <MediaPanel media={data.media} /> : null}
        {tab === 'Favoris publics' ? <FavoritesPanel favorites={data.favorites} /> : null}
        {tab === 'Réglages' ? <SettingsPanel settings={data.settings} spaces={data.spaces} backups={data.backups} /> : null}
      </div>
    </div>
  );
}

function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries();
  };
}

/* ------------------------------ contenus ------------------------------ */

function emptyDoc(spaceSlug: string): Doc {
  const iso = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    space_slug: spaceSlug,
    slug: '',
    title: '',
    excerpt: '',
    body: '## Titre\n\nVotre contenu…',
    tags: [],
    status: 'draft',
    visibility: 'public',
    allowed_roles: [],
    author: '',
    published_at: iso,
    updated_at: iso,
  };
}

function DocsPanel({ docs, spaces, media }: { docs: Doc[]; spaces: Space[]; media: MediaItem[] }) {
  const refresh = useRefresh();
  const [current, setCurrent] = useState<Doc | null>(null);
  const [preview, setPreview] = useState('');

  const save = useMutation({
    mutationFn: (doc: Doc) => saveDoc({ data: { doc } }),
    onSuccess: () => {
      toast.success('Contenu enregistré');
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => removeDoc({ data: { id } }),
    onSuccess: () => {
      toast.success('Contenu supprimé');
      setCurrent(null);
      refresh();
    },
  });

  useEffect(() => {
    if (!current) return;
    const id = window.setTimeout(() => {
      previewMarkdown({ data: { body: current.body } })
        .then((r) => setPreview(r.html))
        .catch(() => setPreview(''));
    }, 400);
    return () => window.clearTimeout(id);
  }, [current?.body, current]);

  if (!spaces.length) return <p className="text-sm text-muted-foreground">Aucun espace accessible en rédaction.</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <div>
        <button className={primaryBtn} onClick={() => setCurrent(emptyDoc(spaces[0]!.slug))}>
          <Plus className="size-4" /> Nouveau contenu
        </button>
        <ul className="mt-4 space-y-2">
          {docs.map((doc) => (
            <li key={doc.id}>
              <button onClick={() => setCurrent(doc)} className="surface w-full p-3 text-left text-sm hover:border-primary">
                <span className="font-medium">{doc.title || '(sans titre)'}</span>
                <span className="mt-1 block font-mono text-xs text-muted-foreground">
                  {doc.space_slug} · {doc.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {current ? (
        <div className="surface space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className={label}>Titre</p>
              <input
                className={field}
                value={current.title}
                onChange={(e) =>
                  setCurrent({
                    ...current,
                    title: e.target.value,
                    slug: current.slug || slugify(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <p className={label}>Adresse (slug)</p>
              <input className={field} value={current.slug} onChange={(e) => setCurrent({ ...current, slug: slugify(e.target.value) })} />
            </div>
            <div>
              <p className={label}>Espace</p>
              <select className={field} value={current.space_slug} onChange={(e) => setCurrent({ ...current, space_slug: e.target.value })}>
                {spaces.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name} ({s.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className={label}>État</p>
              <select className={field} value={current.status} onChange={(e) => setCurrent({ ...current, status: e.target.value as Doc['status'] })}>
                <option value="draft">brouillon</option>
                <option value="published">publié</option>
                <option value="archived">archivé</option>
              </select>
            </div>
            <div>
              <p className={label}>Visibilité</p>
              <select className={field} value={current.visibility} onChange={(e) => setCurrent({ ...current, visibility: e.target.value as Doc['visibility'] })}>
                <option value="public">public</option>
                <option value="restricted">réservé</option>
              </select>
            </div>
            <div>
              <p className={label}>Rôles autorisés (séparés par des virgules)</p>
              <input
                className={field}
                value={current.allowed_roles.join(', ')}
                onChange={(e) =>
                  setCurrent({
                    ...current,
                    allowed_roles: e.target.value
                      .split(',')
                      .map((r) => r.trim().toUpperCase())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <p className={label}>Résumé</p>
              <input className={field} value={current.excerpt} onChange={(e) => setCurrent({ ...current, excerpt: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <p className={label}>Tags</p>
              <input
                className={field}
                value={current.tags.join(', ')}
                onChange={(e) =>
                  setCurrent({
                    ...current,
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <p className={label}>Contenu — Markdown, HTML, blocs ```chart, ```mermaid et encadrés :::info</p>
              <textarea className={`${field} min-h-[24rem] font-mono`} value={current.body} onChange={(e) => setCurrent({ ...current, body: e.target.value })} />
              {media.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {media.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      className="rounded border border-border px-2 py-1 text-xs"
                      onClick={() =>
                        setCurrent({
                          ...current,
                          body: `${current.body}\n\n![${item.name}](${item.url})\n`,
                        })
                      }
                    >
                      + {item.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <p className={label}>Aperçu</p>
              <div className="mt-1 max-h-[24rem] overflow-auto rounded-md border border-border p-3">
                <RichContent html={preview} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className={primaryBtn} onClick={() => save.mutate(current)} disabled={save.isPending}>
              <Save className="size-4" /> Enregistrer
            </button>
            <button className={ghostBtn} onClick={() => del.mutate(current.id)}>
              <Trash2 className="size-4" /> Supprimer
            </button>
            <button className={ghostBtn} onClick={() => setCurrent(null)}>
              Fermer
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sélectionnez un contenu ou créez-en un nouveau.</p>
      )}
    </div>
  );
}

/* ------------------------------- espaces ------------------------------- */

function SpacesPanel({ spaces }: { spaces: Space[] }) {
  const refresh = useRefresh();
  const [draft, setDraft] = useState<Space | null>(null);
  const save = useMutation({
    mutationFn: (space: Space) => saveSpace({ data: { space } }),
    onSuccess: () => {
      toast.success('Espace enregistré');
      setDraft(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => removeSpace({ data: { id } }),
    onSuccess: () => {
      toast.success('Espace supprimé');
      refresh();
    },
  });

  return (
    <div className="space-y-4">
      <button
        className={primaryBtn}
        onClick={() =>
          setDraft({
            id: crypto.randomUUID(),
            name: '',
            type: 'wiki',
            description: '',
            accent: '#22D3A6',
            visibility: 'public',
            allowed_roles: [],
            write_roles: [],
            position: spaces.length + 1,
          })
        }
      >
        <Plus className="size-4" /> Nouvel espace
      </button>

      {draft ? (
        <div className="surface grid gap-3 p-4 sm:grid-cols-2">
          <div>
            <p className={label}>Nom</p>
            <input
              className={field}
              value={draft.name}
              onChange={(e) => {
                const slug = draft.slug || slugify(e.target.value);
                const roles = spaceRoleNames(slug);
                setDraft({
                  ...draft,
                  name: e.target.value,
                  slug,
                  allowed_roles: draft.visibility === 'restricted' ? [roles.read] : draft.allowed_roles,
                  write_roles: draft.write_roles.length ? draft.write_roles : [roles.write],
                });
              }}
            />
          </div>
          <div>
            <p className={label}>Adresse</p>
            <input className={field} value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} />
          </div>
          <div>
            <p className={label}>Type</p>
            <select className={field} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Space['type'] })}>
              <option value="wiki">wiki</option>
              <option value="blog">blog</option>
            </select>
          </div>
          <div>
            <p className={label}>Couleur d'accent</p>
            <input className={field} value={draft.accent} onChange={(e) => setDraft({ ...draft, accent: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <p className={label}>Description</p>
            <input className={field} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div>
            <p className={label}>Visibilité</p>
            <select className={field} value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value as Space['visibility'] })}>
              <option value="public">public</option>
              <option value="restricted">réservé</option>
            </select>
          </div>
          <div>
            <p className={label}>Rôles de lecture</p>
            <input
              className={field}
              value={draft.allowed_roles.join(', ')}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  allowed_roles: e.target.value
                    .split(',')
                    .map((r) => r.trim().toUpperCase())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <div>
            <p className={label}>Rôles de rédaction</p>
            <input
              className={field}
              value={draft.write_roles.join(', ')}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  write_roles: e.target.value
                    .split(',')
                    .map((r) => r.trim().toUpperCase())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button className={primaryBtn} onClick={() => save.mutate(draft)}>
              <Save className="size-4" /> Enregistrer
            </button>
            <button className={ghostBtn} onClick={() => setDraft(null)}>
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {spaces.map((space) => (
          <li key={space.id} className="surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono">{space.name}</p>
                <p className="text-xs text-muted-foreground">
                  /espaces/{space.slug} · {space.type} · {space.visibility}
                </p>
              </div>
              <div className="flex gap-2">
                <button className={ghostBtn} onClick={() => setDraft(space)}>
                  Modifier
                </button>
                <button className={ghostBtn} onClick={() => del.mutate(space.id)} aria-label="Supprimer">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Rôles : {[...space.allowed_roles, ...space.write_roles].join(', ') || 'aucun'}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------- applications ---------------------------- */

function AppsPanel({ apps }: { apps: AppEntry[] }) {
  const refresh = useRefresh();
  const [draft, setDraft] = useState<AppEntry | null>(null);
  const save = useMutation({
    mutationFn: (app: AppEntry) => saveApp({ data: { app } }),
    onSuccess: () => {
      toast.success('Application enregistrée');
      setDraft(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => removeApp({ data: { id } }),
    onSuccess: () => {
      toast.success('Application supprimée');
      refresh();
    },
  });

  return (
    <div className="space-y-4">
      <button
        className={primaryBtn}
        onClick={() =>
          setDraft({
            id: crypto.randomUUID(),
            name: '',
            description: '',
            category: 'Outils',
            url: '',
            tags: [],
            container_name: '',
            visibility: 'public',
            allowed_roles: [],
            state: 'unknown',
            state_at: new Date().toISOString(),
          })
        }
      >
        <Plus className="size-4" /> Nouvelle application
      </button>

      {draft ? (
        <div className="surface grid gap-3 p-4 sm:grid-cols-2">
          {(
            [
              ['Nom', 'name'],
              ['Catégorie', 'category'],
              ["Lien d'accès", 'url'],
              ['Nom du conteneur', 'container_name'],
            ] as [string, keyof AppEntry][]
          ).map(([lbl, key]) => (
            <div key={key}>
              <p className={label}>{lbl}</p>
              <input
                className={field}
                value={String(draft[key] ?? '')}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    [key]: e.target.value,
                  })
                }
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <p className={label}>Description</p>
            <input className={field} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div>
            <p className={label}>Tags</p>
            <input
              className={field}
              value={draft.tags.join(', ')}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <div>
            <p className={label}>Visibilité</p>
            <select className={field} value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value as AppEntry['visibility'] })}>
              <option value="public">public</option>
              <option value="restricted">réservé</option>
            </select>
          </div>
          <div>
            <p className={label}>Rôles autorisés</p>
            <input
              className={field}
              value={draft.allowed_roles.join(', ')}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  allowed_roles: e.target.value
                    .split(',')
                    .map((r) => r.trim().toUpperCase())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button className={primaryBtn} onClick={() => save.mutate(draft)}>
              <Save className="size-4" /> Enregistrer
            </button>
            <button className={ghostBtn} onClick={() => setDraft(null)}>
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {apps.map((app) => (
          <li key={app.id} className="surface flex items-start justify-between gap-2 p-4">
            <div>
              <p className="font-mono">{app.name}</p>
              <p className="text-xs text-muted-foreground">{app.state}</p>
            </div>
            <div className="flex gap-2">
              <button
                className={ghostBtn}
                onClick={() =>
                  setDraft({
                    ...app,
                    id: crypto.randomUUID(),
                    state: 'unknown',
                    state_at: new Date().toISOString(),
                  })
                }
                aria-label={`Dupliquer ${app.name}`}
                title="Dupliquer"
              >
                <Copy className="size-4" />
              </button>
              <button className={ghostBtn} onClick={() => setDraft(app)} aria-label={`Modifier ${app.name}`} title="Modifier">
                <Pencil className="size-4" />
              </button>
              <button className={ghostBtn} onClick={() => del.mutate(app.id)} aria-label="Supprimer">
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------- médias ------------------------------- */

function MediaPanel({ media }: { media: MediaItem[] }) {
  const refresh = useRefresh();
  const add = useMutation({
    mutationFn: (item: MediaItem) => addMedia({ data: { item } }),
    onSuccess: () => {
      toast.success('Image ajoutée');
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => removeMedia({ data: { id } }),
    onSuccess: refresh,
  });

  const onFile = async (file: File) => {
    if (file.size > 400_000) {
      toast.error('Image trop lourde (400 Ko max en stockage intégré). Utilisez une adresse externe.');
      return;
    }
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    add.mutate({
      id: crypto.randomUUID(),
      name: file.name,
      url: dataUrl,
      width: 0,
      height: 0,
      created_at: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
          className="text-sm"
        />
        <button
          className={ghostBtn}
          onClick={() => {
            const url = window.prompt("Adresse de l'image (par exemple sur votre MinIO)");
            if (!url) return;
            add.mutate({
              id: crypto.randomUUID(),
              name: url.split('/').pop() ?? 'image',
              url,
              width: 0,
              height: 0,
              created_at: new Date().toISOString(),
            });
          }}
        >
          Ajouter par adresse
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {media.map((item) => (
          <li key={item.id} className="surface overflow-hidden">
            <img src={item.url} alt={item.name} className="h-28 w-full object-cover" loading="lazy" />
            <div className="flex items-center justify-between gap-2 p-2">
              <span className="truncate text-xs">{item.name}</span>
              <button onClick={() => del.mutate(item.id)} aria-label="Supprimer">
                <Trash2 className="size-4 text-muted-foreground" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------- favoris publics --------------------------- */

function FavoritesPanel({ favorites }: { favorites: Favorite[] }) {
  const refresh = useRefresh();
  const [items, setItems] = useState(favorites.map(({ user_id: _u, ...rest }) => rest));
  const save = useMutation({
    mutationFn: () => savePublicFavorites({ data: { favorites: items.filter((i) => i.label && i.href) } }),
    onSuccess: () => {
      toast.success('Favoris publics enregistrés');
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id} className="surface flex flex-col gap-2 p-3 sm:flex-row">
          <input className={`${field} sm:w-56`} value={item.label} placeholder="Intitulé" onChange={(e) => setItems(items.map((it, i) => (i === index ? { ...it, label: e.target.value } : it)))} />
          <input
            className={`${field} font-mono`}
            value={item.href}
            placeholder="/applications/…"
            onChange={(e) => setItems(items.map((it, i) => (i === index ? { ...it, href: e.target.value } : it)))}
          />
          <button className={ghostBtn} onClick={() => setItems(items.filter((_, i) => i !== index))}>
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <div className="flex gap-3">
        <button
          className={ghostBtn}
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
        >
          <Plus className="size-4" /> Ajouter
        </button>
        <button className={primaryBtn} onClick={() => save.mutate()}>
          <Save className="size-4" /> Enregistrer
        </button>
      </div>
    </div>
  );
}

/* ------------------------------- réglages ------------------------------ */

function SettingsPanel({
  settings,
  spaces,
  backups,
}: {
  settings: SiteSettings;
  spaces: Space[];
  backups: {
    id: string;
    created_at: string;
    size_bytes: number;
    status: string;
    message: string;
  }[];
}) {
  const refresh = useRefresh();
  const [draft, setDraft] = useState(settings);
  const save = useMutation({
    mutationFn: () => saveSiteSettings({ data: { settings: draft } }),
    onSuccess: () => {
      toast.success('Réglages enregistrés');
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="surface grid gap-3 p-4 sm:grid-cols-2">
        <div>
          <p className={label}>Titre du site</p>
          <input className={field} value={draft.site_title} onChange={(e) => setDraft({ ...draft, site_title: e.target.value })} />
        </div>
        <div>
          <p className={label}>Accroche</p>
          <input className={field} value={draft.site_tagline} onChange={(e) => setDraft({ ...draft, site_tagline: e.target.value })} />
        </div>
        <div>
          <p className={label}>Espace affiché sur /memo</p>
          <select className={field} value={draft.memo_space} onChange={(e) => setDraft({ ...draft, memo_space: e.target.value })}>
            {spaces.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className={label}>Planification des sauvegardes (cron)</p>
          <input className={field} value={draft.backup_cron} onChange={(e) => setDraft({ ...draft, backup_cron: e.target.value })} />
        </div>
        <div>
          <p className={label}>Copies conservées</p>
          <input type="number" className={field} value={draft.backup_keep} onChange={(e) => setDraft({ ...draft, backup_keep: Number(e.target.value) })} />
        </div>
        <div className="flex items-end">
          <button className={primaryBtn} onClick={() => save.mutate()}>
            <Save className="size-4" /> Enregistrer
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg">Sauvegardes</h2>
        <p className="mt-1 text-sm text-muted-foreground">Remontées par l'agent installé à côté de votre PostgreSQL.</p>
        <ul className="mt-3 space-y-2">
          {backups.map((backup) => (
            <li key={backup.id} className="surface flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="font-mono">{new Date(backup.created_at).toLocaleString('fr-FR')}</span>
              <span>{(backup.size_bytes / 1_048_576).toFixed(1)} Mo</span>
              <span className={backup.status === 'ok' ? 'text-primary' : 'text-destructive'}>{backup.status}</span>
              <span className="text-muted-foreground">{backup.message}</span>
            </li>
          ))}
          {backups.length === 0 ? <li className="text-sm text-muted-foreground">Aucune sauvegarde remontée.</li> : null}
        </ul>
      </div>
    </div>
  );
}
