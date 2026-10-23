import type { AppEntry, BackupEntry, Doc, Favorite, MediaItem, SiteSettings, Space } from './types';

const now = '2026-09-10T10:00:00.000Z';

export const demoSpaces: Space[] = [
  {
    id: 'sp-maison',
    slug: 'maison',
    name: 'Maison',
    type: 'wiki',
    description: 'Documentation du réseau, de la domotique et des sauvegardes familiales.',
    accent: '#22D3A6',
    visibility: 'public',
    allowed_roles: [],
    write_roles: ['ESPACE_MAISON_REDACTION'],
    position: 1,
  },
  {
    id: 'sp-famille',
    slug: 'famille',
    name: 'Famille',
    type: 'blog',
    description: 'Nouvelles et notes partagées avec la famille.',
    accent: '#7DD3FC',
    visibility: 'restricted',
    allowed_roles: ['ESPACE_FAMILLE_LECTURE'],
    write_roles: ['ESPACE_FAMILLE_REDACTION'],
    position: 2,
  },
  {
    id: 'sp-pro',
    slug: 'pro',
    name: 'Pro',
    type: 'blog',
    description: "Retours d'expérience techniques et veille professionnelle.",
    accent: '#F59E0B',
    visibility: 'public',
    allowed_roles: [],
    write_roles: ['ESPACE_PRO_REDACTION'],
    position: 3,
  },
];

export const demoDocs: Doc[] = [
  {
    id: 'doc-reseau',
    space_slug: 'maison',
    slug: 'reseau-domotique',
    title: 'Réseau domotique',
    excerpt: 'Plan des VLAN, des passerelles et des capteurs de la maison.',
    body: `## Topologie

Le réseau est segmenté en trois VLAN afin d'isoler les objets connectés.

\`\`\`mermaid
graph TD
  A[Box opérateur] --> B[Routeur OPNsense]
  B --> C[VLAN 10 - Confiance]
  B --> D[VLAN 20 - IoT]
  B --> E[VLAN 30 - Invités]
  D --> F[Zigbee]
  D --> G[Caméras]
\`\`\`

:::info
Les caméras n'ont aucun accès sortant : seul le NVR peut les joindre.
:::

## Consommation mensuelle

\`\`\`chart
{
  "type": "bar",
  "title": "Consommation (kWh)",
  "data": [
    { "name": "Avr", "value": 210 },
    { "name": "Mai", "value": 188 },
    { "name": "Juin", "value": 174 },
    { "name": "Juil", "value": 165 },
    { "name": "Août", "value": 160 }
  ]
}
\`\`\`

## Points d'attention

- Sauvegarde de la configuration OPNsense chaque dimanche.
- Renouvellement automatique des certificats internes.
`,
    tags: ['réseau', 'domotique', 'vlan'],
    status: 'published',
    visibility: 'public',
    allowed_roles: [],
    author: 'lapsus63',
    published_at: now,
    updated_at: now,
  },
  {
    id: 'doc-sauvegardes',
    space_slug: 'maison',
    slug: 'strategie-de-sauvegarde',
    title: 'Stratégie de sauvegarde',
    excerpt: 'Règle 3-2-1 appliquée au lab : instantanés, réplication et copie hors site.',
    body: `## Règle 3-2-1

| Copie | Support | Fréquence |
| --- | --- | --- |
| Primaire | NVMe du NAS | continue |
| Secondaire | Disques rotatifs | quotidienne |
| Hors site | Stockage objet chiffré | hebdomadaire |

:::warning
Une sauvegarde non testée n'est pas une sauvegarde. Restauration de contrôle chaque trimestre.
:::
`,
    tags: ['sauvegarde', 'nas'],
    status: 'published',
    visibility: 'public',
    allowed_roles: [],
    author: 'lapsus63',
    published_at: now,
    updated_at: now,
  },
  {
    id: 'doc-kube',
    space_slug: 'pro',
    slug: 'migration-vers-kubernetes',
    title: 'Migration vers Kubernetes',
    excerpt: "Pourquoi j'ai déplacé une partie du lab de Docker Compose vers k3s.",
    body: `## Le contexte

Douze conteneurs gérés à la main, c'est gérable. Trente, beaucoup moins.

## Répartition des charges

\`\`\`chart
{
  "type": "pie",
  "title": "Répartition CPU par domaine",
  "data": [
    { "name": "Média", "value": 34 },
    { "name": "Domotique", "value": 22 },
    { "name": "Outils", "value": 28 },
    { "name": "Observabilité", "value": 16 }
  ]
}
\`\`\`

## Bilan

- Déploiements reproductibles.
- Redémarrages automatiques réellement fiables.
- Une complexité supplémentaire à assumer.
`,
    tags: ['kubernetes', 'docker', 'infra'],
    status: 'published',
    visibility: 'public',
    allowed_roles: [],
    author: 'lapsus63',
    published_at: '2026-08-22T09:00:00.000Z',
    updated_at: '2026-08-22T09:00:00.000Z',
  },
  {
    id: 'doc-brouillon',
    space_slug: 'pro',
    slug: 'observabilite-2027',
    title: 'Observabilité : le plan 2027',
    excerpt: 'Notes de travail sur la refonte de la supervision.',
    body: '## En cours de rédaction\n\nPremiers éléments sur Prometheus, Loki et les alertes.',
    tags: ['observabilité'],
    status: 'draft',
    visibility: 'public',
    allowed_roles: [],
    author: 'lapsus63',
    published_at: '2026-09-12T08:00:00.000Z',
    updated_at: '2026-09-12T08:00:00.000Z',
  },
  {
    id: 'doc-famille',
    space_slug: 'famille',
    slug: 'photos-de-l-ete',
    title: "Photos de l'été",
    excerpt: 'Où retrouver les albums partagés et comment les sauvegarder.',
    body: '## Albums\n\nLes albums sont synchronisés depuis les téléphones vers Immich, puis sauvegardés chaque nuit.',
    tags: ['photos', 'famille'],
    status: 'published',
    visibility: 'restricted',
    allowed_roles: ['ESPACE_FAMILLE_LECTURE'],
    author: 'lapsus63',
    published_at: '2026-09-01T18:00:00.000Z',
    updated_at: '2026-09-01T18:00:00.000Z',
  },
];

