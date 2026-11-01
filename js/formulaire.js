/* Formulaire illustré : chaque cas est présenté comme une planche (chargement, V, M, déformée)
   annotée de ses formules. */
(function (S) {
  'use strict';
  const el = S.el, sv = S.svg;
  S.pages = S.pages || {};

  const IN = {
    L: { label: 'Portée L', unit: 'm', def: 6, min: 0.5, max: 40, step: 0.1 },
    q: { label: 'Charge répartie q', unit: 'kN/m', def: 10, min: 0, max: 100, step: 0.5 },
    P: { label: 'Charge ponctuelle P', unit: 'kN', def: 20, min: 0, max: 500, step: 1 },
    a: { label: 'Distance a', unit: 'm', def: 2, min: 0, max: 40, step: 0.1 },
    M0: { label: 'Moment appliqué M₀', unit: 'kN·m', def: 20, min: 0, max: 500, step: 1 },
    f: { label: 'Flèche (montée) f', unit: 'm', def: 3, min: 0.1, max: 50, step: 0.1 },
    h: { label: 'Hauteur h', unit: 'm', def: 1.5, min: 0.1, max: 20, step: 0.05 },
    H: { label: 'Hauteur des poteaux h', unit: 'm', def: 5, min: 1, max: 20, step: 0.1 }
  };

  const S3 = Math.sqrt(3);
  const r = (label, formula, value, unit, hl) => ({ label, formula, value, unit, hl });

  /* ------------------------------------------------------------------ cas « poutre »
     sup(v)   : appuis [[x, type, nom]]
     loads(v) : charges à dessiner (t: udl | tri | point | mom)
     dims(v)  : cotes [[x0, x1, libellé]]
     R        : libellés des réactions, dans l'ordre des appuis
     V, M     : annotations [[x / Lt, formule]] ; f : formule de flèche (placée au maximum)
     eq       : équations des diagrammes */
  const BEAMS = [
    {
      id: 'ss-udl', group: 'Poutres sur deux appuis', title: 'Charge uniformément répartie',
      inputs: ['L', 'q'], len: v => v.L, sup: v => [[0, 'rotule', 'A'], [v.L, 'appui', 'B']],
      loads: v => [{ t: 'udl', x0: 0, x1: v.L, lab: 'q' }], dims: v => [[0, v.L, 'L']],
      M: (x, v) => v.q * x * (v.L - x) / 2,
      R: ['qL/2', 'qL/2'], V: [[0, 'qL/2'], [1, '−qL/2']], Ma: [[0.5, 'qL²/8']], f: '5qL⁴ / 384EI',
      eq: ['V(x) = q (L/2 − x)', 'M(x) = q x (L − x) / 2'],
      res: (v, EI) => [
        r('Réactions R_A = R_B', 'qL/2', v.q * v.L / 2, 'kN'),
        r('Moment max', 'qL²/8 — à mi-portée', v.q * v.L ** 2 / 8, 'kN·m', 1),
        r('Tranchant max', 'qL/2 — sur appuis', v.q * v.L / 2, 'kN'),
        r('Flèche max', '5qL⁴ / 384EI — à mi-portée', 5 * v.q * v.L ** 4 / (384 * EI) * 1e3, 'mm', 1)]
    },
    {
      id: 'ss-point', group: 'Poutres sur deux appuis', title: 'Charge ponctuelle quelconque',
      inputs: ['L', 'P', 'a'], len: v => v.L, sup: v => [[0, 'rotule', 'A'], [v.L, 'appui', 'B']],
      fix: v => { v.a = S.clamp(v.a, 0.05 * v.L, 0.95 * v.L); },
      loads: v => [{ t: 'point', x: v.a, lab: 'P' }], dims: v => [[0, v.a, 'a'], [v.a, v.L, 'b']],
      M: (x, v) => { const b = v.L - v.a; return x <= v.a ? v.P * b * x / v.L : v.P * v.a * (v.L - x) / v.L; },
      R: ['Pb/L', 'Pa/L'], V: [[0, 'Pb/L'], [1, '−Pa/L']], Ma: [[v => v.a / v.L, 'Pab/L']], f: 'Pc(L² − c²)^1,5 / 9√3·L·EI',
      eq: ['M(x) = Pb·x / L  pour x ≤ a', 'M(x) = Pa·(L − x) / L  pour x ≥ a', 'c = min(a, b)'],
      res: (v, EI) => {
        const b = v.L - v.a, c = Math.min(v.a, b);
        return [
          r('Réaction R_A', 'Pb/L', v.P * b / v.L, 'kN'), r('Réaction R_B', 'Pa/L', v.P * v.a / v.L, 'kN'),
          r('Moment max', 'Pab/L — sous la charge', v.P * v.a * b / v.L, 'kN·m', 1),
          r('Flèche max', 'Pc(L² − c²)^1,5 / (9√3·L·EI)', v.P * c * Math.pow(v.L ** 2 - c * c, 1.5) / (9 * S3 * v.L * EI) * 1e3, 'mm', 1)];
      }
    },
    {
      id: 'ss-2p', group: 'Poutres sur deux appuis', title: 'Deux charges symétriques',
      inputs: ['L', 'P', 'a'], len: v => v.L, sup: v => [[0, 'rotule', 'A'], [v.L, 'appui', 'B']],
      fix: v => { v.a = S.clamp(v.a, 0.05 * v.L, v.L / 2); },
      loads: v => [{ t: 'point', x: v.a, lab: 'P' }, { t: 'point', x: v.L - v.a, lab: 'P' }],
      dims: v => [[0, v.a, 'a'], [v.a, v.L - v.a, 'L − 2a'], [v.L - v.a, v.L, 'a']],
      M: (x, v) => v.P * Math.min(x, v.a, v.L - x),
      R: ['P', 'P'], V: [[0, 'P'], [1, '−P']], Ma: [[0.5, 'Pa']], f: 'Pa(3L² − 4a²) / 24EI',
      eq: ['M constant = Pa entre les charges (flexion pure, V = 0)'],
      res: (v, EI) => [
        r('Réactions', 'P', v.P, 'kN'),
        r('Moment max', 'Pa — constant entre les charges', v.P * v.a, 'kN·m', 1),
        r('Flèche max', 'Pa(3L² − 4a²) / 24EI', v.P * v.a * (3 * v.L ** 2 - 4 * v.a ** 2) / (24 * EI) * 1e3, 'mm', 1)]
    },
    {
      id: 'ss-tri', group: 'Poutres sur deux appuis', title: 'Charge triangulaire',
      inputs: ['L', 'q'], len: v => v.L, sup: v => [[0, 'rotule', 'A'], [v.L, 'appui', 'B']],
      loads: v => [{ t: 'tri', x0: 0, x1: v.L, lab: 'q' }], dims: v => [[0, v.L, 'L']],
      M: (x, v) => v.q * v.L * x / 6 - v.q * x ** 3 / (6 * v.L),
      R: ['qL/6', 'qL/3'], V: [[0, 'qL/6'], [1, '−qL/3']], Ma: [[1 / S3, 'qL² / 9√3']], f: '0,00652 qL⁴ / EI',
      eq: ['M(x) = qLx/6 − qx³/6L', 'M max en x = L/√3 ≈ 0,577 L'],
      res: (v, EI) => [
        r('Réaction R_A', 'qL/6', v.q * v.L / 6, 'kN'), r('Réaction R_B', 'qL/3', v.q * v.L / 3, 'kN'),
        r('Moment max', 'qL² / 9√3 — en x = L/√3', v.q * v.L ** 2 / (9 * S3), 'kN·m', 1),
        r('Flèche max', '≈ 0,00652·qL⁴ / EI', 0.00652 * v.q * v.L ** 4 / EI * 1e3, 'mm', 1)]
    },
    {
      id: 'ss-mom', group: 'Poutres sur deux appuis', title: 'Moment sur appui',
      inputs: ['L', 'M0'], len: v => v.L, sup: v => [[0, 'rotule', 'A'], [v.L, 'appui', 'B']],
      loads: v => [{ t: 'mom', x: 0, lab: 'M₀', ccw: true }], dims: v => [[0, v.L, 'L']],
      M: (x, v) => v.M0 * (1 - x / v.L),
      R: ['−M₀/L', 'M₀/L'], V: [[0.5, '−M₀/L']], Ma: [[0, 'M₀']], f: 'M₀L² / 9√3·EI',
      eq: ['M(x) = M₀ (1 − x/L)', 'V constant = −M₀/L'],
      res: (v, EI) => [
        r('Réactions', '±M₀/L', v.M0 / v.L, 'kN'),
        r('Moment max', 'M₀ — sur l\'appui chargé', v.M0, 'kN·m', 1),
        r('Flèche max', 'M₀L² / (9√3·EI)', v.M0 * v.L ** 2 / (9 * S3 * EI) * 1e3, 'mm', 1)]
    },
    {
      id: 'c-udl', group: 'Consoles', title: 'Console — charge répartie',
      inputs: ['L', 'q'], cant: true, len: v => v.L, sup: v => [[0, 'encastrement', 'A']],
      loads: v => [{ t: 'udl', x0: 0, x1: v.L, lab: 'q' }], dims: v => [[0, v.L, 'L']],
      M: (x, v) => -v.q * (v.L - x) ** 2 / 2,
      R: ['qL'], V: [[0, 'qL']], Ma: [[0, '−qL²/2']], f: 'qL⁴ / 8EI',
      eq: ['M(x) = −q (L − x)² / 2', 'V(x) = q (L − x)'],
      res: (v, EI) => [
        r('Réaction R_A', 'qL', v.q * v.L, 'kN'),
        r('Moment d\'encastrement', '−qL²/2', -v.q * v.L ** 2 / 2, 'kN·m', 1),
        r('Flèche en bout', 'qL⁴ / 8EI', v.q * v.L ** 4 / (8 * EI) * 1e3, 'mm', 1)]
    },
    {
      id: 'c-point', group: 'Consoles', title: 'Console — charge en bout',
      inputs: ['L', 'P'], cant: true, len: v => v.L, sup: v => [[0, 'encastrement', 'A']],
      loads: v => [{ t: 'point', x: v.L, lab: 'P' }], dims: v => [[0, v.L, 'L']],
      M: (x, v) => -v.P * (v.L - x),
      R: ['P'], V: [[0.5, 'P']], Ma: [[0, '−PL']], f: 'PL³ / 3EI',
      eq: ['M(x) = −P (L − x)', 'V constant = P'],
      res: (v, EI) => [
        r('Réaction R_A', 'P', v.P, 'kN'),
        r('Moment d\'encastrement', '−PL', -v.P * v.L, 'kN·m', 1),
        r('Flèche en bout', 'PL³ / 3EI', v.P * v.L ** 3 / (3 * EI) * 1e3, 'mm', 1)]
    },
    {
      id: 'c-mom', group: 'Consoles', title: 'Console — moment en bout',
      inputs: ['L', 'M0'], cant: true, len: v => v.L, sup: v => [[0, 'encastrement', 'A']],
      loads: v => [{ t: 'mom', x: v.L, lab: 'M₀', ccw: false }], dims: v => [[0, v.L, 'L']],
      M: (x, v) => -v.M0,
      R: ['0'], V: [], Ma: [[0.5, '−M₀']], f: 'M₀L² / 2EI',
      eq: ['M constant = −M₀ (flexion pure)', 'Déformée en arc de cercle'],
      res: (v, EI) => [
        r('Moment', '−M₀ — constant', -v.M0, 'kN·m', 1),
        r('Flèche en bout', 'M₀L² / 2EI', v.M0 * v.L ** 2 / (2 * EI) * 1e3, 'mm', 1)]
    },
    {
      id: 'ff-udl', group: 'Poutres hyperstatiques', title: 'Bi-encastrée — charge répartie',
      inputs: ['L', 'q'], len: v => v.L, sup: v => [[0, 'encastrement', 'A'], [v.L, 'encastrement', 'B']],
      loads: v => [{ t: 'udl', x0: 0, x1: v.L, lab: 'q' }], dims: v => [[0, v.L, 'L']],
      M: (x, v) => v.q * x * (v.L - x) / 2 - v.q * v.L ** 2 / 12,
      R: ['qL/2', 'qL/2'], V: [[0, 'qL/2'], [1, '−qL/2']], Ma: [[0, '−qL²/12'], [0.5, 'qL²/24'], [1, '−qL²/12']], f: 'qL⁴ / 384EI',
      eq: ['M(x) = qx(L − x)/2 − qL²/12', 'Flèche 5 fois plus faible qu\'en isostatique'],
      res: (v, EI) => [
        r('Réactions', 'qL/2', v.q * v.L / 2, 'kN'),
        r('Moment sur appuis', '−qL²/12', -v.q * v.L ** 2 / 12, 'kN·m', 1),
        r('Moment en travée', 'qL²/24', v.q * v.L ** 2 / 24, 'kN·m'),
        r('Flèche max', 'qL⁴ / 384EI', v.q * v.L ** 4 / (384 * EI) * 1e3, 'mm', 1)]
    },
    {
      id: 'ff-point', group: 'Poutres hyperstatiques', title: 'Bi-encastrée — charge centrée',
      inputs: ['L', 'P'], len: v => v.L, sup: v => [[0, 'encastrement', 'A'], [v.L, 'encastrement', 'B']],
      loads: v => [{ t: 'point', x: v.L / 2, lab: 'P' }], dims: v => [[0, v.L / 2, 'L/2'], [v.L / 2, v.L, 'L/2']],
      M: (x, v) => v.P * Math.min(x, v.L - x) / 2 - v.P * v.L / 8,
      R: ['P/2', 'P/2'], V: [[0, 'P/2'], [1, '−P/2']], Ma: [[0, '−PL/8'], [0.5, 'PL/8'], [1, '−PL/8']], f: 'PL³ / 192EI',
      eq: ['M(x) = Px/2 − PL/8  pour x ≤ L/2'],
      res: (v, EI) => [
        r('Réactions', 'P/2', v.P / 2, 'kN'),
        r('Moment sur appuis', '−PL/8', -v.P * v.L / 8, 'kN·m', 1),
        r('Moment en travée', 'PL/8', v.P * v.L / 8, 'kN·m'),
        r('Flèche max', 'PL³ / 192EI', v.P * v.L ** 3 / (192 * EI) * 1e3, 'mm', 1)]
    },
    {
      id: 'fp-udl', group: 'Poutres hyperstatiques', title: 'Encastrée-appuyée — charge répartie',
      inputs: ['L', 'q'], len: v => v.L, sup: v => [[0, 'encastrement', 'A'], [v.L, 'appui', 'B']],
      loads: v => [{ t: 'udl', x0: 0, x1: v.L, lab: 'q' }], dims: v => [[0, v.L, 'L']],
      M: (x, v) => 3 * v.q * v.L / 8 * (v.L - x) - v.q * (v.L - x) ** 2 / 2,
      R: ['5qL/8', '3qL/8'], V: [[0, '5qL/8'], [1, '−3qL/8']], Ma: [[0, '−qL²/8'], [0.625, '9qL²/128']], f: 'qL⁴ / 185EI',
      eq: ['M(x) = 3qL(L − x)/8 − q(L − x)²/2', 'M max en travée à 3L/8 de B'],
      res: (v, EI) => [
        r('Réaction R_A', '5qL/8', 5 * v.q * v.L / 8, 'kN'), r('Réaction R_B', '3qL/8', 3 * v.q * v.L / 8, 'kN'),
        r('Moment d\'encastrement', '−qL²/8', -v.q * v.L ** 2 / 8, 'kN·m', 1),
        r('Moment en travée', '9qL²/128', 9 * v.q * v.L ** 2 / 128, 'kN·m'),
        r('Flèche max', 'qL⁴ / 185EI', v.q * v.L ** 4 / (185 * EI) * 1e3, 'mm', 1)]
    },
    {
      id: 'fp-point', group: 'Poutres hyperstatiques', title: 'Encastrée-appuyée — charge centrée',
      inputs: ['L', 'P'], len: v => v.L, sup: v => [[0, 'encastrement', 'A'], [v.L, 'appui', 'B']],
      loads: v => [{ t: 'point', x: v.L / 2, lab: 'P' }], dims: v => [[0, v.L / 2, 'L/2'], [v.L / 2, v.L, 'L/2']],
      M: (x, v) => 5 * v.P / 16 * (v.L - x) - (x < v.L / 2 ? v.P * (v.L / 2 - x) : 0),
      R: ['11P/16', '5P/16'], V: [[0, '11P/16'], [1, '−5P/16']], Ma: [[0, '−3PL/16'], [0.5, '5PL/32']], f: 'PL³ / 48√5·EI',
      eq: ['M(x) = 5P(L − x)/16 − P(L/2 − x)  pour x ≤ L/2'],
      res: (v, EI) => [
        r('Réaction R_A', '11P/16', 11 * v.P / 16, 'kN'), r('Réaction R_B', '5P/16', 5 * v.P / 16, 'kN'),
        r('Moment d\'encastrement', '−3PL/16', -3 * v.P * v.L / 16, 'kN·m', 1),
        r('Moment sous la charge', '5PL/32', 5 * v.P * v.L / 32, 'kN·m'),
        r('Flèche max', 'PL³ / (48√5·EI)', v.P * v.L ** 3 / (48 * Math.sqrt(5) * EI) * 1e3, 'mm', 1)]
    },
    {
      id: 'cont2', group: 'Poutres continues', title: 'Deux travées égales — charge répartie',
      inputs: ['L', 'q'], len: v => 2 * v.L, sup: v => [[0, 'rotule', 'A'], [v.L, 'appui', 'B'], [2 * v.L, 'appui', 'C']],
      loads: v => [{ t: 'udl', x0: 0, x1: 2 * v.L, lab: 'q' }], dims: v => [[0, v.L, 'L'], [v.L, 2 * v.L, 'L']],
      M: (x, v) => { const y = x <= v.L ? x : 2 * v.L - x; return 3 * v.q * v.L / 8 * y - v.q * y * y / 2; },
      R: ['3qL/8', '5qL/4', '3qL/8'], V: [[0, '3qL/8'], [0.494, '−5qL/8'], [0.506, '5qL/8'], [1, '−3qL/8']],
      Ma: [[0.1875, '9qL²/128'], [0.5, '−qL²/8'], [0.8125, '9qL²/128']], f: 'qL⁴ / 185EI',
      eq: ['Moment sur appui central : −qL²/8', 'Comparer à qL²/8 en isostatique'],
      res: (v, EI) => [
        r('Réactions de rive', '3qL/8', 3 * v.q * v.L / 8, 'kN'), r('Réaction centrale', '5qL/4', 5 * v.q * v.L / 4, 'kN'),
        r('Moment sur appui', '−qL²/8', -v.q * v.L ** 2 / 8, 'kN·m', 1),
        r('Moment en travée', '9qL²/128', 9 * v.q * v.L ** 2 / 128, 'kN·m'),
        r('Flèche max', 'qL⁴ / 185EI', v.q * v.L ** 4 / (185 * EI) * 1e3, 'mm', 1)]
    },
    {
      id: 'cont3', group: 'Poutres continues', title: 'Trois travées égales — charge répartie',
      inputs: ['L', 'q'], len: v => 3 * v.L, sup: v => [[0, 'rotule', 'A'], [v.L, 'appui', 'B'], [2 * v.L, 'appui', 'C'], [3 * v.L, 'appui', 'D']],
      loads: v => [{ t: 'udl', x0: 0, x1: 3 * v.L, lab: 'q' }], dims: v => [[0, v.L, 'L'], [v.L, 2 * v.L, 'L'], [2 * v.L, 3 * v.L, 'L']],
      M: (x, v) => {
        const L = v.L, q = v.q, y = x <= 1.5 * L ? x : 3 * L - x;
        return 0.4 * q * L * y - q * y * y / 2 + (y > L ? 1.1 * q * L * (y - L) : 0);
      },
      R: ['0,4qL', '1,1qL', '1,1qL', '0,4qL'], V: [[0, '0,4qL'], [0.329, '−0,6qL'], [0.338, '0,5qL']],
      Ma: [[0.133, '0,08qL²'], [1 / 3, '−0,1qL²'], [0.5, '0,025qL²'], [2 / 3, '−0,1qL²'], [0.867, '0,08qL²']], f: '0,0069 qL⁴ / EI',
      eq: ['Moments sur appuis : −qL²/10', 'Travée de rive la plus sollicitée'],
      res: (v, EI) => [
        r('Réactions de rive', '0,4·qL', 0.4 * v.q * v.L, 'kN'), r('Réactions intermédiaires', '1,1·qL', 1.1 * v.q * v.L, 'kN'),
        r('Moments sur appuis', '−0,10·qL²', -0.1 * v.q * v.L ** 2, 'kN·m', 1),
        r('Travée de rive', '0,080·qL²', 0.08 * v.q * v.L ** 2, 'kN·m'),
        r('Travée centrale', '0,025·qL²', 0.025 * v.q * v.L ** 2, 'kN·m'),
        r('Flèche max', '0,0069·qL⁴ / EI — travée de rive', 0.0069 * v.q * v.L ** 4 / EI * 1e3, 'mm', 1)]
    }
  ];
  BEAMS.forEach(b => (b.kind = 'beam'));

  // ------------------------------------------------------------------ autres cas
  const OTHERS = [
    { id: 'arc3', group: 'Arcs, câbles, treillis', title: 'Arc parabolique à 3 articulations', inputs: ['L', 'f', 'q'], defs: { L: 30, f: 6, q: 20 }, kind: 'arc',
      icon: '<path d="M6 25 Q26 -5 46 25"/><path class="tf" d="M6 25 l-2.6 4 h5.2 z M46 25 l-2.6 4 h5.2 z"/><circle cx="26" cy="10" r="1.8" fill="#fff"/>' },
    { id: 'cable', group: 'Arcs, câbles, treillis', title: 'Câble parabolique', inputs: ['L', 'f', 'q'], defs: { L: 50, f: 5, q: 10 }, kind: 'cable',
      icon: '<path d="M6 6 Q26 36 46 6"/><path class="tf" d="M6 6 l-2.6 -4 h5.2 z M46 6 l-2.6 -4 h5.2 z"/>' },
    { id: 'arc-flambement', group: 'Arcs, câbles, treillis', title: 'Flambement d\'un arc dans son plan', inputs: ['L', 'f', 'q'], defs: { L: 30, f: 6, q: 20 }, kind: 'arcbuck', numeric: true,
      fix: v => { if (v.forme === 'circ') v.f = Math.min(v.f, v.L / 2); }, // au plus un demi-cercle
      icon: '<path d="M6 25 Q26 -5 46 25"/><path class="tq" d="M6 25 Q14 2 26 10 Q38 20 46 25"/><path class="tf" d="M6 25 l-2.6 4 h5.2 z M46 25 l-2.6 4 h5.2 z"/>' },
    { id: 'truss', group: 'Arcs, câbles, treillis', title: 'Poutre treillis — efforts globaux', inputs: ['L', 'h', 'q'], defs: { L: 24, h: 2.4, q: 20 }, kind: 'truss',
      icon: '<path d="M6 10 H46 M6 22 H46"/><path class="tl" d="M6 10 V22 M12.7 10 V22 M19.3 10 V22 M26 10 V22 M32.7 10 V22 M39.3 10 V22 M46 10 V22 M6 10 L12.7 22 M12.7 10 L19.3 22 M19.3 10 L26 22 M26 22 L32.7 10 M32.7 22 L39.3 10 M39.3 22 L46 10"/><path class="tf" d="M6 22 l-2.6 4 h5.2 z M46 22 l-2.6 4 h5.2 z"/>' },
    { id: 'portal', group: 'Portiques', title: 'Portique bi-articulé — charge sur traverse', inputs: ['L', 'H', 'q'], defs: { L: 12, H: 5, q: 15 }, kind: 'portal',
      icon: '<path class="tq" d="M10 3 H42"/><path d="M10 25 V7 H42 V25"/><path class="tf" d="M10 25 l-2.6 4 h5.2 z M42 25 l-2.6 4 h5.2 z"/>' },
    { id: 'portal-fixed', group: 'Portiques', title: 'Portique bi-encastré — charge sur traverse', inputs: ['L', 'H', 'q'], defs: { L: 12, H: 5, q: 15 }, kind: 'portalf',
      icon: '<path class="tq" d="M10 3 H42"/><path d="M10 26 V7 H42 V26 M6 26 h8 M38 26 h8"/>' },
    { id: 'euler', group: 'Stabilité & sections', title: 'Flambement d\'Euler', inputs: ['L'], defs: { L: 4 }, kind: 'euler', numeric: true,
      icon: '<path d="M26 28 Q34 15 26 4" /><path d="M26 28 V4" class="tl" stroke-dasharray="2 2"/><path class="tq" d="M26 0 V3"/><path d="M20 28 h12"/>' },
    { id: 'section', group: 'Stabilité & sections', title: 'Caractéristiques de section', inputs: [], kind: 'section', numeric: true,
      icon: '<path d="M16 4 H36 M16 26 H36 M26 4 V26" stroke-width="3"/>' },
  ];

  const CASES = [...BEAMS, ...OTHERS];
  const CASE = Object.fromEntries(CASES.map(c => [c.id, c]));

  // Vignette d'un cas de poutre (boîte 52 × 30)
  function beamIcon(c) {
    const v = getValues(c), Lt = c.len(v), X = x => (6 + 40 * x / Lt).toFixed(1), y = 15;
    let s = `<path d="M6 ${y} H46"/>`;
    for (const ld of c.loads(v)) {
      if (ld.t === 'udl') s += `<path class="tq" d="M${X(ld.x0)} ${y - 5} H${X(ld.x1)}"/>`;
      else if (ld.t === 'tri') s += `<path class="tq" d="M${X(ld.x0)} ${y - 2} L${X(ld.x1)} ${y - 9} V${y - 2}"/>`;
      else if (ld.t === 'point') s += `<path class="tq" d="M${X(ld.x)} ${y - 11} V${y - 2} m-2 -3 l2 3 l2 -3"/>`;
      else s += `<path class="tq" d="M${+X(ld.x) - 4} ${y - 3} a4 4 0 1 1 8 0"/>`;
    }
    for (const [x, t] of c.sup(v)) {
      if (t === 'encastrement') s += `<path d="M${X(x)} ${y - 5} v10"/>`;
      else s += `<path class="tf" d="M${X(x)} ${y} l-2.6 4 h5.2 z"/>`;
    }
    return s;
  }

  const values = {};
  let secKey = 'IPE300';
  function getValues(c) {
    if (!values[c.id]) {
      values[c.id] = {};
      c.inputs.forEach(k => (values[c.id][k] = (c.defs && c.defs[k] != null) ? c.defs[k] : IN[k].def));
    }
    return values[c.id];
  }

  S.pages.formulaire = function (root, sub) {
    const id = CASE[sub[0]] ? sub[0] : 'ss-udl';
    const picker = S.picker(CASES.map(c => ({ id: c.id, label: c.title, group: c.group, svg: c.icon || beamIcon(c) })),
      id, k => S.navigate('#/formulaire/' + k, true), { label: 'Cas de charge', one: true });
    const main = el('div', { class: 'case-main' });
    root.append(el('div', { class: 'page' },
      S.blockHead('02', 'Formulaire', 'Les cas classiques de la résistance des matériaux, présentés comme des planches : chargement, effort tranchant, moment fléchissant et déformée, avec leurs formules.'),
      el('div', { class: 'form-layout' }, el('aside', { class: 'case-list' }, picker.el), main),
      essentials()));
    renderCase(main, CASE[id]);
  };

  function inputRow(def, val, onChange) {
    const num = el('input', { type: 'number', step: def.step, value: val });
    const rng = el('input', { type: 'range', min: def.min, max: def.max, step: def.step, value: val });
    num.addEventListener('input', () => { const v = parseFloat(num.value); if (isFinite(v)) { rng.value = v; onChange(v); } });
    rng.addEventListener('input', () => { num.value = rng.value; onChange(+rng.value); });
    return el('div', {}, el('label', { class: 'in' }, el('span', {}, `${def.label}${def.unit ? ' (' + def.unit + ')' : ''}`), num), rng);
  }

  function numericRows(rows) {
    return el('div', { class: 'results' }, rows.map(x => el('div', { class: 'res' + (x.hl ? ' hl' : '') },
      el('div', { class: 'f' }, el('b', {}, x.label), x.formula ? el('span', {}, x.formula) : null),
      el('div', { class: 'v' }, typeof x.value === 'string' ? x.value : S.fmtAuto(x.value), ' ', el('small', {}, x.unit || '')))));
  }

  // Liste des formules (sans valeurs) : « libellé — formule », commentaire après « — »
  function formulaList(rows) {
    return rows.map(x => {
      const [f, ...rest] = String(x.formula).split(' — ');
      return el('div', { class: 'fm' + (x.hl ? ' hl' : '') }, el('b', {}, x.label), el('span', {}, f), rest.length ? el('small', {}, rest.join(' — ')) : null);
    });
  }

  function renderCase(main, c) {
    main.innerHTML = '';
    const v = getValues(c);
    const inputs = el('div', { class: 'inputs' });
    const fig = el('div');
    const fms = el('div');
    const update = () => {
      if (c.fix) c.fix(v);
      const R = RENDER[c.kind](c, v);
      fig.innerHTML = ''; fig.append(...R.figs);
      fms.innerHTML = '';
      if (c.numeric) fms.append(numericRows(R.rows));
      else fms.append(...formulaList(R.rows));
      if (R.eq) fms.append(el('div', { class: 'eqs' }, R.eq.map(e => el('div', {}, e))));
      if (R.note) fms.append(el('p', { class: 'note', style: 'margin-top:12px' }, R.note));
    };
    c.inputs.forEach(k => inputs.append(inputRow(IN[k], v[k], val => { v[k] = val; update(); })));
    (EXTRA[c.kind] || (() => { }))(inputs, c, v, update);

    const right = c.numeric
      ? el('div', { class: 'formulas' }, el('h3', {}, 'Données'), inputs, el('h3', { style: 'margin-top:16px' }, 'Résultats'), fms)
      : el('div', { class: 'formulas' }, el('h3', {}, 'Formules'), fms);
    main.append(
      el('div', { class: 'case-title' }, el('small', {}, c.group), el('h2', {}, c.title)),
      el('div', { class: 'case-top' }, el('div', { class: 'sheet' }, fig), right));
    update();
  }

  // ------------------------------------------------------------------ formules essentielles
  const ESSENTIALS = [
    ['M = qL²/8', 'Moment d\'une poutre sur deux appuis', 'Doubler la portée multiplie le moment par 4.'],
    ['f = 5qL⁴ / 384EI', 'Flèche d\'une poutre sur deux appuis', 'Doubler la portée multiplie la flèche par 16 : la rigidité gouverne souvent les grandes portées.'],
    ['R = V = qL/2', 'Réactions et effort tranchant', 'Chaque appui reprend la moitié de la charge totale.'],
    ['I = bh³/12   W = bh²/6', 'Inertie et module d\'un rectangle', 'Doubler la hauteur multiplie la rigidité par 8 et la résistance par 4.'],
    ['σ = N/A + M/W', 'Contrainte dans une section', 'La compression ou la traction s\'ajoute à la flexion ; σ doit rester sous la résistance du matériau.'],
    ['N = M / h', 'Bras de levier (treillis, membrures)', 'La hauteur structurelle transforme un moment en un couple traction / compression.'],
    ['H = qL² / 8f', 'Poussée d\'un arc, traction d\'un câble', 'Plus l\'arc est surbaissé (f petit), plus la poussée est forte.'],
    ['N_cr = π²EI / L_f²', 'Charge critique d\'Euler', 'Doubler la longueur de flambement divise la charge critique par 4.']
  ];
  function essentials() {
    return el('section', { class: 'og-sec', style: 'margin-top:clamp(48px,8vh,96px)' },
      el('div', { class: 'sub-head' }, S.blockHead('À retenir', 'Les formules essentielles', 'Huit relations qui suffisent à raisonner juste sur la plupart des structures.', 'h2')),
      el('div', { class: 'essentials' }, ESSENTIALS.map(([f, t, txt], i) => el('div', { class: 'ess' },
        el('span', { class: 'num' }, String(i + 1).padStart(2, '0')), el('div', { class: 'big' }, f), el('b', {}, t), el('p', {}, txt)))));
  }

  const EXTRA = {
    arcbuck(box, c, v, update) {
      v.forme = v.forme || 'para'; v.appuis = v.appuis || 'art'; v.sec = v.sec || 'HEA300';
      const mk = (k, label, opts) => { const s = el('select', { onchange: e => { v[k] = e.target.value; update(); } }, opts.map(([a, b]) => el('option', { value: a }, b))); s.value = v[k]; return el('label', { class: 'in full' }, el('span', {}, label), s); };
      box.append(mk('forme', 'Forme', [['para', 'Parabolique'], ['circ', 'Circulaire']]),
        mk('appuis', 'Appuis', [['art', 'Bi-articulé (ou 3 articulations)'], ['enc', 'Bi-encastré']]),
        el('label', { class: 'in full' }, el('span', {}, 'Section de l\'arc'), S.sectionSelect(v.sec, k => { v.sec = k; update(); }, false)));
    },
    beam(box, c, v, update) {
      box.append(el('label', { class: 'in full' }, el('span', {}, 'Section (définit EI et W)'),
        S.sectionSelect(secKey, k => { secKey = k; update(); }, false)));
    },
    section(box, c, v, update) { sectionInputs(box, v, update); },
    portal(box, c, v, update) { portalInputs(box, v, update); },
    portalf(box, c, v, update) { portalInputs(box, v, update); },
    euler(box, c, v, update) {
      v.k = v.k || 1;
      const s = el('select', { onchange: e => { v.k = +e.target.value; update(); } },
        [[2, 'Encastré – libre (K = 2)'], [1, 'Articulé – articulé (K = 1)'], [0.7, 'Encastré – articulé (K ≈ 0,7)'], [0.5, 'Encastré – encastré (K = 0,5)']]
          .map(([k, l]) => el('option', { value: k }, l)));
      s.value = v.k;
      box.append(el('label', { class: 'in full' }, el('span', {}, 'Conditions d\'appui'), s),
        el('label', { class: 'in full' }, el('span', {}, 'Section'), S.sectionSelect(v.sec || (v.sec = 'HEA200'), k => { v.sec = k; update(); }, false)));
    }
  };

  function portalInputs(box, v, update) {
    v.sb = v.sb || 'IPE400'; v.sc = v.sc || 'HEA240';
    box.append(el('label', { class: 'in full' }, el('span', {}, 'Section de la traverse (I_t)'), S.sectionSelect(v.sb, k => { v.sb = k; update(); }, false)),
      el('label', { class: 'in full' }, el('span', {}, 'Section des poteaux (I_p)'), S.sectionSelect(v.sc, k => { v.sc = k; update(); }, false)));
  }

  // ------------------------------------------------------------------ rendu par type
  const RENDER = {
    beam(c, v) {
      const p = S.secProps({ sec: secKey });
      const EI = p.E * 1e3 * p.I * 1e-8;
      const W = p.I / (p.h / 20);
      const Lt = c.len(v);
      const n = 240;
      const xs = [], M = [], V = [];
      for (let k = 0; k < n; k++) {
        const x = (k + 0.5) / n * Lt, h = Lt * 1e-6;
        xs.push(x); M.push(c.M(x, v)); V.push((c.M(x + h, v) - c.M(x - h, v)) / (2 * h));
      }
      const xs2 = [0, ...xs, Lt], M2 = [c.M(0, v), ...M, c.M(Lt, v)];
      const th = [0], ph = [0];
      for (let k = 1; k < xs2.length; k++) {
        const d = xs2[k] - xs2[k - 1];
        th[k] = th[k - 1] + (M2[k] + M2[k - 1]) / 2 / EI * d;
        ph[k] = ph[k - 1] + (th[k] + th[k - 1]) / 2 * d;
      }
      const t0 = c.cant ? 0 : -ph[ph.length - 1] / Lt;
      const defl = xs2.map((x, k) => (ph[k] + t0 * x) * 1000);
      const Mabs = Math.max(...M2.map(Math.abs));
      const rows = c.res(v, EI);
      const at = a => (typeof a === 'function' ? a(v) : a);
      const block = (title, sub, svg) => el('div', { class: 'blk' }, el('div', { class: 'row-lab' }, title, el('span', {}, sub)), svg);
      return {
        rows: [...rows, r('Contrainte max', '|M|max / W_el', 1000 * Mabs / W, 'MPa')],
        eq: c.eq,
        note: null,
        figs: [
          block('Chargement', 'réactions d\'appui', beamSchema(c, v, Lt)),
          block('Effort tranchant V', 'V = dM/dx', strip(xs.map((x, k) => [x, V[k]]), Lt, { labels: c.V.map(([x, l]) => [at(x), l]) })),
          block('Moment fléchissant M', 'tracé côté fibre tendue', strip(xs2.map((x, k) => [x, M2[k]]), Lt, { down: true, labels: c.Ma.map(([x, l]) => [at(x), l]) })),
          block('Déformée', 'amplifiée', strip(xs2.map((x, k) => [x, defl[k]]), Lt, { line: true, fLabel: 'f = ' + c.f, cant: c.cant }))]
      };
    },

    arc(c, v) {
      const H = v.q * v.L ** 2 / (8 * v.f), V = v.q * v.L / 2;
      return {
        rows: [r('Réactions verticales', 'qL/2', V, 'kN'), r('Poussée H', 'qL² / 8f', H, 'kN', 1),
          r('N à la clé', '−H (compression)', -H, 'kN'), r('N aux naissances', '−√(H² + V²)', -Math.hypot(H, V), 'kN', 1),
          r('Moment', '0 — l\'arc parabolique est funiculaire de la charge uniforme', 0, 'kN·m'),
          r('Élancement f/L', '1/5 à 1/8 — valeurs usuelles', `1/${S.fmt(v.L / v.f, 1)}`, '')],
        eq: ['Forme : y(x) = 4f·x(L − x) / L²'],
        note: 'Plus l\'arc est surbaissé (f petit), plus la poussée est forte : elle doit être reprise par les appuis ou par un tirant.',
        figs: [funicular(v, false)]
      };
    },

    cable(c, v) {
      const H = v.q * v.L ** 2 / (8 * v.f), V = v.q * v.L / 2, ratio = v.f / v.L;
      return {
        rows: [r('Réactions verticales', 'qL/2', V, 'kN'), r('Traction horizontale H', 'qL² / 8f', H, 'kN', 1),
          r('Traction max (ancrages)', '√(H² + V²)', Math.hypot(H, V), 'kN', 1),
          r('Longueur du câble', 'L/2·[√(1 + 16n²) + asinh(4n)/(4n)], n = f/L', 2 * S.parabolaHalfLength(v.L, v.f), 'm'),
          r('Rapport f/L', '1/8 à 1/12 — valeurs usuelles', `1/${S.fmt(1 / ratio, 1)}`, '')],
        eq: ['Même géométrie que l\'arc, efforts de signe opposé (traction pure)'],
        figs: [funicular(v, true)]
      };
    },

    truss(c, v) {
      const M = v.q * v.L ** 2 / 8, Nch = M / v.h, Vm = v.q * v.L / 2;
      return {
        rows: [r('Moment global', 'qL²/8', M, 'kN·m'), r('Efforts de membrures', '± M / h', Nch, 'kN', 1),
          r('Tranchant max', 'qL/2', Vm, 'kN'), r('Diagonale d\'about', 'V / sin α', Vm / Math.sin(Math.PI / 4), 'kN', 1),
          r('Élancement L/h', '10 à 15 — valeurs usuelles', S.fmt(v.L / v.h, 1), '')],
        eq: ['Membrure supérieure comprimée, inférieure tendue', 'Doubler h divise par deux les efforts de membrure'],
        figs: [trussFig(v)]
      };
    },

    portal(c, v) { return portalRender(v, false); },
    portalf(c, v) { return portalRender(v, true); },

    arcbuck(c, v) {
      const p = S.secProps({ sec: v.sec });
      const EI = p.E * 1e3 * p.I * 1e-8, rg = Math.sqrt(p.I / p.A) / 100;
      const H = v.q * v.L ** 2 / (8 * v.f);
      let slope = 2 * v.f / v.L;
      if (v.forme === 'circ') { const R = (v.L * v.L / 4 + v.f * v.f) / (2 * v.f); slope = (v.L / 4) / Math.sqrt(R * R - v.L * v.L / 16); }
      const NEd = H * Math.sqrt(1 + slope * slope);
      const b = S.arcBuckling({ L: v.L, f: v.f, forme: v.forme, appuis: v.appuis, EI, NEd, r: rg });
      return {
        rows: [
          r('Demi-longueur S', v.forme === 'circ' ? 'S = R·θ, θ = 2·atan(2f/L) (demi-arc circulaire)' : 'S = L/4·[√(1 + 16n²) + asinh(4n)/(4n)], n = f/L', b.S, 'm'),
          r('Effort critique N_cr', `π²EI / (β·S)², β = ${v.appuis === 'enc' ? '0,7' : '1'}`, b.Ncr, 'kN', 1),
          r('N_Ed au quart', 'H·√(1 + y\'²) en x = L/4, H = qL²/8f', NEd, 'kN'),
          r('α_cr', 'N_cr / N_Ed', b.alpha, '', 1),
          r('Amplification du 2ᵉ ordre', 'α_cr / (α_cr − 1)', b.amp, '')],
        eq: ['α_cr < 3 : revoir la conception', '3 à 10 : moments du 1er ordre × α_cr/(α_cr − 1)', 'α_cr > 10 : calcul au 1er ordre suffisant'],
        note: `${b.verdict} ${b.snap} Méthode : D. Bitar, « Dimensionnement et justification des arcs vis-à-vis de l'instabilité par flambement », CTICM, 2020 (flambement asymétrique assimilé à un poteau de longueur S).`,
        figs: [arcBuckFig(v)]
      };
    },

    euler(c, v) {
      const p = S.secProps({ sec: v.sec });
      const EI = p.E * 1e3 * p.I * 1e-8, Lf = v.k * v.L;
      const Ncr = Math.PI ** 2 * EI / Lf ** 2, i = Math.sqrt(p.I / p.A), lam = Lf * 100 / i;
      const rows = [r('Longueur de flambement', 'Lf = K·L', Lf, 'm'), r('Charge critique N_cr', 'π²EI / Lf²', Ncr, 'kN', 1),
        r('Rayon de giration i', '√(I/A)', i, 'cm'), r('Élancement λ', 'Lf / i', lam, ''), r('σ_cr', 'N_cr / A', Ncr * 10 / p.A, 'MPa')];
      if (p.mat === 'acier') {
        const l1 = Math.PI * Math.sqrt(p.E / p.fy), lb = lam / l1, a = 0.34;
        const phi = 0.5 * (1 + a * (lb - 0.2) + lb * lb);
        const chi = Math.min(1, 1 / (phi + Math.sqrt(phi * phi - lb * lb)));
        rows.push(r('Élancement réduit λ̄', 'λ / (π√(E/fy))', lb, ''), r('χ (courbe b)', 'EN 1993-1-1 §6.3.1', chi, ''),
          r('N_b,Rd', 'χ·A·fy (γM1 = 1)', chi * p.A * p.fy / 10, 'kN', 1));
      }
      return { rows, note: `${p.label} — I = ${S.fmt(p.I, 0)} cm⁴ (axe fort), A = ${S.fmt(p.A, 1)} cm². Pour un profil en I, l'axe faible est souvent dimensionnant.`, figs: [eulerFig(v)] };
    },

    section(c, v) { return sectionRender(v); },
  };

  // ------------------------------------------------------------------ figures
  const FW = 680, MX = 60;

  function beamSchema(c, v, Lt) {
    const s = (FW - 2 * MX) / Lt, y = 74, H = 168;
    const X = x => MX + x * s;
    const g = sv('svg', { viewBox: `0 0 ${FW} ${H}`, class: 'diag' });
    g.append(sv('line', { x1: X(0), y1: y, x2: X(Lt), y2: y, class: 'el' }));
    const sups = c.sup(v);
    for (const [x, t] of sups) {
      const ang = t === 'encastrement' ? (x === 0 ? 90 : -90) : 0;
      g.append(S.draw.supportSymbol(t, X(x), y, ang));
    }
    // charges (libellés symboliques)
    for (const ld of c.loads(v)) {
      if (ld.t === 'udl' || ld.t === 'tri') {
        const n = Math.max(4, Math.round((X(ld.x1) - X(ld.x0)) / 26));
        const tails = [];
        for (let k = 0; k <= n; k++) {
          const xx = X(ld.x0) + (X(ld.x1) - X(ld.x0)) * k / n;
          const len = ld.t === 'tri' ? 36 * k / n : 28;
          if (len > 3) S.draw.arrow(g, xx, y - 4 - len, xx, y - 4, 'load', 5);
          tails.push(`${xx},${y - 4 - len}`);
        }
        g.append(sv('polyline', { points: tails.join(' '), class: 'load' }));
        const lx = ld.t === 'tri' ? X(ld.x1) + 10 : (X(ld.x0) + X(ld.x1)) / 2;
        g.append(sv('text', { x: lx, y: y - (ld.t === 'tri' ? 40 : 38), class: 'fx', 'text-anchor': ld.t === 'tri' ? 'start' : 'middle', style: 'fill:var(--load)' }, ld.lab));
      } else if (ld.t === 'point') {
        S.draw.arrow(g, X(ld.x), y - 54, X(ld.x), y - 4, 'load');
        g.append(sv('text', { x: X(ld.x) + 7, y: y - 44, class: 'fx', style: 'fill:var(--load)' }, ld.lab));
      } else if (ld.t === 'mom') {
        S.draw.momentArc(g, X(ld.x), y, 17, ld.ccw, 'load');
        g.append(sv('text', { x: X(ld.x) + (ld.x === 0 ? 22 : -22), y: y - 24, class: 'fx', 'text-anchor': ld.x === 0 ? 'start' : 'end', style: 'fill:var(--load)' }, ld.lab));
      }
    }
    // réactions verticales (flèches + formules)
    sups.forEach(([x, t, nm], i) => {
      const lab = (c.R || [])[i];
      if (!lab || lab === '0') return;
      const xx = X(x) + (t === 'encastrement' ? (x === 0 ? -16 : 16) : 0);
      const y0 = y + (t === 'encastrement' ? 4 : 30);
      S.draw.arrow(g, xx, y0 + 28, xx, y0, 'react');
      g.append(sv('text', { x: xx + (x === Lt ? -6 : 6), y: y0 + 26, class: 'rv', 'text-anchor': x === Lt ? 'end' : 'start', style: 'font-size:12.5px' }, `R${nm} = ${lab}`));
    });
    // cotes symboliques
    const yc = y + 76;
    for (const [x0, x1, lab] of c.dims(v)) {
      g.append(sv('line', { x1: X(x0), y1: yc, x2: X(x1), y2: yc, class: 'dim' }));
      for (const x of [x0, x1]) g.append(sv('line', { x1: X(x) - 4, y1: yc + 4, x2: X(x) + 4, y2: yc - 4, class: 'dim' }));
      g.append(sv('text', { x: (X(x0) + X(x1)) / 2, y: yc - 6, class: 'fx', 'text-anchor': 'middle', style: 'font-size:12.5px' }, lab));
    }
    return g;
  }

  /* Bande de diagramme : data [[x, y]] ; opts.down : positif vers le bas (moments) ;
     opts.labels : [[x/Lt, formule]] ; opts.line : tracé simple (déformée) */
  function strip(data, Lt, opts = {}) {
    const H = 150, s = (FW - 2 * MX) / Lt;
    const ymax = Math.max(1e-12, ...data.map(d => Math.abs(d[1])));
    const anyPos = data.some(d => d[1] > ymax * 0.02), anyNeg = data.some(d => d[1] < -ymax * 0.02);
    const sgn = opts.down ? 1 : -1;
    // ligne de référence placée pour laisser la place aux valeurs présentes
    const amp = 46;
    const up = sgn > 0 ? anyNeg : anyPos, dn = sgn > 0 ? anyPos : anyNeg;
    const y0 = up && dn ? H / 2 : up ? H - 34 : 34;
    const k = (up && dn ? amp : amp * 1.6) / ymax;
    const X = x => MX + x * s, Y = val => y0 + sgn * val * k;
    const g = sv('svg', { viewBox: `0 0 ${FW} ${H}`, class: 'diag' });
    g.append(sv('line', { x1: X(0), y1: y0, x2: X(Lt), y2: y0, class: opts.line ? 'el ghost' : 'axis' }));
    if (opts.line) {
      g.append(sv('polyline', { points: data.map(d => `${X(d[0])},${Y(d[1])}`).join(' '), class: 'defo' }));
      let im = 0;
      data.forEach((d, i) => { if (Math.abs(d[1]) > Math.abs(data[im][1])) im = i; });
      const d = data[im], xm = X(d[0]), ym = Y(d[1]);
      g.append(sv('line', { x1: xm, y1: y0, x2: xm, y2: ym, class: 'dim' }));
      const right = xm < FW * 0.6;
      g.append(sv('text', { x: xm + (right ? 10 : -10), y: (y0 + ym) / 2 + 5, class: 'fx', 'text-anchor': right ? 'start' : 'end' }, opts.fLabel));
      return g;
    }
    for (let i = 0; i < data.length - 1; i++) {
      const a = data[i], b = data[i + 1], vm = (a[1] + b[1]) / 2;
      if (Math.abs(vm) < ymax * 1e-6) continue;
      g.append(sv('path', { d: `M${X(a[0])} ${y0} L${X(b[0])} ${y0} L${X(b[0])} ${Y(b[1])} L${X(a[0])} ${Y(a[1])} Z`, class: vm >= 0 ? 'dpos' : 'dneg' }));
    }
    g.append(sv('polyline', { points: [[data[0][0], 0], ...data, [data[data.length - 1][0], 0]].map(d => `${X(d[0])},${Y(d[1])}`).join(' '), class: 'dline' }));
    for (const [fx, lab] of opts.labels || []) {
      const xt = fx * Lt;
      let best = data[0];
      for (const d of data) if (Math.abs(d[0] - xt) < Math.abs(best[0] - xt)) best = d;
      const px = X(best[0]), py = Y(best[1]);
      const below = py >= y0;
      const anchor = fx < 0.04 ? 'start' : fx > 0.96 ? 'end' : 'middle';
      g.append(sv('circle', { cx: px, cy: py, r: 2.6, class: 'cdot' }));
      g.append(sv('text', { x: px + (anchor === 'start' ? 4 : anchor === 'end' ? -4 : 0), y: py + (below ? 18 : -9), class: 'fx', 'text-anchor': anchor }, lab));
    }
    return g;
  }

  function funicular(v, cable) {
    const W = FW, H = 280, m = 70;
    const s = Math.min((W - 2 * m) / v.L, (H - 120) / v.f);
    const X = x => W / 2 + (x - v.L / 2) * s;
    const yb = cable ? 74 : H - 64;
    const Y = x => yb + (cable ? 1 : -1) * 4 * v.f * x * (v.L - x) / v.L ** 2 * s;
    const g = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diag' });
    const pts = [];
    for (let k = 0; k <= 60; k++) { const x = v.L * k / 60; pts.push(`${X(x)},${Y(x)}`); }
    g.append(sv('polyline', { points: pts.join(' '), class: 'el', fill: 'none' }));
    for (let k = 0; k <= 12; k++) { const x = v.L * k / 12, yy = Y(x); S.draw.arrow(g, X(x), yy - 26, X(x), yy - 3, 'load', 5); }
    g.append(sv('text', { x: W / 2, y: Y(v.L / 2) - 34, class: 'fx', 'text-anchor': 'middle', style: 'fill:var(--load)' }, 'q (par m de projection horizontale)'));
    if (cable) g.append(S.draw.supportSymbol('rotule', X(0), Y(0), 180), S.draw.supportSymbol('rotule', X(v.L), Y(v.L), 180));
    else {
      g.append(S.draw.supportSymbol('rotule', X(0), yb, 0), S.draw.supportSymbol('rotule', X(v.L), yb, 0));
      g.append(sv('circle', { cx: X(v.L / 2), cy: Y(v.L / 2), r: 4, class: 'hinge' }));
    }
    const dir = cable ? 1 : -1;
    S.draw.arrow(g, X(0) + dir * 46, yb, X(0) + dir * 4, yb, 'react');
    S.draw.arrow(g, X(v.L) - dir * 46, yb, X(v.L) - dir * 4, yb, 'react');
    g.append(sv('text', { x: X(0) + (cable ? 50 : -50), y: yb + 4, class: 'rv', 'text-anchor': cable ? 'start' : 'end', style: 'font-size:12.5px' }, 'H = qL²/8f'));
    g.append(sv('text', { x: X(0), y: yb + (cable ? -24 : 44), class: 'rv', 'text-anchor': 'middle', style: 'font-size:12.5px' }, 'V = qL/2'));
    const xm = X(v.L / 2) + 34;
    g.append(sv('line', { x1: xm, y1: yb, x2: xm, y2: Y(v.L / 2), class: 'dim' }));
    g.append(sv('text', { x: xm + 6, y: (yb + Y(v.L / 2)) / 2 + 5, class: 'fx' }, 'f'));
    g.append(sv('line', { x1: X(0), y1: cable ? H - 26 : H - 22, x2: X(v.L), y2: cable ? H - 26 : H - 22, class: 'dim' }));
    g.append(sv('text', { x: W / 2, y: cable ? H - 32 : H - 28, class: 'fx', 'text-anchor': 'middle' }, 'L'));
    return g;
  }

  function trussFig(v) {
    const n = Math.max(2, 2 * Math.round(v.L / v.h / 2));
    const model = S.PRESET.pratt.build({ L: v.L, n, h: v.h, P: v.q * v.L / n });
    const svg = S.svg('svg', { class: 'diag' });
    S.draw.render(svg, model, S.fem.solve(model), 'N', { width: FW });
    return el('div', {}, svg, el('small', {}, 'Efforts normaux d\'un treillis Pratt équivalent (charge ramenée aux nœuds), calculés par le solveur : membrure supérieure comprimée, inférieure tendue.'));
  }

  function portalRender(v, fixed) {
    const pb = S.secProps({ sec: v.sb }), pc = S.secProps({ sec: v.sc });
    // raideurs avec les modules : traverse et poteaux peuvent être de matériaux différents
    const k = (pb.E * pb.I) / (pc.E * pc.I) * (v.H / v.L), q = v.q, L = v.L, h = v.H;
    let rows;
    if (!fixed) {
      const Hf = q * L * L / (4 * h * (2 * k + 3));
      rows = [r('Rapport de raideurs k', '(E_t·I_t / E_p·I_p)·(h / L)', k, ''), r('Poussée H', 'qL² / 4h(2k + 3)', Hf, 'kN', 1),
        r('Moment aux angles', '−H·h', -Hf * h, 'kN·m', 1), r('Moment en travée', 'qL²/8 − H·h', q * L * L / 8 - Hf * h, 'kN·m'),
        r('Réactions verticales', 'qL/2', q * L / 2, 'kN')];
    } else {
      const Mc = -q * L * L / (6 * (k + 2)), Mb = q * L * L / (12 * (k + 2));
      rows = [r('Rapport de raideurs k', '(E_t·I_t / E_p·I_p)·(h / L)', k, ''), r('Moment aux angles', '−qL² / 6(k + 2)', Mc, 'kN·m', 1),
        r('Moment en pied', 'qL² / 12(k + 2)', Mb, 'kN·m'), r('Moment en travée', 'qL²/8 + M_angles', q * L * L / 8 + Mc, 'kN·m'),
        r('Poussée H', '3·M_pied / h', 3 * Mb / h, 'kN', 1), r('Réactions verticales', 'qL/2', q * L / 2, 'kN')];
    }
    const model = {
      nodes: [{ x: 0, y: 0, sup: fixed ? 'encastrement' : 'rotule' }, { x: 0, y: h, sup: 'libre' }, { x: L, y: h, sup: 'libre' }, { x: L, y: 0, sup: fixed ? 'encastrement' : 'rotule' }],
      elems: [{ n1: 1, n2: 2, sec: v.sc }, { n1: 2, n2: 3, sec: v.sb }, { n1: 3, n2: 4, sec: v.sc }],
      nloads: [], eloads: [{ elem: 2, type: 'udl', dir: 'g', q, a: 0 }]
    };
    const svg = S.svg('svg', { class: 'diag' });
    S.draw.render(svg, model, S.fem.solve(model), 'M', { width: FW });
    return {
      rows,
      eq: ['Formules de Kleinlogel', 'k → 0 (poteaux très raides) : traverse ≈ bi-encastrée', 'k → ∞ (poteaux souples) : traverse ≈ isostatique'],
      figs: [svg, el('small', {}, 'Moment fléchissant (tracé côté fibre tendue), recalculé par le solveur.'),
        el('div', { class: 'row-actions' }, el('a', { class: 'btn sm', href: '#/solveur?preset=portique' }, 'Ouvrir un portique dans le solveur →'))]
    };
  }

  // Arc et ses deux modes d'instabilité dans le plan
  function arcBuckFig(v) {
    const W = FW, H = 300, m = 70, s = Math.min((W - 2 * m) / v.L, 150 / v.f), yb = 230;
    const X = x => W / 2 + (x - v.L / 2) * s;
    const R = (v.L * v.L / 4 + v.f * v.f) / (2 * v.f);
    const y = x => v.forme === 'circ' ? Math.sqrt(Math.max(0, R * R - (x - v.L / 2) ** 2)) - (R - v.f) : 4 * v.f * x * (v.L - x) / v.L ** 2;
    const g = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diag' });
    const path = (fn, cls, extra) => {
      const pts = [];
      for (let k = 0; k <= 60; k++) { const x = v.L * k / 60; pts.push(`${X(x)},${yb - fn(x) * s}`); }
      g.append(sv('polyline', Object.assign({ points: pts.join(' '), class: cls, fill: 'none' }, extra || {})));
    };
    const amp = v.f * 0.32;
    path(y, 'el');
    path(x => y(x) + amp * Math.sin(2 * Math.PI * x / v.L), 'defo');
    path(x => y(x) * 0.55, 'dline', { 'stroke-dasharray': '5 4' });
    g.append(S.draw.supportSymbol(v.appuis === 'enc' ? 'encastrement' : 'rotule', X(0), yb, 0), S.draw.supportSymbol(v.appuis === 'enc' ? 'encastrement' : 'rotule', X(v.L), yb, 0));
    g.append(sv('text', { x: X(v.L * 0.22), y: yb - (y(v.L * 0.22) + amp) * s - 12, class: 'fx', style: 'fill:var(--c-coral)' }, 'flambement asymétrique'));
    g.append(sv('text', { x: W / 2, y: yb - y(v.L / 2) * 0.55 * s + 18, 'text-anchor': 'middle', style: 'font-size:12px' }, 'affaissement (snap-through)'));
    const xm = X(v.L / 2) + 26;
    g.append(sv('line', { x1: xm, y1: yb, x2: xm, y2: yb - v.f * s, class: 'dim' }), sv('text', { x: xm + 6, y: yb - v.f * s / 2, class: 'fx' }, 'f'));
    g.append(sv('line', { x1: X(0), y1: yb + 40, x2: X(v.L), y2: yb + 40, class: 'dim' }), sv('text', { x: W / 2, y: yb + 34, class: 'fx', 'text-anchor': 'middle' }, 'L'));
    g.append(sv('text', { x: X(v.L / 4) - 10, y: yb - y(v.L / 4) * s + 26, class: 'fx', 'text-anchor': 'end', style: 'font-size:12px' }, 'S'));
    g.append(sv('circle', { cx: X(v.L / 4), cy: yb - y(v.L / 4) * s, r: 3.5, class: 'cdot' }), sv('text', { x: X(v.L / 4) + 8, y: yb - y(v.L / 4) * s - 6, style: 'font-size:12px' }, 'N_Ed (L/4)'));
    return g;
  }

  function eulerFig(v) {
    const W = FW, H = 230, g = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diag' });
    [[2, 'K = 2'], [1, 'K = 1'], [0.7, 'K = 0,7'], [0.5, 'K = 0,5']].forEach(([K, lab], i) => {
      const cx = 90 + i * 165, y0 = 196, y1 = 36, Lp = y0 - y1;
      const on = Math.abs(K - v.k) < 1e-6;
      const b = 4.4934;
      const mode = t => K === 2 ? 1 - Math.cos(Math.PI * t / 2)
        : K === 1 ? Math.sin(Math.PI * t)
          : K === 0.5 ? (1 - Math.cos(2 * Math.PI * t)) / 2
            : Math.cos(b) * (Math.sin(b * t) - b * t) - Math.sin(b) * (Math.cos(b * t) - 1);
      const ts = Array.from({ length: 41 }, (_, k) => k / 40);
      const dmax = Math.max(...ts.map(t => Math.abs(mode(t))));
      g.append(sv('line', { x1: cx, y1: y0, x2: cx, y2: y1, class: 'el ghost' }));
      g.append(sv('polyline', { points: ts.map(t => `${cx + 24 * mode(t) / dmax},${y0 - Lp * t}`).join(' '), class: on ? 'defo' : 'dline' }));
      const top = K === 2 ? null : K === 0.5 ? 'encastrement-glissant' : 'appui';
      g.append(S.draw.supportSymbol(K === 1 ? 'rotule' : 'encastrement', cx, y0, 0));
      if (top) g.append(S.draw.supportSymbol(top, cx, y1, 180));
      S.draw.arrow(g, cx, y1 - 30, cx, y1 - (top ? 20 : 2), 'load', 6);
      g.append(sv('text', { x: cx + 36, y: 116, class: on ? 'fx' : '' }, lab));
    });
    return g;
  }

  // ------------------------------------------------------------------ sections
  const SHAPES = {
    rect: { name: 'Rectangle plein', dims: [['b', 'Largeur b', 200], ['h', 'Hauteur h', 400]] },
    hrect: { name: 'Rectangle creux', dims: [['b', 'Largeur b', 150], ['h', 'Hauteur h', 250], ['t', 'Épaisseur t', 8]] },
    circ: { name: 'Cercle plein', dims: [['d', 'Diamètre d', 200]] },
    tube: { name: 'Tube circulaire', dims: [['d', 'Diamètre d', 219], ['t', 'Épaisseur t', 8]] },
    I: { name: 'Profil en I', dims: [['h', 'Hauteur h', 300], ['b', 'Largeur b', 150], ['tw', 'Âme tw', 7.1], ['tf', 'Semelle tf', 10.7]] }
  };
  function sectionInputs(box, v, update) {
    v.shape = v.shape || 'I'; v.mat = v.mat || 'acier';
    const dims = el('div', { class: 'inputs' });
    const renderDims = () => {
      dims.innerHTML = '';
      SHAPES[v.shape].dims.forEach(([k, l, d]) => {
        if (v[k] == null) v[k] = d;
        dims.append(inputRow({ label: l, unit: 'mm', min: 1, max: 1500, step: 1 }, v[k], x => { v[k] = x; update(); }));
      });
    };
    const shape = el('select', { onchange: e => { v.shape = e.target.value; SHAPES[v.shape].dims.forEach(([k, , d]) => (v[k] = d)); renderDims(); update(); } },
      Object.entries(SHAPES).map(([k, s]) => el('option', { value: k }, s.name)));
    shape.value = v.shape;
    const mat = el('select', { onchange: e => { v.mat = e.target.value; update(); } }, Object.entries(S.MATERIALS).map(([k, m]) => el('option', { value: k }, m.name)));
    mat.value = v.mat;
    box.append(el('label', { class: 'in full' }, el('span', {}, 'Forme'), shape), dims, el('label', { class: 'in full' }, el('span', {}, 'Matériau'), mat));
    renderDims();
  }
  function sectionRender(v) {
    let A, I, Iz, h, b, path;
    const sh = v.shape;
    if (sh === 'rect') { b = v.b; h = v.h; A = b * h; I = b * h ** 3 / 12; Iz = h * b ** 3 / 12; }
    else if (sh === 'hrect') {
      b = v.b; h = v.h; const t = Math.min(v.t, b / 2 - 0.1, h / 2 - 0.1);
      A = b * h - (b - 2 * t) * (h - 2 * t); I = (b * h ** 3 - (b - 2 * t) * (h - 2 * t) ** 3) / 12; Iz = (h * b ** 3 - (h - 2 * t) * (b - 2 * t) ** 3) / 12;
    } else if (sh === 'circ') { b = h = v.d; A = Math.PI * v.d ** 2 / 4; I = Iz = Math.PI * v.d ** 4 / 64; }
    else if (sh === 'tube') { b = h = v.d; const di = Math.max(0, v.d - 2 * v.t); A = Math.PI * (v.d ** 2 - di ** 2) / 4; I = Iz = Math.PI * (v.d ** 4 - di ** 4) / 64; }
    else {
      h = v.h; b = v.b; const tw = v.tw, tf = Math.min(v.tf, h / 2);
      A = 2 * b * tf + (h - 2 * tf) * tw; I = (b * h ** 3 - (b - tw) * (h - 2 * tf) ** 3) / 12; Iz = (2 * tf * b ** 3 + (h - 2 * tf) * tw ** 3) / 12;
    }
    const m = S.MATERIALS[v.mat];
    const Acm = A / 100, Icm = I / 1e4, Izcm = Iz / 1e4, W = Icm / (h / 20);
    const FORM = { rect: 'bh³/12', hrect: '[bh³ − (b−2t)(h−2t)³]/12', circ: 'πd⁴/64', tube: 'π(d⁴ − dᵢ⁴)/64', I: '[bh³ − (b−t_w)(h−2t_f)³]/12' };
    const rows = [r('Aire A', '', Acm, 'cm²'), r('Inertie I_y', FORM[sh], Icm, 'cm⁴', 1), r('Module W_el,y', 'I / (h/2)', W, 'cm³', 1),
      r('Rayon de giration i_y', '√(I/A)', Math.sqrt(Icm / Acm), 'cm'), r('Inertie I_z (axe faible)', '', Izcm, 'cm⁴'),
      r('Masse linéique', `ρ ≈ ${S.fmt(m.rho * 1000 / 9.81, 0)} kg/m³`, m.rho * Acm * 1e-4 * 1000 / 9.81, 'kg/m'),
      // béton armé : la résistance en flexion dépend des armatures (EC2), W·f n'a pas de sens ; bois, acier : valeur caractéristique
      v.mat === 'beton' ? null : r('Moment élastique caractéristique M_el,k', v.mat === 'acier' || v.mat === 'alu' ? 'W·f_y' : 'W·f_m,k — sans k_mod ni γ_M', W * m.fy / 1000, 'kN·m')].filter(Boolean);
    const Wd = FW, Hd = 290, sc = Math.min(220 / b, 230 / h), cx = Wd / 2, cy = Hd / 2;
    const g = sv('svg', { viewBox: `0 0 ${Wd} ${Hd}`, class: 'diag' });
    const R = (x, y, w, hh) => `M${cx + x * sc} ${cy + y * sc} h${w * sc} v${hh * sc} h${-w * sc} Z `;
    if (sh === 'rect') path = R(-b / 2, -h / 2, b, h);
    else if (sh === 'hrect') { const t = v.t; path = R(-b / 2, -h / 2, b, h) + R(-b / 2 + t, -h / 2 + t, b - 2 * t, h - 2 * t); }
    else if (sh === 'I') {
      const tw = v.tw, tf = v.tf;
      path = `M${cx - b / 2 * sc} ${cy - h / 2 * sc} h${b * sc} v${tf * sc} h${-(b - tw) / 2 * sc} v${(h - 2 * tf) * sc} h${(b - tw) / 2 * sc} v${tf * sc} h${-b * sc} v${-tf * sc} h${(b - tw) / 2 * sc} v${-(h - 2 * tf) * sc} h${-(b - tw) / 2 * sc} Z`;
    }
    const st = 'fill:var(--pos-fill);stroke:var(--ink);stroke-width:1.5';
    if (path) g.append(sv('path', { d: path, 'fill-rule': 'evenodd', style: st }));
    else {
      g.append(sv('circle', { cx, cy, r: v.d / 2 * sc, style: st }));
      if (sh === 'tube') g.append(sv('circle', { cx, cy, r: Math.max(0, v.d / 2 - v.t) * sc, style: 'fill:var(--paper);stroke:var(--ink);stroke-width:1.5' }));
    }
    g.append(sv('line', { x1: cx - b / 2 * sc - 30, y1: cy, x2: cx + b / 2 * sc + 30, y2: cy, class: 'cursor' }));
    g.append(sv('text', { x: cx + b / 2 * sc + 34, y: cy + 4, class: 'fx' }, 'y'));
    g.append(sv('text', { x: cx, y: cy - h / 2 * sc - 10, class: 'fx', 'text-anchor': 'middle' }, `b = ${S.fmt(b)} mm`));
    g.append(sv('text', { x: cx - b / 2 * sc - 12, y: cy + 4, class: 'fx', 'text-anchor': 'end' }, `h = ${S.fmt(h)} mm`));
    return { rows, note: 'L\'inertie croît comme le cube de la hauteur : doubler h multiplie I par 8, d\'où l\'efficacité des sections hautes et des profils en I.' + (v.mat === 'beton' ? ' Béton armé : le moment résistant dépend des armatures (section, position, nuance) et se calcule à l\'ELU selon l\'Eurocode 2 ; il n\'est pas affiché ici.' : ''), figs: [g] };
  }
})(window.S);
