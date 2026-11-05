/* Onglet « Comprendre le contreventement » : phénomènes illustrés et typologies. */
(function (S) {
  'use strict';
  const el = S.el, sv = S.svg, A = S.axo;
  S.pages = S.pages || {};

  // ------------------------------------------------------------------ dessins de bâtiments (isométrie)
  /* Ossature nx × ny travées sur nz niveaux, tracée en gris ; add(s, P) ajoute les éléments de
     stabilité (classe 'k' en corail pour les barres, faces pleines 'kw' pour les voiles, 'kf' pour les planchers). */
  function building(nx, ny, nz, add, o = {}) {
    const a = o.a || 4, b = o.b || 4, h = o.h || 3, s = [];
    const P = (i, j, k) => [i * a, j * b, k * h];
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) s.push([...P(i, j, 0), ...P(i, j, nz), 'g']);
    for (let k = 1; k <= nz; k++) {
      for (let j = 0; j <= ny; j++) s.push([...P(0, j, k), ...P(nx, j, k), 'g']);
      for (let i = 0; i <= nx; i++) s.push([...P(i, 0, k), ...P(i, ny, k), 'g']);
    }
    add(s, P, { nx, ny, nz });
    return A.toSvg(s);
  }
  // croix dans le plan de façade j (travée i, niveau k) ; croix dans le plan de pignon i (travée j)
  const X = (s, P, i, j, k) => s.push([...P(i, j, k), ...P(i + 1, j, k + 1), 'k'], [...P(i + 1, j, k), ...P(i, j, k + 1), 'k']);
  const Xy = (s, P, i, j, k) => s.push([...P(i, j, k), ...P(i, j + 1, k + 1), 'k'], [...P(i, j + 1, k), ...P(i, j, k + 1), 'k']);
  // panneau plein vertical entre (i0, j0) et (i1, j1), du niveau k0 au niveau k1
  const wall = (s, P, i0, j0, i1, j1, k0, k1) => s.push({ poly: [P(i0, j0, k0), P(i1, j1, k0), P(i1, j1, k1), P(i0, j0, k1)], cls: 'kw' });
  // plancher (diaphragme) au niveau k
  const floor = (s, P, nx, ny, k) => s.push({ poly: [P(0, 0, k), P(nx, 0, k), P(nx, ny, k), P(0, ny, k)], cls: 'kf' });
  // croix en plan (poutre au vent) dans la travée (i, j) au niveau k
  const Xz = (s, P, i, j, k) => s.push([...P(i, j, k), ...P(i + 1, j + 1, k), 'k'], [...P(i + 1, j, k), ...P(i, j + 1, k), 'k']);

  const TYPES = [
    { id: 'palee-croix', name: 'Palées en croix de Saint-André', svg: building(3, 2, 3, (s, P) => { for (let k = 0; k < 3; k++) { X(s, P, 1, 0, k); X(s, P, 1, 2, k); Xy(s, P, 0, 0, k); Xy(s, P, 3, 1, k); } }),
      text: 'Des diagonales croisées, souvent de simples ronds ou câbles ne travaillant qu\'en traction, triangulent une travée sur toute la hauteur. C\'est le système le plus léger et le plus rigide.',
      pros: ['Très rigide pour peu de matière', 'Assemblages articulés simples'], cons: ['Occupe une travée (baies, passages)', 'À répartir dans au moins trois plans'] },
    { id: 'palee-v', name: 'Palées en V, en K ou excentrées', svg: building(3, 2, 3, (s, P) => { for (let k = 0; k < 3; k++) { s.push([...P(1, 0, k), ...P(1.5, 0, k + 1), 'k'], [...P(2, 0, k), ...P(1.5, 0, k + 1), 'k'], [...P(0, 0, k), ...P(0, 1, k + 1), 'k'], [...P(0, 2, k), ...P(0, 1, k + 1), 'k']); } }),
      text: 'Les diagonales convergent vers le milieu de la poutre (V renversé) ou du poteau (K) pour laisser une ouverture. Les palées excentrées dissipent l\'énergie sismique par plastification d\'un tronçon de poutre.',
      pros: ['Libère une porte ou un couloir', 'Comportement sismique maîtrisé (excentrées)'], cons: ['Poutre sollicitée en flexion au point de convergence', 'Moins rigide que la croix'] },
    { id: 'voiles', name: 'Voiles de contreventement', svg: building(3, 2, 3, (s, P) => { wall(s, P, 0, 0, 1, 0, 0, 3); wall(s, P, 2, 2, 3, 2, 0, 3); wall(s, P, 3, 0, 3, 1, 0, 3); }),
      text: 'Murs pleins en béton armé, maçonnerie chaînée ou panneaux bois (CLT, ossature contreventée) travaillant comme des consoles verticales encastrées en fondation.',
      pros: ['Grande rigidité, bon comportement sismique', 'Double rôle porteur, coupe-feu, acoustique'], cons: ['Contraint le plan et les façades', 'Ouvertures à limiter'] },
    { id: 'noyau', name: 'Noyau central', svg: building(3, 3, 5, (s, P) => { wall(s, P, 1, 2, 2, 2, 0, 5); wall(s, P, 1, 1, 1, 2, 0, 5); wall(s, P, 2, 1, 2, 2, 0, 5); wall(s, P, 1, 1, 2, 1, 0, 5); }, { h: 2.4 }),
      text: 'Les cages d\'escaliers et d\'ascenseurs regroupées forment un tube fermé très rigide, qui stabilise tout le bâtiment grâce aux planchers qui lui transmettent les efforts.',
      pros: ['Façades libres', 'Grande raideur en torsion (section fermée)'], cons: ['Bras de levier limité pour les grandes hauteurs', 'Centrage indispensable pour éviter la torsion'] },
    { id: 'portiques-rigides', name: 'Portiques à nœuds rigides', svg: building(3, 2, 3, (s, P) => {
      for (let j = 0; j <= 2; j += 2) { for (let i = 0; i <= 3; i++) s.push([...P(i, j, 0), ...P(i, j, 3), 'k']); for (let k = 1; k <= 3; k++) s.push([...P(0, j, k), ...P(3, j, k), 'k']); }
      for (let i = 0; i <= 3; i++) for (let k = 1; k <= 3; k++) { const [x, y, z] = P(i, 0, k); s.push([x - 0.6, y, z, x, y, z - 0.6, 'k'], [x + 0.6, y, z, x, y, z - 0.6, 'k']); }
    }),
      text: 'Les assemblages poteaux-poutres encastrés (goussets aux angles) résistent par flexion. Aucune diagonale ni mur : façades et plan totalement libres.',
      pros: ['Liberté totale du plan et des façades'], cons: ['Beaucoup plus souple qu\'une triangulation', 'Assemblages et poteaux plus lourds'] },
    { id: 'outrigger', name: 'Noyau + outriggers', svg: building(4, 2, 8, (s, P) => {
      wall(s, P, 1.5, 0.6, 2.5, 0.6, 0, 8); wall(s, P, 2.5, 0.6, 2.5, 1.4, 0, 8);
      [4, 8].forEach(k => { s.push([...P(0, 1, k - 1), ...P(1.5, 1, k), 'k'], [...P(0, 1, k), ...P(1.5, 1, k - 1), 'k'], [...P(2.5, 1, k - 1), ...P(4, 1, k), 'k'], [...P(2.5, 1, k), ...P(4, 1, k - 1), 'k'], [...P(0, 1, k), ...P(4, 1, k), 'k']); });
      [0, 4].forEach(i => s.push([...P(i, 1, 0), ...P(i, 1, 8), 'k']));
    }, { h: 2, a: 3 }),
      text: 'Pour les tours, des poutres-treillis de grande hauteur (outriggers) relient le noyau aux poteaux de façade à certains étages techniques : les poteaux s\'opposent à la rotation du noyau.',
      pros: ['Réduit fortement le déplacement en tête', 'Adapté aux très grandes hauteurs'], cons: ['Étages techniques sacrifiés'] },
    { id: 'diaphragme', name: 'Diaphragmes et poutres au vent', svg: building(4, 2, 2, (s, P) => { floor(s, P, 4, 2, 1); for (let i = 0; i < 4; i++) Xz(s, P, i, 0, 2); }, { h: 3.5 }),
      text: 'Planchers et toitures doivent transmettre les efforts de façade aux éléments verticaux de stabilité. Une dalle béton le fait naturellement (diaphragme) ; en toiture légère, une poutre au vent triangulée en plan joue ce rôle.',
      pros: ['Coordonne tout le contreventement', 'Souvent gratuit avec une dalle béton'], cons: ['À vérifier pour les planchers légers et les grandes trémies'] }
  ];

  // ------------------------------------------------------------------ schémas des phénomènes
  /* Animation en boucle (comme un GIF) : draw(p) redessine la figure pour l'instant p ∈ [0, 1[ du cycle.
     Phase 1 : le mécanisme seul se déforme ; phase 2 : il recommence pendant que les remèdes, chargés
     de la même façon, apparaissent et ne bougent presque pas ; puis tout revient au repos. */
  const PERIOD = 8000;
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x;
  const easeOut = x => x < 0 ? 0 : x > 1 ? 1 : 1 - (1 - x) * (1 - x);
  function phases(p) {
    const s = p * PERIOD / 1000;            // secondes dans le cycle
    const back = s > 7.4 ? easeOut((s - 7.4) / 0.6) : 0;
    const left = s < 3.4 ? ease((s - 0.4) / 2.6) : s < 3.9 ? 1 - easeOut((s - 3.4) / 0.5) : ease((s - 3.9) / 2.6);
    const show = s < 3.4 ? 0 : s < 3.9 ? (s - 3.4) / 0.5 : 1;
    const right = s < 3.9 ? 0 : easeOut((s - 3.9) / 2.2);
    return { left: left * (1 - back), show: show * (1 - back), right: right * (1 - back) };
  }
  function loop(node, draw) {
    const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) { draw(0.8); return node; }
    let t0 = null, seen = false;
    const tick = t => {
      if (node.isConnected) seen = true; else if (seen) return;
      if (t0 == null) t0 = t;
      draw(((t - t0) % PERIOD) / PERIOD);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return node;
  }

  // b. Le rectangle articulé : mécanisme sous charge horizontale, et les trois remèdes
  function figMechanism() {
    const g = sv('svg', { viewBox: '0 0 474 190', class: 'diag mech' });
    // th : rotation des poteaux (rad) ; les barres gardent leur longueur
    const frame = (gg, x0, y0, w, h, th, opt = {}) => {
      const dx = h * Math.sin(th), hy = h * Math.cos(th);
      const A_ = [x0 + dx, y0 - hy], B_ = [x0 + w + dx, y0 - hy];
      gg.append(sv('path', { d: `M${x0} ${y0} V${y0 - h} H${x0 + w} V${y0}`, fill: 'none', stroke: 'var(--ghost)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }));
      gg.append(sv('path', { d: `M${x0} ${y0} L${A_[0]} ${A_[1]} L${B_[0]} ${B_[1]} L${x0 + w} ${y0}`, fill: opt.fill || 'none', stroke: 'var(--ink)', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }));
      if (opt.diag) gg.append(sv('line', { x1: x0, y1: y0, x2: B_[0], y2: B_[1], stroke: 'var(--c-coral)', 'stroke-width': 2.4 }));
      if (opt.rigid) [[A_, 1], [B_, -1]].forEach(([[x, y], sx]) => gg.append(sv('path', { d: `M${x} ${y} L${x + sx * 13} ${y} L${x - 13 * Math.tan(th)} ${y + 13} Z`, fill: 'var(--c-coral)' })));
      if (opt.hinges) [[x0, y0], [x0 + w, y0], A_, B_].forEach(([x, y]) => gg.append(sv('circle', { cx: x, cy: y, r: 4, class: 'hinge' })));
      [x0, x0 + w].forEach(x => gg.append(S.draw.supportSymbol('rotule', x, y0, 0)));
      S.draw.arrow(gg, A_[0] - (opt.al || 38), A_[1], A_[0] - 6, A_[1], 'load');
      if (opt.title) gg.append(sv('text', { x: x0 + w / 2, y: y0 + 34, 'text-anchor': 'middle', class: 'fx', style: `font-size:12px;fill:${opt.ok ? 'var(--ink)' : 'var(--c-red)'}` }, opt.title));
    };
    const gl = sv('g'), gr = sv('g');
    g.append(gl, gr);
    return loop(g, p => {
      const f = phases(p);
      gl.innerHTML = ''; gr.innerHTML = '';
      frame(gl, 50, 140, 110, 95, 0.62 * f.left, { hinges: true, title: f.left > 0.25 ? 'Mécanisme : il s\'effondre' : 'Rectangle articulé' });
      gr.setAttribute('opacity', f.show.toFixed(2));
      gr.append(sv('text', { x: 246, y: 30, style: 'font-size:11.5px;font-weight:700;fill:var(--ink)' }, 'Trois remèdes'));
      frame(gr, 250, 140, 46, 56, 0.05 * f.right, { diag: true, ok: true, title: 'Trianguler', al: 26 });
      frame(gr, 340, 140, 46, 56, 0.12 * f.right, { rigid: true, ok: true, title: 'Encastrer', al: 26 });
      frame(gr, 424, 140, 36, 56, 0.02 * f.right, { fill: 'var(--c-coral)', ok: true, title: 'Remplir', al: 26 });
    });
  }

  // flèche de charge en 3D, de p vers q (pointe ouverte dans le plan vertical)
  const arrow3 = (s, p, q) => {
    const d = q.map((v, i) => v - p[i]), L = Math.hypot(...d), u = d.map(v => v / L), k = Math.min(0.7, L * 0.3);
    s.push([...p, ...q, 'ld'], [...q, q[0] - u[0] * k, q[1] - u[1] * k, q[2] + 0.4 * k, 'ld'], [...q, q[0] - u[0] * k, q[1] - u[1] * k, q[2] - 0.4 * k, 'ld']);
  };
  const isoSvg = s => `<svg class="icon" viewBox="0 0 200 120" aria-hidden="true">${A.toSvg(s)}</svg>`;

  // c. Toiture non contreventée : les quatre façades sont stables, mais le plan de toiture se déforme
  // variant : null (mécanisme), 'plan' (croix dans le plan de toiture), 'diaph' (toiture rigide en diaphragme)
  function roofSvg(dy, variant) {
    const s = [], nx = 4, a = 3.5, b = 5, h = 3.5, DMAX = 2.3;
    const P = (i, j, k) => [i * a, j * b, k * h];
    s.push([0, b + DMAX, h, nx * a, b + DMAX, h, 'hid']);       // cadrage fixe pendant l'animation
    const top = (i, j) => { const p = P(i, j, 1); if (i > 0 && i < nx) p[1] += dy; return p; };
    // position initiale de la toiture (tiretés)
    for (let j = 0; j <= 1; j++) s.push([...P(0, j, 1), ...P(nx, j, 1), 'gd']);
    for (let i = 1; i < nx; i++) s.push([...P(i, 0, 1), ...P(i, 1, 1), 'gd']);
    // poteaux : ceux d'angle restent droits, les intermédiaires suivent la toiture
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= 1; j++) s.push([...P(i, j, 0), ...top(i, j), i > 0 && i < nx ? 'n' : 'g']);
    // toiture déformée : les panneaux d'extrémité deviennent des parallélogrammes
    for (let j = 0; j <= 1; j++) for (let i = 0; i < nx; i++) s.push([...top(i, j), ...top(i + 1, j), 'a']);
    for (let i = 0; i <= nx; i++) s.push([...top(i, 0), ...top(i, 1), 'a']);
    // façades contreventées : pignons et travées d'extrémité des longs pans (dans leur plan seulement)
    [0, nx].forEach(i => s.push([...P(i, 0, 0), ...P(i, 1, 1), 'k'], [...P(i, 1, 0), ...P(i, 0, 1), 'k']));
    [0, 1].forEach(j => [0, nx - 1].forEach(i => s.push([...P(i, j, 0), ...top(i + 1, j), 'k'], [...P(i + 1, j, 0), ...top(i, j), 'k'])));
    // remèdes dans le plan de toiture
    if (variant === 'plan') [0, nx - 1].forEach(i => s.push([...top(i, 0), ...top(i + 1, 1), 'k'], [...top(i + 1, 0), ...top(i, 1), 'k']));
    if (variant === 'diaph') s.push({ poly: [top(0, 0), ...Array.from({ length: nx - 1 }, (_, i) => top(i + 1, 0)), top(nx, 0), top(nx, 1), ...Array.from({ length: nx - 1 }, (_, i) => top(nx - 1 - i, 1)), top(0, 1)], cls: 'kf' });
    // vent sur le long pan
    for (let i = 1; i < nx; i++) { const [x, y, z] = P(i, 0, 1); arrow3(s, [x, y - 4.2, z], [x, y - 0.4, z]); }
    return isoSvg(s);
  }
  function figRoof() {
    const L = el('div'), R1 = el('div'), R2 = el('div'), right = el('div', { class: 'cv-rem' },
      el('b', {}, 'Deux remèdes'), el('figure', {}, R1, el('figcaption', {}, 'Contreventement en plan')), el('figure', {}, R2, el('figcaption', {}, 'Toiture en diaphragme')));
    const cap = el('figcaption', {});
    const box = el('div', { class: 'cv-anim' }, el('figure', { class: 'cv-main' }, L, cap), right);
    return loop(box, p => {
      const f = phases(p);
      L.innerHTML = roofSvg(2.2 * f.left, null);
      cap.textContent = f.left > 0.25 ? 'Mécanisme : la toiture se cisaille' : 'Toiture non contreventée';
      cap.className = f.left > 0.25 ? 'bad' : '';
      right.style.opacity = f.show.toFixed(2);
      R1.innerHTML = roofSvg(0.4 * f.right, 'plan');
      R2.innerHTML = roofSvg(0.25 * f.right, 'diaph');
    });
  }

  // d. Le trajet des efforts horizontaux : la même ossature chargée dans chacune des deux directions
  function figPath() {
    const nx = 3, ny = 3, nz = 3, a = 4, b = 4, h = 3;
    const P = (i, j, k) => [i * a, j * b, k * h];
    const one = dir => {
      const s = [], on = c => c === dir ? 'k' : 't';
      for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) s.push([...P(i, j, 0), ...P(i, j, nz), 'g']);
      for (let k = 1; k <= nz; k++) {
        for (let j = 0; j <= ny; j++) s.push([...P(0, j, k), ...P(nx, j, k), 'g']);
        for (let i = 0; i <= nx; i++) s.push([...P(i, 0, k), ...P(i, ny, k), 'g']);
      }
      for (let k = 1; k < nz; k++) floor(s, P, nx, ny, k);                 // planchers-diaphragmes
      // palées : travée centrale des quatre façades (celles parallèles à la charge travaillent)
      for (let k = 0; k < nz; k++) {
        [0, ny].forEach(j => s.push([...P(1, j, k), ...P(2, j, k + 1), on('x')], [...P(2, j, k), ...P(1, j, k + 1), on('x')]));
        [0, nx].forEach(i => s.push([...P(i, 1, k), ...P(i, 2, k + 1), on('y')], [...P(i, 2, k), ...P(i, 1, k + 1), on('y')]));
      }
      // toiture : croix dans les travées centrales, une bande par direction
      for (let j = 0; j < ny; j++) { const c = j === 1 ? 'k' : on('x'); s.push([...P(1, j, nz), ...P(2, j + 1, nz), c], [...P(2, j, nz), ...P(1, j + 1, nz), c]); }
      for (let i = 0; i < nx; i++) if (i !== 1) s.push([...P(i, 1, nz), ...P(i + 1, 2, nz), on('y')], [...P(i + 1, 1, nz), ...P(i, 2, nz), on('y')]);
      // vent sur la façade exposée
      for (let k = 1; k <= nz; k++) [0.5, 2.5].forEach(t => {
        if (dir === 'x') { const [x, y, z] = P(nx, t, k); arrow3(s, [x + 3.2, y, z], [x + 0.3, y, z]); }
        else { const [x, y, z] = P(t, 0, k); arrow3(s, [x, y - 3.2, z], [x, y - 0.3, z]); }
      });
      return el('figure', {}, el('div', { html: isoSvg(s) }), el('figcaption', {}, dir === 'x' ? 'Vent sur le pignon' : 'Vent sur la façade'));
    };
    return el('div', { class: 'cv-pair' }, one('x'), one('y'));
  }

  function figPlans() {
    const g = sv('svg', { viewBox: '0 0 420 150', class: 'diag' });
    const plan = (x0, walls, title, ok) => {
      g.append(sv('rect', { x: x0, y: 20, width: 110, height: 80, fill: 'none', stroke: 'var(--ghost)', 'stroke-width': 1.2 }));
      walls.forEach(([x1, y1, x2, y2]) => g.append(sv('line', { x1: x0 + x1, y1: 20 + y1, x2: x0 + x2, y2: 20 + y2, stroke: 'var(--c-coral)', 'stroke-width': 5 })));
      g.append(sv('text', { x: x0 + 55, y: 122, class: 'fx', 'text-anchor': 'middle', style: `font-size:12px;fill:${ok ? 'var(--ink)' : 'var(--c-red)'}` }, title));
      g.append(sv('text', { x: x0 + 55, y: 140, 'text-anchor': 'middle', style: 'font-size:11px' }, ok ? 'stable' : 'instable'));
    };
    plan(10, [[0, 20, 0, 60], [110, 20, 110, 60], [35, 0, 75, 0]], '3 plans non concourants', true);
    plan(150, [[0, 20, 0, 60], [110, 20, 110, 60], [55, 20, 55, 60]], 'plans parallèles', false);
    plan(290, [[0, 0, 30, 0], [0, 0, 0, 30], [10, 10, 30, 30]], 'plans concourants', false);
    return g;
  }

  // ------------------------------------------------------------------ page
  S.pages.contreventement = function (root) {
    const phen = (n, t, txt, fig, cap) => el('div', { class: 'phen' }, el('span', { class: 'num' }, n), el('div', {}, el('h3', {}, t), el('p', {}, txt)),
      fig ? el('div', { class: 'phen-fig' + (['cv-pair', 'cv-anim', 'mech'].some(c => fig.classList.contains(c)) ? ' wide' : '') }, fig, cap ? el('small', {}, cap) : null) : el('div'));
    root.append(el('div', { class: 'page' },
      S.blockHead('05', 'Comprendre le contreventement', 'Une structure ne porte pas que des charges verticales : vent, séisme et imperfections la poussent latéralement. Le contreventement est l\'ensemble des dispositions qui l\'empêchent de basculer, de se déformer en parallélogramme ou de tourner sur elle-même.'),
      el('section', { class: 'og-sec' },
        el('div', { class: 'sub-head' }, S.blockHead('5.1', 'Les phénomènes', null, 'h2')),
        phen('a', 'Les actions horizontales', 'Le vent exerce des pressions et des dépressions sur les façades et la toiture, proportionnelles à la surface exposée. Le séisme impose des forces d\'inertie proportionnelles à la masse du bâtiment. Enfin, les défauts de verticalité et la déformée elle-même créent des efforts horizontaux (effet P-Δ) qui aggravent l\'instabilité.'),
        phen('b', 'Le rectangle articulé est un mécanisme', 'Quatre barres articulées se déforment librement en parallélogramme sous la moindre charge horizontale : la structure s\'effondre. Trois remèdes : trianguler (diagonale), rendre les nœuds rigides (portique) ou remplir le cadre (voile).', figMechanism()),
        phen('c', 'Une toiture non contreventée est aussi un mécanisme', 'Le même phénomène se produit à plat. Même si les quatre façades sont contreventées, les portiques intermédiaires ne sont tenus que par la toiture : si celle-ci n\'est ni triangulée ni rigide, ses panneaux articulés se déforment en parallélogramme dans le plan horizontal, et les têtes de poteaux partent avec le vent. Les remèdes sont les mêmes qu\'en élévation : trianguler le plan de toiture (poutre au vent) ou le rendre rigide (diaphragme).', figRoof(),
          'Les façades contreventées (corail) tiennent les angles, mais rien ne tient les portiques intermédiaires : la toiture se cisaille. À droite, la même ossature avec une poutre au vent en toiture ou une toiture en diaphragme : elle ne bouge plus. Tireté : position initiale.'),
        phen('d', 'Le trajet des efforts horizontaux', 'Les façades reportent la pression du vent sur les planchers ; les planchers, rigides dans leur plan (diaphragmes), et en toiture une poutre au vent triangulée la transmettent aux palées verticales qui la descendent jusqu\'aux fondations. Chaque direction de vent mobilise ses propres éléments : la poutre au vent perpendiculaire au vent et les palées des façades parallèles au vent.', figPath(),
          'Travées centrales contreventées sur les quatre façades et en toiture, planchers en diaphragme. En corail, les éléments qui travaillent pour la direction de vent considérée ; en gris, ceux qui travaillent pour l\'autre direction.'),
        phen('e', 'Trois plans de stabilité non concourants', 'Pour bloquer les deux translations et la rotation d\'un niveau, il faut au moins trois plans de contreventement qui ne soient ni tous parallèles, ni concourants en un point. Si le centre de rigidité est éloigné du centre des masses, le bâtiment tourne : c\'est la torsion, à éviter en répartissant les éléments de stabilité de façon symétrique.', figPlans()),
        phen('f', 'La stabilité des éléments', 'Au-delà de la stabilité d\'ensemble, chaque élément élancé doit être maintenu : les poteaux comprimés contre le flambement, les membrures comprimées des poutres et des arcs contre le déversement, par des liernes, des pannes, des bracons ou une couverture rigide.')),
      el('section', { class: 'og-sec' },
        el('div', { class: 'sub-head' }, S.blockHead('5.2', 'Typologies de contreventement', 'En corail, les éléments de contreventement de chaque système ; en gris, le reste de l\'ossature.', 'h2')),
        el('div', { class: 'typo-grid' }, TYPES.map(t => el('article', { class: 'typo-card', style: 'cursor:default' },
          el('div', { class: 'fig' }, el('div', { html: `<svg class="icon" viewBox="0 0 200 120" aria-hidden="true">${t.svg}</svg>` })),
          el('div', { class: 'body' }, el('h3', {}, t.name), el('p', { style: 'font-size:13.5px;color:var(--ink-2);margin:0' }, t.text),
            el('ul', { class: 'list pro', style: 'font-size:13px' }, t.pros.map(x => el('li', {}, x))),
            el('ul', { class: 'list con', style: 'font-size:13px' }, t.cons.map(x => el('li', {}, x))))))))));
  };
})(window.S);
