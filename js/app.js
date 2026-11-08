/* Routeur et page d'accueil. */
(function (S) {
  'use strict';
  const el = S.el;
  S.pages = S.pages || {};

  // ------------------------------------------------------------------ accueil
  const ICONS = {
    typologies: '<svg viewBox="0 0 180 70"><path d="M10 62 Q90 -20 170 62"/><path d="M4 62 h172"/><path d="M90 21 v41 M50 36 v26 M130 36 v26"/></svg>',
    solveur: '<svg viewBox="0 0 180 70"><path d="M20 15 V60 M20 15 H160 M160 15 V60"/><path d="M20 15 Q90 60 160 15" stroke="#4284f4"/><path d="M12 60 h16 M152 60 h16"/></svg>',
    formulaire: '<svg viewBox="0 0 180 70"><path d="M10 20 H170"/><path d="M10 20 l-6 9 h12 z M170 20 l-6 9 h12 z"/><path d="M10 40 Q90 80 170 40" stroke="#4284f4"/><path d="M10 40 H170" stroke-dasharray="3 4"/></svg>',
    ordres: '<svg viewBox="0 0 180 70"><path d="M4 64 H176"/><path d="M14 64 V50 M44 64 V36 M74 64 V44 M104 64 V18 M134 64 V30 M164 64 V8" stroke-width="7"/></svg>',
    contreventement: '<svg viewBox="0 0 180 70"><path d="M66 66 V6 H114 V66 M66 36 H114"/><path d="M66 66 L114 36 M66 36 L114 66 M66 36 L114 6 M66 6 L114 36" stroke="#4284f4"/><path d="M16 20 h32 m-6 -4 l6 4 l-6 4 M16 46 h32 m-6 -4 l6 4 l-6 4"/></svg>',
    carbone: '<svg viewBox="0 0 180 70"><path d="M4 64 H176"/><path d="M20 14 H150" stroke-width="9" stroke="#8c8b86"/><path d="M20 34 H96" stroke-width="9" stroke="#4284f4"/><path d="M20 54 H62" stroke-width="9" stroke="#ffca7d"/><path d="M20 6 V64"/></svg>'
  };

  S.pages.home = function (root) {
    const card = (n, route, title, text) => el('a', { class: 'home-card', href: '#/' + route },
      el('span', { class: 'num' }, n), el('h3', {}, title), el('p', {}, text), el('div', { html: ICONS[route] }));
    root.append(el('div', { class: 'page' },
      el('section', { class: 'hero', style: 'padding:clamp(24px,6vh,80px) 0 clamp(28px,5vh,56px)' },
        el('h1', { class: 'hero-title', html: 'Comprendre<br>les structures<em>.</em>' }),
        el('div', { class: 'hero-meta', style: 'margin-top:22px' }, el('span', {}, 'Outil d\'aide à la conception'), el('i', {}, '•'), el('span', {}, 'Structures')),
        el('p', { class: 'hero-lede' }, 'Comment une structure porte-t-elle, quelle portée peut-elle franchir, quelle hauteur lui donner ? Structura rassemble les grandes familles structurelles, un formulaire illustré, un solveur RDM interactif, les ordres de grandeur, les principes du contreventement et un comparateur carbone, pour dessiner juste dès l\'esquisse.')),
      el('div', { class: 'home-grid' },
        card('01', 'typologies', 'Typologies', 'Poutres, treillis, sous-tendues, portiques, planchers, arcs, structures tendues, plissés, coques, gridshells.'),
        card('02', 'formulaire', 'Formulaire', 'Les cas de charge classiques, leurs diagrammes et leurs formules.'),
        card('03', 'solveur', 'Solveur RDM', 'Modélisez une structure plane et suivez N, V, M et la déformée en direct.'),
        card('04', 'ordres', 'Ordres de grandeur', 'Portées et élancements par matériau, matériaux, charges permanentes et d\'exploitation.'),
        card('05', 'contreventement', 'Comprendre le contreventement', 'Pourquoi et comment stabiliser une structure vis-à-vis du vent et du séisme.'),
        card('06', 'carbone', 'Comparateur carbone', 'Plancher, poutre, poteau : comparer l\'empreinte carbone des solutions béton, acier et bois.'))));
  };

  // ------------------------------------------------------------------ routeur
  const app = document.getElementById('app');
  function route() {
    const path = (location.hash.replace(/^#\/?/, '').split('?')[0] || '').split('/');
    const name = path[0] || 'home';
    const page = S.pages[name] || S.pages.home;
    S.hideTip();
    document.querySelectorAll('.modal-back').forEach(m => m.remove());
    app.innerHTML = '';
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === name));
    page(app, path.slice(1));
    if (!route.keepScroll) window.scrollTo(0, 0);
    route.keepScroll = false;
  }
  S.navigate = function (hash, keepScroll) { route.keepScroll = !!keepScroll; location.hash = hash; };
  window.addEventListener('hashchange', route);
  route();
})(window.S);
