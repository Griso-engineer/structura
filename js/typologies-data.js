/* Mémento des typologies structurelles : données et dessins axonométriques.
   rows : élancements et portées usuels par matériau [matériau, variante, [portée min, max] (m), élancement].
   Valeurs indicatives de pré-conception (bois lamellé-collé : Glulam Handbook, tableau 3.1). */
(function (S) {
  'use strict';
  const A = S.axo, T = S.TRUSS, U = S.UNDER;
  const PI = Math.PI;

  // ------------------------------------------------------------------ aides de dessin
  const tr = (name, L, h, n, o = {}) => { const g = T[name](L, h, n); return A.frames(g, Object.assign({ sup: g.sup, col: L * 0.22 }, o)); };
  const beam = (xs, o = {}) => A.frames({ nodes: xs.map(x => [x, 0]), bars: xs.slice(1).map((_, i) => [i, i + 1]) }, Object.assign({ sup: xs.map((_, i) => i), col: 3, sp: 2.6 }, o));
  const outline = (pts, o = {}) => A.frames({ nodes: pts, bars: pts.map((_, i) => [i, (i + 1) % pts.length]) }, o);
  const curve = (f, n, x0, x1) => Array.from({ length: n + 1 }, (_, i) => { const x = x0 + (x1 - x0) * i / n; return [x, f(x)]; });
  const chain = pts => ({ nodes: pts, bars: pts.slice(1).map((_, i) => [i, i + 1]) });
  const under = (g, o = {}) => A.frames({ nodes: g.nodes, bars: [...g.beams, ...g.bars] }, Object.assign({ sup: g.sup, col: 3, link: g.deck }, o));
  const merge = (...gs) => {
    const nodes = [], bars = [];
    for (const g of gs) { const o = nodes.length; nodes.push(...g.nodes); bars.push(...g.bars.map(([i, j]) => [i + o, j + o])); }
    return { nodes, bars };
  };
  const slab = (W, D, t, o = {}) => {
    const s = [];
    const box = (x0, y0, z0, x1, y1, z1, c) => {
      const P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([i, j]) => s.push([...P[i], ...P[j], c]));
    };
    box(0, 0, 0, W, D, t, 'a');
    if (o.fill) s.unshift({ poly: [[0, 0, Math.max(0, t)], [W, 0, Math.max(0, t)], [W, D, Math.max(0, t)], [0, D, Math.max(0, t)]], cls: 'f' });
    (o.boxes || []).forEach(b => box(...b, 't'));
    return s;
  };

  // ------------------------------------------------------------------ dessins
  const D = {};
  // Poutres
  D['poutre-iso'] = beam([0, 8]);
  D['poutre-continue'] = beam([0, 6, 12, 18]);
  D['console'] = A.frames({ nodes: [[-3, 0], [0, 0], [7, 0]], bars: [[0, 1], [1, 2]] }, { sup: [0, 1], col: 3, sp: 2.6 });
  D['gerber'] = A.frames({ nodes: [[0, 0], [7.2, 0], [7.8, 0], [11.2, 0], [11.8, 0], [19, 0], [6, 0], [13, 0]], bars: [[0, 1], [2, 3], [4, 5]] }, { sup: [0, 6, 7, 5], col: 3, sp: 2.6 });
  D['inertie-variable'] = outline([[0, 0], [12, 0], [12, 0.7], [6, 1.6], [0, 0.7]], { sup: [0, 1], col: 4, sp: 3.4, link: [3] });
  // Treillis
  // h ≠ panneau : sinon, en isométrie, les diagonales montantes s'alignent sur les lignes de profondeur
  D['pratt'] = tr('pratt', 16, 2.8, 8);
  D['howe'] = tr('howe', 16, 2.8, 8);
  D['warren'] = tr('warren', 16, 2, 6);
  D['warren-montants'] = tr('warrenV', 16, 2.8, 8);
  D['treillis-k'] = tr('k', 16, 2.6, 6);
  D['treillis-croix'] = tr('croix', 16, 2, 6);
  D['vierendeel'] = tr('vierendeel', 16, 2.4, 5);
  D['fink'] = tr('fink', 14, 3.6);
  D['ferme-triangulee'] = tr('triangle', 14, 3.6, 6);
  D['trapezoidale'] = tr('trapeze', 16, 2.8, 8);
  D['bowstring'] = tr('bowstring', 16, 2.6, 8, { link: [] });
  D['lenticulaire'] = tr('lenticulaire', 16, 2.6, 8, { link: [] });
  D['ciseaux'] = tr('ciseaux', 14, 3.8);
  D['treillis-spatial'] = (() => {
    // nappe de treillis : maillage supérieur, maillage inférieur décalé d'une demi-maille, diagonales en pyramides,
    // le tout porté par des poteaux en rive (dessin au trait, comme les planches classiques).
    // La nappe est tournée en plan : en isométrie pure, les arêtes des pyramides s'aligneraient sur le maillage.
    const s = [], n = 7, m = 5, a = 2, b = 2, d = 1.5, H = 3.2, th = -0.3;
    const cx = n * a / 2, cy = m * b / 2, co = Math.cos(th), si = Math.sin(th);
    const R = (x, y, z) => [cx + (x - cx) * co - (y - cy) * si, cy + (x - cx) * si + (y - cy) * co, z];
    const L = (p, q, c) => s.push([...R(...p), ...R(...q), c]);
    for (let i = 0; i <= n; i++) L([i * a, 0, 0], [i * a, m * b, 0], i === 0 || i === n ? 'a' : 'n');
    for (let j = 0; j <= m; j++) L([0, j * b, 0], [n * a, j * b, 0], j === 0 || j === m ? 'a' : 'n');
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      const c = [(i + 0.5) * a, (j + 0.5) * b, -d];
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([di, dj]) => L([(i + di) * a, (j + dj) * b, 0], c, 'n'));
      if (i < n - 1) L(c, [c[0] + a, c[1], c[2]], 'n');
      if (j < m - 1) L(c, [c[0], c[1] + b, c[2]], 'n');
    }
    // poteaux sous les nœuds de rive de la nappe supérieure
    const rive = [[0, 0], [n, 0], [0, m], [n, m], [Math.round(n / 2), 0], [Math.round(n / 2), m], [0, Math.round(m / 2)], [n, Math.round(m / 2)]];
    rive.forEach(([i, j]) => L([i * a, j * b, 0], [i * a, j * b, -H], 'a'));
    return A.toSvg(s);
  })();
  // Sous-tendues
  D['st-1'] = under(U.bracons(12, 1.6, 1));
  D['st-2'] = under(U.bracons(14, 1.6, 2));
  D['st-multi'] = under(U.bracons(16, 2, 5));
  D['polonceau'] = (() => { const g = U.polonceau(14, 4); return A.frames({ nodes: g.nodes, bars: [...g.beams, ...g.bars] }, { sup: g.sup, col: 3, link: [2] }); })();
  D['arc-sous-tendu'] = under(U.arc(18, 2.4, 8), { link: [] });
  D['beam-string'] = under(U.bss(18, 1.6, 1.8, 8), { link: [] });
  // Dalles et planchers — flèche corail : sens de portée (double flèche posée sur la face supérieure)
  const span = (x0, y0, x1, y1, z) => {
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, k = Math.min(0.9, L * 0.12);
    const head = (px, py, sx) => [[px, py, z, px - sx * ux * k - uy * k * 0.6, py - sx * uy * k + ux * k * 0.6, z, 'c'], [px, py, z, px - sx * ux * k + uy * k * 0.6, py - sx * uy * k - ux * k * 0.6, z, 'c']];
    return [[x0, y0, z, x1, y1, z, 'c'], ...head(x1, y1, 1), ...head(x0, y0, -1)];
  };
  D['dalle-1d'] = A.toSvg([...slab(10, 7, 0.3, { fill: true }), ...[0, 10].flatMap(x => slab(0.3, 7, -3).map(s => [s[0] + x - 0.15, s[1], s[2], s[3] + x - 0.15, s[4], s[5], 't'])), ...span(1, 3.5, 9, 3.5, 0.3)]);
  D['dalle-2d'] = A.toSvg([...slab(9, 9, 0.25, { fill: true }), ...[[0, 0, 0, 9, 0.3, -0.6], [0, 8.7, 0, 9, 9, -0.6], [0, 0, 0, 0.3, 9, -0.6], [8.7, 0, 0, 9, 9, -0.6]].flatMap(b => slab(0.01, 0.01, 0, { boxes: [b] }).slice(12)), ...A.posts([[0.15, 0.15, -0.6], [8.85, 0.15, -0.6], [0.15, 8.85, -0.6], [8.85, 8.85, -0.6]], 3, 't'), ...span(1, 4.5, 8, 4.5, 0.25), ...span(4.5, 1, 4.5, 8, 0.25)]);
  D['plancher-dalle'] = A.toSvg([...slab(14, 10, 0.3, { fill: true }), ...A.posts([2, 7, 12].flatMap(x => [2, 8].map(y => [x, y, 0])), 3.2, 'a'), ...span(2.5, 5, 11.5, 5, 0.3), ...span(7, 2.5, 7, 7.5, 0.3)]);
  D['nervure'] = A.toSvg([...slab(12, 9, 0.12, { fill: true }), ...[1.5, 3, 4.5, 6, 7.5, 9, 10.5].flatMap(x => slab(0.01, 0.01, 0, { boxes: [[x - 0.12, 0, 0, x + 0.12, 9, -0.6]] }).slice(12)), ...span(6, 1, 6, 8, 0.12)]);
  D['mixte'] = (() => {
    const s = [...slab(12, 8, 0.15, { fill: true })];
    for (let x = 0; x < 12; x += 0.8) s.push([x, 0, 0, x + 0.4, 0, -0.25, 't'], [x + 0.4, 0, -0.25, x + 0.8, 0, 0, 't']);
    [0.8, 7.2].forEach(y => s.push([0, y, -0.25, 12, y, -0.25, 'a'], [0, y, -0.9, 12, y, -0.9, 't'], [0, y, -0.25, 0, y, -0.9, 'a']));
    // la dalle porte d'une poutre à l'autre
    return A.toSvg([...s, ...span(6, 1.2, 6, 6.8, 0.15)]);
  })();
  // solives bois + dalle de compression béton (connecteurs)
  D['bois-beton'] = (() => {
    const s = [...slab(10, 6, 0.1, { fill: true })];
    for (let x = 0.4; x < 10; x += 1.2) s.push(...slab(0.01, 0.01, 0, { boxes: [[x - 0.1, 0, 0, x + 0.1, 6, -0.45]] }).slice(12));
    for (let x = 0.4; x < 10; x += 1.2) for (let y = 0.6; y < 6; y += 1.2) s.push([x, y, 0, x, y, 0.1, 't']);
    return A.toSvg([...s, ...span(5.2, 0.6, 5.2, 5.4, 0.1)]);
  })();
  // caisson CLT : panneau supérieur + nervures (+ panneau inférieur)
  D['clt-nervure'] = (() => {
    const s = [...slab(10, 6, 0.12, { fill: true })];
    for (let x = 0.6; x < 10; x += 1.6) s.push(...slab(0.01, 0.01, 0, { boxes: [[x - 0.1, 0, 0, x + 0.1, 6, -0.55]] }).slice(12));
    s.push([0, 0, -0.55, 10, 0, -0.55, 't'], [0, 0, -0.6, 10, 0, -0.6, 't']);
    return A.toSvg([...s, ...span(5, 0.6, 5, 5.4, 0.12)]);
  })();
  // dalles alvéolaires posées côte à côte, alvéoles visibles en about
  D['alveolaire'] = (() => {
    const s = [], w = 1.2, t = 0.32, len = 6;
    for (let k = 0; k < 4; k++) {
      const x0 = k * (w + 0.04);
      s.push(...slab(w, len, t).map(e => [e[0] + x0, e[1], e[2], e[3] + x0, e[4], e[5], k ? 't' : 'a']));
      for (let i = 0; i < 4; i++) s.push(...A.poly(Array.from({ length: 13 }, (_, j) => [x0 + 0.18 + i * 0.28 + 0.1 * Math.cos(2 * PI * j / 12), 0, t / 2 + 0.1 * Math.sin(2 * PI * j / 12)]), 'a'));
    }
    s.push(...[[0, 0.3], [4 * (w + 0.04), 0.3]].flatMap(([x]) => [[x, len * 0.15, 0, x, len * 0.15, -1.2, 't'], [x, len * 0.85, 0, x, len * 0.85, -1.2, 't']]));
    return A.toSvg([...s, ...span(1.9, 0.6, 1.9, 5.4, t)]);
  })();
  // panneau CLT : couches croisées visibles sur la tranche
  D['clt'] = (() => {
    const s = [], W = 5, Dp = 3.2, e = 0.12;
    for (let k = 0; k <= 5; k++) s.push([0, 0, k * e, W, 0, k * e, k === 0 || k === 5 ? 'a' : 't'], [W, 0, k * e, W, Dp, k * e, k === 0 || k === 5 ? 'a' : 't']);
    s.push([0, 0, 5 * e, 0, Dp, 5 * e, 'a'], [0, Dp, 5 * e, W, Dp, 5 * e, 'a'], [0, 0, 0, 0, 0, 5 * e, 'a'], [W, 0, 0, W, 0, 5 * e, 'a'], [W, Dp, 0, W, Dp, 5 * e, 'a']);
    // lamelles perpendiculaires (couches 2 et 4) vues en bout sur la face avant
    for (let x = 0.25; x < W; x += 0.25) [1, 3].forEach(k => s.push([x, 0, k * e, x, 0, (k + 1) * e, 't']));
    // lamelles longitudinales (couches 1, 3, 5) vues en bout sur la face latérale
    for (let y = 0.25; y < Dp; y += 0.25) [0, 2, 4].forEach(k => s.push([W, y, k * e, W, y, (k + 1) * e, 't']));
    for (let y = 0.4; y < Dp; y += 0.4) s.push([0, y, 5 * e, W, y, 5 * e, 't']);
    // sens principal (couches extérieures), portée secondaire plus faible
    return A.toSvg([...s, ...span(0.4, 1.6, 4.6, 1.6, 5 * e), ...span(2.5, 0.5, 2.5, 2.7, 5 * e).map(x => [...x.slice(0, 6), 'c2'])]);
  })();
  D['grille-poutres'] = (() => {
    const s = [];
    for (let i = 0; i <= 5; i++) s.push([i * 2.4, 0, 0, i * 2.4, 9.6, 0, i === 0 ? 'a' : 't'], [i * 2.4, 0, -0.5, i * 2.4, 9.6, -0.5, 't']);
    for (let j = 0; j <= 4; j++) s.push([0, j * 2.4, 0, 12, j * 2.4, 0, j === 0 ? 'a' : 't'], [0, j * 2.4, -0.5, 12, j * 2.4, -0.5, 't']);
    s.push(...A.posts([[0, 0, -0.5], [12, 0, -0.5], [0, 9.6, -0.5], [12, 9.6, -0.5]], 3, 'a'));
    return A.toSvg([...s, ...span(1, 4.8, 11, 4.8, 0.05), ...span(6, 1, 6, 8.6, 0.05)]);
  })();
  // Arcs
  const para = (L, f) => x => 4 * f * x * (L - x) / L / L;
  D['arc'] = A.frames(chain(curve(para(18, 6), 16, 0, 18)), { link: [8], sp: 4 });
  D['arc-3art'] = A.frames(chain(curve(para(18, 7), 16, 0, 18)), { link: [8], sp: 4 });
  D['arc-encastre'] = A.frames(chain(curve(x => 6 * Math.sin(PI * x / 20), 16, 0, 20)), { link: [8], sp: 4 });
  D['arc-tirant'] = A.frames(merge(chain(curve(para(18, 4.5), 16, 0, 18)), { nodes: [[0, 0], [18, 0]], bars: [[0, 1]] }), { link: [8], sup: [0, 16], col: 4, sp: 4 });
  D['arc-poteaux'] = A.frames(chain([[0, -4], ...curve(para(16, 4), 14, 0, 16), [16, -4]]), { link: [8], sp: 4 });
  // Structures tendues
  D['cable'] = A.surface((u, v) => [u * 16, v * 12, 5 - 3.2 * 4 * u * (1 - u) + 0.8 * u], {
    nu: 9, nv: 1, noU: false, extra: [...[0, 4, 8, 12].flatMap(y => [[0, y, 5, -1.5, y, 0, 'a'], [16, y, 5.8, 17.5, y, 0, 'a'], [0, y, 5, 0, y, 0, 't'], [16, y, 5.8, 16, y, 0, 't']])]
  });
  // Poutres câbles : poutre-câble convexe (lenticulaire) tendue entre deux mâts haubanés, répétée
  D['poutre-cable'] = A.frames((() => {
    const L = 18, n = 9, z0 = 5, f = 1.5, nodes = [], bars = [];
    const pb = x => 4 * f * x * (L - x) / L / L;
    for (let i = 0; i <= n; i++) { const x = i * L / n; nodes.push([x, z0 + pb(x)]); }
    for (let i = 0; i <= n; i++) { const x = i * L / n; nodes.push([x, z0 - pb(x)]); }
    for (let i = 0; i < n; i++) bars.push([i, i + 1], [n + 1 + i, n + 2 + i]);
    for (let i = 1; i < n; i++) bars.push([i, n + 1 + i]);
    const m = nodes.length;
    nodes.push([0, 0], [L, 0], [-3, 0], [L + 3, 0], [0, z0 + 1.2], [L, z0 + 1.2]);
    bars.push([m, m + 4], [m + 1, m + 5], [m + 4, m + 2], [m + 5, m + 3]);
    return { nodes, bars };
  })(), { sp: 5, count: 4, link: [] });

  /* Roue de vélo : rayons radiaux entre un moyeu central et un anneau périphérique comprimé.
     top(t), bot(t) : hauteur des deux nappes en fonction du rayon relatif t (0 = moyeu, 1 = anneau) */
  const wheel3d = (top, bot) => {
    const s = [], R = 10, r0 = 1.4, n = 20, single = !bot;
    const ring = (t, z, c) => s.push(...A.circle(0, 0, z, r0 + (R - r0) * t, t ? 48 : 14, c));
    ring(1, top(1), 'a'); ring(0, top(0), 'a');
    if (!single) { if (Math.abs(bot(1) - top(1)) > 0.05) ring(1, bot(1), 'a'); if (Math.abs(bot(0) - top(0)) > 0.05) ring(0, bot(0), 'a'); }
    const zMin = Math.min(top(1), single ? top(1) : bot(1));
    for (let i = 0; i < n; i++) {
      const a = 2 * PI * i / n, c = Math.cos(a), sn = Math.sin(a);
      const P = (t, z) => [(r0 + (R - r0) * t) * c, (r0 + (R - r0) * t) * sn, z];
      const ts = [0, 0.25, 0.5, 0.75, 1];
      s.push(...A.poly(ts.map(t => P(t, top(t))), 'n'));
      if (!single) {
        s.push(...A.poly(ts.map(t => P(t, bot(t))), 'n'));
        if (i % 2 === 0) ts.forEach(t => { if (Math.abs(top(t) - bot(t)) > 0.05) s.push([...P(t, top(t)), ...P(t, bot(t)), 'n']); });
      }
      if (i % 4 === 0) s.push([R * c, R * sn, zMin, R * c, R * sn, zMin - 4.5, 'a']);
    }
    return A.toSvg(s);
  };
  const WHEELS = [
    ['Poutres-câbles convexes', 'Deux nappes qui s\'écartent vers le moyeu (double anneau central) et se rejoignent sur l\'anneau extérieur, reliées par des montants.', wheel3d(t => 4.6 + 1.6 * (1 - t), t => 4.6 - 1.6 * (1 - t))],
    ['Poutres-câbles concaves', 'Les nappes se rejoignent au moyeu et s\'écartent vers l\'anneau extérieur, dédoublé en treillis.', wheel3d(t => 4.6 + 1.4 * t, t => 4.6 - 1.4 * t)],
    ['Concave-convexe', 'Les deux nappes se croisent à mi-rayon : moyeu et anneau extérieur sont tous deux dédoublés.', wheel3d(t => 4.6 + 1.2 * (1 - 2 * t), t => 4.6 - 1.2 * (1 - 2 * t))]
  ];
  // vignette : les trois variantes côte à côte
  D['roue'] = WHEELS.map(([, , svg], i) => `<g transform="translate(${i * 66.7} 20) scale(0.333)">${svg}</g>`).join('');
  D['resille'] = A.surface((u, v) => { const a = 2 * u - 1, b = 2 * v - 1; return [u * 14, v * 12, 4 + 2.4 * (a * a - b * b)]; }, {
    nu: 10, nv: 10, extra: [[0, 0, 4, 0, 0, 0, 'a'], [14, 12, 4, 14, 12, 0, 'a'], [0, 12, 4, 0, 12, 0, 'a'], [14, 0, 4, 14, 0, 0, 'a']]
  });
  D['membrane-mats'] = A.surface((u, v) => {
    const a = 2 * PI * v, r = 0.12 + 0.88 * u, edge = 1 - 0.18 * Math.abs(Math.cos(2 * a));
    return [8 + 8 * r * edge * Math.cos(a), 8 + 8 * r * edge * Math.sin(a), 1.2 + 6.2 * Math.pow(1 - u, 1.7)];
  }, { nu: 6, nv: 16, extra: [[8, 8, 0, 8, 8, 7.6, 'a'], ...[0, 0.25, 0.5, 0.75].map(t => { const a = 2 * PI * t + PI / 4; return [8 + 7 * Math.cos(a), 8 + 7 * Math.sin(a), 1.2, 8 + 9 * Math.cos(a), 8 + 9 * Math.sin(a), 0, 't']; })] });
  D['membrane-arcs'] = A.surface((u, v) => {
    const k = Math.abs(Math.sin(2 * PI * v));
    return [u * 14, v * 14, (4.5 - 0.7 * k) * Math.sin(PI * u)];
  }, { nu: 8, nv: 4, steps: 32 });
  D['gonflable'] = A.surface((u, v) => { const a = 2 * u - 1, b = 2 * v - 1; return [u * 16, v * 10, 3.2 * Math.sqrt(Math.max(0, 1 - a * a)) * Math.pow(Math.max(0, 1 - b * b), 0.35)]; }, { nu: 6, nv: 10 });
  D['membrane-4p'] = A.surface((u, v) => { const a = 2 * u - 1, b = 2 * v - 1; return [u * 12, v * 12, 3.5 + 2.2 * a * b]; }, {
    nu: 9, nv: 9, extra: [[0, 0, 5.7, 0, 0, 0, 'a'], [12, 12, 5.7, 12, 12, 0, 'a'], [0, 0, 5.7, -2.5, -1, 0, 't'], [12, 12, 5.7, 14.5, 13, 0, 't']]
  });
  // Portiques
  D['portique-encastre'] = A.frames(chain([[0, 0], [0, 5], [12, 5], [12, 0]]), { link: [1, 2] });
  D['portique-biarticule'] = A.frames(chain([[0, 0], [0, 5], [14, 5], [14, 0]]), { link: [1, 2] });
  D['portique-triarticule'] = A.frames(chain([[0, 0], [0, 5], [8, 8], [16, 5], [16, 0]]), { link: [1, 2, 3] });
  D['portique-versants'] = A.frames(chain([[0, 0], [0, 6], [9, 7.6], [18, 6], [18, 0]]), { link: [1, 2, 3] });
  D['reins-courbes'] = A.frames(chain([[0, 0], [0, 3.6], ...curve(x => 3.6 + 2 * Math.sqrt(Math.max(0, 1 - Math.pow((2 - x) / 2, 2))), 6, 0, 2).slice(1).map(([x, y]) => [x, y]), [8, 7.2], [14, 5.6], ...curve(x => 3.6 + 2 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 14) / 2, 2))), 6, 14, 16).slice(0, -1), [16, 3.6], [16, 0]]), { link: [] });
  // demi-portique étayé : poteau et arbalétrier à rein courbe, extrémité portée par un étai incliné
  D['demi-portique'] = A.frames({
    nodes: [[0, 0], [0, 4.2], [0.5, 5.1], [1.4, 5.6], [12, 7.4], [10.6, 0]],
    bars: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]
  }, { link: [3, 4] });
  D['portique-jambes'] = A.frames({ nodes: [[0, 0], [0, 5], [8, 7], [16, 5], [16, 0], [0, 3], [2.4, 5.6], [16, 3], [13.6, 5.6]], bars: [[0, 1], [1, 2], [2, 3], [3, 4], [5, 6], [7, 8]] }, { link: [1, 2, 3] });
  // Plissées
  D['plisse-v'] = (() => {
    const s = [], n = 8, w = 1.6, Dp = 12;
    const pts = Array.from({ length: n + 1 }, (_, i) => [i * w, 0, i % 2 ? 3.4 : 4.6]);
    s.push(...A.poly(pts, 'a'), ...A.poly(pts.map(([x, , z]) => [x, Dp, z]), 't'));
    pts.forEach(([x, , z]) => s.push([x, 0, z, x, Dp, z, 't']));
    s.push(...A.posts([[0, 0, 4.6], [n * w, 0, 4.6], [0, Dp, 4.6], [n * w, Dp, 4.6]], 4.6, 'a'));
    return A.toSvg(s);
  })();
  D['sheds'] = (() => {
    const s = [], n = 4, w = 3.5, Dp = 12, pts = [];
    for (let i = 0; i < n; i++) pts.push([i * w, 0, 3], [i * w + w, 0, 4.6], [i * w + w, 0, 3]);
    s.push(...A.poly(pts, 'a'), ...A.poly(pts.map(([x, , z]) => [x, Dp, z]), 't'));
    pts.forEach(([x, , z]) => s.push([x, 0, z, x, Dp, z, 't']));
    s.push(...A.posts([[0, 0, 3], [n * w, 0, 3]], 3, 'a'));
    return A.toSvg(s);
  })();
  // Coques
  D['voute'] = A.surface((u, v) => [8 - 8 * Math.cos(PI * u), v * 16, 5 * Math.sin(PI * u)], { nu: 10, nv: 5 });
  D['dome'] = A.surface((u, v) => { const t = u * PI / 2, a = 2 * PI * v; return [8 * Math.sin(t) * Math.cos(a), 8 * Math.sin(t) * Math.sin(a), 6 * Math.cos(t)]; }, { nu: 6, nv: 16, steps: 40 });
  D['isler'] = A.surface((u, v) => { const a = 2 * u - 1, b = 2 * v - 1; return [u * 14, v * 14, 3.4 * (1 - a * a * b * b) * (1 + 0.35 * (1 - a * a) * (1 - b * b))]; }, { nu: 10, nv: 10 });
  // coque pleine : voûte, coupole et coque libre réunies dans la vignette
  D['coque-pleine'] = [D['voute'], D['dome'], D['isler']].map((s, i) => `<g transform="translate(${i * 66.7} 20) scale(0.333)">${s}</g>`).join('');
  // Coupole nervurée type Palazzetto dello Sport : calotte surbaissée, nervures croisées en losanges,
  // couronne portée par des béquilles inclinées en Y
  D['coque-nervuree'] = (() => {
    const s = [], R = 9, H = 3.2, n = 24;
    const P = (r, a) => { const z = H * (1 - (r / R) ** 2); return [r * Math.cos(a), r * Math.sin(a), z + 1.6]; };
    s.push(...A.circle(0, 0, 1.6, R, 48, 'a'));
    // nervures en spirale dans les deux sens (losanges)
    for (let i = 0; i < n; i++) for (const sg of [1, -1]) {
      const pts = [];
      for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(P(R * (1 - t) + 1.2 * t, 2 * PI * i / n + sg * 0.9 * t)); }
      s.push(...A.poly(pts, 't'));
    }
    s.push(...A.circle(0, 0, H + 1.6 - H * (1.2 / R) ** 2, 1.2, 16, 'a'));
    // béquilles en Y
    for (let i = 0; i < n; i++) {
      const a = 2 * PI * (i + 0.5) / n, foot = [1.18 * R * Math.cos(a), 1.18 * R * Math.sin(a), -1.4], knee = [1.08 * R * Math.cos(a), 1.08 * R * Math.sin(a), 0.4];
      s.push([...foot, ...knee, 'a']);
      [-0.5, 0.5].forEach(d => { const b = 2 * PI * (i + 0.5 + d) / n; s.push([...knee, R * Math.cos(b), R * Math.sin(b), 1.6, 'a']); });
    }
    return A.toSvg(s);
  })();
  // Gridshells
  D['gridshell'] = A.surface((u, v) => [u * 18, v * 12, 5 * Math.sin(PI * u) * (0.55 + 0.45 * Math.abs(Math.sin(1.5 * PI * v)))], { nu: 12, nv: 10, steps: 30 });

  // ------------------------------------------------------------------ variantes (dessins en élévation)
  // segments 2D [x1, z1, x2, z2, classe] -> SVG ; appuis triangulaires optionnels
  const el2 = (segs, sups = []) => A.toSvg([...segs.map(([x1, z1, x2, z2, c]) => [x1, 0, z1, x2, 0, z2, c || 'a']),
    ...sups.flatMap(([x, z]) => [[x, 0, z, x - 0.35, 0, z - 0.6, 't'], [x - 0.35, 0, z - 0.6, x + 0.35, 0, z - 0.6, 't'], [x + 0.35, 0, z - 0.6, x, 0, z, 't']])]);
  const polyl = (pts, c = 'a') => pts.slice(1).map((p, i) => [...pts[i], ...p, c]);
  const closed = pts => polyl([...pts, pts[0]]);
  const fn = (f, x0, x1, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const x = x0 + (x1 - x0) * i / n; return [x, f(x)]; });
  const V = {};
  V.inertie = [
    ['Simple décroissance', 'Pente unique, hauteur croissante vers l\'appui haut. h ≈ L/20 à l\'appui bas, H ≈ L/14.', el2(closed([[0, 0], [12, 0], [12, 1.5], [0, 0.7]]), [[0, 0], [12, 0]])],
    ['Double décroissance', 'Hauteur maximale au faîtage, suit le diagramme des moments. Pente 1,4 à 6° ; h ≈ L/20, H ≈ L/14.', el2(closed([[0, 0], [12, 0], [12, 0.7], [6, 1.6], [0, 0.7]]), [[0, 0], [12, 0]])],
    ['Poutre « banane »', 'Double décroissance à sous-face cintrée. Pente 3 à 15° ; h ≈ L/30, H ≈ L/16. Traction transversale au fil à renforcer.', el2(closed([...fn(x => 1.1 * Math.sin(PI * x / 12), 0, 12), ...fn(x => 0.6 + 1.1 * Math.sin(PI * x / 12) + 0.55 * (1 - Math.abs(2 * x / 12 - 1)), 12, 0)]), [[0, 0], [12, 0]])],
    ['Poutre courbe', 'Section constante cintrée : volume dégagé, appui glissant indispensable (sinon c\'est un arc).', el2(closed([...fn(x => 1.4 * Math.sin(PI * x / 12), 0, 12), ...fn(x => 0.8 + 1.4 * Math.sin(PI * x / 12), 12, 0)]), [[0, 0], [12, 0]])],
    ['Continue à goussets', 'Hauteur augmentée sur les appuis intermédiaires où le moment négatif est maximal. h ≈ L/18, H ≈ L/14.', el2(closed([[0, 0], [10, 0], [11, -0.5], [13, -0.5], [14, 0], [24, 0], [24, 0.8], [0, 0.8]]), [[0, 0], [12, -0.5], [24, 0]])],
    ['Ventre de poisson', 'Sous-face convexe vers le bas, dessus droit : le profil suit les moments sans traction transversale au fil.', el2(closed([[0, 0.6], [12, 0.6], ...fn(x => -0.8 * Math.sin(PI * x / 12), 12, 0)]), [[0, 0], [12, 0]])],
    ['Console à inertie variable', 'Hauteur maximale à l\'encastrement, réduite en bout : h ≈ L/7 à l\'appui.', el2([...closed([[0, 0], [9, 0.7], [9, 1], [0, 1.6]]), [-0.2, -0.6, -0.2, 2.2, 't']])]
  ];
  D['toile'] = D['membrane-mats'];
  V.toile = [
    ['Toile à quatre points', 'Deux points hauts, deux points bas : la selle la plus simple (ombrières, préaux, 8 à 30 m).', D['membrane-4p']],
    ['Toile sur mâts', 'Un ou plusieurs mâts relèvent la toile en cônes, ancrée en périphérie (10 à 60 m).', D['membrane-mats']],
    ['Toile sur arcs', 'La toile est tendue entre des arcs comprimés qui lui donnent sa courbure (10 à 80 m).', D['membrane-arcs']]
  ];
  const cabT = (top, bot, n = 10, L = 12, cross) => {
    const s = [];
    const xs = Array.from({ length: n + 1 }, (_, i) => i * L / n);
    s.push(...polyl(xs.map(x => [x, top(x)])), ...polyl(xs.map(x => [x, bot(x)])));
    xs.slice(1, -1).forEach(x => s.push([x, top(x), x, bot(x), 't']));
    if (cross) xs.slice(0, -1).forEach((x, i) => s.push([x, top(x), xs[i + 1], bot(xs[i + 1]), 't']));
    return el2(s, [[0, Math.min(top(0), bot(0))], [L, Math.min(top(L), bot(L))]]);
  };
  const pb = (L, f) => x => 4 * f * x * (L - x) / L / L;
  // poutres câbles : profils concave, convexe et convexe-concave ; les deux câbles sont reliés par des suspentes
  V.cables = [
    ['Poutre-câble concave', 'Le câble supérieur pend, le câble inférieur est relevé : les deux se rapprochent au centre, reliés par des suspentes tendues. Hauteur maximale aux appuis.', cabT(x => 1.6 - pb(12, 1.3)(x), x => -1.6 + pb(12, 1.3)(x))],
    ['Poutre-câble convexe', 'Câble porteur en chaînette sous un câble stabilisateur en arc (forme lenticulaire) : les montants sont comprimés.', cabT(x => pb(12, 1.5)(x), x => -pb(12, 1.5)(x))],
    ['Poutre-câble convexe-concave', 'Les câbles se croisent près des appuis : partie centrale convexe, extrémités concaves.', cabT(x => { const u = 2 * x / 12 - 1; return 1.6 * (0.5 - u * u); }, x => { const u = 2 * x / 12 - 1; return -1.6 * (0.5 - u * u); }, 12)]
  ];
  V.roue = WHEELS;

  // ------------------------------------------------------------------ familles
  S.TYPO_FAMILIES = [
    ['poutres', 'Poutres', 'Éléments droits ou à inertie variable travaillant en flexion : le moment est repris par un couple compression / traction dans la hauteur de la section.'],
    ['treillis', 'Poutres treillis', 'La matière est concentrée dans deux membrures reliées par des barres formant des triangles : la flexion devient traction et compression pures.'],
    ['soustendues', 'Poutres sous-tendues', 'Une poutre comprimée et un tirant tendu, séparés par des bracons : la hauteur structurelle est créée sous la poutre, avec très peu de matière.'],
    ['portiques', 'Portiques', 'Cadres poteaux-traverses à nœuds rigides : la continuité aux angles répartit la flexion et stabilise vis-à-vis des actions horizontales.'],
    ['planchers', 'Dalles & planchers', 'Éléments surfaciques horizontaux qui portent dans une ou deux directions et servent aussi de diaphragme.'],
    ['arcs', 'Arcs', 'Éléments courbes comprimés qui suivent le funiculaire des charges ; la poussée aux appuis est le prix de leur efficacité.'],
    ['tendues', 'Structures tendues', 'Câbles et membranes ne travaillent qu\'en traction : formes funiculaires, extrême légèreté, mais ancrages et prétension indispensables.'],
    ['plissees', 'Structures plissées', 'Des plaques minces pliées gagnent une grande hauteur statique : la rigidité vient de la forme, pas de l\'épaisseur.'],
    ['coques', 'Coques et gridshells', 'Surfaces courbes minces, pleines, nervurées ou ajourées, qui portent par efforts de membrane : la double courbure leur donne une rigidité exceptionnelle.']
  ];
  S.TYPO_MATS = { bois: 'Bois', acier: 'Acier', beton: 'Béton', textile: 'Textile / câbles' };

  const T_ = (id, fam, name, mats, rows, principle, pros, cons, examples, extra) =>
    Object.assign({ id, fam, name, mats, rows, principle, pros, cons, examples, svg: D[id] || '' }, extra || {});

  S.TYPOLOGIES = [
    // ================================================================ Poutres
    T_('poutre-iso', 'poutres', 'Poutre sur deux appuis', ['bois', 'acier', 'beton'], [
      ['bois', 'Bois massif', [2, 6], 'L/17 – L/20'], ['bois', 'Lamellé-collé droit', [5, 24], 'L/14'],
      ['acier', 'Profilé laminé (IPE, HEA)', [4, 15], 'L/20 – L/25'], ['acier', 'PRS, poutre alvéolaire', [10, 30], 'L/15 – L/25'],
      ['beton', 'Béton armé', [4, 10], 'L/10 – L/12'], ['beton', 'Béton précontraint', [10, 40], 'L/18 – L/25']],
      'Poutre posée sur deux appuis, en flexion simple. Le moment maximal qL²/8 est à mi-portée, l\'effort tranchant maximal sur appuis. Isostatique : les efforts ne dépendent que de l\'équilibre.',
      ['Calcul simple et robuste', 'Insensible aux tassements et aux dilatations', 'Préfabrication et montage faciles'],
      ['Moment et flèche maximaux élevés', 'Aucune redondance'],
      ['Solives, pannes, linteaux', 'Poutres de pont préfabriquées'], { preset: 'isostatique' }),
    T_('poutre-continue', 'poutres', 'Poutre continue', ['bois', 'acier', 'beton'], [
      ['bois', 'Lamellé-collé continu', [5, 25], 'L/14'], ['bois', 'Continue à goussets', [5, 25], 'h ≈ L/18, H ≈ L/14 sur appui'],
      ['acier', 'Profilé laminé', [5, 20], 'L/25 – L/30'], ['beton', 'Béton armé', [5, 12], 'L/12 – L/16']],
      'Poutre franchissant plusieurs travées sans interruption. La continuité crée des moments négatifs sur appuis qui réduisent ceux des travées (≈ qL²/10 au lieu de qL²/8) et divisent les flèches.',
      ['Moments et flèches réduits', 'Redondance', 'Économie de matière'],
      ['Sensible aux tassements différentiels', 'Moments négatifs sur appuis (fibres supérieures tendues)'],
      ['Planchers béton coulés en place', 'Pannes continues', 'Ponts à poutres'], { preset: 'continue' }),
    T_('console', 'poutres', 'Console (porte-à-faux)', ['bois', 'acier', 'beton'], [
      ['bois', 'Lamellé-collé en porte-à-faux', [2, 12], 'L/7 (h à l\'appui)'], ['acier', 'Profilé', [1, 10], 'L/8 – L/10'], ['beton', 'Béton armé', [1, 8], 'L/5 – L/8']],
      'Poutre encastrée (ou prolongée au-delà d\'un appui) et libre à l\'autre extrémité. Le moment négatif qL²/2 est maximal à l\'encastrement ; l\'ancrage doit l\'équilibrer.',
      ['Libère l\'espace sous l\'ouvrage', 'Effet architectural fort'],
      ['Moment et flèche 4 fois plus grands qu\'une poutre sur deux appuis de même longueur', 'Sensible aux vibrations'],
      ['Balcons, auvents', 'Tribunes', 'Maison sur la cascade (F. L. Wright, 1939)'], { preset: 'console' }),
    T_('gerber', 'poutres', 'Poutre Gerber', ['bois', 'acier', 'beton'], [
      ['bois', 'Pannes lamellé-collé', [5, 25], 'L/16 – L/18'], ['acier', 'Pannes, poutres', [6, 30], 'L/25 – L/30'], ['beton', 'Ponts', [30, 300], 'L/15 – L/20']],
      'Poutre continue rendue isostatique par des articulations placées près des points de moment nul : des consoles portent des travées suspendues.',
      ['Isostatique : insensible aux tassements', 'Moments répartis comme une poutre continue', 'Tronçons transportables'],
      ['Articulations délicates', 'Flèche concentrée aux articulations'],
      ['Pont du Forth (1890)', 'Pannes Gerber de halles'], { preset: 'gerber' }),

    T_('inertie-variable', 'poutres', 'Poutre à inertie variable', ['bois', 'acier', 'beton'], [
      ['bois', 'Double décroissance, pente 1,4 à 6°', [10, 25], 'h ≈ L/20, H ≈ L/14'], ['bois', 'Poutre banane, pente 3 à 15°', [10, 20], 'h ≈ L/30, H ≈ L/16'],
      ['acier', 'PRS à hauteur variable', [15, 40], 'H ≈ L/20 – L/25'], ['beton', 'Poutre précontrainte à double pente', [10, 35], 'H ≈ L/15 – L/20']],
      'La hauteur de la section suit le diagramme des moments : on place la matière là où la flexion est forte. La forme donne souvent en même temps la pente de toiture. En bois, la pente du bord incliné est limitée (≈ 10° côté comprimé, 2 à 3° côté tendu) et la contrainte maximale n\'est pas au faîtage mais plus près des appuis.',
      ['Économie de matière', 'Pente de toiture intégrée', 'Volume intérieur dégagé (formes courbes)'],
      ['Fabrication plus complexe', 'Traction transversale au fil dans les parties courbes (bois)'],
      ['Halles de sport et de stockage en lamellé-collé', 'Poutres préfabriquées de bâtiments industriels'], { variants: V.inertie }),

    // ================================================================ Poutres treillis
    T_('pratt', 'treillis', 'Treillis Pratt', ['acier', 'bois'], [
      ['acier', 'Membrures parallèles', [8, 100], 'L/10 – L/23'], ['bois', 'Lamellé-collé, membrures parallèles', [25, 85], 'L/12']],
      'Montants comprimés et diagonales tendues, inclinées vers le centre. Les barres longues (diagonales) travaillent en traction : pas de flambement.',
      ['Diagonales tendues : barres fines possibles (ronds, câbles)', 'Montants courts comprimés'],
      ['Assemblages tendus plus délicats en bois'],
      ['Ponts ferroviaires', 'Halles industrielles'], { preset: 'pratt' }),
    T_('howe', 'treillis', 'Treillis Howe', ['bois', 'acier'], [
      ['bois', 'Lamellé-collé, membrures parallèles', [25, 85], 'L/12'], ['acier', 'Membrures parallèles', [8, 80], 'L/10 – L/23']],
      'Inverse du Pratt : diagonales comprimées (inclinées vers les appuis), montants tendus. Historiquement utilisé en bois car les diagonales s\'assemblent simplement par contact.',
      ['Assemblages par contact (bois)', 'Montants tendus en acier possibles'],
      ['Diagonales longues comprimées : risque de flambement'],
      ['Ponts couverts en bois', 'Charpentes'], { preset: 'howe' }),
    T_('warren', 'treillis', 'Treillis Warren', ['acier', 'bois'], [
      ['acier', 'Tubes ou cornières', [8, 80], 'L/10 – L/23'], ['bois', 'Lamellé-collé', [25, 60], 'L/12']],
      'Diagonales alternées formant des triangles isocèles, sans montants : chaque diagonale travaille alternativement en traction et en compression.',
      ['Peu de barres, nœuds répétitifs', 'Aspect régulier et léger'],
      ['Membrure fléchie si les charges ne sont pas aux nœuds'],
      ['Passerelles', 'Poutres de toiture'], { preset: 'warren' }),
    T_('warren-montants', 'treillis', 'Warren à montants', ['acier', 'bois'], [
      ['acier', 'Membrures parallèles', [8, 80], 'L/10 – L/23'], ['bois', 'Lamellé-collé', [25, 60], 'L/12']],
      'Treillis Warren complété par des montants qui recoupent la membrure chargée : les pannes peuvent être posées à chaque nœud.',
      ['Membrure supérieure moins fléchie', 'Pas de pannes plus serré'],
      ['Plus de barres et d\'assemblages'],
      ['Ponts métalliques', 'Toitures de halls'], { preset: 'warren-montants' }),
    T_('treillis-k', 'treillis', 'Treillis en K', ['acier'], [['acier', 'Grandes hauteurs', [30, 150], 'L/8 – L/12']],
      'Chaque panneau est divisé en deux par un nœud à mi-hauteur des montants : les diagonales sont deux fois plus courtes, ce qui permet de grandes hauteurs sans flambement.',
      ['Barres comprimées courtes', 'Adapté aux poutres très hautes'],
      ['Nombreux nœuds'],
      ['Grands ponts ferroviaires', 'Poutres de transfert'], { preset: 'treillis-k' }),
    T_('treillis-croix', 'treillis', 'Treillis en croix de Saint-André', ['acier', 'bois'], [['acier', 'Diagonales en ronds ou câbles', [15, 60], 'L/10 – L/15'], ['bois', 'Diagonales croisées', [15, 40], 'L/10 – L/12']],
      'Deux diagonales croisées par panneau. Avec des diagonales fines, seule la diagonale tendue travaille : système efficace et redondant.',
      ['Diagonales tendues très fines', 'Fonctionne dans les deux sens de chargement'],
      ['Hyperstatique', 'Croisement des barres à traiter'],
      ['Ponts en treillis à mailles serrées'], { preset: 'treillis-croix' }),
    T_('vierendeel', 'treillis', 'Poutre Vierendeel', ['acier', 'beton'], [['acier', 'Profilés, nœuds rigides', [10, 40], 'L/8 – L/10'], ['beton', 'Poutre-étage', [10, 30], 'L/6 – L/8']],
      'Membrures parallèles et montants encastrés, sans diagonales. Chaque panneau fonctionne comme un petit portique : l\'effort tranchant est repris par la flexion des barres.',
      ['Ouvertures libres (baies, circulations)', 'Expression épurée'],
      ['Beaucoup moins efficace qu\'un treillis triangulé', 'Nœuds rigides coûteux'],
      ['Poutres-étages', 'Ponts d\'A. Vierendeel (Belgique)'], { preset: 'vierendeel' }),
    T_('fink', 'treillis', 'Ferme triangulée en W (Fink)', ['bois', 'acier'], [['bois', 'Bois massif ou lamellé-collé', [8, 30], 'h ≈ L/4 – L/6'], ['acier', 'Cornières, tubes', [10, 35], 'h ≈ L/4 – L/6']],
      'Ferme triangulaire dont les arbalétriers sont recoupés par des barres en W. Les efforts dans les barres de treillis restent faibles ; la membrure inférieure tendue et les arbalétriers comprimés sont très sollicités près des appuis.',
      ['Barres de treillis peu sollicitées', 'Fermettes industrialisées'],
      ['Grande hauteur au faîtage'],
      ['Charpentes de maisons (fermettes)', 'Hangars'], { preset: 'fink' }),
    T_('ferme-triangulee', 'treillis', 'Ferme triangulaire à montants', ['bois', 'acier'], [['bois', 'Lamellé-collé', [10, 35], 'h ≈ L/6'], ['acier', 'Profilés', [10, 40], 'h ≈ L/5 – L/7']],
      'Ferme à deux pentes recoupée par des montants et des diagonales. Sa forme suit approximativement le diagramme des moments d\'une charge uniforme.',
      ['Forme adaptée aux toitures à pentes', 'Efforts de treillis modérés'],
      ['Volume de comble important'],
      ['Charpentes de halles et de granges'], { preset: 'ferme-triangulee' }),
    T_('trapezoidale', 'treillis', 'Ferme trapézoïdale', ['bois', 'acier'], [['bois', 'Lamellé-collé', [25, 60], 'H ≈ L/8 au faîtage'], ['acier', 'Profilés', [20, 60], 'L/10 – L/12']],
      'Membrure supérieure à faible pente, inférieure horizontale. Les diagonales proches des appuis sont les plus sollicitées.',
      ['Toiture à faible pente', 'Hauteur modérée'],
      ['Diagonales d\'about fortement chargées : assemblages délicats'],
      ['Toitures de grandes salles'], { preset: 'trapezoidale' }),
    T_('bowstring', 'treillis', 'Poutre bow-string', ['bois', 'acier'], [['bois', 'Lamellé-collé courbe', [30, 80], 'H ≈ L/7 – L/8'], ['acier', 'Membrure cintrée', [30, 100], 'H ≈ L/7 – L/10']],
      'Membrure supérieure en arc parabolique, membrure inférieure droite formant tirant. Sous charge uniforme, les membrures reprennent presque tout et les barres de treillis sont à peine sollicitées.',
      ['Très économique au-delà de 60-70 m en bois', 'Assemblages de treillis simples'],
      ['Grande hauteur au centre', 'Sensible aux charges dissymétriques'],
      ['Halles de stockage', 'Hangars d\'aviation'], { preset: 'bowstring' }),
    T_('lenticulaire', 'treillis', 'Poutre lenticulaire', ['bois', 'acier'], [['bois', 'Lamellé-collé', [30, 80], 'H ≈ L/8'], ['acier', 'Profilés cintrés', [40, 150], 'H ≈ L/8 – L/10']],
      'Deux membrures courbes symétriques, l\'une en arc (comprimée), l\'autre en chaînette (tendue) : la poutre combine arc et câble sans poussée sur les appuis.',
      ['Pas de poussée', 'Membrures quasi uniformément sollicitées'],
      ['Encombrement en hauteur des deux côtés'],
      ['Pont de Saltash (I. K. Brunel, 1859)'], { preset: 'lenticulaire' }),
    T_('ciseaux', 'treillis', 'Ferme à entrait retroussé', ['bois', 'acier'], [['bois', 'Lamellé-collé', [8, 25], 'h ≈ L/5'], ['acier', 'Profilés', [10, 30], 'h ≈ L/5']],
      'La membrure inférieure est relevée vers le centre (ferme « ciseaux ») pour libérer du volume sous la charpente.',
      ['Volume intérieur dégagé', 'Effet architectural'],
      ['Efforts plus importants qu\'une ferme à entrait horizontal', 'Poussée si l\'entrait est trop relevé'],
      ['Églises, salles avec plafond rampant'], { preset: 'ciseaux' }),
    T_('treillis-spatial', 'treillis', 'Treillis spatial (grille tridimensionnelle)', ['acier', 'bois'], [['acier', 'Systèmes à nœuds (type MERO)', [20, 100], 'L/20 – L/30'], ['bois', 'Lamellé-collé et nœuds acier', [20, 60], 'L/15 – L/20']],
      'Deux nappes de barres reliées par des diagonales formant des pyramides : le treillis porte dans deux directions comme une plaque.',
      ['Portée bidirectionnelle', 'Composants standardisés', 'Redondance'],
      ['Nombreux nœuds coûteux'],
      ['Halls d\'exposition, terminaux d\'aéroport']),

    // ================================================================ Poutres sous-tendues
    T_('st-1', 'soustendues', 'Sous-tendue à un bracon (poinçon)', ['bois', 'acier'], [['bois', 'Lamellé-collé + tirant acier', [10, 50], 'h ≈ L/33 (poutre), H ≈ L/12 (total)'], ['acier', 'Profilé + tirant', [10, 40], 'H ≈ L/10 – L/15']],
      'Un bracon central comprimé s\'appuie sur un tirant ancré aux extrémités : il crée un appui élastique à mi-portée. La poutre devient continue sur deux travées, comprimée par le tirant.',
      ['Grande légèreté', 'Renforce aussi des poutres existantes'],
      ['Hauteur totale importante', 'Inversion des efforts sous soulèvement (vent)'],
      ['Verrières, passerelles', 'Renforcement de planchers bois'], { preset: 'st-1' }),
    T_('st-2', 'soustendues', 'Sous-tendue à deux bracons', ['bois', 'acier'], [['bois', 'Lamellé-collé + tirant acier', [15, 50], 'h ≈ L/33, H ≈ L/12'], ['acier', 'Profilé + tirant', [15, 45], 'H ≈ L/10 – L/15']],
      'Deux bracons et un tirant trapézoïdal : la poutre repose sur deux appuis élastiques. Sensible aux charges dissymétriques, que la poutre doit reprendre en flexion.',
      ['Tiers de portée libéré au centre', 'Portées plus grandes qu\'avec un bracon'],
      ['Mécanisme si la poutre est trop souple sous charge dissymétrique'],
      ['Toitures de halls, préaux'], { preset: 'st-2' }),
    T_('st-multi', 'soustendues', 'Sous-tendue en ventre de poisson', ['acier', 'bois'], [['acier', 'Plusieurs bracons, tirant polygonal', [20, 60], 'H ≈ L/10 – L/12'], ['bois', 'Lamellé-collé', [20, 50], 'H ≈ L/12']],
      'Les pieds des bracons suivent une parabole : le tirant prend la forme funiculaire de la charge et chaque bracon apporte un appui élastique.',
      ['Tirant funiculaire : efforts réguliers', 'Grande finesse visuelle'],
      ['Nombreux nœuds sur le tirant'],
      ['Verrières de gares', 'Toitures légères'], { preset: 'st-multi' }),
    T_('polonceau', 'soustendues', 'Ferme Polonceau', ['acier', 'bois'], [['acier', 'Arbalétriers profilés, tirants ronds', [12, 40], 'h ≈ L/4 – L/5 (pente)'], ['bois', 'Arbalétriers bois, tirants acier', [10, 30], 'h ≈ L/4']],
      'Chaque arbalétrier est sous-tendu par une bielle et des tirants ; un entrait relevé relie les deux pieds de bielles. Inventée au XIXᵉ siècle pour les grandes halles.',
      ['Arbalétriers fins', 'Volume dégagé sous l\'entrait'],
      ['Nombreux tirants à régler'],
      ['Halles et gares du XIXᵉ siècle (gare d\'Austerlitz)'], { preset: 'polonceau' }),
    T_('arc-sous-tendu', 'soustendues', 'Arc sous-tendu à tirant droit', ['acier', 'bois'], [['acier', 'Arc + tirant + montants', [30, 150], 'f ≈ L/10 – L/12 au total'], ['bois', 'Arc lamellé-collé + tirant', [20, 60], 'f ≈ L/10']],
      'Un arc surbaissé rigide est équilibré par un tirant, maintenu par des montants : la poussée est reprise en interne, la flexion de l\'arc est fortement réduite.',
      ['Aucune poussée sur les appuis', 'Grandes portées très légères'],
      ['Sensible aux charges dissymétriques et au soulèvement'],
      ['Couvertures de halls et de salles de sport'], { preset: 'arc-sous-tendu' }),
    T_('beam-string', 'soustendues', 'Structure arc-câble (beam string)', ['acier', 'bois'], [['acier', 'Arc + câble funiculaire + bielles', [30, 150], 'f + s ≈ L/10 – L/12'], ['bois', 'Arc lamellé-collé + câble', [20, 60], 'f + s ≈ L/10']],
      'Un arc surbaissé (ou une poutre) est sous-tendu par un câble dont la membrure inférieure pend en chaînette : le câble suit le funiculaire de la charge, des bielles comprimées le relient à l\'arc. La poussée de l\'arc est équilibrée par la traction du câble, sans réaction horizontale sur les appuis.',
      ['Câble funiculaire : traction uniforme', 'Arc très fin, aucune poussée', 'Grandes portées'],
      ['Prétension et réglage du câble', 'Soulèvement sous vent à vérifier'],
      ['Aérogare 1 de Shanghai-Pudong (P. Andreu, 1999)', 'Structures « beam string » de M. Saitoh au Japon'], { preset: 'beam-string' }),

    // ================================================================ Dalles & planchers
    T_('dalle-1d', 'planchers', 'Dalle portant dans une direction', ['beton', 'bois'], [['beton', 'Isostatique', [3, 6], 'L/25 – L/30'], ['beton', 'Continue', [4, 7], 'L/30 – L/35'], ['bois', 'Dalle bois (bois lamellé-cloué, CLT)', [3, 7], 'L/25 – L/30']],
      'Dalle appuyée sur deux côtés opposés : elle fléchit comme une série de poutres larges parallèles.',
      ['Simple à réaliser', 'Bonne isolation acoustique (masse)'], ['Poids propre élevé en béton', 'Portée limitée'],
      ['Planchers de logements sur voiles']),
    T_('dalle-2d', 'planchers', 'Dalle portant dans deux directions', ['beton'], [['beton', 'Dalle sur 4 côtés', [4, 9], 'L/35 – L/45 (petit côté)']],
      'Dalle appuyée sur ses quatre côtés, de proportions proches du carré : la charge se partage dans les deux directions.',
      ['Épaisseur réduite', 'Comportement en plaque très efficace'], ['Appuis sur 4 côtés nécessaires'],
      ['Planchers sur grilles de poutres']),
    T_('plancher-dalle', 'planchers', 'Plancher-dalle', ['beton'], [['beton', 'Béton armé', [5, 9], 'L/25 – L/30'], ['beton', 'Béton précontraint', [7, 12], 'L/35 – L/45']],
      'Dalle reposant directement sur des poteaux, sans poutres. Point critique : le poinçonnement autour des poteaux.',
      ['Sous-face plane : réseaux libres, hauteur d\'étage minimale', 'Coffrage simple'], ['Poinçonnement', 'Épaisseur plus forte'],
      ['Parkings, bureaux']),
    T_('nervure', 'planchers', 'Plancher nervuré / à caissons', ['beton', 'bois'], [['beton', 'Nervures ou caissons', [8, 18], 'L/20 – L/28 (hauteur totale)'], ['bois', 'Caissons bois (panneaux + nervures lamellé-collé)', [6, 15], 'L/20 – L/25']],
      'On supprime la matière tendue inutile : une dalle mince raidie par des nervures dans une ou deux directions. En bois, des caissons fermés (panneaux haut et bas + nervures) atteignent les mêmes portées.',
      ['Grande portée pour un poids modéré', 'Plafond expressif'], ['Coffrages spécifiques'],
      ['Yale University Art Gallery (L. Kahn, 1953)']),
    T_('mixte', 'planchers', 'Plancher mixte acier-béton', ['acier', 'beton'], [['acier', 'Poutre acier + dalle collaborante', [6, 18], 'L/20 – L/28']],
      'Dalle coulée sur bac acier, liée aux poutres par des connecteurs : le béton comprimé et l\'acier tendu forment une section mixte très rigide.',
      ['Rapidité de chantier', 'Légèreté'], ['Protection incendie de l\'acier', 'Vibrations'],
      ['Immeubles de bureaux']),
    T_('alveolaire', 'planchers', 'Dalle alvéolaire précontrainte', ['beton'], [['beton', 'Préfabriquée précontrainte', [6, 18], 'L/35 – L/45']],
      'Dalles préfabriquées évidées, précontraintes par torons : grandes portées sans étais.',
      ['Pose rapide sans étais', 'Poids réduit'], ['Percements à anticiper', 'Porte dans une seule direction'],
      ['Parkings, bâtiments commerciaux']),
    T_('clt', 'planchers', 'Plancher CLT', ['bois'], [['bois', 'Bois lamellé-croisé', [3, 7], 'L/25 – L/30'], ['bois', 'Solivage traditionnel', [2, 5], 'L/17 – L/20']],
      'Panneaux de couches croisées collées : ils portent dans deux directions et servent de diaphragme.',
      ['Biosourcé, léger, préfabriqué'], ['Acoustique et vibrations à traiter'],
      ['Immeubles bois de moyenne hauteur']),
    T_('bois-beton', 'planchers', 'Plancher mixte bois-béton', ['bois', 'beton'], [['bois', 'Solives + dalle de compression 6 à 10 cm', [4, 9], 'L/20 – L/25 (hauteur totale)']],
      'Des solives ou poutres bois sont connectées (vis, connecteurs) à une dalle de compression en béton coulée sur un platelage : le béton travaille en compression, le bois en traction.',
      ['Rigidité et masse acoustique accrues', 'Moins de béton qu\'une dalle pleine'], ['Chantier humide', 'Connexion à dimensionner'],
      ['Réhabilitation de planchers bois anciens', 'Immeubles bois-béton']),
    T_('clt-nervure', 'planchers', 'Plancher CLT nervuré (caisson)', ['bois'], [['bois', 'Panneau CLT + nervures lamellé-collé', [6, 12], 'L/20 – L/25']],
      'Un panneau CLT collé ou vissé sur des nervures en lamellé-collé forme des sections en T (ou en caisson fermé) : la hauteur statique augmente fortement pour un faible poids.',
      ['Portées de bureaux (8 à 12 m) en bois', 'Réseaux entre nervures'], ['Hauteur totale', 'Vibrations'],
      ['Immeubles de bureaux en bois']),
    T_('grille-poutres', 'planchers', 'Grille de poutres encastrées', ['bois', 'beton', 'acier'], [['bois', 'Grille orthogonale lamellé-collé', [12, 25], 'L/20 (entraxe 2,4 à 7,2 m)'], ['beton', 'Grille de poutres', [10, 25], 'L/20'], ['acier', 'Grille de profilés', [15, 40], 'L/20 – L/25']],
      'Poutres croisées et liées dans deux directions : chaque poutre aide sa voisine, la charge se partage comme dans une dalle.',
      ['Portée bidirectionnelle', 'Hauteur réduite'], ['Nœuds de croisement'],
      ['Toitures de halls carrés']),

    // ================================================================ Arcs
    T_('arc', 'arcs', 'Arc bi-articulé', ['acier', 'beton', 'bois'], [
      ['bois', 'Lamellé-collé, f/L ≥ 0,14', [20, 100], 'h ≈ L/50'], ['acier', 'Profilés, caissons (bâtiment)', [15, 60], 'f/L = 1/10 – 1/2 ; h ≈ L/30 – L/50'], ['acier', 'Caissons (grands ouvrages)', [60, 550], 'f/L = 1/5 – 1/8 ; h ≈ L/50 – L/80'],
      ['beton', 'Béton armé', [30, 300], 'f/L = 1/5 – 1/8 ; e ≈ L/40 – L/60']],
      'Élément courbe comprimé articulé aux naissances. Sous charge uniforme, la parabole est funiculaire : la flexion disparaît. La poussée H = qL²/8f doit être reprise par les appuis.',
      ['Exploite la compression', 'Très grandes portées'], ['Poussées aux appuis', 'Flexion sous charges dissymétriques', 'Flambement'],
      ['Viaduc de Garabit (G. Eiffel, 1884)', 'Pont du Gard'], { preset: 'arc' }),
    T_('arc-3art', 'arcs', 'Arc à trois articulations', ['bois', 'acier', 'beton'], [
      ['bois', 'Lamellé-collé, f/L ≥ 0,14', [20, 100], 'h ≈ L/50'], ['acier', 'Profilés', [15, 60], 'f/L = 1/10 – 1/2 ; h ≈ L/30 – L/50'], ['beton', 'Béton armé', [30, 100], 'e ≈ L/40']],
      'Arc articulé aux naissances et à la clé : isostatique, il absorbe sans contraintes les tassements et dilatations et se monte en deux demi-arcs.',
      ['Calcul simple', 'Insensible aux mouvements d\'appui', 'Transport facilité'], ['Articulation de clé', 'Plus déformable'],
      ['Pont de Salginatobel (R. Maillart, 1930)', 'Halles en lamellé-collé'], { preset: 'arc-3art' }),
    T_('arc-encastre', 'arcs', 'Arc encastré', ['beton', 'acier'], [['beton', 'Ponts en arc', [50, 450], 'f/L = 1/5 – 1/10'], ['acier', 'Caissons', [50, 500], 'f/L = 1/5 – 1/8']],
      'Arc encastré à ses naissances : plus rigide et plus stable au flambement, mais les fondations reprennent aussi des moments.',
      ['Rigidité maximale', 'Flambement repoussé'], ['Fondations très sollicitées', 'Sensible aux tassements'],
      ['Grands ponts en arc en béton'], { preset: 'arc-encastre' }),
    T_('arc-tirant', 'arcs', 'Arc à tirant', ['acier', 'bois', 'beton'], [['acier', 'Arc cintré sur appuis, avec tirant', [8, 30], 'H/L = 1/10 – 1/2'], ['acier', 'Arc + tirant (bow-string, grands ouvrages)', [30, 250], 'f/L = 1/6 – 1/8'], ['bois', 'Arc lamellé-collé + tirant acier', [20, 80], 'h ≈ L/50']],
      'Un tirant relie les naissances et équilibre la poussée : les appuis ne reprennent plus que des efforts verticaux.',
      ['Aucune poussée aux appuis', 'Pose sur poteaux ou murs'], ['Le tirant traverse l\'espace'],
      ['Ponts bow-string', 'Halles'], { preset: 'arc-tirant' }),
    T_('arc-poteaux', 'arcs', 'Arc sur poteaux', ['bois', 'acier'], [['bois', 'Lamellé-collé avec tirant', [20, 80], 'h ≈ L/50']],
      'L\'arc est relevé sur des poteaux pour gagner de la hauteur libre près des façades ; un tirant ou des poteaux encastrés reprennent la poussée.',
      ['Hauteur libre en rive'], ['Poussée à reprendre en tête de poteaux'],
      ['Gymnases, marchés couverts']),

    // ================================================================ Structures tendues
    T_('cable', 'tendues', 'Toiture suspendue (câbles parallèles)', ['textile', 'acier', 'beton'], [['textile', 'Câbles + couverture lestée', [30, 150], 'f/L = 1/10 – 1/15']],
      'Des câbles parallèles suspendus entre deux rives portent la couverture : le câble prend la forme funiculaire de la charge. Un lest ou une dalle limite les mouvements sous le vent.',
      ['Matière utilisée en traction pure', 'Grandes portées très légères'], ['Instabilité sous vent (soulèvement)', 'Rives et ancrages massifs'],
      ['Aéroport de Washington-Dulles (E. Saarinen, 1962)']),
    T_('poutre-cable', 'tendues', 'Poutres câbles', ['textile', 'acier'], [['textile', 'Deux câbles prétendus', [30, 120], 'f/L = 1/12 – 1/15 par câble']],
      'Un câble porteur et un câble stabilisateur de courbures opposées, reliés par des suspentes ou des diagonales et mis en prétension : le système résiste aux charges descendantes et ascendantes.',
      ['Stable sans lest', 'Très léger'], ['Prétension et ancrages importants'],
      ['Couvertures de stades et de halls'], { variants: V.cables, vig2d: V.cables.map(v => v[2]) }),
    T_('roue', 'tendues', 'Roue de vélo', ['textile', 'acier'], [['textile', 'Câbles radiaux double nappe', [50, 250], 'flèche ≈ D/15 – D/20']],
      'Deux nappes de câbles radiaux relient un moyeu central à un anneau périphérique comprimé, comme les rayons d\'une roue. L\'anneau reprend toutes les tractions.',
      ['Couverture circulaire sans appui intérieur', 'Efforts auto-équilibrés'], ['Anneau de compression massif'],
      ['Memorial Auditorium d\'Utica (L. Zetlin, 1959)'], { variants: V.roue }),
    T_('resille', 'tendues', 'Résille de câbles à double courbure', ['textile', 'acier'], [['textile', 'Réseau anticlastique prétendu', [30, 150], 'courbures opposées marquées']],
      'Deux familles de câbles de courbures opposées (selle de cheval) se croisent et se tendent mutuellement : la résille est stable sous toutes les charges.',
      ['Formes libres et très légères'], ['Recherche de forme numérique', 'Ancrages et mâts sollicités'],
      ['Dorton Arena (Raleigh, 1952)', 'Stade olympique de Munich (F. Otto, 1972)']),
    T_('toile', 'tendues', 'Toile à double courbure', ['textile'], [['textile', 'Toile à quatre points', [8, 30], 'dénivelé ≈ L/3 – L/5'], ['textile', 'Toile sur mâts', [10, 60], 'hauteur ≈ D/4 – D/6'], ['textile', 'Toile sur arcs', [10, 80], 'f/L arcs ≈ 1/3 – 1/5']],
      'Une toile prétendue n\'est stable que si elle présente deux courbures opposées (forme anticlastique, en selle) : elle se tend alors dans les deux directions et résiste aux charges descendantes comme au soulèvement. La forme est obtenue par des points hauts et bas, des mâts ou des arcs.',
      ['Légèreté, translucidité', 'Montage rapide'], ['Durabilité et isolation limitées', 'Mâts et ancrages concentrés'],
      ['Terminal Hajj de Djeddah (SOM, 1981)', 'Stade olympique de Munich (F. Otto, 1972)'], { variants: V.toile }),
    T_('gonflable', 'tendues', 'Structure gonflable', ['textile'], [['textile', 'Membrane pressurisée', [20, 200], 'f/L ≈ 1/10 – 1/5']],
      'Une légère surpression intérieure tend la membrane : l\'air porte la structure.',
      ['Extrême légèreté', 'Grandes portées'], ['Maintien de la pression', 'Sas d\'accès'],
      ['Pavillon des États-Unis, Osaka (1970)']),

    // ================================================================ Portiques
    T_('portique-encastre', 'portiques', 'Portique encastré', ['acier', 'beton', 'bois'], [['acier', 'Profilés', [10, 30], 'traverse L/30 – L/40'], ['beton', 'Béton armé', [6, 20], 'traverse L/12 – L/15']],
      'Poteaux et traverse liés par des nœuds rigides, pieds encastrés : le cadre est stable seul vis-à-vis des actions horizontales.',
      ['Pas de contreventement nécessaire', 'Faible déplacement latéral'], ['Fondations sollicitées en moment', 'Hyperstatique'],
      ['Bâtiments industriels', 'Ossatures béton'], { preset: 'portique' }),
    T_('portique-biarticule', 'portiques', 'Portique bi-articulé', ['acier', 'bois', 'beton'], [['acier', 'Profilés avec jarrets', [15, 40], 'traverse L/30 – L/50'], ['acier', 'Portique à treillis (traverse et montants triangulés)', [15, 40], 'h ≈ L/15 – L/30'], ['bois', 'Lamellé-collé', [15, 40], 'L/30']],
      'Angles rigides et pieds articulés : le système le plus courant des halles métalliques. Fondations simples, poussée en pied.',
      ['Fondations économiques', 'Préfabrication'], ['Moments importants aux angles'],
      ['Entrepôts, gymnases'], { preset: 'portique' }),
    T_('portique-triarticule', 'portiques', 'Portique à trois articulations', ['bois', 'acier', 'beton'], [['bois', 'Reins assemblés par entures', [15, 25], 'h ≈ (s₁ + s₂)/13'], ['acier', 'Profilés', [15, 50], 'L/30 – L/50']],
      'Deux demi-portiques articulés en pied et au faîtage : isostatique, transportable en deux éléments.',
      ['Insensible aux tassements', 'Calcul simple'], ['Poussée aux appuis', 'Moments aux angles'],
      ['Galerie des machines (Paris, 1889, 115 m)'], { preset: 'tri-articule' }),
    T_('portique-versants', 'portiques', 'Portique à deux versants', ['acier', 'bois'], [['acier', 'Arbalétriers avec jarrets', [12, 40], 'L/40 – L/50'], ['bois', 'Lamellé-collé', [15, 40], 'L/30']],
      'Traverse brisée en deux arbalétriers formant la pente de toiture ; l\'effet d\'arc réduit les moments.',
      ['Évacuation des eaux et de la neige', 'Système industrialisé'], ['Poussée', 'Déversement des arbalétriers'],
      ['Bâtiments agricoles et industriels'], { preset: 'deux-versants' }),
    T_('reins-courbes', 'portiques', 'Portique aux reins courbes', ['bois'], [['bois', 'Lamellé-collé, pente ≥ 14°', [15, 50], 'h ≈ (s₁ + s₂)/15']],
      'Forme caractéristique du lamellé-collé : les angles sont cintrés, ce qui adoucit la concentration de moment et dégage le volume.',
      ['Volume intérieur dégagé', 'Esthétique'], ['Traction transversale au fil dans les courbes'],
      ['Halles de sport, manèges']),
    T_('portique-jambes', 'portiques', 'Portique à jambes de force', ['bois', 'acier'], [['bois', 'Lamellé-collé, pente ≥ 14°', [10, 50], 'h ≈ L/30']],
      'Des jambes de force inclinées relient poteaux et traverse : elles raccourcissent la portée de flexion et rigidifient les angles.',
      ['Sections réduites', 'Assemblages articulés simples'], ['Encombrement dans les angles'],
      ['Granges, halles agricoles'], { preset: 'portique-jambes' }),
    T_('demi-portique', 'portiques', 'Demi-portique étayé', ['bois', 'acier'], [['bois', 'Lamellé-collé, pente ≥ 20°', [10, 25], 'h ≈ L/25'], ['acier', 'Profilés', [10, 30], 'L/25 – L/30']],
      'Un demi-portique à rein courbe (poteau et arbalétrier continus) dont l\'extrémité haute est portée par un étai incliné articulé : le système est isostatique et laisse un grand côté libre.',
      ['Grande ouverture d\'un côté', 'Isostatique, fondations simples'], ['Étai dans le volume', 'Moment important au rein'],
      ['Tribunes de stade, quais de gare'], { preset: 'demi-portique' }),

    // ================================================================ Structures plissées
    T_('plisse-v', 'plissees', 'Toiture plissée en V', ['beton', 'bois', 'acier'], [['beton', 'Voiles minces plissés', [10, 40], 'hauteur des plis L/10 – L/15'], ['bois', 'Panneaux bois pliés', [10, 30], 'L/10 – L/15']],
      'Des plaques minces assemblées en V forment des poutres de grande hauteur : chaque pli porte longitudinalement, la plaque transmet les charges entre plis.',
      ['Grande rigidité pour peu de matière', 'Couverture et structure confondues'], ['Rives libres à raidir'],
      ['Salle de l\'UNESCO (Breuer & Nervi, 1958)']),
    T_('sheds', 'plissees', 'Toiture en sheds (dents de scie)', ['acier', 'beton', 'bois'], [['acier', 'Fermes ou plis', [10, 30], 'hauteur ≈ L/8 – L/10']],
      'Plis dissymétriques dont la face raide est vitrée et orientée au nord : lumière naturelle homogène sans ensoleillement direct.',
      ['Éclairage zénithal', 'Rigidité'], ['Gestion des eaux pluviales'],
      ['Ateliers et usines']),

    // ================================================================ Coques et gridshells
    T_('coque-pleine', 'coques', 'Coque pleine', ['beton'], [['beton', 'Voûte cylindrique', [10, 60], 'épaisseur L/300 – L/500'], ['beton', 'Coupole', [20, 200], 'épaisseur D/100 – D/400'], ['beton', 'Coque libre sur appuis ponctuels', [15, 60], 'épaisseur 8 – 12 cm']],
      'Surface courbe mince et continue qui porte par efforts de membrane (compression, et traction en partie basse des coupoles) plutôt que par flexion. La courbure fait la rigidité : la double courbure (coupole, coque libre) est bien plus raide que la simple courbure (voûte).',
      ['Couverture et structure confondues', 'Très faible épaisseur', 'Grandes portées'], ['Poussées à reprendre en rive', 'Coffrage et recherche de forme', 'Sensible aux charges concentrées'],
      ['CNIT (La Défense, 1958)', 'Panthéon de Rome (43 m)', 'Station-service de Deitingen (H. Isler, 1968)'], {
        variants: [
          ['Voûte (coque cylindrique)', 'Arc prolongé dans la profondeur : reporte les charges sur des appuis continus qui reprennent la poussée.', D['voute']],
          ['Coupole', 'Surface de révolution : compression le long des méridiens, traction annulaire en pied reprise par un anneau.', D['dome']],
          ['Coque libre (forme trouvée)', 'Forme obtenue par inversion d\'une membrane suspendue : compression pure sous poids propre, rives libres.', D['isler']]]
      }),
    T_('coque-nervuree', 'coques', 'Coque nervurée', ['beton'], [['beton', 'Nervures préfabriquées', [30, 100], 'nervures D/100']],
      'Calotte surbaissée formée de nervures préfabriquées croisées en losanges, dont la rive est portée par des béquilles inclinées en Y qui reçoivent la poussée tangentiellement.',
      ['Préfabrication', 'Expression des efforts'], ['Nombreux éléments'],
      ['Palazzetto dello Sport (P. L. Nervi, Rome, 1957)']),
    T_('gridshell', 'coques', 'Gridshell', ['bois', 'acier'], [['bois', 'Lattes cintrées à double nappe', [15, 80], 'épaisseur ≈ L/150'], ['acier', 'Résille triangulée ou maille raidie par câbles', [15, 100], 'barres ≈ L/200']],
      'Une résille de barres prend une forme de coque à double courbure : elle porte comme une coque avec la légèreté d\'une grille. En bois, une grille plane de lattes est déformée sur site puis bloquée ; en acier, la maille est triangulée ou raidie par des câbles et porte souvent un vitrage.',
      ['Très peu de matière', 'Formes libres'], ['Mise en forme délicate', 'Flambement global'],
      ['Multihalle de Mannheim (F. Otto, 1975)', 'Savill Garden (2006)', 'Great Court du British Museum (Foster, 2000)']),
  ];
  S.TYPO_SVG = D;
})(window.S);
