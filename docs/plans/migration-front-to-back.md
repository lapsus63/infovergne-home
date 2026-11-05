
## 📋 PLAN DE REFACTORING : Déplacer la logique métier du Frontend vers le Backend Spring Boot

🎯 OBJECTIF

Éliminer l'accès direct à PostgreSQL depuis les Server Functions TanStack Start et centraliser toute la logique métier dans le backend Spring Boot. Le frontend ne doit contenir que la présentation et les appels API REST.

----

### 📊 ÉTAT ACTUEL (Problématique)

Architecture actuelle

```
Frontend (TanStack Start)
├── Routes React (UI)
├── Server Functions (admin.functions.ts)
│   └── db.server.ts ──────► PostgreSQL (accès SQL direct) ❌
│
Backend (Spring Boot) ──────► PostgreSQL ✅
```

Problèmes identifiés

1. Double accès BDD : Le frontend et le backend accèdent tous deux directement à PostgreSQL
2. Logique métier dupliquée : Validations et règles métier dans le frontend (admin.tsx)
3. Sécurité : Les server functions ne bénéficient pas de la couche de sécurité Spring
4. Maintenance : Modifications nécessaires à deux endroits
5. Tests : Impossible de tester la logique métier sans le frontend

----

🎯 ARCHITECTURE CIBLE

```
Frontend (TanStack Start)
├── Routes React (UI uniquement)
├── API Client (fetch calls)
│   └── HTTP REST ──────► Backend Spring Boot
│                              │
│                              ├── Controllers (endpoints REST)
│                              ├── Services (logique métier)
│                              ├── Validators (contrôles de saisie)
│                              └── Repositories ──► PostgreSQL
```

----

### 📝 PLAN D'IMPLÉMENTATION

PHASE 1 : Audit et inventaire

1.1 Identifier toutes les server functions

Fichiers concernés :

- ✅ src/lib/admin.functions.ts (saveSpace, removeSpace, saveDoc, saveApp, etc.)
- ✅ src/lib/content.functions.ts (getMemo, getSpaceNav, etc.)
- ✅ src/lib/search.server.ts
- ✅ src/lib/rss.server.ts
- ✅ src/lib/render.server.ts (previewMarkdown)

1.2 Lister les validations côté client

Dans src/routes/admin.tsx :

- Validation des champs vides (.trim())
- Vérification des doublons de catégories
- Calcul automatique des slugs
- Normalisation des rôles (.toUpperCase(), .filter(Boolean))
- Transformation des tags (split, trim, filter)
- Limitation taille fichiers (400Ko pour images)
- Génération automatique des write_roles basés sur le slug

----

PHASE 2 : Créer les endpoints REST manquants dans Spring Boot

2.1 Endpoints Admin - Espaces

```java
// SpaceController.java
@RestController
@RequestMapping("/api/admin/spaces")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSpaceController {

      @PostMapping
      public ResponseEntity<Space> createSpace(@Valid @RequestBody CreateSpaceRequest request);
      
      @PutMapping("/{id}")
      public ResponseEntity<Space> updateSpace(@PathVariable String id, @Valid @RequestBody UpdateSpaceRequest request);
      
      @DeleteMapping("/{id}")
      public ResponseEntity<DeleteSpaceResponse> deleteSpace(@PathVariable String id);
      
      @GetMapping("/{id}/deletion-impact")
      public ResponseEntity<DeletionImpact> getDeletionImpact(@PathVariable String id);
}
```

Validations à implémenter :

- @NotBlank sur name, slug, type
- @Pattern sur slug (format kebab-case)
- @Size(min=1, max=100) sur name
- Vérification unicité du slug en base
- Génération automatique des write_roles si vide
- Normalisation des rôles en majuscules

2.2 Endpoints Admin - Documents

```java
// DocController.java
@RestController
@RequestMapping("/api/admin/docs")
public class AdminDocController {

      @PostMapping
      @PreAuthorize("@docSecurity.canWriteSpace(#request.spaceSlug)")
      public ResponseEntity<Doc> createDoc(@Valid @RequestBody CreateDocRequest request);
      
      @PutMapping("/{id}")
      @PreAuthorize("@docSecurity.canEditDoc(#id)")
      public ResponseEntity<Doc> updateDoc(@PathVariable String id, @Valid @RequestBody UpdateDocRequest request);
      
      @DeleteMapping("/{id}")
      @PreAuthorize("@docSecurity.canEditDoc(#id)")
      public ResponseEntity<Void> deleteDoc(@PathVariable String id);
      
      @PostMapping("/preview")
      public ResponseEntity<PreviewResponse> previewMarkdown(@RequestBody PreviewRequest request);
}
```

