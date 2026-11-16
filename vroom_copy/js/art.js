/* ============================================================
   VROOMIIIES — art.js
   Helpers de dessin partagés (DOM side, pas le moteur) :
   - drawAvatar(canvas, charId, size, opts) : portrait kawaii du
     personnage (tête ronde + accessoires), utilisé par les menus,
     le HUD et le podium.
   - renderTrackThumbnail(def, canvas, w, h) : mini-carte du tracé
     (fond thémé + piste simplifiée + point de départ) pour les
     cartes circuit des menus.
   ============================================================ */
'use strict';

/* ---------- Avatar de personnage ---------- */
function drawAvatar(canvas, charId, size, opts) {
  if (!canvas) return;
  opts = opts || {};
  const ch = CHARACTERS[charId] || CHARACTERS.mimi;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const S = size || 96;
  canvas.width = Math.round(S * dpr);
  canvas.height = Math.round(S * dpr);
  canvas.style.width = S + 'px';
  canvas.style.height = S + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, S, S);

  const cx = S / 2, cy = S / 2 + S * 0.04;
  const R = S * 0.335;               // rayon de la tête
  const dark = ch.dark, col = ch.color;

  /* fond pastille optionnel (menus) */
  if (opts.disc !== false) {
    ctx.beginPath(); ctx.arc(cx, cy, S * 0.46, 0, Math.PI * 2);
    ctx.fillStyle = opts.discBg || '#FFF3FA';
    ctx.fill();
    ctx.lineWidth = S * 0.045;
    ctx.strokeStyle = col;
    ctx.stroke();
  }

  /* oreilles / éléments derrière la tête */
  ctx.fillStyle = col;
  ctx.strokeStyle = dark;
  ctx.lineWidth = S * 0.028;
  if (charId === 'boubou') {           // oreilles d'ourson
    for (const sgn of [-1, 1]) {
      ctx.beginPath(); ctx.arc(cx + sgn * R * 0.62, cy - R * 0.78, R * 0.38, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#F6D9C4';
      ctx.beginPath(); ctx.arc(cx + sgn * R * 0.62, cy - R * 0.78, R * 0.17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
    }
  } else if (charId === 'ziggy') {     // crête de poussin
    ctx.beginPath();
    const base = cy - R * 0.86;
    ctx.moveTo(cx - R * 0.42, base + R * 0.18);
    ctx.quadraticCurveTo(cx - R * 0.30, base - R * 0.42, cx - R * 0.14, base + R * 0.02);
    ctx.quadraticCurveTo(cx, base - R * 0.52, cx + R * 0.14, base + R * 0.02);
    ctx.quadraticCurveTo(cx + R * 0.30, base - R * 0.42, cx + R * 0.42, base + R * 0.18);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (charId === 'coco') {      // feuilles de menthe sur le côté
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + sgn * R * 0.55, cy - R * 0.88);
      ctx.rotate(sgn * 0.55);
      ctx.fillStyle = '#3E9E6E';
      ctx.beginPath(); ctx.ellipse(0, 0, R * 0.42, R * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = col;
  }

  /* tête */
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = col; ctx.fill();
  ctx.lineWidth = S * 0.035; ctx.strokeStyle = dark; ctx.stroke();

  /* mèche pour mimi (cheveux sous le nœud) */
  if (charId === 'mimi') {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.35, cy - R * 0.82);
    ctx.quadraticCurveTo(cx - R * 0.1, cy - R * 1.02, cx + R * 0.16, cy - R * 0.8);
    ctx.quadraticCurveTo(cx - R * 0.05, cy - R * 0.72, cx - R * 0.35, cy - R * 0.66);
    ctx.closePath(); ctx.fill();
  }

  /* yeux kawaii : grands ovales + double reflet */
  const eyeY = cy + R * 0.02, eyeDX = R * 0.38, eyeR = R * 0.155;
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = '#33232E';
    ctx.beginPath(); ctx.ellipse(cx + sgn * eyeDX, eyeY, eyeR * 0.82, eyeR, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(cx + sgn * eyeDX - eyeR * 0.28, eyeY - eyeR * 0.32, eyeR * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + sgn * eyeDX + eyeR * 0.25, eyeY + eyeR * 0.28, eyeR * 0.16, 0, Math.PI * 2); ctx.fill();
  }

  /* blush */
  ctx.fillStyle = 'rgba(255,110,150,0.5)';
  for (const sgn of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(cx + sgn * R * 0.58, cy + R * 0.34, R * 0.17, R * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  }

  /* sourire */
  ctx.strokeStyle = '#33232E';
  ctx.lineWidth = S * 0.022;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy + R * 0.28, R * 0.3, Math.PI * 0.18, Math.PI * 0.82); ctx.stroke();

  /* accessoires au premier plan */
  if (charId === 'mimi') {             // nœud
    const bx = cx + R * 0.42, by = cy - R * 0.86, s = R * 0.42;
    ctx.fillStyle = '#FF5FA2';
    ctx.strokeStyle = '#D63D7F';
    ctx.lineWidth = S * 0.02;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + sgn * s, by - s * 0.62);
      ctx.lineTo(bx + sgn * s, by + s * 0.62);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(bx, by, s * 0.34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (charId === 'pixel') {     // éclair
    ctx.fillStyle = '#FFE93C';
    ctx.strokeStyle = '#D9B800';
    ctx.lineWidth = S * 0.018;
    ctx.save();
    ctx.translate(cx - R * 0.34, cy - R * 0.62);
    ctx.rotate(-0.28);
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.34); ctx.lineTo(R * 0.2, -R * 0.04); ctx.lineTo(R * 0.02, -R * 0.04);
    ctx.lineTo(R * 0.34, R * 0.36); ctx.lineTo(-R * 0.06, R * 0.0); ctx.lineTo(R * 0.12, R * 0.0);
    ctx.lineTo(-R * 0.22, -R * 0.34);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else if (charId === 'louna') {     // étoile
    ctx.save();
    ctx.translate(cx + R * 0.48, cy - R * 0.72);
    ctx.rotate(0.25);
    ctx.fillStyle = '#FFF3A0';
    ctx.strokeStyle = '#D9B83A';
    ctx.lineWidth = S * 0.018;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * R * 0.34, Math.sin(a) * R * 0.34);
      ctx.lineTo(Math.cos(a2) * R * 0.15, Math.sin(a2) * R * 0.15);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

/* ---------- Miniature de circuit ---------- */
/* Dessine le tracé (fond thémé + piste + départ) dans un canvas.
   def = TRACKS[id] ; la miniature est générée une fois à l'ouverture du menu. */
function renderTrackThumbnail(def, canvas, w, h) {
  if (!def || !canvas) return;
  w = w || 300; h = h || 190;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  /* fond thémé */
  if (def.theme.bgGradient) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, def.theme.bgGradient[0]);
    g.addColorStop(1, def.theme.bgGradient[1]);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = def.theme.bg;
  }
  ctx.fillRect(0, 0, w, h);

  /* bornes du tracé */
  const pts = def.points;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
  }
  const pad = def.width * 0.62;
  minX -= pad; maxX += pad; minY -= pad; maxY += pad;
  const scale = Math.min(w / (maxX - minX), h / (maxY - minY));
  const ox = (w - (maxX - minX) * scale) / 2 - minX * scale;
  const oy = (h - (maxY - minY) * scale) / 2 - minY * scale;
  const X = function (x) { return x * scale + ox; };
  const Y = function (y) { return y * scale + oy; };

  /* lissage Catmull-Rom pour une vignette fidèle au circuit */
  function pathSpline() {
    ctx.beginPath();
    const n = pts.length;
    const P = function (i) { return pts[((i % n) + n) % n]; };
    const p0 = P(0);
    ctx.moveTo(X(p0[0]), Y(p0[1]));
    for (let i = 0; i < n; i++) {
      const pa = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let j = 1; j <= 10; j++) {
        const t = j / 10, t2 = t * t, t3 = t2 * t;
        const f = function (a, b, c, d) {
          return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        };
        ctx.lineTo(X(f(pa[0], p1[0], p2[0], p3[0])), Y(f(pa[1], p1[1], p2[1], p3[1])));
      }
    }
    ctx.closePath();
  }

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = Math.max(3, def.width * scale);
  if (def.theme.outline) {
    pathSpline(); ctx.strokeStyle = def.theme.outline; ctx.lineWidth = lw + 7; ctx.stroke();
  }
  pathSpline(); ctx.strokeStyle = def.theme.border; ctx.lineWidth = lw + Math.max(2, def.theme.borderW * scale); ctx.stroke();
  pathSpline(); ctx.strokeStyle = def.theme.track; ctx.lineWidth = lw; ctx.stroke();
  /* ligne centrale en pointillés */
  pathSpline();
  ctx.strokeStyle = def.theme.line;
  ctx.lineWidth = Math.max(1.2, 5 * scale);
  ctx.setLineDash([7, 6]);
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  /* départ : petit damier */
  const s = pts[0];
  const sx = X(s[0]), sy = Y(s[1]);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(0, 0, 5.2, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#222'; ctx.stroke();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
