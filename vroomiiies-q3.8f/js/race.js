/* Vroomiiies — orchestrateur de course : compte à rebours 3-2-1-PARTS,
   laps par secteurs (anti-raccourci, pointé en fenêtre locale), positions temps
   réel, points + bonbons (★+1, pts+2, mini-boost), événements 'lap'/'pick'/
   'collision'/'finish'/'countdown', modes libre et championnat (le classement
   multi-manches est géré par ui), pause. */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};
  var U = V.U, C = V.C;

  var R = {
    state: 'idle',           // idle | compte | course | finie | pause
    mode: 'libre',
    track: null,
    karts: [],
    bonbons: [],
    tours: 3,
    temps: 0,
    recordNouveau: false,
    joueurKart: null,
    joueur2Kart: null,
    classementFinal: null
  };

  var listeners = [];
  var optsCourantes = null;
  var tCompte = 0, compteDit = -1;
  var rangTimer = 0, chocCooldown = 0, finTimer = 0;
  var scratch = { gauche: false, droite: false, gas: false, frein: false };
  var rankBuf = [];
  var rng = Math.random;

  function emettre(ev, data) {
    for (var i = 0; i < listeners.length; i++) listeners[i](ev, data);
  }

  // ---------- démarrage ----------
  // opts = { mode, trackIndex, tours, nbKarts, diffIdx, joueurs:[{joueur, persoIdx}] }
  function start(opts) {
    R.mode = opts.mode || 'libre';
    R.tours = opts.tours;
    R.track = V.tracks.build(opts.trackIndex);
    R.temps = 0;
    R.recordNouveau = false;
    R.classementFinal = null;
    R.state = 'compte';
    tCompte = 0; compteDit = -1;
    rangTimer = 0; chocCooldown = 0; finTimer = 0;
    R.bonbons = V.tracks.rollBonbons(R.track, U.seeded((Math.random() * 1e9) | 0));

    var defDiff = C.DIFFICULTES[opts.diffIdx];
    var n = opts.nbKarts;
    var joueurs = opts.joueurs || [{ joueur: 0, persoIdx: 0 }];

    // slot du/des joueur(s) : aux ~3/4 de la grille pour devoir remonter
    var slotJoueur = Math.min(n - joueurs.length, Math.floor(n * 0.75));
    var rngS = U.seeded(((Math.random() * 1e9) | 0) ^ R.track.index);
    rng = rngS;

    R.karts.length = 0;
    var slotJoueurs = {};
    for (var j = 0; j < joueurs.length; j++) slotJoueurs[slotJoueur + j] = joueurs[j];

    var used = 0;
    for (var slot = 0; slot < n; slot++) {
      var jj = slotJoueurs[slot];
      var persoIdx, humain = false, joueurIdx = -1;
      if (jj) {
        persoIdx = jj.persoIdx;
        humain = true; joueurIdx = jj.joueur;
      } else {
        persoIdx = (rngS() * C.PERSONNAGES.length) | 0;
      }
      var k = V.physics.creerKart(R.track, slot, C.PERSONNAGES[persoIdx].id, humain, joueurIdx);
      if (!humain) {
        V.ai.preparer(k, defDiff, rngS);
      }
      R.karts.push(k);
      used++;
    }

    R.joueurKart = null; R.joueur2Kart = null;
    for (var i2 = 0; i2 < R.karts.length; i2++) {
      var kk = R.karts[i2];
      if (kk.joueur === 0) R.joueurKart = kk;
      if (kk.joueur === 1) R.joueur2Kart = kk;
    }

    rankBuf.length = R.karts.length;
    majRangs();
    V.audio.setIntensite(0.4);
  }

  // ---------- mise à jour (pas fixe 1/60) ----------
  function update(dt) {
    if (R.state === 'compte') {
      tCompte += dt;
      var dit = tCompte < 0.8 ? 0 : tCompte < 1.6 ? 1 : tCompte < 2.4 ? 2 : 3;
      if (dit !== compteDit) {
        compteDit = dit;
        var txt = ['3', '2', '1', '’est parti !'][dit];
        txt = dit === 3 ? 'C’est parti !' : txt;
        emettre('countdown', txt);
        V.audio.sfx(dit < 3 ? 'clic' : 'pick');
        if (dit === 3) {
          R.state = 'course';
          R.temps = 0;
          for (var i = 0; i < R.karts.length; i++) {
            R.karts[i].lapStart = 0;
            R.karts[i].lap = 0;
            R.karts[i].aCroise = false; // n'a pas encore franchi la ligne (CRIT-2)
            R.karts[i].qmask = 1; // secteur 0 déjà occupied au départ
          }
        }
      }
      return;
    }
    if (R.state !== 'course') return;

    R.temps += dt;
    var karts = R.karts, i, k;

    // pilotage + physique
    for (i = 0; i < karts.length; i++) {
      k = karts[i];
      var inp;
      if (k.humain) {
        inp = V.input.etat(k.joueur);
      } else {
        scratch.gauche = scratch.droite = scratch.gas = scratch.frein = false;
        inp = V.ai.piloter(k, R.track, karts, scratch);
      }
      V.physics.stepKart(k, inp, R.track, dt);
    }
    V.physics.collider(karts);

    // choc joueur (sfx limité en débit)
    chocCooldown -= dt;
    if (V.physics.chocJoueur > 0 && chocCooldown <= 0) {
      chocCooldown = 0.35;
      V.audio.sfx('choc');
      emettre('collision', null);
    }

    // bonbons
    var bb = R.bonbons;
    for (var b = 0; b < bb.length; b++) {
      if (bb[b].pris) continue;
      for (i = 0; i < karts.length; i++) {
        k = karts[i];
        var dx = k.x - bb[b].x, dy = k.y - bb[b].y;
        var rr = C.PHYSIQUE.R_KART + 12 + k.speed * 0.02;
        if (dx * dx + dy * dy < rr * rr) {
          bb[b].pris = true;
          k.stars++;
          k.pts += 2;
          k.boostT = C.PHYSIQUE.PASSAGE_DUREE;
          k.speed += C.PHYSIQUE.PASSAGE_V;
          if (k.humain) {
            V.audio.sfx('pick');
            V.audio.sfx('paslage');
          }
          emettre('pick', { kart: k });
          break;
        }
      }
    }

    // zones d'accélération (AGRÉ-1) : boost réutilisant la mécanique des bonbons,
    // un déclenchement par zone et par kart (rearm le temps de sortir de la zone).
    var ps = R.track.passages, pn = R.track.sp.n;
    for (i = 0; i < karts.length; i++) {
      k = karts[i];
      if (k.padCd > 0) k.padCd -= dt;
      if (k.padCd > 0 || k.off > 0.5) continue;
      for (var z = 0; z < ps.length; z++) {
        var dd = ((k.sIdx - ps[z].centre + pn * 1.5) % pn) - pn * 0.5; // ±n/2, wrap
        if (dd >= -ps[z].demi && dd <= ps[z].demi && k.speed > 40) {
          k.boostT = C.PHYSIQUE.PASSAGE_DUREE;
          k.speed += C.PHYSIQUE.PASSAGE_V;
          k.padCd = 2.2;
          if (k.humain) V.audio.sfx('paslage');
          emettre('pas', { kart: k, zone: z });
          break;
        }
      }
    }

    // laps — 4 secteurs (anti-raccourci) + wrap d'indice
    lapLogique();

    // positions (20 Hz suffisent)
    rangTimer -= dt;
    if (rangTimer <= 0) { rangTimer = 0.05; majRangs(); }

    // fin de course : le joueur (ou le j2) a fini → grâce de 2,2 s
    if ((R.joueurKart && R.joueurKart.finished) || (R.joueur2Kart && R.joueur2Kart.finished)) {
      finTimer += dt;
      if (finTimer > 2.2) cloturer();
    }
    // intensité musique suit le classement joueur
    var pj = R.joueurKart || R.joueur2Kart;
    if (pj) V.audio.setIntensite(U.clamp(1 - (pj.rang - 1) / Math.max(1, karts.length - 1), 0.25, 1));
  }

  function lapLogique() {
    var sp = R.track.sp, n = sp.n;
    var karts = R.karts;
    for (var i = 0; i < karts.length; i++) {
      var k = karts[i];
      if (k.finished) continue;
      var idx = k.sIdx, prev = k.prevSIdx == null ? idx : k.prevSIdx;
      var q = (idx * 4 / n) | 0;
      k.qmask |= (1 << q);
      // franchissement avant de la ligne : grand indice -> petit indice
      if (prev > n * 0.75 && idx < n * 0.25) {
        // CRIT-2 : le PREMIER franchissement vers l'avant pose aCroise, indépendamment
        // du garde anti-raccourci (qmask), et remet le chrono du tour à zéro (le
        // 1er tour mesuré ne doit pas inclure la remontée depuis la grille).
        var premier = !k.aCroise;
        k.aCroise = true;
        if (k.qmask === 15) {
          k.lap++;
          var lapSec = R.temps - k.lapStart;
          k.lapStart = R.temps;
          // le tour « de remontée de la grille » (premier franchissement) n'est jamais un record
          if (!premier && k.lap > 0 && k.humain && R.temps > 2) {
            var ms = lapSec * 1000;
            if (ms > 3000) { // élimine les temps absurdement lents d'un départ lancé
              if (!k.meilleurLap || ms < k.meilleurLap) k.meilleurLap = ms;
              verifierRecord(k, ms);
            }
          }
          if (k.lap >= R.tours) {
            k.finished = true;
            k.finishT = R.temps;
            k.speed = Math.min(k.speed, 120);
          }
          emettre('lap', { kart: k, lap: k.lap });
        } else if (premier) {
          k.lapStart = R.temps; // raccourci au 1er tour : le chrono repart quand même
        }
        k.qmask = 1;
      } else if (prev < n * 0.25 && idx > n * 0.75) {
        // repassage à reculons de la ligne : on décrémente si les secteurs étaient faits
        if (k.qmask === 15 && k.lap > 0) k.lap--;
        k.aCroise = false; // on est de nouveau derrière la ligne
        k.qmask = 8;
      }
    }
  }

  function verifierRecord(k, ms) {
    if (!k.humain) return;
    var records = V.store.get('records', {}) || {};
    var cle = R.track.id;
    var best = records[cle];
    if (!best || ms < best) {
      records[cle] = Math.round(ms);
      V.store.set('records', records);
      if (k.joueur === 0 || (!R.joueurKart || k.joueur === 1)) R.recordNouveau = true;
    }
  }

  // CRIT-2 : tant qu'un kart n'a pas franchi la ligne (derrière la grille), sa
  // progression reculée vaut lap*total + s - total (sinon s≈total le ferait passer
  // en tête pendant le 1er tour).
  function progression(k) {
    if (k.finished) return 1e12 - k.finishT;
    return k.lap * R.track.sp.total + k.s - (k.aCroise ? 0 : R.track.sp.total);
  }

  function majRangs() {
    var n = R.karts.length, i;
    for (i = 0; i < n; i++) rankBuf[i] = R.karts[i];
    rankBuf.sort(function (a, b) { return progression(b) - progression(a); });
    var fini = 1;
    for (i = 0; i < n; i++) {
      var k = rankBuf[i];
      if (k.finished) k.rang = fini++;
      else k.rang = k.finishRang || (i + 1);
    }
    // re-numérotation propre : finis d'abord dans l'ordre, puis le reste
    var r = 1;
    for (i = 0; i < n; i++) if (rankBuf[i].finished) rankBuf[i].rang = r++;
    for (i = 0; i < n; i++) if (!rankBuf[i].finished) rankBuf[i].rang = r++;
  }

  function cloturer() {
    if (R.state === 'finie') return;
    R.state = 'finie';
    majRangs();
    var cls = [];
    for (var i = 0; i < R.karts.length; i++) {
      var k = R.karts[i];
      cls.push({
        kart: k,
        rang: k.rang,
        ptsClassement: C.pointsPour(k.rang),
        ptsBonus: k.pts,
        total: C.pointsPour(k.rang) + k.pts,
        meilleurLap: k.meilleurLap
      });
    }
    cls.sort(function (a, b) { return a.rang - b.rang; });
    R.classementFinal = cls;
    V.audio.sfx('fanfare');
    emettre('finish', { classement: cls, record: R.recordNouveau });
  }

  // ---------- pause / contrôle ----------
  function pause() {
    if (R.state === 'course' || R.state === 'compte') {
      R._reprise = R.state;
      R.state = 'pause';
      return true;
    }
    if (R.state === 'pause') { reprendre(); return true; }
    return false;
  }
  function reprendre() {
    if (R.state === 'pause') R.state = R._reprise || 'course';
  }
  function quitter() {
    R.state = 'idle';
    R.karts.length = 0;
    R.bonbons.length = 0;
    R.classementFinal = null;
  }
  function recommencer() {
    if (optsCourantes) start(optsCourantes);
  }

  var race = {
    get state() { return R.state; },
    get mode() { return R.mode; },
    get track() { return R.track; },
    get karts() { return R.karts; },
    get bonbons() { return R.bonbons; },
    get tours() { return R.tours; },
    get temps() { return R.temps; },
    get recordNouveau() { return R.recordNouveau; },
    get joueurKart() { return R.joueurKart; },
    get joueur2Kart() { return R.joueur2Kart; },
    get classementFinal() { return R.classementFinal; },
    start: function (opts) { optsCourantes = opts; start(opts); },
    update: update,
    pause: pause,
    reprendre: reprendre,
    quitter: quitter,
    recommencer: recommencer,
    cloturer: cloturer,
    on: function (cb) { listeners.push(cb); }
  };

  V.race = race;
})(typeof window !== 'undefined' ? window : globalThis);
