/* ============================================================
   VROOMIIIES — menu-cup.js
   Championnat (Coupe) : 4 courses tirées au sort parmi les 8.
   Points par course : 15 / 12 / 10 / 9 / 8 / 7 / 6 / 5 / 4 / 3 / 2 / 1.
   Flux : menu Coupe → course 1..4 → classement intermédiaire →
   podium final + confetti. Les records par circuit sont écrits
   comme en course libre. État gardé en mémoire (abandon = coupe perdue).
   ============================================================ */
'use strict';

const MenuCup = (function () {
  const POINTS = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const VIEWS = ['cupViewSetup', 'cupViewStandings', 'cupViewFinal'];

  let opts = null;
  let cup = null;           // { circuits:[4], index, totals:{clé:pts}, lastLeg:{clé:pts}, meta:{clé:{name,color,isPlayer,charId,playerIndex}} }
  let confettiOn = false;
  let confettiRaf = null;
  let continueHandled = false; // true après un continueFromResults() — évite le double comptage (double-clic)

  /* Clé de scoring stable : les humains sont keyés par leur slot joueur,
     les IA par leur nom (préfixé pour éviter toute collision avec 'P1'/'P2'). */
  function entryKey(r) {
    return r.isPlayer ? ('P' + (r.playerIndex || 1)) : ('AI:' + r.name);
  }

  /* ---------- vue utilitaire ---------- */
  function showView(id) {
    for (const v of VIEWS) {
      const el = document.getElementById(v);
      if (el) el.classList.toggle('hidden', v !== id);
    }
    if (id !== 'cupViewFinal') stopConfetti();
  }

  function isActive() { return !!cup; }
  /* La coupe n'est valable que pour la course correspondant au circuit courant. */
  function isActiveFor(circuitId) { return !!cup && cup.circuits[cup.index] === circuitId; }
  function isLastRace() { return !!cup && cup.index >= 3; }

  /* Abandonne la coupe en cours (retour au titre / course libre) :
     purge l'état, stoppe les confettis, réinitialise le garde anti-double-clic. */
  function abort() {
    cup = null;
    continueHandled = false;
    stopConfetti();
    showView('cupViewSetup');
  }

  /* ---------- tirage ---------- */
  function drawCircuits() {
    const ids = CIRCUIT_IDS.slice();
    for (let i = ids.length - 1; i > 0; i--) {           // Fisher–Yates
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp;
    }
    return ids.slice(0, 4);
  }

  function renderDraw() {
    const list = document.getElementById('cupDrawList');
    list.innerHTML = '';
    cup = cup || { circuits: drawCircuits(), index: 0, totals: {}, lastLeg: {}, meta: {} };
    cup.circuits.forEach(function (id, i) {
      const def = TRACKS[id];
      const li = document.createElement('li');
      li.className = 'cup-leg';
      li.innerHTML =
        '<span class="cup-leg-num">' + (i + 1) + '</span>' +
        '<canvas class="cup-leg-thumb" width="240" height="152" aria-hidden="true"></canvas>' +
        '<span class="cup-leg-name">' + escapeHtml(def.name) + '</span>';
      renderTrackThumbnail(def, li.querySelector('canvas'), 240, 152);
      list.appendChild(li);
    });
  }

  /* ---------- contrôles (partagés avec la course libre via MenuKit) ---------- */
  function refreshControls() {
    document.querySelector('#cupJoueurs .step-value').textContent = MenuKit.FORMAT.joueurs(opts.joueurs);
    document.querySelector('#cupKarts .step-value').textContent = MenuKit.FORMAT.karts(opts.karts);
    document.querySelector('#cupTours .step-value').textContent = MenuKit.FORMAT.tours(opts.tours);
    const tabs = document.querySelectorAll('#cupDiff .diff-tab');
    for (const t of tabs) t.classList.toggle('active', t.dataset.diff === opts.difficulte);
    MenuKit.renderPlayerColumn('cupP1', opts, 'persoP1');
    MenuKit.renderPlayerColumn('cupP2', opts, 'persoP2');
    const two = opts.joueurs === 2;
    document.getElementById('cupP2Col').classList.toggle('hidden', !two);
    document.getElementById('cupVs').classList.toggle('hidden', !two);
  }

  function wire() {
    const bindArrow = function (id, key, dir) {
      document.getElementById(id).addEventListener('click', function () {
        MenuKit.cycleChar(opts, key, dir);
        Storage.saveOptions(opts);
        AudioSys.sfx.click();
        MenuKit.renderPlayerColumn(key === 'persoP1' ? 'cupP1' : 'cupP2', opts, key);
      });
    };
    bindArrow('cupP1Prev', 'persoP1', -1);
    bindArrow('cupP1Next', 'persoP1', 1);
    bindArrow('cupP2Prev', 'persoP2', -1);
    bindArrow('cupP2Next', 'persoP2', 1);

    MenuKit.wireStepper('cupJoueurs', MenuKit.VALUES.joueurs,
      function () { return opts.joueurs; },
      function (v) { opts.joueurs = v; Storage.saveOptions(opts); refreshControls(); },
      MenuKit.FORMAT.joueurs, null);
    MenuKit.wireStepper('cupKarts', MenuKit.VALUES.karts,
      function () { return opts.karts; },
      function (v) { opts.karts = v; Storage.saveOptions(opts); },
      MenuKit.FORMAT.karts, null);
    MenuKit.wireStepper('cupTours', MenuKit.VALUES.tours,
      function () { return opts.tours; },
      function (v) { opts.tours = v; Storage.saveOptions(opts); },
      MenuKit.FORMAT.tours, null);
    MenuKit.wireDifficulty('cupDiff',
      function () { return opts.difficulte; },
      function (v) { opts.difficulte = v; Storage.saveOptions(opts); }, null);

    document.getElementById('btnCupReshuffle').addEventListener('click', function () {
      AudioSys.sfx.click();
      cup = { circuits: drawCircuits(), index: 0, totals: {}, lastLeg: {}, meta: {} };
      renderDraw();
    });
    document.getElementById('btnCupBack').addEventListener('click', function () {
      AudioSys.sfx.click();
      abort();
      Screens.show('title');
    });
    document.getElementById('btnCupStart').addEventListener('click', function () {
      AudioSys.sfx.click();
      startRace(cup.circuits[0]);
    });
    document.getElementById('btnCupNext').addEventListener('click', function () {
      AudioSys.sfx.click();
      cup.index += 1;
      startRace(cup.circuits[cup.index]);
    });
    document.getElementById('btnCupAgain').addEventListener('click', function () {
      AudioSys.sfx.click();
      continueHandled = false;
      cup = { circuits: drawCircuits(), index: 0, totals: {}, lastLeg: {}, meta: {} };
      renderDraw();
      showView('cupViewSetup');
    });
    document.getElementById('btnCupMenu').addEventListener('click', function () {
      AudioSys.sfx.click();
      abort();
      Screens.show('title');
    });
  }

  function startRace(circuitId) {
    continueHandled = false;   // nouvelle course → le bouton Continuer redevient actif
    window.startRaceFlow({
      circuitId: circuitId,
      tours: opts.tours,
      karts: opts.karts,
      difficulte: opts.difficulte,
      joueurs: opts.joueurs,
      persoP1: opts.persoP1,
      persoP2: opts.persoP2
    });
  }

  /* ---------- comptabilisation ---------- */
  function recordRaceResult(result) {
    if (!isActiveFor(result.circuitId)) return;   // course hors coupe en cours : rien à créditer
    cup.lastLeg = {};
    for (const r of result.ranking) {
      const key = entryKey(r);
      const pts = POINTS[Math.min(r.position - 1, POINTS.length - 1)] || 0;
      cup.totals[key] = (cup.totals[key] || 0) + pts;
      cup.lastLeg[key] = pts;
      cup.meta[key] = { name: r.name, color: r.color, isPlayer: !!r.isPlayer, charId: r.charId, playerIndex: r.playerIndex || 0 };
    }
  }

  function standingsRows() {
    const keys = Object.keys(cup.totals);
    const rows = keys.map(function (key) {
      const meta = cup.meta[key] || {};
      return { key: key, name: meta.name || key, total: cup.totals[key], leg: cup.lastLeg[key] || 0,
               isPlayer: !!meta.isPlayer, color: meta.color || '#ccc', charId: meta.charId || 'mimi', playerIndex: meta.playerIndex || 0 };
    });
    rows.sort(function (a, b) {
      return b.total - a.total || String(a.name).localeCompare(String(b.name)) || String(a.key).localeCompare(String(b.key));
    });
    return rows;
  }

  function renderStandings() {
    const rows = standingsRows();
    const tbody = document.getElementById('cupStandingsBody');
    tbody.innerHTML = '';
    rows.forEach(function (r, i) {
      const tr = document.createElement('tr');
      if (r.isPlayer) tr.className = 'is-player';
      tr.innerHTML =
        '<td class="cup-pos">' + (i + 1) + '</td>' +
        '<td class="cup-name"><span class="cup-dot" style="background:' + escapeHtml(r.color) + '"></span>' +
          escapeHtml(r.name) + (r.isPlayer ? ' <span class="you-badge">' + (r.playerIndex === 2 ? 'P2' : 'P1') + '</span>' : '') + '</td>' +
        '<td class="cup-legpts">+' + r.leg + '</td>' +
        '<td class="cup-total">' + r.total + '</td>';
      tbody.appendChild(tr);
    });
    document.getElementById('cupStandingsTitle').textContent =
      'Classement — Course ' + (cup.index + 1) + ' / 4 terminée';
  }

  /* ---------- podium final ---------- */
  function renderFinal() {
    const rows = standingsRows();
    const top3 = rows.slice(0, 3);
    const topTotal = top3.length ? top3[0].total : 0;
    const champions = rows.filter(function (r) { return r.total === topTotal; });
    const humanChampions = champions.filter(function (r) { return r.isPlayer; });

    const title = document.getElementById('cupFinalTitle');
    const sub = document.getElementById('cupFinalSub');
    const champLabel = function (c) { return c.name + (c.isPlayer ? ' (P' + (c.playerIndex || 1) + ')' : ''); };
    if (humanChampions.length) {
      title.textContent = 'Champion !';
      sub.textContent = humanChampions.map(champLabel).join(' & ') +
        (humanChampions.length > 1 ? ' remportent la coupe !' : ' remporte la coupe !');
    } else {
      title.textContent = 'Les invités l’emportent !';
      sub.textContent = champions.map(function (c) { return c.name; }).join(' & ') + ' gagne la coupe…';
    }

    /* podium : 2e à gauche, 1er au centre, 3e à droite */
    const order = [top3[1], top3[0], top3[2]];
    const slots = ['cupSlot2', 'cupSlot1', 'cupSlot3'];
    for (let i = 0; i < 3; i++) {
      const slot = document.getElementById(slots[i]);
      const r = order[i];
      slot.innerHTML = '';
      if (!r) continue;
      const card = document.createElement('div');
      card.className = 'podium-card place-' + (i === 0 ? 2 : (i === 1 ? 1 : 3)) + (r.isPlayer ? ' is-player' : '');
      const medal = i === 1 ? '🥇' : (i === 0 ? '🥈' : '🥉');
      card.innerHTML =
        '<div class="podium-medal">' + medal + '</div>' +
        '<canvas class="podium-avatar" width="150" height="150" aria-hidden="true"></canvas>' +
        '<div class="podium-name">' + escapeHtml(r.name) + (r.isPlayer ? ' <span class="you-badge">' + (r.playerIndex === 2 ? 'P2' : 'P1') + '</span>' : '') + '</div>' +
        '<div class="podium-pts">' + r.total + ' pts</div>';
      drawAvatar(card.querySelector('canvas'), r.charId, 96, { disc: true });
      slot.appendChild(card);
    }

    /* persistance du palmarès */
    try {
      const championsList = Storage.loadChampions();
      championsList.push({
        winner: champions.map(champLabel).join(' & '),
        human: humanChampions.length > 0,
        total: topTotal,
        circuits: cup.circuits.slice(),
        date: new Date().toISOString()
      });
      while (championsList.length > 20) championsList.shift();
      Storage.saveChampions(championsList);
    } catch (e) { console.warn('[cup] palmarès non sauvegardé', e); }

    startConfetti();
  }

  /* ---------- confetti ---------- */
  function startConfetti() {
    const cv = document.getElementById('cupConfetti');
    if (!cv) return;
    stopConfetti();
    confettiOn = true;
    const ctx = cv.getContext('2d');
    const COLORS = ['#FF5FA2', '#FFD93D', '#7FE0BE', '#8E7CB3', '#5FB4FF', '#FF8F8F', '#FFF3A0'];
    const pieces = [];
    for (let i = 0; i < 110; i++) {
      pieces.push({
        x: Math.random(), y: -0.1 - Math.random() * 0.9,
        w: 6 + Math.random() * 8, h: 8 + Math.random() * 12,
        vy: 0.0016 + Math.random() * 0.0022, vx: (Math.random() - 0.5) * 0.0016,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.12,
        color: COLORS[i % COLORS.length]
      });
    }
    const frame = function () {
      if (!confettiOn) return;
      confettiRaf = requestAnimationFrame(frame);
      const host = cv.parentElement.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(host.width)), h = Math.max(1, Math.round(host.height));
      if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const p of pieces) {
        p.y += p.vy; p.x += p.vx; p.rot += p.vr;
        if (p.y > 1.1) { p.y = -0.1; p.x = Math.random(); }
        ctx.save();
        ctx.translate(p.x * w, p.y * h);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    };
    frame();
  }
  function stopConfetti() {
    confettiOn = false;
    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    confettiRaf = null;
  }

  /* ---------- API ---------- */
  function continueFromResults() {
    if (continueHandled) return;   // double-clic : déjà traité
    continueHandled = true;
    if (!cup) { Screens.show('title'); return; }
    if (isLastRace()) {
      renderFinal();
      showView('cupViewFinal');
      Screens.show('cup');
    } else {
      renderStandings();
      showView('cupViewStandings');
      Screens.show('cup');
    }
  }

  function open() {
    opts = Storage.loadOptions();
    stopConfetti();
    continueHandled = false;
    /* chaque ouverture = nouvelle coupe (une coupe abandonnée est perdue) */
    cup = { circuits: drawCircuits(), index: 0, totals: {}, lastLeg: {}, meta: {} };
    refreshControls();
    renderDraw();
    showView('cupViewSetup');
    Screens.show('cup');
  }

  function init() {
    opts = Storage.loadOptions();
    wire();
  }

  return {
    init: init,
    open: open,
    isActive: isActive,
    isActiveFor: isActiveFor,
    isLastRace: isLastRace,
    recordRaceResult: recordRaceResult,
    continueFromResults: continueFromResults,
    abort: abort,
    stopConfetti: stopConfetti
  };
})();
