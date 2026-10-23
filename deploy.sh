#!/usr/bin/env bash
set -euo pipefail

# Script de déploiement pour Infovergne Home
# Inspiré du projet vibe-forms (sans build d'images privées, montages d'artefacts)

# ========== Configuration ==========

# Racine du projet = emplacement de ce script (appelable depuis n'importe où)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}"
BACKEND_DIR="${PROJECT_ROOT}/backend"

# Fichier de configuration (créer deploy.env à partir de deploy.env.example)
ENV_FILE="${PROJECT_ROOT}/deploy.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "⚠ Fichier ${ENV_FILE} introuvable."
  echo "→ Créez-le à partir de deploy.env.example"
  exit 1
fi

source "${ENV_FILE}"

# Variables requises dans deploy.env :
# - TARGET_DIR : répertoire des artefacts (ex: /opt/kube42-docker/dc_app/server)
# - COMPOSE_DIR : répertoire contenant docker-compose.yml (ex: /opt/kube42-docker/dc_app)

: "${TARGET_DIR:?TARGET_DIR doit être défini dans deploy.env}"
: "${COMPOSE_DIR:?COMPOSE_DIR doit être défini dans deploy.env}"

# ========== Fonctions utilitaires ==========

info()  { printf '→ %s\n' "$*"; }
warn()  { printf '⚠ %s\n' "$*" >&2; }
error() { printf '✗ %s\n' "$*" >&2; exit 1; }

confirm() {
  local prompt=$1
  local reply
  read -r -p "${prompt} [o/N] " reply
  [[ "${reply}" =~ ^[oOyY]$ ]]
}

docker_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    error "docker compose / docker-compose introuvable"
  fi
}

find_backend_jar() {
  local jar
  jar="$(find "${BACKEND_DIR}/target" -maxdepth 1 -type f -name '*.jar' ! -name '*-original.jar' -print -quit)"
  [[ -n "${jar}" ]] || return 1
  printf '%s' "${jar}"
}

# ========== Validation ==========

info "Projet      : ${PROJECT_ROOT}"
info "Cible       : ${TARGET_DIR}"
info "Compose dir : ${COMPOSE_DIR}"

# ========== Build Frontend ==========

info "Build frontend (production)…"
(
  cd "${FRONTEND_DIR}"
  npm run build
)

[[ -d "${FRONTEND_DIR}/dist" ]] || error "Build frontend échoué : ${FRONTEND_DIR}/dist introuvable."

# ========== Build Backend ==========

info "Build backend (Maven)…"
mvn -f "${BACKEND_DIR}/pom.xml" clean install -DskipTests

BACKEND_JAR="$(find_backend_jar)" || error "Build backend échoué : aucun JAR trouvé dans ${BACKEND_DIR}/target."

info "Backend JAR : ${BACKEND_JAR}"

# ========== Options interactives ==========

if [[ -z "${RESTART_DOCKER:-}" ]]; then
  RESTART_DOCKER=false
  if confirm "Redémarrer les containers docker-compose ?"; then
    RESTART_DOCKER=true
  fi
fi

# ========== Déploiement ==========

info "Déploiement vers ${TARGET_DIR}…"

# Créer la structure de destination
mkdir -p "${TARGET_DIR}"/{frontend,backend}
mkdir -p "${COMPOSE_DIR}/agent"

# Copier le frontend compilé (dist/ contient client et server SSR auto-porteur)
info "  Frontend → ${TARGET_DIR}/frontend/dist/"
rsync -a --delete "${FRONTEND_DIR}/dist/" "${TARGET_DIR}/frontend/dist/"

# Copier le backend JAR
info "  Backend  → ${TARGET_DIR}/backend/infovergne-home-backend.jar"
cp "${BACKEND_JAR}" "${TARGET_DIR}/backend/infovergne-home-backend.jar"

# Note : Le schéma de base de données est géré par Liquibase dans le backend
info "  DB       : géré par Liquibase (inclus dans le backend JAR)"

# Copier la configuration Nginx
info "  Nginx    → ${TARGET_DIR}/nginx.conf"
cp "${PROJECT_ROOT}/nginx.conf" "${TARGET_DIR}/nginx.conf"

# Copier le docker-compose.yml
info "  Compose  → ${COMPOSE_DIR}/docker-compose.yml"
cp "${PROJECT_ROOT}/docker-compose.yml" "${COMPOSE_DIR}/docker-compose.yml"

# Copier le contexte de build de l'agent utilisé par Docker Compose
info "  Agent    → ${COMPOSE_DIR}/agent/"
cp "${PROJECT_ROOT}/agent/Dockerfile" "${COMPOSE_DIR}/agent/Dockerfile"
cp "${PROJECT_ROOT}/agent/agent.sh" "${COMPOSE_DIR}/agent/agent.sh"

# Copier le .env.example comme référence (ne pas écraser .env existant)
if [[ ! -f "${COMPOSE_DIR}/.env" ]]; then
  info "  .env     → ${COMPOSE_DIR}/.env (créé depuis .env.example)"
  cp "${PROJECT_ROOT}/.env.example" "${COMPOSE_DIR}/.env"
  warn "Pensez à éditer ${COMPOSE_DIR}/.env avec vos vraies valeurs !"
else
  info "  .env     : déjà présent, non écrasé"
fi

# ========== Redémarrage Docker ==========

if [[ "${RESTART_DOCKER}" == true ]]; then
  COMPOSE="$(docker_compose_cmd)"
  
  info "Redémarrage des containers (${COMPOSE_DIR})…"
  (
    cd "${COMPOSE_DIR}"
    
    # Arrêt et redémarrage (images officielles publiques, pas de pull ou build privé)
    ${COMPOSE} down
    ${COMPOSE} up -d
    
    # Afficher les logs des services en cours
    sleep 3
    ${COMPOSE} ps
  )
  
  info "Containers redémarrés avec succès."
  info "Logs : cd ${COMPOSE_DIR} && ${COMPOSE} logs -f"
else
  info "Docker : pas de redémarrage."
  info "Pour démarrer manuellement :"
  info "  cd ${COMPOSE_DIR}"
  info "  docker compose up -d"
fi

# ========== Finalisation ==========

info ""
info "✓ Déploiement terminé avec succès !"
info ""
info "Points de vérification :"
info "  - Frontend : via https://app.infovergne.com ou http://dc-app-server:80"
info "  - Backend  : actuator health http://dc-app-backend:8080/actuator/health"
info ""
