import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Copy, Pencil, Plus, Save, Settings, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { RichContent } from '@/components/rich-content';
import {
  addMedia,
  getSpaceDeletionImpact,
  previewMarkdown,
  removeApp,
  removeCategory,
  removeDoc,
  removeMedia,
  removeSpace,
  saveApp,
  saveCategory,
  saveDoc,
  savePublicFavorites,
  saveSiteSettings,
  saveSpace,
} from '@/lib/admin.functions';
import { adminQuery } from '@/lib/queries';
import { slugify, spaceRoleNames, type AppEntry, type Category, type Doc, type Favorite, type MediaItem, type SiteSettings, type Space } from '@/lib/types';
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

const TABS = ['Contenus', 'Espaces', 'Applications', 'Médias', 'Favoris', 'Réglages'] as const;
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
        {tab === 'Applications' ? <AppsPanel apps={data.apps} categories={data.categories ?? []} /> : null}
        {tab === 'Médias' ? <MediaPanel media={data.media} /> : null}
        {tab === 'Favoris' ? <FavoritesPanel favorites={data.favorites} categories={data.categories ?? []} /> : null}
        {tab === 'Réglages' ? <SettingsPanel settings={data.settings} spaces={data.spaces} docs={data.docs} backups={data.backups} /> : null}
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
  const [original, setOriginal] = useState<Doc | null>(null);
  const [preview, setPreview] = useState('');

  const save = useMutation({
    mutationFn: (doc: Doc) => saveDoc({ data: { doc } }),
    onSuccess: () => {
      toast.success('Contenu enregistré');
      setOriginal(current);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => removeDoc({ data: { id } }),
    onSuccess: () => {
      toast.success('Contenu supprimé');
      setCurrent(null);
      setOriginal(null);
      refresh();
    },
  });

  // Détecter si des changements ont été faits
  const hasChanges = current && original && JSON.stringify(current) !== JSON.stringify(original);

  // Fonction pour fermer avec confirmation si nécessaire
  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm('Des modifications non enregistrées seront perdues. Continuer ?')) {
        setCurrent(null);
        setOriginal(null);
      }
    } else {
      setCurrent(null);
      setOriginal(null);
    }
  };

  // Fonction pour sélectionner un document
  const selectDoc = (doc: Doc) => {
    if (hasChanges) {
      if (window.confirm('Des modifications non enregistrées seront perdues. Continuer ?')) {
        setCurrent(doc);
        setOriginal(JSON.parse(JSON.stringify(doc)));
      }
    } else {
      setCurrent(doc);
      setOriginal(JSON.parse(JSON.stringify(doc)));
    }
  };

  // Fonction pour créer un nouveau document
  const createNew = () => {
    if (hasChanges) {
      if (window.confirm('Des modifications non enregistrées seront perdues. Continuer ?')) {
        const newDoc = emptyDoc(spaces[0]!.slug);
        setCurrent(newDoc);
        setOriginal(JSON.parse(JSON.stringify(newDoc)));
      }
    } else {
      const newDoc = emptyDoc(spaces[0]!.slug);
      setCurrent(newDoc);
      setOriginal(JSON.parse(JSON.stringify(newDoc)));
    }
  };

  useEffect(() => {
    if (!current) return;
    const id = window.setTimeout(() => {
      previewMarkdown({ data: { body: current.body } })
        .then((r) => setPreview(r.html))
        .catch(() => setPreview(''));
    }, 400);
    return () => window.clearTimeout(id);
  }, [current?.body, current]);

  // Gestion de la touche Escape
  useEffect(() => {
    if (!current) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (hasChanges) {
          if (window.confirm('Des modifications non enregistrées seront perdues. Continuer ?')) {
            setCurrent(null);
            setOriginal(null);
          }
        } else {
          setCurrent(null);
          setOriginal(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [current, hasChanges]);

  if (!spaces.length) return <p className="text-sm text-muted-foreground">Aucun espace accessible en rédaction.</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <div>
        <button className={primaryBtn} onClick={createNew}>
          <Plus className="size-4" /> Nouveau contenu
        </button>
        <ul className="mt-4 space-y-2">
          {docs.map((doc) => (
            <li key={doc.id}>
              <button onClick={() => selectDoc(doc)} className="surface w-full p-3 text-left text-sm hover:border-primary">
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
                onChange={(e) => {
                  const newTitle = e.target.value;
                  // Ne recalculer le slug automatiquement que si l'utilisateur ne l'a pas modifié manuellement
                  // On détecte cela en vérifiant si le slug actuel correspond au slug du titre actuel
                  const shouldUpdateSlug = !current.title || current.slug === slugify(current.title) || current.slug === '';
                  setCurrent({
                    ...current,
                    title: newTitle,
                    slug: shouldUpdateSlug ? slugify(newTitle) : current.slug,
                  });
                }}
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
            <button className={ghostBtn} onClick={handleClose}>
              Fermer {hasChanges ? '(Esc)' : ''}
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
    onSuccess: (result) => {
      if (result.deletedDocs > 0) {
        toast.success(`Espace et ${result.deletedDocs} page(s) supprimé(s)`);
      } else {
        toast.success('Espace supprimé');
      }
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDelete = async (space: Space) => {
    try {
      const impact = await getSpaceDeletionImpact({ data: { id: space.id } });
      
      let message = `Voulez-vous vraiment supprimer l'espace « ${impact.spaceName} » (${impact.spaceType}) ?`;
      
      if (impact.docsCount > 0) {
        message += `\n\n⚠️ Cela supprimera également ${impact.docsCount} page(s) associée(s)`;
        if (impact.publishedDocsCount > 0) {
          message += ` dont ${impact.publishedDocsCount} publiée(s).`;
        } else {
          message += '.';
        }
      }
      
      if (window.confirm(message)) {
        del.mutate(space.id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la vérification');
    }
  };

  return (
    <div className="space-y-4">
      <button
        className={primaryBtn}
        onClick={() =>
          setDraft({
            id: crypto.randomUUID(),
            slug: '',
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
                // Ne recalculer le slug et les rôles que pour les nouveaux espaces
                const isNew = !spaces.find((s) => s.id === draft.id);
                if (isNew && !draft.slug) {
                  const slug = slugify(e.target.value);
                  const roles = spaceRoleNames(slug);
                  setDraft({
                    ...draft,
                    name: e.target.value,
                    slug,
                    allowed_roles: draft.visibility === 'restricted' ? [roles.read] : draft.allowed_roles,
                    write_roles: draft.write_roles.length ? draft.write_roles : [roles.write],
                  });
                } else {
                  setDraft({ ...draft, name: e.target.value });
                }
              }}
            />
          </div>
          <div>
            <p className={label}>Adresse{spaces.find((s) => s.id === draft.id) ? ' (non modifiable)' : ''}</p>
            <input 
              className={field} 
              value={draft.slug} 
              onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
              readOnly={!!spaces.find((s) => s.id === draft.id)}
              disabled={!!spaces.find((s) => s.id === draft.id)}
            />
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
                <button className={ghostBtn} onClick={() => void handleDelete(space)} aria-label="Supprimer">
                  <Trash2 className="size-4 text-destructive" />
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

/* ----------------------------- catégories ------------------------------ */

function CategoryManagerModal({ categories, isOpen, onClose, onSelectCategory }: { categories: Category[]; isOpen: boolean; onClose: () => void; onSelectCategory?: (name: string) => void }) {
  const refresh = useRefresh();
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

  const saveMut = useMutation({
    mutationFn: (payload: { category: Category; oldName?: string }) => saveCategory({ data: payload }),
    onSuccess: (_, vars) => {
      toast.success('Catégorie enregistrée');
      refresh();
      if (!vars.oldName && onSelectCategory) {
        onSelectCategory(vars.category.name);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (payload: { id: string; name: string }) => removeCategory({ data: payload }),
    onSuccess: () => {
      toast.success('Catégorie supprimée');
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Cette catégorie existe déjà');
      return;
    }
    saveMut.mutate({
      category: {
        id: crypto.randomUUID(),
        name: trimmed,
        position: categories.length + 1,
      },
    });
    setNewCatName('');
  };

  const handleSaveEdit = (c: Category) => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === c.name) {
      setEditingId(null);
      return;
    }
    if (categories.some((item) => item.id !== c.id && item.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Ce nom de catégorie existe déjà');
      return;
    }
    saveMut.mutate({
      category: {
        ...c,
        name: trimmed,
      },
      oldName: c.name,
    });
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="surface w-full max-w-lg space-y-4 rounded-lg p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-lg font-medium">Gestion des catégories</h3>
            <p className="text-xs text-muted-foreground">La suppression est bloquée tant qu'une catégorie est utilisée par au moins une application ou un favori.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {/* Formulaire d'ajout */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <input className={field} placeholder="Nouvelle catégorie..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
          <button type="submit" className={primaryBtn} disabled={saveMut.isPending || !newCatName.trim()}>
            <Plus className="size-4" /> Créer
          </button>
        </form>

        {/* Liste des catégories existantes */}
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {sortedCategories.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucune catégorie enregistrée.</p>
          ) : (
            sortedCategories.map((c) => {
              const appsCount = c.apps_count ?? 0;
              const favsCount = c.favorites_count ?? 0;
              const isUsed = appsCount > 0 || favsCount > 0;

              return (
                <div key={c.id} className="surface flex items-center justify-between gap-2 p-2.5">
                  {editingId === c.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input className={field} value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                      <button type="button" className={primaryBtn} onClick={() => handleSaveEdit(c)} disabled={saveMut.isPending}>
                        <Save className="size-4" />
                      </button>
                      <button type="button" className={ghostBtn} onClick={() => setEditingId(null)}>
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {appsCount} application{appsCount > 1 ? 's' : ''} · {favsCount} favori{favsCount > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className={ghostBtn}
                          onClick={() => {
                            setEditingId(c.id);
                            setEditName(c.name);
                          }}
                          title="Modifier"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          className={`${ghostBtn} ${isUsed ? 'cursor-not-allowed opacity-40' : ''}`}
                          disabled={isUsed || removeMut.isPending}
                          onClick={() => {
                            if (isUsed) return;
                            if (window.confirm(`Supprimer la catégorie « ${c.name} » ?`)) {
                              removeMut.mutate({ id: c.id, name: c.name });
                            }
                          }}
                          title={isUsed ? `Suppression impossible : utilisée par ${appsCount} application(s) et ${favsCount} favori(s)` : 'Supprimer'}
                        >
                          <Trash2 className={`size-3.5 ${isUsed ? 'text-muted-foreground' : 'text-destructive'}`} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end border-t border-border pt-3">
          <button type="button" onClick={onClose} className={ghostBtn}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function CategorySelect({ value, onChange, categories }: { value: string; onChange: (val: string) => void; categories: Category[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

  return (
    <div className="flex items-center gap-2">
      <select
        className={`${field} flex-1`}
        value={value}
        onChange={(e) => {
          if (e.target.value === '__manage__') {
            setModalOpen(true);
          } else {
            onChange(e.target.value);
          }
        }}
      >
        <option value="">Sélectionner une catégorie...</option>
        {sortedCategories.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
        {value && !categories.some((c) => c.name === value) ? <option value={value}>{value} (non répertoriée)</option> : null}
        <option value="__manage__">+ Gérer les catégories...</option>
      </select>
      <button type="button" onClick={() => setModalOpen(true)} className={ghostBtn} title="Gérer les catégories">
        <Settings className="size-4" />
      </button>

      <CategoryManagerModal categories={categories} isOpen={modalOpen} onClose={() => setModalOpen(false)} onSelectCategory={(name) => onChange(name)} />
    </div>
  );
}

/* ----------------------------- applications ---------------------------- */

function AppsPanel({ apps, categories }: { apps: AppEntry[]; categories: Category[] }) {
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
            category: categories[0]?.name ?? 'Outils',
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
          <div className="flex items-center justify-between border-b border-border pb-2 sm:col-span-2">
            <h3 className="font-medium">
              {apps.some((a) => a.id === draft.id) ? `Modifier « ${draft.name || 'Application'} »` : 'Nouvelle application'}
            </h3>
            <button type="button" onClick={() => setDraft(null)} className="text-xs text-muted-foreground hover:text-foreground">
              Fermer
            </button>
          </div>
          <div>
            <p className={label}>Nom</p>
            <input className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <p className={label}>Catégorie</p>
            <CategorySelect value={draft.category} onChange={(cat) => setDraft({ ...draft, category: cat })} categories={categories} />
          </div>
          <div>
            <p className={label}>Lien d'accès</p>
            <input className={field} value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          </div>
          <div>
            <p className={label}>Nom du conteneur</p>
            <input className={field} value={draft.container_name} onChange={(e) => setDraft({ ...draft, container_name: e.target.value })} />
          </div>
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
            <button className={primaryBtn} onClick={() => save.mutate(draft)} disabled={save.isPending}>
              <Save className="size-4" /> {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {apps.some((a) => a.id === draft.id) ? (
              <button 
                className={ghostBtn} 
                onClick={() => {
                  if (window.confirm(`Supprimer l'application « ${draft.name} » ?`)) {
                    del.mutate(draft.id);
                  }
                }}
              >
                <Trash2 className="size-4 text-destructive" /> Supprimer
              </button>
            ) : null}
            <button className={ghostBtn} onClick={() => setDraft(null)}>
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {[...apps].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })).map((app) => (
          <li key={app.id} className="surface flex items-start justify-between gap-2 p-4">
            <div>
              <p className="font-mono">{app.name}</p>
              <div className="flex gap-2 items-center">
                <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary">{app.category}</span>
                <span className="text-xs text-muted-foreground">{app.state}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className={ghostBtn} onClick={() => setDraft(app)}>
                Modifier
              </button>
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
              <button className={ghostBtn} onClick={() => del.mutate(app.id)} aria-label="Supprimer">
                <Trash2 className="size-4 text-destructive" />
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

type FavItem = Omit<Favorite, 'user_id'>;

function emptyFav(position: number): FavItem {
  return {
    id: crypto.randomUUID(),
    label: '',
    href: '',
    kind: 'link',
    position,
    category: '',
    description: '',
    tags: [],
    visibility: 'public',
    allowed_roles: [],
  };
}

function FavoriteRow({
  item,
  index,
  categories,
  onChange,
  onRemove,
}: {
  item: FavItem;
  index: number;
  categories: Category[];
  onChange: (index: number, patch: Partial<FavItem>) => void;
  onRemove: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="surface space-y-3 p-3">
      {/* ligne principale */}
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${field} min-w-0 flex-1 sm:w-48 sm:flex-none`} value={item.label} placeholder="Intitulé" onChange={(e) => onChange(index, { label: e.target.value })} />
        <input className={`${field} min-w-0 flex-[2] font-mono`} value={item.href} placeholder="https://… ou /chemin-interne" onChange={(e) => onChange(index, { href: e.target.value })} />
        {/* catégorie : sélection avec gestionnaire */}
        <div className="min-w-[12rem] flex-1">
          <CategorySelect value={item.category} onChange={(val) => onChange(index, { category: val })} categories={categories} />
        </div>
        <button type="button" className={ghostBtn} title="Options avancées" onClick={() => setOpen((o) => !o)}>
          {open ? '▲' : '▼'}
        </button>
        <button type="button" className={ghostBtn} onClick={() => onRemove(index)}>
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* options avancées */}
      {open ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className={label}>Description</p>
            <input className={field} value={item.description} placeholder="Brève description (optionnelle)" onChange={(e) => onChange(index, { description: e.target.value })} />
          </div>
          <div>
            <p className={label}>Tags (séparés par des virgules)</p>
            <input
              className={field}
              value={item.tags.join(', ')}
              onChange={(e) =>
                onChange(index, {
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
            <select className={field} value={item.visibility} onChange={(e) => onChange(index, { visibility: e.target.value as Favorite['visibility'] })}>
              <option value="public">public</option>
              <option value="restricted">réservé</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <p className={label}>Rôles autorisés (séparés par des virgules)</p>
            <input
              className={field}
              value={item.allowed_roles.join(', ')}
              onChange={(e) =>
                onChange(index, {
                  allowed_roles: e.target.value
                    .split(',')
                    .map((r) => r.trim().toUpperCase())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function useFavoritesState(initial: Favorite[]) {
  const [items, setItems] = useState<FavItem[]>(initial.map(({ user_id: _u, ...rest }) => rest));
  const onChange = (index: number, patch: Partial<FavItem>) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const onRemove = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));
  const onAdd = () => setItems((prev) => [...prev, emptyFav(prev.length + 1)]);
  return { items, onChange, onRemove, onAdd };
}

function FavoritesPanel({ favorites, categories }: { favorites: Favorite[]; categories: Category[] }) {
  const refresh = useRefresh();
  const { items, onChange, onRemove, onAdd } = useFavoritesState(favorites);
  const save = useMutation({
    mutationFn: () => savePublicFavorites({ data: { favorites: items.filter((i) => i.label && i.href) } }),
    onSuccess: () => {
      toast.success('Favoris enregistrés');
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <FavoriteRow key={item.id} item={item} index={index} categories={categories} onChange={onChange} onRemove={onRemove} />
      ))}
      <div className="flex gap-3">
        <button className={ghostBtn} onClick={onAdd}>
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
  docs,
  backups,
}: {
  settings: SiteSettings;
  spaces: Space[];
  docs: Doc[];
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

  // Filtrer les documents publiés et publics uniquement
  const publicDocs = docs.filter(d => d.status === 'published' && d.visibility === 'public');

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
        <div className="sm:col-span-2">
          <p className={label}>Document affiché sur /memo</p>
          <select className={field} value={draft.memo_doc_id} onChange={(e) => setDraft({ ...draft, memo_doc_id: e.target.value })}>
            <option value="">-- Sélectionner un document publié --</option>
            {publicDocs.map((d) => {
              const space = spaces.find(s => s.slug === d.space_slug);
              return (
                <option key={d.id} value={d.id}>
                  {d.title} ({space?.name} · {space?.type})
                </option>
              );
            })}
          </select>
          {draft.memo_doc_id && !docs.find((d) => d.id === draft.memo_doc_id) ? (
            <p className="mt-1 text-xs text-destructive">⚠ Le document sélectionné n'existe plus. Veuillez en sélectionner un autre.</p>
          ) : null}
          {publicDocs.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">Aucun document publié et public disponible.</p>
          ) : null}
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
