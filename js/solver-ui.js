/* Interface du solveur RDM 2D.
   Panneau : 1 système · 2 géométrie · 3 sections · 4 charges · 5 affichage. */
(function (S) {
  'use strict';
  const el = S.el;
  S.pages = S.pages || {};

  const DIRS = { g: 'Gravité ↓', gp: 'Gravité (proj. horiz.)', l: 'Perpendiculaire', gx: 'Horizontale →' };
  // paramètres des modèles qui décrivent des charges (les autres décrivent la géométrie)
  const LOAD_KEYS = new Set(['q', 'P', 'a', 'xP', 'w', 'F', 'zF', 'mont', 'W']);

  let st = null;     // état courant
  let dom = null;    // références DOM

  const build = (id, params) => JSON.parse(JSON.stringify(S.PRESET[id].build(params)));

  function loadState(presetId) {
    const saved = S.store.get('solver2', null);
    if (!presetId && saved && saved.model && S.PRESET[saved.presetId]) {
      saved.params = Object.assign(S.presetDefaults(saved.presetId), saved.params);
      return saved;
    }
    const id = S.PRESET[presetId] ? presetId : 'portique';
    const params = S.presetDefaults(id);
    return { presetId: id, params, model: build(id, params), geomEdited: false, loadDetail: false, secMode: 'defaut', secAll: 'IPE300', secPer: [], labels: true, gtab: 'nodes' };
  }
  function save() { const { res, ...rest } = st; S.store.set('solver2', rest); }

  // Modèle effectivement calculé : sections imposées par la partie « Sections »
  function effModel() {
    const m = JSON.parse(JSON.stringify(st.model));
    m.elems.forEach((e, i) => {
      if (st.secMode === 'tout') e.sec = st.secAll;
      else if (st.secMode === 'barre' && st.secPer[i]) e.sec = st.secPer[i];
    });
    return m;
  }

  // ------------------------------------------------------------------ page
  S.pages.solveur = function (root) {
    const q = S.routeQuery();
    st = loadState(q.preset);
    if (q.preset) history.replaceState(null, '', '#/solveur');

    dom = {};
    dom.picker = S.picker(S.PRESETS.map(p => ({
      id: p.id, label: p.name, group: p.group, svg: S.thumb(p.build(S.presetDefaults(p.id)))
    })), st.presetId, id => applyPreset(id), { label: 'Système structurel' });
    dom.geom = el('div');
    dom.geomTables = el('div');
    dom.secs = el('div');
    dom.loads = el('div');
    dom.status = el('div', { class: 'status ok' });
    dom.kpis = el('div', { class: 'kpis' });
    dom.arc = el('div');
    dom.views = {};

    const mkView = (mode, title, width, wide) => {
      const svg = S.svg('svg', { class: 'diag' });
      const sub = el('small', { class: 'muted' });
      const v = el('div', { class: 'view' + (wide ? ' wide' : '') }, el('div', { class: 'vh' }, el('h3', {}, title), sub), svg);
      dom.views[mode] = { svg, sub, width, card: v };
      return v;
    };
    const step = (n, t) => el('h4', {}, el('span', { class: 'step' }, n), t);

    const side = el('aside', { class: 'side' },
      el('div', { class: 'side-sec' },
        step(1, 'Système structurel'),
        dom.picker.el,
        el('div', { class: 'row-actions' },
          el('button', { class: 'btn sm', onclick: () => applyPreset(st.presetId) }, '↺ Réinitialiser'),
          el('button', { class: 'btn sm', onclick: exportPdf }, '⤓ Fiche PDF'))),
      el('div', { class: 'side-sec' }, step(2, 'Géométrie'), dom.geom,
        el('details', { class: 'more' }, el('summary', {}, 'Modifier la géométrie à la main (nœuds, barres)'), dom.geomTables)),
      el('div', { class: 'side-sec' }, step(3, 'Sections'), dom.secs),
      el('div', { class: 'side-sec' }, step(4, 'Charges'), dom.loads),
      el('div', { class: 'side-sec' }, step(5, 'Affichage'),
        el('label', { class: 'field-row', style: 'grid-template-columns:auto 1fr;margin-bottom:8px' },
          el('input', { type: 'checkbox', checked: st.labels, onchange: e => { st.labels = e.target.checked; changed(); } }),
          'Numéros des barres'),
        el('p', { class: 'muted', style: 'font-size:12px;margin:0' },
          'Charges verticales positives vers le bas, horizontales vers la droite. N > 0 traction ; M > 0 fibre inférieure tendue (tracé côté fibre tendue).'))
    );

    const main = el('div', { class: 'views' },
      dom.status, dom.kpis, dom.arc,
      el('div', { class: 'view-grid' },
        mkView('model', 'Modèle, charges et cotes', 480),
        mkView('elev', 'Élévation à l\'échelle', 480),
        mkView('defo', 'Déformée', 480),
        mkView('M', 'Moment fléchissant M (kN·m)', 480),
        mkView('V', 'Effort tranchant V (kN)', 480),
        mkView('N', 'Effort normal N (kN)', 480)),
      el('div', { class: 'legend' },
        el('span', {}, el('i', { style: 'background:var(--pos)' }), 'Positif · traction'),
        el('span', {}, el('i', { style: 'background:var(--neg)' }), 'Négatif · compression'),
        el('span', {}, el('i', { style: 'background:var(--react)' }), 'Réactions'),
        el('span', {}, el('i', { style: 'background:var(--load)' }), 'Charges'),
        el('span', {}, 'Survolez un diagramme pour lire les valeurs ; glissez un nœud pour le déplacer.'))
    );

    root.append(el('div', { class: 'page wide' },
      S.blockHead('03', 'Solveur RDM 2D', 'Poutres, treillis, poutres sous-tendues, portiques et arcs plans : calcul par la méthode des déplacements, diagrammes N, V, M et déformée mis à jour en direct.'),
      el('div', { class: 'solver' }, side, main)));

    renderGeom(); renderGeomTables(); renderSecs(); renderLoads();
    update(); save();
  };

  function applyPreset(id) {
    st.presetId = id;
    st.params = S.presetDefaults(id);
    st.model = build(id, st.params);
    st.geomEdited = false; st.loadDetail = false; st.secPer = [];
    dom.picker.set(id);
    renderGeom(); renderGeomTables(); renderSecs(); renderLoads(); changed();
  }

  // ------------------------------------------------------------------ paramètres (curseurs)
  const fmtParam = (v, p) => `${S.fmt(v)}${p.unit ? ' ' + p.unit : ''}`;
  function paramControl(p) {
    if (p.type === 'select') {
      const s = el('select', { onchange: e => setParam(p.k, e.target.value) }, p.options.map(([v, l]) => el('option', { value: v }, l)));
      s.value = st.params[p.k];
      return el('label', { class: 'param' }, el('span', { class: 'lab' }, p.label), s);
    }
    const out = el('output', {}, fmtParam(st.params[p.k], p));
    const r = el('input', {
      type: 'range', min: p.min, max: p.max, step: p.step, value: st.params[p.k],
      oninput: e => { const v = +e.target.value; out.textContent = fmtParam(v, p); setParam(p.k, v); }
    });
    return el('label', { class: 'param' }, el('span', { class: 'lab' }, p.label, out), r);
  }

  function setParam(k, v) {
    st.params[k] = v;
    const base = build(st.presetId, st.params);
    if (LOAD_KEYS.has(k)) {
      // charge : on ne touche pas à la géométrie
      st.model.nloads = base.nloads; st.model.eloads = base.eloads; st.model.dispLoads = base.dispLoads;
    } else {
      // géométrie : modèle régénéré ; les charges détaillées sont conservées si elles restent valides
      if (st.loadDetail) {
        base.nloads = st.model.nloads.filter(l => l.node <= base.nodes.length);
        base.eloads = st.model.eloads.filter(l => l.elem <= base.elems.length);
      }
      if (base.elems.length !== st.model.elems.length) st.secPer = [];
      st.model = base;
      if (st.geomEdited) { st.geomEdited = false; renderGeom(); }
      renderGeomTables(); renderSecs();
    }
    changed();
  }

  function renderGeom() {
    const P = S.PRESET[st.presetId];
    dom.geom.innerHTML = '';
    P.params.filter(p => !LOAD_KEYS.has(p.k)).forEach(p => dom.geom.append(paramControl(p)));
    if (st.geomEdited) dom.geom.append(el('p', { class: 'muted', style: 'font-size:12px;margin:4px 0 0' }, 'Géométrie modifiée à la main : toucher un curseur la régénère.'));
  }

  // ------------------------------------------------------------------ sections
  function renderSecs() {
    const box = dom.secs;
    box.innerHTML = '';
    const modes = [['defaut', 'Par défaut'], ['tout', 'Même section partout'], ['barre', 'Barre par barre']];
    box.append(el('div', { class: 'dtabs' }, modes.map(([k, l]) => el('button', {
      class: st.secMode === k ? 'on' : '', onclick: () => { st.secMode = k; renderSecs(); changed(); }
    }, l))));
    if (st.secMode === 'defaut') {
      const used = {};
      st.model.elems.forEach(e => { const l = S.secProps(e).label; used[l] = (used[l] || 0) + 1; });
      box.append(el('p', { class: 'muted', style: 'font-size:12.5px;margin:0' }, 'Sections proposées par le modèle : ',
        Object.entries(used).map(([l, n]) => `${l} (${n})`).join(', '), '.'));
    } else if (st.secMode === 'tout') {
      box.append(S.sectionSelect(st.secAll, v => { st.secAll = v; changed(); }, false));
    } else {
      const tb = el('tbody');
      st.model.elems.forEach((e, i) => {
        const s = S.sectionSelect(st.secPer[i] || e.sec, v => { st.secPer[i] = v; changed(); }, false);
        tb.append(el('tr', {}, el('td', { class: 'id' }, i + 1), el('td', { class: 'id', style: 'width:auto' }, `${e.n1}–${e.n2}`), el('td', {}, s)));
      });
      box.append(el('div', { class: 'tbl-scroll' }, el('table', { class: 'edit' }, el('thead', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, 'Nœuds'), el('th', {}, 'Section'))), tb)));
    }
  }

  // ------------------------------------------------------------------ charges
  function renderLoads() {
    const box = dom.loads, P = S.PRESET[st.presetId];
    box.innerHTML = '';
    const lp = P.params.filter(p => LOAD_KEYS.has(p.k));
    if (!st.loadDetail) {
      if (lp.length) lp.forEach(p => box.append(paramControl(p)));
      else box.append(el('p', { class: 'muted' }, 'Ce modèle n\'a pas de charge paramétrée.'));
    }
    box.append(el('label', { class: 'field-row', style: 'grid-template-columns:auto 1fr;margin:8px 0' },
      el('input', { type: 'checkbox', checked: st.loadDetail, onchange: e => { st.loadDetail = e.target.checked; if (!st.loadDetail) { const b = build(st.presetId, st.params); st.model.nloads = b.nloads; st.model.eloads = b.eloads; st.model.dispLoads = b.dispLoads; } else { delete st.model.dispLoads; st.model.nloads.forEach(l => delete l.fromQ); } renderLoads(); changed(); } }),
      'Définition détaillée (tableaux de charges)'));
    if (st.loadDetail) box.append(loadTables());
  }

  function numIn(obj, key, step = 'any') {
    return el('input', { type: 'number', step, value: obj[key] ?? 0, oninput: e => { const v = parseFloat(e.target.value); obj[key] = isFinite(v) ? v : 0; changed(); } });
  }
  function intIn(obj, key, onGeom) {
    return el('input', { type: 'number', step: 1, min: 1, value: obj[key], oninput: e => { const v = parseInt(e.target.value, 10); if (v > 0) { obj[key] = v; if (onGeom) geomEdited(); else changed(); } } });
  }
  const del = fn => el('button', { class: 'btn ghost sm', title: 'Supprimer', onclick: fn }, '✕');

  function loadTables() {
    const m = st.model, wrap = el('div');
    const tn = el('tbody');
    m.nloads.forEach((l, k) => tn.append(el('tr', {}, el('td', {}, intIn(l, 'node')), el('td', {}, numIn(l, 'Fx')), el('td', {}, numIn(l, 'Fy')),
      el('td', {}, numIn(l, 'M')), el('td', {}, del(() => { m.nloads.splice(k, 1); renderLoads(); changed(); })))));
    const te = el('tbody');
    m.eloads.forEach((l, k) => {
      const type = el('select', { onchange: e => { l.type = e.target.value; renderLoads(); changed(); } },
        el('option', { value: 'udl' }, 'Répartie'), el('option', { value: 'point' }, 'Ponctuelle'));
      type.value = l.type;
      const dir = el('select', { onchange: e => { l.dir = e.target.value; changed(); } }, Object.keys(DIRS).map(d => el('option', { value: d }, DIRS[d])));
      dir.value = l.dir || 'g';
      te.append(el('tr', {}, el('td', {}, intIn(l, 'elem')), el('td', {}, type), el('td', {}, dir), el('td', {}, numIn(l, 'q')),
        el('td', {}, l.type === 'point' ? numIn(l, 'a', 0.1) : el('span', { class: 'muted' }, '—')),
        el('td', {}, del(() => { m.eloads.splice(k, 1); renderLoads(); changed(); }))));
    });
    wrap.append(
      el('h5', {}, 'Charges sur barres'),
      el('table', { class: 'edit' }, el('thead', {}, el('tr', {}, el('th', {}, 'Barre'), el('th', {}, 'Type'), el('th', {}, 'Direction'),
        el('th', { title: 'kN/m (répartie) ou kN (ponctuelle)' }, 'q / P'), el('th', { title: 'Distance depuis le premier nœud de la barre' }, 'a (m)'), el('th'))), te),
      el('div', { class: 'row-actions' }, el('button', { class: 'btn sm', onclick: () => { m.eloads.push({ elem: 1, type: 'udl', dir: 'g', q: 10, a: 0 }); renderLoads(); changed(); } }, '+ Charge sur barre')),
      el('h5', {}, 'Charges aux nœuds'),
      el('table', { class: 'edit' }, el('thead', {}, el('tr', {}, el('th', {}, 'Nœud'), el('th', {}, 'Fx → kN'), el('th', {}, 'Fy ↓ kN'), el('th', {}, 'M ↺ kN·m'), el('th'))), tn),
      el('div', { class: 'row-actions' }, el('button', { class: 'btn sm', onclick: () => { m.nloads.push({ node: m.nodes.length, Fx: 0, Fy: 10, M: 0 }); renderLoads(); changed(); } }, '+ Charge nodale')));
    return wrap;
  }

  // ------------------------------------------------------------------ géométrie détaillée
  function geomEdited() { if (!st.geomEdited) { st.geomEdited = true; renderGeom(); } changed(); }

  function renderGeomTables() {
    const m = st.model, t = dom.geomTables;
    t.innerHTML = '';
    t.append(el('div', { class: 'dtabs' }, [['nodes', 'Nœuds'], ['elems', 'Barres']].map(([k, l]) => el('button', {
      class: st.gtab === k ? 'on' : '', onclick: () => { st.gtab = k; renderGeomTables(); }
    }, l))));
    if (st.gtab === 'nodes') {
      const tb = el('tbody');
      m.nodes.forEach((n, k) => {
        const sup = el('select', { onchange: e => { n.sup = e.target.value; geomEdited(); } },
          Object.keys(S.SUPPORT_LABELS).map(s => el('option', { value: s }, S.SUPPORT_LABELS[s])));
        sup.value = n.sup || 'libre';
        const coord = key => el('input', { type: 'number', step: 0.1, value: n[key], oninput: e => { const v = parseFloat(e.target.value); if (isFinite(v)) { n[key] = v; geomEdited(); } } });
        tb.append(el('tr', {}, el('td', { class: 'id' }, k + 1), el('td', {}, coord('x')), el('td', {}, coord('y')), el('td', {}, sup), el('td', {}, del(() => removeNode(k)))));
      });
      t.append(el('table', { class: 'edit' }, el('thead', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, 'X (m)'), el('th', {}, 'Y (m)'), el('th', {}, 'Appui'), el('th'))), tb),
        el('div', { class: 'row-actions' }, el('button', {
          class: 'btn sm', onclick: () => { const l = m.nodes[m.nodes.length - 1] || { x: 0, y: 0 }; m.nodes.push({ x: l.x + 1, y: l.y, sup: 'libre' }); renderGeomTables(); geomEdited(); }
        }, '+ Nœud')));
    } else {
      const tb = el('tbody');
      m.elems.forEach((e, k) => {
        const chk = key => el('input', { type: 'checkbox', checked: e[key], onchange: ev => { e[key] = ev.target.checked; geomEdited(); } });
        tb.append(el('tr', {}, el('td', { class: 'id' }, k + 1), el('td', {}, intIn(e, 'n1', true)), el('td', {}, intIn(e, 'n2', true)),
          el('td', { class: 'chk' }, chk('rel1')), el('td', { class: 'chk' }, chk('rel2')), el('td', {}, del(() => { removeElem(k); renderGeomTables(); renderSecs(); geomEdited(); }))));
      });
      t.append(el('table', { class: 'edit' }, el('thead', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, 'Nœud 1'), el('th', {}, 'Nœud 2'),
        el('th', { title: 'Articulation en début de barre' }, 'Art. 1'), el('th', { title: 'Articulation en fin de barre' }, 'Art. 2'), el('th'))), tb),
        el('div', { class: 'row-actions' }, el('button', {
          class: 'btn sm', onclick: () => { const n = m.nodes.length, last = m.elems[m.elems.length - 1]; m.elems.push({ n1: Math.max(1, n - 1), n2: n, sec: last ? last.sec : 'IPE300', rel1: false, rel2: false }); renderGeomTables(); renderSecs(); geomEdited(); }
        }, '+ Barre')),
        el('p', { class: 'muted', style: 'font-size:12px' }, 'Les sections se règlent dans la partie 3.'));
    }
  }
  function removeElem(k) {
    const m = st.model;
    m.elems.splice(k, 1); st.secPer.splice(k, 1);
    m.eloads = m.eloads.filter(l => l.elem !== k + 1).map(l => (l.elem > k + 1 ? { ...l, elem: l.elem - 1 } : l));
  }
  function removeNode(k) {
    const m = st.model, id = k + 1;
    for (let i = m.elems.length - 1; i >= 0; i--) if (m.elems[i].n1 === id || m.elems[i].n2 === id) removeElem(i);
    m.elems.forEach(e => { if (e.n1 > id) e.n1--; if (e.n2 > id) e.n2--; });
    m.nloads = m.nloads.filter(l => l.node !== id).map(l => (l.node > id ? { ...l, node: l.node - 1 } : l));
    m.nodes.splice(k, 1);
    renderGeomTables(); renderSecs(); geomEdited();
  }

  // ------------------------------------------------------------------ calcul et affichage
  let raf = 0;
  function changed() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; update(); save(); });
  }

  let frozen = null; // transformation figée pendant le glisser d'un nœud
  function update() {
    if (!dom || !document.body.contains(dom.status)) return;
    const model = effModel();
    let res;
    try { res = S.fem.solve(model); }
    catch (e) { res = { error: 'Erreur de calcul : ' + e.message }; }
    st.res = res;

    for (const mode in dom.views) {
      const v = dom.views[mode];
      const cw = v.card.clientWidth;
      const width = cw ? S.clamp(cw, 360, v.width) : v.width;
      const out = S.draw.render(v.svg, model, mode === 'elev' ? null : res, mode, {
        width: frozen && mode === 'model' ? frozen.W : width, labels: st.labels, dims: mode === 'model',
        tr: mode === 'model' ? frozen : null,
        onNodeDown: mode === 'model' ? startDrag : null
      });
      v.tr = out.tr;
      if (mode === 'defo') v.sub.textContent = res.ok ? `umax = ${S.fmt(res.umax * 1000)} mm · amplification ×${S.fmt(out.info.amp, 0)}` : '';
      else if (mode === 'elev') v.sub.textContent = 'hauteurs de section réelles';
      else if (mode !== 'model') v.sub.textContent = res.ok ? `max |${mode}| = ${S.fmt(out.info.vmax, 1)}` : '';
    }

    if (!res.ok) {
      dom.status.className = 'status err';
      dom.status.textContent = res.error;
      dom.kpis.innerHTML = ''; dom.arc.innerHTML = '';
      return;
    }
    const [lx, ly] = res.loadSum, [rx, ry] = res.reactSum;
    const errEq = Math.abs(lx + rx) + Math.abs(ly + ry);
    dom.status.className = 'status ok';
    dom.status.textContent = `Équilibre global : charges ΣFy = ${S.fmt(-ly, 1)} kN ↓ · réactions ΣRy = ${S.fmt(ry, 1)} kN ↑ · ΣFx = ${S.fmt(lx, 1)} kN, ΣRx = ${S.fmt(rx, 1)} kN ${errEq < 1e-6 * (1 + Math.abs(ly) + Math.abs(lx)) ? '✓' : '⚠'}`;
    renderKpis(res);
    renderArc(res, model);
  }

  // Vérification du flambement dans le plan pour les arcs (méthode D. Bitar, CTICM)
  function renderArc(res, model) {
    dom.arc.innerHTML = '';
    const P = S.PRESET[st.presetId];
    if (!P.arc || st.geomEdited) return;
    const p = st.params, L = p.L;
    const arcs = res.elems.filter(e => !(e.rel[0] === 2 && e.rel[1] === 5));
    const sec = arcs[0].sec;
    const EI = sec.E * 1e3 * sec.I * 1e-8, r = Math.sqrt(sec.I / sec.A) / 100;
    let NEd = 0, best = Infinity;
    for (const e of arcs) {
      const n1 = model.nodes[e.i];
      e.xs.forEach((x, k) => { const d = Math.abs(n1.x + x * e.c - L / 4); if (d < best) { best = d; NEd = Math.max(0, -e.N[k]); } });
    }
    const b = S.arcBuckling({ L, f: p.f, forme: p.forme, appuis: P.arc === 'enc' ? 'enc' : 'art', EI, NEd, r });
    const k = (label, val, sub) => el('div', { class: 'kpi' }, el('b', {}, label), el('span', {}, val), el('small', {}, sub));
    dom.arc.append(el('div', { class: 'arc-check' },
      el('div', { class: 'vh' }, el('h3', {}, 'Flambement de l\'arc dans son plan'), el('small', {}, 'méthode D. Bitar (CTICM, 2020)')),
      el('div', { class: 'kpis' },
        k('Demi-longueur S', `${S.fmt(b.S, 2)} m`, p.forme === 'circ' ? 'arc circulaire : S = R·θ, θ = 2·atan(2f/L)' : 'S = L/4·[√(1 + 16n²) + asinh(4n)/(4n)]'),
        k('Effort critique Ncr', `${S.fmt(b.Ncr, 0)} kN`, `π²EI / (β·S)², β = ${S.fmt(b.beta, 1)}`),
        k('NEd au quart', `${S.fmt(NEd, 0)} kN`, 'compression en x = L/4'),
        k('αcr = Ncr / NEd', S.fmt(b.alpha, 1), 'seuils : 3 et 10'),
        k('Surbaissement f/L', `1/${S.fmt(L / p.f, 1)}`, 'conseillé : 1/5 à 1/8')),
      el('div', { class: 'status ' + b.level }, b.verdict),
      el('p', { class: 'muted', style: 'font-size:12.5px;margin-top:8px' }, b.snap, ' Flambement hors plan : à empêcher par le contreventement entre arcs.')));
  }

  function renderKpis(res) {
    const best = (f) => res.elems.reduce((b, e) => (f(e) > f(b) ? e : b), res.elems[0]);
    const eM = best(e => Math.max(Math.abs(e.Mmin), Math.abs(e.Mmax)));
    const eV = best(e => e.Vabs);
    const eNt = best(e => e.Nmax), eNc = best(e => -e.Nmin);
    const eS = best(e => e.sigma);
    const eF = best(e => e.fRel / e.L);
    const Mv = Math.abs(eM.Mmin) > Math.abs(eM.Mmax) ? eM.Mmin : eM.Mmax;
    const k = (label, val, sub) => el('div', { class: 'kpi' }, el('b', {}, label), el('span', {}, val), el('small', {}, sub));
    dom.kpis.innerHTML = '';
    dom.kpis.append(
      k('Moment max', `${S.fmt(Mv, 1)} kN·m`, `barre ${eM.index}`),
      k('Tranchant max', `${S.fmt(eV.Vabs, 1)} kN`, `barre ${eV.index}`),
      k('Effort normal', `${S.fmt(eNt.Nmax > 0 ? eNt.Nmax : 0, 1)} / ${S.fmt(eNc.Nmin < 0 ? eNc.Nmin : 0, 1)}`, 'traction / compression (kN)'),
      k('Contrainte max', `${S.fmt(eS.sigma, 0)} MPa`, eS.sec.fy ? `barre ${eS.index} · ${S.fmt(100 * eS.sigma / eS.sec.fy, 0)} % de f` : `barre ${eS.index}`),
      k('Déplacement max', `${S.fmt(res.umax * 1000, 1)} mm`, isFinite(eF.ratio) && eF.fRel > 1e-7 ? `flèche relative L/${S.fmt(eF.ratio, 0)} (barre ${eF.index})` : '—'));
  }

  // ------------------------------------------------------------------ glisser-déposer des nœuds
  function startDrag(k, ev) {
    ev.preventDefault();
    const v = dom.views.model, svg = v.svg;
    frozen = v.tr;
    const move = e => {
      const [x, y] = S.draw.toModel(svg, frozen, e.clientX, e.clientY);
      const snap = 0.05;
      st.model.nodes[k].x = Math.round(x / snap) * snap;
      st.model.nodes[k].y = Math.round(y / snap) * snap;
      geomEdited();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      frozen = null;
      renderGeomTables();
      changed();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // ------------------------------------------------------------------ fiche PDF (impression du navigateur)
  function exportPdf() {
    const P = S.PRESET[st.presetId], esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const val = p => p.type === 'select' ? (p.options.find(o => o[0] === st.params[p.k]) || [, st.params[p.k]])[1] : `${S.fmt(st.params[p.k])}${p.unit ? ' ' + p.unit : ''}`;
    const rows = list => list.map(p => `<tr><td>${esc(p.label)}</td><td class="num">${esc(val(p))}</td></tr>`).join('');
    const used = {};
    effModel().elems.forEach(e => { const l = S.secProps(e).label; used[l] = (used[l] || 0) + 1; });
    const views = Object.entries(dom.views).map(([, v]) => `<figure><figcaption>${esc(v.card.querySelector('h3').textContent)} <span>${esc(v.sub.textContent)}</span></figcaption>${v.svg.outerHTML}</figure>`).join('');
    const kpis = dom.kpis.innerHTML, arc = dom.arc.innerHTML;
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const css = new URL('css/style.css', location.href).href;
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Structura — ${esc(P.name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap"><link rel="stylesheet" href="${css}">
<style>@page{size:A4 portrait;margin:12mm}body{display:block;padding:0;min-height:0;font-size:10pt}.rp{max-width:186mm;margin:0 auto}
.rp-head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #111;padding-bottom:4mm}
.rp-head .l{font-weight:900;font-size:22pt;letter-spacing:-.05em}.rp-head .l i{font-style:normal;color:#4284f4}.rp-head .t{font-weight:900;font-size:16pt;color:#4284f4;letter-spacing:-.04em}
h1{font-weight:900;font-size:22pt;letter-spacing:-.04em;margin:5mm 0 1mm}.meta{color:#6e6d69;font-size:9pt}
h2{font-size:11pt;font-weight:800;margin:5mm 0 2mm;border-top:1px solid #111;padding-top:2mm}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:6mm}table{width:100%;border-collapse:collapse;font-size:9pt}td{padding:1mm 0;border-bottom:1px solid #e4e3df}td.num{text-align:right}
.views{display:grid;grid-template-columns:1fr 1fr;gap:4mm}figure{margin:0;break-inside:avoid}figcaption{font-size:9pt;font-weight:700}figcaption span{font-weight:400;color:#6e6d69}
figure svg{width:100%;height:auto}.kpis{grid-template-columns:repeat(5,1fr)}.kpi span{font-size:13pt}.arc-check .vh h3{font-size:11pt}
.foot{font-size:8pt;color:#6e6d69;border-top:1px solid #111;margin-top:5mm;padding-top:2mm}</style></head><body><div class="rp">
<div class="rp-head"><div class="l">structura<i>.</i></div><div class="t">tracés</div></div>
<h1>${esc(P.name)}</h1><div class="meta">Fiche de calcul · ${esc(P.group)} · ${date}</div>
<div class="cols"><div><h2>Géométrie</h2><table>${rows(P.params.filter(p => !LOAD_KEYS.has(p.k)))}</table>
<h2>Sections</h2><table>${Object.entries(used).map(([l, n]) => `<tr><td>${esc(l)}</td><td class="num">${n} barre${n > 1 ? 's' : ''}</td></tr>`).join('')}</table></div>
<div><h2>Charges</h2><table>${st.loadDetail ? '<tr><td>Définition détaillée (tableaux)</td><td class="num">—</td></tr>' : rows(P.params.filter(p => LOAD_KEYS.has(p.k)))}</table></div></div>
<h2>Résultats principaux</h2><div class="kpis">${kpis}</div>${arc ? `<div style="margin-top:3mm">${arc}</div>` : ''}
<h2>Diagrammes</h2><div class="views">${views}</div>
<div class="foot">Calcul élastique linéaire (méthode des déplacements, barres d'Euler-Bernoulli). N > 0 traction ; M > 0 fibre inférieure tendue, tracé côté fibre tendue. Outil d'aide à la conception : ces résultats ne remplacent pas une note de calcul réglementaire.</div>
</div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),400));<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { alert('Autorisez l\'ouverture de fenêtres pour générer la fiche PDF.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }
})(window.S);
