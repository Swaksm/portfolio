# swaks.org — spec

Portfolio de Matthieu Izac (swaks). Site **100 % statique** : on dépose les fichiers sur le serveur, rien à compiler, aucun back-end.

## Principes

- Minimaliste, lisible, soigné. Pas de surcharge.
- Un seul fichier principal (`index.html`) : CSS et JS inline, zéro dépendance à installer.
- Services externes uniquement côté navigateur : Formspree (formulaire), Umami (stats). Les polices sont hébergées localement (`fonts/`).

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Le site (5 sections plein écran : accueil, présentation, compétences, projets, contact) |
| `404.html` | Page d'erreur |
| `.htaccess` | Config Apache (OVH) : page 404, redirection vers `https://swaks.org` (sans www), compression, cache, en-têtes de sécurité |
| `mentions-legales.html` | Mentions légales (FR/EN, même détection de langue que le site) |
| `favicon.svg` | Icône (navigateurs) |
| `icons/`, `site.webmanifest` | Icônes PNG (32, 180 iPhone, 192/512 Android) et manifeste pour l'écran d'accueil |
| `og-image.png` | Image d'aperçu des liens partagés (1200×630), générée depuis `og.html` |
| `og.html` | Source de `og-image.png` (régénérer : `chrome --headless=new --hide-scrollbars --window-size=1200,630 --screenshot=og-image.png og.html`) |
| `fonts/` | Outfit (variable) et Roboto Condensed 900, sous-ensemble latin, en woff2 |
| `img/` | Captures des projets (WebP 1280×800, 16:10) |
| `robots.txt`, `sitemap.xml` | Référencement |

## Design

- Palette « Parchment Mist » : crème `#F1EEE7`, parchemin `#EDE5D0`, taupe `#C7C0A8`, accent mauve `#C88ABB`, texte `#3a3530`.
- Mode sombre : suit le système, bouton soleil/lune en haut à droite ; choix mémorisé (`localStorage: swaks-theme`).
- Polices : Roboto Condensed 900 (titres), Outfit 400/700 (texte).
- Mouvement : révélations en cascade, transition expo entre sections. Tout est désactivé si `prefers-reduced-motion`.
- Effets :
  - thème qui s'étend en cercle depuis le bouton (View Transitions API, repli instantané sinon) ;
  - curseur personnalisé (point + anneau qui grossit sur les éléments cliquables), souris uniquement ;
  - « décodage » des lettres de SWAKS au survol ;
  - numéro de section en filigrane (`data-num` sur les titres) ;
  - vague de courbes qui traverse l'écran à chaque changement de section (canvas `#sweep`) ;
  - barre de progression mauve en haut (`#progress`) ;
  - relief 3D des captures de projets au survol (souris uniquement).

## Langues

- Anglais par défaut ; français si la langue principale du navigateur commence par `fr`.
- Bouton `FR` / `EN` en haut à droite (affiche la langue cible), choix mémorisé (`localStorage: swaks-lang`).
- Le HTML source est en anglais. Les textes traduisibles portent `data-i18n="clé"` (contenu) ou `data-i18n-attr="attribut:clé;…"`. Les deux langues sont dans l'objet `I18N` du `<head>` ; `t('clé')` sert aux textes JS (formulaire, jeu).
- Ajouter un texte : mettre la clé sur l'élément, puis l'entrée dans `I18N.en` et `I18N.fr`.

## Navigation

Sections en plein écran. Molette, flèches, PageUp/PageDown, Home/End, touches 1–5, swipe, points latéraux (à droite sur mobile). URL synchronisée (`#presentation`, `#competences`, `#projets`, `#contact`).

- Une section dont le contenu dépasse l'écran défile d'abord, puis passe à la suivante (molette et swipe).
- Navigation au clavier (Tab) : la section de l'élément focalisé s'affiche automatiquement.

## Contenu

- **Accueil** : SWAKS + accroche « Developer · AI · Nantes ».
- **Présentation** : texte, frise de parcours (Master en alternance → 2028, Bachelor, BTS SIO, bac 2022), langues.
- **Compétences** : 6 colonnes typographiques, sans icônes.
- **Projets** : Kleaner, Lion Meme, CordeSortie, Video Grabber. Une carte = titre, tags, capture (optionnelle, `img/`), description, chips techno, liens. Cartes repliables (bouton accessible, `aria-expanded`).
- **Contact** : email + formulaire Formspree (`mojzlrke`), validation côté client, gestion des erreurs réseau, champ piège anti-spam `_gotcha`.
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
