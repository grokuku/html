/* Vroomiiies — boot + boucle principale rAF (pas fixe 1/60 accumulé, max 3 sous-pas). */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};
  var U = V.U;

  var PAS = 1 / 60;
  var MAX_SOUS_PAS = 3;
  var accum = 0;
  var dernierT = 0;
  var demarre = false;

  function afficherErreur(msg) {
    var bloc = root.document.getElementById('erreur-js');
    var detail = root.document.getElementById('erreur-detail');
    if (bloc) {
      bloc.hidden = false;
      if (detail) detail.textContent = String(msg).slice(0, 600);
    }
  }

  function boot() {
    if (demarre) return;
    demarre = true;

    root.onerror = function (msg, src, ligne) {
      afficherErreur(msg + (src ? ' (' + src.split('/').pop() + ':' + ligne + ')' : ''));
    };

    V.input.init();
    V.audio.init();
    V.render.init(root.document.getElementById('canvas-course'));
    V.menubg.init(root.document.getElementById('menu-canvas'));
    V.debug.init();
    V.ui.init();

    dernierT = U.now();
    root.requestAnimationFrame(boucle);
  }

  function boucle(ts) {
    root.requestAnimationFrame(boucle);
    var t = ts || U.now();
    var dt = (t - dernierT) / 1000;
    dernierT = t;
    if (dt > 0.25) dt = 0.25; // onglet en arrière-plan : on ne rattrape pas

    V.debug.majFps(dt);
    V.input.poll();

    var etat = V.race.state;
    var enCourse = (etat === 'compte' || etat === 'course' || etat === 'pause' || etat === 'finie');

    if (enCourse) {
      accum += dt;
      var sous = 0;
      while (accum >= PAS && sous < MAX_SOUS_PAS) {
        V.race.update(PAS);
        accum -= PAS;
        sous++;
      }
      if (accum > PAS * MAX_SOUS_PAS) accum = 0; // décrochage
      var tAnim = t / 1000;
      V.render.frame(V.race, tAnim);
      V.ui.majHud(dt);
    } else {
      accum = 0;
      if (V.menubg.actif) V.menubg.frame(dt, t / 1000);
    }
  }

  V.main = { boot: boot };

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
