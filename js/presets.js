/* Modèles paramétriques du solveur, rangés par familles (mêmes familles que les typologies).
   Chaque preset : { id, name, group, params: [...], build(p) -> modèle } */
(function (S) {
  'use strict';

  const num = (k, label, min, max, step, def, unit) => ({ k, label, min, max, step, def, unit });
  const sel = (k, label, options, def) => ({ k, label, type: 'select', options, def });
  const BASES = [['rotule', 'Articulés'], ['encastrement', 'Encastrés']];

  const beam = (n1, n2, sec, extra) => Object.assign({ n1, n2, sec, rel1: false, rel2: false }, extra);
  const bar = (n1, n2, sec) => ({ n1, n2, sec, rel1: true, rel2: true });
  const udl = (elem, q, dir = 'g') => ({ elem, type: 'udl', dir, q, a: 0 });

  // ------------------------------------------------------------------ charges des portiques
  /* Sur la traverse : une charge répartie verticale q et/ou une charge ponctuelle verticale P (position libre).
     Sur un montant : une charge répartie horizontale w et/ou une charge ponctuelle horizontale F (hauteur libre). */
  const FRAME_LOADS = (cols = true) => [
    num('q', 'Traverse — charge répartie verticale q', 0, 60, 1, 1, 'kN/m'),
    num('P', 'Traverse — charge ponctuelle verticale P', 0, 200, 5, 0, 'kN'),
    num('xP', 'Position de P (x / portée)', 0.05, 0.95, 0.05, 0.5, ''),
    ...(cols ? [sel('mont', 'Montant chargé', [['gauche', 'Montant gauche'], ['droit', 'Montant droit']], 'gauche')] : []),
    num('w', 'Montant — charge répartie horizontale w', 0, 30, 0.5, 0, 'kN/m'),
    num('F', 'Montant — charge ponctuelle horizontale F', 0, 100, 1, 0, 'kN'),
    num('zF', 'Hauteur de F (z / hauteur du montant)', 0.05, 1, 0.05, 1, '')
  ];
  // trav : barres de la traverse de gauche à droite ; colL / colR : montants (de bas en haut, éventuellement découpés)
  function frameLoads(m, p, trav, colL, colR) {
    const e = [];
    const len = k => { const el = m.elems[k - 1], a = m.nodes[el.n1 - 1], b = m.nodes[el.n2 - 1]; return Math.hypot(b.x - a.x, b.y - a.y); };
    if (p.q) trav.forEach(t => e.push(udl(t, p.q, 'gp')));
    if (p.P) {
      const x0 = m.nodes[m.elems[trav[0] - 1].n1 - 1].x, x1 = m.nodes[m.elems[trav[trav.length - 1] - 1].n2 - 1].x;
      const xt = x0 + (x1 - x0) * p.xP;
      for (const t of trav) {
        const el = m.elems[t - 1], a = m.nodes[el.n1 - 1], b = m.nodes[el.n2 - 1];
        const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
        if (xt >= lo - 1e-9 && xt <= hi + 1e-9) { e.push({ elem: t, type: 'point', dir: 'g', q: p.P, a: +(len(t) * (xt - a.x) / (b.x - a.x)).toFixed(3) }); break; }
      }
    }
    const segs = [].concat(p.mont === 'droit' && colR ? colR : colL).filter(Boolean);
    if (p.w) segs.forEach(c => e.push(udl(c, p.w, 'gx')));
    if (p.F && segs.length) {
      let rest = segs.reduce((s, c) => s + len(c), 0) * p.zF;
      for (const c of segs) {
        if (rest <= len(c) + 1e-9 || c === segs[segs.length - 1]) { e.push({ elem: c, type: 'point', dir: 'gx', q: p.F, a: +Math.min(rest, len(c)).toFixed(3) }); break; }
        rest -= len(c);
      }
    }
    m.eloads.push(...e);
    return m;
  }

  // Charge répartie q (kN/m) ramenée aux nœuds chargés d'un treillis (aires d'influence)
  function nodalFromQ(nodes, idx, q) {
    const pts = idx.map(i => [i, nodes[i][0]]).sort((a, b) => a[1] - b[1]);
    return pts.map(([i, x], k) => {
      const xl = k ? (x + pts[k - 1][1]) / 2 : x, xr = k < pts.length - 1 ? (x + pts[k + 1][1]) / 2 : x;
      return { node: i + 1, Fx: 0, Fy: +(q * (xr - xl)).toFixed(3), M: 0, fromQ: true };
    }).filter(l => l.Fy);
  }
  function trussModel(g, p, sec = 'SHS120x6') {
    return {
      nodes: g.nodes.map(([x, y], i) => ({ x: +x.toFixed(4), y: +y.toFixed(4), sup: i === g.sup[0] ? 'rotule' : i === g.sup[1] ? 'appui' : 'libre' })),
      elems: g.bars.map(([i, j]) => g.rigid ? beam(i + 1, j + 1, 'HEA240') : bar(i + 1, j + 1, sec)),
      nloads: nodalFromQ(g.nodes, g.load, p.q), eloads: [],
      // affichage : charge répartie sur la membrure chargée (barres reliant deux nœuds chargés)
      dispLoads: p.q ? [{ q: p.q, elems: g.bars.map(([i, j], k) => (g.load.includes(i) && g.load.includes(j) ? k + 1 : 0)).filter(Boolean) }] : []
    };
  }
  function underModel(g, p, o = {}) {
    const sups = o.sups || g.sup;
    const m = {
      nodes: g.nodes.map(([x, y], i) => ({ x: +x.toFixed(4), y: +y.toFixed(4), sup: i === sups[0] ? 'rotule' : sups.includes(i) ? 'appui' : 'libre' })),
      elems: [], nloads: [], eloads: []
    };
    g.beams.forEach(([i, j], k) => { m.elems.push(beam(i + 1, j + 1, o.beamSec || 'IPE240', (o.hinge || []).includes(k) ? { rel2: true } : {})); m.eloads.push(udl(m.elems.length, p.q, 'gp')); });
    g.bars.forEach(([i, j]) => {
      const a = g.nodes[i], b = g.nodes[j];
      const isPost = Math.abs(a[0] - b[0]) < 1e-6 || (o.struts || []).some(([u, v]) => (u === i && v === j) || (u === j && v === i));
      m.elems.push(bar(i + 1, j + 1, isPost ? 'SHS80x5' : (o.tieSec || 'R40')));
    });
    return m;
  }

  const P = [];
  const add = (group, o) => P.push(Object.assign({ group }, o));
  const TR = (id, name, gen, params, extra) => add('Poutres treillis', {
    id, name, params: params || [num('L', 'Portée L', 6, 80, 1, 24, 'm'), num('h', 'Hauteur h', 0.5, 10, 0.1, 2.4, 'm'), num('n', 'Nombre de panneaux', 2, 16, 1, 8, ''), num('q', 'Charge q (répartie aux nœuds)', 0, 60, 1, 1, 'kN/m')],
    build: p => trussModel(S.TRUSS[gen](p.L, p.h, p.n), p), ...extra
  });

  // ================================================================ Poutres
  add('Poutres', {
    id: 'isostatique', name: 'Poutre sur deux appuis',
    params: [num('L', 'Portée L', 1, 30, 0.5, 8, 'm'), num('q', 'Charge répartie q', 0, 80, 1, 1, 'kN/m'),
      num('P', 'Charge ponctuelle P', 0, 200, 5, 0, 'kN'), num('a', 'Position de P (a/L)', 0.05, 0.95, 0.05, 0.5, '')],
    build: p => ({
      nodes: [{ x: 0, y: 0, sup: 'rotule' }, { x: p.L, y: 0, sup: 'appui' }],
      elems: [beam(1, 2, 'IPE300')], nloads: [],
      eloads: [udl(1, p.q), ...(p.P ? [{ elem: 1, type: 'point', dir: 'g', q: p.P, a: +(p.a * p.L).toFixed(3) }] : [])]
    })
  });
  add('Poutres', {
    id: 'console', name: 'Console (porte-à-faux)',
    params: [num('L', 'Longueur L', 0.5, 12, 0.25, 3, 'm'), num('q', 'Charge répartie q', 0, 60, 1, 1, 'kN/m'), num('P', 'Charge en bout P', 0, 100, 1, 0, 'kN')],
    build: p => ({
      nodes: [{ x: 0, y: 0, sup: 'encastrement' }, { x: p.L, y: 0, sup: 'libre' }],
      elems: [beam(1, 2, 'IPE240')], nloads: p.P ? [{ node: 2, Fx: 0, Fy: p.P, M: 0 }] : [], eloads: [udl(1, p.q)]
    })
  });
  add('Poutres', {
    id: 'porte-a-faux', name: 'Poutre avec porte-à-faux',
    params: [num('L', 'Portée L', 2, 20, 0.5, 7, 'm'), num('c', 'Porte-à-faux c', 0.5, 8, 0.25, 2.5, 'm'), num('q', 'Charge répartie q', 0, 60, 1, 1, 'kN/m')],
    build: p => ({
      nodes: [{ x: 0, y: 0, sup: 'rotule' }, { x: p.L, y: 0, sup: 'appui' }, { x: p.L + p.c, y: 0, sup: 'libre' }],
      elems: [beam(1, 2, 'IPE300'), beam(2, 3, 'IPE300')], nloads: [], eloads: [udl(1, p.q), udl(2, p.q)]
    })
  });
  add('Poutres', {
    id: 'bi-encastree', name: 'Poutre bi-encastrée',
    params: [num('L', 'Portée L', 1, 30, 0.5, 8, 'm'), num('q', 'Charge répartie q', 0, 80, 1, 1, 'kN/m')],
    build: p => ({ nodes: [{ x: 0, y: 0, sup: 'encastrement' }, { x: p.L, y: 0, sup: 'encastrement' }], elems: [beam(1, 2, 'IPE300')], nloads: [], eloads: [udl(1, p.q)] })
  });
  add('Poutres', {
    id: 'encastree-appuyee', name: 'Poutre encastrée-appuyée',
    params: [num('L', 'Portée L', 1, 30, 0.5, 8, 'm'), num('q', 'Charge répartie q', 0, 80, 1, 1, 'kN/m'),
      num('P', 'Charge ponctuelle P', 0, 200, 5, 0, 'kN'), num('a', 'Position de P (a/L)', 0.05, 0.95, 0.05, 0.5, '')],
    build: p => ({
      nodes: [{ x: 0, y: 0, sup: 'encastrement' }, { x: p.L, y: 0, sup: 'appui' }],
      elems: [beam(1, 2, 'IPE300')], nloads: [],
      eloads: [udl(1, p.q), ...(p.P ? [{ elem: 1, type: 'point', dir: 'g', q: p.P, a: +(p.a * p.L).toFixed(3) }] : [])]
    })
  });
  add('Poutres', {
    id: 'continue', name: 'Poutre continue',
    params: [num('n', 'Nombre de travées', 2, 6, 1, 3, ''), num('L', 'Portée par travée L', 1, 20, 0.5, 6, 'm'), num('q', 'Charge répartie q', 0, 80, 1, 1, 'kN/m')],
    build: p => {
      const nodes = [], elems = [], eloads = [];
      for (let i = 0; i <= p.n; i++) nodes.push({ x: i * p.L, y: 0, sup: i === 0 ? 'rotule' : 'appui' });
      for (let i = 1; i <= p.n; i++) { elems.push(beam(i, i + 1, 'IPE270')); eloads.push(udl(i, p.q)); }
      return { nodes, elems, nloads: [], eloads };
    }
  });
  add('Poutres', {
    id: 'gerber', name: 'Poutre Gerber',
    params: [num('L', 'Portée par travée L', 4, 40, 1, 12, 'm'), num('k', 'Position des rotules (a/L)', 0.1, 0.4, 0.05, 0.2, ''), num('q', 'Charge répartie q', 0, 80, 1, 1, 'kN/m')],
    build: p => {
      const a = p.k * p.L, L = p.L, xs = [0, L, L + a, 2 * L - a, 2 * L, 3 * L];
      const nodes = xs.map((x, i) => ({ x, y: 0, sup: [0, 1, 4, 5].includes(i) ? (i === 0 ? 'rotule' : 'appui') : 'libre' }));
      const elems = [beam(1, 2, 'IPE400'), beam(2, 3, 'IPE400', { rel2: true }), beam(3, 4, 'IPE400'), beam(4, 5, 'IPE400', { rel1: true }), beam(5, 6, 'IPE400')];
      return { nodes, elems, nloads: [], eloads: elems.map((e, i) => udl(i + 1, p.q)) };
    }
  });

  // ================================================================ Poutres treillis
  TR('pratt', 'Treillis Pratt', 'pratt');
  TR('howe', 'Treillis Howe', 'howe');
  TR('warren', 'Treillis Warren', 'warren', [num('L', 'Portée L', 6, 80, 1, 24, 'm'), num('h', 'Hauteur h', 0.5, 10, 0.1, 2.4, 'm'), num('n', 'Nombre de panneaux', 2, 16, 1, 6, ''), num('q', 'Charge q (répartie aux nœuds)', 0, 60, 1, 1, 'kN/m')]);
  TR('warren-montants', 'Warren à montants', 'warrenV');
  TR('treillis-k', 'Treillis en K', 'k', [num('L', 'Portée L', 10, 120, 1, 36, 'm'), num('h', 'Hauteur h', 1, 12, 0.1, 4, 'm'), num('n', 'Nombre de panneaux', 2, 16, 2, 8, ''), num('q', 'Charge q (répartie aux nœuds)', 0, 60, 1, 1, 'kN/m')]);
  TR('treillis-croix', 'Croix de Saint-André', 'croix', [num('L', 'Portée L', 6, 60, 1, 20, 'm'), num('h', 'Hauteur h', 0.5, 8, 0.1, 2, 'm'), num('n', 'Nombre de panneaux', 2, 12, 1, 6, ''), num('q', 'Charge q (répartie aux nœuds)', 0, 60, 1, 1, 'kN/m')]);
  TR('vierendeel', 'Poutre Vierendeel', 'vierendeel', [num('L', 'Portée L', 6, 60, 1, 18, 'm'), num('h', 'Hauteur h', 0.5, 6, 0.1, 2.5, 'm'), num('n', 'Nombre de panneaux', 2, 12, 1, 6, ''), num('q', 'Charge q (répartie aux nœuds)', 0, 60, 1, 1, 'kN/m')]);
  TR('fink', 'Ferme en W (Fink)', 'fink', [num('L', 'Portée L', 6, 30, 0.5, 12, 'm'), num('h', 'Hauteur au faîtage h', 1, 8, 0.1, 3, 'm'), num('q', 'Charge q (répartie aux nœuds)', 0, 40, 1, 1, 'kN/m')]);
  TR('ferme-triangulee', 'Ferme triangulaire à montants', 'triangle', [num('L', 'Portée L', 6, 40, 0.5, 16, 'm'), num('h', 'Hauteur au faîtage h', 1, 10, 0.1, 3.2, 'm'), num('n', 'Nombre de panneaux', 2, 12, 2, 6, ''), num('q', 'Charge q (répartie aux nœuds)', 0, 40, 1, 1, 'kN/m')]);
  TR('trapezoidale', 'Ferme trapézoïdale', 'trapeze', [num('L', 'Portée L', 10, 60, 1, 30, 'm'), num('h', 'Hauteur au faîtage h', 1, 8, 0.1, 3.6, 'm'), num('n', 'Nombre de panneaux', 2, 16, 2, 10, ''), num('q', 'Charge q (répartie aux nœuds)', 0, 40, 1, 1, 'kN/m')]);
  TR('bowstring', 'Poutre bow-string', 'bowstring', [num('L', 'Portée L', 10, 80, 1, 36, 'm'), num('h', 'Hauteur h', 1, 12, 0.1, 4.5, 'm'), num('n', 'Nombre de panneaux', 4, 16, 2, 10, ''), num('q', 'Charge q (répartie aux nœuds)', 0, 40, 1, 1, 'kN/m')]);
  TR('lenticulaire', 'Poutre lenticulaire', 'lenticulaire', [num('L', 'Portée L', 10, 100, 1, 40, 'm'), num('h', 'Hauteur totale h', 1, 12, 0.1, 5, 'm'), num('n', 'Nombre de panneaux', 4, 16, 2, 10, ''), num('q', 'Charge q (répartie aux nœuds)', 0, 40, 1, 1, 'kN/m')]);
  TR('ciseaux', 'Ferme à entrait retroussé', 'ciseaux', [num('L', 'Portée L', 6, 25, 0.5, 12, 'm'), num('h', 'Hauteur au faîtage h', 1, 8, 0.1, 3.6, 'm'), num('q', 'Charge q (répartie aux nœuds)', 0, 40, 1, 1, 'kN/m')]);

  // ================================================================ Poutres sous-tendues
  const ST = (id, name, params, build) => add('Poutres sous-tendues', { id, name, params, build });
  const stP = (L, h, q) => [num('L', 'Portée L', 4, 60, 0.5, L, 'm'), num('h', 'Hauteur de sous-tension h', 0.3, 6, 0.1, h, 'm'), num('q', 'Charge répartie q', 0, 40, 1, 1, 'kN/m')];
  ST('st-1', 'Sous-tendue à un bracon', stP(14, 1.4, 10), p => underModel(S.UNDER.bracons(p.L, p.h, 1), p));
  ST('st-2', 'Sous-tendue à deux bracons', stP(18, 1.6, 10), p => underModel(S.UNDER.bracons(p.L, p.h, 2), p));
  ST('st-multi', 'Ventre de poisson', [...stP(24, 2.2, 10), num('n', 'Nombre de bracons', 3, 9, 1, 5, '')], p => underModel(S.UNDER.bracons(p.L, p.h, p.n), p));
  ST('polonceau', 'Ferme Polonceau', [num('L', 'Portée L', 8, 40, 0.5, 18, 'm'), num('h', 'Hauteur au faîtage h', 1.5, 10, 0.1, 4.5, 'm'), num('q', 'Charge q (proj. horizontale)', 0, 30, 1, 1, 'kN/m')],
    p => { const g = S.UNDER.polonceau(p.L, p.h); return underModel(g, p, { hinge: [], struts: [[1, 5], [3, 6]], beamSec: 'IPE200' }); });
  ST('beam-string', 'Structure arc-câble (beam string)', [num('L', 'Portée L', 10, 100, 1, 36, 'm'), num('h', 'Montée de l\'arc f', 0.5, 8, 0.1, 2.4, 'm'), num('s', 'Flèche du câble s', 0.5, 8, 0.1, 2.4, 'm'), num('n', 'Nombre de panneaux', 4, 16, 2, 10, ''), num('q', 'Charge q (proj. horizontale)', 0, 40, 1, 1, 'kN/m')],
    p => underModel(S.UNDER.bss(p.L, p.h, p.s, p.n), p, { beamSec: 'HEA300', tieSec: 'R60' }));
  ST('arc-sous-tendu', 'Arc sous-tendu à tirant droit', [num('L', 'Portée L', 10, 100, 1, 36, 'm'), num('h', 'Montée de l\'arc f', 0.5, 10, 0.1, 3.2, 'm'), num('n', 'Nombre de panneaux', 4, 16, 2, 10, ''), num('q', 'Charge q (proj. horizontale)', 0, 40, 1, 1, 'kN/m')],
    p => underModel(S.UNDER.arc(p.L, p.h, p.n), p, { beamSec: 'HEA400', tieSec: 'R60' }));
  // ================================================================ Portiques
  add('Portiques', {
    id: 'portique', name: 'Portique simple',
    params: [num('L', 'Portée L', 3, 40, 0.5, 12, 'm'), num('H', 'Hauteur H', 2, 15, 0.25, 5, 'm'), sel('base', 'Pieds de poteaux', BASES, 'encastrement'), ...FRAME_LOADS()],
    build: p => frameLoads({
      nodes: [{ x: 0, y: 0, sup: p.base }, { x: 0, y: p.H, sup: 'libre' }, { x: p.L, y: p.H, sup: 'libre' }, { x: p.L, y: 0, sup: p.base }],
      elems: [beam(1, 2, 'HEA240'), beam(2, 3, 'IPE400'), beam(4, 3, 'HEA240')], nloads: [], eloads: []
    }, p, [2], 1, 3)
  });
  add('Portiques', {
    id: 'tri-articule', name: 'Portique à trois articulations',
    params: [num('L', 'Portée L', 4, 60, 1, 20, 'm'), num('H', 'Hauteur aux appuis H', 2, 15, 0.25, 6, 'm'), num('f', 'Hauteur au faîtage f', 0, 10, 0.25, 3, 'm'), ...FRAME_LOADS()],
    build: p => frameLoads({
      nodes: [{ x: 0, y: 0, sup: 'rotule' }, { x: 0, y: p.H, sup: 'libre' }, { x: p.L / 2, y: p.H + p.f, sup: 'libre' }, { x: p.L, y: p.H, sup: 'libre' }, { x: p.L, y: 0, sup: 'rotule' }],
      elems: [beam(1, 2, 'HEA400'), beam(2, 3, 'IPE500', { rel2: true }), beam(3, 4, 'IPE500'), beam(5, 4, 'HEA400')], nloads: [], eloads: []
    }, p, [2, 3], 1, 4)
  });
  add('Portiques', {
    id: 'deux-versants', name: 'Portique à deux versants',
    params: [num('L', 'Portée L', 6, 50, 1, 24, 'm'), num('H', 'Hauteur aux appuis H', 3, 15, 0.25, 7, 'm'), num('f', 'Hauteur au faîtage f', 0.5, 8, 0.25, 2, 'm'), sel('base', 'Pieds de poteaux', BASES, 'rotule'), ...FRAME_LOADS()],
    build: p => frameLoads({
      nodes: [{ x: 0, y: 0, sup: p.base }, { x: 0, y: p.H, sup: 'libre' }, { x: p.L / 2, y: p.H + p.f, sup: 'libre' }, { x: p.L, y: p.H, sup: 'libre' }, { x: p.L, y: 0, sup: p.base }],
      elems: [beam(1, 2, 'IPE550'), beam(2, 3, 'IPE450'), beam(3, 4, 'IPE450'), beam(5, 4, 'IPE550')], nloads: [], eloads: []
    }, p, [2, 3], 1, 4)
  });
  add('Portiques', {
    id: 'portique-jambes', name: 'Portique à jambes de force',
    params: [num('L', 'Portée L', 8, 40, 1, 16, 'm'), num('H', 'Hauteur aux appuis H', 3, 10, 0.25, 5, 'm'), num('f', 'Hauteur au faîtage f', 0.5, 6, 0.25, 2, 'm'), num('k', 'Longueur des jambes de force', 1, 4, 0.25, 2, 'm'), ...FRAME_LOADS()],
    build: p => {
      const L = p.L, H = p.H, f = p.f, k = p.k, t = Math.min(0.4, k / Math.hypot(L / 2, f));
      const nodes = [{ x: 0, y: 0, sup: 'rotule' }, { x: 0, y: H - k, sup: 'libre' }, { x: 0, y: H, sup: 'libre' }, { x: t * L / 2, y: H + t * f, sup: 'libre' }, { x: L / 2, y: H + f, sup: 'libre' },
        { x: L - t * L / 2, y: H + t * f, sup: 'libre' }, { x: L, y: H, sup: 'libre' }, { x: L, y: H - k, sup: 'libre' }, { x: L, y: 0, sup: 'rotule' }];
      const elems = [beam(1, 2, 'B140x400'), beam(2, 3, 'B140x400'), beam(3, 4, 'B140x400'), beam(4, 5, 'B140x400'), beam(5, 6, 'B140x400'), beam(6, 7, 'B140x400'),
        beam(9, 8, 'B140x400'), beam(8, 7, 'B140x400'), bar(2, 4, 'B100x300'), bar(8, 6, 'B100x300')];
      return frameLoads({ nodes, elems, nloads: [], eloads: [] }, p, [3, 4, 5, 6], [1, 2], [7, 8]);
    }
  });
  add('Portiques', {
    id: 'demi-portique', name: 'Demi-portique étayé',
    params: [num('L', 'Portée L', 6, 25, 0.5, 12, 'm'), num('H', 'Hauteur du poteau H', 2, 10, 0.25, 4.5, 'm'), num('f', 'Relevé de l\'arbalétrier', 0, 6, 0.25, 2.5, 'm'), num('e', 'Retrait du pied d\'étai', 0, 4, 0.25, 1.2, 'm'), ...FRAME_LOADS(false)],
    build: p => frameLoads({
      nodes: [{ x: 0, y: 0, sup: 'rotule' }, { x: 0, y: p.H, sup: 'libre' }, { x: p.L, y: p.H + p.f, sup: 'libre' }, { x: p.L - p.e, y: 0, sup: 'rotule' }],
      elems: [beam(1, 2, 'B200x800'), beam(2, 3, 'B200x800'), bar(3, 4, 'B140x400')], nloads: [], eloads: []
    }, p, [2], 1, null)
  });

  // ================================================================ Arcs
  const ARC = (id, name, kind) => add('Arcs', {
    id, name,
    params: [num('L', 'Portée L', 6, 120, 1, 30, 'm'), num('f', 'Flèche f', 1, 40, 0.5, 6, 'm'),
      sel('forme', 'Forme', [['para', 'Parabolique'], ['circ', 'Circulaire']], 'para'),
      num('q', 'Charge q (proj. horizontale)', 0, 60, 1, 1, 'kN/m'), num('P', 'Charge ponctuelle au quart', 0, 300, 5, 0, 'kN'),
      sel('sec', 'Section de l\'arc', [['HEA200', 'HEA 200'], ['HEA300', 'HEA 300'], ['HEA400', 'HEA 400'], ['HEB300', 'HEB 300'], ['B200x800', 'GL24h 200×800'], ['BA50x100', 'BA 50×100']], 'HEA300')],
    arc: kind,
    build: p => {
      const n = 16, nodes = [], elems = [], eloads = [];
      const sup = kind === 'enc' ? 'encastrement' : 'rotule';
      // un arc de cercle au-delà du demi-cercle ne retombe plus sur ses appuis : f est limitée à L/2
      if (p.forme === 'circ' && p.f > p.L / 2) p.f = p.L / 2;
      const R = (p.L * p.L / 4 + p.f * p.f) / (2 * p.f);
      const y = x => p.forme === 'circ' ? Math.sqrt(Math.max(0, R * R - (x - p.L / 2) ** 2)) - (R - p.f) : 4 * p.f * x * (p.L - x) / p.L ** 2;
      for (let i = 0; i <= n; i++) {
        const x = p.L * i / n;
        nodes.push({ x: +x.toFixed(4), y: +y(x).toFixed(4), sup: i === 0 ? sup : i === n ? (kind === 'tirant' ? 'appui' : sup) : 'libre' });
      }
      for (let i = 1; i <= n; i++) { elems.push(beam(i, i + 1, p.sec, { rel2: kind === '3' && i === n / 2 })); eloads.push(udl(i, p.q, 'gp')); }
      if (kind === 'tirant') elems.push(bar(1, n + 1, 'R40'));
      return { nodes, elems, nloads: p.P ? [{ node: n / 4 + 1, Fx: 0, Fy: p.P, M: 0 }] : [], eloads };
    }
  });
  ARC('arc', 'Arc bi-articulé', '2');
  ARC('arc-3art', 'Arc à trois articulations', '3');
  ARC('arc-encastre', 'Arc encastré', 'enc');
  ARC('arc-tirant', 'Arc à tirant', 'tirant');

  S.PRESETS = P;
  S.PRESET = Object.fromEntries(P.map(p => [p.id, p]));
  S.presetDefaults = id => Object.fromEntries(S.PRESET[id].params.map(p => [p.k, p.def]));
})(window.S);