export const demoApps: AppEntry[] = [
  {
    id: 'app-ha',
    name: 'Home Assistant',
    description: 'Cœur de la domotique : capteurs, automatisations et tableaux de bord.',
    category: 'Domotique',
    url: 'https://ha.lab.local',
    tags: ['domotique', 'zigbee'],
    container_name: 'homeassistant',
    visibility: 'public',
    allowed_roles: [],
    state: 'running',
    state_at: now,
  },
  {
    id: 'app-jellyfin',
    name: 'Jellyfin',
    description: 'Serveur multimédia pour les films, séries et musique de la maison.',
    category: 'Média',
    url: 'https://media.lab.local',
    tags: ['média', 'transcodage'],
    container_name: 'jellyfin',
    visibility: 'public',
    allowed_roles: [],
    state: 'running',
    state_at: now,
  },
  {
    id: 'app-grafana',
    name: 'Grafana',
    description: 'Tableaux de bord de supervision du lab.',
    category: 'Observabilité',
    url: 'https://grafana.lab.local',
    tags: ['métriques', 'supervision'],
    container_name: 'grafana',
    visibility: 'public',
    allowed_roles: [],
    state: 'stopped',
    state_at: now,
  },
  {
    id: 'app-vaultwarden',
    name: 'Vaultwarden',
    description: 'Coffre-fort de mots de passe de la famille.',
    category: 'Sécurité',
    url: 'https://vault.lab.local',
    tags: ['sécurité', 'mots de passe'],
    container_name: 'vaultwarden',
    visibility: 'restricted',
    allowed_roles: ['ESPACE_FAMILLE_LECTURE'],
    state: 'running',
    state_at: now,
  },
  {
    id: 'app-gitea',
    name: 'Gitea',
    description: 'Forge Git privée pour les projets personnels et professionnels.',
    category: 'Développement',
    url: 'https://git.lab.local',
    tags: ['git', 'ci'],
    container_name: 'gitea',
    visibility: 'restricted',
    allowed_roles: ['ESPACE_PRO_REDACTION'],
    state: 'running',
    state_at: now,
  },
];

export const demoFavorites: Favorite[] = [
  {
    id: 'fav-1',
    user_id: null,
    label: 'Home Assistant',
    href: 'https://ha.lab.local',
    kind: 'app',
    position: 1,
  },
  {
    id: 'fav-2',
    user_id: null,
    label: 'Jellyfin',
    href: 'https://media.lab.local',
    kind: 'app',
    position: 2,
  },
  {
    id: 'fav-3',
    user_id: null,
    label: 'Réseau domotique',
    href: '/wiki/maison/reseau-domotique',
    kind: 'wiki',
    position: 3,
  },
  {
    id: 'fav-4',
    user_id: null,
    label: 'Migration vers Kubernetes',
    href: '/blog/pro/migration-vers-kubernetes',
    kind: 'blog',
    position: 4,
  },
];

export const demoMedia: MediaItem[] = [];

export const demoBackups: BackupEntry[] = [
  {
    id: 'bk-1',
    created_at: '2026-09-13T02:00:00.000Z',
    size_bytes: 18_452_112,
    status: 'ok',
    message: 'pg_dump terminé',
  },
  {
    id: 'bk-2',
    created_at: '2026-09-12T02:00:00.000Z',
    size_bytes: 18_301_004,
    status: 'ok',
    message: 'pg_dump terminé',
  },
];

export const demoSettings: SiteSettings = {
  memo_space: 'maison',
  site_title: 'Home Lab',
  site_tagline: "Applications, notes et journal d'un laboratoire auto-hébergé",
  backup_cron: '0 2 * * *',
  backup_keep: 14,
};
