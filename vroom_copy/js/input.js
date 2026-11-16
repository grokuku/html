/* ============================================================
   VROOMIIIES — input.js
   Clavier (P1 flèches / P2 WASD-ZQSD) + polling Gamepad API.
   Expose window.Input = { p1, p2, pollGamepads(), consumePause() }
   P1 : ↑↓←→ conduite, drift = Shift gauche ou X, Échap/Start = pause
   P2 : Z/S/Q/D (ou W/A/S/D), drift = C ou Shift droit
   La pause (Échap / Start) est câblée ici mais CONSOMMÉE au lot 3.
   ============================================================ */
'use strict';

const Input = (function () {
  const GAME_CODES = [
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyQ',
    'ShiftLeft', 'ShiftRight', 'KeyX', 'KeyC', 'Escape', 'Enter'
  ];

  function emptyPad() {
    return { up: false, down: false, left: false, right: false, drift: false, pause: false };
  }
  function emptyState() {
    return { p1: emptyPad(), p2: emptyPad() };
  }

  const keys = emptyState();   // état brut du clavier
  const pads = emptyState();   // état brut des manettes (réécrit à chaque poll)
  const state = emptyState();  // état exposé = clavier OU manette (fusion)
  let pauseQueued = false;     // front montant Échap/Start, consommé par le jeu
  let padStartPrev = false;    // état précédent du bouton Start (front montant)

  /* Fusion OR : la manette ne peut qu'AJOUTER un appui, jamais en retirer un.
     (state est réécrit à chaque événement clavier / pollGamepads) */
  function mergeInput() {
    for (const p of ['p1', 'p2']) {
      state[p].up = keys[p].up || pads[p].up;
      state[p].down = keys[p].down || pads[p].down;
      state[p].left = keys[p].left || pads[p].left;
      state[p].right = keys[p].right || pads[p].right;
      state[p].drift = keys[p].drift || pads[p].drift;
    }
  }

  const keyMap = {
    // Joueur 1 — flèches
    'ArrowUp':    ['p1', 'up'],
    'ArrowDown':  ['p1', 'down'],
    'ArrowLeft':  ['p1', 'left'],
    'ArrowRight': ['p1', 'right'],
    'ShiftLeft':  ['p1', 'drift'],
    'KeyX':       ['p1', 'drift'],
    // Joueur 2 — WASD / ZQSD (les deux layouts sont acceptés)
    'KeyW':       ['p2', 'up'],
    'KeyZ':       ['p2', 'up'],
    'KeyS':       ['p2', 'down'],
    'KeyA':       ['p2', 'left'],
    'KeyQ':       ['p2', 'left'],
    'KeyD':       ['p2', 'right'],
    'KeyC':       ['p2', 'drift'],
    'ShiftRight': ['p2', 'drift']
  };

  window.addEventListener('keydown', function (e) {
    if (GAME_CODES.indexOf(e.code) !== -1) e.preventDefault();
    if (e.code === 'Escape') { if (!e.repeat) pauseQueued = true; return; }
    const m = keyMap[e.code];
    if (m) { keys[m[0]][m[1]] = true; mergeInput(); }
  }, { passive: false });

  window.addEventListener('keyup', function (e) {
    if (GAME_CODES.indexOf(e.code) !== -1) e.preventDefault();
    const m = keyMap[e.code];
    if (m) { keys[m[0]][m[1]] = false; mergeInput(); }
  }, { passive: false });

  // Relâche tout si la fenêtre perd le focus (évite les touches "collées")
  window.addEventListener('blur', function () {
    const fresh = emptyState();
    keys.p1 = fresh.p1; keys.p2 = fresh.p2;
    const freshPads = emptyState();
    pads.p1 = freshPads.p1; pads.p2 = freshPads.p2;
    mergeInput();
  });

  /* Gamepad API (basique) : pad 0 → P1, pad 1 → P2.
     Axes : 0 = direction, boutons 12/13/14/15 = croix,
     7/0 = accélérer, 6/1 = freiner, 2 = drift, 9 = pause. */
  function clearPad(target) {
    target.up = target.down = target.left = target.right = target.drift = false;
  }

  function readPad(pad, target) {
    const ax = pad.axes && pad.axes.length ? pad.axes[0] : 0;
    const dead = 0.25;
    target.left  = ax < -dead || !!(pad.buttons[14] && pad.buttons[14].pressed);
    target.right = ax >  dead || !!(pad.buttons[15] && pad.buttons[15].pressed);
    target.up    = !!((pad.buttons[7] && pad.buttons[7].pressed) || (pad.buttons[0] && pad.buttons[0].pressed) || (pad.buttons[12] && pad.buttons[12].pressed));
    target.down  = !!((pad.buttons[6] && pad.buttons[6].pressed) || (pad.buttons[1] && pad.buttons[1].pressed) || (pad.buttons[13] && pad.buttons[13].pressed));
    target.drift = !!(pad.buttons[2] && pad.buttons[2].pressed);
  }

  function pollGamepads() {
    try {
      const padsRaw = navigator.getGamepads ? navigator.getGamepads() : [];
      // Les pads clavier restent prioritaires si aucune manette n'est branchée
      const p1pad = padsRaw[0] && padsRaw[0].connected ? padsRaw[0] : null;
      const p2pad = padsRaw[1] && padsRaw[1].connected ? padsRaw[1] : null;
      if (p1pad) readPad(p1pad, pads.p1); else clearPad(pads.p1);
      if (p2pad) readPad(p2pad, pads.p2); else clearPad(pads.p2);
      /* Start (bouton 9) : front montant uniquement (comme Échap) */
      const startNow = !!((p1pad && p1pad.buttons[9] && p1pad.buttons[9].pressed) ||
                          (p2pad && p2pad.buttons[9] && p2pad.buttons[9].pressed));
      if (startNow && !padStartPrev) pauseQueued = true;
      padStartPrev = startNow;
      mergeInput();
    } catch (e) { /* Gamepad API indisponible : on ignore */ }
  }

  return {
    p1: state.p1,
    p2: state.p2,
    pollGamepads: pollGamepads,
    /* true une seule fois par appui Échap/Start */
    consumePause: function () { const p = pauseQueued; pauseQueued = false; return p; },
    /* debug / tests */
    _reset: function () {
      const freshKeys = emptyState(), freshPads = emptyState();
      keys.p1 = freshKeys.p1; keys.p2 = freshKeys.p2;
      pads.p1 = freshPads.p1; pads.p2 = freshPads.p2;
      mergeInput();
      pauseQueued = false;
      padStartPrev = false;
    }
  };
})();
