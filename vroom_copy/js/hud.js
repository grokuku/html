/* ============================================================
   VROOMIIIES — hud.js
   HUD complet (lot 3) :
   - joueur(s) : avatar rond + « Nᵉ » grand + « / total » + « ★ N pts »
     (P1 haut-gauche, P2 haut-droite en split-screen)
   - centre haut : tour « n / N » + chrono (P1 fait foi)
   - bas-centre : « Échap ou Start : pause »
   Les avatars sont dessinés au lancement de la course (onRaceStart).
   ============================================================ */
'use strict';

const Hud = (function () {
  let elP1, elP2, elLap, elTime, elCountdown;
  let two = false;

  function $(id) { return document.getElementById(id); }

  function init() {
    elP1 = $('hudP1'); elP2 = $('hudP2');
    elLap = $('hudLap'); elTime = $('hudTime');
    elCountdown = $('countdown');
  }

  function drawHead(canvasId, charId) {
    const c = $(canvasId);
    if (c && typeof drawAvatar === 'function') drawAvatar(c, charId, 96, { disc: true });
  }

  /* À appeler juste après Engine.startRace() */
  function onRaceStart() {
    if (!elP1) init();
    const karts = Engine.karts;
    two = Engine.config && Engine.config.joueurs === 2 && karts[1] && karts[1].isPlayer;
    const total = karts.length;

    const p1 = karts[0];
    $('hudName1').textContent = p1.name;
    $('hudOf1').textContent = '/ ' + total;
    drawHead('hudAvatar1', p1.charId);

    document.getElementById('hud').classList.toggle('two-players', !!two);
    if (two) {
      const p2 = karts[1];
      $('hudName2').textContent = p2.name;
      $('hudOf2').textContent = '/ ' + total;
      drawHead('hudAvatar2', p2.charId);
    }
  }

  function playerBlock(prefix, kart) {
    $(prefix + 'Pos').textContent = ordinalFR(kart.position || 1);
    $(prefix + 'Score').textContent = String(kart.score || 0);
  }

  function update() {
    if (!elP1) init();
    const karts = Engine.karts;
    if (!karts || !karts.length) return;
    const p1 = karts[0];
    playerBlock('hudP1', p1);
    if (two && karts[1]) playerBlock('hudP2', karts[1]);

    const lap = Math.min(Math.max(p1.lap, 1), Engine.tours);
    elLap.textContent = lap + ' / ' + Engine.tours;
    elTime.textContent = fmtTime(Engine.raceTime);

    if (Engine.state === 'countdown') {
      const c = Math.min(3, Math.ceil(Engine.countdownT));
      elCountdown.textContent = c >= 1 ? String(c) : '';
      elCountdown.classList.add('visible');
      elCountdown.classList.remove('go');
    } else if (Engine.goFlash > 0) {
      elCountdown.textContent = 'GO !';
      elCountdown.classList.add('visible', 'go');
    } else {
      elCountdown.textContent = '';
      elCountdown.classList.remove('visible', 'go');
    }
  }

  return { init: init, update: update, onRaceStart: onRaceStart };
})();
