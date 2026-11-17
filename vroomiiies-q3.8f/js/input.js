/* Vroomiiies — entrées : flèches (joueur 1), ZQSD/WASD (joueur 2), manettes basiques.
   Actions : 'pause' (Échap en course / Start manette), 'confirm' (Entrée/Espace/A),
   'back' (Échap hors course / B). */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};

  var MAX_JOUEURS = 2;
  var keysE = [], padE = [], etats = [];
  for (var i = 0; i < MAX_JOUEURS; i++) {
    keysE.push({ gauche: false, droite: false, gas: false, frein: false });
    padE.push({ gauche: false, droite: false, gas: false, frein: false });
    etats.push({ gauche: false, droite: false, gas: false, frein: false });
  }

  var actionsCbs = [];
  var touches = {}; // état brut des touches

  // mapping touche -> [joueur, champ]
  var MAP = {
    ArrowLeft: [0, 'gauche'], ArrowRight: [0, 'droite'], ArrowUp: [0, 'gas'], ArrowDown: [0, 'frein'],
    KeyZ: [1, 'gas'], KeyS: [1, 'frein'], KeyQ: [1, 'gauche'], KeyD: [1, 'droite'],
    KeyW: [1, 'gas'] // WASD à côté de ZQSD
  };
  var BLOQUEES = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, Space: 1 };

  function keydown(e) {
    if (e.repeat) return;
    if (BLOQUEES[e.code] && e.preventDefault) e.preventDefault();
    touches[e.code] = true;
    var m = MAP[e.code];
    if (m && keysE[m[0]]) keysE[m[0]][m[1]] = true;
    if (e.code === 'Escape') emettre('back');
    if (e.code === 'Enter' || e.code === 'Space') emettre('confirm');
  }
  function keyup(e) {
    touches[e.code] = false;
    var m = MAP[e.code];
    if (!m || !etats[m[0]]) return;
    // lâcher seulement si aucune touche du même champ n'est tenue (ZQSD + WASD)
    var champ = m[1];
    var toujours = false;
    for (var code in MAP) {
      if (MAP[code][0] === m[0] && MAP[code][1] === champ && touches[code]) { toujours = true; break; }
    }
    if (!toujours) keysE[m[0]][champ] = false;
  }

  // ---------- manettes ----------
  var padsPrev = [{}, {}];
  var pads = [null, null];

  function pollManettes() {
    if (!root.navigator || !root.navigator.getGamepads) return;
    var list;
    try { list = root.navigator.getGamepads(); } catch (e) { return; }
    if (!list) return;
    var pi = 0, idx = 0;
    for (idx = 0; idx < list.length && pi < MAX_JOUEURS; idx++) {
      var gp = list[idx];
      if (!gp) continue;
      var joueur = pi;
      pads[joueur] = gp;
      var prev = padsPrev[joueur];
      var b = gp.buttons;
      function pressed(n) { return b[n] && b[n].pressed; }
      function edge(n) {
        var p = pressed(n), a = !!prev[n];
        prev[n] = p;
        return p && !a;
      }
      var pf = padE[joueur];
      var ax = gp.axes && gp.axes.length ? gp.axes[0] : 0;
      pf.gauche = ax < -0.35 || pressed(14);
      pf.droite = ax > 0.35 || pressed(15);
      pf.gas = pressed(12) || pressed(7) || pressed(5);
      pf.frein = pressed(13) || pressed(6) || pressed(4);
      if (edge(9)) emettre('pause');       // Start -> pause
      if (edge(0)) emettre('confirm');     // A
      if (edge(1)) emettre('back');        // B
      pi++;
    }
  }

  function emettre(a) {
    for (var i = 0; i < actionsCbs.length; i++) actionsCbs[i](a);
  }

  function init() {
    root.addEventListener('keydown', keydown);
    root.addEventListener('keyup', keyup);
    // MINEUR-6 : alt+tab / changement d'onglet => toutes les touches sont supposées
    // lâchées (sinon le gaz reste enfoncé sans que personne ne le tienne).
    root.addEventListener('blur', relacherTouche);
    root.document.addEventListener('visibilitychange', function () {
      if (root.document.hidden) relacherTouche();
    });
  }

  function relacherTouche() {
    for (var code in touches) touches[code] = false;
    V.input.reset();
  }

  // appelé une fois par frame par main (avant la physique)
  function poll() {
    pollManettes();
    for (var j = 0; j < MAX_JOUEURS; j++) {
      var e = etats[j], k = keysE[j], p = padE[j];
      e.gauche = k.gauche || p.gauche;
      e.droite = k.droite || p.droite;
      e.gas = k.gas || p.gas;
      e.frein = k.frein || p.frein;
    }
  }

  V.input = {
    init: init,
    poll: poll,
    etat: function (joueur) { return etats[joueur] || etats[0]; },
    reset: function () {
      for (var j = 0; j < MAX_JOUEURS; j++) {
        var sets = [keysE[j], padE[j], etats[j]];
        for (var s = 0; s < 3; s++) sets[s].gauche = sets[s].droite = sets[s].gas = sets[s].frein = false;
      }
    },
    onAction: function (cb) { actionsCbs.push(cb); },
    lireManette0: function () { return pads[0]; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
