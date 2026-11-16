/* ============================================================
   VROOMIIIES — screens.js
   Gestionnaire d'écrans : un seul .screen visible à la fois.
   Écrans : title | libre | cup | race | results.
   Branche aussi la musique de fond selon l'écran affiché.
   ============================================================ */
'use strict';

const Screens = {
  show: function (name) {
    /* Toute navigation vers le titre ou la course libre abandonne la coupe
       (une coupe abandonnée est perdue). Couvre tous les chemins, pas seulement
       les boutons explicitement câblés. */
    if ((name === 'title' || name === 'libre') && typeof MenuCup !== 'undefined' && MenuCup.abort) {
      MenuCup.abort();
    }
    const screens = document.querySelectorAll('.screen');
    for (let i = 0; i < screens.length; i++) {
      screens[i].classList.toggle('active', screens[i].id === 'screen-' + name);
    }
    if (name === 'race' && typeof Render !== 'undefined') Render.resize();
    /* musique de fond selon l'écran (coupe silencieusement si non initialisée) */
    if (typeof AudioSys !== 'undefined') {
      if (name === 'title' || name === 'libre' || name === 'cup') {
        AudioSys.startMusic('menu');
        if (name === 'title') AudioSys.jingleTitle();
      } else if (name === 'results') {
        AudioSys.stopMusic();
      }
      /* 'race' : la musique démarre au GO (engine.js) */
    }
    window.scrollTo(0, 0);
  }
};
