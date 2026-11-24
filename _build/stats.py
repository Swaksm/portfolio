"""Instantané quotidien des téléchargements des releases GitHub de Kleaner.

    python _build/stats.py            # ajoute (ou remplace) la ligne du jour dans data/kleaner-downloads.json

GitHub ne donne que le total cumulé par fichier : l'historique se construit en gardant un instantané par jour.
Téléchargements du jour = total d'aujourd'hui moins total de la veille.
"""
import datetime
import json
import subprocess
import sys
from pathlib import Path

REPO = 'Swaksm/Kleaner'
OUT = Path(__file__).resolve().parent.parent / 'data' / 'kleaner-downloads.json'


def pages(path: str, *headers: str) -> list:
    cmd = ['gh', 'api', '--paginate']
    for h in headers:
        cmd += ['-H', h]
    res = subprocess.run(cmd + [path], capture_output=True, text=True, encoding='utf-8')
    if res.returncode:  # message de gh dans le journal de l'Action (sinon l'erreur reste muette)
        raise RuntimeError(f'gh api {path} : {res.stderr.strip()}')
    raw = res.stdout
    # --paginate concatène les pages : [..][..]
    dec, i, out = json.JSONDecoder(), 0, []
    while i < len(raw):
        if raw[i].isspace():
            i += 1
            continue
        page, i = dec.raw_decode(raw, i)
        out += page
    return out


def releases() -> list:
    return pages(f'repos/{REPO}/releases?per_page=100')


def star_dates() -> list:
    # le type « star+json » ajoute la date de chaque étoile
    rows = pages(f'repos/{REPO}/stargazers?per_page=100', 'Accept: application/vnd.github.star+json')
    return sorted(r['starred_at'] for r in rows)


def main() -> None:
    versions, info = {}, {}
    for r in releases():
        if r.get('draft'):
            continue
        versions[r['tag_name']] = sum(a.get('download_count', 0) for a in r['assets'])
        info[r['tag_name']] = {'date': r['published_at'], 'pre': bool(r['prerelease'])}
    day = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    data = json.loads(OUT.read_text('utf-8')) if OUT.exists() else {'repo': REPO, 'days': []}
    try:
        stars = star_dates()
    except RuntimeError as e:
        # Le jeton de l'Action ne peut pas lister les étoiles d'un autre dépôt (HTTP 403), mais lit leur nombre.
        # shortcut: une nouvelle étoile est datée du jour du relevé (au jour près, la date exacte demande un jeton personnel)
        print('Liste des étoiles illisible, nombre lu sur le dépôt :', e, file=sys.stderr)
        stars = sorted(data.get('star_dates', []))
        count = json.loads(subprocess.run(['gh', 'api', f'repos/{REPO}'], check=True, capture_output=True,
                                          text=True, encoding='utf-8').stdout)['stargazers_count']
        now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        stars = stars[:count] + [now] * (count - len(stars))  # étoiles retirées : on enlève les plus récentes
    data['days'] = [d for d in data['days'] if d['date'] != day]
    data['days'].append({'date': day, 'total': sum(versions.values()), 'stars': len(stars), 'versions': versions})
    data['launch'] = min(v['date'] for v in info.values())
    data['releases'] = info
    data['star_dates'] = stars
    data['days'].sort(key=lambda d: d['date'])
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', 'utf-8')
    print(day, sum(versions.values()), 'téléchargements,', len(versions), 'versions,', len(stars), 'étoiles')


if __name__ == '__main__':
    main()
