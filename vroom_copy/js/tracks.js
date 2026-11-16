/* ============================================================
   VROOMIIIES — tracks.js
   Données : personnages, noms d'IA, définitions de circuits.
   Les 8 circuits sont définis ici. Schéma :
   { id, name, width, points[[x,y]…] (sens horaire, point 0 = ligne
   de départ), boosts[fractions de longueur], bridge?{x,y,angle,w,deck,rail},
   theme{bg, bgGradient?, track, border, line, borderW, dash, outline?,
          outlineW?, boostA?, boostB?, startA, startB, startBadge?}, decor }
   ============================================================ */
'use strict';

/* ---- Personnages jouables ----
   stats : v = Vitesse, a = Accélération, m = Maniabilité (1–10)
   Recalculés en maxSpd / force / steerRate dans engine.js (CFG). */
const CHARACTERS = {
  mimi:  { id: 'mimi',  name: 'Mimi',  color: '#FF8FC7', dark: '#E565A8', accessory: 'bow',   v: 6, a: 6, m: 6,  blurb: 'Équilibrée, à l’aise partout.' },
  pixel: { id: 'pixel', name: 'Pixel', color: '#5FB4FF', dark: '#3A8FE0', accessory: 'bolt',  v: 9, a: 4, m: 6,  blurb: 'Une flèche en ligne droite.' },
  boubou:{ id: 'boubou',name: 'Boubou',color: '#C08552', dark: '#96613A', accessory: 'bear',  v: 5, a: 6, m: 4,  blurb: 'Force tranquille.' },
  ziggy: { id: 'ziggy', name: 'Ziggy', color: '#FFD93D', dark: '#E0A92C', accessory: 'chick', v: 6, a: 9, m: 7,  blurb: 'Départ fulgurant.' },
  louna: { id: 'louna', name: 'Louna', color: '#C79BFF', dark: '#9B6FE0', accessory: 'star',  v: 5, a: 6, m: 10, blurb: 'Reine des virages.' },
  coco:  { id: 'coco',  name: 'Coco',  color: '#7FE0BE', dark: '#4CC49A', accessory: 'leaf',  v: 7, a: 7, m: 7,  blurb: 'Polyvalent et frais.' }
};
const CHARACTER_LIST = ['mimi', 'pixel', 'boubou', 'ziggy', 'louna', 'coco'].map(function (id) { return CHARACTERS[id]; });

/* ---- 29 noms d'IA (distincts) ---- */
const AI_NAMES = [
  'Nounours', 'Nounou Capuche', 'Lulu', 'Praline', 'Caramel',
  'Dormeur', 'P’tit Loup', 'Fraise', 'Kaki', 'Nougat',
  'Bichette', 'Pistache', 'Marron', 'Guimauve', 'Raphia',
  'Crumble', 'Trucmuche', 'Bidule', 'Fripouille', 'Moumoute',
  'Cannelle', 'Réglisse', 'Pompon', 'Sucette', 'Myrtille',
  'Chocolat', 'Pêche', 'Anis', 'Vanille'
];

/* ---- Circuits ----
   Coordonnées monde : origine au centre, y vers le bas.
   Points en SENS HORAIRE (tels que vus à l'écran), point 0 = ligne d'arrivée. */
