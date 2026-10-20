"""Build du site swaks.org (à lancer en local, rien côté serveur).

    python _build/build.py          # régénère les pages FR, les pages projets et le sitemap
    python _build/build.py --og     # + les images d'aperçu (nécessite Chrome ou Edge)

Sources :
  - index.html            page d'accueil anglaise (source de vérité), textes FR dans <script id="i18n">
  - _build/projects.json  contenu EN/FR des pages projets
  - _build/head.html      script d'en-tête commun (thème, textes, redirection de langue)
Sorties :
  - fr/index.html                           accueil français
  - projects/<slug>.html, fr/projects/...   pages projets EN / FR
  - sitemap.xml                             avec les alternatives hreflang
  - og-image.png, img/og/<slug>.png         images d'aperçu (--og)
"""
import datetime
import html
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / '_build'
SITE = 'https://swaks.org'
BIRTH = datetime.date(2004, 4, 2)
TODAY = datetime.date.today()


def age() -> int:
    return TODAY.year - BIRTH.year - ((TODAY.month, TODAY.day) < (BIRTH.month, BIRTH.day))


def read(p: Path) -> str:
    return p.read_text(encoding='utf-8')


def write(p: Path, s: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s, encoding='utf-8', newline='\n')
    print('  écrit', p.relative_to(ROOT))


def attr(s: str) -> str:
    return html.escape(s, quote=True)


def text(s: str) -> str:
    return html.escape(s, quote=False)


def fr_url(url: str) -> str:
    """/x -> /fr/x ; https://swaks.org/x -> https://swaks.org/fr/x"""
    if url.startswith(SITE + '/'):
        return SITE + '/fr' + url[len(SITE):]
    if url.startswith('/'):
        return '/fr' + url
    return url


def i18n_of(page: str) -> dict:
    m = re.search(r'<script id="i18n" type="application/json">(.*?)</script>', page, flags=re.S)
    return json.loads(m.group(1).replace('<\\/', '</'))


def i18n_block(d: dict) -> str:
    return ('<script id="i18n" type="application/json">'
            + json.dumps(d, ensure_ascii=False, indent=1).replace('</', '<\\/') + '</script>')


# ---------------------------------------------------------------------------
#  Accueil : index.html (EN) -> fr/index.html
# ---------------------------------------------------------------------------
TAG = re.compile(r'<([a-zA-Z][\w-]*)(\s[^<>]*?)?(/?)>')


def element_close(page: str, tag: str, pos: int) -> int:
    """Position de la balise fermante correspondant à <tag> ouverte juste avant `pos`."""
    depth = 1
    for m in re.finditer(rf'<(/?){tag}\b[^>]*?(/?)>', page[pos:], flags=re.I):
        if m.group(1):
            depth -= 1
        elif not m.group(2):
            depth += 1
        if depth == 0:
            return pos + m.start()
    raise ValueError('balise non fermée : ' + tag)


