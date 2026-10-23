# Documentation — Infovergne Home

Bienvenue dans la documentation technique du projet **Infovergne Home**.

---

## 📚 Documents disponibles

### 1. [Plan de déploiement](./deployment.md)

Guide complet pour déployer l'application en production :

- Prérequis système
- Configuration Keycloak
- Préparation de l'environnement
- Déploiement initial et mises à jour
- Dépannage et maintenance
- Sauvegarde et restauration

👉 **Commencez ici** si vous souhaitez déployer l'application.

### 2. [Architecture technique](./architecture.md)

Description détaillée de l'architecture :

- Vue d'ensemble des composants
- Stack technologique
- Architecture en couches (Frontend, Backend, Database)
- Authentification et sécurité
- Performance et scalabilité
- Diagrammes et flux de données

👉 **Lisez ce document** pour comprendre comment l'application fonctionne.

---

## 🚀 Démarrage rapide

### Développement local

```bash
# 1. Cloner le projet
git clone <repository-url>
cd infovergne-home

# 2. Configurer l'environnement
cp .env.example .env
cp deploy.env.example deploy.env
nano .env

# 3. Démarrer la base de données
docker compose up -d postgres

# 4. Démarrer le backend
cd backend
mvn spring-boot:run

# 5. Démarrer le frontend (nouveau terminal)
cd ..
npm install
npm run dev
```

### Déploiement en production

```bash
# 1. Préparer la configuration
cp deploy.env.example deploy.env
nano deploy.env

# 2. Exécuter le script de déploiement
./deploy.sh

# 3. Vérifier le déploiement
cd .../infovergne-home
docker compose ps
docker compose logs -f
```

---

## 🏗️ Structure du projet

```
infovergne-home/
├── backend/                 # Backend Spring Boot
│   ├── src/main/java/      # Code source Java
│   │   └── com/infovergne/home/
│   │       ├── config/     # Configuration Spring
│   │       ├── controller/ # REST Controllers
│   │       ├── service/    # Business logic
│   │       ├── repository/ # Data access
│   │       └── model/      # Modèles de données
│   ├── src/main/resources/ # Configuration
│   │   └── application.yml
│   ├── pom.xml             # Dépendances Maven
│   └── Dockerfile          # Image Docker backend
│
├── src/                    # Frontend TanStack Start
│   ├── routes/             # Pages et routes
│   ├── components/         # Composants React
│   ├── lib/                # Utilitaires
│   └── styles.css          # Styles globaux
│
├── db/                     # Base de données
│   └── schema.sql          # Schéma PostgreSQL
│
├── docs/                   # Documentation
│   ├── README.md           # Ce fichier
│   ├── deployment.md       # Guide de déploiement
│   └── architecture.md     # Architecture technique
│
├── docker-compose.yml      # Orchestration Docker
├── deploy.sh               # Script de déploiement
├── .env.example            # Variables d'environnement (exemple)
└── deploy.env.example      # Config déploiement (exemple)
```

---

## 🔧 Configuration

### Variables d'environnement principales

#### Base de données

```bash
POSTGRES_DB=infovergne
POSTGRES_USER=infovergne
POSTGRES_PASSWORD=<mot-de-passe-sécurisé>
```

#### Keycloak

```bash
KEYCLOAK_AUTH_URL=http://keycloak.local:8083
KEYCLOAK_REALM=infovergne
KEYCLOAK_CLIENT_ID=infovergne-home
KEYCLOAK_JWK_URI=http://keycloak.local:8083/realms/infovergne/protocol/openid-connect/certs
KEYCLOAK_ISSUER_URI=http://keycloak.local:8083/realms/infovergne
```

#### CORS

```bash
CORS_ALLOWED_ORIGINS=https://your-domain.com,http://localhost:3000
```

#### Frontend

```bash
VITE_API_URL=https://your-domain.com/api
```

---

## 🔐 Sécurité

### Authentification

- **Keycloak OAuth2/OpenID Connect** avec flux Authorization Code + PKCE
- **JWT** pour l'authentification stateless
- **Roles** : `ADMIN`, `INFOVERGNE_ADMIN`, `USER`

### Autorisation

Les ressources sont protégées par :

- **Visibility** : `public` (accessible à tous) ou `restricted` (rôles requis)
- **Allowed roles** : Liste des rôles autorisés pour les ressources `restricted`

### HTTPS

En production, toujours utiliser HTTPS via Nginx :

```bash
# Obtenir un certificat Let's Encrypt
sudo certbot certonly --nginx -d your-domain.com
```

---

## 📦 API REST

### Endpoints principaux

