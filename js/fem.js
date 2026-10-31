/* Solveur RDM 2D — méthode des déplacements (éléments poutre d'Euler-Bernoulli).
 *
 * Unités : longueurs en m, forces en kN, moments en kN·m.
 * Repère global : X vers la droite, Y vers le haut, rotations positives anti-horaires.
 * Conventions de saisie : charges verticales positives vers le bas, Fx positive vers la droite,
 * moments nodaux positifs anti-horaires.
 * Conventions de résultats : N > 0 traction ; M > 0 fibre inférieure tendue (repère local) ;
 * V = dM/dx ; réactions Ry > 0 vers le haut.
 *
 * Modèle :
 *  nodes  : [{x, y, sup}]           sup ∈ libre | appui | glissant | rotule | encastrement
 *  elems  : [{n1, n2, sec, rel1, rel2, E?, A?, I?, h?}]   n1/n2 numérotés à partir de 1
 *  nloads : [{node, Fx, Fy, M}]
 *  eloads : [{elem, type: 'udl'|'point', dir: 'g'|'gp'|'l'|'gx', q, a}]
 *  selfWeight : booléen
 */
(function (S) {
  'use strict';

  // DDL bloqués : 0 = Ux, 1 = Uy, 2 = Rz
  const SUPPORTS = {
    libre: [], appui: [1], glissant: [0], rotule: [0, 1], encastrement: [0, 1, 2], 'encastrement-glissant': [0, 2]
  };
  S.SUPPORT_LABELS = {
    libre: 'Libre', appui: 'Appui simple (↕)', glissant: 'Appui glissant (↔)', rotule: 'Articulation',
    encastrement: 'Encastrement', 'encastrement-glissant': 'Encastrement glissant (↕ libre)'
  };

  const zeros = n => Array.from({ length: n }, () => new Float64Array(n));

  // Élimination de Gauss avec pivot partiel ; renvoie null si singulière (mécanisme)
  function solveLinear(A, b) {
    const n = b.length;
    let maxd = 0;
    for (let i = 0; i < n; i++) maxd = Math.max(maxd, Math.abs(A[i][i]));
    const tol = (maxd || 1) * 1e-12;
    for (let k = 0; k < n; k++) {
      let p = k, mv = Math.abs(A[k][k]);
      for (let i = k + 1; i < n; i++) { const v = Math.abs(A[i][k]); if (v > mv) { mv = v; p = i; } }
      if (mv < tol) return null;
      if (p !== k) { [A[k], A[p]] = [A[p], A[k]]; [b[k], b[p]] = [b[p], b[k]]; }
      const akk = A[k][k];
      for (let i = k + 1; i < n; i++) {
        const f = A[i][k] / akk;
        if (f === 0) continue;
        const Ai = A[i], Ak = A[k];
        for (let j = k; j < n; j++) Ai[j] -= f * Ak[j];
        b[i] -= f * b[k];
      }
    }
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
      x[i] = s / A[i][i];
    }
    return x;
  }

  function localStiffness(EA, EI, L) {
    const k = zeros(6);
    const a = EA / L, b = 12 * EI / L ** 3, c = 6 * EI / L ** 2, d = 4 * EI / L, e = 2 * EI / L;
    k[0][0] = a; k[0][3] = -a; k[3][0] = -a; k[3][3] = a;
    k[1][1] = b; k[1][2] = c; k[1][4] = -b; k[1][5] = c;
    k[2][1] = c; k[2][2] = d; k[2][4] = -c; k[2][5] = e;
    k[4][1] = -b; k[4][2] = -c; k[4][4] = b; k[4][5] = -c;
    k[5][1] = c; k[5][2] = e; k[5][4] = -c; k[5][5] = d;
    return k;
  }

  // Condensation statique des rotations relâchées (rotules en extrémité de barre)
  function condense(k, f0, r) {
    if (!r.length) return [k, f0];
    let inv;
    if (r.length === 1) inv = [[1 / k[r[0]][r[0]]]];
    else {
      const a = k[r[0]][r[0]], b = k[r[0]][r[1]], c = k[r[1]][r[0]], d = k[r[1]][r[1]];
      const det = a * d - b * c;
      inv = [[d / det, -b / det], [-c / det, a / det]];
    }
    const m = r.length;
    const kn = k.map(row => Float64Array.from(row));
    const fn = Float64Array.from(f0);
    for (let p = 0; p < 6; p++) {
      const t = new Array(m).fill(0);
      for (let a = 0; a < m; a++) for (let b = 0; b < m; b++) t[a] += k[p][r[b]] * inv[b][a];
      for (let q = 0; q < 6; q++) {
        let s = 0;
        for (let a = 0; a < m; a++) s += t[a] * k[r[a]][q];
        kn[p][q] -= s;
      }
      let s = 0;
      for (let a = 0; a < m; a++) s += t[a] * f0[r[a]];
      fn[p] -= s;
    }
    for (const i of r) { for (let q = 0; q < 6; q++) { kn[i][q] = 0; kn[q][i] = 0; } fn[i] = 0; }
    return [kn, fn];
  }

  // Composantes locales (px, py) d'une charge, pour une barre de cosinus directeurs (c, s)
  function loadLocal(ld, c, s) {
    const q = +ld.q || 0;
    let gx = 0, gy = 0;
    switch (ld.dir) {
      case 'l': return [0, -q];                       // perpendiculaire à la barre (vers -y local)
      case 'gx': gx = q; break;                        // horizontale globale
      case 'gp': gy = -q * Math.abs(c); break;         // gravité par m de projection horizontale
      default: gy = -q;                                // gravité par m de barre
    }
    return [c * gx + s * gy, -s * gx + c * gy];
  }

  function solve(model) {
    const nodes = model.nodes || [], els = model.elems || [];
    const nN = nodes.length;
    if (nN < 2 || !els.length) return { error: 'Le modèle doit comporter au moins 2 nœuds et 1 barre.' };
    const nd = 3 * nN;
    const K = zeros(nd);
    const F = new Float64Array(nd);
    const E = [];

    for (let ei = 0; ei < els.length; ei++) {
      const e = els[ei];
      const i = (e.n1 | 0) - 1, j = (e.n2 | 0) - 1;
      if (!nodes[i] || !nodes[j] || i === j) return { error: `Barre ${ei + 1} : nœuds invalides.` };
      const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
      const L = Math.hypot(dx, dy);
      if (!(L > 1e-9)) return { error: `Barre ${ei + 1} : longueur nulle.` };
      const c = dx / L, s = dy / L;
      const p = S.secProps(e);
      const EA = p.E * 1e3 * p.A * 1e-4;   // kN
      const EI = p.E * 1e3 * p.I * 1e-8;   // kN·m²
      if (!(EA > 0 && EI > 0)) return { error: `Barre ${ei + 1} : caractéristiques de section invalides.` };

      const f0 = new Float64Array(6);
      const loads = [];
      const addUdl = (px, py) => {
        loads.push({ type: 'udl', px, py });
        f0[0] -= px * L / 2; f0[3] -= px * L / 2;
        f0[1] -= py * L / 2; f0[4] -= py * L / 2;
        f0[2] -= py * L * L / 12; f0[5] += py * L * L / 12;
      };
      const addPoint = (Px, Py, a) => {
        a = S.clamp(a, 0, L); const b = L - a;
        loads.push({ type: 'point', px: Px, py: Py, a });
        f0[0] -= Px * b / L; f0[3] -= Px * a / L;
        f0[1] -= Py * b * b * (3 * a + b) / L ** 3; f0[4] -= Py * a * a * (a + 3 * b) / L ** 3;
        f0[2] -= Py * a * b * b / L ** 2; f0[5] += Py * a * a * b / L ** 2;
      };
      for (const ld of model.eloads || []) {
        if ((ld.elem | 0) !== ei + 1) continue;
        const [px, py] = loadLocal(ld, c, s);
        if (ld.type === 'point') addPoint(px, py, +ld.a || 0);
        else addUdl(px, py);
      }
      if (model.selfWeight) {
        const g = p.rho * p.A * 1e-4; // kN/m
        addUdl(-s * g, -c * g);
      }

      const rel = [];
      if (e.rel1) rel.push(2);
      if (e.rel2) rel.push(5);
      const [kc, fc] = condense(localStiffness(EA, EI, L), f0, rel);

      // T : local = T · global
      const T = zeros(6);
      for (const o of [0, 3]) { T[o][o] = c; T[o][o + 1] = s; T[o + 1][o] = -s; T[o + 1][o + 1] = c; T[o + 2][o + 2] = 1; }
      const dofs = [3 * i, 3 * i + 1, 3 * i + 2, 3 * j, 3 * j + 1, 3 * j + 2];
      const kT = zeros(6);
      for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) { let v = 0; for (let q = 0; q < 6; q++) v += kc[a][q] * T[q][b]; kT[a][b] = v; }
      for (let a = 0; a < 6; a++) {
        for (let b = 0; b < 6; b++) { let v = 0; for (let q = 0; q < 6; q++) v += T[q][a] * kT[q][b]; K[dofs[a]][dofs[b]] += v; }
        let fg = 0; for (let q = 0; q < 6; q++) fg += T[q][a] * fc[q];
        F[dofs[a]] -= fg;
      }
      E.push({ i, j, L, c, s, kc, fc, T, dofs, loads, EI, EA, p, rel });
    }

    for (const nl of model.nloads || []) {
      const n = (nl.node | 0) - 1;
      if (!nodes[n]) continue;
      F[3 * n] += +nl.Fx || 0;
      F[3 * n + 1] -= +nl.Fy || 0;
      F[3 * n + 2] += +nl.M || 0;
    }

    // Conditions d'appui
    const fixed = new Uint8Array(nd);
    nodes.forEach((n, k) => (SUPPORTS[n.sup] || []).forEach(d => (fixed[3 * k + d] = 1)));
    let maxd = 0;
    for (let d = 0; d < nd; d++) maxd = Math.max(maxd, Math.abs(K[d][d]));
    const autoFixed = new Uint8Array(nd);
    for (let d = 0; d < nd; d++) {
      // rotation nodale sans raideur (nœud dont toutes les barres sont articulées) : sans objet
      if (!fixed[d] && Math.abs(K[d][d]) <= maxd * 1e-14) {
        if (d % 3 === 2) { fixed[d] = 1; autoFixed[d] = 1; }
        else return { error: `Nœud ${Math.floor(d / 3) + 1} non relié à la structure.` };
      }
    }
    const free = [];
    for (let d = 0; d < nd; d++) if (!fixed[d]) free.push(d);
    const Kff = free.map(r => Float64Array.from(free, c => K[r][c]));
    const Ff = Float64Array.from(free, r => F[r]);
    const xf = free.length ? solveLinear(Kff, Ff) : new Float64Array(0);
    if (!xf || xf.some(v => !isFinite(v))) {
      return { error: 'Structure instable (mécanisme) : vérifiez les appuis et les articulations.' };
    }
    const D = new Float64Array(nd);
    free.forEach((d, k) => (D[d] = xf[k]));

    // Réactions
    const reactions = [];
    nodes.forEach((n, k) => {
      const ds = SUPPORTS[n.sup] || [];
      if (!ds.length) return;
      const R = [0, 0, 0];
      for (const d of ds) {
        const g = 3 * k + d;
        let v = -F[g];
        for (let q = 0; q < nd; q++) v += K[g][q] * D[q];
        R[d] = v;
      }
      reactions.push({ node: k + 1, Rx: R[0], Ry: R[1], M: R[2], dofs: ds });
    });

    // Efforts internes et déformée le long des barres
    let totalLoadX = 0, totalLoadY = 0;
    const elems = E.map((e, ei) => {
      const de = e.dofs.map(d => D[d]);
      const dl = new Float64Array(6);
      for (let a = 0; a < 6; a++) { let v = 0; for (let b = 0; b < 6; b++) v += e.T[a][b] * de[b]; dl[a] = v; }
      const f = new Float64Array(6);
      for (let a = 0; a < 6; a++) { let v = e.fc[a]; for (let b = 0; b < 6; b++) v += e.kc[a][b] * dl[b]; f[a] = v; }
      const { L } = e;

      const xsSet = [];
      const n = 60;
      for (let k = 0; k <= n; k++) xsSet.push(L * k / n);
      for (const ld of e.loads) if (ld.type === 'point') { xsSet.push(Math.max(0, ld.a - 1e-7 * L), Math.min(L, ld.a + 1e-7 * L)); }
      const xs = [...new Set(xsSet)].sort((a, b) => a - b);

      const Nn = [], Vv = [], Mm = [];
      for (const x of xs) {
        let sx = f[0], sy = f[1], m = -f[2] + f[1] * x;
        for (const ld of e.loads) {
          if (ld.type === 'udl') { sx += ld.px * x; sy += ld.py * x; m += ld.py * x * x / 2; }
          else if (ld.a < x) { sx += ld.px; sy += ld.py; m += ld.py * (x - ld.a); }
        }
        Nn.push(-sx); Vv.push(sy); Mm.push(m);
      }
      for (const ld of e.loads) {
        const lx = ld.type === 'udl' ? ld.px * L : ld.px, ly = ld.type === 'udl' ? ld.py * L : ld.py;
        totalLoadX += e.c * lx - e.s * ly; totalLoadY += e.s * lx + e.c * ly;
      }

      // Double intégration de la courbure M/EI, conditions v(0)=vi, v(L)=vj
      const theta = [0], phi = [0];
      for (let k = 1; k < xs.length; k++) {
        const h = xs[k] - xs[k - 1];
        theta[k] = theta[k - 1] + (Mm[k] + Mm[k - 1]) / 2 / e.EI * h;
        phi[k] = phi[k - 1] + (theta[k] + theta[k - 1]) / 2 * h;
      }
      const ui = dl[0], vi = dl[1], uj = dl[3], vj = dl[4];
      const th0 = (vj - vi - phi[phi.length - 1]) / L;
      const ux = [], uy = [], vrel = [];
      xs.forEach((x, k) => {
        const u = ui + (uj - ui) * x / L;
        const v = vi + th0 * x + phi[k];
        vrel.push(v - (vi + (vj - vi) * x / L));
        ux.push(e.c * u - e.s * v);
        uy.push(e.s * u + e.c * v);
      });

      const absMax = arr => arr.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      const W = e.p.I / (e.p.h / 20);                 // cm³
      let sig = 0;
      for (let k = 0; k < xs.length; k++) sig = Math.max(sig, Math.abs(10 * Nn[k] / e.p.A) + Math.abs(1000 * Mm[k] / W));
      const fRel = absMax(vrel);
      return {
        index: ei + 1, i: e.i, j: e.j, L, c: e.c, s: e.s, rel: e.rel, sec: e.p,
        xs, N: Nn, V: Vv, M: Mm, ux, uy,
        Nmin: Math.min(...Nn), Nmax: Math.max(...Nn), Vabs: absMax(Vv),
        Mmin: Math.min(...Mm), Mmax: Math.max(...Mm), sigma: sig,
        fRel, ratio: fRel > 1e-12 ? L / fRel : Infinity, end: Array.from(f)
      };
    });

    for (const nl of model.nloads || []) { totalLoadX += +nl.Fx || 0; totalLoadY -= +nl.Fy || 0; }
    const disp = nodes.map((n, k) => ({ ux: D[3 * k], uy: D[3 * k + 1], rz: autoFixed[3 * k + 2] ? null : D[3 * k + 2] }));
    let umax = 0;
    elems.forEach(e => e.ux.forEach((u, k) => (umax = Math.max(umax, Math.hypot(u, e.uy[k])))));
    const sumR = reactions.reduce((a, r) => [a[0] + r.Rx, a[1] + r.Ry], [0, 0]);

    return { ok: true, elems, reactions, disp, umax, loadSum: [totalLoadX, totalLoadY], reactSum: sumR };
  }

  /* Flambement d'un arc dans son plan (méthode présentée par D. Bitar, CTICM, 2020).
     Flambement asymétrique : l'arc est assimilé à un poteau de longueur S (demi-longueur de l'arc),
     Ncr = π²EI / (β·S)², β = 1 (arc bi-articulé ou à 3 articulations), β = 0,7 (arc bi-encastré).
     Vérification avec l'effort normal NEd au quart de la portée : αcr = Ncr / NEd.
     o : { L, f, forme: 'para' | 'circ', appuis: 'art' | 'enc', EI (kN·m²), NEd (kN), r (rayon de giration, m) } */
  S.arcBuckling = function (o) {
    const n = o.f / o.L;
    let Sh;
    if (o.forme === 'circ') {
      const R = (o.L * o.L / 4 + o.f * o.f) / (2 * o.f);
      Sh = R * Math.asin(Math.min(1, o.L / (2 * R)));
    } else Sh = 0.5 * o.L * (1 + 8 / 3 * n * n - 32 / 5 * n ** 4);
    const beta = o.appuis === 'enc' ? 0.7 : 1;
    const Ncr = Math.PI ** 2 * o.EI / (beta * Sh) ** 2;
    const alpha = o.NEd > 1e-9 ? Ncr / o.NEd : Infinity;
    let verdict, level;
    if (alpha < 3) { verdict = 'αcr < 3 : arc trop sensible au flambement, revoir la conception (sections, surbaissement).'; level = 'err'; }
    else if (alpha <= 10) { verdict = `3 ≤ αcr ≤ 10 : prendre en compte le second ordre — moments du 1er ordre × ${S.fmt(alpha / (alpha - 1), 2)}.`; level = 'warn'; }
    else { verdict = 'αcr > 10 : un calcul au premier ordre suffit.'; level = 'ok'; }
    const snap = n > 0.2 ? 'f/L > 0,2 : pas de risque de flambement par affaissement (snap-through).'
      : `f/L ≤ 0,2 : vérifier l'affaissement (snap-through) — critère 0,28·L/r > (L/r)crit, ici 0,28·L/r = ${o.r ? S.fmt(0.28 * o.L / o.r, 0) : '—'}.`;
    return { S: Sh, beta, Ncr, alpha, amp: alpha > 1 ? alpha / (alpha - 1) : Infinity, verdict, level, snap };
  };

  S.fem = { solve, SUPPORTS };
})(window.S);
