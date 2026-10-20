# swaks.org — spec

Portfolio de Matthieu Izac (swaks). Site **100 % statique** : on dépose les fichiers sur le serveur, rien à compiler, aucun back-end.

## Principes

- Minimaliste, lisible, soigné. Pas de surcharge.
- Un seul fichier principal (`index.html`) : CSS et JS inline, zéro dépendance à installer.
- Services externes uniquement côté navigateur : Google Fonts, Formspree (formulaire), Umami (stats).

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Le site (5 sections plein écran : accueil, présentation, compétences, projets, contact) |
| `404.html` | Page d'erreur (à déclarer côté serveur, ex. `ErrorDocument 404 /404.html` ou `error_page 404 /404.html`) |
| `favicon.svg` | Icône |
| `robots.txt`, `sitemap.xml` | Référencement |
| `design-tokens.css`, `style.css` | Anciennes feuilles de style, non chargées par `index.html` (référence palette) |

## Design

- Palette « Parchment Mist » : crème `#F1EEE7`, parchemin `#EDE5D0`, taupe `#C7C0A8`, accent mauve `#C88ABB`, texte `#3a3530`.
- Mode sombre : suit le système, bouton soleil/lune en haut à droite ; choix mémorisé (`localStorage: swaks-theme`).
- Polices : Roboto Condensed 900 (titres), Outfit 400/700 (texte).
- Mouvement : révélations en cascade, transition expo entre sections, désactivé si `prefers-reduced-motion`.

## Navigation

Sections en plein écran. Molette, flèches, PageUp/PageDown, Home/End, touches 1–5, swipe, points latéraux. URL synchronisée (`#presentation`, `#competences`, `#projets`, `#contact`).

## Contenu

- **Projets** : Kleaner, Lion Meme, CordeSortie, Video Grabber. Une carte = titre, tags, description, chips techno, liens. Cartes repliables (bouton accessible, `aria-expanded`).
- **Contact** : email + formulaire Formspree (`mojzlrke`), validation côté client, gestion des erreurs réseau.
- **Easter egg** : bouton invisible coin haut-gauche → mini-jeu « Flux » (meilleur score en `localStorage`).

## SEO

- `title`, `description`, `canonical`, Open Graph, Twitter Card.
- JSON-LD `Person` (nom, poste, ville, compétences, profils GitHub/LinkedIn).
- `robots.txt` + `sitemap.xml` (mettre à jour `lastmod` à chaque changement important).
- Tout le contenu est dans le HTML (indexable sans JS).

## Ajouter un projet

Copier un bloc `<div class="card">…</div>` dans `#projects`, ajuster le `--i` (ordre d'apparition), le texte, les chips et les liens.

## Déploiement

Copier tous les fichiers à la racine du serveur web de `swaks.org`. Le dépôt GitHub `Swaksm/portfolio` sert de source.
