/* ============================================================
   VROOMIIIES — util.js
   Helpers génériques (maths, temps, aléatoire seedé, texte).
   Chargé en premier. Aucune dépendance.
   ============================================================ */
'use strict';

/* Polyfill CanvasRenderingContext2D.roundRect (Chrome < 99, Safari < 16…).
   Même contrat que le natif : ajoute le tracé au path courant, ne retourne rien. */
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    if (!(w >= 0) || !(h >= 0)) throw new RangeError('roundRect : dimensions invalides');
    let rr;
    if (radii === undefined) rr = [0, 0, 0, 0];
    else if (typeof radii === 'number') rr = [radii, radii, radii, radii];
    else if (Array.isArray(radii)) {
      const a = radii.map(Number);
      if (a.length === 0) rr = [0, 0, 0, 0];
      else if (a.length === 1) rr = [a[0], a[0], a[0], a[0]];
      else if (a.length === 2) rr = [a[0], a[1], a[0], a[1]];
      else if (a.length === 3) rr = [a[0], a[1], a[2], a[1]];
      else rr = [a[0], a[1], a[2], a[3]];
    } else {
      rr = [0, 0, 0, 0];
    }
    const maxR = Math.min(w, h) / 2;
    rr = rr.map(function (v) { return Math.max(0, Math.min(isFinite(v) ? v : 0, maxR)); });
    const tl = rr[0], tr = rr[1], br = rr[2], bl = rr[3];
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.arcTo(x + w, y, x + w, y + tr, tr);
    this.lineTo(x + w, y + h - br);
    this.arcTo(x + w, y + h, x + w - br, y + h, br);
    this.lineTo(x + br, y + h);
    this.arcTo(x, y + h, x, y + h - bl, bl);
    this.lineTo(x, y + tl);
    this.arcTo(x, y, x + tl, y, tl);
    this.closePath();
  };
}

/* clamp / lerp */
function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }
function lerp(a, b, t) { return a + (b - a) * t; }

/* distance euclidienne */
function dist(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/* Plus petit angle signé delta->target, résultat dans ]-PI, PI] */
function angleDelta(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}
function angleLerp(from, to, t) { return from + angleDelta(from, to) * t; }

/* Aléatoire non seedé */
function rand(min, max) {
  if (min === undefined) { min = 0; max = 1; }
  else if (max === undefined) { max = min; min = 0; }
  return min + Math.random() * (max - min);
}

/* PRNG seedé (mulberry32) — décor stable d'une frame à l'autre */
function makeSeededRand(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* mm:ss.cc — ex: 0:07.42 ; null -> --:--.-- */
function fmtTime(ms) {
  if (ms == null || !isFinite(ms)) return '--:--.--';
  ms = Math.max(0, Math.floor(ms));
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return m + ':' + String(s).padStart(2, '0') + '.' + String(cs).padStart(2, '0');
}

/* Ordinal français : 1 -> "1er", sinon "2e", "3e"… */
function ordinalFR(n) { return n === 1 ? '1er' : (n + 'e'); }

/* Échappement HTML (injection dans innerHTML résultats) */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
