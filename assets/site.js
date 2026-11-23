/* =========================================================
 *  swaks.org — comportements partagés (accueil + pages projets)
 *  Langue, thème, curseur, relief des captures, copie de l'email,
 *  stats GitHub et palette de commandes (Ctrl+K).
 *  Les textes viennent de window.t() (défini dans le <head>).
 * ========================================================= */
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const t = window.t || ((k) => k);
  const LANG = root.lang === 'fr' ? 'fr' : 'en';

  const EMAIL = 'swks.pro@gmail.com';
  const HASHES = ['', 'presentation', 'competences', 'projets', 'contact'];
  const PROJECTS = [
    ['kleaner', 'Kleaner'],
    ['autosu', 'Autosu'],
    ['popperz', 'Popperz'],
    ['lion-meme', 'Lion Meme'],
    ['cordesortie', 'CordeSortie'],
    ['video-grabber', 'Video Grabber'],
    ['timetableur', 'Timetableur'],
    ['melty', 'MELTY'],
    ['swaks-org', 'swaks.org'],
  ];

  /* ---------- URLs localisées : /x -> /fr/x ---------- */
  const local = (path) => (LANG === 'fr' ? '/fr' : '') + path;
  const otherLangUrl = () => {
    const p = location.pathname;
    return (LANG === 'fr' ? p.replace(/^\/fr(\/|$)/, '/') : '/fr' + p) + location.hash;
  };

  /* ---------- Notification courte ---------- */
  let toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  /* ---------- Langue ---------- */
  function switchLang() {
    try { localStorage.setItem('swaks-lang', LANG === 'fr' ? 'en' : 'fr'); } catch (e) {}
    location.href = otherLangUrl();
  }
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) langBtn.addEventListener('click', (e) => { e.preventDefault(); switchLang(); });

  /* ---------- Thème (le nouveau thème s'étend en cercle depuis le bouton) ---------- */
  const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
  const themeBtn = document.getElementById('theme-toggle');
  function toggleTheme(origin) {
    const isDark = root.dataset.theme ? root.dataset.theme === 'dark' : darkMq.matches;
    const apply = () => {
      root.dataset.theme = isDark ? 'light' : 'dark';
      try { localStorage.setItem('swaks-theme', root.dataset.theme); } catch (e) {}
    };
    // Transitions de couleur (survols) coupées pendant le changement : le nouveau thème
    // apparaît d'un coup dans le cercle au lieu de s'estomper élément par élément
    root.classList.add('theme-switching');
    const done = () => root.classList.remove('theme-switching');
    if (reduce || !document.startViewTransition) { apply(); getComputedStyle(root).color; done(); return; }
    const r = (origin || themeBtn || root).getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        // Départ doux : l'à-coup des premières images (capture de la page) tombe quand le cercle est encore petit
        { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
    vt.finished.finally(done);
  }
  if (themeBtn) themeBtn.addEventListener('click', () => toggleTheme(themeBtn));

  /* ---------- Copier l'email ---------- */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // Repli (contexte non sécurisé, vieux navigateurs)
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (err) {}
      ta.remove();
    }
    toast(t('ui.copied'));
  }
  document.querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', () => copyText(el.dataset.copy));
  });

  /* ---------- Relief 3D des captures au survol ---------- */
  if (!reduce && finePointer) {
    document.querySelectorAll('[data-tilt]').forEach((img) => {
      img.addEventListener('pointermove', (e) => {
        const r = img.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        img.style.transform = `perspective(1100px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg)`;
      });
      img.addEventListener('pointerleave', () => { img.style.transform = ''; });
    });
  }

  /* ---------- Stats GitHub en direct (cache 10 min, rien si hors ligne ou quota atteint) ---------- */
  const CACHE_MS = 600e3;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  async function ghData(repo, withReleases) {
    const key = 'swaks-gh-' + repo;
    try {
      const c = JSON.parse(localStorage.getItem(key) || 'null');
      if (c && Date.now() - c.at < CACHE_MS) return c.data;
    } catch (e) {}
    const res = await fetch('https://api.github.com/repos/' + repo);
    if (!res.ok) throw new Error('github');
    const j = await res.json();
    const data = { stars: j.stargazers_count, pushed: j.pushed_at, downloads: 0, version: '' };
    if (withReleases) {
      const rel = await releasesOf(repo).catch(() => []);
      data.downloads = rel.reduce((n, r) => n + r.assets.reduce((m, a) => m + a.count, 0), 0);
      const last = latestOf(rel);
      data.version = last ? last.tag : '';
    }
    try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch (e) {}
    return data;
  }

  /* ---------- Releases GitHub : une seule requête par page, partagée par les stats et le bloc de téléchargement.
     `fresh` (téléchargement) : toujours la liste à jour, le cache ne sert que si GitHub refuse (quota, hors ligne). ---------- */
  const releaseLoads = {};
  // Dernière version proposée : la plus récente stable ; une préversion seulement s'il n'y a aucune stable.
  const latestOf = (rel) => rel.find((r) => !r.pre) || rel[0];
  function releasesOf(repo, fresh) {
    const key = 'swaks-rel-' + repo;
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
    if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return Promise.resolve(cached.data);
    releaseLoads[repo] = releaseLoads[repo] || (async () => {
      const res = await fetch('https://api.github.com/repos/' + repo + '/releases?per_page=100');
      if (!res.ok) throw new Error('github');
      const data = (await res.json()).filter((r) => !r.draft).map((r) => ({
        tag: r.tag_name, date: r.published_at, pre: r.prerelease, url: r.html_url,
        assets: r.assets.map((a) => ({ name: a.name, url: a.browser_download_url, size: a.size, count: a.download_count })),
      }));
      try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch (e) {}
      return data;
    })().catch((e) => {
      if (cached) return cached.data;
      throw e;
    });
    return releaseLoads[repo];
  }

  /* ---------- Bloc « Télécharger » : dernière version en un clic, toutes les versions en dessous ---------- */
  const setupOf = (r) => r.assets.find((a) => /-setup\.exe$/i.test(a.name));
  const portableOf = (r) => r.assets.find((a) => /\.exe$/i.test(a.name) && !/-setup\.exe$/i.test(a.name));
  const day = (iso) => new Date(iso).toLocaleDateString(LANG, { day: 'numeric', month: 'short', year: 'numeric' });
  const mb = (b) => (b / 1e6).toLocaleString(LANG, { maximumFractionDigits: 1 }) + ' ' + t('ui.dl.mb');
  document.querySelectorAll('[data-releases]').forEach(async (box) => {
    let rel;
    try { rel = await releasesOf(box.dataset.releases, true); } catch (e) { return; } // hors ligne ou quota : liens GitHub gardés
    const latest = latestOf(rel);
    if (!latest) return;
    const project = box.dataset.releases.split('/')[1].toLowerCase();
    const main = setupOf(latest) || portableOf(latest);
    const portable = portableOf(latest);
    const version = latest.tag.replace(/^v/, '');
    if (main) {
      const btn = box.querySelector('[data-dl="setup"]');
      btn.href = main.url;
      btn.textContent = `${t('ui.dl.button')} ${version} ↓`;
    }
    const alt = box.querySelector('[data-dl="portable"]');
    if (portable && portable !== main) alt.href = portable.url;
    else alt.hidden = true;
    box.querySelector('[data-dl="meta"]').textContent = [version, day(latest.date), main && mb(main.size), latest.pre && t('ui.dl.pre'), t('ui.dl.req')]
      .filter(Boolean).join(' · ');
    box.querySelector('[data-dl="list"]').innerHTML = rel.map((r) => {
      const links = [[setupOf(r), t('ui.dl.setup')], [portableOf(r), t('ui.dl.exe')]]
        .filter(([a]) => a)
        .map(([a, label]) => `<a href="${esc(a.url)}" data-umami-event="download" data-umami-event-project="${esc(project)}">${esc(label)}</a>`)
        .join('');
      return `<li><span class="dl-tag">${esc(r.tag)}</span>`
        + (r === latest ? `<span class="dl-badge">${esc(t('ui.dl.latest'))}</span>` : '')
        + (r.pre ? `<span class="dl-badge pre">${esc(t('ui.dl.pre'))}</span>` : '')
        + `<span class="dl-date">${esc(day(r.date))}</span>`
        + `<span class="dl-count">↓ ${r.assets.reduce((m, a) => m + (a.count || 0), 0).toLocaleString(LANG)} ${esc(t('ui.downloads'))}</span>`
        + `<span class="dl-links">${links}<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(t('ui.dl.notes'))} ↗</a></span></li>`;
    }).join('');
  });
  const rtf = new Intl.RelativeTimeFormat(LANG, { numeric: 'auto' });
  function ago(iso) {
    const s = (new Date(iso) - Date.now()) / 1000;
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [u, sec] of units) if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), u);
    return rtf.format(0, 'minute');
  }
  document.querySelectorAll('[data-gh]').forEach(async (el) => {
    try {
      const d = await ghData(el.dataset.gh, 'ghReleases' in el.dataset);
      const parts = [];
      if (d.stars) parts.push(`<b>★ ${d.stars}</b>`);
      if (d.downloads) parts.push(`${d.downloads} ${esc(t('ui.downloads'))}`);
      if (d.version) parts.push(esc(d.version));
      if (d.pushed) parts.push(`${esc(t('ui.updated'))} ${esc(ago(d.pushed))}`);
      el.innerHTML = parts.join(' · ');
    } catch (e) { /* rien affiché */ }
  });

  /* ---------- Formulaires envoyés par Formspree (contact de l'accueil, avis sur Kleaner) ----------
     Champs obligatoires : attribut `required` + `data-error` (clé du texte d'erreur). Email vérifié s'il est rempli. */
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  document.querySelectorAll('form[data-formspree]').forEach((form) => {
    const fields = form.querySelectorAll('.field input, .field textarea');
    const errorOf = (el) => el.closest('.field').querySelector('.field-error');
    const setError = (el, msg) => { el.classList.add('invalid'); errorOf(el).textContent = msg; errorOf(el).classList.add('visible'); };
    const clearError = (el) => { el.classList.remove('invalid'); errorOf(el).classList.remove('visible'); };
    fields.forEach((el) => el.addEventListener('input', () => clearError(el)));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      let valid = true;
      fields.forEach((el) => {
        const v = el.value.trim();
        if (el.required && !v) { setError(el, t(el.dataset.error)); valid = false; }
        else if (el.type === 'email' && v && !emailRe.test(v)) { setError(el, t('err.emailInvalid')); valid = false; }
      });
      if (!valid) return;

      btn.textContent = t('form.sending');
      btn.disabled = true;
      let res = null;
      try {
        res = await fetch('https://formspree.io/f/' + form.dataset.formspree, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
      } catch (err) { /* réseau indisponible : traité comme une erreur */ }
      if (res && res.ok) {
        btn.textContent = t('form.sent');
        form.reset();
      } else {
        btn.textContent = t('form.error');
        btn.disabled = false;
      }
    });
  });

  /* ---------- Arrivée depuis le désinstalleur de Kleaner (?bye) : un mot, « un avis » présélectionné ---------- */
  const feedback = document.getElementById('feedback');
  if (feedback && new URLSearchParams(location.search).has('bye')) {
    feedback.querySelector('.i-bye').hidden = false;
    const types = feedback.querySelectorAll('input[name="type"]');
    if (types.length) types[types.length - 1].checked = true;
    // Après le chargement (polices, images) : sinon la page bouge encore et le message passe sous la barre du haut
    addEventListener('load', () => feedback.scrollIntoView({ block: 'start' }));
  }

  /* ---------- Palette de commandes (Ctrl+K) ---------- */
  const isHome = typeof window.swaksGoTo === 'function';
  const go = (url) => () => { location.href = url; };
  const open = (url) => () => { window.open(url, '_blank', 'noopener'); };
  const commands = [
    ...[['nav.about', 1], ['nav.skills', 2], ['nav.projects', 3], ['nav.contact', 4]].map(([k, i]) => ({
      label: t(k), group: t('ui.goto'),
      run: isHome ? () => window.swaksGoTo(i) : go(local('/') + '#' + HASHES[i]),
    })),
    { label: t('nav.me'), group: t('ui.goto'), run: go(local('/about.html')) },
    ...PROJECTS.map(([slug, name]) => ({ label: name, group: t('ui.project'), run: go(local(`/projects/${slug}.html`)) })),
    { label: t('ui.copyEmail'), group: t('ui.action'), run: () => copyText(EMAIL) },
    { label: t('ui.theme'), group: t('ui.action'), run: () => toggleTheme(themeBtn) },
    { label: t('ui.lang'), group: t('ui.action'), run: switchLang },
    { label: 'GitHub', group: t('ui.link'), run: open('https://github.com/Swaksm') },
    { label: 'LinkedIn', group: t('ui.link'), run: open('https://www.linkedin.com/in/matthieu-izac-257758292/') },
    { label: t('legal'), group: t('ui.link'), run: go('/mentions-legales.html') },
  ];
  if (!isHome) commands.unshift({ label: t('ui.home'), group: t('ui.goto'), run: go(local('/')) });

  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let backdrop = null, input = null, list = null, shown = [], sel = 0, lastFocus = null;

  function buildPalette() {
    backdrop = document.createElement('div');
    backdrop.className = 'palette-backdrop';
    backdrop.innerHTML = `
      <div class="palette" role="dialog" aria-modal="true" aria-label="${esc(t('ui.palette'))}">
        <input type="text" role="combobox" aria-expanded="true" aria-controls="palette-list" autocomplete="off" spellcheck="false" placeholder="${esc(t('ui.search'))}" />
        <ul id="palette-list" role="listbox"></ul>
        <div class="palette-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> ${esc(t('ui.navigate'))}</span><span><kbd>↵</kbd> ${esc(t('ui.open'))}</span><span><kbd>esc</kbd> ${esc(t('ui.close'))}</span></div>
      </div>`;
    document.body.appendChild(backdrop);
    input = backdrop.querySelector('input');
    list = backdrop.querySelector('ul');
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); select(sel + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
      else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    });
    list.addEventListener('mousemove', (e) => {
      const li = e.target.closest('li[data-i]');
      if (li && +li.dataset.i !== sel) select(+li.dataset.i);
    });
    list.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-i]');
      if (li) run(+li.dataset.i);
    });
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closePalette(); });
  }

  function render() {
    const q = norm(input.value.trim());
    shown = commands.filter((c) => !q || norm(c.label + ' ' + c.group).includes(q));
    sel = 0;
    list.innerHTML = shown.length
      ? shown.map((c, i) => `<li role="option" id="pal-${i}" data-i="${i}" aria-selected="${i === 0}"><span>${esc(c.label)}</span><small>${esc(c.group)}</small></li>`).join('')
      : `<li class="palette-empty" role="presentation">${esc(t('ui.noResult'))}</li>`;
    input.setAttribute('aria-activedescendant', shown.length ? 'pal-0' : '');
  }

  function select(i) {
    if (!shown.length) return;
    sel = (i + shown.length) % shown.length;
    list.querySelectorAll('li[data-i]').forEach((li) => li.setAttribute('aria-selected', String(+li.dataset.i === sel)));
    const li = list.querySelector(`li[data-i="${sel}"]`);
    li.scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', li.id);
  }

  function run(i) {
    const c = shown[i];
    if (!c) return;
    closePalette();
    c.run();
  }

  function openPalette() {
    if (!backdrop) buildPalette();
    lastFocus = document.activeElement;
    input.value = '';
    render();
    root.classList.add('palette-open');
    input.focus(); // tout de suite : les premières lettres tapées ne doivent pas se perdre
  }

  function closePalette() {
    root.classList.remove('palette-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      root.classList.contains('palette-open') ? closePalette() : openPalette();
    }
  });
  const paletteBtn = document.getElementById('palette-btn');
  if (paletteBtn) paletteBtn.addEventListener('click', openPalette);
  /* ---------- Statistiques Kleaner : graphiques SVG sans bibliothèque, données de data/kleaner-downloads.json
     (instantané quotidien écrit par .github/workflows/stats.yml). Couleurs par classes CSS : le thème clair/sombre suit seul. ---------- */
  document.querySelectorAll('[data-stats]').forEach(async (sec) => {
    let S, D;
    try {
      S = JSON.parse(sec.dataset.s);
      const res = await fetch(sec.dataset.stats, { cache: 'no-cache' });
      if (!res.ok) throw new Error('stats');
      D = await res.json();
    } catch (e) { return; } // hors ligne ou fichier absent : la section reste cachée
    const days = D.days || [];
    const last = days[days.length - 1];
    if (!last || !D.releases) return;
    sec.hidden = false;

    const q = (k) => sec.querySelector(`[data-st="${k}"]`);
    const num = (n) => Number(n).toLocaleString(LANG);
    const short = (iso) => new Date(iso).toLocaleDateString(LANG, { day: 'numeric', month: 'short' });
    const ms = (iso) => new Date(iso).getTime();
    const M = { l: 36, r: 16, t: 16, b: 26 };
    const NOW = Date.now();

    const rels = Object.entries(D.releases).map(([tag, r]) => ({ tag, date: r.date, pre: r.pre, count: last.versions[tag] || 0 }))
      .sort((a, b) => ms(a.date) - ms(b.date));
    const stable = rels.filter((r) => !r.pre);
    const starDates = (D.star_dates || []).map(ms).sort((a, b) => a - b);
    const launch = ms(D.launch || rels[0].date);

    /* Graduations rondes : 0, 1, 2, 5 × 10^n */
    function ticks(max) {
      const raw = Math.max(max, 1) / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
      const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p, out = [0];
      while (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
      return out;
    }
    const grid = (W, H, tk, y) => tk.map((v) =>
      `<line class="st-grid" x1="${M.l}" x2="${W - M.r}" y1="${y(v)}" y2="${y(v)}"/><text class="st-ax" x="${M.l - 8}" y="${y(v) + 4}" text-anchor="end">${num(v)}</text>`).join('');
    const colPath = (x, base, y, w) => {
      const h = base - y, r = Math.min(4, w / 2, h);
      return h <= 0 ? '' : `M${x},${base}V${y + r}a${r},${r} 0 0 1 ${r},-${r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}V${base}Z`;
    };

    /* Une bulle par graphique : valeur en gras, nom en retrait ; mêmes infos au clavier (focus) qu'à la souris */
    function tipFor(plot) {
      const el = document.createElement('div');
      el.className = 'st-tip';
      el.hidden = true;
      plot.appendChild(el);
      return {
        show(x, y, title, value, unit) {
          el.replaceChildren();
          const a = document.createElement('span'); a.className = 'st-tip-t'; a.textContent = title;
          const b = document.createElement('b'); b.textContent = value;
          const c = document.createElement('span'); c.textContent = ' ' + unit;
          el.append(a, document.createElement('br'), b, c);
          el.hidden = false;
          const w = el.offsetWidth, h = el.offsetHeight;
          el.style.left = Math.max(2, Math.min(plot.clientWidth - w - 2, x - w / 2)) + 'px';
          el.style.top = (y - h - 10 < 0 ? y + 14 : y - h - 10) + 'px';
        },
        hide() { el.hidden = true; },
      };
    }
    function hits(svg, tip, items) { // items : { el, x, y, title, value, unit, bar }
      items.forEach((it) => {
        const on = () => { it.bar && it.bar.classList.add('on'); tip.show(it.x, it.y, it.title, it.value, it.unit); };
        const off = () => { it.bar && it.bar.classList.remove('on'); tip.hide(); };
        it.el.addEventListener('pointerenter', on);
        it.el.addEventListener('pointermove', on);
        it.el.addEventListener('pointerleave', off);
        it.el.addEventListener('focus', on);
        it.el.addEventListener('blur', off);
      });
    }
    const svgOf = (plot, W, H, label, inner) => {
      let svg = plot.querySelector('svg');
      if (svg) svg.remove();
      plot.insertAdjacentHTML('afterbegin', `<svg class="st-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${inner}</svg>`);
      return plot.querySelector('svg');
    };
    const flag = (cx, w) => cx < 60 ? 'start' : cx > w - 60 ? 'end' : 'middle';

    /* ----- Chiffres clés ----- */
    const tile = (label, value, sub) => `<div class="st-kpi"><span class="st-kpi-l">${esc(label)}</span><b class="st-kpi-v">${esc(value)}</b><span class="st-kpi-s">${esc(sub || '')}</span></div>`;
    q('kpis').innerHTML = tile(S.k_downloads, num(last.total), S.k_downloads_sub)
      + tile(S.k_stars, num(starDates.length), '')
      + tile(S.k_versions, num(rels.length), S.k_versions_sub.replace('{n}', stable.length))
      + tile(S.k_days, num(Math.max(0, Math.floor((NOW - launch) / 864e5))), `${S.k_launch} ${day(new Date(launch).toISOString())}`);
    q('updated').textContent = `${S.updated} ${day(last.date)}.`;

    /* ----- Chronologie : une ligne du lancement à aujourd'hui, un point par version ----- */
    const tl = q('timeline'), tlPlot = tl.querySelector('.st-plot'), tlTip = tipFor(tlPlot);
    function drawTimeline() {
      const W = tlPlot.clientWidth; if (!W) return;
      const H = 104, y0 = 52, x0 = 16, x1 = W - 16, span = Math.max(NOW - launch, 1);
      const x = (t) => x0 + (x1 - x0) * (t - launch) / span;
      let g = `<line class="st-axis" x1="${x0}" x2="${x1}" y1="${y0}" y2="${y0}"/>`;
      const first = stable[0], newest = rels[rels.length - 1];
      const lab = (cx, cy, txt, anchor, strong) => `<text class="${strong ? 'st-lab' : 'st-ax'}" x="${cx}" y="${cy}" text-anchor="${anchor}">${esc(txt)}</text>`;
      g += lab(x0, 22, `${S.launch} · ${short(new Date(launch).toISOString())}`, 'start', true);
      g += lab(x1, 22, `${S.latest} · ${newest.tag}`, 'end', true);
      if (first && x(ms(first.date)) > x0 + 80 && x(ms(first.date)) < x1 - 80) g += lab(x(ms(first.date)), 92, `${first.tag} · ${short(first.date)}`, flag(x(ms(first.date)), W), false);
      g += lab(x1, 92, `${S.today} · ${short(new Date(NOW).toISOString())}`, 'end', false);
      const dots = rels.map((r) => `<circle class="st-dot${r.pre ? ' pre' : ''}" cx="${x(ms(r.date))}" cy="${y0}" r="${r.pre ? 4 : 6}"/>`).join('');
      const hit = rels.map((r, i) => `<circle class="st-hit" tabindex="0" cx="${x(ms(r.date))}" cy="${y0}" r="14" data-i="${i}" aria-label="${esc(`${r.tag}, ${day(r.date)}, ${num(r.count)} ${S.downloads}`)}"/>`).join('');
      const svg = svgOf(tlPlot, W, H, `${S.t_timeline}: ${rels.length}`, g + dots + hit);
      hits(svg, tlTip, [...svg.querySelectorAll('.st-hit')].map((el, i) => {
        const r = rels[i];
        return { el, x: x(ms(r.date)), y: y0, title: `${r.tag} · ${day(r.date)} · ${r.pre ? S.pre : S.stable}`, value: num(r.count), unit: S.downloads, bar: svg.querySelectorAll('.st-dot')[i] };
      }));
    }

    /* ----- Téléchargements par version : une colonne par version, la plus récente à droite ----- */
    const vs = q('versions'), vsPlot = vs.querySelector('.st-plot'), vsTip = tipFor(vsPlot);
    function drawVersions() {
      const W = vsPlot.clientWidth; if (!W) return;
      const H = 220, base = H - M.b, top = ticks(Math.max(...rels.map((r) => r.count), 1));
      const ymax = top[top.length - 1], y = (v) => base - (base - M.t) * v / ymax;
      const slot = (W - M.l - M.r) / rels.length, bw = Math.max(3, Math.min(24, slot - 2));
      const cx = (i) => M.l + slot * (i + 0.5);
      let g = grid(W, H, top, y), bars = '', hit = '', xl = '', lastX = -99;
      rels.forEach((r, i) => {
        bars += `<path class="st-bar${r.pre ? ' pre' : ''}" d="${colPath(cx(i) - bw / 2, base, y(r.count), bw)}"/>`;
        hit += `<rect class="st-hit" tabindex="0" x="${cx(i) - slot / 2}" y="${M.t}" width="${slot}" height="${base - M.t}" aria-label="${esc(`${r.tag}, ${day(r.date)}, ${num(r.count)} ${S.downloads}`)}"/>`;
        if (!r.pre && cx(i) - lastX >= 46 && cx(i) > M.l + 14 && cx(i) < W - M.r - 14) { xl += `<text class="st-ax" x="${cx(i)}" y="${H - 8}" text-anchor="middle">${esc(r.tag)}</text>`; lastX = cx(i); }
      });
      // étiquettes sélectives : la dernière version et la plus téléchargée
      const peak = rels.reduce((a, r, i) => r.count > rels[a].count ? i : a, 0), ends = new Set([rels.length - 1, peak]);
      let vals = '';
      ends.forEach((i) => { vals += `<text class="st-lab" x="${Math.max(M.l + 8, Math.min(W - M.r - 8, cx(i)))}" y="${y(rels[i].count) - 6}" text-anchor="middle">${num(rels[i].count)}</text>`; });
      const svg = svgOf(vsPlot, W, H, S.t_versions, g + bars + vals + xl + hit);
      hits(svg, vsTip, [...svg.querySelectorAll('.st-hit')].map((el, i) => ({
        el, x: cx(i), y: y(rels[i].count), title: `${rels[i].tag} · ${day(rels[i].date)}${rels[i].pre ? ' · ' + S.pre : ''}`,
        value: num(rels[i].count), unit: S.downloads, bar: svg.querySelectorAll('.st-bar')[i],
      })));
    }

    /* ----- Téléchargements par jour : écart entre deux instantanés ----- */
    const dl = q('daily'), dlPlot = dl.querySelector('.st-plot'), dlTip = tipFor(dlPlot);
    const gains = days.slice(1).map((d, i) => ({ date: d.date, n: Math.max(0, d.total - days[i].total), total: d.total })).slice(-60);
    function drawDaily() {
      const W = dlPlot.clientWidth; if (!W) return;
      if (!gains.length) {
        dlPlot.innerHTML = `<p class="st-empty">${esc(S.daily_empty.replace('{date}', day(days[0].date)))}</p>`;
        return;
      }
      const H = 200, base = H - M.b, top = ticks(Math.max(...gains.map((d) => d.n), 1));
      const ymax = top[top.length - 1], y = (v) => base - (base - M.t) * v / ymax;
      const slot = (W - M.l - M.r) / gains.length, bw = Math.max(3, Math.min(24, slot - 2));
      const cx = (i) => M.l + slot * (i + 0.5);
      let g = grid(W, H, top, y), bars = '', hit = '';
      gains.forEach((d, i) => {
        bars += `<path class="st-bar" d="${colPath(cx(i) - bw / 2, base, y(d.n), bw)}"/>`;
        hit += `<rect class="st-hit" tabindex="0" x="${cx(i) - slot / 2}" y="${M.t}" width="${slot}" height="${base - M.t}" aria-label="${esc(`${day(d.date)}, ${num(d.n)} ${S.downloads}`)}"/>`;
      });
      const idx = [...new Set([0, Math.floor((gains.length - 1) / 2), gains.length - 1])];
      const xl = idx.map((i) => `<text class="st-ax" x="${cx(i)}" y="${H - 8}" text-anchor="${flag(cx(i), W)}">${esc(short(gains[i].date))}</text>`).join('');
      const svg = svgOf(dlPlot, W, H, S.t_daily, g + bars + xl + hit);
      hits(svg, dlTip, [...svg.querySelectorAll('.st-hit')].map((el, i) => ({
        el, x: cx(i), y: y(gains[i].n), title: day(gains[i].date), value: num(gains[i].n), unit: S.downloads, bar: svg.querySelectorAll('.st-bar')[i],
      })));
    }

    /* ----- Étoiles : total cumulé en escalier ----- */
    const sr = q('stars'), srPlot = sr.querySelector('.st-plot'), srTip = tipFor(srPlot);
    if (!starDates.length) sr.hidden = true;
    function drawStars() {
      const W = srPlot.clientWidth; if (!W || !starDates.length) return;
      const H = 190, base = H - M.b, top = ticks(starDates.length), ymax = top[top.length - 1];
      const t0 = Math.min(launch, starDates[0]), span = Math.max(NOW - t0, 1);
      const x = (t) => M.l + (W - M.l - M.r) * (t - t0) / span, y = (v) => base - (base - M.t) * v / ymax;
      let d = `M${x(t0)},${y(0)}`, prev = 0;
      starDates.forEach((t, i) => { d += `H${x(t)}V${y(i + 1)}`; prev = i + 1; });
      d += `H${x(NOW)}`;
      const g = grid(W, H, top, y)
        + `<path class="st-area" d="${d}V${base}H${x(t0)}Z"/><path class="st-line" d="${d}"/>`;
      const dots = starDates.map((t, i) => `<circle class="st-dot" cx="${x(t)}" cy="${y(i + 1)}" r="4"/>`).join('');
      const hit = starDates.map((t, i) => `<circle class="st-hit" tabindex="0" cx="${x(t)}" cy="${y(i + 1)}" r="14" aria-label="${esc(`${day(new Date(t).toISOString())}, ${i + 1} ${i ? S.stars : S.star}`)}"/>`).join('');
      const xl = [t0, NOW].map((t, i) => `<text class="st-ax" x="${x(t)}" y="${H - 8}" text-anchor="${i ? 'end' : 'start'}">${esc(short(new Date(t).toISOString()))}</text>`).join('');
      const endLab = `<text class="st-lab" x="${x(NOW)}" y="${y(prev) - 10}" text-anchor="end">${num(prev)}</text>`;
      const svg = svgOf(srPlot, W, H, S.t_stars, g + xl + dots + endLab + hit);
      hits(svg, srTip, [...svg.querySelectorAll('.st-hit')].map((el, i) => ({
        el, x: x(starDates[i]), y: y(i + 1), title: day(new Date(starDates[i]).toISOString()), value: num(i + 1), unit: i ? S.stars : S.star, bar: svg.querySelectorAll('.st-dot')[i],
      })));
    }

    /* ----- Version tableau : tout ce que les infobulles montrent, sans survol ----- */
    const table = (head, rows) => {
      const t = document.createElement('table');
      const hr = t.createTHead().insertRow();
      head.forEach((h) => { const c = document.createElement('th'); c.scope = 'col'; c.textContent = h; hr.appendChild(c); });
      const body = t.createTBody();
      rows.forEach((r) => { const tr = body.insertRow(); r.forEach((v) => { tr.insertCell().textContent = v; }); });
      return t;
    };
    const tabs = q('tables');
    tabs.append(table([S.c_version, S.c_date, S.c_downloads], [...rels].reverse().map((r) => [r.tag + (r.pre ? ' (' + S.pre + ')' : ''), day(r.date), num(r.count)])));
    if (gains.length) tabs.append(table([S.c_day, S.c_new, S.c_total], [...gains].reverse().map((d) => [day(d.date), num(d.n), num(d.total)])));

    const draws = [[tlPlot, drawTimeline], [vsPlot, drawVersions], [dlPlot, drawDaily], [srPlot, drawStars]];
    const seen = new Map();
    const ro = new ResizeObserver((entries) => entries.forEach((e) => {
      const f = draws.find(([p]) => p === e.target)[1], w = Math.round(e.contentRect.width);
      if (w && seen.get(e.target) !== w) { seen.set(e.target, w); f(); }
    }));
    draws.forEach(([p]) => ro.observe(p));
  });
})();
