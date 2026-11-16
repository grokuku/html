/* ============================================================
   VROOMIIIES — track.js
   Construction runtime d'un circuit :
   Catmull-Rom fermée → polyline échantillonnée (SPL points/segment),
   longueur cumulée, recherche du point le plus proche FENÊTRÉE
   (±NEAR_WIN) avec repli global, secteurs, boosts, pré-rendu offscreen.
   ============================================================ */
'use strict';

const SPL = 28;          // échantillons par segment de spline
const NEAR_WIN = 26;     // fenêtre de recherche autour du dernier index
const NEAR_FALLBACK = 150 * 150; // au-delà → recherche globale

/* Catmull-Rom fermée : point interpolé entre p1 et p2 */
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = function (a, b, c, d) {
    return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  };
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

function buildTrack(def) {
  const raw = def.points;
  const nSeg = raw.length;

  /* --- Échantillonnage --- */
  const sx = [], sy = [], stx = [], sty = [], snx = [], sny = [], cumul = [];
  for (let i = 0; i < nSeg; i++) {
    const p0 = raw[(i - 1 + nSeg) % nSeg], p1 = raw[i], p2 = raw[(i + 1) % nSeg], p3 = raw[(i + 2) % nSeg];
    for (let j = 0; j < SPL; j++) {
      const t = j / SPL;
      const pt = catmullRom(p0, p1, p2, p3, t);
      // tangente analytique (dérivée de la spline)
      const t2 = t * t;
      const df = function (a, b, c, d) {
        return 0.5 * ((-a + c) + 2 * (2 * a - 5 * b + 4 * c - d) * t + 3 * (-a + 3 * b - 3 * c + d) * t2);
      };
      let tx = df(p0[0], p1[0], p2[0], p3[0]);
      let ty = df(p0[1], p1[1], p2[1], p3[1]);
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      sx.push(pt[0]); sy.push(pt[1]);
      stx.push(tx); sty.push(ty);
      snx.push(-ty); sny.push(tx);      // normale "gauche" (perpendiculaire)
      cumul.push(0);
    }
  }
  const n = sx.length;
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) total += dist(sx[i - 1], sy[i - 1], sx[i], sy[i]);
    cumul[i] = total;
  }
  total += dist(sx[n - 1], sy[n - 1], sx[0], sy[0]); // boucle fermée
  const totalLen = total;

  /* --- Bornes monde (+ marge pour le décor) --- */
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    if (sx[i] < minX) minX = sx[i]; if (sx[i] > maxX) maxX = sx[i];
    if (sy[i] < minY) minY = sy[i]; if (sy[i] > maxY) maxY = sy[i];
  }
  const M = def.width / 2 + 175;
  minX -= M; minY -= M; maxX += M; maxY += M;
  const world = { minX: minX, minY: minY, w: maxX - minX, h: maxY - minY };

  /* --- Point sur la piste à l'abscisse curviligne s --- */
  function pointAt(s) {
    s = ((s % totalLen) + totalLen) % totalLen;
    // recherche binaire dans cumul[]
    let lo = 0, hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (cumul[mid] <= s) lo = mid; else hi = mid - 1;
    }
    const i0 = lo, i1 = (lo + 1) % n;
    const segLen = (i1 === 0) ? (totalLen - cumul[i0]) : (cumul[i1] - cumul[i0]);
    const f = segLen > 0 ? (s - cumul[i0]) / segLen : 0;
    let tx = lerp(stx[i0], stx[i1], f), ty = lerp(sty[i0], sty[i1], f);
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    return {
      x: lerp(sx[i0], sx[i1], f), y: lerp(sy[i0], sy[i1], f),
      tx: tx, ty: ty, nx: -ty, ny: tx, s: s
    };
  }

  /* --- Plus proche échantillon (fenêtré, repli global) --- */
  function nearest(x, y, lastIdx) {
    let best = -1, bestD2 = Infinity;
    if (lastIdx != null && lastIdx >= 0 && lastIdx < n) {
      for (let o = -NEAR_WIN; o <= NEAR_WIN; o++) {
        const i = ((lastIdx + o) % n + n) % n;
        const dx = x - sx[i], dy = y - sy[i], d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = i; }
      }
      if (bestD2 > NEAR_FALLBACK) { best = -1; bestD2 = Infinity; } // trop loin → global
    }
    if (best === -1) {
      for (let i = 0; i < n; i++) {
        const dx = x - sx[i], dy = y - sy[i], d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; best = i; }
      }
    }
    const dx = x - sx[best], dy = y - sy[best];
    const signed = dx * snx[best] + dy * sny[best]; // >0 à gauche de la normale
    return { index: best, dist: Math.sqrt(bestD2), signed: signed, s: cumul[best] };
  }

  /* --- Boosts (positions absolues) --- */
  const boosts = (def.boosts || []).map(function (frac) {
    const p = pointAt(frac * totalLen);
    return { s: frac * totalLen, x: p.x, y: p.y, angle: Math.atan2(p.ty, p.tx) };
  });

  /* --- Pré-rendu offscreen (fond + décor + piste + ligne d'arrivée) --- */
  const off = document.createElement('canvas');
  off.width = Math.ceil(world.w); off.height = Math.ceil(world.h);
  const octx = off.getContext('2d');
  // fond (uni ou dégradé vertical)
  if (def.theme.bgGradient) {
    const g = octx.createLinearGradient(0, 0, 0, off.height);
    g.addColorStop(0, def.theme.bgGradient[0]);
    g.addColorStop(1, def.theme.bgGradient[1]);
    octx.fillStyle = g;
  } else {
    octx.fillStyle = def.theme.bg;
  }
  octx.fillRect(0, 0, off.width, off.height);
  // décor (coordonnées monde) — reçoit un test « hors-piste » pour se placer
  const isFree = makeCorridorTest(sx, sy, n, def.width);
  octx.save();
  octx.translate(-world.minX, -world.minY);
  if (typeof Decor !== 'undefined' && Decor.render) Decor.render(octx, def, world, isFree);
  // piste : liseré externe optionnel, liseré, remplissage
  octx.lineJoin = 'round'; octx.lineCap = 'round';
  octx.beginPath();
  octx.moveTo(sx[0], sy[0]);
  for (let i = 1; i < n; i++) octx.lineTo(sx[i], sy[i]);
  octx.closePath();
  if (def.theme.outline) {
    octx.strokeStyle = def.theme.outline;
    octx.lineWidth = def.width + def.theme.borderW * 2 + (def.theme.outlineW || 7) * 2;
    octx.stroke();
  }
  octx.strokeStyle = def.theme.border;
  octx.lineWidth = def.width + def.theme.borderW * 2;
  octx.stroke();
  octx.strokeStyle = def.theme.track;
  octx.lineWidth = def.width;
  octx.stroke();
  // pointillés centraux
  octx.strokeStyle = def.theme.line;
  octx.lineWidth = 6;
  octx.setLineDash(def.theme.dash || [28, 24]);
  octx.globalAlpha = 0.9;
  octx.stroke();
  octx.setLineDash([]);
  octx.globalAlpha = 1;
  // pont au croisement (circuits ∞) : par-dessus la piste, avant la ligne d'arrivée
  if (def.bridge) drawBridge(octx, def);
  // ligne d'arrivée : damier perpendiculaire à la piste
  (function startLine() {
    const p = pointAt(0);
    octx.save();
    octx.translate(p.x, p.y);
    octx.rotate(Math.atan2(p.ty, p.tx)); // x local = sens de la piste
    const rows = 2, cols = 8, rowH = 12, cellW = def.width / cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        octx.fillStyle = (r + c) % 2 === 0 ? (def.theme.startA || '#1A1A1A') : (def.theme.startB || '#FFFFFF');
        octx.fillRect(-rowH + r * rowH, -def.width / 2 + c * cellW, rowH, cellW);
      }
    }
    // badge éventuel au centre de la ligne (ex. « 1 » de la Banquise)
    if (def.theme.startBadge) {
      const rr = Math.min(30, def.width * 0.24);
      octx.beginPath(); octx.arc(0, 0, rr, 0, Math.PI * 2);
      octx.fillStyle = '#FFFFFF'; octx.fill();
      octx.lineWidth = 3.5; octx.strokeStyle = 'rgba(30,30,60,0.85)'; octx.stroke();
      octx.fillStyle = '#22304A';
      octx.font = 'bold ' + Math.round(rr * 1.15) + 'px "Comic Sans MS", "Trebuchet MS", sans-serif';
      octx.textAlign = 'center'; octx.textBaseline = 'middle';
      octx.fillText(String(def.theme.startBadge), 0, 1);
    }
    octx.restore();
  })();
  octx.restore();

  return {
    def: def,
    width: def.width,
    totalLen: totalLen,
    count: n,
    world: world,
    off: off,
    boosts: boosts,
    pointAt: pointAt,
    nearest: nearest,
    /* accès bruts (debug) */
    _samples: { x: sx, y: sy, cumul: cumul, n: n }
  };
}

