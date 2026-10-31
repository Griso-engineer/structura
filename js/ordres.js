/* Page « Ordres de grandeur ». */
(function (S) {
  'use strict';
  const el = S.el, sv = S.svg;
  S.pages = S.pages || {};

  const range = v => Array.isArray(v) ? `${S.fmt(v[0])} – ${S.fmt(v[1])}` : S.fmt(v);
  const table = (head, rows, numCols = []) => el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' },
    el('thead', {}, el('tr', {}, head.map((h, i) => el('th', { class: numCols.includes(i) ? 'num' : '' }, h)))),
    el('tbody', {}, rows.map(r => el('tr', {}, r.map((c, i) => el('td', { class: numCols.includes(i) ? 'num' : '' }, c)))))));

  const SECTIONS = [['portees', 'Portées et élancements'], ['materiaux', 'Matériaux'], ['permanentes', 'Charges permanentes'], ['charges', 'Charges d\'exploitation']];

  S.pages.ordres = function (root) {
    const nav = el('div', { class: 'og-nav' }, SECTIONS.map(([id, l]) =>
      el('button', { class: 'chip', onclick: () => document.getElementById('og-' + id).scrollIntoView({ behavior: 'smooth' }) }, l)));
    let n = 0;
    const sec = (id, title, intro, ...body) => el('section', { class: 'og-sec', id: 'og-' + id },
      el('div', { class: 'sub-head' }, S.blockHead(`4.${++n}`, title, intro, 'h2')), ...body);
    root.append(el('div', { class: 'page' },
      S.blockHead('04', 'Ordres de grandeur', 'Les valeurs qui permettent de dessiner juste dès l\'esquisse : portées et élancements selon le matériau, comportement des matériaux, charges permanentes et d\'exploitation. Ce sont des fourchettes de pré-conception, à confirmer par le calcul.'),
      nav,
      sec('portees', 'Portées et élancements par matériau', 'Domaine de portée usuel de chaque système (échelle logarithmique) et élancement classique correspondant. Cliquez sur un nom pour ouvrir la fiche de la typologie.', portees()),
      sec('materiaux', 'Matériaux', 'Comment se comportent les quatre matériaux de structure courants, ce qu\'ils pèsent et comment ils se comparent.', materiaux()),
      sec('permanentes', 'Ordres de grandeur des charges permanentes', 'Poids propres des planchers, revêtements, couvertures et façades. Rappel : 100 kg/m² ≈ 1 kN/m².', poids()),
      sec('charges', 'Charges d\'exploitation', 'Ce que représente concrètement une charge d\'exploitation : 1 kN/m² ≈ 100 kg sur chaque mètre carré, soit une personne et quart.', usages())));
  };

  // ------------------------------------------------------------------ portées et élancements
  const MATS = [['bois', 'Bois'], ['acier', 'Acier'], ['beton', 'Béton'], ['textile', 'Câbles et textiles']];
  function portees() {
    const st = { mat: 'bois' };
    const box = el('div');
    const chips = el('div', { class: 'chips', style: 'margin-bottom:14px' });
    const lo = Math.log10(0.5), hi = Math.log10(2000);
    const pos = v => (Math.log10(Math.max(v, 0.5)) - lo) / (hi - lo) * 100;
    const ticks = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
    function render() {
      chips.innerHTML = '';
      MATS.forEach(([k, l]) => chips.append(el('button', { class: 'chip' + (st.mat === k ? ' on' : ''), onclick: () => { st.mat = k; render(); } }, l)));
      const rows = [];
      S.TYPOLOGIES.forEach(t => t.rows.filter(r => r[0] === st.mat).forEach(r => rows.push({ t, v: r[1], sp: r[2], lh: r[3] })));
      rows.sort((a, b) => a.sp[1] - b.sp[1] || a.sp[0] - b.sp[0]);
      // une ligne : nom, barre de portées précédée des schémas 2D et 3D (après la barre si elle commence trop à gauche)
      const row = ({ t, v, sp, lh }) => {
        const x0 = pos(sp[0]);
        return el('div', { class: 'rc-row wide' },
          el('a', { class: 'nm', href: '#/typologies/' + t.id, title: `${t.name} — ${v}` }, t.name, el('small', {}, v)),
          el('div', { class: 'rc-track' }, ticks.map(x => el('i', { class: 'rc-grid', style: `left:${pos(x)}%` })),
            el('div', { class: 'rc-bar mat-' + st.mat, style: `left:${x0}%;width:${Math.max(0.8, pos(sp[1]) - x0)}%` },
              el('div', { class: 'rc-ico' + (x0 < 26 ? ' after' : '') + (S.typoStatic(t) ? '' : ' solo'), title: t.name },
                S.typoStatic(t) ? el('div', { class: 'rc-2d', html: S.typoStatic(t) }) : null,
                el('div', { class: 'rc-3d', html: `<svg class="icon" viewBox="0 0 200 120" aria-hidden="true">${t.svg}</svg>` })),
              el('span', {}, `${S.fmt(sp[0])}–${S.fmt(sp[1])} m`))),
          el('span', { class: 'lh' }, lh));
      };
      box.innerHTML = '';
      box.append(el('div', { class: 'range-chart' },
        el('div', { class: 'rc-row wide rc-head' }, el('span', {}, 'Système'), el('span', {}, 'Portées usuelles'), el('span', {}, 'Élancement classique')),
        // regroupement par famille, dans l'ordre de la page Typologies
        S.TYPO_FAMILIES.map(([id, name]) => {
          const fr = rows.filter(r => r.t.fam === id);
          return fr.length ? [el('div', { class: 'rc-fam' }, name), fr.map(row)] : null;
        }),
        el('div', { class: 'rc-axis wide' }, ticks.map(x => el('span', { style: `left:${pos(x)}%` }, `${x} m`)))));
      if (!rows.length) box.append(el('p', { class: 'muted' }, 'Aucun système pour ce matériau.'));
    }
    render();
    return el('div', {}, chips, box,
      el('p', { class: 'muted', style: 'font-size:12.5px;margin-top:10px' }, 'L = portée, h = hauteur de la section, H = hauteur maximale, f = flèche (montée) d\'un arc ou d\'un câble. Bois lamellé-collé : Glulam Handbook, tableau 3.1 (entraxe ≈ 6 m, charge variable ≈ 3 kN/m²).'));
  }

  // ------------------------------------------------------------------ charges permanentes
  function poids() {
    return el('div', { class: 'grid2' }, ...S.OG_POIDS.map(g => el('div', { class: 'card' }, el('h3', {}, g.title),
      table(['Désignation', 'kg/m²'], g.rows.map(r => [r[0], range(r[1])]), [1]))));
  }

  // ------------------------------------------------------------------ charges d'exploitation illustrées
  // silhouette de face (1,75 m de haut pour h px), contour clair pour distinguer les personnes qui se chevauchent
  function person(cx, base, h, op = 1) {
    const k = h / 175, t = base - h, p = sv('g', { opacity: op });
    const d = `M${cx - 19 * k} ${t + 32 * k} Q${cx} ${t + 24 * k} ${cx + 19 * k} ${t + 32 * k} L${cx + 17 * k} ${t + 92 * k} L${cx + 13 * k} ${t + 92 * k} L${cx + 11 * k} ${base} L${cx + 2 * k} ${base} L${cx} ${t + 104 * k} L${cx - 2 * k} ${base} L${cx - 11 * k} ${base} L${cx - 13 * k} ${t + 92 * k} L${cx - 17 * k} ${t + 92 * k} Z`;
    const sw = Math.max(0.6, 1.5 * k);
    p.append(sv('circle', { cx, cy: t + 12 * k, r: 10 * k, fill: 'var(--ink)', stroke: 'var(--paper)', 'stroke-width': sw }),
      sv('path', { d, fill: 'var(--ink)', stroke: 'var(--paper)', 'stroke-width': sw, 'stroke-linejoin': 'round' }));
    return p;
  }

  /* Élévation à l'échelle humaine : les personnes de 80 kg qu'il faut entasser sur 1 m². 1 m = 100 px. */
  function usageFig(q) {
    const nP = q * 100 / 80, W = 170, H = 250, sc = 100, x0 = 44, yG = H - 30;
    const g = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diag usage-fig' });
    [1, 2].forEach(m => { g.append(sv('line', { x1: 22, y1: yG - m * sc, x2: 28, y2: yG - m * sc, class: 'axis' }), sv('text', { x: 18, y: yG - m * sc + 4, 'text-anchor': 'end', style: 'font-size:10px' }, `${m} m`)); });
    g.append(sv('line', { x1: 25, y1: yG, x2: 25, y2: yG - 2 * sc, class: 'axis' }));
    const perRow = 3, rows = Math.ceil(nP / perRow);
    for (let r = rows - 1; r >= 0; r--) {
      const inRow = Math.min(perRow, Math.max(0, nP - r * perRow));
      for (let k = 0; k < Math.ceil(inRow); k++) {
        const frac = Math.min(1, inRow - k);
        const cx = x0 + 18 + (k + (r % 2) * 0.5) * (sc - 36) / (perRow - 1) * 0.9;
        g.append(person(cx, yG - r * 7, 175, (0.35 + 0.65 * (1 - r / Math.max(rows, 1))) * (frac < 1 ? 0.45 : 1)));
      }
    }
    g.append(sv('rect', { x: x0, y: yG, width: sc, height: 10, fill: 'var(--paper-2)', stroke: 'var(--ink)', 'stroke-width': 1.3 }));
    g.append(sv('text', { x: x0 + sc / 2, y: yG + 24, 'text-anchor': 'middle', style: 'font-size:11px' }, '1 m²'));
    return g;
  }

  /* Axonométrie : une pièce de 20 m² (5 × 4 m), 3 m sous plafond, avec toutes les personnes
     de 80 kg qui représentent la charge d'exploitation. */
  function roomFig(q) {
    const Lx = 5, Ly = 4, Hz = 3, n = Math.round(q * 100 * Lx * Ly / 80);
    const W = 300, H = 250;
    const P = (x, y, z) => S.axo.P(x, y, z);
    const corners = [[0, 0, 0], [Lx, 0, 0], [Lx, Ly, 0], [0, Ly, 0], [0, 0, Hz], [Lx, 0, Hz], [Lx, Ly, Hz], [0, Ly, Hz]].map(c => P(...c));
    const xs = corners.map(p => p[0]), ys = corners.map(p => p[1]);
    const k = Math.min((W - 30) / (Math.max(...xs) - Math.min(...xs)), (H - 30) / (Math.max(...ys) - Math.min(...ys)));
    const ox = (W - (Math.max(...xs) - Math.min(...xs)) * k) / 2 - Math.min(...xs) * k, oy = (H - (Math.max(...ys) - Math.min(...ys)) * k) / 2 - Math.min(...ys) * k;
    const T = (x, y, z) => { const p = P(x, y, z); return [p[0] * k + ox, p[1] * k + oy]; };
    const g = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diag usage-fig' });
    const poly = (pts, attrs) => g.append(sv('polygon', Object.assign({ points: pts.map(p => T(...p).join(',')).join(' ') }, attrs)));
    // sol et murs du fond
    poly([[0, 0, 0], [Lx, 0, 0], [Lx, Ly, 0], [0, Ly, 0]], { fill: 'var(--paper-2)', stroke: 'var(--ink)', 'stroke-width': 1 });
    poly([[0, Ly, 0], [Lx, Ly, 0], [Lx, Ly, Hz], [0, Ly, Hz]], { fill: 'none', stroke: 'var(--ghost)', 'stroke-width': 1 });
    poly([[0, 0, 0], [0, Ly, 0], [0, Ly, Hz], [0, 0, Hz]], { fill: 'none', stroke: 'var(--ghost)', 'stroke-width': 1 });
    for (let i = 1; i < Lx; i++) g.append(sv('line', { x1: T(i, 0, 0)[0], y1: T(i, 0, 0)[1], x2: T(i, Ly, 0)[0], y2: T(i, Ly, 0)[1], stroke: 'var(--line)' }));
    for (let j = 1; j < Ly; j++) g.append(sv('line', { x1: T(0, j, 0)[0], y1: T(0, j, 0)[1], x2: T(Lx, j, 0)[0], y2: T(Lx, j, 0)[1], stroke: 'var(--line)' }));
    // foule répartie uniformément, dessinée du fond vers l'avant
    const cols = Math.max(1, Math.round(Math.sqrt(n * Lx / Ly))), rows = Math.ceil(n / cols);
    const spots = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols && spots.length < n; i++) spots.push([(i + 0.5 + (j % 2) * 0.25) * Lx / cols, (j + 0.5) * Ly / rows]);
    spots.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const hpx = T(0, 0, 1.75)[1] - T(0, 0, 0)[1];
    spots.forEach(([x, y]) => { const [px, py] = T(x, y, 0); g.append(person(px, py, -hpx)); });
    // arêtes avant (par-dessus)
    [[[Lx, 0, 0], [Lx, 0, Hz]], [[0, 0, 0], [0, 0, Hz]], [[0, 0, Hz], [Lx, 0, Hz]], [[Lx, 0, Hz], [Lx, Ly, Hz]], [[0, 0, Hz], [0, Ly, Hz]], [[0, Ly, Hz], [Lx, Ly, Hz]], [[Lx, Ly, 0], [Lx, Ly, Hz]]].forEach(([a, b]) => {
      const A = T(...a), B = T(...b);
      g.append(sv('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-dasharray': a[1] === Ly || b[1] === Ly ? '3 3' : null }));
    });
    const lab = T(Lx / 2, 0, 0);
    g.append(sv('text', { x: lab[0], y: lab[1] + 16, 'text-anchor': 'middle', style: 'font-size:11px' }, `20 m² · 3 m sous plafond · ${n} personnes`));
    return g;
  }

  function usages() {
    return el('div', {},
      el('p', { class: 'note', style: 'margin-bottom:22px' }, 'Les silhouettes sont dessinées à l\'échelle. À gauche, la foule qu\'il faudrait entasser sur chaque mètre carré ; à droite, la même charge dans une pièce de 20 m² et 3 m sous plafond : c\'est pour ce nombre de personnes que le plancher est dimensionné, en plus de son propre poids.'),
      el('div', { class: 'usages' }, S.OG_USAGES.map(u => el('div', { class: 'usage' },
        el('div', { class: 'usage-top' }, el('span', { class: 'big-num' }, S.fmt(u.q * 100, 0), el('small', {}, ' kg/m²')), el('small', {}, `${S.fmt(u.q, 1)} kN/m²`)),
        el('h3', {}, u.name),
        el('div', { class: 'usage-figs2' }, usageFig(u.q), roomFig(u.q)),
        el('div', { class: 'usage-eq' },
          el('div', {}, el('b', {}, `≈ ${S.fmt(u.q * 100 / 80, 1)} personnes`), ' de 80 kg sur chaque m²'),
          el('div', {}, el('b', {}, `${S.fmt(u.q * 100 * 20 / 1000, 1)} t`), ' pour une pièce de 20 m²')),
        el('p', {}, u.picture)))));
  }

  // ------------------------------------------------------------------ matériaux
  // Loi contrainte-déformation schématique (ε en ‰, σ en MPa)
  const LAWS = {
    acier: { t: [[0, 0], [1.7, 355], [25, 355], [40, 470]], c: [[0, 0], [1.7, 355], [25, 355]], eps: 40, note: 'palier plastique : ductile' },
    beton: { t: [[0, 0], [0.1, 2.6]], c: [[0, 0], [0.5, 12], [1, 20], [2, 25], [3.5, 25]], eps: 4, note: 'traction quasi nulle' },
    bois: { t: [[0, 0], [1.7, 19]], c: [[0, 0], [2.1, 24], [6, 24]], eps: 6, note: 'rupture fragile en traction' },
    alu: { t: [[0, 0], [2.1, 150], [20, 190]], c: [[0, 0], [2.1, 150], [10, 170]], eps: 20, note: 'écrouissage progressif' }
  };
  function lawFig(m) {
    const law = LAWS[m.k], W = 300, H = 210, cx = W / 2, cy = H / 2;
    const smax = Math.max(...law.t.map(p => p[1]), ...law.c.map(p => p[1]));
    const kx = (W / 2 - 24) / law.eps, ky = (H / 2 - 22) / smax;
    const g = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diag' });
    g.append(sv('line', { x1: 10, y1: cy, x2: W - 10, y2: cy, class: 'axis' }), sv('line', { x1: cx, y1: 8, x2: cx, y2: H - 8, class: 'axis' }));
    const line = (pts, sgn) => g.append(sv('polyline', { points: pts.map(([e, s]) => `${cx + sgn * e * kx},${cy - sgn * s * ky}`).join(' '), fill: 'none', stroke: m.color, 'stroke-width': 3 }));
    line(law.t, 1); line(law.c, -1);
    g.append(sv('text', { x: cx + 6, y: 18, class: 'fx', style: 'font-size:11.5px' }, `traction ${S.fmt(m.ft, 1)} MPa`));
    g.append(sv('text', { x: cx - 6, y: H - 10, class: 'fx', 'text-anchor': 'end', style: 'font-size:11.5px' }, `compression ${S.fmt(m.fc, 0)} MPa`));
    g.append(sv('text', { x: W - 10, y: cy - 6, 'text-anchor': 'end', style: 'font-size:11px' }, 'ε'));
    g.append(sv('text', { x: 10, y: 18, style: 'font-size:11px' }, law.note));
    return g;
  }
  function compare(title, unit, f, fmt, note) {
    const vals = S.OG_MATS.map(m => f(m)), vmax = Math.max(...vals);
    return el('div', { class: 'cmp' }, el('h3', {}, title), note ? el('small', {}, note) : null,
      S.OG_MATS.map((m, i) => el('div', { class: 'cmp-row' }, el('span', {}, m.name.split(' ')[0]),
        el('div', { class: 'cmp-bar' }, el('i', { style: `width:${Math.max(1, 100 * vals[i] / vmax)}%;background:${m.color}` })),
        el('b', {}, `${fmt(vals[i])} ${unit}`))));
  }
  function materiaux() {
    return el('div', {},
      el('div', { class: 'mat-grid' }, S.OG_MATS.map(m => el('div', { class: 'mat-card' },
        el('h3', {}, m.name), lawFig(m), el('p', {}, m.txt)))),
      el('h3', { style: 'margin:28px 0 4px;font-size:20px' }, 'Comparer les matériaux'),
      el('div', { class: 'cmp-grid' },
        compare('Résistance en compression', 'MPa', m => m.fc, v => S.fmt(v, 0)),
        compare('Résistance en traction', 'MPa', m => m.ft, v => S.fmt(v, 1), 'Le béton seul ne tient presque rien en traction.'),
        compare('Rigidité (module E)', 'GPa', m => m.E, v => S.fmt(v, 1), 'À section égale, l\'acier fléchit 18 fois moins que le bois.'),
        compare('Masse volumique', 'kg/m³', m => m.rho, v => S.fmt(v, 0)),
        // poids d'un mètre de poteau juste capable de porter 10 t : 0,1·ρ / f  (kg/m)
        compare('Poids d\'un poteau qui porte 10 tonnes', 'kg/m', m => 0.1 * m.rho / m.fc, v => S.fmt(v, 1), 'Masse d\'un mètre de barre juste suffisante pour porter 10 t en compression (sans flambement). Plus la valeur est faible, mieux c\'est : bois et aluminium sont les plus légers, le béton cinq fois plus lourd.'),
        // poids d'un mètre de barre ayant la même raideur axiale EA = 100 MN : 0,1·ρ / E  (kg/m)
        compare('Poids pour une même raideur', 'kg/m', m => 0.1 * m.rho / m.E, v => S.fmt(v, 1), 'Masse d\'un mètre de barre qui s\'allonge autant sous la même charge. Acier, bois et aluminium font jeu égal : à poids égal, ils sont aussi raides.')),
      el('div', { class: 'card', style: 'margin-top:28px' }, el('h3', {}, 'Masses volumiques'), table(['Matériau', 'kg/m³'], S.OG_MASSES, [1])));
  }
})(window.S);
