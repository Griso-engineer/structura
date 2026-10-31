/* Page « Typologies structurelles ». */
(function (S) {
  'use strict';
  const el = S.el;
  S.pages = S.pages || {};

  const filt = { fam: null, mat: null, q: '' };

  const icon = t => el('div', { html: `<svg class="icon" viewBox="0 0 200 120" aria-hidden="true">${t.svg}</svg>` });
  const fam = id => S.TYPO_FAMILIES.find(f => f[0] === id) || [id, '', ''];
  // Domaine de portée global (tous matériaux confondus)
  const spanOf = t => {
    const r = t.rows || [];
    if (!r.length) return null;
    return [Math.min(...r.map(x => x[2][0])), Math.max(...r.map(x => x[2][1]))];
  };
  const spanTxt = t => { const s = spanOf(t); return s ? `${S.fmt(s[0])} – ${S.fmt(s[1])} m` : '—'; };

  // Modèle statique associé à la typologie (celui du solveur, sans charges)
  const STATIC_ALIAS = { 'inertie-variable': 'isostatique' };
  const STATIC_PARAMS = { 'portique-biarticule': { base: 'rotule' }, 'portique-encastre': { base: 'encastrement' } };
  const staticModel = t => {
    const id = t.preset || STATIC_ALIAS[t.id];
    if (!id || !S.PRESET[id]) return null;
    const m = S.PRESET[id].build(Object.assign(S.presetDefaults(id), STATIC_PARAMS[t.id]));
    return Object.assign({}, m, { nloads: [], eloads: [] });
  };
  const staticCache = {};
  S.typoStatic = t => (t.id in staticCache) ? staticCache[t.id] : (staticCache[t.id] = (m => m ? S.staticSvg(m) : '')(staticModel(t)));
  // les arcs se ressemblent en 3D : on met en avant leur schéma statique
  const emph2d = t => t.fam === 'arcs';

  /* Vignette grise : vue 3D et schéma statique. Par défaut la 3D en grand et le schéma statique en
     bandeau dessous ; pour les arcs (3D peu parlantes), le schéma statique en grand à gauche. */
  function vignette(t) {
    const st = S.typoStatic(t);
    const v3 = `<svg class="icon" viewBox="0 0 200 120" aria-hidden="true">${t.svg}</svg>`;
    if (t.vig2d) return el('div', { class: 'fig stack' }, el('div', { class: 'v-main', html: v3 }),
      el('div', { class: 'v-strip three' }, t.vig2d.map(s => el('div', { html: `<svg class="icon" viewBox="0 0 200 120" aria-hidden="true">${s}</svg>` }))));
    if (!st) return el('div', { class: 'fig' }, el('div', { html: v3 }));
    const v2 = st;
    if (emph2d(t)) return el('div', { class: 'fig dual emph2d' }, el('div', { class: 'v-main', html: v2 }), el('div', { class: 'v-inset', html: v3 }));
    return el('div', { class: 'fig stack' }, el('div', { class: 'v-main', html: v3 }), el('div', { class: 'v-strip', html: v2 }));
  }
  function staticFig(t) {
    const st = S.typoStatic(t);
    if (!st) return null;
    return el('div', { class: 'static-fig' }, el('div', { html: st }),
      el('small', {}, 'Schéma statique du modèle utilisé dans le solveur : appuis, articulations (○) et barres.'));
  }

  // Tableau des élancements et portées, séparé par matériau
  S.typoRowsTable = function (rows) {
    return el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Matériau'), el('th', {}, 'Variante'), el('th', { class: 'num' }, 'Portées usuelles'), el('th', {}, 'Élancement / proportions'))),
      el('tbody', {}, rows.map(([m, v, sp, lh]) => el('tr', {},
        el('td', {}, el('span', { class: 'tag ' + m }, S.TYPO_MATS[m])), el('td', {}, v),
        el('td', { class: 'num' }, `${S.fmt(sp[0])} – ${S.fmt(sp[1])} m`), el('td', {}, lh))))));
  };

  // ------------------------------------------------------------------ modes de fonctionnement
  const T = id => S.TYPOLOGIES.find(t => t.id === id);
  const ico = (id, label) => {
    const t = T(id);
    return el('a', { class: 'mode-ico', href: '#/typologies/' + id, title: t ? t.name : label },
      el('div', { html: t ? `<svg class="icon" viewBox="0 0 200 120" aria-hidden="true">${t.svg}</svg>` : '' }), el('span', {}, label || (t && t.name)));
  };

  // Efficacité structurelle : de la forme « par la section » à la forme « par la géométrie »
  const EFF = [
    ['Actives par la section', 'La matière résiste par flexion ; la forme ne suit pas le trajet des efforts.', [
      ['Simples', [['poutre-iso', 'Solive, poutre pleine'], ['dalle-1d', 'Dalle pleine']]],
      ['Améliorées', [['inertie-variable', 'Poutre en I, alvéolaire, à inertie variable'], ['pratt', 'Treillis acier ou bois'], ['nervure', 'Dalle nervurée, à caissons'], ['plisse-v', 'Plaque plissée'], ['clt-nervure', 'Panneau caisson'], ['treillis-spatial', 'Treillis spatial']]]]],
    ['Semi-actives par la forme', 'La géométrie suit en partie la ligne des pressions : flexion réduite.', [
      ['Simples', [['portique-versants', 'Portique en lamellé-collé']]],
      ['Améliorées', [['portique-jambes', 'Portique triangulé, à jambes de force'], ['reins-courbes', 'Portique aux reins courbes']]]]],
    ['Actives par la forme', 'La forme suit le funiculaire des charges : compression ou traction pures.', [
      ['', [['arc', 'Arc'], ['coque-pleine', 'Coque'], ['gridshell', 'Gridshell'], ['toile', 'Membrane tendue'], ['resille', 'Réseau de câbles']]]]]
  ];
  function efficiency() {
    return el('div', { class: 'eff' },
      el('div', { class: 'eff-axis' }, el('span', {}, 'Efficacité structurelle'), el('small', { class: 'lo' }, 'faible'), el('small', { class: 'hi' }, 'élevée')),
      el('div', { class: 'eff-rows' }, EFF.map(([name, txt, groups], i) => el('div', { class: 'eff-band b' + i },
        el('div', { class: 'eff-name' }, el('b', {}, name), el('small', {}, txt)),
        el('div', { class: 'eff-groups' }, groups.map(([gname, items]) => el('div', { class: 'eff-g' },
          gname ? el('span', { class: 'eff-gn' }, gname) : null,
          el('div', { class: 'eff-items' }, items.map(([id, l]) => ico(id, l))))))))));
  }

  // Schéma de principe de chaque mode : même portée, même charge répartie
  function modeFig(kind) {
    const sv = S.svg, g = sv('svg', { viewBox: '0 0 240 112', class: 'diag mode-flow' });
    const P = (d, cls) => g.append(sv('path', { d, class: cls }));
    const pin = (x, y) => P(`M${x} ${y} l-6 9 h12 z M${x - 9} ${y + 9} h18`, 'mf-s');
    const arr = (x1, y1, x2, y2, cls) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 6; P(`M${x1} ${y1} L${x2} ${y2} M${x2 - h * Math.cos(a - 0.5)} ${y2 - h * Math.sin(a - 0.5)} L${x2} ${y2} L${x2 - h * Math.cos(a + 0.5)} ${y2 - h * Math.sin(a + 0.5)}`, cls); };
    const q = y => { for (let x = 44; x <= 196; x += 16) P(`M${x} ${y - 13} V${y} M${x - 3} ${y - 4} L${x} ${y} L${x + 3} ${y - 4}`, 'mf-q'); };
    if (kind === 'c') {
      q(22); P('M32 92 Q120 6 208 92', 'mf-c'); pin(32, 92); pin(208, 92);
      arr(4, 98, 22, 88, 'mf-ar'); arr(236, 98, 218, 88, 'mf-ar');
    } else if (kind === 'f') {
      q(40); P('M30 44 H210 V58 H30 Z', 'mf-b'); pin(36, 58); pin(204, 58);
      P('M36 72 Q120 90 204 72', 'mf-d');
      P('M120 44 L132 44 L120 51 L108 58 L120 58 Z', 'mf-st');
    } else {
      q(22); P('M32 30 Q120 120 208 30', 'mf-t');
      P('M32 30 l-8 -6 M208 30 l8 -6', 'mf-s');
      arr(30, 30, 8, 14, 'mf-ar'); arr(210, 30, 232, 14, 'mf-ar');
    }
    return g;
  }

  function modes() {
    const col = (cls, title, sub, txt, ids) => el('div', { class: 'mode-col ' + cls }, el('h3', {}, title), el('small', { class: 'mode-sub' }, sub), modeFig(cls), el('p', {}, txt),
      el('div', { class: 'mode-icos' }, ids.map(([id, l]) => ico(id, l))));
    return el('section', { class: 'modes' },
      el('header', { class: 'fam-head' }, el('span', { class: 'num' }, '00'), el('h2', {}, 'Trois modes de fonctionnement'),
        el('p', {}, 'Pour franchir une portée, une structure travaille selon trois comportements principaux : en compression, en flexion ou en traction. La plupart des systèmes combinent les trois ; c\'est le mode dominant qui fixe sa forme et sa légèreté.')),
      el('div', { class: 'mode-cols' },
        col('c', 'Compression', 'La forme suit la ligne des pressions', 'Arcs, voûtes et coques travaillent en compression presque pure : peu de matière, mais une poussée sur les appuis et un risque de flambement.', [['arc', 'Arc'], ['coque-pleine', 'Voile courbe, coque'], ['gridshell', 'Coque en treillis']]),
        col('f', 'Flexion', 'La matière résiste par sa section', 'Poutres, nappes et dalles reportent la charge verticalement sur leurs appuis, sans poussée ; les fibres extrêmes travaillent, le cœur de la section très peu.', [['poutre-iso', 'Poutre'], ['treillis-spatial', 'Nappe de treillis'], ['dalle-2d', 'Dalle']]),
        col('t', 'Traction', 'La forme suit le funiculaire des charges', 'Câbles, résilles et membranes ne travaillent qu\'en traction : légèreté maximale, mais ancrages, prétension et sensibilité au vent.', [['cable', 'Câble caténaire'], ['resille', 'Réseau de câbles'], ['toile', 'Membrane']])));
  }

  // Après le catalogue : l'efficacité structurelle des systèmes
  function effSection() {
    return el('section', { class: 'modes eff-sec' },
      el('header', { class: 'fam-head' }, el('span', { class: 'num' }, '→'), el('h2', {}, 'Efficacité structurelle'),
        el('p', {}, 'Du moins au plus efficace : les systèmes actifs par la section consomment beaucoup de matière, les systèmes actifs par la forme en consomment le moins.')),
      efficiency());
  }

  S.pages.typologies = function (root, sub) {
    const list = el('div');
    const count = el('small');
    const famChips = el('div', { class: 'chips' });
    const matChips = el('div', { class: 'chips' });

    const chips = (box, items, key) => {
      box.innerHTML = '';
      [[null, 'Toutes'], ...items].forEach(([k, l]) => box.append(el('button', {
        class: 'chip' + (filt[key] === k ? ' on' : ''), onclick: () => { filt[key] = k; render(); }
      }, l)));
    };

    function card(t) {
      const rows = filt.mat ? t.rows.filter(r => r[0] === filt.mat) : t.rows;
      const open = () => S.navigate('#/typologies/' + t.id, true);
      return el('article', { class: 'typo-card', tabindex: 0, onclick: open, onkeydown: e => { if (e.key === 'Enter') open(); } },
        vignette(t),
        el('div', { class: 'body' },
          el('h3', {}, t.name),
          el('div', { class: 'meta' }, el('span', {}, '↔ ' + spanTxt(t))),
          el('div', { class: 'mini-rows' }, rows.slice(0, 3).map(([m, v, sp, lh]) =>
            el('div', {}, el('span', { class: 'tag ' + m }, S.TYPO_MATS[m]), el('span', {}, lh))))));
    }

    function render() {
      chips(famChips, S.TYPO_FAMILIES.map(f => [f[0], f[1]]), 'fam');
      chips(matChips, Object.entries(S.TYPO_MATS).filter(([k]) => S.TYPOLOGIES.some(t => t.mats.includes(k))), 'mat');
      const q = filt.q.trim().toLowerCase();
      const items = S.TYPOLOGIES.filter(t =>
        (!filt.fam || t.fam === filt.fam) && (!filt.mat || t.mats.includes(filt.mat)) &&
        (!q || (t.name + ' ' + t.principle + ' ' + t.examples.join(' ')).toLowerCase().includes(q)));
      list.innerHTML = '';
      let n = 0;
      S.TYPO_FAMILIES.forEach(([id, name, intro]) => {
        const its = items.filter(t => t.fam === id);
        if (!its.length) return;
        n++;
        list.append(el('section', { class: 'typo-fam' },
          el('header', { class: 'fam-head' }, el('span', { class: 'num' }, String(S.TYPO_FAMILIES.findIndex(f => f[0] === id) + 1).padStart(2, '0')), el('h2', {}, name), el('p', {}, intro)),
          el('div', { class: 'typo-grid' }, its.map(card))));
      });
      count.textContent = `${items.length} typologie${items.length > 1 ? 's' : ''}`;
      if (!n) list.append(el('p', { class: 'muted' }, 'Aucune typologie ne correspond à ces filtres.'));
    }

    root.append(el('div', { class: 'page' },
      S.blockHead('01', 'Typologies structurelles', 'Les grandes familles de systèmes porteurs : comment ils transmettent les charges, leurs portées et élancements selon le matériau, leurs qualités, leurs limites et quelques ouvrages de référence.'),
      modes(),
      el('header', { class: 'fam-head cat-head' }, el('span', { class: 'num' }, '→'), el('h2', {}, 'Le catalogue'), el('p', {}, 'Les typologies classées par famille, avec leurs portées et élancements par matériau.')),
      el('div', { class: 'filters' },
        el('input', { class: 'search', type: 'search', placeholder: 'Rechercher (ex. bow-string, Munich, coque)…', value: filt.q, oninput: e => { filt.q = e.target.value; render(); } }),
        famChips, matChips, count),
      list, effSection()));
    render();

    const t = S.TYPOLOGIES.find(x => x.id === sub[0]);
    if (t) openModal(t);
  };

  function openModal(t) {
    const onKey = e => {
      if (!document.body.contains(back)) document.removeEventListener('keydown', onKey);
      else if (e.key === 'Escape') close();
    };
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); S.navigate('#/typologies', true); };
    document.addEventListener('keydown', onKey);
    const related = S.TYPOLOGIES.filter(x => x.fam === t.fam && x.id !== t.id).slice(0, 6);
    const back = el('div', { class: 'modal-back', onclick: e => { if (e.target === back) close(); } },
      el('div', { class: 'card modal', role: 'dialog', 'aria-label': t.name },
        el('button', { class: 'btn close', onclick: close, 'aria-label': 'Fermer' }, '✕'),
        el('div', { class: 'fig' }, icon(t)),
        el('div', { class: 'content' },
          el('small', { style: 'font-weight:700' }, fam(t.fam)[1]),
          el('h2', {}, t.name),
          el('div', { class: S.typoStatic(t) ? 'cols2' : '' },
            el('div', {}, el('h3', {}, 'Principe de fonctionnement'), el('p', {}, t.principle)),
            S.typoStatic(t) ? el('div', {}, el('h3', {}, 'Schéma statique'), staticFig(t)) : null),
          t.variants ? el('div', {}, el('h3', {}, 'Variantes'), el('div', { class: 'variants' }, t.variants.map(([n, txt, svg]) =>
            el('div', { class: 'variant' }, el('div', { class: 'fig', html: `<svg class="icon" viewBox="0 0 200 120" aria-hidden="true">${svg}</svg>` }), el('b', {}, n), el('p', {}, txt))))) : null,
          el('h3', {}, 'Portées et élancements par matériau'),
          S.typoRowsTable(t.rows),
          el('div', { class: 'cols2', style: 'margin:16px 0' },
            el('div', {}, el('h3', {}, 'Atouts'), el('ul', { class: 'list pro' }, t.pros.map(x => el('li', {}, x)))),
            el('div', {}, el('h3', {}, 'Limites'), el('ul', { class: 'list con' }, t.cons.map(x => el('li', {}, x))))),
          el('h3', {}, 'Exemples'),
          el('ul', { class: 'list' }, t.examples.map(x => el('li', {}, x))),
          el('div', { class: 'row-actions', style: 'margin-top:18px' },
            t.preset ? el('a', { class: 'btn primary', href: '#/solveur?preset=' + t.preset }, 'Calculer dans le solveur →') : null,
            el('a', { class: 'btn', href: '#/ordres' }, 'Ordres de grandeur')),
          related.length ? el('div', { style: 'margin-top:22px' }, el('h3', {}, 'Dans la même famille'),
            el('div', { class: 'chips' }, related.map(r => el('button', { class: 'chip', onclick: () => { back.remove(); document.removeEventListener('keydown', onKey); S.navigate('#/typologies/' + r.id, true); } }, r.name)))) : null)));
    document.body.append(back);
  }
})(window.S);