Validations à implémenter :

- @NotBlank sur title, body, space_slug
- Génération automatique du slug à partir du title
- Gestion des redirections de slug (slug_redirects)
- Vérification des droits d'écriture sur l'espace
- Mise à jour automatique de updated_at

2.3 Endpoints Admin - Applications

```java
// AppController.java
@RestController
@RequestMapping("/api/admin/apps")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAppController {

      @PostMapping
      public ResponseEntity<AppEntry> createApp(@Valid @RequestBody CreateAppRequest request);
      
      @PutMapping("/{id}")
      public ResponseEntity<AppEntry> updateApp(@PathVariable String id, @Valid @RequestBody UpdateAppRequest request);
      
      @DeleteMapping("/{id}")
      public ResponseEntity<Void> deleteApp(@PathVariable String id);
}
```

Validations à implémenter :

- @NotBlank sur name, category, url, container_name
- @URL sur url
- Normalisation des tags (trim, lowercase)
- Normalisation des rôles (trim, uppercase)
- Validation de l'existence de la catégorie
- Préservation du state existant lors de la mise à jour

2.4 Endpoints Admin - Catégories

```java
// CategoryController.java
@RestController
@RequestMapping("/api/admin/categories")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCategoryController {

      @GetMapping
      public ResponseEntity<List<CategoryWithCounts>> listCategories();
      
      @PostMapping
      public ResponseEntity<Category> createCategory(@Valid @RequestBody CreateCategoryRequest request);
      
      @PutMapping("/{id}")
      public ResponseEntity<Category> updateCategory(@PathVariable String id, @Valid @RequestBody UpdateCategoryRequest request);
      
      @DeleteMapping("/{id}")
      public ResponseEntity<Void> deleteCategory(@PathVariable String id);
}
```

Validations à implémenter :

- @NotBlank sur name
- Vérification unicité du nom (case insensitive)
- Interdiction suppression si utilisée par apps ou favoris
- Mise à jour en cascade du nom dans apps et favorites
- Calcul automatique de la position

2.5 Endpoints Admin - Favoris

```java
// FavoriteController.java
@RestController
@RequestMapping("/api/admin/favorites")
@PreAuthorize("hasRole('ADMIN')")
public class AdminFavoriteController {

      @GetMapping
      public ResponseEntity<List<Favorite>> listPublicFavorites();
      
      @PutMapping
      public ResponseEntity<List<Favorite>> savePublicFavorites(@Valid @RequestBody List<CreateFavoriteRequest> request);
}
```

Validations à implémenter :

- @NotBlank sur label, href
- Normalisation des tags (split, trim)
- Normalisation des rôles (trim, uppercase)
- Recalcul automatique des positions (1, 2, 3...)

2.6 Endpoints Admin - Médias

```java
// MediaController.java
@RestController
@RequestMapping("/api/admin/media")
public class AdminMediaController {

      @PostMapping
      @PreAuthorize("isAuthenticated()")
      public ResponseEntity<MediaItem> uploadMedia(@Valid @RequestBody CreateMediaRequest request);
      
      @DeleteMapping("/{id}")
      @PreAuthorize("isAuthenticated()")
      public ResponseEntity<Void> deleteMedia(@PathVariable String id);
}
```

Validations à implémenter :

- Limitation taille Data URL (400 Ko max)
- @NotBlank sur name, url
- @Min(1) sur width, height
- Validation format Data URL (base64)

2.7 Endpoints Admin - Paramètres

```java
// SettingsController.java
@RestController
@RequestMapping("/api/admin/settings")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSettingsController {

      @GetMapping
      public ResponseEntity<SiteSettings> getSettings();
      
      @PutMapping
      public ResponseEntity<SiteSettings> saveSettings(@Valid @RequestBody UpdateSettingsRequest request);
}
```

Validations à implémenter :

- @NotBlank sur site_title, site_tagline
- @Pattern sur backup_cron (validation format cron)
- @Min(1) sur backup_keep
- Vérification existence du memo_doc_id en base

2.8 Endpoints publics/lecture

```java
// ContentController.java
@RestController
@RequestMapping("/api/content")
public class ContentController {

      @GetMapping("/memo")
      public ResponseEntity<MemoResponse> getMemo();
      
      @GetMapping("/spaces/{slug}/nav")
      public ResponseEntity<SpaceNavResponse> getSpaceNav(@PathVariable String slug);
}
```

