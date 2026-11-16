/* ============================================================
   VROOMIIIES — results.js
   Écran résultats complet (lot 3) :
   - panneau gauche : gros « 1er », « ★ N pts », meilleur tour,
     badges « Record battu ! » / « Nouveau meilleur tour ! »
   - panneau droit : classement complet (médailles top 3, joueurs
     surlignés avec badge TOI / P1 / P2)
   - boutons : « Refaire la course » / « Menu »
     (en mode championnat : « Continuer ▶ », géré par MenuCup)
   - records (vroomiiies.records) mis à jour pour CHAQUE joueur
     (un record battu par n'importe quel humain compte).
   ============================================================ */
'use strict';

const Results = (function () {

  /* Sauvegarde best / bestLap si battus (objets {time, who}). */
  function saveRecords(circuitId, players) {
    const records = Storage.loadRecords();
    const rec = records[circuitId] || { best: null, bestLap: null };
    const times = players.map(function (p) { return p.finishTime; }).filter(function (t) { return typeof t === 'number' && isFinite(t); });
    const laps = players.map(function (p) { return p.bestLap; }).filter(function (t) { return typeof t === 'number' && isFinite(t); });
    const bestRun = times.length ? Math.min.apply(Math, times) : null;
    const bestLap = laps.length ? Math.min.apply(Math, laps) : null;
    const out = { newBest: false, newBestLap: false };
    if (bestRun != null && (rec.best == null || bestRun < rec.best)) { rec.best = Math.round(bestRun); out.newBest = true; }
    if (bestLap != null && (rec.bestLap == null || bestLap < rec.bestLap)) { rec.bestLap = Math.round(bestLap); out.newBestLap = true; }
    records[circuitId] = rec;
    Storage.saveRecords(records);
    return out;
  }

  function medal(pos) {
    return pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : ordinalFR(pos);
  }

  function badgeFor(r) {
    if (!r.isPlayer) return '';
    return r.playerIndex === 2 ? '<span class="you-badge p2">P2</span>' : '<span class="you-badge">P1</span>';
  }

  function show(result) {
    const trackDef = TRACKS[result.circuitId];
    /* Le mode championnat ne s'active que si une coupe est en cours ET que
       cette course correspond bien au circuit courant de la coupe — sinon
       on traite la course comme une course libre. */
    const cup = (typeof MenuCup !== 'undefined' && MenuCup.isActiveFor) ? MenuCup.isActiveFor(result.circuitId) : false;

    /* records : tous les humains de la course comptent */
    const humanPlayers = (result.players && result.players.length)
      ? result.players
      : result.ranking.filter(function (r) { return r.isPlayer; });
    const saved = saveRecords(result.circuitId, humanPlayers);

    document.getElementById('resultsTitle').textContent =
      (cup ? 'Coupe — ' : 'Arrivée — ') + (trackDef ? trackDef.name : result.circuitId);

    /* --- panneau gauche : stats par joueur humain --- */
    const sum = document.getElementById('resSummary');
    sum.innerHTML = '';
    for (const p of humanPlayers) {
      const block = document.createElement('div');
      block.className = 'res-player' + (humanPlayers.length > 1 ? ' res-player-multi' : '');
      const tag = humanPlayers.length > 1 ? '<div class="res-ptag">Joueur ' + (p.playerIndex || 1) + ' · ' + escapeHtml(p.name) + '</div>' : '';
      block.innerHTML =
        tag +
        '<div class="res-pos">' + ordinalFR(p.position) + '</div>' +
        '<div class="res-score">★ ' + (p.score || 0) + ' pts</div>' +
        '<div class="res-bestlap">Meilleur tour : <strong>' + fmtTime(p.bestLap) + '</strong></div>' +
        '<div class="res-total">Temps total : <strong>' + fmtTime(p.finishTime) + '</strong></div>';
      sum.appendChild(block);
    }

    /* badges records */
    const badgeBox = document.getElementById('resBadges');
    let badges = '';
    if (saved.newBest) badges += '<span class="big-badge">🏁 Record battu !</span>';
    if (saved.newBestLap) badges += '<span class="big-badge gold">⚡ Nouveau meilleur tour !</span>';
    badgeBox.innerHTML = badges;
    badgeBox.style.display = badges ? 'flex' : 'none';

    /* records actuels */
    const records = Storage.loadRecords();
    const rec = records[result.circuitId] || { best: null, bestLap: null };
    document.getElementById('resultsRecords').innerHTML =
      '<div class="records-title">Records — ' + escapeHtml(trackDef ? trackDef.name : '') + '</div>' +
      '<div class="records-line">Meilleure course : <strong>' + fmtTime(rec.best) + '</strong>' +
        (saved.newBest ? ' <span class="record-badge">NOUVEAU !</span>' : '') + '</div>' +
      '<div class="records-line">Meilleur tour : <strong>' + fmtTime(rec.bestLap) + '</strong>' +
        (saved.newBestLap ? ' <span class="record-badge">NOUVEAU !</span>' : '') + '</div>';

    /* --- panneau droit : classement complet --- */
    const list = document.getElementById('resultsList');
    list.innerHTML = '';
    const leader = result.ranking.length && result.ranking[0].finished ? result.ranking[0].finishTime : null;
    for (const r of result.ranking) {
      const li = document.createElement('li');
      li.className = 'result-row' + (r.isPlayer ? ' is-player' : '') + (r.position <= 3 ? ' podium-' + r.position : '');
      let timeHtml;
      if (r.finished) {
        timeHtml = (r.position === 1)
          ? '<span class="result-time">' + fmtTime(r.finishTime) + '</span>'
          : '<span class="result-time">+' + ((r.finishTime - leader) / 1000).toFixed(2) + ' s</span>';
      } else {
        timeHtml = '<span class="result-time result-dnf">Tour ' + r.lap + '</span>';
      }
      li.innerHTML =
        '<span class="result-pos">' + medal(r.position) + '</span>' +
        '<span class="result-dot" style="background:' + escapeHtml(r.color || '#ccc') + '"></span>' +
        '<span class="result-name">' + escapeHtml(r.name) + badgeFor(r) + '</span>' +
        timeHtml;
      list.appendChild(li);
    }

    /* --- boutons --- */
    const btnRetry = document.getElementById('btnRetry');
    const btnMenu = document.getElementById('btnResultsMenu');
    const btnCup = document.getElementById('btnCupContinue');
    if (cup) {
      btnRetry.style.display = 'none';
      btnMenu.style.display = 'none';
      btnCup.style.display = '';
      btnCup.textContent = MenuCup.isLastRace() ? 'Podium ▶' : 'Classement ▶';
    } else {
      btnRetry.style.display = '';
      btnMenu.style.display = '';
      btnCup.style.display = 'none';
    }
    btnCup.disabled = false;   // réarmé à chaque nouvel écran de résultats

    Screens.show('results');
    AudioSys.fanfare();

    /* mode championnat : comptabiliser la course (idempotent) */
    if (cup) MenuCup.recordRaceResult(result);
  }

  function init() {
    document.getElementById('btnResultsMenu').addEventListener('click', function () {
      AudioSys.sfx.click();
      Screens.show('title');
    });
    document.getElementById('btnRetry').addEventListener('click', function () {
      AudioSys.sfx.click();
      if (Engine.config) window.startRaceFlow(Engine.config);
    });
    document.getElementById('btnCupContinue').addEventListener('click', function () {
      const btn = this;
      if (btn.disabled) return;
      btn.disabled = true;     // anti double-clic : un seul continueFromResults()
      AudioSys.sfx.click();
      MenuCup.continueFromResults();
    });
    /* branchement du moteur → écran résultats */
    Engine.onFinish = function (result) { show(result); };
  }

  return { init: init, show: show, saveRecords: saveRecords };
})();
