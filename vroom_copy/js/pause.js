/* ============================================================
   VROOMIIIES — pause.js
   Pause Échap / Start : overlay par-dessus la course.
   La simulation est figée (Engine.paused), le rendu dernier frame
   reste visible sous un voile sombre.
   Reprendre   → rend la main à la course
   Recommencer → relance la course avec la même configuration
   Quitter     → retour titre (aucun record enregistré)
   ============================================================ */
'use strict';

const Pause = (function () {
  let overlay = null;

  function isRaceActive() {
    const race = document.getElementById('screen-race');
    return race && race.classList.contains('active') &&
      (Engine.state === 'countdown' || Engine.state === 'racing');
  }

  function isPaused() { return !!Engine.paused; }

  function show() {
    if (!isRaceActive()) return;
    Engine.paused = true;
    AudioSys.engineStop();   // silence propre pendant la pause
    AudioSys.stopMusic();
    const def = Engine.config && TRACKS[Engine.config.circuitId];
    const sub = document.getElementById('pauseCircuit');
    if (sub) sub.textContent = def ? def.name : '';
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
  }

  /* Aucun audio ici : la reprise audio est gérée par resume() (revue I5/M8). */
  function hide() {
    Engine.paused = false;
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
  }

  /* Reprise après pause : relance moteur/musique UNIQUEMENT si la course est
     en cours (jamais après "Recommencer" ni "Quitter"). */
  function resume() {
    hide();
    if (Engine.state === 'racing') {
      AudioSys.engineStart();
      AudioSys.startMusic('race');
    }
  }

  function toggle() {
    if (isPaused()) resume(); else show();
  }

  function restart() {
    hide();
    if (Engine.config) {
      const cfg = Engine.config;
      window.startRaceFlow({
        circuitId: cfg.circuitId, tours: cfg.tours, karts: cfg.karts,
        difficulte: cfg.difficulte, joueurs: cfg.joueurs,
        persoP1: cfg.persoP1, persoP2: cfg.persoP2
      });
    }
  }

  function quit() {
    Engine.stopRace();          // state='idle' + engineStop déjà fait dedans
    Engine.paused = false;
    if (typeof MenuCup !== 'undefined' && MenuCup.abort) MenuCup.abort();  // coupe abandonnée = perdue
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
    Screens.show('title');
  }

  function init() {
    overlay = document.getElementById('pauseOverlay');
    document.getElementById('btnResume').addEventListener('click', function () {
      AudioSys.sfx.click(); resume();
    });
    document.getElementById('btnRestart').addEventListener('click', function () {
      AudioSys.sfx.click(); restart();
    });
    document.getElementById('btnQuitRace').addEventListener('click', function () {
      AudioSys.sfx.click(); quit();
    });
    /* l'écoute de la touche Échap passe par Input.consumePause() (poll()) */
  }

  /* Appelée à chaque frame par main.js : consomme l'appui Échap/Start */
  function poll() {
    if (!Input.consumePause()) return;
    if (isRaceActive() || isPaused()) { toggle(); return; }
    /* Hors course : Échap = retour au niveau supérieur (avec purge de la coupe) */
    const active = document.querySelector('.screen.active');
    if (!active) return;
    const id = active.id;
    if (id === 'screen-libre' || id === 'screen-cup' || id === 'screen-results') {
      if (typeof MenuCup !== 'undefined' && MenuCup.abort) MenuCup.abort();
      AudioSys.sfx.click();
      Screens.show('title');
    }
  }

  return { init: init, poll: poll, show: show, hide: hide, isPaused: isPaused };
})();