```java
// SearchController.java
@RestController
@RequestMapping("/api/search")
public class SearchController {

      @GetMapping
      public ResponseEntity<SearchResults> search(@RequestParam String q);
}
```

```java
// RSSController.java
@RestController
@RequestMapping("/api/rss")
public class RSSController {

      @GetMapping(value = "/rss.xml", produces = "application/rss+xml")
      public ResponseEntity<String> globalRss();
      
      @GetMapping(value = "/{spaceSlug}/rss.xml", produces = "application/rss+xml")
      public ResponseEntity<String> spaceRss(@PathVariable String spaceSlug);
}
```

----

PHASE 3 : Créer les DTOs et Validators

3.1 DTOs de requête

Exemples :

```java
// CreateSpaceRequest.java
public record CreateSpaceRequest(
@NotBlank String name,
@NotBlank @Pattern(regexp = "^[a-z0-9-]+$") String slug,
@NotBlank String type,
String description,
String accent,
@NotNull String visibility,
List<String> allowedRoles,
List<String> writeRoles,
Integer position
) {}
```

```java
// CreateDocRequest.java
public record CreateDocRequest(
@NotBlank String title,
String slug, // optionnel, sera calculé depuis title
@NotBlank String body,
@NotBlank String spaceSlug,
List<String> tags,
@NotBlank String status,
@NotBlank String visibility,
List<String> allowedRoles
) {}
```

3.2 Validators personnalisés

```java
@Component
public class SlugValidator {
public String generateSlug(String text) {
return text.toLowerCase()
.replaceAll("[àáâãäå]", "a")
.replaceAll("[èéêë]", "e")
// ... autres caractères
.replaceAll("[^a-z0-9]+", "-")
.replaceAll("^-|-$", "");
}

      public void validateUnique(String slug, String excludeId) {
          // vérification en base
      }
}
```

```java
@Component
public class CategoryValidator {
public void validateNotUsed(String categoryId, String categoryName) {
long appsCount = appRepository.countByCategory(categoryName);
long favsCount = favoriteRepository.countByCategory(categoryName);
if (appsCount > 0 || favsCount > 0) {
throw new ValidationException(
"Impossible de supprimer : %d app(s), %d favori(s)"
.formatted(appsCount, favsCount)
);
}
}
}
```

----

PHASE 4 : Implémenter les Services avec logique métier

4.1 SpaceService

```java
@Service
@Transactional
public class SpaceService {

      public Space createSpace(CreateSpaceRequest request, String userId) {
          // 1. Valider unicité du slug
          // 2. Générer write_roles automatiquement si vide
          // 3. Normaliser allowed_roles en majuscules
          // 4. Calculer position si non fournie
          // 5. Sauvegarder en base
          // 6. Logger l'audit
      }
      
      public DeletionImpact getDeletionImpact(String spaceId) {
          // 1. Récupérer l'espace
          // 2. Compter les docs liés
          // 3. Compter les docs publiés
          // 4. Retourner impact
      }
      
      public void deleteSpace(String spaceId, String userId) {
          // 1. Supprimer docs en cascade
          // 2. Supprimer l'espace
          // 3. Logger l'audit
      }
}
```

4.2 DocService

```java
@Service
@Transactional
public class DocService {

      public Doc createDoc(CreateDocRequest request, String userId) {
          // 1. Vérifier droits d'écriture sur l'espace
          // 2. Générer slug depuis title si non fourni
          // 3. Valider unicité (space_slug + slug)
          // 4. Sauvegarder en base
          // 5. Logger l'audit
      }
      
      public Doc updateDoc(String id, UpdateDocRequest request, String userId) {
          // 1. Récupérer doc existant
          // 2. Vérifier droits d'écriture
          // 3. Si slug change, créer redirection
          // 4. Mettre à jour updated_at
          // 5. Sauvegarder
          // 6. Logger l'audit
      }
      
      public String previewMarkdown(String body) {
          // 1. Render markdown → HTML
          // 2. Sanitize HTML
          // 3. Retourner HTML safe
      }
}
```

4.3 CategoryService

