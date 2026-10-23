# Plan de Déploiement — Infovergne Home

Ce document décrit la procédure complète d'industrialisation et de déploiement du projet **Infovergne Home** avec backend Spring Boot.

---

## Table des matières

1. [Vue d'ensemble de l'architecture](#vue-densemble-de-larchitecture)
2. [Prérequis](#prérequis)
3. [Configuration de Keycloak](#configuration-de-keycloak)
4. [Préparation de l'environnement](#préparation-de-lenvironnement)
5. [Construction des images](#construction-des-images)
6. [Déploiement initial](#déploiement-initial)
7. [Vérifications post-déploiement](#vérifications-post-déploiement)
8. [Mises à jour ultérieures](#mises-à-jour-ultérieures)
9. [Dépannage](#dépannage)
10. [Sauvegarde et restauration](#sauvegarde-et-restauration)

---

## Vue d'ensemble de l'architecture

### Composants

```
┌─────────────────────────────────────────────────────────────┐
│                         Nginx (optionnel)                   │
│                    Reverse Proxy + SSL                       │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼──────┐           ┌────────▼────────┐
        │   Frontend   │           │    Backend      │
        │ TanStack     │◄──────────│  Spring Boot    │
        │   Start      │   API     │   (Java 25)     │
        └──────────────┘           └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │   PostgreSQL    │
                                   │   (Database)    │
                                   └─────────────────┘
                                            │
                                   ┌────────▼────────┐
                                   │    Keycloak     │
                                   │  (externe)      │
                                   └─────────────────┘
```

### Technologies

| Composant            | Technologie                 | Port   |
| -------------------- | --------------------------- | ------ |
| **Frontend**         | TanStack Start (React SSR)  | 3000   |
| **Backend**          | Spring Boot 4.1.1 + Java 25 | 8080   |
| **Database**         | PostgreSQL 16 + Liquibase   | 5432   |
| **Authentification** | Keycloak (instance externe) | 8083   |
| **Reverse Proxy**    | Nginx (optionnel)           | 80/443 |

---

## Prérequis

### Serveur de déploiement

- **OS** : Linux (Ubuntu 22.04+ / Debian 11+ recommandé)
- **Docker** : version 24.0+ avec Docker Compose v2
- **Maven** : version 3.9+
- **Node.js** : version 20+ avec npm
- **Java** : JDK 25 (pour le build local, optionnel si build dans Docker)
- **Rsync** : pour la copie de fichiers

### Ressources minimales

- **CPU** : 2 cores
- **RAM** : 4 GB (2 GB pour backend, 1 GB pour PostgreSQL, 1 GB pour frontend)
- **Disque** : 20 GB (système + volumes Docker)

### Accès réseau

- Port **80** (HTTP) et **443** (HTTPS) ouverts vers l'extérieur
- Accès à l'instance Keycloak existante (ex: `http://keycloak.local:8083`)
- Résolution DNS pour le domaine du site

---

## Configuration de Keycloak

### 1. Créer le realm (si nécessaire)

Si le realm `infovergne` n'existe pas encore :

1. Se connecter à la console Keycloak admin : `http://keycloak.local:8083/admin`
2. Créer un nouveau realm : **infovergne**

### 2. Créer le client

1. Aller dans **Clients** → **Create client**
2. Configuration :
   - **Client ID** : `infovergne-home`
   - **Client type** : `OpenID Connect`
   - **Access Type** : `public` (pour le frontend SPA)

3. Dans l'onglet **Settings** :
   - **Valid Redirect URIs** : `https://your-domain.com/*`, `http://localhost:3000/*`
   - **Web Origins** : `https://your-domain.com`, `http://localhost:3000`
   - **Standard Flow Enabled** : `ON`
   - **Direct Access Grants Enabled** : `OFF`

4. Dans l'onglet **Client Scopes** :
   - Ajouter les scopes : `openid`, `profile`, `email`

### 3. Créer les rôles

Aller dans **Realm Roles** et créer :

- `ADMIN` — accès complet à l'administration
- `HOMELAB_ADMIN` — accès à la gestion des applications
- `USER` — utilisateur standard

### 4. Assigner les rôles aux utilisateurs

1. Aller dans **Users**
2. Sélectionner un utilisateur
3. Onglet **Role Mappings** → assigner les rôles appropriés

### 5. Récupérer les URLs de configuration

- **Auth URL** : `http://keycloak.local:8083`
- **Realm** : `infovergne`
- **JWK Set URI** : `http://keycloak.local:8083/realms/infovergne/protocol/openid-connect/certs`
- **Issuer URI** : `http://keycloak.local:8083/realms/infovergne`

---

## Préparation de l'environnement

### 1. Cloner le projet

```bash
git clone <repository-url> infovergne-home
cd infovergne-home
```

### 2. Créer les fichiers de configuration

#### Configuration de déploiement

```bash
cp deploy.env.example deploy.env
nano deploy.env
```

Contenu de `deploy.env` :

```bash
TARGET_DIR=.../infovergne-home
COMPOSE_DIR=../infovergne-home
UPDATE_DB_SCHEMA=false
RESTART_DOCKER=false
```

#### Configuration Docker Compose

```bash
sudo mkdir -p ../infovergne-home
sudo cp .env.example ../infovergne-home/.env
sudo nano ../infovergne-home/.env
```

Contenu de `../infovergne-home/.env` :

```bash
# Database
POSTGRES_DB=homelab
POSTGRES_USER=homelab
POSTGRES_PASSWORD=VotreMotDePasseSecurise123!

# Keycloak
KEYCLOAK_AUTH_URL=http://keycloak.local:8083
KEYCLOAK_REALM=infovergne
KEYCLOAK_CLIENT_ID=infovergne-home
KEYCLOAK_JWK_URI=http://keycloak.local:8083/realms/infovergne/protocol/openid-connect/certs
KEYCLOAK_ISSUER_URI=http://keycloak.local:8083/realms/infovergne

# CORS
CORS_ALLOWED_ORIGINS=https://your-domain.com,http://localhost:3000

# Frontend
VITE_API_URL=https://your-domain.com/api

# Backend
BACKEND_MEMORY=512m
```

### 3. Créer la structure de répertoires

```bash
sudo mkdir -p ../infovergne-home/{frontend,backend,db,nginx/conf.d,nginx/ssl}
sudo chown -R $USER:$USER ../infovergne-home
```

---

## Construction des images

### Option A : Build local puis déploiement

```bash

# Build frontend
npm install
npm run build

# Build backend
cd backend
mvn clean install

cd ..
```

### Option B : Build directement avec le script deploy.sh

Le script `deploy.sh` construit automatiquement frontend et backend :

```bash
./deploy.sh
```

Le script demande interactivement :

- Si vous souhaitez mettre à jour le schéma de base de données
- Si vous souhaitez redémarrer les containers Docker

---

## Déploiement initial

### 1. Exécuter le script de déploiement

```bash
./deploy.sh
```

**Réponses suggérées pour le premier déploiement :**

- _Mettre à jour le schéma de base de données ?_ → **Oui (o)**
- _Redémarrer les containers docker-compose ?_ → **Oui (o)**

Le script va :

1. ✅ Builder le frontend (npm run build)
2. ✅ Builder le backend (mvn clean install)
3. ✅ Copier les artefacts vers `.../infovergne-home/`
4. ✅ Copier le schéma SQL vers `.../infovergne-home/db/`
5. ✅ Copier docker-compose.yml
6. ✅ Créer ou préserver le fichier `.env`
7. ✅ Rebuilder les images Docker
8. ✅ Redémarrer les containers

### 2. Vérifier le démarrage

```bash
cd .../infovergne-home
docker compose ps
```

Vous devriez voir :

```
NAME                  STATUS          PORTS
homelab-postgres      running         127.0.0.1:5432->5432/tcp
homelab-backend       running         127.0.0.1:8080->8080/tcp
homelab-frontend      running         127.0.0.1:3000->3000/tcp
homelab-nginx         running         0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### 3. Vérifier les logs

```bash
# Logs globaux
docker compose logs -f

# Logs par service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

---

## Vérifications post-déploiement

### 1. Base de données

```bash
# Se connecter à PostgreSQL
docker compose exec postgres psql -U infovergne -d infovergne

# Vérifier les tables
\dt

# Vérifier l'historique Liquibase
SELECT id, author, filename, dateexecuted
FROM DATABASECHANGELOG
ORDER BY orderexecuted DESC;

# Sortir
\q
```

Tables attendues :

- `spaces`, `docs`, `apps`, `media`, `favorites`
- `backups`, `slug_redirects`, `site_settings`
- `audit_logs`, `user_sessions`, `comments`
- `DATABASECHANGELOG`, `DATABASECHANGELOGLOCK` (tables Liquibase)

### 2. Backend API

```bash
# Healthcheck
curl http://localhost:8080/actuator/health

# Réponse attendue :
# {"status":"UP"}

# Vérifier l'authentification (devrait retourner 401)
curl -I http://localhost:8080/api/spaces
```

### 3. Frontend

```bash
# Page d'accueil
curl -I http://localhost:3000

# Réponse attendue :
# HTTP/1.1 200 OK
```

Ouvrir dans un navigateur : `http://localhost:3000`

### 4. Authentification Keycloak

1. Ouvrir `http://localhost:3000`
2. Cliquer sur **Se connecter**
3. Vous devriez être redirigé vers Keycloak
4. Après connexion, vous devriez être redirigé vers le site

---

## Mises à jour ultérieures

### Mise à jour du code

```bash
# Récupérer les dernières modifications
git pull

# Relancer le déploiement
./deploy.sh
```

**Réponses suggérées :**

- _Mettre à jour le schéma de base de données ?_ → **Oui** si le schéma a changé, **Non** sinon
- _Redémarrer les containers ?_ → **Oui**

### Mise à jour uniquement du frontend

```bash
npm run build
rsync -a --delete .output/ .../infovergne-home/frontend/

cd .../infovergne-home
docker compose restart frontend
```

### Mise à jour uniquement du backend

```bash
mvn clean install
cp target/*.jar .../infovergne-home-backend.jar

cd .../infovergne-home
docker compose restart backend
```

### Mise à jour du schéma de base de données

Avec Liquibase, les migrations de base de données sont appliquées automatiquement au démarrage du backend.

#### Fonctionnement automatique

Lorsque vous redémarrez le backend après avoir ajouté de nouveaux changesets :

```bash
cd .../infovergne-home
docker compose restart backend

# Vérifier l'application des migrations
docker compose logs backend | grep -i liquibase
```

#### Forcer la mise à jour manuellement

Si nécessaire, vous pouvez forcer l'application des migrations :

```bash
# Via Maven (depuis le projet local)
mvn liquibase:update

# Ou via le container backend
docker compose exec backend java -jar app.jar --liquibase.update
```

#### Ajouter un nouveau changeset

1. Créer un nouveau fichier XML dans `backend/src/main/resources/db/changelog/changes/` :

```xml
<!-- 003-add-new-feature.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="016-add-new-table" author="your-name">
        <createTable tableName="new_table">
            <column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
                <constraints primaryKey="true"/>
            </column>
            <column name="name" type="text">
                <constraints nullable="false"/>
            </column>
        </createTable>
    </changeSet>
</databaseChangeLog>
```

2. Ajouter l'include dans `db.changelog-master.yaml` :

```yaml
databaseChangeLog:
  - include:
      file: db/changelog/changes/001-initial-schema.xml
  - include:
      file: db/changelog/changes/002-initial-data.xml
  - include:
      file: db/changelog/changes/003-add-new-feature.xml # Nouveau
```

3. Déployer et redémarrer :

```bash
./deploy.sh
```

#### Vérifier l'historique des migrations

```bash
docker compose exec postgres psql -U infovergne -d infovergne -c "
SELECT id, author, filename, dateexecuted, orderexecuted
FROM DATABASECHANGELOG
ORDER BY orderexecuted DESC
LIMIT 10;
"
```

#### Rollback (en cas de problème)

```bash
# Rollback du dernier changeset
mvn liquibase:rollback -Dliquibase.rollbackCount=1

# Rollback vers un tag spécifique
mvn liquibase:rollback -Dliquibase.rollbackTag=v1.0.0
```

**⚠️ Important** : Toujours tester les rollbacks en développement avant de les utiliser en production.

---

## Dépannage

### Backend ne démarre pas

**Symptômes** : `docker compose logs backend` montre des erreurs de connexion à la base de données.

**Solutions** :

1. Vérifier que PostgreSQL est en cours d'exécution :

   ```bash
   docker compose ps postgres
   docker compose logs postgres
   ```

2. Vérifier les variables d'environnement dans `.env` :

   ```bash
   cat .../infovergne-home/.env
   ```

3. Vérifier la connexion depuis le backend :
   ```bash
   docker compose exec backend nc -zv postgres 5432
   ```

### Frontend affiche une erreur 502

**Symptômes** : Nginx retourne une erreur 502 Bad Gateway.

**Solutions** :

1. Vérifier que le backend répond :

   ```bash
   curl http://localhost:8080/actuator/health
   ```

2. Vérifier la configuration Nginx :
   ```bash
   docker compose exec nginx nginx -t
   docker compose logs nginx
   ```

### Authentification Keycloak échoue

**Symptômes** : Redirection infinie ou erreur "Invalid redirect URI".

**Solutions** :

1. Vérifier les URLs configurées dans Keycloak :
   - Valid Redirect URIs doit inclure `https://your-domain.com/*`
   - Web Origins doit inclure `https://your-domain.com`

2. Vérifier les variables d'environnement :

   ```bash
   docker compose exec backend env | grep KEYCLOAK
   ```

3. Tester le endpoint JWK :
   ```bash
   curl http://keycloak.local:8083/realms/infovergne/protocol/openid-connect/certs
   ```

### Permissions refusées (403 Forbidden)

**Symptômes** : Utilisateur connecté mais ne peut pas accéder aux ressources.

**Solutions** :

1. Vérifier les rôles de l'utilisateur dans Keycloak
2. Vérifier les logs backend pour voir les rôles extraits du JWT :

   ```bash
   docker compose logs backend | grep -i "role"
   ```

3. Vérifier la configuration des espaces/apps dans la base de données :
   ```sql
   SELECT slug, visibility, allowed_roles FROM spaces;
   SELECT slug, visibility, allowed_roles FROM apps;
   ```

---

## Sauvegarde et restauration

### Sauvegarde de la base de données

```bash
# Sauvegarde complète
docker compose exec postgres pg_dump -U infovergne infovergne > backup_$(date +%Y%m%d_%H%M%S).sql

# Sauvegarde compressée
docker compose exec postgres pg_dump -U infovergne infovergne | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restauration de la base de données

```bash
# Restaurer depuis un backup
docker compose exec -T postgres psql -U infovergne infovergne < backup_20260101_120000.sql

# Restaurer depuis un backup compressé
gunzip -c backup_20260101_120000.sql.gz | docker compose exec -T postgres psql -U infovergne infovergne
```

### Sauvegarde automatique

Ajouter un cron job :

```bash
sudo crontab -e
```

Ajouter la ligne :

```cron
# Sauvegarde PostgreSQL tous les jours à 2h du matin
0 2 * * * cd .../infovergne-home && docker compose exec -T postgres pg_dump -U infovergne infovergne | gzip > /opt/backups/infovergne_$(date +\%Y\%m\%d).sql.gz
```

Créer le répertoire de sauvegarde :

```bash
sudo mkdir -p /opt/backups
sudo chown $USER:$USER /opt/backups
```

### Rotation des sauvegardes

```bash
# Garder seulement les 14 dernières sauvegardes
find /opt/backups -name "homelab_*.sql.gz" -mtime +14 -delete
```

---

## Configuration Nginx (optionnel mais recommandé)

### Configuration de base

Créer `.../infovergne-home/nginx/conf.d/homelab.conf` :

```nginx
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:8080;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirection HTTP → HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # Certificats SSL (Let's Encrypt recommandé)
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Logs
    access_log /var/log/nginx/homelab_access.log;
    error_log /var/log/nginx/homelab_error.log;

    # API Backend
    location /api/ {
        proxy_pass http://backend/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Actuator (healthcheck interne uniquement)
    location /actuator/health {
        proxy_pass http://backend/actuator/health;
        allow 127.0.0.1;
        deny all;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (si nécessaire)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Obtenir un certificat SSL avec Let's Encrypt

```bash
# Installer certbot
sudo apt install certbot python3-certbot-nginx

# Obtenir le certificat
sudo certbot certonly --nginx -d your-domain.com

# Les certificats seront dans :
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# Copier vers Nginx
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem .../infovergne-home/nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem .../infovergne-home/nginx/ssl/

# Recharger Nginx
cd .../infovergne-home
docker compose restart nginx
```

### Renouvellement automatique SSL

```bash
sudo crontab -e
```

Ajouter :

```cron
# Renouvellement Let's Encrypt tous les lundis à 3h
0 3 * * 1 certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/*.pem /.../infovergne-home/nginx/ssl/ && cd .../infovergne-home && docker compose restart nginx
```

---

## Monitoring et logs

### Logs centralisés

Pour agréger les logs de tous les services :

```bash
# Tous les logs en temps réel
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f backend
docker compose logs -f postgres

# Logs des 100 dernières lignes
docker compose logs --tail=100 backend
```

### Métriques avec Actuator

Le backend expose des métriques via Spring Boot Actuator :

```bash
# Health
curl http://localhost:8080/actuator/health

# Info
curl http://localhost:8080/actuator/info

# Metrics
curl http://localhost:8080/actuator/metrics
```

### Surveillance de la base de données

```bash
# Connexions actives
docker compose exec postgres psql -U infovergne -d infovergne -c "SELECT count(*) FROM pg_stat_activity;"

# Taille de la base
docker compose exec postgres psql -U infovergne -d infovergne -c "SELECT pg_size_pretty(pg_database_size('infovergne'));"

# Tables les plus volumineuses
docker compose exec postgres psql -U infovergne -d infovergne -c "
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"
```

---

## Checklist de déploiement

### Avant le déploiement

- [ ] Keycloak configuré (realm, client, rôles)
- [ ] Serveur préparé (Docker, Maven, Node.js installés)
- [ ] Fichiers de configuration créés (`deploy.env`, `.env`)
- [ ] Certificats SSL obtenus (Let's Encrypt)
- [ ] DNS configuré vers le serveur

### Pendant le déploiement

- [ ] Build frontend réussi
- [ ] Build backend réussi
- [ ] Fichiers copiés vers `.../infovergne-home`
- [ ] Images Docker buildées
- [ ] Containers démarrés

### Après le déploiement

- [ ] PostgreSQL accessible et schéma créé
- [ ] Backend API répond (`/actuator/health`)
- [ ] Frontend accessible (page d'accueil)
- [ ] Authentification Keycloak fonctionnelle
- [ ] HTTPS configuré et fonctionnel
- [ ] Sauvegardes automatiques configurées
- [ ] Monitoring en place

---

## Contacts et support

Pour toute question ou problème :

1. **Logs** : `cd .../infovergne-home && docker compose logs -f`
2. **Documentation** : Consultez les autres fichiers dans `docs/`
3. **Issues** : Créez une issue sur le dépôt Git du projet

---

## Annexes

- [Configuration Keycloak avancée](./keycloak-config.md)
- [Architecture technique](./architecture.md)
- [Guide de développement](./development.md)
- [FAQ](./faq.md)
