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
    ['lion-meme', 'Lion Meme'],
    ['cordesortie', 'CordeSortie'],
    ['video-grabber', 'Video Grabber'],
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
        { duration: 700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
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

  /* ---------- Stats GitHub en direct (cache 1 h, rien si hors ligne ou quota atteint) ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  async function ghData(repo, withReleases) {
    const key = 'swaks-gh-' + repo;
    try {
      const c = JSON.parse(localStorage.getItem(key) || 'null');
      if (c && Date.now() - c.at < 3600e3) return c.data;
    } catch (e) {}
    const res = await fetch('https://api.github.com/repos/' + repo);
    if (!res.ok) throw new Error('github');
    const j = await res.json();
    const data = { stars: j.stargazers_count, pushed: j.pushed_at, downloads: 0, version: '' };
    if (withReleases) {
      const rr = await fetch('https://api.github.com/repos/' + repo + '/releases?per_page=100');
      if (rr.ok) {
        const rel = await rr.json();
        data.downloads = rel.reduce((n, r) => n + r.assets.reduce((m, a) => m + a.download_count, 0), 0);
        data.version = rel[0] ? rel[0].tag_name : '';
      }
    }
    try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch (e) {}
    return data;
  }
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

  /* ---------- Palette de commandes (Ctrl+K) ---------- */
  const isHome = typeof window.swaksGoTo === 'function';
  const go = (url) => () => { location.href = url; };
  const open = (url) => () => { window.open(url, '_blank', 'noopener'); };
  const commands = [
    ...[['nav.about', 1], ['nav.skills', 2], ['nav.projects', 3], ['nav.contact', 4]].map(([k, i]) => ({
      label: t(k), group: t('ui.goto'),
      run: isHome ? () => window.swaksGoTo(i) : go(local('/') + '#' + HASHES[i]),
    })),
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
})();
