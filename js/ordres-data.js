/* Données du mémento « Ordres de grandeur ». Valeurs indicatives de pré-conception. */
(function (S) {
  'use strict';

  // Poids surfaciques : [désignation, kg/m² (nombre ou plage), commentaire]
  S.OG_POIDS = [
    {
      title: 'Planchers (poids propre)', rows: [
        ['Dalle BA pleine 16 cm', 400], ['Dalle BA pleine 20 cm', 500], ['Dalle BA pleine 25 cm', 625],
        ['Plancher poutrelles-entrevous 16+4', 270], ['Dalle alvéolaire 20 cm', [260, 300]], ['Dalle alvéolaire 26,5 cm', [350, 390]],
        ['Plancher collaborant (bac + 12 cm)', [200, 250]], ['Plancher CLT 140 mm', 70], ['Solivage bois + panneau OSB', [35, 50]]]
    },
    {
      title: 'Revêtements et second œuvre', rows: [
        ['Chape ciment 5 cm', 110], ['Carrelage collé', [40, 60]], ['Parquet', [10, 15]],
        ['Faux plafond plaque de plâtre', [15, 25]], ['Cloisons légères (forfait réparti)', [50, 120]],
        ['Isolant laine minérale 20 cm', [5, 10]], ['Réseaux techniques (forfait)', [20, 50]]]
    },
    {
      title: 'Couvertures', rows: [
        ['Bac acier simple peau', [8, 12]], ['Panneau sandwich', [12, 20]], ['Tuiles terre cuite + liteaux', [40, 60]],
        ['Ardoises', [25, 40]], ['Zinc sur voligeage', [20, 25]], ['Toiture-terrasse (étanchéité + isolant)', [20, 40]],
        ['Protection gravillons 5 cm', [80, 100]], ['Toiture végétalisée extensive (saturée)', [80, 150]], ['Toiture végétalisée intensive', [400, 1000]]]
    },
    {
      title: 'Murs et façades', rows: [
        ['Voile BA 18 cm', 450], ['Bloc béton creux 20 cm enduit', [230, 280]], ['Brique terre cuite 20 cm', [180, 230]],
        ['Pierre massive 30 cm', [700, 800]], ['Ossature bois isolée + bardage', [50, 80]], ['Mur-rideau vitré', [50, 80]],
        ['Double vitrage 4/16/4', 20]]
    }
  ];

  S.OG_MASSES = [
    ['Béton armé', '2 500'], ['Acier', '7 850'], ['Aluminium', '2 700'],
    ['Bois résineux (C24)', '420 – 500'], ['Lamellé-collé / CLT', '420 – 480'], ['Chêne', '700 – 750'], ['Verre', '2 500'],
    ['Brique pleine', '1 800 – 2 000'], ['Pierre calcaire', '2 000 – 2 700'], ['Terre, remblai', '1 800 – 2 000'],
    ['Eau', '1 000'], ['Neige (fraîche → mouillée)', '100 – 500']
  ];

  // Charges d'exploitation : usage, q (kN/m²), image mentale
  S.OG_USAGES = [
    { name: 'Logement', q: 1.5, picture: 'Une pièce meublée avec ses occupants ; ponctuellement une réception.' },
    { name: 'Bureaux', q: 2.5, picture: 'Postes de travail, armoires, personnes ; avec cloisons légères en plus.' },
    { name: 'Salle de classe, restaurant', q: 2.5, picture: 'Tables et chaises occupées.' },
    { name: 'Musée, hall, salle à sièges fixes', q: 4, picture: 'Circulation libre d\'un public nombreux.' },
    { name: 'Salle de concert, tribune, foule ; commerce, grand magasin', q: 5, picture: 'Une foule debout et compacte, qui peut sauter en rythme ; ou des rayonnages chargés et leurs clients.' },
    { name: 'Stockage, archives', q: 7.5, picture: 'Rayonnages de livres ou de marchandises sur toute la hauteur.' },
  ];

  // Matériaux : caractéristiques indicatives (MPa, GPa, kg/m³)
  S.OG_MATS = [
    { k: 'acier', name: 'Acier S355', fc: 355, ft: 355, E: 210, rho: 7850, color: 'var(--c-blue)',
      txt: 'Isotrope et ductile : il résiste autant en traction qu\'en compression et se plastifie avant de rompre. Très élancé, il est gouverné par le flambement et la flèche. Il perd la moitié de sa résistance vers 550 °C.' },
    { k: 'beton', name: 'Béton C25/30', fc: 25, ft: 2.6, E: 31, rho: 2500, color: '#8c8b86',
      txt: 'Excellent en compression, environ dix fois plus faible en traction : on place des armatures d\'acier là où il est tendu (béton armé) ou on le comprime à l\'avance (précontraint). Lourd, massif, bon au feu.' },
    { k: 'bois', name: 'Bois lamellé-collé GL24h', fc: 24, ft: 19, E: 11.5, rho: 420, color: 'var(--c-sun)',
      txt: 'Anisotrope : très résistant dans le sens du fil, faible en travers. Léger, il offre le meilleur rapport résistance / poids des matériaux courants. Sensible à l\'humidité ; au feu, il carbonise lentement (≈ 0,7 mm/min) en gardant un cœur sain.' },
    { k: 'alu', name: 'Aluminium 6060', fc: 150, ft: 150, E: 70, rho: 2700, color: '#2c9a8f',
      txt: 'Trois fois plus léger que l\'acier mais trois fois plus souple : les déformations et le flambement gouvernent. Résistant à la corrosion, utilisé surtout pour les façades et les menuiseries.' }
  ];
})(window.S);