| Endpoint           | Méthode | Description             | Auth   |
| ------------------ | ------- | ----------------------- | ------ |
| `/api/spaces`      | GET     | Liste des espaces       | User   |
| `/api/spaces`      | POST    | Créer un espace         | Admin  |
| `/api/docs`        | GET     | Liste des documents     | User   |
| `/api/docs`        | POST    | Créer un document       | Editor |
| `/api/apps`        | GET     | Liste des applications  | User   |
| `/api/apps`        | POST    | Ajouter une application | Admin  |
| `/actuator/health` | GET     | Healthcheck             | Public |

### Exemple d'appel

```bash
# Obtenir un token (depuis le frontend)
TOKEN="<your-access-token>"

# Lister les espaces
curl -H "Authorization: Bearer $TOKEN" https://your-domain.com/api/spaces

# Créer un espace (admin uniquement)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "mon-wiki",
    "name": "Mon Wiki",
    "type": "wiki",
    "visibility": "public"
  }' \
  https://your-domain.com/api/spaces
```

---

## 🧪 Tests

### Backend

```bash
cd backend
mvn test
```

### Frontend

```bash
npm test
```

### E2E (à venir)

```bash
npm run test:e2e
```

---

## 📊 Monitoring

### Healthchecks

```bash
# Backend
curl http://localhost:8080/actuator/health

# Frontend
curl http://localhost:3000

# PostgreSQL
docker compose exec postgres pg_isready -U homelab
```

### Logs

```bash
# Tous les logs
docker compose logs -f

# Backend uniquement
docker compose logs -f backend

# Dernières 100 lignes
docker compose logs --tail=100 backend
```

### Métriques

```bash
# Métriques JVM et HTTP
curl http://localhost:8080/actuator/metrics

# Métrique spécifique
curl http://localhost:8080/actuator/metrics/jvm.memory.used
```

---

## 🐛 Dépannage

### Backend ne démarre pas

```bash
# Vérifier les logs
docker compose logs backend

# Vérifier la connexion à PostgreSQL
docker compose exec backend nc -zv postgres 5432

# Vérifier les variables d'environnement
docker compose exec backend env | grep DATABASE
```

### Erreur d'authentification

```bash
# Tester le endpoint JWK Keycloak
curl http://keycloak.local:8083/realms/infovergne/protocol/openid-connect/certs

# Vérifier les variables Keycloak
docker compose exec backend env | grep KEYCLOAK
```

### Base de données corrompue

```bash
# Restaurer depuis un backup
gunzip -c backup.sql.gz | docker compose exec -T postgres psql -U homelab homelab
```

Voir [deployment.md](./deployment.md#dépannage) pour plus de détails.

---

## 🛠️ Outils de développement

### Recommandés

- **IDE** : IntelliJ IDEA (backend) + VS Code (frontend)
- **Extensions VS Code** :
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Thunder Client (tests API)
- **Outils CLI** :
  - [httpie](https://httpie.io/) pour tester l'API
  - [jq](https://stedolan.github.io/jq/) pour parser JSON
  - [pgcli](https://www.pgcli.com/) pour PostgreSQL

---

## 📖 Ressources externes

### Documentation officielle

- [Spring Boot](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/)
- [TanStack Start](https://tanstack.com/start)
- [TanStack Query](https://tanstack.com/query)
- [Keycloak](https://www.keycloak.org/documentation)
- [PostgreSQL](https://www.postgresql.org/docs/)

### Tutoriels

- [Spring Security with OAuth2](https://spring.io/guides/tutorials/spring-boot-oauth2/)
- [React Server Components](https://react.dev/learn/start-a-new-react-project)
- [Docker Compose Best Practices](https://docs.docker.com/compose/production/)

---

## 🤝 Contribution

### Workflow

1. Créer une branche : `git checkout -b feature/ma-fonctionnalite`
2. Développer et tester localement
3. Committer : `git commit -m "feat: ajout de X"`
4. Pousser : `git push origin feature/ma-fonctionnalite`
5. Créer une Pull Request

### Conventions

- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` nouvelle fonctionnalité
  - `fix:` correction de bug
  - `docs:` documentation
  - `refactor:` refactoring
  - `test:` tests

---

## 📝 Changelog

### Version 1.0.0 (2026-10-12)

- ✅ Backend Spring Boot avec OAuth2 Keycloak
- ✅ Frontend TanStack Start
- ✅ Base de données PostgreSQL avec full-text search
- ✅ Docker Compose pour déploiement
- ✅ Script de déploiement automatisé
- ✅ Documentation complète

---

## 📧 Support

Pour toute question :

1. Consultez la [documentation de déploiement](./deployment.md)
2. Consultez l'[architecture technique](./architecture.md)
3. Ouvrez une issue sur le dépôt Git

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
