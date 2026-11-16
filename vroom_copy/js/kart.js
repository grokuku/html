/* ============================================================
   VROOMIIIES — kart.js
   Création des karts, physique arcade, IA (rubber-band).
   Les constantes d'équilibrage vivent dans CFG (engine.js) ;
   elles ne sont lues qu'à l'exécution, jamais au chargement.
   ============================================================ */
'use strict';

/* Palette de couleurs pour les karts IA (cycle si besoin) */
const AI_COLORS = [
  '#B8B8B8', '#FF8A5C', '#9BE15D', '#F67280', '#C06C84', '#6C5B7B',
  '#355C7D', '#F8B195', '#F67280', '#99B898', '#FECEAB', '#FF847C',
  '#E84A5F', '#2A9D8F', '#E9C46A', '#F4A261', '#BC6C25', '#606C38',
  '#283618', '#DDA15E', '#A8DADC', '#457B9D', '#E63946', '#F1FAEE',
  '#FFB4A2', '#E5989B', '#B56576', '#6D6875', '#B5838D'
];

function createKart(opts) {
  return {
    id: opts.id,
    name: opts.name,
    isPlayer: !!opts.isPlayer,
    playerIndex: opts.playerIndex || 0,
    charId: opts.charId || null,
    color: opts.color,
    dark: opts.dark || shadeColor(opts.color, -28),
    stats: { v: opts.stats.v, a: opts.stats.a, m: opts.stats.m },
    /* état dynamique */
    x: 0, y: 0, angle: 0, vx: 0, vy: 0,
    speed: 0,                 // vF (signée)
    signedDist: 0,            // distance signée à l'axe (+ = gauche)
    offTrack: false,
    sPrev: 0, dist: 0, lastIdx: -1,
    lap: 1, linesPassed: 0, nextLine: 0,
    lapStart: 0, bestLap: null, lastLap: null,
    sectorMask: 0, sectorStep: 0,
    drift: false, driftTime: 0,
    miniTurbo: 0, boostTime: 0, boostCd: 0,
    score: 0, _prevMiniTurbo: 0,
    aiPhase: (opts.aiSeed || 0) * 2.39996, // angle d'or → offsets variés
    aiSpeedMul: 1,
    finished: false, finishTime: null,
    position: 1,
    radius: 17
  };
}

