/* Onglet « Comparateur carbone » : impact carbone (A1–A3) de solutions structurelles rendant le même service.
   Sections proposées par un prédimensionnement simplifié et modifiables ; pour chaque matériau, choix de la
   fiche (FDES INIES, configurateur ou valeur de filière) dans un menu déroulant. Ordres de grandeur d'esquisse :
   ce n'est pas un calcul RE2020. */
(function (S) {
  'use strict';
  const el = S.el, sv = S.svg;
  S.pages = S.pages || {};

  const INIES = 'https://www.base-inies.fr/iniesV4/dist/consultation.html';

  // ------------------------------------------------------------------ fiches par matériau
  /* v : kgCO₂e par unité, production A1–A3 (part fossile pour le bois). bio : carbone biogénique stocké par
     unité quand la fiche le déclare. kind : fdes (FDES vérifiée INIES, valeurs lues dans la fiche), config
     (configurateur reconnu par INIES), filiere (fourchette publiée), estim (estimation à remplacer). */
  const KIND = { fdes: 'FDES INIES', config: 'Configurateur BETie', filiere: 'Valeur de filière', estim: 'Estimation' };
  const MATS = {
    beton: { label: 'Béton coulé en place C25/30', unit: 'm³', grp: 'beton', def: 'betie-ref', opts: [
      { id: 'betie-ref', name: 'BPE C25/30 XC1 courant', v: 219, kind: 'config', src: 'Valeur de référence d\'un C25/30 XC1 (configurateur BETie, cycle de vie rendu chantier), citée par la DREAL Occitanie, 2026.' },
      { id: 'betie-ex', name: 'BPE C25/30 XC1 optimisé', v: 190, kind: 'config', src: 'Exemple de FDES BETie v4 d\'un C25/30 XC1 à 189,7 kgCO₂e/m³ (−13 % sur la référence), DREAL Occitanie, 2026.' },
      { id: 'snbpe-bc', name: 'BPE bas carbone C25/30 XC1-XC2', v: 180, kind: 'config', src: 'Seuil « béton bas carbone » du SNBPE pour un C25/30 XC1-XC2 de bâtiment, calculé avec BETie (SNBPE, avril 2021).' },
      { id: 'snbpe-tbc', name: 'BPE très bas carbone C25/30 XC1', v: 135, kind: 'config', src: 'Réalisation citée par le SNBPE : groupe scolaire Jean Zay, Toulouse, C25/30 XC1 à 135 kgCO₂e/m³ (BETie).' }] },
    betonP: { label: 'Béton préfabriqué précontraint', unit: 'm³', grp: 'beton', def: 'estim', opts: [
      { id: 'estim', name: 'Béton C45/55 à forte teneur en ciment', v: 300, kind: 'estim', src: 'Estimation : remplacer par la FDES CERIB ou celle du fabricant de dalles alvéolaires.' }] },
    armature: { label: 'Armatures pour béton armé', unit: 'kg', grp: 'acier', def: 'snaam23', opts: [
      { id: 'snaam23', name: 'Armatures sur plan, groupe SNAAM (2023)', v: 0.566, kind: 'fdes', ref: '20230634446', src: 'FDES collective SNAAM, août 2023, NF EN 15804+A2 : A1 0,457 + A2 0,056 + A3 0,052 kgCO₂e/kg.' },
      { id: 'snaam-old', name: 'Armatures, FDES collective SNAAM (précédente)', v: 0.728, kind: 'filiere', src: '728 kgCO₂e/t, valeur annoncée par le SNAAM pour sa FDES collective précédente.' },
      { id: 'ded', name: 'Donnée environnementale par défaut', v: 3.68, kind: 'filiere', src: '3 680 kgCO₂e/t : donnée par défaut INIES citée par le SNAAM, volontairement pénalisante (à n\'utiliser qu\'en l\'absence de FDES).' }] },
    acier: { label: 'Profilés acier de construction', unit: 'kg', grp: 'acier', def: 'eaf', opts: [
      { id: 'xcarb', name: 'ArcelorMittal XCarb, poutrelles recyclées (2021)', v: 0.388, kind: 'fdes', ref: '20220329482', src: 'FDES ArcelorMittal XCarb, mars 2021, NF EN 15804+A1 : A1 0,362 + A2 0,006 + A3 0,021 kgCO₂e/kg (four électrique, électricité renouvelable).' },
      { id: 'eaf', name: 'Filière arc électrique (ferrailles)', v: 0.6, kind: 'filiere', src: '300 à 600 kgCO₂e/t selon les déclarations de la filière arc électrique (note CFBR, 2024) ; borne haute retenue.' },
      { id: 'bof', name: 'Filière haut-fourneau (minerai)', v: 1.9, kind: 'filiere', src: '1 400 à 2 200 kgCO₂e/t pour la filière haut-fourneau (note CFBR, 2024).' }] },
    bac: { label: 'Bac acier collaborant galvanisé', unit: 'kg', grp: 'acier', def: 'cticm', opts: [
      { id: 'cticm', name: 'Profilés acier formés à froid galvanisés, CTICM (2025)', v: 2.46, kind: 'fdes', ref: '20240638871-FC', src: 'FDES collective CTICM, janvier 2025 : A1 2,28 + A2 0,05 + A3 0,13 kgCO₂e/kg. Produit le plus proche d\'un bac collaborant.' }] },
    connect: { label: 'Connecteurs et quincaillerie', unit: 'kg', grp: 'acier', def: 'cticm', opts: [
      { id: 'cticm', name: 'Acier galvanisé formé à froid, CTICM (2025)', v: 2.46, kind: 'fdes', ref: '20240638871-FC', src: 'FDES collective CTICM, janvier 2025, utilisée par défaut pour l\'acier galvanisé usiné.' }] },
    lc: { label: 'Bois lamellé-collé', unit: 'm³', grp: 'bois', def: 'schneider', rho: 440, opts: [
      { id: 'schneider', name: 'Lamellé-collé Best Wood Schneider (2024)', v: 123, bio: -687, kind: 'fdes', ref: '20240337244', src: 'FDES Schneider Holz, juillet 2024, NF EN 15804+A2 : A1–A3 fossile 123 kgCO₂e/m³, biogénique −687.' },
      { id: 'schilliger', name: 'Lamellé-collé Schilliger Holz (2025)', v: 88.8, bio: -715, kind: 'fdes', ref: '20250443584', src: 'FDES Schilliger, juin 2025, NF EN 15804+A2 : A1–A3 fossile 88,8 kgCO₂e/m³, biogénique −715 (production suisse).' },
      { id: 'codifab', name: 'Poutre lamellé-collé, FDES collective CODIFAB (2024)', v: 141, kind: 'filiere', src: '141 kgCO₂e/m³ en A1–A3 (sans fixations), valeur citée par la base OneClick LCA pour la FDES collective CODIFAB 2024.' }] },
    clt: { label: 'Bois lamellé-croisé (CLT)', unit: 'm³', grp: 'bois', def: 'schneider', rho: 450, opts: [
      { id: 'schneider', name: 'CLT Best Wood Schneider (2024)', v: 189, bio: -682, kind: 'fdes', ref: '20240337245', src: 'FDES Schneider Holz, juillet 2024, NF EN 15804+A2 : A1–A3 fossile 189 kgCO₂e/m³, biogénique −682.' }] },
    massif: { label: 'Bois massif (C24)', unit: 'm³', grp: 'bois', def: 'kvh', rho: 430, opts: [
      { id: 'kvh', name: 'Bois massif abouté KVH, Best Wood Schneider (2024)', v: 91.8, bio: -693, kind: 'fdes', ref: '20240337243', src: 'FDES Schneider Holz, juillet 2024, NF EN 15804+A2 : A1–A3 fossile 91,8 kgCO₂e/m³, biogénique −693.' },
      { id: 'codifab', name: 'Charpente traditionnelle, FDES collective CODIFAB (2024)', v: 114, kind: 'filiere', src: '114 kgCO₂e/m³ en A1–A3, valeur citée par la base OneClick LCA pour la FDES collective CODIFAB 2024.' }] }
  };
  const GROUPS = { beton: 'Béton', acier: 'Acier', bois: 'Bois' };

  // choix de fiche et valeurs personnalisées, conservés dans le navigateur
  const sel = S.store.get('carbone-fiches', {});
  const saveSel = () => S.store.set('carbone-fiches', sel);
  const optOf = k => { const m = MATS[k], s = sel[k]; if (s && s.id === 'custom') return { id: 'custom', name: 'Valeur personnalisée', v: +s.v || 0, kind: 'estim', src: s.src || 'Valeur saisie par l\'utilisateur.', ref: s.ref || '' }; return m.opts.find(o => o.id === (s && s.id)) || m.opts.find(o => o.id === m.def); };
  const val = k => optOf(k).v;
  // carbone biogénique stocké : valeur de la fiche, sinon masse sèche × 50 % de carbone × 44/12
  const bioOf = k => { const m = MATS[k]; if (!m.rho) return 0; const o = optOf(k); return o.bio != null ? o.bio : -m.rho / 1.15 * 0.5 * 44 / 12; };
  const fmtV = v => { const a = Math.abs(v); return a < 10 ? S.fmt(v, a < 1 ? 3 : 2) : S.fmt(v, a < 100 ? 1 : 0); };

  // ------------------------------------------------------------------ vérifications simplifiées
  const IPE = S.SECTIONS.filter(s => /^IPE/.test(s.key));
  const HE = S.SECTIONS.filter(s => /^HE[AB]/.test(s.key)).sort((a, b) => a.A - b.A);
  const PROFS = [...IPE, ...HE];
  const SEC = Object.fromEntries(S.SECTIONS.map(s => [s.key, s]));
  const kgm = s => s.A * 0.785;             // kg/m d'un profilé (A en cm²)
  const FY = 355, FCD = 16.7, FMD_GL = 24 * 0.8 / 1.25, FCD_GL = 24 * 0.8 / 1.25, FCD_C24 = 21 * 0.8 / 1.3;
  const r2 = (v, s) => Math.ceil(v / s - 1e-9) * s;
  const kcBois = (lam, fck, E05, beta) => {   // EN 1995-1-1, 6.3.2
    const lr = lam / Math.PI * Math.sqrt(fck / E05);
    if (lr <= 0.3) return 1;
    const k = 0.5 * (1 + beta * (lr - 0.3) + lr * lr);
    return 1 / (k + Math.sqrt(k * k - lr * lr));
  };
  const chiAcier = (s, H) => {               // flambement axe faible, courbe c, i ≈ 0,25·b
    const iz = 0.25 * Math.min(s.h, 300), lr = H * 1000 / iz / (93.9 * Math.sqrt(235 / FY));
    const ph = 0.5 * (1 + 0.49 * (lr - 0.2) + lr * lr);
    return Math.min(1, 1 / (ph + Math.sqrt(ph * ph - lr * lr)));
  };
  // taux de travail → verdict
  const verdict = (rates, labels) => {
    const i = rates.indexOf(Math.max(...rates)), r = rates[i];
    return { r, ok: r <= 1.0001, txt: `${labels[i]} ${S.fmt(r * 100, 0)} %` };
  };

  /* Unités fonctionnelles. Chaque solution : dims (paramètres de section modifiables, avec valeur par défaut
     issue du prédimensionnement) et build(d) → { sec, q: { matériau: quantité }, chk }. */
  const num = (k, label, unit, def, step, min) => ({ k, label, unit, def, step, min, type: 'num' });
  const pick = (k, label, def, list) => ({ k, label, def, type: 'sel', list });
  const UF = {
    plancher: {
      label: 'Plancher', per: 'par m² de plancher',
      svg: '<path d="M4 14 H48 V19 H4 Z" fill="#e7e6e1"/><path d="M4 19 l-3 5 h6 z M48 19 l-3 5 h6 z"/><path d="M8 9 V13 M16 9 V13 M24 9 V13 M32 9 V13 M40 9 V13" stroke="#ff6600"/>',
      params: [['L', 'Portée L', 3, 12, 0.5, 6, 'm']],
      note: 'Épaisseurs par défaut tirées des élancements usuels (onglet Ordres de grandeur). Le contrôle compare l\'épaisseur choisie à cet élancement ; il ne remplace pas un calcul (charges, feu, acoustique, vibrations).',
      sol: p => {
        const L = p.L, slim = (e, r, txt) => verdict([L / r / e], [txt]);
        const dap = [0.16, 0.20, 0.265, 0.32, 0.40];
        return [
          { id: 'ba', name: 'Dalle pleine en béton armé', mat: 'beton', dims: [num('e', 'Épaisseur', 'cm', Math.max(18, r2(L / 28 * 100, 1)), 1, 12)],
            build: d => ({ sec: `e = ${d.e} cm (L/${S.fmt(L * 100 / d.e, 0)})`, q: { beton: d.e / 100, armature: 85 * d.e / 100 }, chk: slim(d.e / 100, 28, 'élancement L/28 :') }) },
          { id: 'dap', name: 'Dalle alvéolaire + chape', mat: 'beton', dims: [pick('h', 'Hauteur DAP', String(dap.find(h => h >= L / 38) || 0.4), dap.map(h => [String(h), `${S.fmt(h * 100, 1)} cm`])), num('c', 'Chape', 'cm', 5, 1, 0)],
            build: d => { const h = +d.h; return { sec: `DAP ${S.fmt(h * 100, 1)} cm + chape ${d.c} cm`, q: { betonP: 0.55 * h, beton: d.c / 100, armature: 25 * 0.55 * h + (d.c > 0 ? 3 : 0) }, chk: slim(h, 38, 'élancement L/38 :') }; } },
          { id: 'mixte', name: 'Mixte acier-béton', mat: 'acier', dims: [num('e', 'Dalle', 'cm', 12, 1, 8), pick('p', 'Solives', (IPE.find(s => s.h >= L / 22 * 1000) || IPE[IPE.length - 1]).key, IPE.map(s => [s.key, s.label])), num('a', 'Entraxe', 'm', 2.7, 0.1, 1)],
            build: d => { const s = SEC[d.p]; return { sec: `dalle ${d.e} cm sur bac ; ${s.label} tous les ${S.fmt(d.a, 1)} m`, q: { beton: Math.max(0, d.e / 100 - 0.025), bac: 11, armature: 3, acier: kgm(s) / d.a }, chk: slim(s.h / 1000, 22, 'solive, élancement L/22 :') }; } },
          { id: 'clt', name: 'Plancher CLT', mat: 'bois', dims: [num('t', 'Épaisseur CLT', 'mm', Math.max(120, r2(L / 28 * 1000, 20)), 20, 60), num('c', 'Chape', 'cm', 5, 1, 0)],
            build: d => ({ sec: `CLT ${d.t} mm${d.c > 0 ? ` + chape ${d.c} cm` : ''}`, q: Object.assign({ clt: d.t / 1000, connect: 1 }, d.c > 0 ? { beton: d.c / 100, armature: 2 } : {}), chk: slim(d.t / 1000, 28, 'élancement L/28 :') }) },
          { id: 'bb', name: 'Mixte bois-béton', mat: 'bois', dims: [num('b', 'Solive b', 'mm', 140, 20, 60), num('h', 'Solive h', 'mm', Math.max(160, r2((L / 20 - 0.08) * 1000, 20)), 20, 80), num('a', 'Entraxe', 'cm', 60, 5, 30), num('e', 'Dalle', 'cm', 8, 1, 5)],
            build: d => ({ sec: `solives GL24h ${d.b} × ${d.h} tous les ${d.a} cm + dalle ${d.e} cm`, q: { lc: (d.b / 1000) * (d.h / 1000) / (d.a / 100), beton: d.e / 100, armature: 3, connect: 1.5 }, chk: slim(d.h / 1000 + d.e / 100, 20, 'élancement L/20 :') }) }
        ];
      }
    },
    poutre: {
      label: 'Poutre', per: 'par poutre',
      svg: '<path d="M4 12 H48 V18 H4 Z" fill="#e7e6e1"/><path d="M6 18 l-3 5 h6 z M46 18 l-3 5 h6 z"/><path d="M8 5 V10 M17 5 V10 M26 5 V10 M35 5 V10 M44 5 V10" stroke="#ff6600"/>',
      params: [['L', 'Portée L', 3, 20, 0.5, 8, 'm'], ['q', 'Charge de service q', 5, 60, 1, 20, 'kN/m']],
      note: 'Poutre isostatique : flexion à l\'ELU (q × 1,4) et flèche L/300 sous q, poids propre négligé. Les taux indiqués sont ceux de ce contrôle simplifié.',
      sol: p => {
        const L = p.L, q = p.q, Mu = 1.4 * q * L * L / 8 * 1e6, flim = L * 1000 / 300;
        const fl = EI => 5 * q * (L * 1000) ** 4 / (384 * EI);
        const steelOk = s => Mu <= 2 * s.I * 1e4 / s.h * FY && fl(210000 * s.I * 1e4) <= flim;
        const glChk = (b, h) => { const I = b * h ** 3 / 12; return verdict([Mu / (2 * I / h) / FMD_GL, fl(11500 * I) / flim], ['flexion', 'flèche']); };
        let hg = 200, bg = 120;
        for (; hg < 2500; hg += 40) { bg = Math.max(120, r2(hg / 4.5, 20)); if (glChk(bg, hg).ok) break; }
        const b0 = 30, d0 = Math.sqrt(Mu / (0.2 * b0 * 10 * FCD)) / 1000, h0 = Math.max(r2(d0 / 0.9 * 100, 5), r2(L / 14 * 100, 5));
        return [
          { id: 'acier', name: 'Profilé acier', mat: 'acier', dims: [pick('p', 'Profilé', (IPE.find(steelOk) || IPE[IPE.length - 1]).key, PROFS.map(s => [s.key, s.label]))],
            build: d => { const s = SEC[d.p]; return { sec: `${s.label} (S355)`, q: { acier: kgm(s) * L }, chk: verdict([Mu / (2 * s.I * 1e4 / s.h * FY), fl(210000 * s.I * 1e4) / flim], ['flexion', 'flèche']) }; } },
          { id: 'ba', name: 'Poutre en béton armé', mat: 'beton', dims: [num('b', 'b', 'cm', b0, 5, 15), num('h', 'h', 'cm', h0, 5, 20)],
            build: d => { const dd = 0.9 * d.h * 10; return { sec: `${d.b} × ${d.h} cm`, q: { beton: d.b * d.h / 1e4 * L, armature: 120 * d.b * d.h / 1e4 * L }, chk: verdict([Mu / (0.2 * d.b * 10 * dd * dd * FCD), L / (d.h / 100) / 14], ['flexion', 'élancement L/14']) }; } },
          { id: 'gl', name: 'Poutre en lamellé-collé', mat: 'bois', dims: [num('b', 'b', 'mm', bg, 20, 60), num('h', 'h', 'mm', hg, 40, 100)],
            build: d => ({ sec: `GL24h ${d.b} × ${d.h} mm`, q: { lc: d.b * d.h / 1e6 * L }, chk: glChk(d.b, d.h) }) }
        ];
      }
    },
    poteau: {
      label: 'Poteau', per: 'par poteau',
      svg: '<path d="M22 4 H30 V24 H22 Z" fill="#e7e6e1"/><path d="M26 24 l-4 4 h8 z"/><path d="M26 0 V4" stroke="#ff6600"/>',
      params: [['N', 'Effort normal N (ELU)', 100, 4000, 50, 1200, 'kN'], ['H', 'Hauteur H', 2.5, 8, 0.25, 3.5, 'm']],
      note: 'Poteau bi-articulé en compression centrée avec flambement ; acier S355 (flambement sur l\'axe faible, i ≈ 0,25·b), béton C25/30 avec 1 % d\'acier, bois selon l\'EN 1995.',
      sol: p => {
        const N = p.N * 1000, H = p.H;
        const steelChk = s => verdict([N / (chiAcier(s, H) * s.A * 100 * FY)], ['flambement']);
        const baChk = a => verdict([N / (0.8 * (FCD + 0.01 * 435) * (a * 10) ** 2), H / (a / 100) / 15], ['compression', 'élancement H/15']);
        const woodChk = (b, fcd, fck, E05, beta) => verdict([N / (kcBois(H * 1000 * Math.sqrt(12) / b, fck, E05, beta) * fcd * b * b)], ['flambement']);
        const first = (lo, hi, st, f) => { for (let x = lo; x <= hi; x += st) if (f(x).ok) return x; return hi; };
        return [
          { id: 'acier', name: 'Poteau acier', mat: 'acier', dims: [pick('p', 'Profilé', (HE.find(s => steelChk(s).ok) || HE[HE.length - 1]).key, HE.map(s => [s.key, s.label]))],
            build: d => { const s = SEC[d.p]; return { sec: `${s.label} (S355)`, q: { acier: kgm(s) * H }, chk: steelChk(s) }; } },
          { id: 'ba', name: 'Poteau en béton armé', mat: 'beton', dims: [num('a', 'Côté a', 'cm', first(20, 120, 5, baChk), 5, 15)],
            build: d => ({ sec: `${d.a} × ${d.a} cm`, q: { beton: (d.a / 100) ** 2 * H, armature: 150 * (d.a / 100) ** 2 * H }, chk: baChk(d.a) }) },
          { id: 'gl', name: 'Poteau en lamellé-collé', mat: 'bois', dims: [num('b', 'Côté b', 'mm', first(120, 800, 20, b => woodChk(b, FCD_GL, 24, 9600, 0.1)), 20, 80)],
            build: d => ({ sec: `GL24h ${d.b} × ${d.b} mm`, q: { lc: (d.b / 1000) ** 2 * H }, chk: woodChk(d.b, FCD_GL, 24, 9600, 0.1) }) },
          { id: 'c24', name: 'Poteau en bois massif', mat: 'bois', dims: [num('b', 'Côté b', 'mm', first(120, 300, 20, b => woodChk(b, FCD_C24, 21, 7400, 0.2)), 20, 80)],
            build: d => ({ sec: `C24 ${d.b} × ${d.b} mm`, q: { massif: (d.b / 1000) ** 2 * H }, chk: woodChk(d.b, FCD_C24, 21, 7400, 0.2) }) }
        ];
      }
    }
  };

  // ------------------------------------------------------------------ bilan d'une solution
  /* ACV dynamique, méthode RE2020 (arrêté du 4 août 2021) : chaque émission est pondérée selon l'année où
     elle a lieu. Les modules A1–A3 sont à l'année 0 (coefficient 1), la fin de vie à l'année 50 (≈ 0,578).
     Le CO₂ biogénique capté par le bois (−stock, année 0) n'est réémis qu'en fin de vie (+stock × 0,578) :
     l'ACV dynamique retire donc stock × (1 − 0,578) au bilan statique. */
  const DYN_C50 = 0.578;
  function evaluate(s) {
    const by = { beton: 0, acier: 0, bois: 0 };
    let bio = 0;
    Object.entries(s.q).forEach(([k, qt]) => { by[MATS[k].grp] += qt * val(k); bio += qt * bioOf(k); });
    const tot = by.beton + by.acier + by.bois, dyn = -bio * (1 - DYN_C50);
    return Object.assign(s, { by, bio, tot, dyn, totDyn: tot - dyn });
  }
  const qtyTxt = q => Object.entries(q).map(([k, v]) => `${MATS[k].label.split(' (')[0]} ${S.fmt(v, MATS[k].unit === 'kg' ? 0 : 3)} ${MATS[k].unit}`).join(' · ');

  // ------------------------------------------------------------------ graphique : barres horizontales empilées
  /* Pour chaque solution : la barre statique (A1–A3, par matériau) et, dessous, la part retirée par l'ACV
     dynamique RE2020 au titre du stockage biogénique, qui mène au total dynamique (peut passer sous zéro). */
  function chart(sols, unit) {
    const W = 760, rowH = 58, top = 30, left = 230, H = top + sols.length * rowH + 46;
    const maxE = Math.max(...sols.map(s => s.tot)), minE = Math.min(0, ...sols.map(s => s.totDyn));
    const k = (W - left - 215) / ((maxE - minE) || 1), x0 = left - minE * k;
    const g = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diag co2-chart' });
    g.append(sv('defs', {}, sv('pattern', { id: 'co2-dyn', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
      sv('rect', { width: 5, height: 5, fill: '#eaf6ee' }), sv('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: '#2f8a4c', 'stroke-width': 1.6 }))));
    g.append(sv('line', { x1: x0, y1: top - 8, x2: x0, y2: H - 40, class: 'co2-zero' }));
    g.append(sv('text', { x: x0 + 4, y: top - 14, class: 'co2-ax' }, `kgCO₂e ${unit}`));
    const best = Math.min(...sols.map(s => s.tot)), bestD = Math.min(...sols.map(s => s.totDyn));
    sols.forEach((s, i) => {
      const y = top + i * rowH;
      g.append(sv('text', { x: 0, y: y + 17, class: 'co2-name' }, s.name));
      let x = x0;
      ['beton', 'acier', 'bois'].forEach(gk => {
        const w = s.by[gk] * k;
        if (w > 0.2) { g.append(sv('rect', { x, y: y + 4, width: w, height: 18, class: 'co2-' + gk }, sv('title', {}, `${GROUPS[gk]} : ${S.fmt(s.by[gk], 0)} kgCO₂e`))); x += w; }
      });
      const t = sv('text', { x: x + 6, y: y + 18, class: 'co2-val' + (s.tot === best ? ' best' : '') }, `${fmtV(s.tot)} statique`);
      if (!s.chk.ok) t.append(sv('tspan', { class: 'co2-warn', dx: 10 }, '⚠ section insuffisante'));
      g.append(t);
      // ce que l'ACV dynamique retire : de la fin de la barre statique vers le total dynamique
      if (s.dyn > 0) {
        const xe = x0 + s.tot * k, xd = x0 + s.totDyn * k;
        g.append(sv('rect', { x: xd, y: y + 26, width: xe - xd, height: 11, fill: 'url(#co2-dyn)', stroke: '#2f8a4c', 'stroke-width': 0.8 },
          sv('title', {}, `Stockage biogénique en ACV dynamique RE2020 : ${S.fmt(-s.dyn, 0)} kgCO₂e (stock ${S.fmt(s.bio, 0)} × (1 − ${DYN_C50}))`)));
        g.append(sv('line', { x1: xd, y1: y + 23, x2: xd, y2: y + 40, class: 'co2-dynmark' }));
        g.append(sv('text', { x: Math.max(xe, x0) + 6, y: y + 36, class: 'co2-dynval' + (s.totDyn === bestD ? ' best' : '') }, `dynamique ${fmtV(s.totDyn)} (−${S.fmt(s.dyn, 0)})`));
      }
    });
    let lx = 0;
    const ly = H - 26;
    [['beton', 'Béton'], ['acier', 'Acier'], ['bois', 'Bois']].forEach(([c, l]) => {
      g.append(sv('rect', { x: lx, y: ly, width: 12, height: 10, class: 'co2-' + c }), sv('text', { x: lx + 16, y: ly + 9, class: 'co2-ax' }, l)); lx += 66;
    });
    g.append(sv('rect', { x: lx, y: ly, width: 22, height: 10, fill: 'url(#co2-dyn)', stroke: '#2f8a4c', 'stroke-width': 0.8 }),
      sv('text', { x: lx + 28, y: ly + 9, class: 'co2-ax' }, `à retirer en ACV dynamique RE2020 : stock biogénique × (1 − ${S.fmt(DYN_C50, 3)})`));
    g.append(sv('text', { x: 0, y: H - 4, class: 'co2-ax' }, 'Barre pleine : ACV statique A1–A3. Trait vert : total en ACV dynamique RE2020 (stock capté à l\'année 0, réémis en fin de vie à 50 ans).'));
    return g;
  }

  // ------------------------------------------------------------------ page
  S.pages.carbone = function (root) {
    const st = Object.assign({ uf: 'plancher' }, S.store.get('carbone-ui', {}));
    const params = {};
    Object.entries(UF).forEach(([k, u]) => { params[k] = Object.fromEntries(u.params.map(p => [p[0], p[5]])); });
    Object.assign(params, st.params || {});
    const dims = Object.assign({}, st.dims);   // dims[uf][solution][clé] : sections saisies
    const persist = () => S.store.set('carbone-ui', { uf: st.uf, params, dims });

    const dom = { params: el('div'), out: el('div') };

    function renderSide() {
      const u = UF[st.uf];
      dom.params.innerHTML = '';
      u.params.forEach(([k, label, min, max, step, , unit]) => {
        const p = params[st.uf];
        const out = el('output', {}, `${S.fmt(p[k])} ${unit}`);
        dom.params.append(el('label', { class: 'param' }, el('span', { class: 'lab' }, label, out),
          el('input', { type: 'range', min, max, step, value: p[k], oninput: e => { p[k] = +e.target.value; out.textContent = `${S.fmt(p[k])} ${unit}`; persist(); render(); } })));
      });
      dom.params.append(el('p', { class: 'muted', style: 'font-size:12px;margin:6px 0 0' }, 'Les sections sont proposées pour ces hypothèses ; modifiez-les directement dans le tableau des résultats.'));
    }

    // champ de section : valeur saisie, sinon valeur par défaut
    function dimField(sol, dm) {
      const store = ((dims[st.uf] = dims[st.uf] || {})[sol.id] = dims[st.uf][sol.id] || {});
      const cur = store[dm.k] != null ? store[dm.k] : dm.def;
      const set = v => { if (v === '' || v == null || String(v) === String(dm.def)) delete store[dm.k]; else store[dm.k] = dm.type === 'num' ? +v : v; persist(); render(); };
      const ctl = dm.type === 'sel'
        ? el('select', { onchange: e => set(e.target.value) }, dm.list.map(([v, l]) => el('option', { value: v, selected: String(v) === String(cur) }, l + (String(v) === String(dm.def) ? ' (défaut)' : ''))))
        : el('input', { type: 'number', value: cur, step: dm.step, min: dm.min, onchange: e => set(e.target.value) });
      return el('label', { class: 'co2-dim' + (store[dm.k] != null ? ' changed' : '') }, el('span', {}, dm.label), ctl, dm.unit ? el('small', {}, dm.unit) : null);
    }

    function render() {
      const u = UF[st.uf];
      const sols = u.sol(params[st.uf]).map(s => {
        const sd = (dims[st.uf] || {})[s.id] || {};
        const d = Object.fromEntries(s.dims.map(dm => [dm.k, sd[dm.k] != null ? sd[dm.k] : dm.def]));
        return evaluate(Object.assign(s, s.build(d), { edited: Object.keys(sd).length > 0 }));
      });
      const best = sols.reduce((a, b) => (b.tot < a.tot ? b : a));
      const worst = sols.reduce((a, b) => (b.tot > a.tot ? b : a));
      const bestD = sols.reduce((a, b) => (b.totDyn < a.totDyn ? b : a));
      const used = [...new Set(sols.flatMap(s => Object.keys(s.q)))].sort((a, b) => Object.keys(MATS).indexOf(a) - Object.keys(MATS).indexOf(b));
      dom.out.innerHTML = '';
      dom.out.append(
        el('div', { class: 'kpis co2-kpis' },
          el('div', { class: 'kpi' }, el('b', {}, 'Solution la plus sobre'), el('span', {}, fmtV(best.tot)), el('small', {}, `kgCO₂e ${u.per} — ${best.name}`)),
          el('div', { class: 'kpi' }, el('b', {}, 'Écart avec la plus émissive'), el('span', {}, `× ${S.fmt(worst.tot / best.tot, 1)}`), el('small', {}, worst.name)),
          el('div', { class: 'kpi' }, el('b', {}, 'Plus sobre en ACV dynamique'), el('span', {}, fmtV(bestD.totDyn)), el('small', {}, `kgCO₂e ${u.per}, méthode RE2020 — ${bestD.name}`)),
          el('div', { class: 'kpi' }, el('b', {}, 'Périmètre'), el('span', {}, 'A1–A3'), el('small', {}, 'production ; stockage biogénique en dynamique'))),
        el('div', { class: 'co2-chart-wrap' }, chart(sols, u.per)),
        el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl co2-tbl' },
          el('thead', {}, el('tr', {}, ...['Solution', 'Section (modifiable)', 'Quantités', 'Statique A1–A3', 'Écart', 'Dynamique RE2020'].map((h, i) => el('th', { class: i >= 3 ? 'num' : '' }, h)))),
          el('tbody', {}, sols.map(s => el('tr', { class: s === best ? 'best' : '' },
            el('td', {}, el('span', { class: 'tag ' + s.mat }, GROUPS[s.mat]), el('div', { class: 'co2-sname' }, s.name)),
            el('td', {}, el('div', { class: 'co2-dims' }, s.dims.map(dm => dimField(s, dm))),
              el('div', { class: 'co2-chk ' + (s.chk.ok ? 'ok' : 'ko') }, s.chk.ok ? '✓ ' : '⚠ insuffisante — ', s.chk.txt),
              s.edited ? el('button', { class: 'linkbtn', onclick: () => { delete dims[st.uf][s.id]; persist(); render(); } }, '↺ section par défaut') : null),
            el('td', { class: 'qty' }, qtyTxt(s.q)),
            el('td', { class: 'num' }, el('b', {}, fmtV(s.tot))),
            el('td', { class: 'num' }, s === best ? 'référence' : `+${S.fmt((s.tot / best.tot - 1) * 100, 0)} %`),
            el('td', { class: 'num co2-dyncell' }, el('b', {}, fmtV(s.totDyn)), s.dyn > 0 ? el('small', {}, `stock ${S.fmt(s.bio, 0)} → −${S.fmt(s.dyn, 0)}`) : null)))))),
        el('p', { class: 'note', style: 'margin-top:10px' }, u.note),
        hypotheses(used));
    }

    // Hypothèses carbone : une ligne par matériau utilisé, avec le choix de la fiche
    function hypotheses(used) {
      const row = k => {
        const m = MATS[k], o = optOf(k), s = sel[k] || {};
        const label = x => `${fmtV(x.v)} kgCO₂e/${m.unit} — ${x.name}${x.ref ? ` · INIES ${x.ref}` : ` · ${KIND[x.kind]}`}`;
        const select = el('select', { class: 'co2-fiche', onchange: e => {
          if (e.target.value === 'custom') sel[k] = { id: 'custom', v: o.v, ref: '' }; else sel[k] = { id: e.target.value };
          if (sel[k].id === m.def) delete sel[k];
          saveSel(); render();
        } },
          m.opts.map(x => el('option', { value: x.id, selected: x.id === o.id }, label(x) + (x.id === m.def ? ' (défaut)' : ''))),
          el('option', { value: 'custom', selected: o.id === 'custom' }, 'Autre fiche INIES : saisir la valeur…'));
        const custom = o.id === 'custom' ? el('div', { class: 'co2-custom' },
          el('label', {}, 'Valeur A1–A3 ', el('input', { type: 'number', step: 'any', min: 0, value: s.v, onchange: e => { s.v = +e.target.value; saveSel(); render(); } }), ` kgCO₂e/${m.unit}`),
          el('label', {}, 'N° de fiche ', el('input', { type: 'text', value: s.ref || '', placeholder: 'ex. 20240337244', onchange: e => { s.ref = e.target.value.trim(); saveSel(); } })),
          el('a', { href: INIES, target: '_blank', rel: 'noopener' }, 'Chercher la fiche sur INIES ↗')) : null;
        return el('tr', { class: sel[k] ? 'changed' : '' },
          el('td', {}, el('span', { class: 'tag ' + m.grp }, GROUPS[m.grp]), el('b', { class: 'co2-mname' }, m.label)),
          el('td', {}, select, custom, el('small', { class: 'co2-src' }, el('span', { class: 'co2-kind k-' + o.kind }, o.id === 'custom' ? 'Saisie' : KIND[o.kind]), ' ', o.src)));
      };
      return el('div', { class: 'co2-hyp' },
        el('h3', {}, 'Hypothèses carbone'),
        el('p', { class: 'muted' }, 'Pour chaque matériau, choisissez la fiche utilisée : sa valeur A1–A3 est indiquée en tête de chaque choix. Le classement se met à jour aussitôt.'),
        el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl co2-fac' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Matériau'), el('th', {}, 'Fiche retenue'))),
          el('tbody', {}, used.map(row)))),
        Object.keys(sel).length ? el('button', { class: 'btn sm', style: 'margin-top:8px', onclick: () => { Object.keys(sel).forEach(k => delete sel[k]); saveSel(); render(); } }, 'Revenir aux fiches par défaut') : null);
    }

    const picker = S.picker(Object.entries(UF).map(([id, u]) => ({ id, label: u.label, svg: u.svg })), st.uf,
      id => { st.uf = id; persist(); renderSide(); render(); }, { label: 'Élément comparé' });
    const step = (n, t) => el('h4', {}, el('span', { class: 'step' }, n), t);

    root.append(el('div', { class: 'page' },
      S.blockHead('06', 'Comparateur carbone', 'Comparer l\'empreinte carbone de solutions structurelles qui rendent le même service — un plancher, une poutre, un poteau — à partir de sections prédimensionnées, modifiables, et de fiches environnementales (base INIES). Des ordres de grandeur pour orienter l\'esquisse, pas un calcul RE2020.'),
      el('div', { class: 'solver co2' },
        el('aside', { class: 'side' },
          el('div', { class: 'side-sec' }, step(1, 'Élément comparé'), picker.el),
          el('div', { class: 'side-sec' }, step(2, 'Hypothèses'), dom.params)),
        el('div', {}, dom.out)),
      el('section', { class: 'og-sec' },
        el('div', { class: 'sub-head' }, S.blockHead('6.1', 'Méthode et limites', null, 'h2')),
        el('div', { class: 'grid2 co2-method' },
          el('div', {}, el('h3', {}, 'Ce que calcule l\'outil'), el('ul', { class: 'list' },
            el('li', {}, 'Des solutions comparables : même portée, même charge, même usage (unité fonctionnelle).'),
            el('li', {}, 'Des sections proposées par un prédimensionnement simplifié (élancements usuels, résistance et flèche, flambement), modifiables, avec leur taux de travail dans ce contrôle simplifié.'),
            el('li', {}, 'L\'impact de production des matériaux (A1–A3, kgCO₂e), en ACV statique ; pour le bois, la part fossile.'),
            el('li', {}, 'Le carbone biogénique stocké dans le bois, jamais déduit du bilan statique.'),
            el('li', {}, 'L\'ACV dynamique selon la méthode RE2020 (arrêté du 4 août 2021) pour ce stockage : le CO₂ capté est compté à l\'année 0 (coefficient 1), sa réémission en fin de vie à l\'année 50 (coefficient ≈ 0,578). Le bilan dynamique retire donc 42 % du stock biogénique au bilan statique ; les émissions A1–A3, à l\'année 0, sont inchangées.'),
            el('li', {}, 'Les valeurs « FDES INIES » sont lues dans les fiches publiées (numéro d\'enregistrement indiqué) ; les autres sont des valeurs de configurateur, de filière ou des estimations, signalées comme telles.'))),
          el('div', {}, el('h3', {}, 'Ce qu\'il ne calcule pas'), el('ul', { class: 'list con' },
            el('li', {}, 'Transport, chantier, vie en œuvre et fin de vie (A4–A5, B, C) ni bénéfices au-delà du cycle de vie (D).'),
            el('li', {}, 'L\'indicateur Ic construction complet ni ses seuils : seuls la production (A1–A3) et le stockage biogénique sont pris en compte, en supposant une réémission totale du carbone stocké en fin de vie.'),
            el('li', {}, 'Les fondations, les contreventements, les assemblages détaillés, le feu, l\'acoustique et les vibrations, qui peuvent inverser un classement.'),
            el('li', {}, 'Une connexion en temps réel à INIES : la base n\'offre pas d\'accès public direct depuis une page web ; le webservice INIES est soumis à une demande d\'accès.')))))));
    renderSide(); render();
  };
})(window.S);
