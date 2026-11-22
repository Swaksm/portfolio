"""Instantané quotidien des téléchargements des releases GitHub de Kleaner.

    python _build/stats.py            # ajoute (ou remplace) la ligne du jour dans data/kleaner-downloads.json

GitHub ne donne que le total cumulé par fichier : l'historique se construit en gardant un instantané par jour.
Téléchargements du jour = total d'aujourd'hui moins total de la veille.
"""
import datetime
import json
import subprocess
from pathlib import Path

REPO = 'Swaksm/Kleaner'
OUT = Path(__file__).resolve().parent.parent / 'data' / 'kleaner-downloads.json'


def releases() -> list:
    raw = subprocess.run(['gh', 'api', '--paginate', f'repos/{REPO}/releases?per_page=100'],
                         check=True, capture_output=True, text=True).stdout
    # --paginate concatène les pages : [..][..]
    dec, i, out = json.JSONDecoder(), 0, []
    while i < len(raw):
        if raw[i].isspace():
            i += 1
            continue
        page, i = dec.raw_decode(raw, i)
        out += page
    return out


def main() -> None:
    versions = {}
    for r in releases():
        if r.get('draft'):
            continue
        versions[r['tag_name']] = sum(a.get('download_count', 0) for a in r['assets'])
    day = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    data = json.loads(OUT.read_text('utf-8')) if OUT.exists() else {'repo': REPO, 'days': []}
    data['days'] = [d for d in data['days'] if d['date'] != day]
    data['days'].append({'date': day, 'total': sum(versions.values()), 'versions': versions})
    data['days'].sort(key=lambda d: d['date'])
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', 'utf-8')
    print(day, sum(versions.values()), 'téléchargements,', len(versions), 'versions')


if __name__ == '__main__':
    main()
