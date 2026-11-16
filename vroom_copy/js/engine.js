/* ============================================================
   VROOMIIIES — engine.js
   CFG (constantes d'équilibrage) + moteur de course.
   États : 'idle' | 'countdown' | 'racing' | 'finished'
   (pause prévue au lot 3 — l'état 'paused' y sera greffé).
   Signature publique : startRace(config)
     config = { circuitId, tours, karts, difficulte, joueurs, persoP1, persoP2 }
   ============================================================ */
'use strict';

const CFG = {
  /* vitesse / moteur */
  baseMaxSpd: 480, spdPerVit: 14,        // maxSpd = 480 + 14 × V
  engineBase: 300, enginePerAccel: 26,   // engine = 300 + 26 × A
  steerBase: 1.9, steerPerMani: 0.16,    // steerRate = 1.9 + 0.16 × M
  maxRev: 150,
  /* traînée / hors-piste */
  drag: 0.8, offRoadDragMul: 2.4, offRoadMaxMul: 0.55,
  brakeForce: 760, reverseForce: 340,
  /* adhérence */
  gripRoad: 0.82, gripOffRoad: 0.90, gripDrift: 0.94,
  /* drift / mini-turbo */
  driftMinSpeedRatio: 0.55, driftMinTime: 0.45,
  miniTurboMul: 1.18, miniTurboTime: 0.9,
  /* boosts */
  boostMul: 1.22, boostTime: 1.1, boostAccelMul: 1.6, boostRadius: 42, boostCooldown: 1.0,
  miniTurboPoints: 10,          // points marqués par mini-turbo
  /* grille de départ */
  gridBack: 70, gridGap: 46, gridLat: 30,
  /* collisions */
  kartRadius: 17, collisionSpeedLoss: 0.08,
  /* caméra */
  camLerp: 0.06, camAhead: 0.35,
  camZoomMin: 0.55, camZoomMax: 1.35, camRefW: 1150, camRefH: 800,
  /* IA */
  aiNamesStart: 0
};

