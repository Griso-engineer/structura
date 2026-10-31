/* Rendu SVG du modèle et des diagrammes (N, V, M, déformée). */
(function (S) {
  'use strict';
  const sv = S.svg;

  function arrow(g, x1, y1, x2, y2, cls, head = 7) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const bx = x2 - head * Math.cos(a), by = y2 - head * Math.sin(a);
    g.append(sv('line', { x1, y1, x2: bx, y2: by, class: cls }));
    const w = head * 0.45;
    g.append(sv('path', {
      d: `M${x2} ${y2} L${bx + w * Math.sin(a)} ${by - w * Math.cos(a)} L${bx - w * Math.sin(a)} ${by + w * Math.cos(a)} Z`,
      class: cls + 'h'
    }));
  }

  function momentArc(g, x, y, r, ccw, cls) {
    // arc visuel de 240° ; ccw = sens anti-horaire à l'écran
    const a0 = ccw ? -30 : 210, a1 = ccw ? 210 : -30;
    const p = a => [x + r * Math.cos(a * Math.PI / 180), y - r * Math.sin(a * Math.PI / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    g.append(sv('path', { d: `M${x0} ${y0} A${r} ${r} 0 1 ${ccw ? 0 : 1} ${x1} ${y1}`, class: cls }));
    const [xp, yp] = p(a1 - (ccw ? 25 : -25));
    arrow(g, xp, yp, x1, y1, cls, 6);
  }

  function supportSymbol(type, X, Y, angle) {
    const g = sv('g', { transform: `translate(${X} ${Y}) rotate(${angle})` });
    const hatch = (y, w = 14) => {
      let d = `M${-w} ${y} H${w}`;
      for (let i = -w + 4; i <= w; i += 5) d += ` M${i} ${y} l-5 6`;
      g.append(sv('path', { d, class: 'sup' }));
    };
    switch (type) {
      case 'rotule':
        g.append(sv('path', { d: 'M0 0 L-9 15 L9 15 Z', class: 'supf' })); hatch(15); break;
      case 'appui': case 'glissant':
        g.append(sv('path', { d: 'M0 0 L-9 13 L9 13 Z', class: 'supf' }));
        g.append(sv('circle', { cx: -5, cy: 16.5, r: 3, class: 'sup' }));
        g.append(sv('circle', { cx: 5, cy: 16.5, r: 3, class: 'sup' }));
        hatch(20); break;
      case 'encastrement':
        g.append(sv('path', { d: 'M-15 0 H15', class: 'sup', 'stroke-width': 3 })); hatch(0, 15); break;
      case 'encastrement-glissant':
        g.append(sv('path', { d: 'M-13 0 H13', class: 'sup', 'stroke-width': 3 }));
        g.append(sv('circle', { cx: -6, cy: 4, r: 3, class: 'sup' }));
        g.append(sv('circle', { cx: 6, cy: 4, r: 3, class: 'sup' }));
        hatch(8); break;
    }
    return g;
  }

  // Direction moyenne des barres issues d'un nœud (repère modèle)
  function nodeDir(model, k) {
    let dx = 0, dy = 0;
    for (const e of model.elems) {
      const o = e.n1 - 1 === k ? e.n2 - 1 : e.n2 - 1 === k ? e.n1 - 1 : -1;
      if (o < 0 || !model.nodes[o]) continue;
      const vx = model.nodes[o].x - model.nodes[k].x, vy = model.nodes[o].y - model.nodes[k].y;
      const l = Math.hypot(vx, vy) || 1;
      dx += vx / l; dy += vy / l;
    }
    return [dx, dy];
  }

  function supportAngle(model, k, type) {
    const [dx, dy] = nodeDir(model, k);
    if (type === 'encastrement' || type === 'encastrement-glissant') {
      if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 90 : -90;
      return dy < 0 ? 180 : 0;
    }
    if (type === 'glissant') return dx > 0 ? 90 : -90;
    return dy < -0.5 && Math.abs(dy) > Math.abs(dx) ? 180 : 0;
  }

  function fit(pts, W, m, hMin, hMax) {
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (const [x, y] of pts) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    if (!isFinite(minx)) { minx = 0; maxx = 1; miny = 0; maxy = 1; }
    const bw = Math.max(maxx - minx, 1e-6), bh = Math.max(maxy - miny, 1e-6);
    let s = (W - 2 * m) / bw;
    if (bh * s > hMax - 2 * m) s = (hMax - 2 * m) / bh;
    const H = Math.max(hMin, bh * s + 2 * m);
    return { s, W, H, cx: (minx + maxx) / 2, cy: (miny + maxy) / 2 };
  }

  const DIAG = {
    M: { key: 'M', sign: -1, unit: 'kN·m', name: 'Moment fléchissant' },
    V: { key: 'V', sign: 1, unit: 'kN', name: 'Effort tranchant' },
    N: { key: 'N', sign: 1, unit: 'kN', name: 'Effort normal' }
  };

  /**
   * Dessine une vue.
   * mode : 'model' | 'defo' | 'M' | 'V' | 'N'
   * opt  : { width, tr (transformation figée), labels, onNodeDown(k, ev) }
   * Retourne { tr, info }
   */
  function render(svg, model, res, mode, opt = {}) {
    svg.innerHTML = '';
    const W = opt.width || 800;
    const ok = res && res.ok;
    const nodes = model.nodes;
    const pts = nodes.map(n => [n.x, n.y]);
    let span = 1;
    {
      const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
      span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1e-3);
    }
    const info = {};

    // Pré-calcul des diagrammes en coordonnées modèle
    let dg = null;
    if (ok && mode === 'N') {
      let vmax = 0;
      res.elems.forEach(e => e.N.forEach(v => (vmax = Math.max(vmax, Math.abs(v)))));
      info.vmax = vmax;
    }
    // Élévation : contour des barres à leur hauteur de section réelle
    let ev = null;
    if (mode === 'elev') {
      ev = model.elems.map(e => {
        const a = nodes[e.n1 - 1], b = nodes[e.n2 - 1];
        if (!a || !b) return null;
        const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L, h = S.secProps(e).h / 2000;
        const poly = [[a.x + nx * h, a.y + ny * h], [b.x + nx * h, b.y + ny * h], [b.x - nx * h, b.y - ny * h], [a.x - nx * h, a.y - ny * h]];
        poly.forEach(p => pts.push(p));
        return { e, poly };
      }).filter(Boolean);
    }
    if (ok && DIAG[mode] && mode !== 'N') {
      const D = DIAG[mode];
      let vmax = 0;
      res.elems.forEach(e => e[D.key].forEach(v => (vmax = Math.max(vmax, Math.abs(v)))));
      const kd = vmax > 1e-9 ? 0.14 * span / vmax : 0;
      dg = vmax < 1e-6 ? null : res.elems.map(e => {
        const n1 = nodes[e.i];
        const base = e.xs.map(x => [n1.x + x * e.c, n1.y + x * e.s]);
        const off = e[D.key].map(v => D.sign * v * kd);
        const tip = base.map((b, k) => [b[0] - e.s * off[k], b[1] + e.c * off[k]]);
        tip.forEach(p => pts.push(p));
        return { e, base, tip, vals: e[D.key] };
      });
      info.vmax = vmax < 1e-6 ? 0 : vmax;
    }
    let df = null;
    if (ok && mode === 'defo') {
      const kd = res.umax > 1e-12 ? 0.08 * span / res.umax : 0;
      df = res.elems.map(e => {
        const n1 = nodes[e.i];
        const p = e.xs.map((x, k) => [n1.x + x * e.c + kd * e.ux[k], n1.y + x * e.s + kd * e.uy[k]]);
        p.forEach(q => pts.push(q));
        return { e, p, base: e.xs.map(x => [n1.x + x * e.c, n1.y + x * e.s]) };
      });
      info.amp = kd;
    }

    const isModel = mode === 'model';
    const tr = opt.tr || fit(pts, W, isModel ? Math.min(118, W * 0.23) : Math.min(40, W * 0.08), isModel ? 230 : 150, isModel ? W * 0.66 : W * 0.56);
    const X = x => tr.W / 2 + (x - tr.cx) * tr.s;
    const Y = y => tr.H / 2 - (y - tr.cy) * tr.s;
    svg.setAttribute('viewBox', `0 0 ${tr.W} ${tr.H}`);

    const gStruct = sv('g'), gDiag = sv('g'), gTop = sv('g'), gLab = sv('g');

    // Structure
    model.elems.forEach((e, k) => {
      const a = nodes[e.n1 - 1], b = nodes[e.n2 - 1];
      if (!a || !b) return;
      if (mode !== 'elev') gStruct.append(sv('line', { x1: X(a.x), y1: Y(a.y), x2: X(b.x), y2: Y(b.y), class: isModel ? 'el' : 'el ghost' },
        sv('title', {}, `Barre ${k + 1} — ${S.secProps(e).label}`)));
      if (isModel && opt.labels) {
        gLab.append(sv('text', { x: (X(a.x) + X(b.x)) / 2 + 6, y: (Y(a.y) + Y(b.y)) / 2 - 6, class: 'nlab' }, String(k + 1)));
      }
    });

    if (isModel) drawLoads(gTop, model, X, Y);

    // Diagrammes
    // étiquettes : on écarte celles qui tomberaient trop près d'une étiquette déjà posée
    const placed = [];
    const free = (x, y, d = 34) => { if (placed.some(([a, b]) => Math.hypot(a - x, b - y) < d)) return false; placed.push([x, y]); return true; };
    if (dg) {
      const D = DIAG[mode];
      const vmax = info.vmax || 1;
      for (const d of dg) {
        const B = d.base.map(p => [X(p[0]), Y(p[1])]), T = d.tip.map(p => [X(p[0]), Y(p[1])]);
        for (let k = 0; k < B.length - 1; k++) {
          const v = (d.vals[k] + d.vals[k + 1]) / 2;
          if (Math.abs(v) < vmax * 1e-6) continue;
          gDiag.append(sv('path', {
            d: `M${B[k]} L${B[k + 1]} L${T[k + 1]} L${T[k]} Z`, class: v >= 0 ? 'dpos' : 'dneg'
          }));
        }
        gDiag.append(sv('polyline', { points: [B[0], ...T, B[B.length - 1]].map(p => p.join(',')).join(' '), class: 'dline' }));
        // étiquettes : extrémités + extremum intérieur
        const vals = d.vals, n = vals.length;
        const vmin = Math.min(...vals), vmx = Math.max(...vals);
        const idx = [];
        if (vmx - vmin < vmax * 1e-4) idx.push(Math.floor(n / 2));
        else {
          idx.push(0, n - 1);
          let km = 0;
          for (let k = 1; k < n; k++) if (Math.abs(vals[k]) > Math.abs(vals[km])) km = k;
          if (km > 1 && km < n - 2 && Math.abs(Math.abs(vals[km]) - Math.max(Math.abs(vals[0]), Math.abs(vals[n - 1]))) > vmax * 0.03) idx.push(km);
        }
        for (const k of idx) {
          if (Math.abs(vals[k]) < vmax * 0.02) continue;
          const dx = T[k][0] - B[k][0], dy = T[k][1] - B[k][1], l = Math.hypot(dx, dy) || 1;
          let tx = T[k][0] + dx / l * 11, ty = T[k][1] + dy / l * 11 + 4;
          const along = k === 0 ? 1 : k === n - 1 ? -1 : 0; // décale vers l'intérieur de la barre
          tx += along * d.e.c * 16; ty -= along * d.e.s * 16;
          if (free(tx, ty)) gLab.append(sv('text', { x: tx, y: ty, class: 'val', 'text-anchor': 'middle' }, S.fmtAuto(vals[k])));
        }
      }
      info.title = D.name;
    }

    // Effort normal : bande centrée sur la barre, épaisseur proportionnelle à |N|, couleur selon le signe
    if (ok && mode === 'N') {
      // épaisseur max de bande liée à la taille des barres à l'écran, pour éviter les chevauchements
      const lens = res.elems.map(e => e.L * tr.s).sort((a, b) => a - b);
      const vmax = info.vmax || 1, wmax = S.clamp(0.1 * lens[Math.floor(lens.length / 2)], 2.5, 9);
      res.elems.forEach(e => {
        const n1 = nodes[e.i];
        const B = e.xs.map(x => [X(n1.x + x * e.c), Y(n1.y + x * e.s)]);
        const nx = e.s, ny = e.c; // normale à l'écran (y vers le bas)
        const w = e.N.map(v => Math.abs(v) < vmax * 1e-4 ? 0 : 1.2 + wmax * Math.abs(v) / vmax);
        const Nm = e.N[Math.floor(e.N.length / 2)];
        if (Math.max(...w) === 0) return;
        const up = B.map((p, k) => [p[0] + nx * w[k], p[1] + ny * w[k]]), dn = B.map((p, k) => [p[0] - nx * w[k], p[1] - ny * w[k]]).reverse();
        gDiag.append(sv('polygon', { points: [...up, ...dn].map(p => p.join(',')).join(' '), class: Nm >= 0 ? 'nband pos' : 'nband neg' }));
        const mm = B[Math.floor(B.length / 2)];
        if (Math.abs(Nm) >= vmax * 0.04 && free(mm[0], mm[1], 40)) {
          const m = B[Math.floor(B.length / 2)];
          let ang = Math.atan2(B[B.length - 1][1] - B[0][1], B[B.length - 1][0] - B[0][0]) * 180 / Math.PI;
          if (ang > 90) ang -= 180;
          if (ang < -90) ang += 180;
          gLab.append(sv('text', { x: m[0], y: m[1] + 3.5, class: 'val nval', 'text-anchor': 'middle', transform: `rotate(${ang.toFixed(1)} ${m[0]} ${m[1]})` }, S.fmtAuto(Nm)));
        }
      });
      info.title = DIAG.N.name;
    }
    if (ev) {
      for (const d of ev) {
        const p = S.secProps(d.e);
        gStruct.append(sv('polygon', { points: d.poly.map(q => `${X(q[0])},${Y(q[1])}`).join(' '), class: 'elevbar' }, sv('title', {}, `${p.label} — h = ${p.h} mm`)));
      }
    }
    if (df) {
      for (const d of df) {
        gDiag.append(sv('polyline', { points: d.p.map(p => `${X(p[0])},${Y(p[1])}`).join(' '), class: 'defo' }));
      }
      // point de déplacement maximal
      let best = null, um = -1;
      df.forEach(d => d.e.ux.forEach((u, k) => { const v = Math.hypot(u, d.e.uy[k]); if (v > um) { um = v; best = [d.p[k], d.base[k]]; } }));
      if (best && um > 1e-9) {
        const [p, b] = best, px = X(p[0]), py = Y(p[1]);
        gLab.append(sv('line', { x1: X(b[0]), y1: Y(b[1]), x2: px, y2: py, class: 'cursor' }));
        gLab.append(sv('circle', { cx: px, cy: py, r: 4.5, class: 'umax' }));
        gLab.append(sv('text', { x: px + 8, y: py + (py > tr.H / 2 ? -8 : 14), class: 'val' }, `umax = ${S.fmt(um * 1000, 1)} mm`));
      }
    }

    // Articulations : un seul cercle au nœud si toutes les barres y sont articulées
    const ends = nodes.map(() => [0, 0]); // [barres, extrémités articulées]
    model.elems.forEach(e => {
      if (ends[e.n1 - 1]) { ends[e.n1 - 1][0]++; if (e.rel1) ends[e.n1 - 1][1]++; }
      if (ends[e.n2 - 1]) { ends[e.n2 - 1][0]++; if (e.rel2) ends[e.n2 - 1][1]++; }
    });
    const fullHinge = ends.map(([n, r]) => n >= 2 && r >= n - 1);
    model.elems.forEach(e => {
      const a = nodes[e.n1 - 1], b = nodes[e.n2 - 1];
      if (!a || !b) return;
      const L = Math.hypot(X(b.x) - X(a.x), Y(b.y) - Y(a.y)) || 1;
      const ux = (X(b.x) - X(a.x)) / L, uy = (Y(b.y) - Y(a.y)) / L;
      const off = Math.min(7, L / 3);
      if (mode !== 'model' && mode !== 'elev') return;
      if (e.rel1 && !fullHinge[e.n1 - 1]) gTop.append(sv('circle', { cx: X(a.x) + ux * off, cy: Y(a.y) + uy * off, r: 3.6, class: 'hinge' }));
      if (e.rel2 && !fullHinge[e.n2 - 1]) gTop.append(sv('circle', { cx: X(b.x) - ux * off, cy: Y(b.y) - uy * off, r: 3.6, class: 'hinge' }));
    });
    if (mode === 'model' || mode === 'elev') nodes.forEach((n, k) => { if (fullHinge[k]) gTop.append(sv('circle', { cx: X(n.x), cy: Y(n.y), r: 3.6, class: 'hinge' })); });

    // Appuis et nœuds
    nodes.forEach((n, k) => {
      if (n.sup && n.sup !== 'libre') gStruct.append(supportSymbol(n.sup, X(n.x), Y(n.y), supportAngle(model, k, n.sup)));
    });
    if (isModel) {
      nodes.forEach((n, k) => {
        const c = sv('circle', { cx: X(n.x), cy: Y(n.y), r: 8, class: 'node', 'data-k': k },
          sv('title', {}, `Nœud ${k + 1} (${S.fmt(n.x)} ; ${S.fmt(n.y)}) — glisser pour déplacer`));
        if (opt.onNodeDown) c.addEventListener('pointerdown', ev => opt.onNodeDown(k, ev));
        gTop.append(c);
      });
      if (ok && opt.reactions !== false) drawReactions(gLab, model, res, X, Y);
      if (opt.dims) drawDims(gLab, model, X, Y);
    }

    svg.append(gStruct, gDiag, gTop, gLab);

    // Curseur de lecture
    if (ok && !isModel && mode !== 'elev') {
      const cur = sv('g', { style: 'display:none' });
      const cl = sv('line', { class: 'cursor' }), cd = sv('circle', { r: 3.5, class: 'cdot' });
      cur.append(cl, cd);
      svg.append(cur);
      const samples = [];
      res.elems.forEach((e, ei) => {
        const n1 = nodes[e.i];
        e.xs.forEach((x, k) => {
          const bx = X(n1.x + x * e.c), by = Y(n1.y + x * e.s);
          let tx = bx, ty = by;
          if (dg) { const t = dg[ei].tip[k]; tx = X(t[0]); ty = Y(t[1]); }
          if (df) { const t = df[ei].p[k]; tx = X(t[0]); ty = Y(t[1]); }
          samples.push({ e, k, x, bx, by, tx, ty });
        });
      });
      svg.onpointermove = ev => {
        const pt = toSvg(svg, ev.clientX, ev.clientY);
        let best = null, bd = Infinity;
        for (const s of samples) {
          const d = Math.min(Math.hypot(s.bx - pt[0], s.by - pt[1]), Math.hypot(s.tx - pt[0], s.ty - pt[1]));
          if (d < bd) { bd = d; best = s; }
        }
        if (!best || bd > 40) { cur.style.display = 'none'; S.hideTip(); return; }
        cur.style.display = '';
        cl.setAttribute('x1', best.bx); cl.setAttribute('y1', best.by); cl.setAttribute('x2', best.tx); cl.setAttribute('y2', best.ty);
        cd.setAttribute('cx', best.tx); cd.setAttribute('cy', best.ty);
        const e = best.e, k = best.k;
        const txt = mode === 'defo'
          ? `Barre ${e.index} · x = ${S.fmt(best.x)} m\nux = ${S.fmt(e.ux[k] * 1000)} mm\nuy = ${S.fmt(e.uy[k] * 1000)} mm`
          : `Barre ${e.index} · x = ${S.fmt(best.x)} m\nN = ${S.fmt(e.N[k])} kN\nV = ${S.fmt(e.V[k])} kN\nM = ${S.fmt(e.M[k])} kN·m`;
        S.showTip(txt, ev.clientX, ev.clientY);
      };
      svg.onpointerleave = () => { cur.style.display = 'none'; S.hideTip(); };
    } else {
      svg.onpointermove = null; svg.onpointerleave = null;
    }
    return { tr, info };
  }

  function drawLoads(g, model, X, Y) {
    const nodes = model.nodes;
    const qmax = Math.max(1e-9, ...(model.eloads || []).filter(l => l.type !== 'point').map(l => Math.abs(+l.q || 0)));
    const pmax = Math.max(1e-9, ...(model.eloads || []).filter(l => l.type === 'point').map(l => Math.abs(+l.q || 0)),
      ...(model.nloads || []).map(l => Math.max(Math.abs(+l.Fx || 0), Math.abs(+l.Fy || 0))));
    const stackUdl = {};
    // charge répartie des treillis : dessinée comme répartie, appliquée aux nœuds dans le calcul
    const virt = (model.dispLoads || []).flatMap(dl => dl.elems.map(e => ({ elem: e, type: 'udl', dir: 'g', q: dl.q, virtual: true })));
    const udls = [...(model.eloads || []), ...virt];
    // une seule étiquette par groupe de barres portant la même charge (arcs, treillis…)
    const labelOf = {};
    {
      const groups = {};
      udls.forEach((ld, i) => {
        if (ld.type === 'point' || !+ld.q) return;
        const e = model.elems[(ld.elem | 0) - 1];
        if (!e || !nodes[e.n1 - 1] || !nodes[e.n2 - 1]) return;
        const key = `${ld.q}|${ld.dir}|${ld.virtual ? 1 : 0}`;
        (groups[key] = groups[key] || []).push([i, (nodes[e.n1 - 1].x + nodes[e.n2 - 1].x) / 2]);
      });
      Object.values(groups).forEach(gr => {
        const xm = gr.reduce((s, [, x]) => s + x, 0) / gr.length;
        let best = gr[0];
        gr.forEach(it => { if (Math.abs(it[1] - xm) < Math.abs(best[1] - xm)) best = it; });
        labelOf[best[0]] = true;
      });
    }
    for (const [li, ld] of udls.entries()) {
      const e = model.elems[(ld.elem | 0) - 1];
      if (!e) continue;
      const a = nodes[e.n1 - 1], b = nodes[e.n2 - 1];
      if (!a || !b) continue;
      const q = +ld.q || 0;
      if (!q) continue;
      const ax = X(a.x), ay = Y(a.y), bx = X(b.x), by = Y(b.y);
      const L = Math.hypot(bx - ax, by - ay) || 1;
      // direction de la charge à l'écran (y vers le bas)
      let dx = 0, dy = 1;
      if (ld.dir === 'gx') { dx = 1; dy = 0; }
      else if (ld.dir === 'l') { // -y local du modèle (s, -c) => écran (s, c)
        const cm = b.x - a.x, sm = b.y - a.y, lm = Math.hypot(cm, sm) || 1;
        dx = sm / lm; dy = cm / lm;
      }
      if (q < 0) { dx = -dx; dy = -dy; }
      if (ld.type === 'point') {
        const t = S.clamp((+ld.a || 0) / Math.hypot(b.x - a.x, b.y - a.y), 0, 1);
        const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
        const len = 22 + 26 * Math.abs(q) / pmax;
        arrow(g, px - dx * (len + 3), py - dy * (len + 3), px - dx * 3, py - dy * 3, 'load');
        g.append(sv('text', { x: px - dx * (len + 10) + 4, y: py - dy * (len + 10), class: 'lv' }, `${S.fmt(Math.abs(q))} kN`));
        continue;
      }
      const key = ld.elem;
      const stack = stackUdl[key] || 0;
      stackUdl[key] = stack + 1;
      const len = 12 + 20 * Math.abs(q) / qmax;
      const base = 3 + stack * 34;
      const n = Math.max(1, Math.round(L / 26));
      const tails = [];
      for (let k = 0; k <= n; k++) {
        const px = ax + (bx - ax) * k / n - dx * base, py = ay + (by - ay) * k / n - dy * base;
        arrow(g, px - dx * len, py - dy * len, px, py, 'load', 5);
        tails.push([px - dx * len, py - dy * len]);
      }
      g.append(sv('polyline', { points: tails.map(p => p.join(',')).join(' '), class: 'load' }));
      if (labelOf[li]) {
        const mid = tails[Math.floor(tails.length / 2)];
        const lab = `${S.fmt(Math.abs(q))} kN/m${ld.dir === 'gp' ? ' (proj.)' : ''}`;
        g.append(sv('text', { x: mid[0] - dx * 10, y: mid[1] - dy * 8 + (dy < 0 ? 8 : 0), class: 'lv', 'text-anchor': 'middle' }, lab));
        if (ld.virtual) g.append(sv('text', { x: mid[0] - dx * 10, y: mid[1] - dy * 8 - 12, class: 'lv', 'text-anchor': 'middle', style: 'font-size:9px;font-weight:400' }, 'appliquée aux nœuds'));
      }
    }
    for (const nl of model.nloads || []) {
      if (nl.fromQ) continue;
      const n = nodes[(nl.node | 0) - 1];
      if (!n) continue;
      const x = X(n.x), y = Y(n.y);
      const fx = +nl.Fx || 0, fy = +nl.Fy || 0, m = +nl.M || 0;
      if (fy) {
        const len = 24 + 26 * Math.abs(fy) / pmax, d = Math.sign(fy);
        arrow(g, x, y - d * (len + 5), x, y - d * 5, 'load');
        g.append(sv('text', { x: x + 6, y: y - d * (len + 2) + (d < 0 ? 10 : 0), class: 'lv' }, `${S.fmt(Math.abs(fy))} kN`));
      }
      if (fx) {
        const len = 24 + 26 * Math.abs(fx) / pmax, d = Math.sign(fx);
        arrow(g, x - d * (len + 5), y, x - d * 5, y, 'load');
        g.append(sv('text', { x: x - d * (len + 8), y: y - 6, class: 'lv', 'text-anchor': d > 0 ? 'start' : 'end' }, `${S.fmt(Math.abs(fx))} kN`));
      }
      if (m) {
        momentArc(g, x, y, 15, m > 0, 'load');
        g.append(sv('text', { x: x + 18, y: y - 16, class: 'lv' }, `${S.fmt(Math.abs(m))} kN·m`));
      }
    }
  }

  // Cotes principales : chaîne horizontale des appuis (portées) et niveaux verticaux
  function drawDims(g, model, X, Y) {
    const ns = model.nodes;
    const xs = ns.map(n => n.x), ys = ns.map(n => n.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const uniq = arr => [...new Set(arr.map(v => +v.toFixed(3)))].sort((a, b) => a - b);
    const dimLine = (pa, pb, label, vertical) => {
      g.append(sv('line', { x1: pa[0], y1: pa[1], x2: pb[0], y2: pb[1], class: 'dim' }));
      [pa, pb].forEach(p => g.append(sv('line', { x1: p[0] - 4, y1: p[1] + 4, x2: p[0] + 4, y2: p[1] - 4, class: 'dim' })));
      const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2;
      if (vertical) g.append(sv('text', { x: mx + 6, y: my + 4, class: 'dimt' }, label));
      else g.append(sv('text', { x: mx, y: my - 5, class: 'dimt', 'text-anchor': 'middle' }, label));
    };
    // chaîne horizontale : extrémités et appuis
    let cx = uniq([x0, x1, ...ns.filter(n => n.sup && n.sup !== 'libre').map(n => n.x)]);
    if (cx.length > 6) cx = [x0, x1];
    const yd = Y(y0) + 90;
    for (let i = 0; i < cx.length - 1; i++) if (cx[i + 1] - cx[i] > 1e-6) dimLine([X(cx[i]), yd], [X(cx[i + 1]), yd], `${S.fmt(cx[i + 1] - cx[i], 2)} m`);
    if (cx.length > 2) dimLine([X(x0), yd + 18], [X(x1), yd + 18], `${S.fmt(x1 - x0, 2)} m`);
    // niveaux verticaux
    if (y1 - y0 > 1e-6) {
      let cy = uniq(ys);
      if (cy.length > 5) cy = [y0, y1];
      const xd = X(x1) + 60;
      for (let i = 0; i < cy.length - 1; i++) dimLine([xd, Y(cy[i])], [xd, Y(cy[i + 1])], `${S.fmt(cy[i + 1] - cy[i], 2)} m`, true);
    }
  }

  function drawReactions(g, model, res, X, Y) {
    let rmax = 1e-9;
    res.reactions.forEach(r => (rmax = Math.max(rmax, Math.abs(r.Rx), Math.abs(r.Ry))));
    const xs = model.nodes.map(n => n.x);
    const xmid = (Math.min(...xs) + Math.max(...xs)) / 2;
    for (const r of res.reactions) {
      const k = r.node - 1, n = model.nodes[k];
      const x = X(n.x), y = Y(n.y);
      const below = supportAngle(model, k, n.sup) !== 180;
      const dir = below ? 1 : -1;
      const side = n.x < xmid - 1e-9 ? -1 : 1; // côté extérieur
      const lines = [];
      if (r.dofs.includes(1) && Math.abs(r.Ry) > rmax * 1e-6) {
        const len = 16 + 16 * Math.abs(r.Ry) / rmax, y0 = y + dir * 28;
        if (r.Ry > 0 === below) arrow(g, x, y0 + dir * len, x, y0, 'react');
        else arrow(g, x, y0, x, y0 + dir * len, 'react');
        lines.push(`Ry ${r.Ry >= 0 ? '↑' : '↓'} ${S.fmt(Math.abs(r.Ry), 1)} kN`);
      }
      if (r.dofs.includes(0) && Math.abs(r.Rx) > rmax * 1e-6) {
        const len = 16 + 16 * Math.abs(r.Rx) / rmax, yy = y + dir * 6, x0 = x + side * 20;
        if ((r.Rx > 0) === (side < 0)) arrow(g, x0 + side * len, yy, x0, yy, 'react');
        else arrow(g, x0, yy, x0 + side * len, yy, 'react');
        lines.push(`Rx ${r.Rx >= 0 ? '→' : '←'} ${S.fmt(Math.abs(r.Rx), 1)} kN`);
      }
      if (r.dofs.includes(2) && Math.abs(r.M) > 1e-6) lines.push(`M ${r.M > 0 ? '↺' : '↻'} ${S.fmt(Math.abs(r.M), 1)} kN·m`);
      const tx = x + side * 12, ty0 = below ? y + 40 : y - 40 - 13 * (lines.length - 1);
      lines.forEach((t, i) => g.append(sv('text', { x: tx, y: ty0 + i * 13, class: 'rv', 'text-anchor': side < 0 ? 'end' : 'start' }, t)));
    }
  }

  function toSvg(svg, cx, cy) {
    const p = svg.createSVGPoint();
    p.x = cx; p.y = cy;
    const m = svg.getScreenCTM();
    if (!m) return [0, 0];
    const q = p.matrixTransform(m.inverse());
    return [q.x, q.y];
  }

  S.draw = {
    render, toSvg, DIAG,
    toModel(svg, tr, cx, cy) {
      const [x, y] = toSvg(svg, cx, cy);
      return [(x - tr.W / 2) / tr.s + tr.cx, -(y - tr.H / 2) / tr.s + tr.cy];
    },
    arrow, supportSymbol, momentArc
  };
})(window.S);