def localize(page: str, fr: dict) -> str:
    # Les blocs <script> (dont le dictionnaire) sont mis de côté pendant la traduction
    scripts = []
    def stash(m):
        scripts.append(m.group(0))
        return f'\x00{len(scripts) - 1}\x00'
    page = re.sub(r'<script\b.*?</script>', stash, page, flags=re.S)

    # 1. Contenu des éléments data-i18n (en partant de la fin pour garder les positions)
    for m in reversed(list(re.finditer(r'<([a-zA-Z][\w-]*)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>', page))):
        key = m.group(2)
        if key not in fr:
            continue
        close = element_close(page, m.group(1), m.end())
        page = page[:m.end()] + fr[key] + page[close:]

    # 2. Attributs data-i18n-attr="attr:clé;…" et data-localize="attr,…"
    def fix_tag(m):
        tag = m.group(0)
        a = re.search(r'data-i18n-attr="([^"]+)"', tag)
        if a:
            for pair in a.group(1).split(';'):
                name, key = pair.split(':')
                if key in fr:
                    tag = re.sub(rf'(\s{name}=")[^"]*(")', lambda x: x.group(1) + attr(fr[key]) + x.group(2), tag)
        loc = re.search(r'data-localize="([^"]+)"', tag)
        if loc:
            for name in loc.group(1).split(','):
                tag = re.sub(rf'(\s{name}=")([^"]*)(")', lambda x: x.group(1) + fr_url(x.group(2)) + x.group(3), tag)
        return tag
    page = re.sub(r'<[a-zA-Z][^<>]*\sdata-(?:i18n-attr|localize)="[^"]*"[^<>]*>', fix_tag, page)

    # 3. Divers : langue du document, Open Graph, bouton de langue
    page = page.replace('<html lang="en">', '<html lang="fr">', 1)
    page = page.replace('og:locale" content="en_US"', 'og:locale" content="__FR__"')
    page = page.replace('og:locale:alternate" content="fr_FR"', 'og:locale:alternate" content="en_US"')
    page = page.replace('__FR__', 'fr_FR')

    return re.sub('\x00(\\d+)\x00', lambda m: scripts[int(m.group(1))], page)


def lang_toggle(target_lang: str, href: str) -> str:
    label = 'Passer en français' if target_lang == 'fr' else 'Switch to English'
    return (f'<a id="lang-toggle" href="{href}" lang="{target_lang}" hreflang="{target_lang}" '
            f'aria-label="{label}">{target_lang.upper()}</a>')


def build_home() -> dict:
    src = ROOT / 'index.html'
    page = read(src)
    # Âge à jour dans le HTML (le JS le recalcule aussi au chargement)
    page = re.sub(r'<span class="age">\d*</span>', f'<span class="age">{age()}</span>', page)
    write(src, page)
    d = i18n_of(page)
    fr = localize(page, d['fr'])
    fr = re.sub(r'<span class="age">\d*</span>', f'<span class="age">{age()}</span>', fr)
    fr = re.sub(r'<a id="lang-toggle"[^>]*>FR</a>', lang_toggle('en', '/'), fr)
    write(ROOT / 'fr' / 'index.html', fr)
    return d


# ---------------------------------------------------------------------------
#  Pages projets
# ---------------------------------------------------------------------------
UI = {
    'en': {'home': '← swaks', 'all': 'All projects', 'next': 'Next project', 'title_suffix': 'swaks.org',
           'footer': '© swaks — All rights reserved', 'legal': 'Legal notice'},
    'fr': {'home': '← swaks', 'all': 'Tous les projets', 'next': 'Projet suivant', 'title_suffix': 'swaks.org',
           'footer': '© swaks — Tous droits réservés', 'legal': 'Mentions légales'},
}


def socials(home_page: str, lang: str, en_path: str) -> str:
    """Barre d'icônes reprise de l'accueil (mêmes SVG), avec le bon bouton de langue."""
    m = re.search(r'<div id="socials">(.*?)\n</div>', home_page, flags=re.S)
    inner = m.group(1)
    inner = re.sub(r'\s*<!--.*?-->', '', inner, flags=re.S)
    other = 'en' if lang == 'fr' else 'fr'
    href = en_path if lang == 'fr' else fr_url(en_path)
    inner = re.sub(r'<a id="lang-toggle"[^>]*>FR</a>', lang_toggle(other, href), inner)
    return '<div id="socials">' + inner + '\n    </div>'