const Engine = {
  state: 'idle',
  paused: false,        // lot 3 : pause Échap/Start (fige la sim, rendu conservé)
  config: null,
  track: null,
  karts: [],
  player: null,
  camera: { x: 0, y: 0, zoom: 1 },   // joueur 1 (ou vue unique)
  camera2: { x: 0, y: 0, zoom: 1 },  // joueur 2 (split-screen)
  particles: [],
  raceTime: 0,          // ms écoulées depuis le GO
  countdownT: 0,        // s restants avant GO
  lastCount: 4,
  goFlash: 0,           // s d'affichage "GO !"
  tours: 3,
  onFinish: null,       // callback(result) branché par results.js/main.js
  _result: null,

  /* ============ LANCEMENT ============ */
  startRace: function (config) {
    const def = TRACKS[config.circuitId] || TRACKS.prairie;
    /* circuitId normalisé sur la définition réelle (fallback prairie si invalide) */
    this.config = Object.assign({
      circuitId: 'prairie', tours: 3, karts: 30, difficulte: 'normal',
      joueurs: 1, persoP1: 'mimi', persoP2: 'pixel'
    }, config, { circuitId: def.id });
    this.tours = clamp(Math.floor(this.config.tours) || 3, 1, 20);

    this.track = buildTrack(def);
    this.particles = [];
    this.raceTime = 0;
    this.countdownT = 3.0;
    this.lastCount = 4;
    this.goFlash = 0;
    this._result = null;

    /* --- création des karts : joueur(s) + IA --- */
    const karts = [];
    const pChar = CHARACTERS[this.config.persoP1] || CHARACTERS.mimi;
    karts.push(createKart({
      id: 'p1', name: pChar.name, isPlayer: true, playerIndex: 1,
      charId: pChar.id, color: pChar.color, dark: pChar.dark,
      stats: { v: pChar.v, a: pChar.a, m: pChar.m }
    }));
    if (this.config.joueurs === 2) {
      const p2Char = CHARACTERS[this.config.persoP2] || CHARACTERS.pixel;
      karts.push(createKart({
        id: 'p2', name: p2Char.name, isPlayer: true, playerIndex: 2,
        charId: p2Char.id, color: p2Char.color, dark: p2Char.dark,
        stats: { v: p2Char.v, a: p2Char.a, m: p2Char.m }
      }));
    }
    const total = clamp(Math.floor(this.config.karts) || 30, karts.length, 30);
    let aiIdx = 0;
    while (karts.length < total) {
      const c = CHARACTERS[CHARACTER_LIST[(aiIdx + 1) % CHARACTER_LIST.length].id];
      const stat = 4 + ((aiIdx * 7 + 3) % 5); // 4..8 pseudo-variés, déterministe
      karts.push(createKart({
        id: 'ai' + aiIdx,
        name: AI_NAMES[aiIdx % AI_NAMES.length],
        isPlayer: false,
        charId: c.id,
        color: AI_COLORS[aiIdx % AI_COLORS.length],
        stats: { v: clamp(stat, 3, 9), a: clamp(4 + ((aiIdx * 5 + 1) % 6), 3, 9), m: clamp(4 + ((aiIdx * 3 + 2) % 6), 3, 9) },
        aiSeed: aiIdx + 1
      }));
      aiIdx++;
    }
    this.karts = karts;
    this.player = karts[0];
    placeOnGrid(this.karts, this.track);

    /* caméras sur les joueurs */
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.camera.zoom = this.computeZoom();
    const p2 = karts[1] && karts[1].isPlayer ? karts[1] : this.player;
    this.camera2.x = p2.x;
    this.camera2.y = p2.y;
    this.camera2.zoom = this.camera.zoom;
    this.paused = false;

    this.state = 'countdown';
    AudioSys.engineStart();
    return this.track;
  },

  computeZoom: function () {
    const vw = window.innerWidth || 1280, vh = window.innerHeight || 720;
    return clamp(Math.min(vw / CFG.camRefW, vh / CFG.camRefH), CFG.camZoomMin, CFG.camZoomMax);
  },

  /* ============ BOUCLE ============ */
  update: function (dt) {
    if (!this.track) return;
    if (this.paused) return;   // pause : simulation figée
    Input.pollGamepads();

    if (this.state === 'countdown') {
      const prev = this.countdownT;
      this.countdownT -= dt;
      const c = Math.ceil(this.countdownT);
      if (c !== this.lastCount && c >= 1 && c <= 3) { this.lastCount = c; AudioSys.sfx.count(); }
      if (this.countdownT <= 0) {
        this.state = 'racing';
        this.raceTime = 0;
        this.goFlash = 0.9;
        for (const k of this.karts) k.lapStart = 0;
        AudioSys.sfx.go();
        AudioSys.startMusic('race');
      }
      this.updateCamera(dt);
      this.updateParticles(dt);
      return;
    }
    if (this.state === 'finished') {
      /* Roue libre jusqu'à l'affichage des résultats : tout le monde continue
         sur sa lancée, gaz coupé, friction normale. */
      const coast = { up: false, down: false, left: false, right: false, drift: false };
      for (const k of this.karts) kartPhysics(k, coast, this.track, dt);
      this.collideKarts();
      this.rankKarts();
      this.updateCamera(dt);
      this.updateParticles(dt);
      return;
    }
    if (this.state !== 'racing') { this.updateCamera(dt); this.updateParticles(dt); return; }

    this.raceTime += dt * 1000;
    if (this.goFlash > 0) this.goFlash -= dt;

    const track = this.track, total = track.totalLen;

    /* --- entrées + physique --- */
    for (const k of this.karts) {
      if (k.finished) {
        // roue libre après l'arrivée : le kart continue en ligne droite, ralentit
        k.vx *= 0.985; k.vy *= 0.985;
        k.x += k.vx * dt; k.y += k.vy * dt;
        continue;
      }
      let inp;
      if (k.isPlayer) {
        inp = k.playerIndex === 2 ? Input.p2 : Input.p1;
      } else {
        inp = aiInput(k, this.karts, this.player, track, this.config.difficulte);
      }
      kartPhysics(k, inp, track, dt);
    }

    /* --- collisions karts (cercles) --- */
    this.collideKarts();

    /* --- progression / tours / secteurs / boosts --- */
    for (const k of this.karts) {
      if (k.finished) continue;
      const near = track.nearest(k.x, k.y, k.lastIdx);
      let ds = near.s - k.sPrev;
      if (ds > total / 2) ds -= total; else if (ds < -total / 2) ds += total;
      k.dist += ds;
      k.sPrev = near.s;
      k.lastIdx = near.index;
      k.signedDist = near.signed;

      /* secteurs ordonnés 0→1→2→3 */
      const sec = Math.floor(near.s / total * 4) % 4;
      if (sec === k.sectorStep) {
        k.sectorMask |= (1 << sec);
        k.sectorStep = (sec + 1) & 3;
      }

      /* passage(s) de ligne */
      while (k.dist >= k.nextLine) {
        const wasStart = k.linesPassed === 0;
        k.linesPassed++;
        k.nextLine += total;
        if (wasStart) {
          // franchissement de la ligne au départ : lance le chrono du tour 1
          k.lapStart = this.raceTime;
          k.sectorMask = 0; k.sectorStep = 0;
        } else {
          const lapTime = this.raceTime - k.lapStart;
          k.lastLap = lapTime;
          if (k.sectorMask === 0b1111) {
            if (k.bestLap == null || lapTime < k.bestLap) k.bestLap = lapTime;
            if (k.isPlayer) AudioSys.sfx.lap();
          }
          k.lapStart = this.raceTime;
          k.sectorMask = 0; k.sectorStep = 0;
          k.lap = Math.min(k.linesPassed, this.tours);
          if (k.linesPassed > this.tours) {
            k.finished = true;
            k.finishTime = this.raceTime;
          }
        }
      }

      /* boosts */
      if (k.boostCd <= 0) {
        for (const b of track.boosts) {
          const dx = k.x - b.x, dy = k.y - b.y;
          if (dx * dx + dy * dy < CFG.boostRadius * CFG.boostRadius) {
            k.boostTime = CFG.boostTime;
            k.boostCd = CFG.boostCooldown;
            if (k.isPlayer) AudioSys.sfx.turbo();
            this.spawnBoostBurst(k);
            break;
          }
        }
      }

      /* mini-turbo (sortie de drift) : détection du front montant */
      if (k.miniTurbo > 0 && !(k._prevMiniTurbo > 0)) {
        k.score = (k.score || 0) + CFG.miniTurboPoints;
        if (k.isPlayer) AudioSys.sfx.miniTurbo();
        this.spawnStarBurst(k, 9);
        this.spawnTextPop(k, '+' + CFG.miniTurboPoints);
      }
      k._prevMiniTurbo = k.miniTurbo;

      /* particules de drift / mini-turbo / boost */
      if (k.drift && Math.abs(k.speed) > 140 && Math.random() < 0.5) this.spawnDriftPuff(k);
      if ((k.miniTurbo > 0 || k.boostTime > 0) && Math.random() < 0.55) this.spawnBoostPuff(k);
    }

    /* --- positions --- */
    this.rankKarts();

    /* --- moteur audio --- */
    const p = this.player;
    AudioSys.engineUpdate(Math.abs(p.speed) / (CFG.baseMaxSpd + CFG.spdPerVit * p.stats.v),
      (p.boostTime || 0) > 0 || (p.miniTurbo || 0) > 0);

    this.updateCamera(dt);
    this.updateParticles(dt);

    /* --- fin de course (le joueur a fini) --- */
    /* Choix assumé (revue M6, ne pas « corriger ») : la fin de course est
       déclenchée par le JOUEUR 1 uniquement. Dès que P1 franchit la ligne,
       state passe à 'finished', les autres karts passent en roue libre et
       le classement est figé à cet instant. En 2P, la course s'arrête quand
       P1 termine, même si P2 n'a pas franchi la ligne. */
    if (this.player.finished && this.state === 'racing') {
      this.state = 'finished';
      AudioSys.stopMusic();
      AudioSys.engineStop();
      const result = this.buildResult();
      this._result = result;
      const cb = this.onFinish;
      if (cb) setTimeout(function () { cb(result); }, 900);
    }
  },

  collideKarts: function () {
    const ks = this.karts, r = CFG.kartRadius * 2;
    for (let i = 0; i < ks.length; i++) {
      for (let j = i + 1; j < ks.length; j++) {
        const a = ks[i], b = ks[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 >= r * r || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d, ny = dy / d;
        const overlap = (r - d) * 0.5; /* séparation totale = 1.0 × pénétration (aucun rebond) */
        a.x -= nx * overlap; a.y -= ny * overlap;
        b.x += nx * overlap; b.y += ny * overlap;
        /* impulsion normale si les karts se rapprochent */
        const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
        const rel = rvx * nx + rvy * ny;
        if (rel < 0) {
          const imp = -rel * 0.5;
          a.vx -= nx * imp; a.vy -= ny * imp;
          b.vx += nx * imp; b.vy += ny * imp;
          a.vx *= (1 - CFG.collisionSpeedLoss); a.vy *= (1 - CFG.collisionSpeedLoss);
          b.vx *= (1 - CFG.collisionSpeedLoss); b.vy *= (1 - CFG.collisionSpeedLoss);
          if (Math.abs(rel) > 140) {
            AudioSys.sfx.collision();
            this.spawnSparks((a.x + b.x) / 2, (a.y + b.y) / 2);
          }
        }
      }
    }
  },

  rankKarts: function () {
    const arr = this.karts.slice();
    arr.sort(function (a, b) {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.dist - a.dist;
    });
    for (let i = 0; i < arr.length; i++) arr[i].position = i + 1;
  },

  buildResult: function () {
    const ranking = this.karts.slice().sort(function (a, b) {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.dist - a.dist;
    }).map(function (k, i) {
      return {
        position: i + 1, name: k.name, isPlayer: k.isPlayer,
        playerIndex: k.playerIndex || 0,
        charId: k.charId, color: k.color,
        finished: k.finished, finishTime: k.finishTime,
        bestLap: k.bestLap, lap: k.lap, dist: k.dist,
        score: k.score || 0
      };
    });
    const players = ranking.filter(function (r) { return r.isPlayer; });
    return {
      circuitId: this.config.circuitId,
      tours: this.tours,
      joueurs: this.config.joueurs || 1,
      ranking: ranking,
      players: players,
      playerTime: this.player.finishTime,
      playerBestLap: this.player.bestLap,
      playerPosition: this.player.position,
      playerScore: this.player.score || 0
    };
  },

  updateCamera: function (dt) {
    const t = this.state === 'countdown' ? 1 : CFG.camLerp; // snap au départ ? non : lerp doux partout
    const zoom = this.computeZoom();
    const follow = function (cam, p) {
      cam.zoom = zoom;
      const tx = p.x + p.vx * CFG.camAhead, ty = p.y + p.vy * CFG.camAhead;
      cam.x = lerp(cam.x, tx, t);
      cam.y = lerp(cam.y, ty, t);
    };
    if (this.player) follow(this.camera, this.player);
    const p2 = this.karts[1] && this.karts[1].isPlayer ? this.karts[1] : null;
    if (p2) follow(this.camera2, p2);
  },

  /* Arrêt propre de la course (bouton « Quitter » de la pause) :
     aucun record n'est enregistré. */
  stopRace: function () {
    this.state = 'idle';
    this.paused = false;
    AudioSys.stopMusic();
    AudioSys.engineStop();
  },

  /* ============ particules ============ */
  spawnDriftPuff: function (k) {
    if (this.particles.length > 140) return;
    const back = k.angle + Math.PI + rand(-0.4, 0.4);
    this.particles.push({
      x: k.x + Math.cos(back) * 18, y: k.y + Math.sin(back) * 18,
      vx: Math.cos(back) * 60 + rand(-20, 20), vy: Math.sin(back) * 60 + rand(-20, 20),
      life: 0.55, maxLife: 0.55, size: rand(5, 10), color: '230,230,230'
    });
  },
  /* Étoile filante (particule dorée en forme d'étoile) */
  spawnStar: function (x, y, vx, vy, life, size) {
    if (this.particles.length > 150) return;
    this.particles.push({
      x: x, y: y, vx: vx, vy: vy,
      life: life, maxLife: life, size: size,
      color: '255,214,102',
      shape: 'star',
      rot: rand(0, Math.PI * 2), vr: rand(-4, 4)
    });
  },
  /* Gerbe d'étoiles derrière le kart (boost franchi / mini-turbo) */
  spawnStarBurst: function (k, n) {
    for (let i = 0; i < (n || 10); i++) {
      const back = k.angle + Math.PI + rand(-0.7, 0.7);
      const sp = rand(120, 260);
      this.spawnStar(
        k.x + Math.cos(back) * 14, k.y + Math.sin(back) * 14,
        Math.cos(back) * sp + k.vx * 0.35, Math.sin(back) * sp + k.vy * 0.35,
        rand(0.5, 0.85), rand(5, 9)
      );
    }
  },
  /* Texte flottant « +10 » au-dessus du kart */
  spawnTextPop: function (k, txt) {
    if (this.particles.length > 150) return;
    this.particles.push({
      x: k.x, y: k.y - 26,
      vx: rand(-12, 12), vy: -68,
      life: 0.95, maxLife: 0.95, size: 15,
      shape: 'text', text: txt, color: '255,230,110'
    });
  },
  spawnBoostBurst: function (k) {
    this.spawnStarBurst(k, 12);
    this.spawnTextPop(k, 'BOOST !');
  },
  spawnBoostPuff: function (k) {
    if (this.particles.length > 150) return;
    const back = k.angle + Math.PI + rand(-0.45, 0.45);
    this.spawnStar(
      k.x + Math.cos(back) * 18, k.y + Math.sin(back) * 18,
      Math.cos(back) * rand(90, 170) + k.vx * 0.3,
      Math.sin(back) * rand(90, 170) + k.vy * 0.3,
      rand(0.4, 0.7), rand(5, 10)
    );
  },
  spawnSparks: function (x, y) {
    if (this.particles.length > 150) return;
    for (let i = 0; i < 8; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(60, 160);
      this.particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.35, maxLife: 0.35, size: rand(2, 5), color: '255,240,140'
      });
    }
  },
  updateParticles: function (dt) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.96; p.vy *= 0.96;
      if (p.rot !== undefined) p.rot += (p.vr || 0) * dt;
      if (p.shape === 'text') p.vy *= 0.985; // le texte lève plus doucement
    }
  }
};
