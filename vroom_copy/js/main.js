/* ============================================================
   VROOMIIIES — main.js
   Boot : storage → audio (paresseux) → écrans → boucle de jeu.
   startRaceFlow(config) est le point d'entrée unique pour
   lancer une course (course libre / coupe / rejouer).
   ============================================================ */
'use strict';

(function () {
  const FIXED_DT = 1 / 60;
  let last = 0, acc = 0;

  function isRaceVisible() {
    const el = document.getElementById('screen-race');
    return el && el.classList.contains('active');
  }

  /* Point d'entrée unique : configure + lance la course, affiche l'écran course */
  function startRaceFlow(config) {
    Pause.hide();               // referme l'overlay si un restart part depuis la pause
    Engine.startRace(config);
    Hud.onRaceStart();
    Screens.show('race');
  }
  window.startRaceFlow = startRaceFlow;

  function frame(t) {
    requestAnimationFrame(frame);
    if (!last) last = t;
    let dt = (t - last) / 1000;
    last = t;
    if (dt > 0.1) dt = 0.1; // onglet en arrière-plan : on borne

    Pause.poll();

    if (!Engine.paused) {
      /* pas fixe pour la physique, rendu à chaque frame */
      acc += dt;
      let steps = 0;
      while (acc >= FIXED_DT && steps < 5) {
        if (Engine.state === 'countdown' || Engine.state === 'racing' || Engine.state === 'finished') {
          Engine.update(FIXED_DT);
        }
        acc -= FIXED_DT;
        steps++;
      }
      if (steps === 5) acc = 0;
    }

    if (Engine.track && isRaceVisible()) {
      Render.draw();
      Hud.update();
    }
  }

  function boot() {
    Storage.ensure();
    AudioSys.setEnabled(!!Storage.loadOptions().son);
    Hud.init();
    Results.init();
    MenuLibre.init();
    MenuCup.init();
    MenuTitle.init();
    Pause.init();
    Render.attach(document.getElementById('gameCanvas'));
    Screens.show('title');
    /* libère l'AudioContext au premier geste utilisateur */
    const unlock = function () {
      AudioSys.init();
      AudioSys.resume();
      AudioSys.onGesture();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    /* pause auto si l'onglet perd le focus en pleine course */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && isRaceVisible() && (Engine.state === 'racing' || Engine.state === 'countdown')) {
        Pause.show();
      }
    });
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