def project_page(p: dict, lang: str, nxt: dict, home_page: str, head_snippet: str, ui_dict: dict) -> str:
    c = p[lang]
    u = UI[lang]
    slug = p['slug']
    en_path = f'/projects/{slug}.html'
    path = en_path if lang == 'en' else fr_url(en_path)
    url = SITE + path
    home = '/' if lang == 'en' else '/fr/'
    og = f'{SITE}/img/og/{slug}.png'

    schema = {'@context': 'https://schema.org', **p['schema'], 'name': p['name'], 'description': c['description'],
              'url': url, 'image': og, 'inLanguage': lang,
              'author': {'@type': 'Person', 'name': 'Matthieu Izac', 'url': SITE + '/'}}
    if schema['@type'] in ('SoftwareApplication', 'WebApplication'):
        schema['offers'] = {'@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR'}

    i = iter(range(3, 60))  # ordre d'apparition (animation en cascade)
    chips = ''.join(f'<span class="chip">{text(x)}</span>' for x in p['chips'])
    stats = (f'<span class="gh-stats" data-gh="{p["repo"]}"' + (' data-gh-releases' if p['releases'] else '') + '></span>')
    links = '\n      '.join(
        f'<a class="btn{" primary" if l.get("primary") else ""}" href="{attr(l["href"])}" target="_blank" rel="noopener">'
        f'{text(l["label"][lang])} ↗</a>' for l in p['links'])

    shots = p['shots']
    hero = ''
    gallery = ''
    if shots:
        s0 = shots[0]
        hero = (f'\n    <figure class="shot" style="--i:{next(i)}"><img src="{s0["src"]}" alt="{attr(s0["alt"][lang])}" '
                f'width="1280" height="800" data-tilt /></figure>')
    if len(shots) > 1:
        imgs = '\n      '.join(f'<img src="{s["src"]}" alt="{attr(s["alt"][lang])}" width="1280" height="800" loading="lazy" decoding="async" data-tilt />'
                               for s in shots[1:])
        gallery = f'\n    <div class="gallery" style="--i:{next(i)}">\n      {imgs}\n    </div>'

    sections = ''
    for sec in c['sections']:
        body = ''.join(f'\n      <p>{text(x)}</p>' for x in sec.get('p', []))
        if sec.get('ul'):
            body += '\n      <ul>' + ''.join(f'\n        <li>{text(x)}</li>' for x in sec['ul']) + '\n      </ul>'
        sections += f'\n    <section style="--i:{next(i)}">\n      <h2>{text(sec["h"])}</h2>{body}\n    </section>'

    nxt_path = f'/projects/{nxt["slug"]}.html'
    nxt_href = nxt_path if lang == 'en' else fr_url(nxt_path)
    title = f'{c["title"]} · {u["title_suffix"]}'

    return f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{text(title)}</title>
  <meta name="description" content="{attr(c['description'])}" />
  <meta name="author" content="Matthieu Izac" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="{url}" />
  <link rel="alternate" hreflang="en" href="{SITE}{en_path}" />
  <link rel="alternate" hreflang="fr" href="{SITE}{fr_url(en_path)}" />
  <link rel="alternate" hreflang="x-default" href="{SITE}{en_path}" />
  <meta name="theme-color" content="#F1EEE7" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#1c1917" media="(prefers-color-scheme: dark)" />
  <meta name="color-scheme" content="light dark" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="swaks.org" />
  <meta property="og:title" content="{attr(c['title'])}" />
  <meta property="og:description" content="{attr(c['description'])}" />
  <meta property="og:url" content="{url}" />
  <meta property="og:image" content="{og}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="{'fr_FR' if lang == 'fr' else 'en_US'}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="{og}" />

  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="preload" href="/fonts/outfit-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/fonts/roboto-condensed-900-latin.woff2" as="font" type="font/woff2" crossorigin />

  {i18n_block(ui_dict)}
{head_snippet}
  <link rel="stylesheet" href="/assets/site.css" />
  <link rel="stylesheet" href="/assets/project.css" />

  <script type="application/ld+json">
{json.dumps(schema, ensure_ascii=False, indent=2)}
  </script>
  <script defer src="/assets/site.js"></script>
  <script defer src="https://cloud.umami.is/script.js" data-website-id="50c62680-6fe2-4654-82fd-813896edce5e"></script>
