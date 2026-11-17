/* Vroomiiies — configuration : personnages, difficultés, règles, physique */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};
  var U = V.U;

  // ---------- personnages (6) ----------
  // stats : vmax u/s, accel u/s², grip (modulation du braquage/adhérence)
  var PERSONNAGES = [
    { id: 'mimi',   nom: 'Mimi',   desc: 'Équilibrée, à l’aise partout.',
      oreilles: 'lapin',
      stats: { vmax: 300, accel: 240, grip: 1.00 },
      couleurs: { corps: '#FF9EC9', contour: '#6D4C7D', toit: '#FFFFFF', accent: '#F493BC', visage: '#FFF3F8' } },
    { id: 'pop',    nom: 'Pop',    desc: 'Fonceuse, un peu survireuse.',
      oreilles: 'chat',
      stats: { vmax: 316, accel: 228, grip: 0.94 },
      couleurs: { corps: '#A2B9E7', contour: '#6D4C7D', toit: '#DCE8FF', accent: '#6E8BD8', visage: '#F2F6FF' } },
    { id: 'doudou', nom: 'Doudou', desc: 'Tendre bourrure, freine fort.',
      oreilles: 'ours',
      stats: { vmax: 288, accel: 252, grip: 1.06 },
      couleurs: { corps: '#E8C39E', contour: '#6D4C7D', toit: '#FBE8D3', accent: '#C89A6B', visage: '#FFF4E6' } },
    { id: 'sucre',  nom: 'Sucre',  desc: 'Délicate, collée à la route.',
      oreilles: 'capme',
      stats: { vmax: 296, accel: 238, grip: 1.03 },
      couleurs: { corps: '#CFF3C8', contour: '#6D4C7D', toit: '#FFFFFF', accent: '#7EC97A', visage: '#F4FFF2' } },
    { id: 'cocon',  nom: 'Cocon',  desc: 'Patiente, motrice en sortie.',
      oreilles: 'ours',
      stats: { vmax: 284, accel: 262, grip: 1.10 },
      couleurs: { corps: '#C9B6E4', contour: '#6D4C7D', toit: '#EFE6FA', accent: '#9A7CC8', visage: '#F7F2FF' } },
    { id: 'etoile', nom: 'Étoile', desc: 'Étoile filante en ligne droite.',
      oreilles: 'antenne',
      stats: { vmax: 322, accel: 220, grip: 0.92 },
      couleurs: { corps: '#FCE38A', contour: '#6D4C7D', toit: '#FFF3C4', accent: '#FFB627', visage: '#FFFBEA' } }
  ];

  // ---------- difficultés ----------
  var DIFFICULTES = [
    // AGRÉ-3 : Facile relevé (0,78 → 0,84) ; l'IA plafonne désormais à son propre vmax
    // (voir ai.js), donc Expert reste battable à la régularité — le facteur agit sur
    // vmax (×facteur), plus jamais sur une vitesse absolue.
    { id: 'facile', nom: 'Facile', desc: 'Douce, idéale pour débuter.',      facteur: 0.84, lookahead: 46 },
    { id: 'normal', nom: 'Normal', desc: 'Équilibrée, à l’aise partout.',    facteur: 0.92, lookahead: 58 },
    { id: 'expert', nom: 'Expert', desc: 'Rapide, ne lâche rien en piste.',  facteur: 1.00, lookahead: 72 }
  ];

  // ---------- règles de course ----------
  // points par place (index 0 = 1er), prolongé de 1 pour les au-delà
  var POINTS = [25, 20, 17, 15, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  function pointsPour(rang) { return rang <= POINTS.length ? POINTS[rang - 1] : 1; }

  var KART_COUNTS = [4, 6, 10, 15, 20, 25, 30, 40];
  var KART_DEFAUT = KART_COUNTS.indexOf(30);
  var TOUR_COUNTS = [1, 2, 3, 5, 8];
  var TOUR_DEFAUT = TOUR_COUNTS.indexOf(3);
  var REGLE_PROGRESSION = 7; // championnat : finir 7e ou mieux pour passer au circuit suivant

  // ---------- physique arcade (scalaire) ----------
  var PHYSIQUE = {
    PAS: 1 / 60,
    R_KART: 14,               // rayon de collision / kart (unités monde)
    FREIN: 430,
    TRAINER: 150,             // décélération naturelle
    VIRAGE: 3.2,              // rad/s de braquage max (× grip)
    HORS_VMAX: 0.55,          // facteur de vmax hors piste
    HORS_TRAINE: 260,         // traînée supplémentaire hors piste
    HORS_BRAQUAGE: 1.6,       // coup de pouce de braquage hors piste (retour rapide)
    PASSAGE_V: 55,            // mini-boost bonbon (u/s ajouté)
    PASSAGE_DUREE: 1.15,      // s de sur-vitesse après bonbon
    PASSAGE_FACTEUR: 1.22,    // facteur de vmax pendant le boost
    ANGLE_COLISION: Math.cos(55 * Math.PI / 180) // sous cette valeur => pont, on se traverse
  };

  // ---------- réglages persistés ----------
  var SETTINGS_KEY = 'reglages';
  var defautsReglages = function () {
    return { diff: 1, karts: KART_DEFAUT, tours: TOUR_DEFAUT, perso: 0, perso2: 2, deuxJoueurs: false, track: 0 };
  };
  var reglages = null;
  function chargerReglages() {
    if (reglages) return reglages;
    var s = V.store.get(SETTINGS_KEY, null);
    var d = defautsReglages();
    if (s && typeof s === 'object') {
      if (typeof s.diff === 'number') d.diff = U.clamp(s.diff | 0, 0, DIFFICULTES.length - 1);
      if (typeof s.karts === 'number') d.karts = U.clamp(s.karts | 0, 0, KART_COUNTS.length - 1);
      if (typeof s.tours === 'number') d.tours = U.clamp(s.tours | 0, 0, TOUR_COUNTS.length - 1);
      if (typeof s.perso === 'number') d.perso = U.clamp(s.perso | 0, 0, PERSONNAGES.length - 1);
      if (typeof s.perso2 === 'number') d.perso2 = U.clamp(s.perso2 | 0, 0, PERSONNAGES.length - 1);
      if (typeof s.deuxJoueurs === 'boolean') d.deuxJoueurs = s.deuxJoueurs;
      if (typeof s.track === 'number') d.track = U.clamp(s.track | 0, 0, 7);
    }
    reglages = d;
    return reglages;
  }
  function sauverReglages() {
    if (reglages) V.store.set(SETTINGS_KEY, reglages);
  }

  V.C = {
    PERSONNAGES: PERSONNAGES,
    DIFFICULTES: DIFFICULTES,
    POINTS: POINTS,
    pointsPour: pointsPour,
    KART_COUNTS: KART_COUNTS,
    KART_DEFAUT: KART_DEFAUT,
    TOUR_COUNTS: TOUR_COUNTS,
    TOUR_DEFAUT: TOUR_DEFAUT,
    REGLE_PROGRESSION: REGLE_PROGRESSION,
    PHYSIQUE: PHYSIQUE,
    reglages: chargerReglages,
    sauverReglages: sauverReglages,
    defautsReglages: defautsReglages,
    MONDE: { L: 1600, H: 900 }
  };
})(typeof window !== 'undefined' ? window : globalThis);
