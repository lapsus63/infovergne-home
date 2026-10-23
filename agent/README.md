# Agent du lab

Petit service à lancer **dans votre lab**, à côté de Docker et de PostgreSQL. Il fait deux choses :

1. il lit l'état des conteneurs Docker (en lecture seule) et le remonte au site ;
2. il exécute `pg_dump` selon la planification configurée dans l'administration, applique la rotation, et remonte le résultat.

Le site n'ouvre jamais de connexion vers votre socket Docker : c'est l'agent qui appelle le site.

## Configuration

| Variable       | Rôle                                                      |
| -------------- | --------------------------------------------------------- |
| `SITE_URL`     | adresse publique du site, ex. `https://lab.exemple.fr`    |
| `AGENT_KEY`    | même valeur que le secret `AGENT_KEY` du site             |
| `DATABASE_URL` | chaîne de connexion PostgreSQL utilisée par `pg_dump`     |
| `BACKUP_DIR`   | dossier des sauvegardes (`/backups` par défaut)           |
| `INTERVAL`     | intervalle de remontée d'état en secondes (60 par défaut) |

## Lancement

```bash
docker compose -f agent/docker-compose.yml up -d
```
