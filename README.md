# Structura — atelier en ligne de conception des structures

Application web statique (HTML/CSS/JavaScript, sans dépendance ni étape de build) en six modules :

| Module | Contenu |
|---|---|
| **Typologies** | 69 fiches en 10 familles (poutres, poutres treillis, sous-tendues, dalles et planchers, arcs, structures tendues, portiques, plissées, coques, gridshells), dessins axonométriques, portées et élancements par matériau, lien vers le solveur. |
| **Contreventement** | Phénomènes (actions horizontales, mécanisme, trajet des efforts, plans non concourants), comparaison calculée des systèmes, typologies de contreventement. |
| **Solveur RDM 2D** | Méthode des déplacements (poutres d'Euler-Bernoulli, rotules par condensation statique). 36 modèles paramétriques rangés par familles, charges réglables sur les portiques, vérification du flambement des arcs (méthode D. Bitar, CTICM), diagrammes N, V, M et déformée en direct, import/export JSON. |
| **Formulaire** | 23 cas en planches annotées de formules (V, M, déformée), flambement d'un arc, sections, choix d'un profilé, et les formules essentielles à retenir. |
| **Ordres de grandeur** | Portées et élancements par matériau, poids propres, charges d'exploitation illustrées, comportement et comparaison des matériaux. |
| **Fondations** | Première ébauche : familles de fondations, capacité des sols, pré-dimensionnement de semelle. |

## Lancer en local

Les scripts sont classiques (pas de modules ES) : on peut ouvrir `index.html` directement par double-clic.
Pour un serveur local sous Windows (sans Node ni Python) :

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Le script ouvre le navigateur tout seul. Si le port 8080 est déjà pris, il essaie automatiquement 8081, 8082… et affiche l'adresse utilisée.

## Déployer

N'importe quel hébergement statique convient : publier le dossier tel quel (le fichier `serve.ps1` est inutile en ligne).

- **Netlify** : glisser-déposer le dossier sur https://app.netlify.com/drop.
- **Vercel** : `vercel deploy` dans le dossier (aucune configuration).
- **GitHub Pages** : pousser le dossier dans un dépôt, puis *Settings → Pages → Deploy from branch*.

La navigation utilise des ancres (`#/solveur`), donc aucune règle de réécriture n'est nécessaire.

## Organisation du code

| Fichier | Rôle |
|---|---|
| `js/util.js` | Création DOM/SVG, formatage, stockage local, info-bulle |
| `js/sections.js` | Matériaux et bibliothèque de sections (IPE, HEA, HEB, tubes, bois, BA) |
| `js/fem.js` | Moteur de calcul (assemblage, résolution, efforts internes, déformée, flambement des arcs) |
| `js/geom.js` | Géométries de treillis et poutres sous-tendues, dessins axonométriques |
| `js/contreventement.js`, `js/fondations.js` | Onglets Contreventement et Fondations |
| `js/presets.js` | Modèles paramétriques du solveur |
| `js/draw.js` | Rendu SVG du modèle, des charges, réactions et diagrammes |
| `js/solver-ui.js` | Interface du solveur |
| `js/formulaire.js` | Formulaire interactif |
| `js/typologies-data.js`, `js/typologies.js` | Données et page Typologies |
| `js/ordres-data.js`, `js/ordres.js` | Données et page Ordres de grandeur |
| `js/app.js` | Routeur, thème, page d'accueil |

## Conventions de calcul

Unités : m, kN, kN·m ; E en MPa, A en cm², I en cm⁴, h en mm.
Charges verticales positives vers le bas ; N > 0 en traction ; M > 0 fibre inférieure tendue (diagramme tracé côté fibre tendue) ; V = dM/dx.

Le solveur a été recoupé avec les formules analytiques (qL²/8, qL²/12, réactions de poutres continues, poussée d'un arc et d'un portique à 3 articulations, portiques de Kleinlogel).

## Avertissement

Outil pédagogique et de pré-conception. Les valeurs sont indicatives et ne remplacent pas un dimensionnement réglementaire (Eurocodes) : pas de vérification de déversement, voilement, fissuration, feu, séisme, ni de coefficients partiels complets.