/* Prédicat « hors-piste » pour le décor : true si le point (x,y)
   est à plus de (width/2 + clearance) de l'axe de la piste. */
function makeCorridorTest(sx, sy, n, width) {
  const half = width / 2;
  return function isFree(x, y, clearance) {
    const c = half + (clearance || 0);
    const c2 = c * c;
    for (let i = 0; i < n; i += 2) {
      const dx = x - sx[i], dy = y - sy[i];
      if (dx * dx + dy * dy < c2) return false;
    }
    return true;
  };
}

/* Pont au croisement (circuits ∞) : dessiné PAR-DESSUS la piste.
   La branche « sous » le pont est masquée par le tablier ; la branche
   « sur » est redessinée par-dessus pour donner l'effet de relief. */
function drawBridge(ctx, def) {
  const b = def.bridge;
  const theme = def.theme;
  const w = def.width;
  const borderW = theme.borderW || 10;
  const L = b.w || 250;                 // longueur du tablier (axe du pont)
  const H = w + borderW * 2 + 68;       // largeur du tablier (masque la branche basse + rebords visibles)
  const railH = 15;

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle || 0);

  // ombre portée du tablier
  ctx.fillStyle = 'rgba(20, 22, 40, 0.38)';
  ctx.beginPath(); ctx.roundRect(-L / 2 + 7, -H / 2 + 12, L, H, 18); ctx.fill();

  // tablier
  ctx.fillStyle = b.deck || '#B9C6DE';
  ctx.beginPath(); ctx.roundRect(-L / 2, -H / 2, L, H, 18); ctx.fill();
  // rives d'extrémité (face avant du tablier, côté "bas" du pont)
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.roundRect(-L / 2, H / 2 - 9, L, 9, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-L / 2, -H / 2, L, 5, 3); ctx.fill();
  // lames du tablier
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 3;
  for (let x = -L / 2 + 34; x < L / 2 - 8; x += 36) {
    ctx.beginPath(); ctx.moveTo(x, -H / 2 + 10); ctx.lineTo(x, H / 2 - 10); ctx.stroke();
  }
  // branche « sur » : on redessine la piste par-dessus le tablier
  ctx.fillStyle = theme.border;
  ctx.fillRect(-L / 2, -(w / 2 + borderW), L, w + borderW * 2);
  ctx.fillStyle = theme.track;
  ctx.fillRect(-L / 2, -w / 2, L, w);
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 5;
  ctx.setLineDash(theme.dash || [28, 24]);
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2, 0); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // rails (garde-corps) haut et bas
  ctx.fillStyle = b.rail || '#6FA8DC';
  ctx.beginPath(); ctx.roundRect(-L / 2, -H / 2, L, railH, 7); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-L / 2, H / 2 - railH, L, railH, 7); ctx.fill();
  // reflet sur les rails
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-L / 2 + 8, -H / 2 + 2.5, L - 16, 4);
  ctx.fillRect(-L / 2 + 8, H / 2 - railH + 2.5, L - 16, 4);
  // rivets
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  const rivet = function (x, y) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); };
  for (let x = -L / 2 + 18; x <= L / 2 - 18; x += 36) {
    rivet(x, -H / 2 + railH / 2);
    rivet(x, H / 2 - railH / 2);
  }
  ctx.restore();
}

/* Dessine le pré-rendu du monde (appelé sous transform caméra) */
function drawTrackWorld(ctx, track) {
  ctx.drawImage(track.off, track.world.minX, track.world.minY);
}
