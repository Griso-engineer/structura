/* Utilitaires communs : création d'éléments DOM/SVG, formatage, stockage. */
window.S = window.S || {};
(function (S) {
  'use strict';

  function append(parent, children) {
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      parent.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
  }

  // el('div', {class: 'x', onclick: fn}, enfants...)
  S.el = function (tag, attrs, ...children) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'value') e.value = v;
      else if (k === 'checked') e.checked = !!v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    append(e, children);
    return e;
  };

  const NS = 'http://www.w3.org/2000/svg';
  S.svg = function (tag, attrs, ...children) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    append(e, children);
    return e;
  };

  // Format numérique français, compact
  S.fmt = function (v, d = 2) {
    if (v == null || !isFinite(v)) return '—';
    if (Math.abs(v) < 1e-12) return '0';
    const a = Math.abs(v);
    if (a < 1e-3 || a >= 1e7) return v.toExponential(2).replace('.', ',');
    return v.toLocaleString('fr-FR', { maximumFractionDigits: d });
  };
  // nombre de décimales adapté à l'amplitude
  S.fmtAuto = function (v) {
    const a = Math.abs(v);
    return S.fmt(v, a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3);
  };

  S.clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  S.store = {
    get(k, def) {
      try { const v = localStorage.getItem('structura:' + k); return v == null ? def : JSON.parse(v); }
      catch (e) { return def; }
    },
    set(k, v) {
      try { localStorage.setItem('structura:' + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ }
    }
  };

  // Info-bulle flottante partagée
  const tip = () => document.getElementById('tooltip');
  S.showTip = function (text, x, y) {
    const t = tip(); if (!t) return;
    t.textContent = text; t.hidden = false;
    const r = t.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
    t.style.left = left + 'px'; t.style.top = top + 'px';
  };
  S.hideTip = function () { const t = tip(); if (t) t.hidden = true; };

  S.download = function (filename, text, type = 'application/json') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = filename;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // En-tête de section numéroté (style Tracés)
  S.blockHead = function (num, title, text, tag = 'h1') {
    return S.el('header', { class: 'block-head' }, S.el('span', { class: 'num' }, num), S.el(tag, {}, title), text ? S.el('p', {}, text) : null);
  };

  /* Sélecteur illustré : items = [{id, label, svg (contenu SVG), group?}]
     viewBox des vignettes : 0 0 52 30. Renvoie {el, set(id)}. */
  S.picker = function (items, value, onSelect, opts = {}) {
    const box = S.el('div', { class: 'picker' + (opts.one ? ' one' : ''), role: 'radiogroup', 'aria-label': opts.label || '' });
    const buttons = {};
    let group = null;
    items.forEach(it => {
      if (it.group && it.group !== group) { group = it.group; box.append(S.el('div', { class: 'picker-group' }, group)); }
      const b = S.el('button', {
        type: 'button', 'aria-pressed': String(it.id === value), title: it.label,
        html: `<svg viewBox="0 0 52 30" aria-hidden="true">${it.svg || ''}</svg><span></span>`,
        onclick: () => { set(it.id); onSelect(it.id); }
      });
      b.querySelector('span').textContent = it.label;
      buttons[it.id] = b;
      box.append(b);
    });
    const set = id => Object.entries(buttons).forEach(([k, b]) => b.setAttribute('aria-pressed', String(k === id)));
    return { el: box, set };
  };

  /* Vignette schématique d'un modèle {nodes, elems} dans la boîte 52 × 30. */
  /* Articulations d'un modèle : { node: k, at: [x, y] direction de la barre } ; un nœud dont toutes les
     barres sont articulées n'a qu'une rotule (au nœud), sinon la rotule est sur la barre relâchée. */
  S.hingesOf = function (model) {
    const ns = model.nodes, cnt = ns.map(() => [0, 0]), out = [];
    model.elems.forEach(e => {
      if (cnt[e.n1 - 1]) { cnt[e.n1 - 1][0]++; if (e.rel1) cnt[e.n1 - 1][1]++; }
      if (cnt[e.n2 - 1]) { cnt[e.n2 - 1][0]++; if (e.rel2) cnt[e.n2 - 1][1]++; }
    });
    const full = cnt.map(([n, r]) => n >= 2 && r >= n - 1);
    full.forEach((f, k) => { if (f) out.push({ node: k }); });
    model.elems.forEach(e => {
      const a = ns[e.n1 - 1], b = ns[e.n2 - 1];
      if (!a || !b) return;
      if (e.rel1 && !full[e.n1 - 1]) out.push({ node: e.n1 - 1, toward: e.n2 - 1 });
      if (e.rel2 && !full[e.n2 - 1]) out.push({ node: e.n2 - 1, toward: e.n1 - 1 });
    });
    return out;
  };

  /* Schéma statique (élément <svg> complet) : barres, appuis, rotules. Largeur W fixe ; la hauteur
     s'adapte au contenu (entre 50 et Hmax) pour que les poutres plates restent lisibles. */
  S.staticSvg = function (model, W = 200, Hmax = 110, m = 14) {
    const ns = model.nodes;
    const xs = ns.map(n => n.x), ys = ns.map(n => n.y);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
    const s = Math.min((W - 2 * m) / Math.max(maxx - minx, 1e-6), (Hmax - 2 * m - 8) / Math.max(maxy - miny, 1e-6));
    const H = S.clamp((maxy - miny) * s + 2 * m + 8, 50, Hmax);
    const ox = (W - (maxx - minx) * s) / 2, oy = (H - 8 - (maxy - miny) * s) / 2;
    const X = x => ox + (x - minx) * s, Y = y => H - 8 - oy - (y - miny) * s;
    let out = '';
    model.elems.forEach(e => {
      const a = ns[e.n1 - 1], b = ns[e.n2 - 1];
      out += `<path class="${e.rel1 && e.rel2 ? 'sb' : 'sa'}" d="M${X(a.x).toFixed(1)} ${Y(a.y).toFixed(1)}L${X(b.x).toFixed(1)} ${Y(b.y).toFixed(1)}"/>`;
    });
    ns.forEach((n, k) => {
      const x = X(n.x), y = Y(n.y);
      const dirX = model.elems.reduce((d, e) => d + (e.n1 - 1 === k ? ns[e.n2 - 1].x - n.x : e.n2 - 1 === k ? ns[e.n1 - 1].x - n.x : 0), 0);
      const dirY = model.elems.reduce((d, e) => d + (e.n1 - 1 === k ? ns[e.n2 - 1].y - n.y : e.n2 - 1 === k ? ns[e.n1 - 1].y - n.y : 0), 0);
      if (n.sup === 'rotule') out += `<path class="ss" d="M${x} ${y} l-7 11 h14 z M${x - 11} ${y + 11} h22"/>`;
      else if (n.sup === 'appui') out += `<path class="ss" d="M${x} ${y} l-7 10 h14 z M${x - 11} ${y + 14} h22"/>`;
      else if (n.sup === 'encastrement' || n.sup === 'encastrement-glissant') {
        if (Math.abs(dirX) > Math.abs(dirY)) { const sx = dirX > 0 ? -1 : 1; out += `<path class="ss" d="M${x} ${y - 8} v16 M${x} ${y - 6} l${sx * 4} 4 M${x} ${y - 1} l${sx * 4} 4 M${x} ${y + 4} l${sx * 4} 4"/>`; }
        else out += `<path class="ss" d="M${x - 8} ${y} h16 M${x - 6} ${y} l-4 4 M${x - 1} ${y} l-4 4 M${x + 4} ${y} l-4 4"/>`;
      }
    });
    const hs = S.hingesOf(model);
    const pinNodes = new Set(ns.map((n, k) => (n.sup === 'rotule' || n.sup === 'appui') ? k : -1));
    // les barres bi-articulées (treillis, bielles, tirants) sont implicites : rotules dessinées seulement sur les éléments fléchis
    const bar = e => e.rel1 && e.rel2;
    const at = k => model.elems.filter(e => e.n1 - 1 === k || e.n2 - 1 === k);
    hs.forEach(h => {
      if (pinNodes.has(h.node) && h.toward == null) return;
      if (h.toward == null && at(h.node).every(bar)) return;
      if (h.toward != null && at(h.node).some(e => bar(e) && (e.n1 - 1 === h.toward || e.n2 - 1 === h.toward))) return;
      const n = ns[h.node];
      let x = X(n.x), y = Y(n.y);
      if (h.toward != null) { const o = ns[h.toward]; const dx = X(o.x) - x, dy = Y(o.y) - y, l = Math.hypot(dx, dy) || 1; x += dx / l * 4.5; y += dy / l * 4.5; }
      out += `<circle class="sh" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`;
    });
    return `<svg class="static" viewBox="0 0 ${W} ${H.toFixed(0)}" aria-hidden="true">${out}</svg>`;
  };

  S.thumb = function (model, opt = {}) {
    const ns = model.nodes;
    const xs = ns.map(n => n.x), ys = ns.map(n => n.y);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
    const W = 52, H = 30, m = 5;
    const s = Math.min((W - 2 * m) / Math.max(maxx - minx, 1e-6), (H - 2 * m - 4) / Math.max(maxy - miny, 1e-6));
    const ox = (W - (maxx - minx) * s) / 2, oy = (H - 4 - (maxy - miny) * s) / 2;
    const X = x => (ox + (x - minx) * s).toFixed(1), Y = y => (H - 4 - oy - (y - miny) * s).toFixed(1);
    let out = '';
    // rotules internes (hors treillis, trop nombreuses) et pieds articulés
    const hs = S.hingesOf(model);
    if (hs.length <= 4) hs.forEach(h => {
      const n = ns[h.node];
      let x = +X(n.x), y = +Y(n.y);
      if (h.toward != null) { const o = ns[h.toward]; const dx = +X(o.x) - x, dy = +Y(o.y) - y, l = Math.hypot(dx, dy) || 1; x += dx / l * 2.4; y += dy / l * 2.4; }
      opt.hinges = (opt.hinges || '') + `<circle class="th" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.5"/>`;
    });
    if (opt.load !== false) {
      // charge répartie sur les barres chargées (trait orange au-dessus)
      (model.eloads || []).forEach(l => {
        const e = model.elems[l.elem - 1]; if (!e || l.type === 'point') return;
        const a = ns[e.n1 - 1], b = ns[e.n2 - 1];
        out += `<path class="tq" d="M${X(a.x)} ${+Y(a.y) - 3.5} L${X(b.x)} ${+Y(b.y) - 3.5}"/>`;
      });
    }
    model.elems.forEach(e => {
      const a = ns[e.n1 - 1], b = ns[e.n2 - 1];
      const truss = e.rel1 && e.rel2;
      out += `<path class="${truss ? 'tl' : ''}" d="M${X(a.x)} ${Y(a.y)} L${X(b.x)} ${Y(b.y)}"/>`;
    });
    ns.forEach(n => {
      const x = +X(n.x), y = +Y(n.y);
      if (n.sup === 'rotule' || n.sup === 'appui') out += `<path class="tf" d="M${x} ${y} l-2.6 4 h5.2 z"/>`;
      else if (n.sup === 'encastrement') {
        const hz = ns.length && model.elems.some(e => { const o = ns[(e.n1 - 1 === ns.indexOf(n) ? e.n2 : e.n1) - 1]; return (e.n1 - 1 === ns.indexOf(n) || e.n2 - 1 === ns.indexOf(n)) && Math.abs(o.y - n.y) < 1e-9; });
        out += hz ? `<path d="M${x} ${y - 4} v8"/>` : `<path d="M${x - 4} ${y} h8"/>`;
      }
      // appui articulé : petit cercle au sommet du triangle
      if (n.sup === 'rotule' && hs.length <= 4) out += `<circle class="th" cx="${x}" cy="${y}" r="1.5"/>`;
    });
    return out + (opt.hinges || '');
  };

  // Paramètres de la route courante : #/solveur?preset=x  ->  {preset:'x'}
  S.routeQuery = function () {
    const q = (location.hash.split('?')[1] || '');
    const out = {};
    q.split('&').filter(Boolean).forEach(p => { const [k, v] = p.split('='); out[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return out;
  };
})(window.S);