```java
@Service
@Transactional
public class CategoryService {

      public Category createCategory(CreateCategoryRequest request, String userId) {
          // 1. Valider unicité du nom (case insensitive)
          // 2. Calculer position
          // 3. Sauvegarder
          // 4. Logger l'audit
      }
      
      public Category updateCategory(String id, UpdateCategoryRequest request, String userId) {
          // 1. Récupérer catégorie existante
          // 2. Si nom change, mettre à jour apps/favoris en cascade
          // 3. Sauvegarder
          // 4. Logger l'audit
      }
      
      public void deleteCategory(String id, String userId) {
          // 1. Vérifier qu'elle n'est pas utilisée
          // 2. Supprimer
          // 3. Logger l'audit
      }
      
      public List<CategoryWithCounts> listWithCounts() {
          // 1. Récupérer toutes les catégories
          // 2. Joindre avec comptes apps/favoris
          // 3. Trier alphabétiquement case insensitive
      }
}
```

----

PHASE 5 : Refactorer le Frontend

5.1 Supprimer l'accès direct à PostgreSQL

- ❌ Supprimer src/lib/db.server.ts (ou le garder uniquement pour fallback demo mode)
- ❌ Supprimer les server functions dans admin.functions.ts
- ✅ Créer src/lib/api-client.ts avec des appels fetch vers Spring Boot

5.2 Créer un client API TypeScript

```javascript
// src/lib/api-client.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

async function fetchWithAuth<T>(url: string, options?: RequestInit): Promise<T> {
const token = getAccessToken(); // depuis Keycloak
const response = await fetch(`${API_BASE}${url}`, {
...options,
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${token}`,
...options?.headers,
},
});

      if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'API Error');
      }
      
      return response.json();
}
```

```javascript
// Espaces
export const spacesApi = {
create: (data: CreateSpaceRequest) =>
fetchWithAuth<Space>('/admin/spaces', {
method: 'POST',
body: JSON.stringify(data),
}),

      update: (id: string, data: UpdateSpaceRequest) =>
          fetchWithAuth<Space>(`/admin/spaces/${id}`, {
              method: 'PUT',
              body: JSON.stringify(data),
          }),
      
      delete: (id: string) =>
          fetchWithAuth<void>(`/admin/spaces/${id}`, {
              method: 'DELETE',
          }),
      
      getDeletionImpact: (id: string) =>
          fetchWithAuth<DeletionImpact>(`/admin/spaces/${id}/deletion-impact`),
};

// Docs, Apps, Categories, etc. similaires...
```

5.3 Alléger admin.tsx

- ❌ Supprimer toutes les validations de saisie (normalisations, trim, etc.)
- ❌ Supprimer les calculs automatiques de slug
- ❌ Supprimer les vérifications de doublons
- ✅ Garder uniquement l'UI et les appels API
- ✅ Afficher les erreurs de validation remontées par le backend

```javascript
// Avant
const handleSave = () => {
const trimmed = newCatName.trim();
if (!trimmed) return;
if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
toast.error('Cette catégorie existe déjà');
return;
}
// ... save
};
```

```javascript
// Après
const handleSave = async () => {
try {
await categoriesApi.create({ name: newCatName });
toast.success('Catégorie créée');
} catch (error) {
toast.error(error.message); // Message d'erreur du backend
}
};
```

----

PHASE 6 : Tester et valider

6.1 Tests unitaires Backend

- Services : logique métier et validations
- Validators : génération de slugs, normalisation
- Repositories : requêtes SQL

6.2 Tests d'intégration Backend

- Endpoints REST avec authentification
- Gestion des erreurs (400, 401, 403, 404)
- Cascade de suppression (espaces → docs)

6.3 Tests E2E Frontend

- Créer/modifier/supprimer via l'interface admin
- Vérifier les messages d'erreur
- Vérifier les cas limites (doublons, champs vides, etc.)

----

PHASE 7 : Migration et déploiement

7.1 Créer un mode de transition

Option 1 : Big Bang (tout en une fois)

- ✅ Simplicité
- ❌ Risque élevé

Option 2 : Mode graduel (recommandé)

- Activer une variable d'env USE_API_BACKEND=true
- Si true : appels vers Spring Boot
- Si false : ancien mode avec db.server.ts
- Permet rollback facile

```javascript
// api-client.ts
const USE_BACKEND_API = import.meta.env.VITE_USE_API_BACKEND === 'true';

