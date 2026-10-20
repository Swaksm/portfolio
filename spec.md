# swaks.org — spec

Portfolio de Matthieu Izac (swaks). Site **100 % statique** : on dépose les fichiers sur le serveur, aucun back-end. Un petit script Python (`_build/build.py`, sans dépendance) génère en local les pages françaises, les pages projets et le sitemap.

## Principes

- Minimaliste, lisible, soigné. Pas de surcharge.
- Aucune dépendance à installer ; Python 3 seulement pour le build local.
- Services externes uniquement côté navigateur : Formspree (formulaire), Umami (stats), API GitHub (stats des projets). Les polices sont hébergées localement (`fonts/`).
- Chemins absolus (`/fonts/…`, `/img/…`) : le site doit être servi à la racine du domaine.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Accueil anglais **et source** de l'accueil (5 sections plein écran). Contient le dictionnaire FR/EN (`<script id="i18n">`) |
| `fr/index.html` | Accueil français — **généré**, ne pas modifier à la main |
| `projects/*.html`, `fr/projects/*.html` | Pages projets EN / FR — **générées** depuis `_build/projects.json` |
| `assets/site.css`, `assets/site.js` | Commun à toutes les pages : palette, polices, thème, langue, curseur, palette de commandes, copie d'email, stats GitHub |
| `assets/project.css` | Style des pages projets |
| `_build/` | `build.py`, `projects.json` (contenu des pages projets), `head.html` (script d'en-tête commun), `og.html` (modèle des images d'aperçu). Bloqué en ligne par `.htaccess` |
| `404.html`, `mentions-legales.html` | Page d'erreur, mentions légales (FR/EN dans la même page) |
| `.htaccess` | Config Apache (OVH) : 404, redirection vers `https://swaks.org` (sans www), compression, cache, en-têtes de sécurité, blocage de `_build/` |
| `favicon.svg`, `icons/`, `site.webmanifest` | Icônes (navigateur, iPhone, Android) |
| `og-image.png`, `img/og/*.png` | Images d'aperçu des liens partagés (1200×630) — générées |
| `img/`, `img/projects/` | Captures des projets (WebP 1280×800, 16:10) |
| `fonts/` | Outfit (variable) et Roboto Condensed 900, sous-ensemble latin, woff2 |
| `robots.txt`, `sitemap.xml` | Référencement (`sitemap.xml` généré, avec les alternatives hreflang) |

## Build

```
python _build/build.py          # fr/index.html, pages projets, sitemap.xml
python _build/build.py --og     # + images d'aperçu (Chrome ou Edge requis)
```

À relancer après toute modification de `index.html`, de `_build/projects.json` ou de `_build/head.html`, puis committer le résultat.

## Langues

- Deux versions par page : anglaise (`/…`) et française (`/fr/…`), liées par `hreflang` ; chacune a sa propre URL canonique, donc Google indexe les deux.
- Script d'en-tête commun (`_build/head.html`) : au chargement, redirige vers la bonne version — choix mémorisé (`localStorage: swaks-lang`), sinon français si le navigateur est en français, sinon anglais. Les robots ne sont pas redirigés.
- Bouton `FR` / `EN` en haut à droite : va vers l'autre version et mémorise le choix.
- Accueil : le HTML source est en anglais ; les textes traduisibles portent `data-i18n="clé"` (contenu) ou `data-i18n-attr="attribut:clé;…"`, les liens internes `data-localize="href"`. Le build applique les valeurs `fr` du dictionnaire pour produire `fr/index.html`.
- `window.t('clé')` (défini dans l'en-tête) donne les textes utilisés par le JavaScript (formulaire, jeu, palette…).

## Design

- Palette « Parchment Mist » : crème `#F1EEE7`, parchemin `#EDE5D0`, taupe `#C7C0A8`, accent mauve `#C88ABB`, texte `#3a3530`. Mode sombre : suit le système, bouton soleil/lune, choix mémorisé (`localStorage: swaks-theme`).
- Polices : Roboto Condensed 900 (titres), Outfit (texte).
- Tout le mouvement est désactivé si `prefers-reduced-motion`.
- Effets de l'accueil : vague de courbes au changement de section (`#sweep`), barre de progression (`#progress`), « décodage » de SWAKS au survol, numéros de section en filigrane (`data-num`).
- Effets communs (`site.js`) : thème qui s'étend en cercle (View Transitions API), relief 3D des captures (`data-tilt`).
- Curseur : point mauve natif (`assets/cursor.svg`, souris uniquement), anneau (`assets/cursor-hover.svg`) sur ce qui est cliquable : écrire `cursor: var(--pointer)` au lieu de `cursor: pointer`. Défini dans `site.css`.

## Navigation

- Accueil en sections plein écran : molette, flèches, PageUp/PageDown, Home/End, touches 1–5, swipe, points latéraux (à droite sur mobile). URL synchronisée (`#presentation`, `#competences`, `#projets`, `#contact`). Une section trop haute défile d'abord, puis passe à la suivante. Tab amène la section de l'élément focalisé.
- **Palette de commandes** : `Ctrl+K` / `⌘K` ou l'icône loupe. Aller à une section, ouvrir un projet, copier l'email, changer de thème ou de langue, liens.

## Contenu

- **Accueil** : SWAKS + accroche « Developer · AI · Nantes ».
- **Présentation** : texte, frise de parcours (Master en alternance → 2028, Bachelor, BTS SIO, bac 2022), langues.
- **Compétences** : 6 colonnes typographiques, sans icônes.
- **Projets** : cartes repliables (aperçu : capture, description, chips, liens) avec un lien « Voir plus » vers la page du projet. Stats GitHub en direct (`data-gh="owner/repo"`, `data-gh-releases` pour les téléchargements ; cache 1 h).
- **Pages projets** : accroche, chips, stats GitHub, boutons, capture, sections détaillées, galerie, projet suivant. JSON-LD (`SoftwareApplication`, `WebApplication` ou `SoftwareSourceCode`).
- **Contact** : email copiable en un clic (`data-copy`), formulaire Formspree (`mojzlrke`) avec validation, gestion des erreurs réseau et champ piège anti-spam `_gotcha`.
- **Easter egg** : bouton invisible coin haut-gauche → mini-jeu « Flux ».

## Ajouter un projet

1. Ajouter l'entrée dans `_build/projects.json` (slug, textes EN/FR, chips, liens, captures).
2. Ajouter la carte dans `#projects` de `index.html` (copier une carte existante : clés `data-i18n` + entrées du dictionnaire, `data-gh`, lien « Voir plus » vers `/projects/<slug>.html`).
3. Ajouter le projet à la liste `PROJECTS` de `assets/site.js` (palette).
4. `python _build/build.py --og`.

## Déploiement

Copier tout le contenu à la racine du serveur web de `swaks.org` (le dossier `_build/` peut être omis). Le dépôt GitHub `Swaksm/portfolio` sert de source.
