/* ============================================================
   VROOMIIIES — menu-libre.js
   Menu « Course libre » :
   - persos (1 ou 2 joueurs) avec avatars, flèches, description
   - sélecteurs Joueurs / Karts / Tours + onglets de difficulté
   - grille 4×2 de circuits (vignette canvas + record local)
   - options persistées dans vroomiiies.options à chaque changement
   ============================================================ */
'use strict';

const MenuLibre = (function () {
  let opts = null;

  function persist() { Storage.saveOptions(opts); }

  function refreshPlayers() {
    MenuKit.renderPlayerColumn('libreP1', opts, 'persoP1');
    MenuKit.renderPlayerColumn('libreP2', opts, 'persoP2');
    const two = opts.joueurs === 2;
    document.getElementById('libreP2Col').classList.toggle('hidden', !two);
    document.getElementById('libreVs').classList.toggle('hidden', !two);
  }

  function refreshRecords() {
    const records = Storage.loadRecords();
    const cards = document.querySelectorAll('#circuitGrid .circuit-card');
    for (const card of cards) {
      const rec = records[card.dataset.id];
      const line = card.querySelector('.circuit-record');
      if (line) line.textContent = 'Record : ' + (rec && rec.best != null ? fmtTime(rec.best) : '—');
    }
  }

  function renderGrid() {
    const grid = document.getElementById('circuitGrid');
    grid.innerHTML = '';
    for (const id of CIRCUIT_IDS) {
      const def = TRACKS[id];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'circuit-card' + (opts.circuit === id ? ' selected' : '');
      card.dataset.id = id;
      card.setAttribute('aria-pressed', opts.circuit === id ? 'true' : 'false');
      card.innerHTML =
        '<canvas class="circuit-thumb" width="300" height="190" aria-hidden="true"></canvas>' +
        '<span class="circuit-name">' + escapeHtml(def.name) + '</span>' +
        '<span class="circuit-record">Record : …</span>' +
        '<span class="circuit-check" aria-hidden="true">✓</span>';
      renderTrackThumbnail(def, card.querySelector('canvas'), 300, 190);
      card.addEventListener('click', function () {
        opts.circuit = id;
        persist();
        AudioSys.sfx.click();
        const all = grid.querySelectorAll('.circuit-card');
        for (const c of all) {
          const sel = c.dataset.id === id;
          c.classList.toggle('selected', sel);
          c.setAttribute('aria-pressed', sel ? 'true' : 'false');
        }
      });
      grid.appendChild(card);
    }
    refreshRecords();
  }

  function wire() {
    /* flèches de perso */
    const bindArrow = function (id, key, dir) {
      document.getElementById(id).addEventListener('click', function () {
        MenuKit.cycleChar(opts, key, dir);
        persist();
        AudioSys.sfx.click();
        MenuKit.renderPlayerColumn(key === 'persoP1' ? 'libreP1' : 'libreP2', opts, key);
      });
    };
    bindArrow('libreP1Prev', 'persoP1', -1);
    bindArrow('libreP1Next', 'persoP1', 1);
    bindArrow('libreP2Prev', 'persoP2', -1);
    bindArrow('libreP2Next', 'persoP2', 1);

    /* sélecteurs */
    MenuKit.wireStepper('libreJoueurs', MenuKit.VALUES.joueurs,
      function () { return opts.joueurs; },
      function (v) { opts.joueurs = v; persist(); refreshPlayers(); },
      MenuKit.FORMAT.joueurs, null);
    MenuKit.wireStepper('libreKarts', MenuKit.VALUES.karts,
      function () { return opts.karts; },
      function (v) { opts.karts = v; persist(); },
      MenuKit.FORMAT.karts, null);
    MenuKit.wireStepper('libreTours', MenuKit.VALUES.tours,
      function () { return opts.tours; },
      function (v) { opts.tours = v; persist(); },
      MenuKit.FORMAT.tours, null);
    MenuKit.wireDifficulty('libreDiff',
      function () { return opts.difficulte; },
      function (v) { opts.difficulte = v; persist(); }, null);

    document.getElementById('btnLibreBack').addEventListener('click', function () {
      AudioSys.sfx.click();
      Screens.show('title');
    });
    document.getElementById('btnLibreStart').addEventListener('click', function () {
      AudioSys.sfx.click();
      startRace();
    });
  }

  function startRace() {
    window.startRaceFlow({
      circuitId: opts.circuit,
      tours: opts.tours,
      karts: opts.karts,
      difficulte: opts.difficulte,
      joueurs: opts.joueurs,
      persoP1: opts.persoP1,
      persoP2: opts.persoP2
    });
  }

  function open() {
    if (typeof MenuCup !== 'undefined' && MenuCup.abort) MenuCup.abort();  // une coupe en cours est abandonnée
    opts = Storage.loadOptions();
    /* rafraîchit les contrôles avec les valeurs persistées */
    refreshPlayers();
    /* rafraîchit les contrôles avec les valeurs persistées */
    document.querySelector('#libreJoueurs .step-value').textContent = MenuKit.FORMAT.joueurs(opts.joueurs);
    document.querySelector('#libreKarts .step-value').textContent = MenuKit.FORMAT.karts(opts.karts);
    document.querySelector('#libreTours .step-value').textContent = MenuKit.FORMAT.tours(opts.tours);
    const tabs = document.querySelectorAll('#libreDiff .diff-tab');
    for (const t of tabs) t.classList.toggle('active', t.dataset.diff === opts.difficulte);
    renderGrid();
    Screens.show('libre');
  }

  function init() {
    opts = Storage.loadOptions();
    wire();
  }

  return { init: init, open: open };
})();
