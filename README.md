# swaks.org

Portfolio de Matthieu Izac (swaks) : **[swaks.org](https://swaks.org)**.

Site 100 % statique, bilingue FR/EN, en HTML/CSS/JS sans framework ni dépendance.

## Tester en local

En ligne, l'hébergement OVH sert les fichiers tels quels : rien à installer ni à lancer.

En local, ouvrir `index.html` en double-cliquant ne marche pas : les chemins sont absolus (`/assets/…`, `/fonts/…`), pensés pour la racine du domaine. Il faut servir le dossier à la racine :

```
python -m http.server 8000
```

Puis ouvrir http://localhost:8000.

## Build

Les pages françaises, les pages projets et le sitemap sont générés (Python 3, sans dépendance) :

```
python _build/build.py          # fr/index.html, pages projets, sitemap.xml
python _build/build.py --og     # + images d'aperçu (Chrome ou Edge requis)
```

À relancer après toute modification de `index.html`, `_build/projects.json` ou `_build/head.html`.

## Déploiement

Copier le contenu du dépôt à la racine du serveur web (hébergement OVH, config dans `.htaccess`).

## Documentation

Détails (structure, langues, design, ajout d'un projet) : [spec.md](spec.md).
