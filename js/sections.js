/* Bibliothèque de matériaux et de sections.
   Unités : E en MPa, rho en kN/m³, A en cm², I en cm⁴, h en mm. */
(function (S) {
  'use strict';

  S.MATERIALS = {
    acier: { name: 'Acier S355', E: 210000, rho: 78.5, fy: 355 },
    beton: { name: 'Béton C25/30', E: 31000, rho: 25, fy: 25 },
    bois: { name: 'Bois lamellé-collé GL24h', E: 11500, rho: 4.2, fy: 24 },
    boism: { name: 'Bois massif C24', E: 11000, rho: 4.2, fy: 24 },
    alu: { name: 'Aluminium 6060', E: 70000, rho: 27, fy: 150 }
  };

  const list = [];
  const add = (key, label, group, mat, A, I, h) => list.push({ key, label, group, mat, A, I, h });

  // IPE — A (cm²), Iy (cm⁴), h (mm)
  [[100, 10.3, 171], [120, 13.2, 318], [140, 16.4, 541], [160, 20.1, 869], [180, 23.9, 1317],
   [200, 28.5, 1943], [220, 33.4, 2772], [240, 39.1, 3892], [270, 45.9, 5790], [300, 53.8, 8356],
   [330, 62.6, 11770], [360, 72.7, 16270], [400, 84.5, 23130], [450, 98.8, 33740], [500, 116, 48200],
   [550, 134, 67120], [600, 156, 92080]]
    .forEach(([n, A, I]) => add('IPE' + n, 'IPE ' + n, 'Acier — IPE', 'acier', A, I, n));
  // HEA
  [[100, 21.2, 349, 96], [120, 25.3, 606, 114], [140, 31.4, 1033, 133], [160, 38.8, 1673, 152],
   [180, 45.3, 2510, 171], [200, 53.8, 3692, 190], [220, 64.3, 5410, 210], [240, 76.8, 7763, 230],
   [260, 86.8, 10450, 250], [280, 97.3, 13670, 270], [300, 112.5, 18260, 290], [400, 159, 45070, 390],
   [500, 198, 86970, 490]]
    .forEach(([n, A, I, h]) => add('HEA' + n, 'HEA ' + n, 'Acier — HEA', 'acier', A, I, h));
  // HEB
  [[200, 78.1, 5696], [240, 106, 11260], [300, 149, 25170], [400, 198, 57680]]
    .forEach(([n, A, I]) => add('HEB' + n, 'HEB ' + n, 'Acier — HEB', 'acier', A, I, n));

  // Tubes carrés (valeurs approchées, angles vifs)
  [[60, 4], [80, 5], [100, 5], [120, 6], [150, 6], [200, 8], [250, 10]].forEach(([b, t]) => {
    const bi = b - 2 * t;
    const A = (b * b - bi * bi) / 100;
    const I = (b ** 4 - bi ** 4) / 12 / 1e4;
    add(`SHS${b}x${t}`, `Tube □${b}×${t}`, 'Acier — tubes', 'acier', +A.toFixed(2), +I.toFixed(1), b);
  });
  // Ronds pleins (tirants)
  [16, 20, 24, 30, 40, 60].forEach(d => {
    const A = Math.PI * d * d / 4 / 100;
    const I = Math.PI * d ** 4 / 64 / 1e4;
    add('R' + d, `Rond Ø${d}`, 'Acier — tirants', 'acier', +A.toFixed(2), +I.toFixed(2), d);
  });

  const rect = (b, h) => [b * h / 100, b * h ** 3 / 12 / 1e4];
  // Bois (b × h en mm)
  [[63, 175, 'boism'], [75, 225, 'boism'], [100, 300, 'bois'], [140, 400, 'bois'], [160, 600, 'bois'],
   [200, 800, 'bois'], [200, 1200, 'bois']].forEach(([b, h, m]) => {
    const [A, I] = rect(b, h);
    add(`B${b}x${h}`, `${m === 'bois' ? 'GL24h' : 'C24'} ${b}×${h}`, 'Bois', m, +A.toFixed(1), +I.toFixed(0), h);
  });
  // Béton (b × h en cm)
  [[20, 20], [25, 25], [30, 30], [40, 40], [20, 40], [25, 50], [30, 60], [40, 80], [50, 100], [100, 20]]
    .forEach(([b, h]) => {
      const [A, I] = rect(b * 10, h * 10);
      add(`BA${b}x${h}`, `BA ${b}×${h}`, 'Béton armé', 'beton', +A.toFixed(0), +I.toFixed(0), h * 10);
    });

  S.SECTIONS = list;
  S.SECTION = Object.fromEntries(list.map(s => [s.key, s]));

  // Propriétés effectives d'une barre (section de la bibliothèque ou personnalisée)
  S.secProps = function (e) {
    if (e.sec === 'custom') {
      return { label: 'Personnalisée', E: +e.E || 210000, A: +e.A || 10, I: +e.I || 1000, h: +e.h || 200, rho: +e.rho || 78.5, fy: null };
    }
    const s = S.SECTION[e.sec] || S.SECTION.IPE300;
    const m = S.MATERIALS[s.mat];
    return { label: s.label, E: m.E, A: s.A, I: s.I, h: s.h, rho: m.rho, fy: m.fy, mat: s.mat };
  };

  // <select> de sections groupées
  S.sectionSelect = function (value, onchange, withCustom = true) {
    const sel = S.el('select', { onchange: e => onchange(e.target.value) });
    const groups = {};
    list.forEach(s => (groups[s.group] = groups[s.group] || []).push(s));
    for (const g in groups) {
      const og = S.el('optgroup', { label: g });
      groups[g].forEach(s => og.append(S.el('option', { value: s.key }, s.label)));
      sel.append(og);
    }
    if (withCustom) sel.append(S.el('option', { value: 'custom' }, 'Personnalisée…'));
    sel.value = value;
    return sel;
  };
})(window.S);