</head>
<body class="page">
  <header class="topbar">
    <a class="home-link" href="{home}#projets">{text(u['home'])}</a>
    {socials(home_page, lang, en_path)}
  </header>

  <main class="project">
    <p class="kicker" style="--i:0">{text(c['kicker'])}</p>
    <h1 style="--i:0">{text(p['name'])}<span>.</span></h1>
    <p class="lead" style="--i:1">{text(c['lead'])}</p>
    <div class="meta" style="--i:1">{chips}{stats}</div>
    <div class="actions" style="--i:2">
      {links}
    </div>{hero}{sections}{gallery}

    <nav class="next" style="--i:{next(i)}">
      <a class="to-all" href="{home}#projets"><small>←</small><strong>{text(u['all'])}</strong></a>
      <a class="to-next" href="{nxt_href}"><small>{text(u['next'])} →</small><strong>{text(nxt['name'])}</strong></a>
    </nav>
  </main>

  <footer class="page-footer">{text(u['footer'])} · <a href="/mentions-legales.html">{text(u['legal'])}</a></footer>
</body>
</html>
'''


def build_projects(home_dict: dict) -> list:
    projects = json.loads(read(BUILD / 'projects.json'))
    home_page = read(ROOT / 'index.html')
    head_snippet = read(BUILD / 'head.html').rstrip('\n')
    # Textes de l'interface (palette, stats GitHub…) repris du dictionnaire de l'accueil
    keep = lambda k: k.startswith(('ui.', 'nav.')) or k in ('legal', 'theme', 'theme.title')
    ui_dict = {lang: {k: v for k, v in home_dict[lang].items() if keep(k)} for lang in ('en', 'fr')}
    for n, p in enumerate(projects):
        nxt = projects[(n + 1) % len(projects)]
        for lang in ('en', 'fr'):
            out = ROOT / ('projects' if lang == 'en' else 'fr/projects') / f'{p["slug"]}.html'
            page = project_page(p, lang, nxt, home_page, head_snippet, ui_dict)
            if lang == 'fr':
                page = localize(page, ui_dict['fr'])  # libellés des boutons (thème, palette)
            write(out, page)
    return projects


# ---------------------------------------------------------------------------
#  Sitemap et images d'aperçu
# ---------------------------------------------------------------------------
def build_sitemap(projects: list) -> None:
    paths = ['/'] + [f'/projects/{p["slug"]}.html' for p in projects]
    urls = []
    for en in paths:
        alts = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{h}" href="{SITE}{u}" />'
                       for h, u in (('en', en), ('fr', fr_url(en)), ('x-default', en)))
        for u in (en, fr_url(en)):
            urls.append(f'  <url>\n    <loc>{SITE}{u}</loc>\n    <lastmod>{TODAY.isoformat()}</lastmod>{alts}\n  </url>')
    write(ROOT / 'sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
          + '\n'.join(urls) + '\n</urlset>\n')


def find_chrome():
    for c in (r'C:\Program Files\Google\Chrome\Application\chrome.exe',
              r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
              'google-chrome', 'chromium', 'chrome', 'msedge'):
        if Path(c).exists() or shutil.which(c):
            return c
    return None


def build_og(projects: list) -> None:
    chrome = find_chrome()
    if not chrome:
        print('  Chrome/Edge introuvable : images d\'aperçu ignorées')
        return
    tpl = (BUILD / 'og.html').resolve().as_uri()
    jobs = [(ROOT / 'og-image.png', '')]
    for p in projects:
        q = f'?t={p["name"]}&s={p["en"]["kicker"]}'
        jobs.append((ROOT / 'img' / 'og' / f'{p["slug"]}.png', q))
    for out, q in jobs:
        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
                        '--window-size=1200,630', '--virtual-time-budget=3000', f'--screenshot={out}', tpl + q],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        print('  écrit', out.relative_to(ROOT))


if __name__ == '__main__':
    print('Accueil FR'); home_dict = build_home()
    print('Pages projets'); projects = build_projects(home_dict)
    print('Sitemap'); build_sitemap(projects)
    if '--og' in sys.argv:
        print('Images d\'aperçu'); build_og(projects)
