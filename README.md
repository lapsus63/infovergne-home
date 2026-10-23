# Infovergne Home

Portail auto-hébergé pour retrouver et gérer les applications du lab, son wiki et son blog.

## Fonctionnalités

- Catalogue d'applications Docker avec liens d'accès et état des conteneurs
- Espaces wiki et blog avec gestion des contenus
- Authentification Keycloak et accès contrôlé par rôles
- Recherche dans les applications et les contenus

## Démarrage rapide

Consultez le [guide de déploiement](docs/deployment.md) pour configurer et lancer le projet en local ou en production.

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run dev
```

Le backend Spring Boot doit également être configuré et lancé ; les prérequis et étapes détaillées sont dans le guide.

## Documentation

- [Architecture technique](docs/architecture.md) — composants, technologies et flux de données
- [Guide de déploiement](docs/deployment.md) — configuration, lancement et maintenance
- [Documentation du projet](docs/README.md) — index des guides
