/* Vroomiiies — debug : selftest (validation des tracés + simulation IA), compteur
   fps (F3). Aucune console.error au boot : tout passe par console.info. */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};
  var U = V.U;

  // simulation hors-écran d'un kart IA : valider spline + physics + ai ensemble
  function simuler(trackId, secondes) {
    var track = V.tracks.build(trackId);
    var k = V.physics.creerKart(track, 3, V.C.PERSONNAGES[0].id, false, -1);
    V.ai.preparer(k, V.C.DIFFICULTES[1], U.seeded(42));
    var inp = { gauche: false, droite: false, gas: false, frein: false };
    var pas = 1 / 60;
    var n = Math.round((secondes || 8) / pas);
    var distParcourue = 0;
    var lastX = k.x, lastY = k.y;
    for (var i = 0; i < n; i++) {
      inp.gauche = inp.droite = inp.gas = inp.frein = false;
      V.ai.piloter(k, track, [k], inp);
      V.physics.stepKart(k, inp, track, pas);
      var dx = k.x - lastX, dy = k.y - lastY;
      if (!isFinite(k.x) || !isFinite(k.y) || !isFinite(k.heading) || !isFinite(k.speed)) {
        return { ok: false, raison: 'NaN au pas ' + i };
      }
      distParcourue += Math.sqrt(dx * dx + dy * dy);
      lastX = k.x; lastY = k.y;
      if (k.off > 0.985) return { ok: false, raison: 'kart sorti définitivement de piste (' + trackId + ')' };
    }
    return { ok: true, dist: distParcourue };
  }

  function selftest(rapportLog) {
    var l = [];
    var nbErr = 0;
    var defs = V.tracks.lister();
    for (var i = 0; i < defs.length; i++) {
      var tr = V.tracks.build(defs[i].id);
      var sp = tr.sp;
      var erreurs = [];
      if (!isFinite(sp.total) || sp.total < 1500 || sp.total > 4200) erreurs.push('longueur ' + Math.round(sp.total));
      if (sp.courbureMax > 0.03) erreurs.push('courbure max ' + sp.courbureMax.toFixed(4));
      if (sp.warnings.length) erreurs.push(sp.warnings.join(' / '));
      // cohérence at() / nearest en fenêtre locale (le piège du huit)
      var o = {};
      var sTest = sp.total * 0.37;
      V.spline.at(sp, sTest, o);
      var idxAttendu = Math.round(sTest / sp.step) % sp.n;
      var idxTrouve = V.spline.nearest(sp, o.x, o.y, idxAttendu);
      if (idxTrouve !== idxAttendu) erreurs.push('nearest local ≠ attendu (' + idxTrouve + ' vs ' + idxAttendu + ')');
      var idxGlobal = V.spline.nearest(sp, o.x, o.y, -1);
      if (Math.abs(idxGlobal - idxAttendu) > 2) erreurs.push('nearest global loin (' + idxGlobal + ')');
      // simulation IA
      var sim = simuler(defs[i].id, 6);
      if (!sim.ok) erreurs.push('sim: ' + sim.raison);
      else if (sim.dist < 800) erreurs.push('sim: distance faible ' + Math.round(sim.dist));
      if (erreurs.length) nbErr++;
      l.push((erreurs.length ? '✗' : '✓') + ' ' + defs[i].id.padEnd(9) +
        ' len=' + Math.round(sp.total) + ' courb=' + sp.courbureMax.toFixed(4) +
        (erreurs.length ? ' — ' + erreurs.join('; ') : ''));
    }
    var txt = 'SELFTEST VROOMIIIES — ' + defs.length + ' circuits, ' + nbErr + ' souci(s)';
    if (rapportLog !== false && root.console) {
      root.console.info('%c' + txt, 'font-weight:bold');
      root.console.info(l.join('\n'));
    }
    return { txt: txt, lignes: l, nbErr: nbErr };
  }

  // ---------- fps ----------
  var fpsOn = false, fpsAccum = 0, fpsFrames = 0, fpsEl = null;
  function keydown(e) {
    if (e.code === 'F3' && fpsEl) {
      e.preventDefault();
      fpsOn = !fpsOn;
      fpsEl.hidden = !fpsOn;
    }
  }
  function majFps(dt) {
    if (!fpsEl || !fpsOn) return;
    fpsAccum += dt; fpsFrames++;
    if (fpsAccum >= 0.5) {
      fpsEl.textContent = Math.round(fpsFrames / fpsAccum) + ' fps';
      fpsAccum = 0; fpsFrames = 0;
    }
  }

  function init() {
    fpsEl = root.document.getElementById('fps');
    root.addEventListener('keydown', keydown);
    root.vroomiiesSelftest = function () { return selftest(true); };
  }

  V.debug = { init: init, selftest: selftest, majFps: majFps, simuler: simuler };
})(typeof window !== 'undefined' ? window : globalThis);