/* Assombrit/éclaircit une couleur hexa (#RRGGBB) */
function shadeColor(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
  r = clamp(r, 0, 255); g = clamp(g, 0, 255); b = clamp(b, 0, 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/* ---------- Physique arcade (dt fourni par l'appelant ; main.js : pas fixe 1/60 s, dt brut plafonné à 0,1 s) ---------- */
function kartPhysics(k, inp, track, dt) {
  const st = k.stats;
  const baseMax = CFG.baseMaxSpd + CFG.spdPerVit * st.v;
  let maxSpd = baseMax;
  const offTrack = Math.abs(k.signedDist) > track.width / 2;
  k.offTrack = offTrack;
  if (offTrack) maxSpd *= CFG.offRoadMaxMul;
  if (k.miniTurbo > 0) { maxSpd *= CFG.miniTurboMul; k.miniTurbo -= dt; }
  if (k.boostTime > 0) { maxSpd *= CFG.boostMul; k.boostTime -= dt; }
  if (k.boostCd > 0) k.boostCd -= dt;
  if (!k.isPlayer && k.aiSpeedMul) maxSpd *= k.aiSpeedMul;

  let fwdX = Math.cos(k.angle), fwdY = Math.sin(k.angle);
  let rgtX = -fwdY, rgtY = fwdX;
  let vF = k.vx * fwdX + k.vy * fwdY;
  let vL = k.vx * rgtX + k.vy * rgtY;

  const engine = (CFG.engineBase + CFG.enginePerAccel * st.a) * (k.boostTime > 0 ? CFG.boostAccelMul : 1);
  const drag = offTrack ? CFG.drag * CFG.offRoadDragMul : CFG.drag;

  const steerIn = ((inp.left ? -1 : 0) + (inp.right ? 1 : 0));
  const braking = !!inp.down;

  /* --- drift : frein + braquage > 55 % de la vitesse max --- */
  if (!k.drift && braking && steerIn !== 0 && vF > CFG.driftMinSpeedRatio * baseMax) {
    k.drift = true; k.driftTime = 0;
  }
  if (k.drift) {
    const holding = braking && steerIn !== 0;
    if (holding) k.driftTime += dt;
    else {
      if (k.driftTime >= CFG.driftMinTime && vF > 0) k.miniTurbo = CFG.miniTurboTime;
      k.drift = false; k.driftTime = 0;
    }
  }

  /* --- longitudinal --- */
  vF -= drag * vF * dt;
  if (inp.up) vF += engine * dt;
  if (inp.down) {
    if (vF > 40) vF -= CFG.brakeForce * dt;
    else vF = Math.max(-CFG.maxRev, vF - CFG.reverseForce * dt);
  }
  vF = clamp(vF, -CFG.maxRev, maxSpd);

  /* --- adhérence latérale --- */
  const grip = offTrack ? CFG.gripOffRoad : (k.drift ? CFG.gripDrift : CFG.gripRoad);
  vL *= Math.pow(grip, dt * 60);

  /* --- direction --- */
  const steerRate = CFG.steerBase + CFG.steerPerMani * st.m;
  const authority = clamp(1.15 - Math.abs(vF) / baseMax * 0.55, 0.45, 1.15) * (k.drift ? 1.35 : 1);
  const speedFactor = clamp(Math.abs(vF) / 130, 0, 1);
  k.angle += steerIn * steerRate * authority * speedFactor * dt * (vF >= 0 ? 1 : -1);

  /* --- recomposition de la vitesse avec le NOUVEL angle --- */
  fwdX = Math.cos(k.angle); fwdY = Math.sin(k.angle);
  rgtX = -fwdY; rgtY = fwdX;
  k.vx = fwdX * vF + rgtX * vL;
  k.vy = fwdY * vF + rgtY * vL;
  k.speed = vF;

  k.x += k.vx * dt;
  k.y += k.vy * dt;
}

/* ---------- IA ---------- */
const AI_DIFFICULTY = {
  facile: { factor: 0.80, band: 0.30 },
  normal: { factor: 1.00, band: 0.15 },
  expert: { factor: 1.12, band: 0.06 }
};

function aiInput(k, karts, player, track, difficulty) {
  const cfg = AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.normal;
  const ahead = 55 + Math.abs(k.speed) * 0.45;
  const target = track.pointAt(k.dist + ahead);
  const lat = Math.sin(k.aiPhase + k.dist * 0.0016) * 0.32 * track.width;
  const tx = target.x + target.nx * lat, ty = target.y + target.ny * lat;
  const ang = Math.atan2(ty - k.y, tx - k.x);
  let dAng = angleDelta(k.angle, ang);

  /* évitement léger : kart devant dans le cône avant */
  for (let i = 0; i < karts.length; i++) {
    const o = karts[i];
    if (o === k) continue;
    const dx = o.x - k.x, dy = o.y - k.y;
    const fwdX = Math.cos(k.angle), fwdY = Math.sin(k.angle);
    const along = dx * fwdX + dy * fwdY;
    if (along > 8 && along < 85) {
      const side = dx * (-fwdY) + dy * fwdX; // >0 à gauche
      if (Math.abs(side) < 34) dAng += (side >= 0 ? -1 : 1) * 0.35;
    }
  }

  const inp = {
    up: Math.abs(dAng) < 1.1,
    down: Math.abs(dAng) >= 1.1 && Math.abs(k.speed) > 120,
    left: dAng < -0.06,
    right: dAng > 0.06,
    drift: false
  };
  /* rubber-banding : les IA derrière le joueur (le plus proche en 2P) accélèrent,
     celles devant ralentissent. Band conservé selon la difficulté (0.30/0.15/0.06). */
  let ref = player;
  if (karts) {
    let best = null;
    for (let i = 0; i < karts.length; i++) {
      const o = karts[i];
      if (!o.isPlayer) continue;
      if (!best || Math.abs(o.dist - k.dist) < Math.abs(best.dist - k.dist)) best = o;
    }
    if (best) ref = best;
  }
  const diff = clamp(((ref ? ref.dist : k.dist) - k.dist) / 2600, -1, 1) * cfg.band;
  k.aiSpeedMul = cfg.factor * (1 + diff);
  return inp;
}

/* ---------- Placement sur la grille ---------- */
function placeOnGrid(karts, track) {
  for (let i = 0; i < karts.length; i++) {
    const k = karts[i];
    const row = Math.floor(i / 2), col = i % 2;
    const back = CFG.gridBack + row * CFG.gridGap;
    const lat = (col === 0 ? -1 : 1) * CFG.gridLat;
    const p = track.pointAt(-back);
    k.x = p.x + p.nx * lat;
    k.y = p.y + p.ny * lat;
    k.angle = Math.atan2(p.ty, p.tx);
    k.vx = 0; k.vy = 0; k.speed = 0;
    k.dist = -back;
    const near = track.nearest(k.x, k.y, null);
    k.sPrev = near.s; k.lastIdx = near.index; k.signedDist = near.signed;
    k.lap = 1; k.linesPassed = 0; k.nextLine = 0;
    k.lapStart = 0; k.bestLap = null; k.lastLap = null;
    k.sectorMask = 0; k.sectorStep = 0;
    k.drift = false; k.driftTime = 0;
    k.miniTurbo = 0; k.boostTime = 0; k.boostCd = 0;
    k.finished = false; k.finishTime = null;
    k.position = i + 1;
  }
}
