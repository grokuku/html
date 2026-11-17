/* Vroomiiies — circuits.
   Phase 2 : les 8 tracés sont définitifs. Chaque tracé = points pré-lissés hors
   runtime (Chaikin + rééchantillonnage arc uniforme, validé sous node : longueur
   2500–3800 u, rayon de courbure min ≥ 55 u, temps de tour IA 15–18 s).
   Les deux circuits en huit (potager, banquise) ont un pont visuel au croisement :
   `ponts` est calculé à partir de V.spline.croisements et consommé par render.js.
   Convention theme{} :
     fond / motif (pois | sable | carreaux | sillons | carrelage | flocons | etoiles | ciel)
     piste (+ pisteDegrade optionnel = arc-en-ciel) / bordure / pointille / damier[cA,cB]
     mer {x,y,rx,ry} optionnel (eau animée) / fonce:true si fond sombre (halo karts)
     pont {tablier, planche, rail} pour les huit.
   theme.motif et theme.fonce sont lus par render.js ; tout champ absent = repli pois. */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};
  var U = V.U;

  // ---------- Prairie des doudous : ovale + épingle à gauche + grand virage à droite ----------
  // CRIT-4 : boucle SIMPLE non auto-intersectée (l'ancien tracé en « huit pincé » rappelait
  // le huit du potager sans pont). Pré-lissé hors runtime (points resserrés dans l'épingle,
  // tangentes continues aux entrées/sorties), validé node : len 2675 u, Rmin 64 u,
  // courbure max 0,0156, 0 auto-intersection à 112 u, IA 6 s sans NaN.
  var PRAIRIE_POINTS = [
    [880, 764], [1080, 748], [1258, 678], [1398, 548], [1450, 390], [1392, 242],
    [1238, 152], [1046, 122], [848, 142], [676, 196], [568, 264], [516, 342],
    [426, 409], [394, 465], [405, 530], [455, 571], [558, 608], [680, 668],
    [780, 724]
  ];

  // ---------- Plage aux coquillages : haricot de côte (encoche douce côté mer) ----------
  // len 3009 u, Rmin 89 u, tour IA ≈ 15.4 s
  var PLAGE_POINTS = [
    [1457, 480], [1410, 566], [1329, 624], [1235, 661], [1138, 684], [1038, 698],
    [938, 705], [838, 707], [738, 706], [638, 700], [538, 687], [440, 664], [347, 628],
    [264, 571], [211, 488], [212, 389], [259, 301], [332, 232], [418, 182], [512, 147],
    [610, 125], [710, 114], [810, 113], [910, 122], [1009, 140], [1105, 167],
    [1199, 204], [1287, 251], [1369, 309], [1435, 384]
  ];

  // ---------- Table du goûter : tracé irrégulier « nappe » ----------
  // len 3046 u, Rmin 62 u, tour IA ≈ 16.7 s
  var GOUTER_POINTS = [
    [1432, 481], [1378, 565], [1302, 633], [1219, 691], [1127, 734], [1029, 760],
    [928, 772], [826, 776], [724, 776], [623, 775], [521, 768], [421, 751], [327, 713],
    [261, 639], [264, 539], [284, 440], [274, 339], [314, 247], [393, 184], [484, 140],
    [580, 106], [679, 84], [780, 75], [881, 83], [979, 111], [1068, 160], [1147, 224],
    [1231, 281], [1321, 328], [1403, 388]
  ];

  // ---------- Potager en huit : vrai huit croisé (Lissajous) + pont de planches ----------
  // len 3331 u, Rmin 67 u, tour IA ≈ 17.6 s, croisement à 85° (droit d'abord passé)
  var POTAGER_POINTS = [
    [1188, 765], [1260, 702], [1298, 612], [1315, 515], [1318, 417], [1303, 321],
    [1260, 233], [1173, 195], [1080, 224], [998, 277], [922, 339], [849, 405],
    [777, 471], [705, 537], [630, 601], [550, 658], [462, 699], [367, 690], [308, 613],
    [286, 518], [282, 420], [294, 323], [323, 230], [381, 152], [474, 135], [560, 182],
    [632, 248], [697, 321], [759, 397], [819, 475], [880, 551], [944, 626], [1013, 696],
    [1093, 752]
  ];

  // ---------- Salle de bain : recto-verso arrondi ----------
  // len 3182 u, Rmin 152 u, tour IA ≈ 16.9 s
  var SDB_POINTS = [
    [1434, 467], [1421, 571], [1360, 657], [1268, 709], [1166, 736], [1061, 748],
    [955, 751], [849, 749], [742, 746], [636, 743], [531, 736], [426, 720], [325, 687],
    [238, 628], [184, 538], [166, 433], [179, 329], [240, 243], [332, 191], [434, 164],
    [539, 152], [645, 149], [751, 151], [858, 154], [964, 157], [1069, 164],
    [1174, 180], [1275, 213], [1362, 272], [1416, 362]
  ];

  // ---------- Banquise : vraie lemniscate / infini + pont de glace ----------
  // len 3308 u, Rmin 75 u, tour IA ≈ 17.7 s, croisement à 87°
  var BANQUISE_POINTS = [
    [1132, 724], [1226, 716], [1289, 643], [1318, 551], [1327, 454], [1319, 357],
    [1292, 263], [1233, 188], [1139, 174], [1051, 215], [975, 275], [904, 342],
    [836, 412], [769, 483], [702, 553], [631, 620], [555, 681], [468, 724], [374, 716],
    [311, 643], [282, 551], [273, 454], [281, 357], [308, 263], [367, 188], [461, 174],
    [549, 215], [625, 275], [696, 342], [764, 412], [831, 483], [898, 553], [969, 620],
    [1045, 681]
  ];

  // ---------- Nuit étoilée : fleur à quatre pétales ----------
  // len 3107 u, Rmin 62 u, tour IA ≈ 17.0 s
  var NUIT_POINTS = [
    [1434, 475], [1430, 573], [1348, 634], [1250, 669], [1150, 695], [1050, 723],
    [951, 754], [851, 782], [748, 797], [644, 794], [544, 770], [455, 718], [388, 638],
    [322, 559], [238, 498], [166, 425], [170, 327], [252, 266], [350, 231], [450, 205],
    [550, 177], [649, 146], [749, 118], [852, 103], [956, 106], [1056, 130],
    [1145, 182], [1212, 262], [1278, 341], [1362, 402]
  ];

  // ---------- Au-dessus des nuages : ovale ondulant ----------
  // len 3220 u, Rmin 66 u, tour IA ≈ 16.8 s
  var NUAGES_POINTS = [
    [1485, 478], [1431, 570], [1352, 642], [1263, 703], [1166, 747], [1061, 771],
    [954, 777], [847, 769], [741, 752], [635, 734], [529, 717], [424, 695], [323, 659],
    [237, 595], [180, 504], [141, 404], [155, 301], [235, 231], [335, 192], [440, 169],
    [546, 153], [653, 139], [760, 130], [867, 129], [973, 144], [1076, 176],
    [1173, 222], [1269, 270], [1365, 317], [1451, 381]
  ];

  function radialLoop(cx, cy, rx, ry, lobes, amp, phase, count) {
    var pts = [];
    for (var i = 0; i < count; i++) {
      var th = (i / count) * U.TAU;
      var f = 1 + amp * Math.sin(lobes * th + phase);
      pts.push([cx + rx * f * Math.cos(th), cy + ry * f * Math.sin(th)]);
    }
    return pts;
  }

  // thèmes : fond + motif, revêtement, bordure, pointillés, damier, eau, pont
  var THEMES = {
    prairie:  { fond: '#CFF3C8', motif: 'pois', pois: '#FFFFFF', piste: '#9B8CC9', bordure: '#F493BC',
      pointille: '#FFFFFF', aplat: '#B9E8B0', damier: ['#FFFFFF', '#3A3243'], ombre: 'rgba(109,76,125,.16)' },
    plage:    { fond: '#FBE9C7', motif: 'sable', pois: '#FFF3D6', piste: '#F7A8C4', bordure: '#FFFFFF',
      pointille: '#FFFFFF', aplat: '#F7D892', damier: ['#FFFFFF', '#FF8A6B'], ombre: 'rgba(150,100,60,.15)',
      mer: { x: 800, y: 1180, rx: 900, ry: 420 }, merEcum: '#FFFFFF', cadre: { bas: 250 } },
    gouter:   { fond: '#FFF2E6', motif: 'carreaux', carreau: '#FFCFE0', piste: '#C9A0DC', bordure: '#FFFFFF',
      pointille: '#FFF6E0', aplat: '#F8CBA8', damier: ['#FFFFFF', '#FF9E7D'], ombre: 'rgba(140,90,110,.15)' },
    potager:  { fond: '#CDE8A6', motif: 'sillons', sillon: '#BEDD94', piste: '#DEB87E', bordure: '#7EC97A',
      pointille: '#FFF6E0', aplat: '#BEDD94', damier: ['#FFFFFF', '#6FA84F'], ombre: 'rgba(90,110,60,.16)',
      pont: { tablier: '#C89A6B', planche: '#B4825A', rail: '#8C6140' } },
    sdb:      { fond: '#CFE9F4', motif: 'carrelage', joint: '#FFFFFF', piste: '#FCE38A', bordure: '#FFFFFF',
      pointille: '#FFF6C9', aplat: '#BBDDEF', damier: ['#FFFFFF', '#7FD8E8'], ombre: 'rgba(80,110,140,.15)',
      flaque: { x: 800, y: 470, rx: 170, ry: 92 } },
    banquise: { fond: '#EAF6FF', motif: 'flocons', pois: '#FFFFFF', piste: '#A2B9E7', bordure: '#FFFFFF',
      pointille: '#FFFFFF', aplat: '#DCEEFB', damier: ['#FFFFFF', '#FF6B7A'], ombre: 'rgba(90,110,160,.15)',
      pont: { tablier: '#9FB6D8', planche: '#8AA3CC', rail: '#FFFFFF' } },
    nuit:     { fond: '#2E2450', motif: 'etoiles', pois: '#FFF6C9', piste: '#B98CF5', bordure: '#F493BC',
      pointille: '#FCE38A', aplat: '#3B2F63', damier: ['#FFFFFF', '#B98CF5'], ombre: 'rgba(10,6,20,.35)',
      fonce: true, halo: 'rgba(255,241,196,.42)' },
    nuages:   { fond: '#DCEBFF', motif: 'ciel', pois: '#FFFFFF', piste: '#FFD8EC', bordure: '#FFFFFF',
      pointille: '#FFFFFF', aplat: '#CBE0FA', damier: ['#FFFFFF', '#9ADDF0'], ombre: 'rgba(110,120,170,.14)',
      pisteDegrade: ['#FFD8EC', '#FFE9C7', '#DFF7C9', '#C7F0E4', '#C9DBFF', '#E7D4FF'] }
  };

  // décors : type + fraction du tour + offset latéral (signe = côté de la normale) + rayon
  var DECOR_PRAIRIE = [
    { type: 'manege',      s: 0.13, off: -175, r: 52 },
    { type: 'ballons',     s: 0.24, off:  150, r: 26 },
    { type: 'moulin',      s: 0.37, off: -165, r: 44 },
    { type: 'bassin',      s: 0.47, off:  160, r: 42 },
    { type: 'fleur',       s: 0.55, off: -120, r: 16 },
    { type: 'fleur',       s: 0.58, off:  128, r: 14 },
    { type: 'fleur',       s: 0.70, off: -135, r: 18 },
    { type: 'picnic',      s: 0.66, off: -120, r: 34 },
    { type: 'stand',       s: 0.79, off:  120, r: 40 },
    { type: 'ballons',     s: 0.86, off:  155, r: 24 },
    { type: 'lapins',      s: 0.05, off: -135, r: 30 },
    { type: 'lapins',      s: 0.09, off:  130, r: 28 },
    { type: 'lapins',      s: 0.93, off:  140, r: 30 }
  ];

  // Plage : parasols qui tournent, châteaux de sable, crabe qui se déplace, goélands ronds
  var DECOR_PLAGE = [
    { type: 'parasol',     s: 0.06, off:  155, r: 34 },
    { type: 'crabes',      s: 0.11, off: -140, r: 26 },
    { type: 'chateausable', s: 0.19, off:  168, r: 44 },
    { type: 'coquillage',  s: 0.26, off:  120, r: 18 },
    { type: 'etoilemer',   s: 0.31, off:  138, r: 20 },
    { type: 'parasol',     s: 0.40, off: -158, r: 32 },
    { type: 'crabe',       s: 0.46, off:  146, r: 24 },
    { type: 'seau',        s: 0.53, off: -134, r: 24 },
    { type: 'goeland',     s: 0.60, off:  162, r: 28 },
    { type: 'chateausable', s: 0.68, off: -172, r: 40 },
    { type: 'ballons',     s: 0.75, off:  152, r: 26 },
    { type: 'etoilemer',   s: 0.81, off: -132, r: 18 },
    { type: 'coquillage',  s: 0.86, off:  130, r: 16 },
    { type: 'parasol',     s: 0.92, off: -155, r: 30 },
    { type: 'crabes',      s: 0.96, off: -120, r: 26 }
  ];

  // Goûter : tasses fumantes, théière, pancakes, bol de céréales, couverts, guêpes
  var DECOR_GOUTER = [
    { type: 'theiere',     s: 0.05, off: -165, r: 44 },
    { type: 'tasse',       s: 0.12, off:  148, r: 30 },
    { type: 'guepes',      s: 0.17, off: -135, r: 26 },
    { type: 'pancakes',    s: 0.25, off:  162, r: 38 },
    { type: 'cuillere',    s: 0.32, off: -128, r: 20 },
    { type: 'bol',         s: 0.40, off:  156, r: 36 },
    { type: 'tasse',       s: 0.48, off: -150, r: 28 },
    { type: 'fourchette',  s: 0.55, off:  132, r: 20 },
    { type: 'guepes',      s: 0.62, off: -140, r: 24 },
    { type: 'pancakes',    s: 0.70, off:  166, r: 34 },
    { type: 'theiere',     s: 0.78, off: -162, r: 40 },
    { type: 'tasse',       s: 0.85, off:  146, r: 26 },
    { type: 'miettes',     s: 0.91, off: -128, r: 22 },
    { type: 'bol',         s: 0.96, off:  152, r: 32 }
  ];

  // Potager : légumes qui poussent, épouvantail, cabanon, lapins, tournesols, jet d'eau
  var DECOR_POTAGER = [
    { type: 'cabanon',     s: 0.06, off:  175, r: 48 },
    { type: 'carotte',     s: 0.12, off: -128, r: 18 },
    { type: 'radis',       s: 0.16, off:  126, r: 16 },
    { type: 'lapins',      s: 0.22, off: -142, r: 28 },
    { type: 'tournesol',   s: 0.30, off: -152, r: 24 },
    { type: 'epouvantail', s: 0.42, off: -160, r: 40 },
    { type: 'salade',      s: 0.52, off:  130, r: 18 },
    { type: 'jet',         s: 0.62, off: -150, r: 30 },
    { type: 'lapins',      s: 0.72, off:  146, r: 28 },
    { type: 'carotte',     s: 0.78, off: -126, r: 16 },
    { type: 'tournesol',   s: 0.88, off: -192, r: 22 },
    { type: 'cabanon',     s: 0.90, off: -228, r: 44 },
    { type: 'radis',       s: 0.95, off:  128, r: 16 },
    { type: 'terrier',     s: 0.40, off: -120, r: 26 }
  ];

  // Salle de bains : baignoire qui se remplit, canard, douche, peignoir, miroir, bulles
  var DECOR_SDB = [
    { type: 'baignoire',   s: 0.08, off:  175, r: 52 },
    { type: 'peignoir',    s: 0.16, off: -150, r: 32 },
    { type: 'miroir',      s: 0.24, off:  158, r: 34 },
    { type: 'canards',     s: 0.30, off: -138, r: 26 },
    { type: 'douche',      s: 0.40, off:  162, r: 36 },
    { type: 'tapis',       s: 0.48, off: -134, r: 30 },
    { type: 'canard',      s: 0.56, off:  142, r: 22 },
    { type: 'baignoire',   s: 0.66, off: -176, r: 48 },
    { type: 'savon',       s: 0.73, off:  132, r: 20 },
    { type: 'miroir',      s: 0.80, off: -156, r: 32 },
    { type: 'canards',     s: 0.87, off:  140, r: 26 },
    { type: 'douche',      s: 0.94, off: -160, r: 34 },
    { type: 'tapis',       s: 0.21, off: -142, r: 28 }
  ];

  // Banquise : igloo, bonhomme de neige, deux bassins (phoque, ours), manchots pêcheurs
  var DECOR_BANQUISE = [
    { type: 'igloo',       s: 0.07, off:  168, r: 46 },
    { type: 'manchots',    s: 0.13, off: -145, r: 28 },
    { type: 'sapin',       s: 0.19, off:  148, r: 28 },
    { type: 'bonhomme',    s: 0.27, off: -155, r: 34 },
    { type: 'blocglace',   s: 0.33, off:  136, r: 24 },
    { type: 'pecheur',     xy: [1178, 552], r: 30 },
    { type: 'bassinphoque', xy: [1086, 468], r: 58 },
    { type: 'manchots',    s: 0.53, off:  146, r: 26 },
    { type: 'sapin',       s: 0.60, off: -150, r: 26 },
    { type: 'igloo',       s: 0.68, off:  170, r: 42 },
    { type: 'blocglace',   s: 0.75, off: -138, r: 22 },
    { type: 'bonhomme',    s: 0.82, off:  152, r: 30 },
    { type: 'pecheur',     xy: [412, 383], r: 28 },
    { type: 'bassinours',  xy: [492, 487], r: 58 },
    { type: 'manchots',    s: 0.96, off:  144, r: 26 }
  ];

  // Nuit : fleurs lumineuses, lucioles, lune, hibou, flaques, lampadaires, chat
  var DECOR_NUIT = [
    { type: 'lune',        s: 0.10, off:  190, r: 46 },
    { type: 'fleurlum',    s: 0.16, off: -135, r: 24 },
    { type: 'lampadaire',  s: 0.23, off:  152, r: 32 },
    { type: 'lucioles',    s: 0.29, off: -140, r: 26 },
    { type: 'hibou',       s: 0.37, off:  158, r: 30 },
    { type: 'flaque',      s: 0.44, off: -132, r: 26 },
    { type: 'fleurlum',    s: 0.52, off:  148, r: 22 },
    { type: 'chat',        s: 0.60, off: -146, r: 26 },
    { type: 'lampadaire',  s: 0.67, off:  154, r: 30 },
    { type: 'lucioles',    s: 0.74, off: -142, r: 24 },
    { type: 'fleurlum',    s: 0.81, off:  146, r: 22 },
    { type: 'hibou',       s: 0.87, off: -154, r: 28 },
    { type: 'flaque',      s: 0.93, off: -120, r: 24 }
  ];

  // Nuages : montgolfières, oiseaux en V, fort de nuages, éclairs, arc-en-ciel, cerf-volant
  var DECOR_NUAGES = [
    { type: 'montgolfiere', s: 0.07, off:  178, r: 46 },
    { type: 'arcenciel',   s: 0.14, off: -170, r: 48 },
    { type: 'oiseaux',     s: 0.20, off:  148, r: 26 },
    { type: 'nuagepluie',  s: 0.28, off: -162, r: 38 },
    { type: 'cerfvolant',  s: 0.35, off:  155, r: 30 },
    { type: 'chateaucartes', s: 0.44, off: -176, r: 46 },
    { type: 'eclair',      s: 0.52, off:  145, r: 24 },
    { type: 'montgolfiere', s: 0.61, off: -178, r: 42 },
    { type: 'oiseaux',     s: 0.68, off:  150, r: 24 },
    { type: 'arcenciel',   s: 0.76, off: -168, r: 44 },
    { type: 'cerfvolant',  s: 0.83, off:  152, r: 28 },
    { type: 'nuagepluie',  s: 0.90, off: -160, r: 34 },
    { type: 'eclair',      s: 0.95, off:  142, r: 22 }
  ];

  var DECOR_DEFAUT = [
    { type: 'ballons', s: 0.2, off: 150, r: 26 },
    { type: 'fleur',   s: 0.45, off: -130, r: 16 },
    { type: 'lapins',  s: 0.06, off: 135, r: 28 },
    { type: 'lapins',  s: 0.9, off: -140, r: 28 },
    { type: 'ballons', s: 0.72, off: -150, r: 24 }
  ];

  // ---------- définitions (ordre = ordre championnat) ----------
  var DEF = [
    { id: 'prairie', nom: 'Prairie des doudous', desc: 'Un ovale, un grand S, et des lapins qui encouragent.',
      points: PRAIRIE_POINTS, largeur: 96,
      decors: DECOR_PRAIRIE, spectateurs: true, bonbons: { min: 7, max: 10 }, grille: 'peigne' },
    { id: 'plage', nom: 'Plage aux coquillages', desc: 'Un haricot de côte, rose comme un bonbon.',
      points: PLAGE_POINTS, largeur: 100,
      decors: DECOR_PLAGE, spectateurs: true, bonbons: { min: 7, max: 10 }, grille: 'peigne' },
    { id: 'gouter', nom: 'La table du goûter', desc: 'Une nappe à carreaux et des tasses qui fument.',
      points: GOUTER_POINTS, largeur: 94,
      decors: DECOR_GOUTER, spectateurs: true, bonbons: { min: 7, max: 10 }, grille: 'peigne' },
    { id: 'potager', nom: 'Le potager en huit', desc: 'Un vrai huit croisé, pont de planches au milieu.',
      points: POTAGER_POINTS, largeur: 92, huit: true,
      decors: DECOR_POTAGER, spectateurs: true, bonbons: { min: 7, max: 10 }, grille: 'peigne' },
    { id: 'sdb', nom: 'La salle de bains', desc: 'Piste mousse jaune et canard en caoutchouc.',
      points: SDB_POINTS, largeur: 96,
      decors: DECOR_SDB, spectateurs: false, bonbons: { min: 6, max: 9 }, grille: 'peigne' },
    { id: 'banquise', nom: 'La banquise', desc: 'Un grand huit de glace, pont bleu sur le croisement.',
      points: BANQUISE_POINTS, largeur: 98, huit: true,
      decors: DECOR_BANQUISE, spectateurs: true, bonbons: { min: 7, max: 10 }, grille: 'peigne' },
    { id: 'nuit', nom: 'Nuit étoilée', desc: 'Fleurs lumineuses et lucioles en lacets.',
      points: NUIT_POINTS, largeur: 94,
      decors: DECOR_NUIT, spectateurs: false, bonbons: { min: 6, max: 9 }, grille: 'peigne' },
    { id: 'nuages', nom: 'Au-dessus des nuages', desc: 'Une piste arc-en-ciel suspendue dans le ciel.',
      points: NUAGES_POINTS, largeur: 96,
      decors: DECOR_NUAGES, spectateurs: true, bonbons: { min: 7, max: 10 }, grille: 'peigne' }
  ];

  // ---------- construction ----------
  var cache = {};

  // croixements en groupes : un seul pont par zone de croisement
  function detecterPonts(sp, def) {
    var distMini = (def.largeur || 96) * 1.7;
    var bruts = V.spline.croisements(sp, Math.max(30, (sp.n * 0.22) | 0), distMini);
    var groupes = [];
    for (var i = 0; i < bruts.length; i++) {
      var c = bruts[i], trouve = null;
      for (var g = 0; g < groupes.length; g++) {
        if (U.dist(groupes[g].x, groupes[g].y, c.x, c.y) < distMini * 1.4) { trouve = groupes[g]; break; }
      }
      if (trouve) { trouve.n++; }
      else groupes.push({ x: c.x, y: c.y, i: c.i, j: c.j, n: 1 });
    }
    var ponts = [];
    for (var g2 = 0; g2 < groupes.length; g2++) {
      var gp = groupes[g2];
      var a = V.spline.atIdx(sp, gp.i, {});   // branche passée en premier (la plus proche du départ)
      var b = V.spline.atIdx(sp, gp.j, {});
      ponts.push({
        x: gp.x, y: gp.y,
        sur: gp.i, sous: gp.j,               // indices des deux branches
        angle: Math.atan2(a.ty, a.tx),       // axe du tablier = branche du dessus
        angSous: Math.atan2(b.ty, b.tx)
      });
    }
    return ponts;
  }

  // ---------- zones d'accélération (AGRÉ-1) ----------
  // 2 zones par circuit : bandes turquoise à chevrons dans des portions peu courbées,
  // vers 18 % et 68 % du tour (loin de la grille). Mécanique = boost existant (PASSAGE_*).
  function construirePassages(sp) {
    var cibles = [0.18, 0.68];
    var demi = 13; // indices de chaque côté du centre (≈ 78 u → bande ~ 160 u)
    var zones = [];
    for (var c = 0; c < cibles.length; c++) {
      var base = Math.round(cibles[c] * sp.n);
      var best = base, bestC = Infinity;
      for (var d = -45; d <= 45; d++) {
        var i = ((base + d) % sp.n + sp.n) % sp.n;
        var cc = 0;
        for (var k = -demi; k <= demi; k++) {
          var j = ((i + k) % sp.n + sp.n) % sp.n;
          if (Math.abs(sp.curv[j]) > cc) cc = Math.abs(sp.curv[j]);
          if (cc >= bestC) break;
        }
        if (cc < bestC) { bestC = cc; best = i; }
      }
      zones.push({ centre: best, demi: demi });
    }
    return zones;
  }

  function build(indexOrId) {
    var key = typeof indexOrId === 'number' ? DEF[indexOrId].id : indexOrId;
    if (cache[key]) return cache[key];
    var def = null;
    for (var i = 0; i < DEF.length; i++) if (DEF[i].id === key) { def = DEF[i]; break; }
    if (!def) throw new Error('circuit inconnu: ' + key);

    var pts = def.points;
    if (!pts && def.placeholder) {
      pts = radialLoop(800, 450, def.placeholder.rx, def.placeholder.ry,
                       def.placeholder.lobes, def.placeholder.amp, def.placeholder.phase, 16);
    }

    var sp = V.spline.build(pts, { nom: def.id });
    var theme = THEMES[def.id] || THEMES.prairie;

    // instancier les décors le long de la piste (réservé, hors-champ léger ok)
    var rng = U.seeded(U.hashSeed(def.id));
    var out = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0, curv: 0, s: 0 };
    var decors = [];
    var src = def.decors || [];
    for (var d = 0; d < src.length; d++) {
      var t = src[d];
      V.spline.at(sp, t.s * sp.total, out);
      var jitter = (rng() - 0.5) * 26;
      var dx, dy;
      if (t.xy) { dx = t.xy[0]; dy = t.xy[1]; } // placement absolu (bassins des huit)
      else {
        dx = out.x + out.nx * (t.off + jitter);
        dy = out.y + out.ny * (t.off + jitter);
      }
      decors.push({
        type: t.type,
        x: dx, y: dy,
        r: t.r * (0.9 + rng() * 0.25),
        rot: Math.atan2(out.ty, out.tx),
        graine: rng()
      });
    }

    var track = {
      id: def.id, nom: def.nom, desc: def.desc,
      def: def, sp: sp, theme: theme,
      largeur: def.largeur, demi: def.largeur / 2,
      decors: decors,
      ponts: def.huit ? detecterPonts(sp, def) : [],
      passages: construirePassages(sp),
      index: DEF.indexOf(def)
    };
    cache[key] = track;
    return track;
  }

  // ---------- grille de départ en peigne ----------
  // slot 0 = première ligne ; alternance gauche/droite derrière la ligne (s=0)
  var _gs = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0, curv: 0, s: 0 };
  function grilleSlot(track, slot, out) {
    var rangee = slot >> 1;
    var cote = (slot % 2 === 0) ? -1 : 1;
    var s = track.sp.total - 26 - rangee * 34;
    V.spline.at(track.sp, s, _gs);
    var lat = cote * (track.demi * 0.52);
    out.x = _gs.x + _gs.nx * lat;
    out.y = _gs.y + _gs.ny * lat;
    out.heading = Math.atan2(_gs.ty, _gs.tx);
    out.sHint = ((s / track.sp.step) | 0) % track.sp.n;
    return out;
  }

  // ---------- bonbons (roulé à chaque course) ----------
  function rollBonbons(track, rng) {
    var min = track.def.bonbons.min, max = track.def.bonbons.max;
    var n = min + ((rng() * (max - min + 1)) | 0);
    var out = [];
    var tmp = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0, curv: 0, s: 0 };
    var depart = 0.06, arrivee = 0.94; // éviter la ligne de départ
    for (var i = 0; i < n; i++) {
      var f = depart + (i + rng() * 0.7) * (arrivee - depart) / n;
      f = Math.min(f, arrivee);
      V.spline.at(track.sp, f * track.sp.total, tmp);
      var lat = (rng() - 0.5) * track.demi * 0.9;
      out.push({ x: tmp.x + tmp.nx * lat, y: tmp.y + tmp.ny * lat, pris: false, idx: tmp.s / track.sp.step });
    }
    return out;
  }

  V.tracks = {
    DEF: DEF,
    THEMES: THEMES,
    lister: function () { return DEF; },
    build: build,
    grilleSlot: grilleSlot,
    rollBonbons: rollBonbons
  };
})(typeof window !== 'undefined' ? window : globalThis);