const TRACKS = {
  prairie: {
    id: 'prairie',
    name: 'Prairie des doudous',
    width: 140,
    /* Boucle cabossée ~5,6 km — échelle monde ×2.3 */
    points: [
      [    0, -640 ], [  530, -610 ], [  930, -345 ], [ 1035,    45 ],
      [  770,  355 ], [  805,  690 ], [  300,  760 ], [  -70,   495 ],
      [ -485,  610 ], [ -900,  345 ], [ -1025, -140 ], [ -725,  -540 ]
    ],
    boosts: [0.22, 0.61],          // fractions de la longueur totale
    theme: {
      bg: '#B2D8D0',               // fond prairie (mat)
      track: '#8E7CB3',            // piste violette
      border: '#FF8FD0',           // liseré rose
      line: '#FFFFFF',             // pointillés centraux
      borderW: 12,
      dash: [30, 26],
      startA: '#1A1A1A',           // damier ligne d'arrivée
      startB: '#FFFFFF'
    },
    decor: 'prairie'
  },

  /* ══════════ LOT 2 : les 7 autres circuits ══════════ */

  /* 1 — Plage aux coquillages : boucle en vague/feuille */
  plage: {
    id: 'plage',
    name: 'Plage aux coquillages',
    width: 130,
    points: [
      [    0, -560 ], [  430, -520 ], [  790, -330 ], [ 1010,    20 ],
      [  830,  330 ], [  420,  460 ], [   40,  380 ], [ -260,  560 ],
      [ -700,  620 ], [-1010,  300 ], [ -950, -140 ], [ -640, -480 ]
    ],
    boosts: [0.10, 0.60],
    theme: {
      bg: '#7FE0EA',               // mer
      track: '#E8A0BF',            // rose sable
      border: '#FFF3D6',           // liseré crème
      line: '#FFFDF4',
      borderW: 12,
      dash: [30, 26],
      outline: '#E4C878',          // fin liseré doré autour du bord crème
      startA: '#1A1A1A',
      startB: '#FFFFFF'
    },
    decor: 'plage'
  },

  /* 2 — Table du goûter : tour de table avec chicanes */
  gouter: {
    id: 'gouter',
    name: 'Table du goûter',
    width: 118,
    points: [
      [    0, -700 ], [  440, -685 ], [  760, -500 ], [  845, -245 ],
      [  735,    0 ], [  845,  245 ], [  760,  500 ], [  380,  665 ],
      [    0,  700 ], [ -380,  665 ], [ -760,  500 ], [ -845,  245 ],
      [ -735,    0 ], [ -845, -245 ], [ -760, -500 ], [ -440, -685 ]
    ],
    boosts: [0.13, 0.62],
    theme: {
      bg: '#B9855A',               // bois (la nappe est dessinée par le décor)
      track: '#E8B04B',            // doré
      border: '#B5651D',           // brun
      line: '#FFF3D0',
      borderW: 11,
      dash: [26, 22],
      startA: '#7A3B12',
      startB: '#FFF3D6'
    },
    decor: 'gouter'
  },

  /* 3 — Potager en huit : ∞ entre les carrés de légumes */
  potager: {
    id: 'potager',
    name: 'Potager en huit',
    width: 108,
    points: [
      [  850,    0 ], [  644,  252 ], [  329,  231 ], [   97,   85 ],
      [  -97,  -85 ], [ -329, -231 ], [ -644, -252 ], [ -850,    0 ],
      [ -644,  252 ], [ -329,  231 ], [  -97,   85 ], [   97,  -85 ],
      [  329, -231 ], [  644, -252 ]
    ],
    boosts: [0.10, 0.60],
    bridge: { x: 0, y: 0, angle: -0.733, w: 250, deck: '#C89B6A', rail: '#8A5A2B' },
    theme: {
      bg: '#6FA052',               // herbe / potager
      track: '#A9714B',            // terre tassée
      border: '#7C4A2D',           // terre sombre
      line: '#F5D9A8',
      borderW: 10,
      dash: [24, 22],
      startA: '#4A2E15',
      startB: '#FFF3D6'
    },
    decor: 'potager'
  },

  /* 4 — Salle de bain : double esse (côtés concaves) */
  salledebain: {
    id: 'salledebain',
    name: 'Salle de bain',
    width: 112,
    points: [
      [  520,    0 ], [  481,  231 ], [  373,  508 ], [  218,  738 ],
      [ -218,  738 ], [ -373,  508 ], [ -481,  231 ], [ -520,    0 ],
      [ -481, -231 ], [ -373, -508 ], [ -218, -738 ], [  218, -738 ],
      [  373, -508 ], [  481, -231 ]
    ],
    boosts: [0.16, 0.66],
    theme: {
      bg: '#FFFFFF',               // damier dessiné par le décor
      track: '#9BD8E0',            // aqua
      border: '#FFFFFF',           // liseré blanc
      line: '#E8FBFF',
      borderW: 11,
      dash: [26, 22],
      outline: '#8FD0D8',          // filet aqua (lisibilité sur blanc)
      startA: '#1F6F78',
      startB: '#FFFFFF'
    },
    decor: 'salledebain'
  },

  /* 5 — Banquise : ∞ polaire (fidèle à la capture) */
  banquise: {
    id: 'banquise',
    name: 'Banquise',
    width: 122,
    points: [
      [ 1100,    0 ], [  834,  290 ], [  426,  266 ], [  125,   98 ],
      [ -125,  -98 ], [ -426, -266 ], [ -834, -290 ], [-1100,    0 ],
      [ -834,  290 ], [ -426,  266 ], [ -125,   98 ], [  125,  -98 ],
      [  426, -266 ], [  834, -290 ]
    ],
    boosts: [0.10, 0.60],
    bridge: { x: 0, y: 0, angle: -0.676, w: 260, deck: '#BFE3FF', rail: '#6FA8DC' },
    theme: {
      bg: '#EAF6FF',               // blanc bleuté banquise
      track: '#A9B8FF',            // bleu-lavande
      border: '#FFFFFF',           // bords blancs
      line: '#FFFFFF',
      borderW: 11,
      dash: [28, 22],
      outline: '#7FA8E0',          // filet bleu
      boostA: '#BFEFFF',
      boostB: '#2E9BFF',           // chevrons bleus
      startA: '#E2483D',           // damier rouge/blanc
      startB: '#FFFFFF',
      startBadge: '1'
    },
    decor: 'banquise'
  },

  /* 6 — Nuit étoilée : ∞ spatial */
  nuit: {
    id: 'nuit',
    name: 'Nuit étoilée',
    width: 118,
    points: [
      [ 1000,    0 ], [  758,  280 ], [  387,  257 ], [  114,   95 ],
      [ -114,  -95 ], [ -387, -257 ], [ -758, -280 ], [-1000,    0 ],
      [ -758,  280 ], [ -387,  257 ], [ -114,   95 ], [  114,  -95 ],
      [  387, -257 ], [  758, -280 ]
    ],
    boosts: [0.10, 0.60],
    bridge: { x: 0, y: 0, angle: -0.705, w: 250, deck: '#8A93B8', rail: '#565E82' },
    theme: {
      bg: '#171233',               // fond de secours (bas du dégradé)
      bgGradient: ['#2B2350', '#171233'],
      track: '#6B4FB8',            // violet
      border: '#8F6FE0',           // violet clair
      line: '#FFE066',             // pointillés jaunes
      borderW: 10,
      dash: [26, 22],
      startA: '#FFE066',
      startB: '#241A3E',
      boostA: '#FFF3A0',
      boostB: '#FFB53E'
    },
    decor: 'nuit'
  },

  /* 7 — Au-dessus des nuages : grande boucle rapide */
  nuages: {
    id: 'nuages',
    name: 'Au-dessus des nuages',
    width: 135,
    points: [
      [    0, -680 ], [  400, -660 ], [  760, -480 ], [  900, -150 ],
      [  830,  190 ], [  560,  430 ], [  150,  600 ], [ -250,  640 ],
      [ -590,  470 ], [ -800,  180 ], [ -840, -160 ], [ -620, -480 ],
      [ -280, -660 ]
    ],
    boosts: [0.14, 0.64],
    theme: {
      bg: '#EAF7FF',               // fond de secours (bas du dégradé)
      bgGradient: ['#8ED0FF', '#EAF7FF'],
      track: '#B7A6F5',            // lilas
      border: '#FFFFFF',
      line: '#FFFFFF',
      borderW: 12,
      dash: [30, 24],
      outline: '#C9C3E8',
      startA: '#3E3A6E',
      startB: '#FFFFFF'
    },
    decor: 'nuages'
  }
};