export function saveSpace(data: Space) {
if (USE_BACKEND_API) {
return spacesApi.create(data);
} else {
return legacySaveSpace(data); // ancien code
}
}
```

7.2 Plan de déploiement

1. Déployer backend Spring Boot avec nouveaux endpoints
2. Tester les endpoints manuellement (Postman/curl)
3. Déployer frontend avec USE_API_BACKEND=false
4. Activer USE_API_BACKEND=true progressivement
5. Surveiller les logs et erreurs
6. Une fois stable, supprimer le code legacy

----

📦 LIVRABLES

Backend

- [ ] 40+ endpoints REST créés
- [ ] DTOs de requête/réponse
- [ ] Validators personnalisés
- [ ] Services avec logique métier
- [ ] Tests unitaires + intégration
- [ ] Documentation Swagger/OpenAPI

Frontend

- [ ] Client API TypeScript
- [ ] Suppression de db.server.ts et admin.functions.ts
- [ ] Allègement de admin.tsx (UI pure)
- [ ] Gestion des erreurs API
- [ ] Tests E2E mis à jour

Documentation

- [ ] Guide de migration
- [ ] Documentation des endpoints
- [ ] Diagrammes d'architecture mis à jour

----

⏱️ ESTIMATION

┌─────────────────────────────┬────────────────────────┬──────────────┐
│ Phase                       │ Tâches                 │ Temps estimé │
├─────────────────────────────┼────────────────────────┼──────────────┤
│ Phase 1 : Audit             │ Inventaire complet     │ 1 jour       │
├─────────────────────────────┼────────────────────────┼──────────────┤
│ Phase 2 : Endpoints         │ 40+ endpoints REST     │ 5 jours      │
├─────────────────────────────┼────────────────────────┼──────────────┤
│ Phase 3 : DTOs/Validators   │ Validation complète    │ 2 jours      │
├─────────────────────────────┼────────────────────────┼──────────────┤
│ Phase 4 : Services          │ Logique métier         │ 3 jours      │
├─────────────────────────────┼────────────────────────┼──────────────┤
│ Phase 5 : Refactor Frontend │ Client API + cleanup   │ 3 jours      │
├─────────────────────────────┼────────────────────────┼──────────────┤
│ Phase 6 : Tests             │ Unitaires + E2E        │ 2 jours      │
├─────────────────────────────┼────────────────────────┼──────────────┤
│ Phase 7 : Migration         │ Déploiement progressif │ 1 jour       │
├─────────────────────────────┼────────────────────────┼──────────────┤
│ TOTAL                       │                        │ 17 jours     │
└─────────────────────────────┴────────────────────────┴──────────────┘

----

⚠️ RISQUES ET MITIGATIONS

┌──────────────────────────┬────────┬─────────────┬─────────────────────────────────┐
│ Risque                   │ Impact │ Probabilité │ Mitigation                      │
├──────────────────────────┼────────┼─────────────┼─────────────────────────────────┤
│ Régression fonctionnelle │ Élevé  │ Moyen       │ Tests complets + mode graduel   │
├──────────────────────────┼────────┼─────────────┼─────────────────────────────────┤
│ Performances dégradées   │ Moyen  │ Faible      │ Cache Spring + indexes DB       │
├──────────────────────────┼────────┼─────────────┼─────────────────────────────────┤
│ Incompatibilité auth     │ Élevé  │ Faible      │ Tester Keycloak avant migration │
├──────────────────────────┼────────┼─────────────┼─────────────────────────────────┤
│ Rollback difficile       │ Élevé  │ Moyen       │ Mode de transition avec flag    │
└──────────────────────────┴────────┴─────────────┴─────────────────────────────────┘

----

✅ CRITÈRES DE SUCCÈS

1. ✅ Aucun appel SQL direct depuis le frontend
2. ✅ Toutes les validations dans le backend
3. ✅ Tests passent à 100%
4. ✅ Performances identiques ou meilleures
5. ✅ Frontend allégé de 50% minimum
6. ✅ Audit logging fonctionnel
7. ✅ Documentation complète

----

🤔 QUESTIONS REPONSES

1. Conserver db.server.ts pour le mode démo (sans PostgreSQL) ?
   - ✅ Oui : garder le fallback en mémoire

2. Migration en Big Bang ou progressive ?
   - Big Bang

3. Ordre d'implémentation des endpoints ?
   - Commencer par Espaces puis Docs (plus critiques)

4. Gestion du markdown rendering ?
   - Endpoint /api/admin/docs/preview côté backend

5. Gestion des médias ?
   -  Dans un dossier uploads sur le serveur, avec des sous-dossiers pour éviter d'avoir des dossiers trop chargés (il sera monté dans un volume docker comme "server/uploads" par exemple)
     - Créer un endpoint POST /api/admin/media/upload (multipart/form-data)
     - Sauvegarder les fichiers dans /uploads/{...}/{uuid}.{ext}
     - Stocker en base uniquement : {id, name, file_path, width, height, created_at}
     - Servir les images via GET /uploads/{...}/{filename} (configuration Spring pour servir les statiques)


