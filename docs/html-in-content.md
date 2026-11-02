# HTML et CSS dans les contenus Wiki/Blog

## Sécurité

Le système **sanitise** automatiquement tout le contenu pour protéger contre les attaques XSS (Cross-Site Scripting). Le JavaScript est **bloqué** pour la sécurité.

## Ce qui est autorisé

### ✅ Markdown complet
- Titres (# à ######)
- Listes (ordonnées et non ordonnées)
- Tableaux
- Liens et images
- Citations (>)
- Code inline et blocs de code
- Texte en gras, italique, barré

### ✅ HTML sémantique
```html
<article>, <section>, <aside>, <nav>, <header>, <footer>, <main>
<div>, <span>, <p>
<h1> à <h6>
<strong>, <em>, <mark>, <small>, <abbr>, <cite>, <time>, <kbd>, <sub>, <sup>
<details>, <summary>
<figure>, <figcaption>
```

### ✅ Tableaux HTML
```html
<table>, <thead>, <tbody>, <tfoot>, <tr>, <th>, <td>, <caption>
```

### ✅ Médias
```html
<!-- Images -->
<img src="..." alt="..." width="500" height="300" loading="lazy">

<!-- Vidéos -->
<video controls width="640" height="360">
  <source src="video.mp4" type="video/mp4">
</video>

<!-- Audio -->
<audio controls>
  <source src="audio.mp3" type="audio/mpeg">
</audio>
```

### ✅ iframes (YouTube, Vimeo uniquement)
```html
<!-- YouTube -->
<iframe 
  width="560" 
  height="315" 
  src="https://www.youtube.com/embed/VIDEO_ID"
  frameborder="0" 
  allowfullscreen>
</iframe>

<!-- Vimeo -->
<iframe 
  src="https://player.vimeo.com/video/VIDEO_ID"
  width="640" 
  height="360" 
  frameborder="0" 
  allowfullscreen>
</iframe>
```

### ✅ CSS inline et balises `<style>`
```html
<!-- CSS inline -->
<div style="background: linear-gradient(45deg, #667eea, #764ba2); padding: 2rem; color: white; border-radius: 8px;">
  Contenu avec style personnalisé
</div>

<!-- Balise style -->
<style>
.ma-classe {
  background-color: #f0f0f0;
  padding: 1rem;
  border-left: 4px solid #667eea;
}

.animation {
  animation: fadeIn 1s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>

<div class="ma-classe animation">
  Contenu stylisé avec animation CSS
</div>
```

### ✅ Attributs autorisés
- `class`, `id`, `style`, `title`
- `data-*` (tous les attributs data)
- `aria-*` (pour l'accessibilité)
- `colspan`, `rowspan`, `align`, `valign` (tableaux)
- Attributs spécifiques aux médias (width, height, controls, etc.)

### ✅ Blocs spéciaux

#### Callouts (encadrés)
```markdown
:::info
Ceci est une information importante.
:::

:::warning
Attention à ceci !
:::

:::danger
Danger : manipulation délicate.
:::
```

#### Graphiques
```markdown
\`\`\`chart
{
  "type": "bar",
  "title": "Statistiques mensuelles",
  "data": [
    { "name": "Jan", "value": 120 },
    { "name": "Fév", "value": 150 }
  ]
}
\`\`\`
```

#### Diagrammes Mermaid
```markdown
\`\`\`mermaid
graph LR
  A[Début] --> B[Traitement]
  B --> C[Fin]
\`\`\`
```

## Ce qui est bloqué

### ❌ JavaScript
```html
<!-- ❌ Balises script -->
<script>alert('test');</script>

<!-- ❌ Attributs JavaScript -->
<button onclick="alert('test')">Cliquer</button>
<img onerror="alert('test')" src="invalid">

<!-- ❌ URLs JavaScript -->
<a href="javascript:alert('test')">Lien</a>
```

### ❌ iframes non autorisées
```html
<!-- ❌ Domaines non whitelistés -->
<iframe src="https://autre-site.com"></iframe>
```

### ❌ Balises dangereuses
```html
<object>, <embed>, <applet>, <base>, <meta>
```

## Exemples pratiques

### Carte avec ombre
```html
<style>
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  margin: 1rem 0;
}

.card-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: #667eea;
}
</style>

<div class="card">
  <div class="card-title">Titre de la carte</div>
  <p>Contenu de la carte avec un style personnalisé.</p>
</div>
```

### Grid responsive
```html
<style>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.grid-item {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>

<div class="grid">
  <div class="grid-item">Item 1</div>
  <div class="grid-item">Item 2</div>
  <div class="grid-item">Item 3</div>
</div>
```

### Badges et labels
```html
<style>
.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}

.badge-success { background: #10b981; color: white; }
.badge-warning { background: #f59e0b; color: white; }
.badge-danger { background: #ef4444; color: white; }
</style>

<span class="badge badge-success">Actif</span>
<span class="badge badge-warning">En attente</span>
<span class="badge badge-danger">Erreur</span>
```

## Conclusion

Vous avez une grande flexibilité pour styliser vos contenus avec HTML et CSS, tout en restant protégé contre les attaques XSS. Pour des besoins d'interactivité, utilisez les graphiques intégrés ou les diagrammes Mermaid.
