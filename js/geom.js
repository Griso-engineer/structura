/* Géométries communes (treillis, poutres sous-tendues) et dessins axonométriques
   « au trait » des typologies, dans l'esprit des planches d'Engel. */
(function (S) {
  'use strict';

  // ------------------------------------------------------------------ treillis
  /* Chaque générateur renvoie { nodes: [[x, y]], bars: [[i, j]], load: [indices des nœuds chargés],
     sup: [gauche, droite], rigid?: true (nœuds rigides) }. y = 0 : membrure inférieure. */
  function parallel(L, h, n) {
    const nodes = [];
    for (let i = 0; i <= n; i++) nodes.push([i * L / n, 0]);
    for (let i = 0; i <= n; i++) nodes.push([i * L / n, h]);
    const B = i => i, T = i => n + 1 + i, bars = [];
    for (let i = 0; i < n; i++) bars.push([B(i), B(i + 1)], [T(i), T(i + 1)]);
    return { nodes, bars, B, T };
  }
  const TRUSS = {
    pratt(L, h, n) {
      n = Math.max(2, n - n % 2);
      const g = parallel(L, h, n);
      for (let i = 0; i <= n; i++) g.bars.push([g.B(i), g.T(i)]);
      for (let i = 0; i < n; i++) g.bars.push(i < n / 2 ? [g.T(i), g.B(i + 1)] : [g.B(i), g.T(i + 1)]);
      return { nodes: g.nodes, bars: g.bars, load: g.nodes.map((_, k) => k).filter(k => k > n), sup: [0, n] };
    },
    howe(L, h, n) {
      n = Math.max(2, n - n % 2);
      const g = parallel(L, h, n);
      for (let i = 0; i <= n; i++) g.bars.push([g.B(i), g.T(i)]);
      for (let i = 0; i < n; i++) g.bars.push(i < n / 2 ? [g.B(i), g.T(i + 1)] : [g.T(i), g.B(i + 1)]);
      return { nodes: g.nodes, bars: g.bars, load: g.nodes.map((_, k) => k).filter(k => k > n), sup: [0, n] };
    },
    warren(L, h, n) {
      const nodes = [], bars = [];
      for (let i = 0; i <= n; i++) nodes.push([i * L / n, 0]);
      for (let i = 0; i < n; i++) nodes.push([(i + 0.5) * L / n, h]);
      const T = i => n + 1 + i;
      for (let i = 0; i < n; i++) bars.push([i, i + 1], [i, T(i)], [T(i), i + 1]);
      for (let i = 0; i < n - 1; i++) bars.push([T(i), T(i + 1)]);
      return { nodes, bars, load: Array.from({ length: n }, (_, i) => T(i)), sup: [0, n] };
    },
    warrenV(L, h, n) {
      n = Math.max(2, n - n % 2);
      const g = parallel(L, h, n);
      for (let i = 0; i <= n; i++) g.bars.push([g.B(i), g.T(i)]);
      for (let i = 0; i < n; i++) g.bars.push(i % 2 === 0 ? [g.B(i), g.T(i + 1)] : [g.T(i), g.B(i + 1)]);
      return { nodes: g.nodes, bars: g.bars, load: g.nodes.map((_, k) => k).filter(k => k > n), sup: [0, n] };
    },
    k(L, h, n) {
      n = Math.max(2, n - n % 2);
      const g = parallel(L, h, n), M = {};
      g.bars.push([g.B(0), g.T(0)], [g.B(n), g.T(n)]);
      for (let i = 1; i < n; i++) {
        M[i] = g.nodes.length; g.nodes.push([i * L / n, h / 2]);
        g.bars.push([g.B(i), M[i]], [M[i], g.T(i)]);
      }
      // un K par panneau, ouvert vers l'appui le plus proche
      for (let j = 0; j < n; j++) {
        if (j < n / 2) g.bars.push([M[j + 1], g.T(j)], [M[j + 1], g.B(j)]);
        else g.bars.push([M[j], g.T(j + 1)], [M[j], g.B(j + 1)]);
      }
      return { nodes: g.nodes, bars: g.bars, load: Array.from({ length: n + 1 }, (_, i) => g.T(i)), sup: [0, n] };
    },
    croix(L, h, n) {
      const g = parallel(L, h, n);
      for (let i = 0; i <= n; i++) g.bars.push([g.B(i), g.T(i)]);
      for (let i = 0; i < n; i++) g.bars.push([g.B(i), g.T(i + 1)], [g.T(i), g.B(i + 1)]);
      return { nodes: g.nodes, bars: g.bars, load: Array.from({ length: n + 1 }, (_, i) => g.T(i)), sup: [0, n] };
    },
    vierendeel(L, h, n) {
      const g = parallel(L, h, n);
      for (let i = 0; i <= n; i++) g.bars.push([g.B(i), g.T(i)]);
      return { nodes: g.nodes, bars: g.bars, load: Array.from({ length: n + 1 }, (_, i) => g.T(i)), sup: [0, n], rigid: true };
    },
    // Ferme triangulée en W (type Fink)
    fink(L, h) {
      const nodes = [[0, 0], [L / 3, 0], [2 * L / 3, 0], [L, 0], [L / 4, h / 2], [L / 2, h], [3 * L / 4, h / 2]];
      const bars = [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6], [6, 3], [4, 1], [1, 5], [5, 2], [2, 6]];
      return { nodes, bars, load: [4, 5, 6], sup: [0, 3] };
    },
    // Ferme triangulaire à montants (type Howe de charpente)
    triangle(L, h, n) {
      n = Math.max(2, n - n % 2);
      const nodes = [], bars = [];
      for (let i = 0; i <= n; i++) nodes.push([i * L / n, 0]);
      const top = {};
      for (let i = 1; i < n; i++) { top[i] = nodes.length; nodes.push([i * L / n, h * (1 - Math.abs(2 * i / n - 1))]); }
      top[0] = 0; top[n] = n;
      for (let i = 0; i < n; i++) bars.push([i, i + 1], [top[i], top[i + 1]]);
      for (let i = 1; i < n; i++) bars.push([i, top[i]]);
      for (let i = 1; i < n - 1; i++) bars.push(i < n / 2 ? [i, top[i + 1]] : [top[i], i + 1]);
      return { nodes, bars, load: Object.values(top), sup: [0, n] };
    },
    trapeze(L, h, n, h0 = h * 0.45) {
      n = Math.max(2, n - n % 2);
      const nodes = [], bars = [];
      for (let i = 0; i <= n; i++) nodes.push([i * L / n, 0]);
      for (let i = 0; i <= n; i++) nodes.push([i * L / n, h0 + (h - h0) * (1 - Math.abs(2 * i / n - 1))]);
      const T = i => n + 1 + i;
      for (let i = 0; i < n; i++) bars.push([i, i + 1], [T(i), T(i + 1)]);
      for (let i = 0; i <= n; i++) bars.push([i, T(i)]);
      for (let i = 0; i < n; i++) bars.push(i < n / 2 ? [i, T(i + 1)] : [T(i), i + 1]);
      return { nodes, bars, load: Array.from({ length: n + 1 }, (_, i) => T(i)), sup: [0, n] };
    },
    bowstring(L, h, n) {
      n = Math.max(2, n - n % 2);
      const nodes = [], bars = [];
      for (let i = 0; i <= n; i++) nodes.push([i * L / n, 0]);
      const top = { 0: 0, [n]: n };
      for (let i = 1; i < n; i++) { const x = i * L / n; top[i] = nodes.length; nodes.push([x, 4 * h * x * (L - x) / L / L]); }
      for (let i = 0; i < n; i++) bars.push([i, i + 1], [top[i], top[i + 1]]);
      for (let i = 1; i < n; i++) bars.push([i, top[i]]);
      for (let i = 1; i < n - 1; i++) bars.push(i < n / 2 ? [top[i], i + 1] : [i, top[i + 1]]);
      return { nodes, bars, load: Object.values(top), sup: [0, n] };
    },
    lenticulaire(L, h, n) {
      n = Math.max(2, n - n % 2);
      const nodes = [[0, 0]], bars = [], top = { 0: 0 }, bot = { 0: 0 };
      for (let i = 1; i < n; i++) {
        const x = i * L / n, y = 2 * h * x * (L - x) / L / L;
        top[i] = nodes.length; nodes.push([x, y]);
        bot[i] = nodes.length; nodes.push([x, -y]);
      }
      top[n] = bot[n] = nodes.length; nodes.push([L, 0]);
      for (let i = 0; i < n; i++) bars.push([top[i], top[i + 1]], [bot[i], bot[i + 1]]);
      for (let i = 1; i < n; i++) bars.push([bot[i], top[i]]);
      for (let i = 1; i < n - 1; i++) bars.push(i < n / 2 ? [top[i], bot[i + 1]] : [bot[i], top[i + 1]]);
      return { nodes, bars, load: Object.values(top), sup: [0, nodes.length - 1] };
    },
    // Ferme à entrait retroussé (ciseaux)
    ciseaux(L, h) {
      const nodes = [[0, 0], [L, 0], [L / 2, h], [L / 2, h * 0.45], [L / 4, h / 2], [3 * L / 4, h / 2], [L / 4, h * 0.225], [3 * L / 4, h * 0.225]];
      const bars = [[0, 4], [4, 2], [2, 5], [5, 1], [0, 6], [6, 3], [3, 7], [7, 1], [4, 6], [5, 7], [4, 3], [3, 5], [2, 3]];
      return { nodes, bars, load: [4, 2, 5], sup: [0, 1] };
    }
  };

  // ------------------------------------------------------------------ poutres sous-tendues
  /* Renvoie { nodes, beams: [[i, j]] (continus), bars: [[i, j]] (bielles / tirants articulés),
     deck: [indices de la poutre supérieure, de gauche à droite], sup: [...] } */
  const UNDER = {
    bracons(L, h, n, shape = 'para') {
      const nodes = [[0, 0]], deck = [0], feet = [];
      for (let i = 1; i <= n; i++) {
        const x = i * L / (n + 1);
        deck.push(nodes.length); nodes.push([x, 0]);
      }
      deck.push(nodes.length); nodes.push([L, 0]);
      // pieds des bracons : à profondeur constante (1 ou 2 bracons) ou sur une parabole (ventre de poisson)
      const raw = Array.from({ length: n }, (_, i) => { const x = (i + 1) * L / (n + 1); return x * (L - x); });
      const rmax = Math.max(...raw);
      for (let i = 1; i <= n; i++) {
        const d = n <= 2 || shape === 'flat' ? h : h * raw[i - 1] / rmax;
        feet.push(nodes.length); nodes.push([i * L / (n + 1), -d]);
      }
      const beams = [], bars = [];
      for (let i = 0; i < deck.length - 1; i++) beams.push([deck[i], deck[i + 1]]);
      for (let i = 0; i < n; i++) bars.push([deck[i + 1], feet[i]]);
      const chain = [deck[0], ...feet, deck[deck.length - 1]];
      for (let i = 0; i < chain.length - 1; i++) bars.push([chain[i], chain[i + 1]]);
      return { nodes, beams, bars, deck, sup: [deck[0], deck[deck.length - 1]], ties: chain };
    },
    // Ferme Polonceau : arbalétriers sous-tendus par une bielle, entrait relevé
    polonceau(L, h) {
      const a = Math.atan2(h, L / 2), d = 0.12 * L;
      const D = [L / 4, h / 2], E = [3 * L / 4, h / 2];
      const F = [D[0] + d * Math.sin(a), D[1] - d * Math.cos(a)], G = [E[0] - d * Math.sin(a), E[1] - d * Math.cos(a)];
      const nodes = [[0, 0], D, [L / 2, h], E, [L, 0], F, G];
      return { nodes, beams: [[0, 1], [1, 2], [2, 3], [3, 4]], bars: [[1, 5], [3, 6], [0, 5], [5, 2], [2, 6], [6, 4], [5, 6]], deck: [0, 1, 2, 3, 4], sup: [0, 4] };
    },
    // Structure arc-câble (« beam string ») : arc rigide, câble funiculaire suspendu (flèche s), montants
    bss(L, f, s, n) {
      const nodes = [], deck = [], feet = [];
      for (let i = 0; i <= n; i++) { const x = i * L / n; deck.push(nodes.length); nodes.push([x, 4 * f * x * (L - x) / L / L]); }
      for (let i = 1; i < n; i++) { const x = i * L / n; feet.push(nodes.length); nodes.push([x, -4 * s * x * (L - x) / L / L]); }
      const beams = [], bars = [];
      for (let i = 0; i < n; i++) beams.push([deck[i], deck[i + 1]]);
      for (let i = 1; i < n; i++) bars.push([deck[i], feet[i - 1]]);
      const chain = [deck[0], ...feet, deck[n]];
      for (let i = 0; i < chain.length - 1; i++) bars.push([chain[i], chain[i + 1]]);
      return { nodes, beams, bars, deck, sup: [deck[0], deck[n]] };
    },
    // Arc à tirant droit suspendu : arc rigide, tirant droit, montants
    arc(L, f, n) {
      const nodes = [], deck = [], feet = [];
      for (let i = 0; i <= n; i++) { const x = i * L / n; deck.push(nodes.length); nodes.push([x, 4 * f * x * (L - x) / L / L]); }
      for (let i = 1; i < n; i++) { feet.push(nodes.length); nodes.push([i * L / n, 0]); }
      const beams = [], bars = [];
      for (let i = 0; i < n; i++) beams.push([deck[i], deck[i + 1]]);
      for (let i = 1; i < n; i++) bars.push([deck[i], feet[i - 1]]);
      const chain = [deck[0], ...feet, deck[n]];
      for (let i = 0; i < chain.length - 1; i++) bars.push([chain[i], chain[i + 1]]);
      return { nodes, beams, bars, deck, sup: [deck[0], deck[n]] };
    }
  };

  S.TRUSS = TRUSS;
  S.UNDER = UNDER;

  // ------------------------------------------------------------------ dessin axonométrique
  // Projection isométrique : x le long de la portée (vers la droite et le bas), y en profondeur
  // (vers la droite et le haut), z vertical
  const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
  const P = (x, y, z) => [(x + y) * C30, (x - y) * S30 - z];

  /* Assemble en SVG, ajusté à la boîte W × H :
     - des segments 3D [x1, y1, z1, x2, y2, z2, classe] ;
     - des faces pleines { poly: [[x, y, z], …], cls } (pochés), dessinées sous les traits. */
  function toSvg(segs, W = 200, H = 120, m = 8) {
    const pts = [], faces = [], lines = [];
    for (const s of segs) {
      if (s && s.poly) { const pp = s.poly.map(p => P(...p)); pts.push(...pp); faces.push([pp, s.cls || 'f']); continue; }
      const a = P(s[0], s[1], s[2]), b = P(s[3], s[4], s[5]);
      pts.push(a, b); lines.push([a, b, s[6] || 't']);
    }
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min((W - 2 * m) / Math.max(x1 - x0, 1e-6), (H - 2 * m) / Math.max(y1 - y0, 1e-6));
    const ox = (W - (x1 - x0) * k) / 2 - x0 * k, oy = (H - (y1 - y0) * k) / 2 - y0 * k;
    const f = p => `${(p[0] * k + ox).toFixed(1)} ${(p[1] * k + oy).toFixed(1)}`;
    const out = faces.map(([pp, c]) => `<path class="${c}" d="M${pp.map(f).join('L')}Z"/>`);
    // traits fins (gris) d'abord, traits forts ensuite
    const order = c => ({ g: 0, t: 1 }[c] ?? 2);
    const by = {};
    for (const [a, b, c] of lines) (by[c] = by[c] || []).push(`M${f(a)}L${f(b)}`);
    Object.entries(by).sort((A, B) => order(A[0]) - order(B[0])).forEach(([c, d]) => out.push(`<path class="${c}" d="${d.join('')}"/>`));
    return out.join('');
  }

  /* Cadres plans répétés en profondeur.
     g : { nodes: [[x, z]], bars: [[i, j]] } ; o.sup : nœuds portés par des poteaux (o.col = hauteur) ;
     o.link : nœuds reliés longitudinalement (pannes) ; o.count, o.sp : nombre de cadres et espacement */
  function frames(g, o = {}) {
    const xs = g.nodes.map(n => n[0]);
    const span = Math.max(...xs) - Math.min(...xs) || 1;
    const count = o.count || 4, sp = o.sp || span * 0.3;
    const segs = [];
    const zmax = Math.max(...g.nodes.map(n => n[1]));
    const link = o.link || g.nodes.map((n, i) => i).filter(i => Math.abs(g.nodes[i][1] - zmax) < 1e-6 || (o.linkAll));
    for (let k = count - 1; k >= 0; k--) {
      const y = k * sp, c = k === 0 ? 'a' : 't';
      for (const [i, j] of g.bars) segs.push([g.nodes[i][0], y, g.nodes[i][1], g.nodes[j][0], y, g.nodes[j][1], c]);
      for (const i of o.sup || []) {
        const [x, z] = g.nodes[i];
        segs.push([x, y, z, x, y, z - (o.col || span * 0.28), c]);
      }
    }
    for (const i of link) {
      const [x, z] = g.nodes[i];
      segs.push([x, 0, z, x, (count - 1) * sp, z, 't']);
    }
    for (const s of o.extra || []) segs.push(s);
    return toSvg(segs);
  }

  /* Surface paramétrée f(u, v) -> [x, y, z] ; o.nu / o.nv : nombre d'isolignes ; o.extra : segments */
  function surface(f, o = {}) {
    const nu = o.nu || 10, nv = o.nv || 10, st = o.steps || 24, segs = [];
    const line = (fixed, isU, cls) => {
      let prev = null;
      for (let s = 0; s <= st; s++) {
        const t = s / st, p = isU ? f(fixed, t) : f(t, fixed);
        if (prev) segs.push([...prev, ...p, cls]);
        prev = p;
      }
    };
    if (!o.noU) for (let i = 0; i <= nu; i++) line(i / nu, true, i === 0 || i === nu ? 'a' : 't');
    if (!o.noV) for (let j = 0; j <= nv; j++) line(j / nv, false, j === 0 || j === nv ? 'a' : 't');
    for (const s of o.extra || []) segs.push(s);
    return toSvg(segs);
  }

  // Poteaux verticaux (segments) aux points donnés
  const posts = (pts, h, c = 't') => pts.map(([x, y, z]) => [x, y, z, x, y, z - h, c]);
  // Polyline 3D -> segments
  const poly = (pts, c = 't', closed) => {
    const s = [];
    for (let i = 0; i < pts.length - 1; i++) s.push([...pts[i], ...pts[i + 1], c]);
    if (closed) s.push([...pts[pts.length - 1], ...pts[0], c]);
    return s;
  };
  const circle = (cx, cy, z, r, n = 40, c = 't') => poly(Array.from({ length: n }, (_, i) => [cx + r * Math.cos(2 * Math.PI * i / n), cy + r * Math.sin(2 * Math.PI * i / n), z]), c, true);

  S.axo = { P, toSvg, frames, surface, posts, poly, circle };
})(window.S);
