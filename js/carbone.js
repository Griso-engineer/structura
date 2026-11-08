/* Onglet « Comparateur carbone » : impact carbone (A1–A3) de solutions structurelles rendant le même service.
   Quantités issues d'un prédimensionnement simplifié ; facteurs d'émission sourcés, modifiables, avec
   référence de fiche INIES. Ordres de grandeur d'esquisse : ce n'est pas un calcul RE2020. */
(function (S) {
  'use strict';
  const el = S.el, sv = S.svg;
  S.pages = S.pages || {};

  const INIES = 'https://www.base-inies.fr/iniesV4/dist/consultation.html';

  // ------------------------------------------------------------------ facteurs d'émission (A1–A3)
  /* v : kgCO₂e par unité (production, modules A1–A3). rho : masse volumique (kg/m³, bois à 15 % d'humidité)
     pour le carbone biogénique stocké. ref : numéro de fiche INIES quand il est connu ; kw : mots-clés de recherche. */
  const FACTORS = [
    { k: 'beton', grp: 'beton', label: 'Béton C25/30, CEM II', unit: 'm³', v: 220, kw: 'béton prêt à l\'emploi C25/30',
      src: 'Ordre de grandeur des FDES issues du configurateur BETie (SNBPE) pour un BPE C25/30 courant ; la valeur varie avec le liant et la classe d\'exposition.' },
    { k: 'betonBC', grp: 'beton', label: 'Béton bas carbone (CEM III, liant à faible clinker)', unit: 'm³', v: 160, kw: 'béton bas carbone CEM III',
      src: 'Ordre de grandeur des bétons à liant riche en laitier ; à remplacer par la FDES BETie du béton prescrit.' },
    { k: 'betonP', grp: 'beton', label: 'Béton préfabriqué précontraint C45/55', unit: 'm³', v: 300, kw: 'dalle alvéolaire précontrainte',
      src: 'Estimation (béton à forte teneur en ciment) ; à remplacer par la FDES du fabricant de dalles alvéolaires.' },
    { k: 'armature', grp: 'acier', label: 'Armatures pour béton armé', unit: 'kg', v: 0.55, kw: 'armatures béton armé',
      src: 'Filière arc électrique, majoritaire pour les ronds à béton : 300 à 600 kgCO₂e/t selon les déclarations (note CFBR 2024).' },
    { k: 'acierEAF', grp: 'acier', label: 'Profilés laminés, filière arc électrique', unit: 'kg', v: 0.6, kw: 'profilés laminés à chaud',
      src: 'Filière arc électrique (ferrailles recyclées) : 300 à 600 kgCO₂e/t selon les déclarations (note CFBR 2024).' },
    { k: 'acierBOF', grp: 'acier', label: 'Profilés laminés, filière haut-fourneau', unit: 'kg', v: 1.9, kw: 'profilés laminés à chaud',
      src: 'Filière haut-fourneau (minerai) : 1 400 à 2 200 kgCO₂e/t (note CFBR 2024).' },
    { k: 'bac', grp: 'acier', label: 'Bac acier collaborant galvanisé', unit: 'kg', v: 2.5, kw: 'bac acier collaborant',
      src: 'Estimation (tôle galvanisée, filière haut-fourneau) ; à vérifier sur la FDES du fabricant.' },
    { k: 'connect', grp: 'acier', label: 'Connecteurs et quincaillerie', unit: 'kg', v: 2.0, kw: 'connecteurs acier',
      src: 'Estimation (acier galvanisé usiné).' },
    { k: 'lc', grp: 'bois', label: 'Bois lamellé-collé (GL24h)', unit: 'm³', v: 141, rho: 455, kw: 'bois lamellé-collé', ref: 'CUWS20240828_142611',
      src: 'FDES collective CODIFAB 2024, EN 15804+A2, poutre sans fixations, A1–A3 (référence INIES citée par la base OneClick LCA).' },
    { k: 'massif', grp: 'bois', label: 'Bois massif (C24)', unit: 'm³', v: 114, rho: 465, kw: 'charpente bois massif',
      src: 'FDES collective CODIFAB 2024, charpente traditionnelle, A1–A3 (citée par la base OneClick LCA).' },
    { k: 'clt', grp: 'bois', label: 'Bois lamellé-croisé (CLT)', unit: 'm³', v: 160, rho: 470, kw: 'panneau bois lamellé croisé CLT',
      src: 'Estimation à vérifier : les FDES de CLT sont des déclarations de fabricants, à choisir selon la provenance.' }
  ];
  const FK = Object.fromEntries(FACTORS.map(f => [f.k, f]));
  const GROUPS = { beton: 'Béton', acier: 'Acier', bois: 'Bois' };

  // valeurs modifiées par l'utilisateur (conservées dans le navigateur)
  const over = S.store.get('carbone', {});
  const val = k => (over[k] && over[k].v != null ? over[k].v : FK[k].v);
  const refOf = k => (over[k] && over[k].ref != null ? over[k].ref : FK[k].ref || '');
  const save = () => S.store.set('carbone', over);
  // carbone biogénique stocké : masse sèche × 50 % de carbone × 44/12
  const bioPerM3 = k => FK[k].rho ? -FK[k].rho / 1.15 * 0.5 * 44 / 12 : 0;

  // ------------------------------------------------------------------ prédimensionnement simplifié
  const r2 = (v, s) => Math.ceil(v / s - 1e-9) * s;
  const IPE = S.SECTIONS.filter(s => /^IPE/.test(s.key));
  const HE = S.SECTIONS.filter(s => /^HE[AB]/.test(s.key)).sort((a, b) => a.A - b.A);
  const kgm = s => s.A * 0.785;             // kg/m d'un profilé (A en cm²)
  const FY = 355, FCD = 16.7, FMD_GL = 24 * 0.8 / 1.25, FCD_GL = 24 * 0.8 / 1.25, FCD_C24 = 21 * 0.8 / 1.3;

  // flambement bois (EN 1995-1-1, 6.3.2)
  const kcBois = (lam, fck, E05, beta) => {
    const lr = lam / Math.PI * Math.sqrt(fck / E05);
    if (lr <= 0.3) return 1;
    const k = 0.5 * (1 + beta * (lr - 0.3) + lr * lr);
    return 1 / (k + Math.sqrt(k * k - lr * lr));
  };

  /* Unités fonctionnelles : chaque solution renvoie sa section et ses quantités { facteur: quantité }. */
  const UF = {
    plancher: {
      label: 'Plancher', unit: 'm²', per: 'par m² de plancher',
      svg: '<path d="M4 14 H48 V19 H4 Z" fill="#e7e6e1"/><path d="M4 19 l-3 5 h6 z M48 19 l-3 5 h6 z"/><path d="M8 9 V13 M16 9 V13 M24 9 V13 M32 9 V13 M40 9 V13" stroke="#ff6600"/>',
      params: [['L', 'Portée L', 3, 12, 0.5, 6, 'm']],
      note: 'Hauteurs tirées des élancements usuels (onglet Ordres de grandeur) ; plancher de bureaux ou de logement courant.',
      sol: p => {
        const L = p.L, B = p.beton;
        const out = [];
        const h1 = Math.max(0.18, r2(L / 28, 0.01));
        out.push({ name: 'Dalle pleine en béton armé', mat: 'beton', sec: `e = ${S.fmt(h1 * 100, 0)} cm (L/28, mini 18 cm)`, q: { [B]: h1, armature: 85 * h1 } });
        const hd = Math.max(0.16, r2(L / 38, 0.01));
        out.push({ name: 'Dalle alvéolaire + chape', mat: 'beton', sec: `DAP ${S.fmt(hd * 100, 0)} cm (vides ≈ 45 %) + chape 5 cm`, q: { betonP: 0.55 * hd, [B]: 0.05, armature: 25 * 0.55 * hd + 3 } });
        const e = 2.7, ipe = IPE.find(s => s.h >= L / 22 * 1000) || IPE[IPE.length - 1];
        out.push({ name: 'Mixte acier-béton', mat: 'acier', sec: `dalle 12 cm sur bac ; solives ${ipe.label} tous les ${S.fmt(e, 1)} m`, q: { [B]: 0.095, bac: 11, armature: 3, [p.acier]: kgm(ipe) / e } });
        const t = Math.max(0.12, r2(L / 28, 0.02));
        out.push({ name: 'Plancher CLT' + (p.chape ? ' + chape' : ''), mat: 'bois', sec: `CLT ${S.fmt(t * 1000, 0)} mm (L/28)${p.chape ? ' + chape béton 5 cm' : ''}`, q: Object.assign({ clt: t, connect: 1 }, p.chape ? { [B]: 0.05, armature: 2 } : {}) });
        const hs = Math.max(0.16, r2(L / 20 - 0.08, 0.02));
        out.push({ name: 'Mixte bois-béton', mat: 'bois', sec: `solives GL24h 140 × ${S.fmt(hs * 1000, 0)} tous les 60 cm + dalle 8 cm`, q: { lc: 0.14 * hs / 0.6, [B]: 0.08, armature: 3, connect: 1.5 } });
        return out;
      }
    },
    poutre: {
      label: 'Poutre', unit: 'u', per: 'par poutre',
      svg: '<path d="M4 12 H48 V18 H4 Z" fill="#e7e6e1"/><path d="M6 18 l-3 5 h6 z M46 18 l-3 5 h6 z"/><path d="M8 5 V10 M17 5 V10 M26 5 V10 M35 5 V10 M44 5 V10" stroke="#ff6600"/>',
      params: [['L', 'Portée L', 3, 20, 0.5, 8, 'm'], ['q', 'Charge de service q', 5, 60, 1, 20, 'kN/m']],
      note: 'Poutre isostatique ; flexion à l\'ELU (q × 1,4) et flèche L/300 sous q. Poids propre négligé.',
      sol: p => {
        const L = p.L, q = p.q, Mu = 1.4 * q * L * L / 8 * 1e6; // N·mm
        const fl = EI => 5 * q * (L * 1000) ** 4 / (384 * EI); // mm (EI en N·mm²)
        const out = [];
        // acier : plus léger IPE vérifiant résistance et flèche
        const ipe = IPE.find(s => Mu <= 2 * s.I * 1e4 / s.h * FY && fl(210000 * s.I * 1e4) <= L * 1000 / 300) || IPE[IPE.length - 1];
        out.push({ name: 'Profilé acier', mat: 'acier', sec: `${ipe.label} (S355)`, q: { [p.acier]: kgm(ipe) * L } });
        // béton armé : b = 30 cm, hauteur par moment (μ ≈ 0,2) et élancement L/14
        const b = 0.3, d = Math.sqrt(Mu / (0.2 * b * 1000 * FCD)) / 1000, h = Math.max(r2(d / 0.9, 0.05), r2(L / 14, 0.05));
        out.push({ name: 'Poutre en béton armé', mat: 'beton', sec: `${S.fmt(b * 100, 0)} × ${S.fmt(h * 100, 0)} cm`, q: { [p.beton]: b * h * L, armature: 120 * b * h * L } });
        // lamellé-collé GL24h : hauteur par pas de 4 cm, largeur ≈ h/4
        let hg = 0.2, bg;
        for (; hg < 2.5; hg += 0.04) {
          bg = Math.max(0.12, r2(hg / 4.5, 0.02));
          const I = bg * 1000 * (hg * 1000) ** 3 / 12, W = 2 * I / (hg * 1000);
          if (Mu / W <= FMD_GL && fl(11500 * I) <= L * 1000 / 300) break;
        }
        out.push({ name: 'Poutre en lamellé-collé', mat: 'bois', sec: `GL24h ${S.fmt(bg * 1000, 0)} × ${S.fmt(hg * 1000, 0)} mm`, q: { lc: bg * hg * L } });
        return out;
      }
    },
    poteau: {
      label: 'Poteau', unit: 'u', per: 'par poteau',
      svg: '<path d="M22 4 H30 V24 H22 Z" fill="#e7e6e1"/><path d="M26 24 l-4 4 h8 z"/><path d="M26 0 V4" stroke="#ff6600"/>',
      params: [['N', 'Effort normal N (ELU)', 100, 4000, 50, 1200, 'kN'], ['H', 'Hauteur H', 2.5, 8, 0.25, 3.5, 'm']],
      note: 'Poteau bi-articulé, compression centrée avec flambement ; acier S355 (flambement sur l\'axe faible, i ≈ 0,25·b).',
      sol: p => {
        const N = p.N * 1000, H = p.H, out = [];
        // acier : HEA/HEB le plus léger (courbe c, axe faible approché)
        const he = HE.find(s => {
          const iz = 0.25 * Math.min(s.h, 300), lr = H * 1000 / iz / (93.9 * Math.sqrt(235 / FY));
          const ph = 0.5 * (1 + 0.49 * (lr - 0.2) + lr * lr), chi = Math.min(1, 1 / (ph + Math.sqrt(ph * ph - lr * lr)));
          return N <= chi * s.A * 100 * FY;
        }) || HE[HE.length - 1];
        out.push({ name: 'Poteau acier', mat: 'acier', sec: `${he.label} (S355)`, q: { [p.acier]: kgm(he) * H } });
        // béton armé : section carrée, 1 % d'acier, élancement a ≥ H/15
        const a = Math.max(0.2, r2(Math.sqrt(N / (0.8 * (FCD + 0.01 * 435))) / 1000, 0.05), r2(H / 15, 0.05));
        out.push({ name: 'Poteau en béton armé', mat: 'beton', sec: `${S.fmt(a * 100, 0)} × ${S.fmt(a * 100, 0)} cm`, q: { [p.beton]: a * a * H, armature: 150 * a * a * H } });
        // bois : section carrée par pas de 2 cm, flambement EN 1995
        const wood = (fcd, fck, E05, beta, max) => {
          for (let b = 0.12; b <= max; b += 0.02) {
            const kc = kcBois(H * Math.sqrt(12) / b, fck, E05, beta);
            if (N <= kc * fcd * (b * 1000) ** 2) return b;
          }
          return null;
        };
        const bg = wood(FCD_GL, 24, 9600, 0.1, 0.8);
        if (bg) out.push({ name: 'Poteau en lamellé-collé', mat: 'bois', sec: `GL24h ${S.fmt(bg * 1000, 0)} × ${S.fmt(bg * 1000, 0)} mm`, q: { lc: bg * bg * H } });
        const bm = wood(FCD_C24, 21, 7400, 0.2, 0.3);
        if (bm) out.push({ name: 'Poteau en bois massif', mat: 'bois', sec: `C24 ${S.fmt(bm * 1000, 0)} × ${S.fmt(bm * 1000, 0)} mm`, q: { massif: bm * bm * H } });
        return out;
      }
    }
  };

  // ------------------------------------------------------------------ bilan d'une solution
  function evaluate(s) {
    const by = { beton: 0, acier: 0, bois: 0 };
    let bio = 0;
    Object.entries(s.q).forEach(([k, qt]) => {
      by[FK[k].grp] += qt * val(k);
      if (FK[k].rho) bio += qt * bioPerM3(k);
    });
    return Object.assign(s, { by, bio, tot: by.beton + by.acier + by.bois });
  }

  const qtyTxt = q => Object.entries(q).map(([k, v]) => `${FK[k].label.split(' (')[0].split(',')[0]} ${S.fmt(v, FK[k].unit === 'kg' ? 0 : 3)} ${FK[k].unit}`).join(' · ');

  // ------------------------------------------------------------------ graphique : barres horizontales empilées
  function chart(sols, unit) {
    const W = 760, rowH = 46, top = 26, left = 230, H = top + sols.length * rowH + 30;
    // le carbone biogénique, souvent plus grand que les émissions, n'est pas tracé à la même échelle : il est noté en fin de ligne
    const maxE = Math.max(...sols.map(s => s.tot)), k = (W - left - 190) / (maxE || 1), x0 = left;
    const g = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diag co2-chart' });
    g.append(sv('line', { x1: x0, y1: top - 8, x2: x0, y2: H - 24, class: 'co2-zero' }));
    g.append(sv('text', { x: x0 + 4, y: top - 12, class: 'co2-ax' }, `émissions A1–A3, kgCO₂e ${unit}`));
    const best = Math.min(...sols.map(s => s.tot));
    sols.forEach((s, i) => {
      const y = top + i * rowH;
      g.append(sv('text', { x: 0, y: y + 17, class: 'co2-name' }, s.name));
      let x = x0;
      ['beton', 'acier', 'bois'].forEach(gk => {
        const w = s.by[gk] * k;
        if (w > 0.2) { g.append(sv('rect', { x, y: y + 4, width: w, height: 18, class: 'co2-' + gk }, sv('title', {}, `${GROUPS[gk]} : ${S.fmt(s.by[gk], 0)} kgCO₂e`))); x += w; }
      });
      const t = sv('text', { x: x + 6, y: y + 18, class: 'co2-val' + (s.tot === best ? ' best' : '') }, `${S.fmt(s.tot, s.tot < 100 ? 1 : 0)}`);
      if (s.bio < 0) t.append(sv('tspan', { class: 'co2-bio', dx: 10 }, `stock biogénique ${S.fmt(s.bio, 0)} kgCO₂`));
      g.append(t);
    });
    // légende
    let lx = 0;
    [['beton', 'Béton'], ['acier', 'Acier'], ['bois', 'Bois']].forEach(([c, l]) => {
      g.append(sv('rect', { x: lx, y: H - 14, width: 12, height: 10, class: 'co2-' + c }), sv('text', { x: lx + 16, y: H - 5, class: 'co2-ax' }, l)); lx += 70;
    });
    g.append(sv('text', { x: lx, y: H - 5, class: 'co2-ax' }, 'Stock biogénique : carbone contenu dans le bois, affiché à part, jamais déduit du total.'));
    return g;
  }

  // ------------------------------------------------------------------ page
  S.pages.carbone = function (root) {
    const st = Object.assign({ uf: 'plancher', beton: 'beton', acier: 'acierEAF', chape: true }, S.store.get('carbone-ui', {}));
    const params = {};
    Object.entries(UF).forEach(([k, u]) => { params[k] = Object.fromEntries(u.params.map(p => [p[0], p[5]])); });
    Object.assign(params, st.params || {});
    const persist = () => S.store.set('carbone-ui', Object.assign({}, st, { params }));

    const dom = { params: el('div'), out: el('div'), factors: el('div') };

    const choice = (key, opts) => el('div', { class: 'seg' }, opts.map(([v, l]) => el('button', {
      type: 'button', class: st[key] === v ? 'on' : '', onclick: () => { st[key] = v; persist(); renderSide(); render(); }
    }, l)));

    function renderSide() {
      const u = UF[st.uf];
      dom.params.innerHTML = '';
      u.params.forEach(([k, label, min, max, step, , unit]) => {
        const p = params[st.uf];
        const out = el('output', {}, `${S.fmt(p[k])} ${unit}`);
        dom.params.append(el('label', { class: 'param' }, el('span', { class: 'lab' }, label, out),
          el('input', { type: 'range', min, max, step, value: p[k], oninput: e => { p[k] = +e.target.value; out.textContent = `${S.fmt(p[k])} ${unit}`; persist(); render(); } })));
      });
      dom.params.append(
        el('h5', {}, 'Béton'), choice('beton', [['beton', 'Courant CEM II'], ['betonBC', 'Bas carbone']]),
        el('h5', {}, 'Acier de construction'), choice('acier', [['acierEAF', 'Arc électrique'], ['acierBOF', 'Haut-fourneau']]));
      if (st.uf === 'plancher') dom.params.append(el('h5', {}, 'Plancher CLT'), choice('chape', [[true, 'Avec chape'], [false, 'Sans chape']]));
    }

    function render() {
      const u = UF[st.uf];
      const sols = u.sol(Object.assign({}, params[st.uf], { beton: st.beton, acier: st.acier, chape: st.chape })).map(evaluate);
      const best = sols.reduce((a, b) => (b.tot < a.tot ? b : a));
      const worst = sols.reduce((a, b) => (b.tot > a.tot ? b : a));
      dom.out.innerHTML = '';
      dom.out.append(
        el('div', { class: 'kpis co2-kpis' },
          el('div', { class: 'kpi' }, el('b', {}, 'Solution la plus sobre'), el('span', {}, `${S.fmt(best.tot, best.tot < 100 ? 1 : 0)}`), el('small', {}, `kgCO₂e ${u.per} — ${best.name}`)),
          el('div', { class: 'kpi' }, el('b', {}, 'Écart avec la plus émissive'), el('span', {}, `× ${S.fmt(worst.tot / best.tot, 1)}`), el('small', {}, worst.name)),
          el('div', { class: 'kpi' }, el('b', {}, 'Périmètre'), el('span', {}, 'A1–A3'), el('small', {}, 'production des matériaux, ACV statique'))),
        el('div', { class: 'co2-chart-wrap' }, chart(sols, u.per)),
        el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl co2-tbl' },
          el('thead', {}, el('tr', {}, ...['Solution', 'Section retenue', 'Quantités', 'kgCO₂e (A1–A3)', 'Écart', 'Biogénique stocké'].map((h, i) => el('th', { class: i >= 3 ? 'num' : '' }, h)))),
          el('tbody', {}, sols.map(s => el('tr', { class: s === best ? 'best' : '' },
            el('td', {}, el('span', { class: 'tag ' + s.mat }, GROUPS[s.mat]), ' ', s.name),
            el('td', {}, s.sec), el('td', { class: 'qty' }, qtyTxt(s.q)),
            el('td', { class: 'num' }, el('b', {}, S.fmt(s.tot, s.tot < 100 ? 1 : 0))),
            el('td', { class: 'num' }, s === best ? 'référence' : `+${S.fmt((s.tot / best.tot - 1) * 100, 0)} %`),
            el('td', { class: 'num' }, s.bio < 0 ? `${S.fmt(s.bio, 0)} kgCO₂` : '—')))))),
        el('p', { class: 'note', style: 'margin-top:10px' }, u.note));
    }

    function renderFactors() {
      dom.factors.innerHTML = '';
      const rows = FACTORS.map(f => {
        const changed = over[f.k] && (over[f.k].v != null || over[f.k].ref != null);
        const inp = el('input', { type: 'number', step: 'any', min: 0, value: val(f.k), class: 'co2-in',
          onchange: e => { (over[f.k] = over[f.k] || {}).v = +e.target.value; save(); renderFactors(); render(); } });
        const ref = el('input', { type: 'text', value: refOf(f.k), placeholder: 'n° de fiche', class: 'co2-ref',
          onchange: e => { (over[f.k] = over[f.k] || {}).ref = e.target.value.trim(); save(); } });
        return el('tr', { class: changed ? 'changed' : '' },
          el('td', {}, el('b', {}, f.label), el('small', {}, f.src)),
          el('td', { class: 'num' }, inp, el('small', {}, `kgCO₂e/${f.unit}`)),
          el('td', {}, ref),
          el('td', {}, el('a', { class: 'btn sm', href: INIES, target: '_blank', rel: 'noopener', title: `Rechercher « ${f.kw} » dans la base INIES` }, 'INIES ↗'), el('small', {}, `« ${f.kw} »`)));
      });
      dom.factors.append(
        el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl co2-fac' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Matériau et source'), el('th', { class: 'num' }, 'A1–A3'), el('th', {}, 'Fiche INIES'), el('th', {}, 'Consulter'))),
          el('tbody', {}, rows))),
        el('div', { class: 'row-actions', style: 'margin-top:10px' },
          el('button', { class: 'btn', onclick: () => { Object.keys(over).forEach(k => delete over[k]); save(); renderFactors(); render(); } }, 'Revenir aux valeurs par défaut'),
          el('small', { class: 'muted' }, 'Les valeurs modifiées sont conservées dans ce navigateur et surlignées.')));
    }

    const picker = S.picker(Object.entries(UF).map(([id, u]) => ({ id, label: u.label, svg: u.svg })), st.uf,
      id => { st.uf = id; persist(); renderSide(); render(); }, { label: 'Élément comparé' });
    const step = (n, t) => el('h4', {}, el('span', { class: 'step' }, n), t);

    root.append(el('div', { class: 'page' },
      S.blockHead('06', 'Comparateur carbone', 'Comparer l\'empreinte carbone de solutions structurelles qui rendent le même service — un plancher, une poutre, un poteau — à partir de quantités prédimensionnées et de facteurs d\'émission issus des déclarations environnementales (base INIES). Des ordres de grandeur pour orienter l\'esquisse, pas un calcul RE2020.'),
      el('div', { class: 'solver co2' },
        el('aside', { class: 'side' },
          el('div', { class: 'side-sec' }, step(1, 'Élément comparé'), picker.el),
          el('div', { class: 'side-sec' }, step(2, 'Hypothèses'), dom.params)),
        el('div', {}, dom.out)),
      el('section', { class: 'og-sec' },
        el('div', { class: 'sub-head' }, S.blockHead('6.1', 'Facteurs d\'émission', 'Valeurs de production (modules A1–A3) par unité de matériau. Chaque valeur est modifiable : remplacez-la par celle de la fiche INIES du produit prescrit et notez son numéro.', 'h2')),
        dom.factors),
      el('section', { class: 'og-sec' },
        el('div', { class: 'sub-head' }, S.blockHead('6.2', 'Méthode et limites', null, 'h2')),
        el('div', { class: 'grid2 co2-method' },
          el('div', {}, el('h3', {}, 'Ce que calcule l\'outil'), el('ul', { class: 'list' },
            el('li', {}, 'Des solutions comparables : même portée, même charge, même usage (unité fonctionnelle).'),
            el('li', {}, 'Des quantités de matière issues d\'un prédimensionnement simplifié (élancements usuels, résistance et flèche, flambement), à recaler dès que le calcul existe.'),
            el('li', {}, 'L\'impact de production des matériaux (A1–A3, kgCO₂e), en ACV statique.'),
            el('li', {}, 'Le carbone biogénique stocké dans le bois, affiché à part et jamais déduit du total.'))),
          el('div', {}, el('h3', {}, 'Ce qu\'il ne calcule pas'), el('ul', { class: 'list con' },
            el('li', {}, 'Transport, chantier, vie en œuvre et fin de vie (A4–A5, B, C) ni bénéfices au-delà du cycle de vie (D).'),
            el('li', {}, 'L\'ACV dynamique de la RE2020 (indicateur Ic construction) ni ses seuils.'),
            el('li', {}, 'Les fondations, les contreventements, les assemblages détaillés, le feu et l\'acoustique, qui peuvent inverser un classement.'),
            el('li', {}, 'Une connexion en temps réel à INIES : la base n\'offre pas d\'accès public direct depuis une page web. Le webservice INIES est soumis à une demande d\'accès.')))))));
    renderSide(); render(); renderFactors();
  };
})(window.S);
