/* ============================================================
   VROOMIIIES — decor.js
   Décor pré-rendu dans le canvas offscreen de la piste.
   Helpers partagés (ellipseShadow, bush, cloud, sparkle, flowerStar)
   + decorPrairie. Dispatcher : Decor.render(ctx, def, world).
   Les autres ambiances arrivent au lot 2.
   Dessiné en COORDONNÉES MONDE (ctx déjà translaté/scalé par track.js).
   ============================================================ */
'use strict';

const Decor = (function () {

  function ellipseShadow(ctx, x, y, rx, ry, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.22 : alpha;
    ctx.fillStyle = '#3A5A52';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function sparkle(ctx, x, y, r, color) {
    ctx.save();
    ctx.fillStyle = color || '#FFF6B8';
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
    ctx.restore();
  }

  function flowerStar(ctx, x, y, r, petal, center) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = petal || '#FF9FD4';
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath(); ctx.ellipse(0, -r * 0.72, r * 0.34, r * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = center || '#FFE066';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function bush(ctx, x, y, r, color) {
    const c = color || '#5FBF8F';
    ellipseShadow(ctx, x, y + r * 0.55, r * 1.25, r * 0.42, 0.18);
    ctx.save();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(x - r * 0.65, y + r * 0.15, r * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.65, y + r * 0.15, r * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - r * 0.35, r * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.55, r * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function cloud(ctx, x, y, s) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(x - 34 * s, y + 6 * s, 18 * s, 0, Math.PI * 2);
    ctx.arc(x, y - 8 * s, 24 * s, 0, Math.PI * 2);
    ctx.arc(x + 34 * s, y + 6 * s, 18 * s, 0, Math.PI * 2);
    ctx.arc(x, y + 10 * s, 30 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ════════════ HELPERS PARTAGÉS (lot 2) ════════════ */

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  }

  /* Cherche une position libre (hors piste) : rend (x,y) ajustée ou null */
  function findFree(isFree, x, y, clearance) {
    if (!isFree || isFree(x, y, clearance)) return { x: x, y: y };
    const tries = [[70, 0], [-70, 0], [0, 70], [0, -70], [95, 70], [-95, 70], [95, -70], [-95, -70], [140, 0], [0, 140]];
    for (let i = 0; i < tries.length; i++) {
      const nx = x + tries[i][0], ny = y + tries[i][1];
      if (isFree(nx, ny, clearance)) return { x: nx, y: ny };
    }
    return null;
  }

  /* Yeux kawaii fermés contents (arcs) */
  function happyEyes(ctx, x, y, spread, r, color) {
    ctx.strokeStyle = color || '#3A2E2E';
    ctx.lineWidth = Math.max(1.6, r * 0.18);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + s * spread, y, r, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  }

  function smile(ctx, x, y, r, color) {
    ctx.strokeStyle = color || '#3A2E2E';
    ctx.lineWidth = Math.max(1.6, r * 0.16);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  }

  /* Étoile à 4 branches scintillante */
  function sparkle4(ctx, x, y, r, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = color || '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
    ctx.restore();
  }

  function boundsOf(world) {
    return { L: world.minX, T: world.minY, R: world.minX + world.w, B: world.minY + world.h,
             W: world.w, H: world.h, CX: world.minX + world.w / 2, CY: world.minY + world.h / 2 };
  }

  /* ~~~~~~~~~~~~~~~~~~~~ PRAIRIE DES DOUDOUS ~~~~~~~~~~~~~~~~~~~~ */
  function decorPrairie(ctx, world) {
    const L = world.minX, R = world.minX + world.w, T = world.minY, B = world.minY + world.h;
    const rnd = makeSeededRand(20240613);

    // Taches d'herbe plus foncées (subtiles)
    ctx.save();
    ctx.fillStyle = 'rgba(90, 160, 140, 0.18)';
    for (let i = 0; i < 26; i++) {
      const x = L + rnd() * world.w, y = T + rnd() * world.h, r = 40 + rnd() * 110;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, rnd() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Petites fleurs éparpillées
    for (let i = 0; i < 46; i++) {
      const x = L + 40 + rnd() * (world.w - 80), y = T + 40 + rnd() * (world.h - 80);
      flowerStar(ctx, x, y, 6 + rnd() * 6, rnd() < 0.5 ? '#FFB3DD' : '#FFFFFF', '#FFE066');
    }

    // Étalage de jouets (haut-gauche) : tente rayée + caisses + blocs
    (function toyStall(x, y) {
      ellipseShadow(ctx, x, y + 66, 150, 26, 0.22);
      // poteaux
      ctx.fillStyle = '#B0703F';
      ctx.fillRect(x - 120, y - 30, 12, 110);
      ctx.fillRect(x + 108, y - 30, 12, 110);
      // comptoir
      ctx.fillStyle = '#D9905B'; ctx.fillRect(x - 130, y + 30, 260, 46);
      ctx.fillStyle = '#B0703F'; ctx.fillRect(x - 130, y + 66, 260, 12);
      // toit rayé
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? '#FFFFFF' : '#FF8FD0';
        ctx.beginPath();
        ctx.moveTo(x - 150 + i * 37.5, y - 30);
        ctx.lineTo(x - 150 + (i + 1) * 37.5, y - 30);
        ctx.lineTo(x - 150 + (i + 0.5) * 37.5, y - 78);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = '#E565A8'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - 150, y - 30); ctx.lineTo(x + 150, y - 30); ctx.stroke();
      // blocs ABC sur le comptoir
      const blocks = [['#FF6F61', 'A'], ['#5FB4FF', 'B'], ['#7FE0BE', 'C']];
      for (let i = 0; i < blocks.length; i++) {
        const bx = x - 70 + i * 70;
        ctx.fillStyle = blocks[i][0];
        ctx.beginPath(); ctx.roundRect(bx - 16, y + 2, 32, 28, 6); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 17px "Comic Sans MS", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(blocks[i][1], bx, y + 17);
      }
    })(L + 220, T + 150);

    // Cadeau + ballons (haut-droite)
    (function giftBalloons(x, y) {
      // ballons
      const cols = ['#FF6F61', '#FFD93D', '#5FB4FF'];
      for (let i = 0; i < 3; i++) {
        const bx = x - 60 + i * 60, by = y - 120 - (i % 2) * 34;
        ctx.strokeStyle = '#8A8A8A'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.quadraticCurveTo((x + bx) / 2 + 10, (by + y) / 2, bx, by + 16); ctx.stroke();
        ctx.fillStyle = cols[i];
        ctx.beginPath(); ctx.ellipse(bx, by, 24, 28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.ellipse(bx - 8, by - 8, 7, 10, -0.4, 0, Math.PI * 2); ctx.fill();
      }
      // cadeau
      ellipseShadow(ctx, x, y + 34, 62, 14, 0.25);
      ctx.fillStyle = '#FF8FD0'; ctx.beginPath(); ctx.roundRect(x - 48, y - 8, 96, 72, 8); ctx.fill();
      ctx.fillStyle = '#FFD93D'; ctx.fillRect(x - 9, y - 8, 18, 72); ctx.fillRect(x - 48, y + 20, 96, 14);
      ctx.strokeStyle = '#E565A8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - 48, y - 8, 96, 72, 8); ctx.stroke();
    })(R - 190, T + 210);

    // Cible (gauche)
    (function target(x, y) {
      ellipseShadow(ctx, x, y + 40, 66, 16, 0.22);
      const rings = [['#FFFFFF', 52], ['#FF5A5A', 40], ['#FFFFFF', 27], ['#FF5A5A', 14]];
      for (const [c, r] of rings) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#FFD93D'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      // pied
      ctx.strokeStyle = '#8A6B45'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x, y + 52); ctx.lineTo(x - 22, y + 92); ctx.moveTo(x, y + 52); ctx.lineTo(x + 22, y + 92); ctx.stroke();
    })(L + 120, (T + B) / 2 - 60);

    // Moulins à vent (2)
    function windmill(x, y, s, rot) {
      ellipseShadow(ctx, x, y + 70 * s, 46 * s, 12 * s, 0.2);
      ctx.fillStyle = '#FFF3E0';
      ctx.beginPath(); ctx.moveTo(x - 22 * s, y + 66 * s); ctx.lineTo(x, y - 12 * s); ctx.lineTo(x + 22 * s, y + 66 * s); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#D9B48A'; ctx.lineWidth = 3 * s; ctx.stroke();
      ctx.save();
      ctx.translate(x, y - 12 * s); ctx.rotate(rot);
      ctx.fillStyle = '#FFB3DD';
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10 * s, -14 * s); ctx.lineTo(58 * s, -8 * s); ctx.lineTo(58 * s, 10 * s); ctx.lineTo(10 * s, 12 * s); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#E565A8'; ctx.beginPath(); ctx.arc(x, y - 12 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
    }
    windmill(L + 330, B - 260, 0.9, 0.4);
    windmill(R - 260, T + 470, 0.75, 1.1);

    // Buissons
    bush(ctx, L + 300, T + 330, 34);
    bush(ctx, L + 480, B - 150, 28, '#6FD3A0');
    bush(ctx, R - 380, B - 210, 36);
    bush(ctx, R - 130, (T + B) / 2 + 130, 30, '#6FD3A0');
    bush(ctx, (L + R) / 2 - 130, T + 90, 26);
    bush(ctx, (L + R) / 2 + 210, B - 90, 30);

    // Boutons de couture géants
    function sewingButton(x, y, r, color) {
      ellipseShadow(ctx, x, y + r * 0.5, r * 1.15, r * 0.4, 0.2);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(x, y, r * 0.66, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7A5B3F';
      const o = r * 0.3;
      [[-o, -o], [o, -o], [-o, o], [o, o]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(x + p[0], y + p[1], r * 0.09, 0, Math.PI * 2); ctx.fill();
      });
    }
    sewingButton(L + 620, T + 150, 30, '#8EC5FF');
    sewingButton(R - 480, B - 130, 26, '#FFB3B3');
    sewingButton((L + R) / 2 + 60, (T + B) / 2 + 40, 22, '#C9A0FF');

    // Étang à nénuphars (droite)
    (function pond(x, y) {
      ellipseShadow(ctx, x, y + 8, 130, 64, 0.15);
      ctx.fillStyle = '#6FCBD8';
      ctx.beginPath(); ctx.ellipse(x, y, 128, 58, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8FE3EC';
      ctx.beginPath(); ctx.ellipse(x - 24, y - 10, 74, 30, 0, 0, Math.PI * 2); ctx.fill();
      // nénuphars
      ctx.fillStyle = '#3E9E6E';
      [[-46, 6], [30, -16], [52, 18]].forEach(function (p) {
        ctx.beginPath(); ctx.ellipse(x + p[0], y + p[1], 17, 8, 0, 0, Math.PI * 2); ctx.fill();
      });
      // lotus
      flowerStar(ctx, x - 46, y - 2, 8, '#FF9FD4', '#FFF0A0');
      flowerStar(ctx, x + 30, y - 22, 7, '#FFFFFF', '#FFD93D');
    })(R - 210, (T + B) / 2 - 40);

    // Clouds (coin gauche haut + droite)
    cloud(ctx, L + 420, T + 90, 0.9);
    cloud(ctx, R - 320, T + 130, 0.7);

    // Petits personnages assis en bas (public kawaii)
    function plush(x, y, color, earType) {
      ellipseShadow(ctx, x, y + 16, 22, 6, 0.25);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill();
      if (earType === 'bear') {
        ctx.beginPath(); ctx.arc(x - 11, y - 13, 6, 0, Math.PI * 2); ctx.arc(x + 11, y - 13, 6, 0, Math.PI * 2); ctx.fill();
      } else if (earType === 'bunny') {
        ctx.save(); ctx.translate(x - 8, y - 22); ctx.rotate(-0.2); ctx.fillRect(-4, -12, 8, 14); ctx.restore();
        ctx.save(); ctx.translate(x + 8, y - 22); ctx.rotate(0.2); ctx.fillRect(-4, -12, 8, 14); ctx.restore();
      } else { // cat
        ctx.beginPath(); ctx.moveTo(x - 14, y - 8); ctx.lineTo(x - 8, y - 20); ctx.lineTo(x - 2, y - 9); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 14, y - 8); ctx.lineTo(x + 8, y - 20); ctx.lineTo(x + 2, y - 9); ctx.closePath(); ctx.fill();
      }
      // yeux
      ctx.fillStyle = '#3A2E2E';
      ctx.beginPath(); ctx.arc(x - 6, y - 2, 1.8, 0, Math.PI * 2); ctx.arc(x + 6, y - 2, 1.8, 0, Math.PI * 2); ctx.fill();
      // sourire
      ctx.strokeStyle = '#3A2E2E'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(x, y + 4, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
    plush((L + R) / 2 - 260, B - 60, '#FFB3C8', 'bear');
    plush((L + R) / 2 - 180, B - 52, '#A8E6CF', 'cat');
    plush((L + R) / 2 + 260, B - 58, '#C7CEEA', 'bunny');
    plush((L + R) / 2 + 340, B - 66, '#FFDAC1', 'bear');

    // Étincelles décoratives
    sparkle(ctx, L + 500, T + 260, 9);
    sparkle(ctx, R - 350, B - 320, 8);
    sparkle(ctx, (L + R) / 2 - 320, B - 240, 7);
  }

  /* ~~~~~~~~~~~~~~~~~~~~ PLAGE AUX COQUILLAGES ~~~~~~~~~~~~~~~~~~~~ */
  function decorPlage(ctx, world, isFree) {
    const B = boundsOf(world);
    const rnd = makeSeededRand(20250614);
    const LW = B.W, LH = B.H;

    // Mer : vaguelettes (arcs) par-dessus le fond bleu de la piste
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const waveRows = 6;
    for (let row = 0; row < waveRows; row++) {
      const wy = B.T + 40 + (row + 0.5) * (LH / waveRows);
      for (let x = B.L + 30; x < B.R - 30; x += 130) {
        const off = (row % 2) * 65;
        ctx.beginPath();
        ctx.arc(x + off, wy, 26, Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Île de sable (grande ellipse) avec liseré d'écume
    const isl = { cx: B.CX, cy: B.CY, rx: LW * 0.435, ry: LH * 0.425 };
    ctx.save();
    ctx.fillStyle = '#F7E7B0';
    ctx.beginPath(); ctx.ellipse(isl.cx, isl.cy, isl.rx, isl.ry, 0, 0, Math.PI * 2); ctx.fill();
    // écume : double anneau blanc en pointillés
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 7;
    ctx.setLineDash([26, 18]);
    ctx.beginPath(); ctx.ellipse(isl.cx, isl.cy, isl.rx - 6, isl.ry - 6, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#E3C878';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(isl.cx, isl.cy, isl.rx - 16, isl.ry - 16, 0, 0, Math.PI * 2); ctx.stroke();
    // grain de sable
    for (let i = 0; i < 240; i++) {
      const a = rnd() * Math.PI * 2, rr2 = Math.sqrt(rnd());
      const x = isl.cx + Math.cos(a) * rr2 * (isl.rx - 30);
      const y = isl.cy + Math.sin(a) * rr2 * (isl.ry - 30);
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(214,183,120,0.55)' : 'rgba(255,248,220,0.9)';
      ctx.beginPath(); ctx.arc(x, y, 1.6 + rnd() * 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    /* (la fonction place() fractionnaire n'est plus utilisée — coordonnées absolues) */

    /* Parasol rayé */
    function parasol(x, y, s, tilt) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt || 0);
      ellipseShadow(ctx, 0, 26 * s, 44 * s, 12 * s, 0.2);
      // mât
      ctx.strokeStyle = '#B08954'; ctx.lineWidth = 5 * s;
      ctx.beginPath(); ctx.moveTo(0, 26 * s); ctx.lineTo(0, -34 * s); ctx.stroke();
      // toile en quartiers
      const cols = ['#FF6F61', '#FFF3D6'];
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = cols[i % 2];
        ctx.beginPath();
        ctx.moveTo(0, -42 * s);
        ctx.arc(0, -30 * s, 46 * s, Math.PI + i * Math.PI / 8, Math.PI + (i + 1) * Math.PI / 8);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(160,80,60,0.6)'; ctx.lineWidth = 2.4 * s;
      ctx.beginPath(); ctx.arc(0, -30 * s, 46 * s, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#FF6F61';
      ctx.beginPath(); ctx.arc(0, -44 * s, 4.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    /* Palmier */
    function palm(x, y, s, lean) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lean || 0);
      ellipseShadow(ctx, 0, 6, 44 * s, 11 * s, 0.22);
      // tronc courbé (segments)
      ctx.strokeStyle = '#A9805B'; ctx.lineCap = 'round';
      ctx.lineWidth = 13 * s;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(10 * s, -42 * s, 26 * s, -78 * s);
      ctx.stroke();
      ctx.strokeStyle = '#8A6242'; ctx.lineWidth = 2.4 * s;
      for (let i = 1; i <= 4; i++) {
        const t = i / 5;
        const px = 0 + (26 * s) * t * t * 1.4, py = -78 * s * t;
        ctx.beginPath(); ctx.moveTo(px - 7 * s, py); ctx.lineTo(px + 7 * s, py); ctx.stroke();
      }
      // palmes
      const topX = 26 * s, topY = -80 * s;
      for (let i = 0; i < 6; i++) {
        const ang = -Math.PI * 0.92 + i * (Math.PI / 5.2);
        ctx.save();
        ctx.translate(topX, topY);
        ctx.rotate(ang);
        ctx.fillStyle = i % 2 ? '#4CBB6A' : '#3CA55C';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(26 * s, -10 * s, 52 * s, 6 * s);
        ctx.quadraticCurveTo(26 * s, 8 * s, 0, 6 * s);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // noix de coco
      ctx.fillStyle = '#6E4A2F';
      ctx.beginPath(); ctx.arc(topX - 5 * s, topY + 6 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(topX + 6 * s, topY + 7 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    /* Château de sable */
    function sandcastle(x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      ellipseShadow(ctx, 0, 6 * s, 56 * s, 13 * s, 0.22);
      ctx.fillStyle = '#E8C87A';
      ctx.strokeStyle = '#C9A35B'; ctx.lineWidth = 2.4 * s;
      // tours latérales
      for (const side of [-1, 1]) {
        const tx = side * 38 * s;
        rr(ctx, tx - 13 * s, -34 * s, 26 * s, 36 * s, 3 * s); ctx.fill(); ctx.stroke();
        for (let i = -1; i <= 1; i++) {
          ctx.fillRect(tx + i * 8.6 * s - 3.2 * s, -42 * s, 6.4 * s, 8 * s);
          ctx.strokeRect(tx + i * 8.6 * s - 3.2 * s, -42 * s, 6.4 * s, 8 * s);
        }
      }
      // corps central + donjon
      rr(ctx, -26 * s, -24 * s, 52 * s, 26 * s, 4 * s); ctx.fill(); ctx.stroke();
      rr(ctx, -13 * s, -52 * s, 26 * s, 30 * s, 3 * s); ctx.fill(); ctx.stroke();
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(i * 9 * s - 3 * s, -59 * s, 6 * s, 7 * s);
        ctx.strokeRect(i * 9 * s - 3 * s, -59 * s, 6 * s, 7 * s);
      }
      // porte
      ctx.fillStyle = '#A9803E';
      ctx.beginPath(); ctx.arc(0, 2 * s, 9 * s, Math.PI, 0); ctx.rect(-9 * s, 2 * s, 18 * s, 8 * s); ctx.fill();
      // drapeau
      ctx.strokeStyle = '#8A6242'; ctx.lineWidth = 2.4 * s;
      ctx.beginPath(); ctx.moveTo(0, -59 * s); ctx.lineTo(0, -74 * s); ctx.stroke();
      ctx.fillStyle = '#FF6F61';
      ctx.beginPath(); ctx.moveTo(0, -74 * s); ctx.lineTo(20 * s, -68 * s); ctx.lineTo(0, -62 * s); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    /* Serviette de plage rayée */
    function towel(x, y, rot, c1) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot);
      ellipseShadow(ctx, 0, 4, 62, 34, 0.15);
      ctx.fillStyle = '#FFFDF6';
      rr(ctx, -62, -34, 124, 68, 6); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.roundRect(-62, -34, 124, 68, 6); ctx.clip();
      ctx.fillStyle = c1;
      for (let i = -3; i <= 3; i += 2) ctx.fillRect(i * 20 - 8, -34, 16, 68);
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
      rr(ctx, -62, -34, 124, 68, 6); ctx.stroke();
      ctx.restore();
    }

    /* Étoile de mer */
    function starfish(x, y, r, rot, color) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot || 0);
      ctx.fillStyle = color || '#FF9F68';
      ctx.strokeStyle = '#D9753B'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
        const a2 = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFD9A0';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.09, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    /* Coquillage (éventail) */
    function shell(x, y, r, rot, color) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot || 0);
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(120,80,70,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, Math.PI * 1.15, Math.PI * 1.85);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const a = -Math.PI / 2 + i * 0.33;
        ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.stroke();
      ctx.restore();
    }

    /* Parasols / palmiers / châteaux / serviettes (positions validées hors piste) */
    function placeAbs(x, y, r) { return findFree(isFree, x, y, r); }
    let p;
    p = placeAbs(-260, -30, 66);  if (p) parasol(p.x, p.y, 1.05, -0.08);
    p = placeAbs(390, 30, 66);    if (p) parasol(p.x, p.y, 0.9, 0.1);
    p = placeAbs(-1180, -670, 62); if (p) palm(p.x, p.y, 1.1, -0.12);
    p = placeAbs(1160, 700, 62);   if (p) palm(p.x, p.y, 0.95, 0.14);
    p = placeAbs(-430, -330, 66);  if (p) sandcastle(p.x, p.y, 1.0);
    p = placeAbs(470, 300, 60);    if (p) sandcastle(p.x, p.y, 0.8);
    p = placeAbs(-130, 180, 66);   if (p) towel(p.x, p.y, 0.32, '#FF8FB3');
    p = placeAbs(380, -180, 66);   if (p) towel(p.x, p.y, -0.24, '#7FD4FF');

    /* Étoiles de mer */
    const starSpots = [[-380, 120, 20], [290, -260, 16], [-110, -330, 15], [300, 240, 17]];
    for (const [sx, sy, r] of starSpots) {
      p = placeAbs(sx, sy, r + 6);
      if (p) starfish(p.x, p.y, r, rnd() * Math.PI, ['#FF9F68', '#FF8FB3', '#F7C948'][Math.floor(rnd() * 3)]);
    }

    /* Coquillages scattered */
    const shellCols = ['#FFD1DC', '#FFF3D6', '#E6D0FF', '#FFB3A0'];
    for (let i = 0; i < 12; i++) {
      const x = B.L + 120 + rnd() * (B.W - 240), y = B.T + 120 + rnd() * (B.H - 240);
      const q = findFree(isFree, x, y, 12);
      if (q) shell(q.x, q.y, 7 + rnd() * 7, rnd() * Math.PI * 2, shellCols[Math.floor(rnd() * shellCols.length)]);
    }

    /* Ballon de plage */
    p = placeAbs(120, 60, 34);
    if (p) {
      ctx.save(); ctx.translate(p.x, p.y);
      ellipseShadow(ctx, 0, 26, 30, 9, 0.2);
      ctx.fillStyle = '#FFFDF6';
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FF6F61';
      ctx.beginPath(); ctx.moveTo(0, -26); ctx.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 0.66); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5FB4FF';
      ctx.beginPath(); ctx.moveTo(0, -26); ctx.arc(0, 0, 26, Math.PI / 2 - Math.PI * 0.33, Math.PI / 2 + Math.PI * 0.33); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  /* ~~~~~~~~~~~~~~~~~~~~ TABLE DU GOÛTER ~~~~~~~~~~~~~~~~~~~~ */
  function decorGouter(ctx, world, isFree) {
    const B = boundsOf(world);
    const rnd = makeSeededRand(20250701);

    /* --- Bois de la table --- */
    ctx.save();
    ctx.fillStyle = '#B9855A';
    ctx.fillRect(B.L, B.T, B.W, B.H);
    const plankH = 92;
    for (let y = B.T, i = 0; y < B.B; y += plankH, i++) {
      ctx.fillStyle = i % 2 ? '#AE7B51' : '#C29268';
      ctx.fillRect(B.L, y, B.W, plankH);
      // veines du bois
      ctx.strokeStyle = 'rgba(90,55,25,0.35)';
      ctx.lineWidth = 2;
      for (let g = 0; g < 3; g++) {
        const gy = y + 14 + rnd() * (plankH - 28);
        ctx.beginPath();
        ctx.moveTo(B.L + rnd() * 60, gy);
        ctx.bezierCurveTo(B.L + B.W * 0.3, gy + (rnd() - 0.5) * 16, B.L + B.W * 0.7, gy + (rnd() - 0.5) * 16, B.R, gy + (rnd() - 0.5) * 10);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(80,45,20,0.5)';
      ctx.fillRect(B.L, y, B.W, 3);
    }
    ctx.restore();

    /* --- Nappe à carreaux rouges et blancs --- */
    const m = 64; // marge de la nappe
    const nx = B.L + m, ny = B.T + m, nw = B.W - 2 * m, nh = B.H - 2 * m;
    ctx.save();
    rr(ctx, nx, ny, nw, nh, 26);
    ctx.fillStyle = '#FFF6EC';
    ctx.fill();
    ctx.save();
    ctx.clip();
    const cell = 54;
    ctx.fillStyle = 'rgba(224, 82, 82, 0.42)';
    for (let x = nx; x < nx + nw; x += cell * 2) ctx.fillRect(x, ny, cell, nh);
    for (let y = ny; y < ny + nh; y += cell * 2) ctx.fillRect(nx, y, nw, cell);
    ctx.restore();
    // ourlet de la nappe
    ctx.strokeStyle = '#E05252';
    ctx.lineWidth = 10;
    rr(ctx, nx, ny, nw, nh, 26); ctx.stroke();
    ctx.strokeStyle = '#FFF6EC';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 12]);
    rr(ctx, nx + 10, ny + 10, nw - 20, nh - 20, 18); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    const cx = B.CX, cy = B.CY;

    /* --- Assiette de gâteaux au centre --- */
    ctx.save();
    ctx.translate(cx, cy);
    ellipseShadow(ctx, 0, 26, 150, 40, 0.25);
    // pied du présentoir
    ctx.fillStyle = '#EDEFF5';
    ctx.beginPath(); ctx.moveTo(-16, 40); ctx.lineTo(16, 40); ctx.lineTo(9, -6); ctx.lineTo(-9, -6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 44, 66, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#B9BECF'; ctx.lineWidth = 2.5; ctx.stroke();
    // plateau
    ctx.beginPath(); ctx.ellipse(0, -8, 152, 34, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F7F7FC'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -12, 128, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#E7E9F2'; ctx.fill();
    // gâteau : étage rose avec glaçage qui coule
    ctx.fillStyle = '#F7A8C4';
    rr(ctx, -88, -66, 176, 52, 10); ctx.fill();
    ctx.strokeStyle = '#D97A9E'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#FFF0F6';
    ctx.beginPath(); ctx.ellipse(0, -66, 88, 15, 0, 0, Math.PI * 2); ctx.fill();
    // coulures du glaçage
    for (let i = -3; i <= 3; i++) {
      const dx = i * 26 + (i % 2 ? 6 : -4);
      ctx.beginPath(); ctx.ellipse(dx, -50, 8, 12 + (i % 2 ? 6 : 0), 0, 0, Math.PI * 2); ctx.fill();
    }
    // vermicelles
    const sprinkleCols = ['#FFD93D', '#5FB4FF', '#7FE0BE', '#C79BFF'];
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = sprinkleCols[i % sprinkleCols.length];
      ctx.save();
      ctx.translate(-70 + rnd() * 140, -64 + rnd() * 10);
      ctx.rotate(rnd() * Math.PI);
      ctx.fillRect(-4, -1.4, 8, 2.8);
      ctx.restore();
    }
    // cerise sur le gâteau
    ctx.fillStyle = '#E23B3B';
    ctx.beginPath(); ctx.arc(0, -84, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(-3, -87, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5B3A1E'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -92); ctx.quadraticCurveTo(6, -102, 12, -100); ctx.stroke();
    ctx.restore();

    /* --- Les 2 grosses tasses de chocolat (chicanes) --- */
    function bigCup(x, y) {
      ctx.save();
      ctx.translate(x, y);
      ellipseShadow(ctx, 0, 44, 84, 18, 0.3);
      // soucoupe
      ctx.fillStyle = '#FFF6EC';
      ctx.beginPath(); ctx.ellipse(0, 34, 74, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#D8C7B4'; ctx.lineWidth = 2.5; ctx.stroke();
      // corps de la tasse
      ctx.fillStyle = '#7A4A2B';
      ctx.beginPath();
      ctx.moveTo(-58, -38); ctx.quadraticCurveTo(-64, 30, 0, 32); ctx.quadraticCurveTo(64, 30, 58, -38);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#59331C'; ctx.lineWidth = 3; ctx.stroke();
      // anse
      ctx.strokeStyle = '#7A4A2B'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.arc(64, -2, 17, -Math.PI / 2.4, Math.PI / 2.4); ctx.stroke();
      // chocolat chaud
      ctx.fillStyle = '#3A2312';
      ctx.beginPath(); ctx.ellipse(0, -38, 58, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5A3A22'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(-6, -39, 34, 7, 0, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      // vapeur (static)
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (const sx of [-18, 4, 24]) {
        ctx.beginPath();
        ctx.moveTo(sx, -52);
        ctx.bezierCurveTo(sx - 9, -66, sx + 9, -78, sx - 2, -92);
        ctx.bezierCurveTo(sx - 8, -102, sx + 6, -108, sx + 1, -118);
        ctx.stroke();
      }
      // reflet
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath(); ctx.ellipse(-32, -8, 8, 22, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const cup1 = findFree(isFree, cx - 520, cy + 10, 95);
    const cup2 = findFree(isFree, cx + 520, cy + 10, 95);
    if (cup1) bigCup(cup1.x, cup1.y);
    if (cup2) bigCup(cup2.x, cup2.y);

    /* --- Petits gâteaux sur assiette (bas-centre) --- */
    const plate = findFree(isFree, cx, cy + 430, 105);
    if (plate) {
      ctx.save(); ctx.translate(plate.x, plate.y);
      ellipseShadow(ctx, 0, 12, 104, 22, 0.22);
      ctx.fillStyle = '#FFF6EC';
      ctx.beginPath(); ctx.ellipse(0, 0, 100, 34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#D8C7B4'; ctx.lineWidth = 2.5; ctx.stroke();
      const cupCols = ['#FF9FB2', '#8FD3E8', '#FFE066', '#C7A6FF', '#9BE09E'];
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.62;
        const gx = Math.cos(a) * 52, gy = Math.sin(a) * 15 - 4;
        ctx.fillStyle = cupCols[i];
        ctx.beginPath(); ctx.moveTo(gx - 11, gy); ctx.lineTo(gx + 11, gy); ctx.lineTo(gx + 7, gy - 18); ctx.lineTo(gx - 7, gy - 18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FFF6EC';
        ctx.beginPath(); ctx.ellipse(gx, gy - 18, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#E05252';
        ctx.beginPath(); ctx.arc(gx, gy - 22, 3.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    /* --- Cuillères --- */
    function spoon(x, y, rot) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = '#E8E8EC'; ctx.strokeStyle = '#B9BEC9'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, -26, 11, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillRect(-3.5, -12, 7, 52);
      ctx.beginPath(); ctx.roundRect(-3.5, -12, 7, 52, 3); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    const sp1 = findFree(isFree, cx - 330, cy - 235, 26); if (sp1) spoon(sp1.x, sp1.y, 0.7);
    const sp2 = findFree(isFree, cx + 335, cy - 225, 26); if (sp2) spoon(sp2.x, sp2.y, -0.6);

    /* --- Miettes, bonbons, grains de café --- */
    for (let i = 0; i < 34; i++) {
      const x = B.L + 90 + rnd() * (B.W - 180), y = B.T + 90 + rnd() * (B.H - 180);
      if (!isFree(x, y, 8)) continue;
      ctx.fillStyle = ['#8A5A30', '#6B4226', '#C9A35B'][i % 3];
      ctx.beginPath(); ctx.arc(x, y, 1.6 + rnd() * 2.6, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 9; i++) { // bonbons emballés
      const x = B.L + 110 + rnd() * (B.W - 220), y = B.T + 110 + rnd() * (B.H - 220);
      if (!isFree(x, y, 12)) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * Math.PI);
      const c = ['#FF8FB3', '#8FD3E8', '#FFE066', '#C7A6FF'][i % 4];
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.roundRect(-9, -5, 18, 10, 4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-15, -6); ctx.lineTo(-15, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(15, -6); ctx.lineTo(15, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    for (let i = 0; i < 10; i++) { // grains de café
      const near = i % 2 ? cup1 : cup2;
      if (!near) break;
      const x = near.x + (rnd() - 0.5) * 130, y = near.y + 60 + rnd() * 45;
      if (!isFree(x, y, 6)) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * Math.PI);
      ctx.fillStyle = '#4E3423';
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 4.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2E1E12'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.stroke();
      ctx.restore();
    }
  }

  /* ~~~~~~~~~~~~~~~~~~~~ POTAGER EN HUIT ~~~~~~~~~~~~~~~~~~~~ */
  function decorPotager(ctx, world, isFree) {
    const B = boundsOf(world);
    const rnd = makeSeededRand(20250802);

    // Pelouse tondue : rayures horizontales subtiles
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.055)';
    const stripeH = 84;
    for (let y = B.T, i = 0; y < B.B; y += stripeH, i++) {
      if (i % 2 === 0) ctx.fillRect(B.L, y, B.W, stripeH);
    }
    ctx.restore();

    /* Carrés de potager (rangées diagonales) */
    function gardenBed(x, y, rot, kind) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot);
      ellipseShadow(ctx, 0, 8, 150, 24, 0.25);
      // planche de terre
      ctx.fillStyle = '#6B4226';
      rr(ctx, -132, -56, 264, 112, 18); ctx.fill();
      ctx.fillStyle = '#5A3520';
      rr(ctx, -122, -46, 244, 92, 12); ctx.fill();
      // rangées
      ctx.strokeStyle = '#7D5232'; ctx.lineWidth = 7;
      for (const ry of [-26, 0, 26]) {
        ctx.beginPath(); ctx.moveTo(-112, ry); ctx.lineTo(112, ry); ctx.stroke();
      }
      // plants selon le type
      const spots = [];
      for (const ry of [-26, 0, 26]) for (let px = -96; px <= 96; px += 32) spots.push([px, ry]);
      for (const [px, py] of spots) {
        if (kind === 'carottes') {
          // fanes
          ctx.strokeStyle = '#3E9E4E'; ctx.lineWidth = 2.6;
          for (const da of [-0.5, 0, 0.5]) {
            ctx.beginPath(); ctx.moveTo(px, py - 2);
            ctx.lineTo(px + Math.sin(da) * 8, py - 12 - Math.abs(da) * -2);
            ctx.stroke();
          }
          // épaule de carotte qui dépasse
          ctx.fillStyle = '#F07F2E';
          ctx.beginPath(); ctx.moveTo(px - 4.5, py + 3); ctx.lineTo(px + 4.5, py + 3); ctx.lineTo(px, py - 3.5); ctx.closePath(); ctx.fill();
        } else if (kind === 'salades') {
          ctx.fillStyle = '#5FBF67';
          ctx.beginPath(); ctx.arc(px, py, 9.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#8FE08B';
          ctx.beginPath(); ctx.arc(px - 2, py - 2, 5.6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#3E8E4A'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(px, py, 9.5, 0, Math.PI * 2); ctx.stroke();
        } else { // choux
          ctx.fillStyle = '#A9D86E';
          ctx.beginPath(); ctx.arc(px, py, 10.5, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#7CB34E'; ctx.lineWidth = 1.8;
          for (const rr2 of [8, 4.6]) { ctx.beginPath(); ctx.arc(px, py, rr2, 0, Math.PI * 2); ctx.stroke(); }
        }
      }
      ctx.restore();
    }
    /* Carrés de potager : 4 carrés en croix autour du croisement */
    const bedSpots = [
      [-470, 0, 0, 'carottes'], [470, 0, 0, 'salades'],
      [0, -330, Math.PI / 2, 'choux'], [0, 390, Math.PI / 2, 'carottes']
    ];
    for (const [bx, by, rot, kind] of bedSpots) {
      if (isFree(bx, by, 195)) gardenBed(bx, by, rot, kind);
    }

    /* Épouvantail (haut-centre) */
    const scx = 0, scy = -455;
    if (isFree(scx, scy, 60)) {
      ctx.save(); ctx.translate(scx, scy);
      ellipseShadow(ctx, 0, 66, 40, 9, 0.25);
      // poteau + bras
      ctx.strokeStyle = '#6E4526'; ctx.lineCap = 'round'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(0, 66); ctx.lineTo(0, -34); ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(-42, -8); ctx.lineTo(42, -8); ctx.stroke();
      // paille aux mains
      ctx.strokeStyle = '#E3C878'; ctx.lineWidth = 2.4;
      for (const hx of [-42, 42]) {
        for (const dy of [-6, 0, 6]) {
          ctx.beginPath(); ctx.moveTo(hx, -8); ctx.lineTo(hx + (hx < 0 ? -12 : 12), -8 + dy * 1.6); ctx.stroke();
        }
      }
      // chemise rapiécée
      ctx.fillStyle = '#C75B5B';
      ctx.beginPath(); ctx.moveTo(-20, -6); ctx.lineTo(20, -6); ctx.lineTo(14, 34); ctx.lineTo(-14, 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8FB6D9';
      ctx.fillRect(-4, 8, 12, 12);
      ctx.strokeStyle = '#8A3B3B'; ctx.lineWidth = 2; ctx.strokeRect(-4, 8, 12, 12);
      // tête de sac
      ctx.fillStyle = '#E8D3A0';
      ctx.beginPath(); ctx.arc(0, -34, 17, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#B99B63'; ctx.lineWidth = 2; ctx.stroke();
      // visage cousu
      ctx.strokeStyle = '#5A4632'; ctx.lineWidth = 2.2;
      for (const ex of [-6.5, 6.5]) {
        ctx.beginPath(); ctx.moveTo(ex - 3, -38); ctx.lineTo(ex + 3, -32); ctx.moveTo(ex + 3, -38); ctx.lineTo(ex - 3, -32); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, -25, 6.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      // chapeau de paille
      ctx.fillStyle = '#D9B45A';
      ctx.beginPath(); ctx.ellipse(0, -45, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-13, -45); ctx.lineTo(0, -68); ctx.lineTo(13, -45); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#A8823C'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, -45, 26, 7, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    /* Arrosoir (bas-centre) */
    const wcx = 0, wcy = 460;
    if (isFree(wcx, wcy, 55)) {
      ctx.save(); ctx.translate(wcx, wcy); ctx.rotate(-0.08);
      ellipseShadow(ctx, 0, 16, 44, 10, 0.25);
      ctx.fillStyle = '#5FA8C9';
      rr(ctx, -26, -22, 52, 38, 9); ctx.fill();
      ctx.strokeStyle = '#3E7E99'; ctx.lineWidth = 2.5; ctx.stroke();
      // bec
      ctx.strokeStyle = '#5FA8C9'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(24, 2); ctx.lineTo(52, -14); ctx.stroke();
      ctx.fillStyle = '#5FA8C9';
      ctx.beginPath(); ctx.arc(56, -16, 8.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3E7E99'; ctx.lineWidth = 2; ctx.stroke();
      // anse
      ctx.strokeStyle = '#3E7E99'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(-2, -22, 16, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      // gouttes
      ctx.fillStyle = '#9FD8EC';
      [[64, -8], [74, 2], [70, 12], [82, -2]].forEach(function (p) {
        ctx.beginPath(); ctx.ellipse(p[0], p[1], 2.6, 3.8, 0, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }

    /* Tournesols */
    function sunflower(x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.strokeStyle = '#3E8E4A'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 44); ctx.quadraticCurveTo(4, 10, 0, -8); ctx.stroke();
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath(); ctx.ellipse(-12, 26, 11, 5, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(12, 14, 11, 5, 0.5, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 12; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 6);
        ctx.fillStyle = '#FFD93D';
        ctx.beginPath(); ctx.ellipse(0, -20, 6.5, 15, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#6B4226';
      ctx.beginPath(); ctx.arc(0, 0, 12.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4A2A16';
      for (const [dx, dy] of [[-4, -3], [4, -3], [0, 3], [-5, 3], [5, 3]]) {
        ctx.beginPath(); ctx.arc(dx, dy, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    const sf1 = findFree(isFree, -120, -452, 45);
    const sf2 = findFree(isFree, 120, -452, 45);
    if (sf1) sunflower(sf1.x, sf1.y, 1);
    if (sf2) sunflower(sf2.x, sf2.y, 0.85);

    /* Papillons */
    for (let i = 0; i < 4; i++) {
      const bx = B.L + 80 + rnd() * (B.W - 160), by = B.T + 80 + rnd() * (B.H - 160);
      if (!isFree(bx, by, 14)) continue;
      ctx.save(); ctx.translate(bx, by); ctx.rotate((rnd() - 0.5) * 0.8);
      const cols = ['#FFB3D9', '#C7A6FF', '#FFE066', '#8FE3FF'];
      ctx.fillStyle = cols[i % 4];
      ctx.beginPath(); ctx.ellipse(-6, 0, 6, 9, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, 0, 6, 9, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4A3A2A'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke();
      ctx.restore();
    }

    /* Clôture basse en bas */
    ctx.save();
    const fy = B.B - 42;
    ctx.strokeStyle = '#F5F0E1'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(B.L + 30, fy); ctx.lineTo(B.R - 30, fy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(B.L + 30, fy + 16); ctx.lineTo(B.R - 30, fy + 16); ctx.stroke();
    ctx.fillStyle = '#FFFDF2';
    for (let x = B.L + 44; x < B.R - 30; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x - 6, fy + 22); ctx.lineTo(x - 6, fy - 12); ctx.lineTo(x, fy - 20); ctx.lineTo(x + 6, fy - 12); ctx.lineTo(x + 6, fy + 22);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /* ~~~~~~~~~~~~~~~~~~~~ SALLE DE BAIN ~~~~~~~~~~~~~~~~~~~~ */
  function decorSalledebain(ctx, world, isFree) {
    const B = boundsOf(world);
    const rnd = makeSeededRand(20250917);

    // Carrelage damier aqua / blanc
    const tile = 84;
    for (let y = B.T, row = 0; y < B.B; y += tile, row++) {
      for (let x = B.L, col = 0; x < B.R; x += tile, col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#DFF6F8' : '#FFFFFF';
        ctx.fillRect(x, y, tile + 1, tile + 1);
      }
    }
    ctx.strokeStyle = '#BDE3E8'; ctx.lineWidth = 3;
    for (let x = B.L; x <= B.R; x += tile) { ctx.beginPath(); ctx.moveTo(x, B.T); ctx.lineTo(x, B.B); ctx.stroke(); }
    for (let y = B.T; y <= B.B; y += tile) { ctx.beginPath(); ctx.moveTo(B.L, y); ctx.lineTo(B.R, y); ctx.stroke(); }

    /* Tapis de bain ovale strié */
    const mat = findFree(isFree, 0, 40, 130);
    if (mat) {
      ctx.save(); ctx.translate(mat.x, mat.y);
      ctx.fillStyle = '#F4A9C4';
      ctx.beginPath(); ctx.ellipse(0, 0, 132, 66, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#D97EA3'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(0, 0, 132, 66, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 6;
      for (const yy of [-26, 0, 26]) {
        ctx.beginPath(); ctx.ellipse(0, yy, 96 - Math.abs(yy) * 0.8, 10, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    /* Baignoire sabot */
    function bathtub(x, y, rot, bubbleTint) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ellipseShadow(ctx, 0, 34, 132, 20, 0.25);
      // pieds griffe
      ctx.fillStyle = '#E8C87A';
      for (const fx of [-88, 88]) {
        ctx.beginPath(); ctx.arc(fx, 26, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#B98F3E'; ctx.lineWidth = 2; ctx.stroke();
      }
      // coque
      ctx.fillStyle = '#FDFEFE';
      ctx.beginPath(); ctx.ellipse(0, 0, 118, 52, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#C3D5DB'; ctx.lineWidth = 4; ctx.stroke();
      // eau
      ctx.fillStyle = '#A8E0EA';
      ctx.beginPath(); ctx.ellipse(0, -4, 96, 38, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.globalAlpha = 0.8;
      for (const wy of [-14, 0, 12]) {
        ctx.beginPath();
        ctx.arc(-30, wy, 11, Math.PI * 1.15, Math.PI * 1.85);
        ctx.arc(4, wy, 11, Math.PI * 1.15, Math.PI * 1.85);
        ctx.arc(38, wy, 11, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // mousse qui déborde
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 16; i++) {
        const a = rnd() * Math.PI * 2;
        const bx = Math.cos(a) * 100, by = -4 + Math.sin(a) * 38;
        ctx.beginPath(); ctx.arc(bx, by, 4 + rnd() * 6.5, 0, Math.PI * 2); ctx.fill();
      }
      for (const [bx, by, br] of [[-52, -34, 9], [-8, -40, 11], [36, -33, 8]]) {
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    const tub1 = findFree(isFree, -150, -400, 118);
    const tub2 = findFree(isFree, 150, 400, 118);
    if (tub1) bathtub(tub1.x, tub1.y, -0.1);
    if (tub2) bathtub(tub2.x, tub2.y, 0.09);

    /* Lavabo + miroir */
    const sink = findFree(isFree, 150, -260, 72);
    if (sink) {
      ctx.save(); ctx.translate(sink.x, sink.y);
      // miroir
      ctx.fillStyle = '#E8C87A';
      rr(ctx, -46, -118, 92, 74, 18); ctx.fill();
      ctx.fillStyle = '#CDEEF4';
      rr(ctx, -38, -110, 76, 58, 13); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-24, -62); ctx.lineTo(8, -102); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, -56); ctx.lineTo(12, -84); ctx.stroke();
      // piédestal
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.moveTo(-13, 66); ctx.lineTo(13, 66); ctx.lineTo(9, 6); ctx.lineTo(-9, 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#C3D5DB'; ctx.lineWidth = 2.5; ctx.stroke();
      // colonne + vasque
      ctx.fillStyle = '#FFFFFF';
      rr(ctx, -34, -8, 68, 18, 8); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -10, 44, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // robinet
      ctx.strokeStyle = '#AEC6CE'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -34); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -34, 8, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#AEC6CE';
      ctx.beginPath(); ctx.arc(-12, -22, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(12, -22, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    /* Canards en plastique */
    function duck(x, y, s, rot) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
      ctx.fillStyle = '#FFD93D';
      ctx.beginPath(); ctx.ellipse(0, 4, 22, 13, 0, 0, Math.PI * 2); ctx.fill();       // corps
      ctx.beginPath(); ctx.arc(12, -10, 10.5, 0, Math.PI * 2); ctx.fill();             // tête
      ctx.fillStyle = '#FF9F2E';
      ctx.beginPath(); ctx.moveTo(20, -11); ctx.lineTo(30, -8); ctx.lineTo(20, -5); ctx.closePath(); ctx.fill(); // bec
      ctx.fillStyle = '#2B2B33';
      ctx.beginPath(); ctx.arc(14.5, -13, 1.9, 0, Math.PI * 2); ctx.fill();            // œil
      ctx.strokeStyle = '#E5B02E'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-2, 2, 8, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); // aile
      ctx.restore();
    }
    if (tub1) { duck(tub1.x - 24, tub1.y - 12, 1.05, -0.08); }
    if (tub2) { duck(tub2.x + 18, tub2.y - 12, 0.95, 0.1); }
    const duck3 = findFree(isFree, -90, 170, 30);
    if (duck3) duck(duck3.x, duck3.y, 0.9, 0.3);

    /* Serviettes pliées */
    const towels = findFree(isFree, -170, 250, 55);
    if (towels) {
      ctx.save(); ctx.translate(towels.x, towels.y);
      const stack = [['#FFB3C8', 0], ['#8FD3E8', -16], ['#FFF3D6', -32]];
      for (const [col, dy] of stack) {
        ctx.fillStyle = col;
        rr(ctx, -46, dy - 11, 92, 20, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(-46, dy - 3, 92, 5);
      }
      ctx.restore();
    }

    /* Serviette suspendue (barre) */
    const rail = findFree(isFree, 330, -20, 60);
    if (rail) {
      ctx.save(); ctx.translate(rail.x, rail.y);
      ctx.strokeStyle = '#AEC6CE'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-52, -34); ctx.lineTo(52, -34); ctx.stroke();
      ctx.fillStyle = '#C7A6FF';
      ctx.beginPath(); ctx.moveTo(-34, -34); ctx.lineTo(34, -34); ctx.lineTo(30, 34); ctx.lineTo(-30, 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(-34, -8, 68, 7); ctx.fillRect(-33, 12, 66, 7);
      ctx.restore();
    }

    /* Flacons de savon */
    const bottles = findFree(isFree, -215, -215, 46);
    if (bottles) {
      ctx.save(); ctx.translate(bottles.x, bottles.y);
      const cols = ['#B8E6D2', '#F6C6EA', '#FFE9A8'];
      for (let i = 0; i < 3; i++) {
        const bx = (i - 1) * 34;
        ctx.fillStyle = cols[i];
        rr(ctx, bx - 12, -6, 24, 40, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#5A5A66';
        ctx.fillRect(bx - 4, -16, 8, 10);
        ctx.fillRect(bx - 8, -20, 16, 5);
      }
      ctx.restore();
    }

    /* Bulles de savon */
    for (let i = 0; i < 12; i++) {
      const bx = B.L + rnd() * B.W, by = B.T + rnd() * B.H * 0.5;
      if (!isFree(bx, by, 10)) continue;
      const r = 4 + rnd() * 11;
      ctx.strokeStyle = 'rgba(160,220,235,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(bx - r * 0.3, by - r * 0.3, r * 0.45, Math.PI, Math.PI * 1.6); ctx.stroke();
    }
  }

  /* ~~~~~~~~~~~~~~~~~~~~ BANQUISE ~~~~~~~~~~~~~~~~~~~~ */
  function decorBanquise(ctx, world, isFree) {
    const B = boundsOf(world);
    const rnd = makeSeededRand(20251224);

    // Nappes de glace (ellipses très claires) + reflets
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const x = B.L + rnd() * B.W, y = B.T + rnd() * B.H;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(x, y, 60 + rnd() * 110, 30 + rnd() * 46, rnd() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
    // fissures dans la glace
    ctx.strokeStyle = 'rgba(140,190,225,0.6)'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      let fx = B.L + rnd() * B.W, fy = B.T + rnd() * B.H;
      ctx.beginPath(); ctx.moveTo(fx, fy);
      for (let s = 0; s < 5; s++) { fx += (rnd() - 0.5) * 130; fy += rnd() * 70; ctx.lineTo(fx, fy); }
      ctx.stroke();
    }
    ctx.restore();

    /* Igloo (haut-centre) */
    const igloo = findFree(isFree, B.CX, B.T + B.H * 0.16, 105);
    if (igloo) {
      ctx.save(); ctx.translate(igloo.x, igloo.y);
      ellipseShadow(ctx, 0, 26, 96, 17, 0.25);
      // dôme
      ctx.fillStyle = '#FDFEFF';
      ctx.beginPath(); ctx.arc(0, 10, 82, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#C9DEEB'; ctx.lineWidth = 3.5; ctx.stroke();
      // rangées de blocs (joints horizontaux courbes + verticaux)
      ctx.lineWidth = 2.6;
      for (const ry of [-28, -52]) {
        ctx.beginPath(); ctx.ellipse(0, 10 + ry + 10, Math.sqrt(Math.max(0, 82 * 82 - ry * ry)), 12, 0, Math.PI, 0); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(-30, -38); ctx.lineTo(-30, -6); ctx.moveTo(2, -56); ctx.lineTo(2, -16); ctx.moveTo(32, -38); ctx.lineTo(32, -6); ctx.stroke();
      // entrée
      ctx.fillStyle = '#5E7A90';
      ctx.beginPath(); ctx.arc(0, 10, 34, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#33465A';
      ctx.beginPath(); ctx.arc(0, 10, 22, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    /* Bonhomme de neige (bas-centre) */
    const snowman = findFree(isFree, B.CX + 30, B.T + B.H * 0.845, 62);
    if (snowman) {
      ctx.save(); ctx.translate(snowman.x, snowman.y);
      ellipseShadow(ctx, 0, 40, 52, 11, 0.22);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#D5E4EE'; ctx.lineWidth = 2.5;
      const ball = (y, r) => { ctx.beginPath(); ctx.arc(0, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
      ball(24, 27); ball(-12, 19); ball(-38, 13.5);
      // écharpe
      ctx.fillStyle = '#E2574C';
      ctx.beginPath(); ctx.ellipse(0, -24, 13.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(4, -24, 8, 20);
      // yeux + boutons charbon
      ctx.fillStyle = '#2B2B33';
      ctx.beginPath(); ctx.arc(-5, -41, 1.8, 0, Math.PI * 2); ctx.arc(5, -41, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -32, 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -12, 2.1, 0, Math.PI * 2); ctx.arc(0, 2, 2.1, 0, Math.PI * 2); ctx.arc(0, 16, 2.1, 0, Math.PI * 2); ctx.fill();
      // carotte
      ctx.fillStyle = '#FF8C42';
      ctx.beginPath(); ctx.moveTo(0, -36.5); ctx.lineTo(13, -34); ctx.lineTo(0, -31.5); ctx.closePath(); ctx.fill();
      // bras en bois
      ctx.strokeStyle = '#6E4A2A'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-16, -14); ctx.lineTo(-36, -26); ctx.moveTo(-30, -22); ctx.lineTo(-34, -13); ctx.moveTo(-26, -19) ; ctx.lineTo(-23, -10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(16, -14); ctx.lineTo(36, -24); ctx.moveTo(30, -20); ctx.lineTo(33, -11); ctx.moveTo(27, -17); ctx.lineTo(24, -8); ctx.stroke();
      ctx.restore();
    }

    /* Bassins : phoque (gauche) / ours polaire (droite) */
    function pool(x, y, rx, ry) {
      ctx.save(); ctx.translate(x, y);
      // rebord de neige
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (rx + 2), Math.sin(a) * (ry + 2), 14 + (i % 3) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // eau
      ctx.fillStyle = '#79CFEE';
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#A5E4F7';
      ctx.beginPath(); ctx.ellipse(-rx * 0.25, -ry * 0.3, rx * 0.55, ry * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      // anneau de glace flottant
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(rx * 0.38, ry * 0.32, rx * 0.3, ry * 0.32, 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const poolL = findFree(isFree, B.CX - B.W * 0.285, B.CY, 118);
    const poolR = findFree(isFree, B.CX + B.W * 0.285, B.CY, 118);

    if (poolL) {
      pool(poolL.x, poolL.y, 96, 62);
      // phoque : corps + tête relevée
      ctx.save(); ctx.translate(poolL.x - 6, poolL.y + 4);
      ctx.fillStyle = '#B9C6D2';
      ctx.beginPath(); ctx.ellipse(0, 8, 44, 17, 0, 0, Math.PI * 2); ctx.fill();          // corps
      ctx.beginPath(); ctx.ellipse(-38, 6, 12, 9, -0.5, 0, Math.PI * 2); ctx.fill();      // queue (nageoire)
      ctx.beginPath(); ctx.ellipse(38, 2, 15, 14, 0, 0, Math.PI * 2); ctx.fill();         // tête
      ctx.strokeStyle = '#8B9AA8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-46, 2); ctx.lineTo(-56, -8); ctx.moveTo(-48, 10); ctx.lineTo(-58, 14); ctx.stroke(); // nageoire caudale
      // museau + moustaches
      ctx.fillStyle = '#8B9AA8';
      ctx.beginPath(); ctx.ellipse(47, 4, 6, 4.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5E6B78'; ctx.lineWidth = 1.3;
      for (const dy of [-2, 0.5, 3]) {
        ctx.beginPath(); ctx.moveTo(48, 4 + dy); ctx.lineTo(58, 3 + dy * 2); ctx.stroke();
      }
      // œil fermé content
      ctx.strokeStyle = '#2F3A44'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(40, -3, 3.2, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.restore();
    }

    if (poolR) {
      pool(poolR.x, poolR.y, 96, 62);
      // ours polaire endormi sur la banquise (au bord du bassin)
      ctx.save(); ctx.translate(poolR.x + 4, poolR.y + 2);
      ctx.fillStyle = '#FBFDFF';
      ctx.strokeStyle = '#D5E4EE'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(0, 6, 52, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();  // corps couché
      ctx.beginPath(); ctx.ellipse(-44, 12, 13, 9, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); // fesses
      // tête posée sur les pattes
      ctx.beginPath(); ctx.arc(40, 2, 15.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(34, -10, 4.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();  // oreille
      ctx.beginPath(); ctx.arc(48, -9, 4.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();   // oreille
      ctx.fillStyle = '#2F3A44';
      ctx.beginPath(); ctx.arc(46, 1, 2, 0, Math.PI * 2); ctx.fill();                     // nez
      ctx.strokeStyle = '#2F3A44'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(38, -2, 3.4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); // œil clos
      // pattes avant allongées
      ctx.strokeStyle = '#FBFDFF'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(30, 14); ctx.lineTo(52, 17); ctx.stroke();
      // Zzz
      ctx.fillStyle = '#5E7A90';
      ctx.font = 'bold 15px "Comic Sans MS", cursive';
      ctx.fillText('z', 46, -24);
      ctx.font = 'bold 21px "Comic Sans MS", cursive';
      ctx.fillText('Z', 58, -40);
      ctx.font = 'bold 28px "Comic Sans MS", cursive';
      ctx.fillText('Z', 74, -62);
      ctx.restore();
    }

    /* Pingouins pêcheurs */
    function penguin(x, y, s, flip, fishing) {
      ctx.save(); ctx.translate(x, y); ctx.scale((flip ? -1 : 1) * s, s);
      ellipseShadow(ctx, 0, 16, 17, 5.5, 0.25);
      // corps
      ctx.fillStyle = '#2E3A4A';
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 16, 0, 0, Math.PI * 2); ctx.fill();
      // ventre + visage blancs
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(0, 4, 8.5, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -9, 9.5, 7.5, 0, 0, Math.PI * 2); ctx.fill();
      // yeux + bec
      ctx.fillStyle = '#222B36';
      ctx.beginPath(); ctx.arc(-3.6, -10, 1.5, 0, Math.PI * 2); ctx.arc(3.6, -10, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FF9F2E';
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5.4, -4.6); ctx.lineTo(0, -2.6); ctx.closePath(); ctx.fill();
      // ailes
      ctx.fillStyle = '#2E3A4A';
      ctx.beginPath(); ctx.ellipse(-13, 2, 4.5, 9, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(13, 2, 4.5, 9, -0.5, 0, Math.PI * 2); ctx.fill();
      // pattes
      ctx.fillStyle = '#FF9F2E';
      ctx.fillRect(-8, 15, 6, 3.4); ctx.fillRect(2, 15, 6, 3.4);
      if (fishing) {
        // canne à pêche
        ctx.strokeStyle = '#6E4A2A'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(12, 4); ctx.lineTo(34, -18); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(34, -18); ctx.lineTo(44, 10); ctx.stroke();
        ctx.fillStyle = '#FF6F61';
        ctx.beginPath(); ctx.arc(44, 11, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    if (poolL) {
      penguin(poolL.x - 66, poolL.y - 6, 0.9, false, true);
      penguin(poolL.x + 60, poolL.y + 46, 0.72, true, false);
    }
    if (poolR) {
      penguin(poolR.x + 66, poolR.y - 10, 0.9, true, true);
      penguin(poolR.x - 62, poolR.y + 48, 0.7, false, false);
    }

    /* Pics de glace cristallins */
    function iceShard(x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ellipseShadow(ctx, 0, 4, 52, 10, 0.2);
      const shard = (pts) => {
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
      };
      // grand pic central
      shard([[-16, 0], [-8, -64], [4, -20], [10, -88], [22, 0]]);
      ctx.fillStyle = '#DFF3FF'; ctx.fill();
      ctx.strokeStyle = '#A9D2EA'; ctx.lineWidth = 2.4; ctx.stroke();
      // facette
      ctx.fillStyle = '#FFFFFF';
      shard([[4, -18], [10, -80], [15, -18]]); ctx.fill();
      // pic gauche
      shard([[-34, 0], [-26, -34], [-12, 0]]);
      ctx.fillStyle = '#CDE9F8'; ctx.fill(); ctx.stroke();
      // pic droit
      shard([[20, 0], [30, -42], [42, 0]]);
      ctx.fillStyle = '#CDE9F8'; ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    const shardSpots = [
      [B.L + B.W * 0.06, B.T + B.H * 0.18, 1.15],
      [B.R - B.W * 0.06, B.T + B.H * 0.20, 0.95],
      [B.L + B.W * 0.05, B.B - B.H * 0.17, 0.9],
      [B.R - B.W * 0.05, B.B - B.H * 0.20, 1.1]
    ];
    for (const [sx, sy, ss] of shardSpots) {
      const p = findFree(isFree, sx, sy, 46 * ss);
      if (p) iceShard(p.x, p.y, ss);
    }

    /* Fleurs de givre (étoiles vertes) */
    for (let i = 0; i < 12; i++) {
      const fx = B.L + 40 + rnd() * (B.W - 80), fy = B.T + 40 + rnd() * (B.H - 80);
      if (!isFree(fx, fy, 12)) continue;
      ctx.save(); ctx.translate(fx, fy);
      ctx.strokeStyle = '#5FCB96'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.stroke();
      }
      ctx.fillStyle = '#DFF9EA';
      ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    /* Étincelles de neige */
    for (let i = 0; i < 16; i++) {
      sparkle4(ctx, B.L + rnd() * B.W, B.T + rnd() * B.H, 3 + rnd() * 5, '#FFFFFF', 0.5 + rnd() * 0.5);
    }
  }

  /* ~~~~~~~~~~~~~~~~~~~~ NUIT ÉTOILÉE ~~~~~~~~~~~~~~~~~~~~ */
  function decorNuit(ctx, world, isFree) {
    const B = boundsOf(world);
    const rnd = makeSeededRand(20251031);

    // Voie lactée : large bande laiteuse en diagonale
    ctx.save();
    ctx.translate(B.CX, B.CY);
    ctx.rotate(-0.5);
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = 'rgba(210, 215, 255, ' + (0.05 + 0.02 * (2 - Math.abs(i))) + ')';
      ctx.beginPath(); ctx.ellipse(i * 130, 0, 340, 60 + (2 - Math.abs(i)) * 26, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Étoiles (petits points + croix scintillantes)
    for (let i = 0; i < 120; i++) {
      const x = B.L + rnd() * B.W, y = B.T + rnd() * B.H;
      ctx.globalAlpha = 0.35 + rnd() * 0.65;
      ctx.fillStyle = rnd() < 0.18 ? '#FFE9A8' : '#FFFFFF';
      ctx.beginPath(); ctx.arc(x, y, 0.7 + rnd() * 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 14; i++) {
      sparkle4(ctx, B.L + rnd() * B.W, B.T + rnd() * B.H, 3.5 + rnd() * 4.5, i % 3 ? '#FFFFFF' : '#FFE9A8', 0.95);
    }

    /* Planète annelée souriante (haut-gauche) */
    const planet = findFree(isFree, -1120, -430, 118);
    if (planet) {
      ctx.save(); ctx.translate(planet.x, planet.y);
      // anneau arrière
      ctx.strokeStyle = '#FFD166'; ctx.lineWidth = 13; ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.ellipse(0, 6, 96, 26, -0.28, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
      ctx.globalAlpha = 1;
      // corps
      const g = ctx.createRadialGradient(-18, -22, 8, 0, 0, 66);
      g.addColorStop(0, '#FFD9E8'); g.addColorStop(0.55, '#FF9ECB'); g.addColorStop(1, '#E56BA4');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.fill();
      // bandes
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(-60, -12, 120, 8);
      ctx.fillRect(-60, 10, 120, 6);
      ctx.restore();
      // anneau avant
      ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 13;
      ctx.beginPath(); ctx.ellipse(0, 6, 96, 26, -0.28, 0.06, Math.PI * 0.94); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 6, 96, 26, -0.28, 0.06, Math.PI * 0.94); ctx.stroke();
      // visage kawaii
      happyEyes(ctx, 0, -6, 17, 6.5, '#5A2E44');
      smile(ctx, 0, 8, 12, '#5A2E44');
      ctx.fillStyle = 'rgba(255,120,150,0.65)';
      ctx.beginPath(); ctx.ellipse(-26, 4, 5.5, 3.6, 0, 0, Math.PI * 2); ctx.ellipse(26, 4, 5.5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    /* Lune endormie (haut-droite) */
    const moon = findFree(isFree, 1150, -430, 90);
    if (moon) {
      ctx.save(); ctx.translate(moon.x, moon.y);
      // croissant : arc extérieur puis arc intérieur inversé
      ctx.fillStyle = '#FFE9A0';
      ctx.beginPath();
      ctx.arc(0, 0, 64, Math.PI * 0.32, Math.PI * 1.68);
      ctx.arc(24, 0, 50, Math.PI * 1.62, Math.PI * 0.38, true);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#E8C96A'; ctx.lineWidth = 3; ctx.stroke();
      // cratères
      ctx.fillStyle = 'rgba(230,200,130,0.8)';
      ctx.beginPath(); ctx.arc(-18, -18, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-26, 14, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-4, 26, 4, 0, Math.PI * 2); ctx.fill();
      // œil endormi + bouche
      ctx.strokeStyle = '#7A6234'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-14, -6, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(-12, 10, 3.2, 0, Math.PI * 2); ctx.stroke();
      // Z z z
      ctx.fillStyle = '#FFF6C8';
      ctx.font = 'bold 17px "Comic Sans MS", cursive';
      ctx.fillText('z', 16, -22);
      ctx.font = 'bold 23px "Comic Sans MS", cursive';
      ctx.fillText('z', 30, -40);
      ctx.font = 'bold 31px "Comic Sans MS", cursive';
      ctx.fillText('Z', 48, -64);
      ctx.restore();
    }

    /* Fusée rose (bas-gauche) */
    const rocket = findFree(isFree, -1120, 400, 92);
    if (rocket) {
      ctx.save(); ctx.translate(rocket.x, rocket.y); ctx.rotate(-0.6);
      // flamme
      ctx.fillStyle = '#FF9F2E';
      ctx.beginPath(); ctx.moveTo(0, 74); ctx.quadraticCurveTo(-15, 50, -8, 26); ctx.lineTo(8, 26); ctx.quadraticCurveTo(15, 50, 0, 74); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFE066';
      ctx.beginPath(); ctx.moveTo(0, 58); ctx.quadraticCurveTo(-8, 42, -4, 27); ctx.lineTo(4, 27); ctx.quadraticCurveTo(8, 42, 0, 58); ctx.closePath(); ctx.fill();
      // ailerons
      ctx.fillStyle = '#E85A9B';
      ctx.beginPath(); ctx.moveTo(-19, 8); ctx.lineTo(-38, 34); ctx.lineTo(-16, 28); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(19, 8); ctx.lineTo(38, 34); ctx.lineTo(16, 28); ctx.closePath(); ctx.fill();
      // corps
      const grad = ctx.createLinearGradient(-20, 0, 20, 0);
      grad.addColorStop(0, '#FF7FB6'); grad.addColorStop(0.45, '#FFB3D4'); grad.addColorStop(1, '#FF7FB6');
      ctx.fillStyle = grad;
      rr(ctx, -19, -48, 38, 78, 17); ctx.fill();
      ctx.strokeStyle = '#D14E86'; ctx.lineWidth = 2.4; ctx.stroke();
      // coiffe
      ctx.fillStyle = '#E85A9B';
      ctx.beginPath(); ctx.moveTo(-17, -44); ctx.quadraticCurveTo(0, -84, 17, -44); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#D14E86'; ctx.stroke();
      // hublot
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(0, -12, 11.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8FE0FF';
      ctx.beginPath(); ctx.arc(0, -12, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(4, -16); ctx.stroke();
      // rivets
      ctx.fillStyle = '#D14E86';
      for (const ry of [10, 22]) { ctx.beginPath(); ctx.arc(-11, ry, 1.7, 0, Math.PI * 2); ctx.arc(11, ry, 1.7, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      // traînée d'étoiles
      sparkle4(ctx, rocket.x - 58, rocket.y + 52, 5, '#FFE066', 0.95);
      sparkle4(ctx, rocket.x - 84, rocket.y + 78, 3.6, '#FFFFFF', 0.9);
      sparkle4(ctx, rocket.x - 34, rocket.y + 82, 3, '#FFD1E8', 0.9);
    }

    /* Télescope (bas-droite) */
    const scope = findFree(isFree, 1150, 400, 78);
    if (scope) {
      ctx.save(); ctx.translate(scope.x, scope.y);
      ellipseShadow(ctx, 0, 40, 62, 13, 0.25);
      // trépied
      ctx.strokeStyle = '#8E97B8'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-34, 52); ctx.moveTo(0, 6); ctx.lineTo(34, 52); ctx.moveTo(0, 6); ctx.lineTo(0, 54); ctx.stroke();
      // tube orienté vers le ciel
      ctx.save();
      ctx.translate(0, 0); ctx.rotate(-0.62);
      ctx.fillStyle = '#A8C6FF';
      rr(ctx, -12, -66, 24, 78, 9); ctx.fill();
      ctx.strokeStyle = '#5E6FA8'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.fillStyle = '#7E97D8';
      ctx.fillRect(-12, -46, 24, 7);
      ctx.fillRect(-12, -18, 24, 7);
      // ouverture + oculaire
      ctx.fillStyle = '#3A466B';
      ctx.beginPath(); ctx.ellipse(0, -66, 12, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5E6FA8';
      ctx.fillRect(-5, 10, 10, 10);
      ctx.restore();
      ctx.fillStyle = '#FFD166';
      ctx.beginPath(); ctx.arc(0, 2, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      sparkle4(ctx, scope.x - 42, scope.y - 66, 4.5, '#FFFFFF', 0.9);
    }

    /* Petites planètes annelées */
    function miniPlanet(x, y, r, body, ring) {
      ctx.save(); ctx.translate(x, y);
      ctx.strokeStyle = ring; ctx.lineWidth = r * 0.34; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.ellipse(0, 2, r * 1.7, r * 0.45, -0.25, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.42, r * 0.3, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const mp1 = findFree(isFree, -650, -40, 44);
    const mp2 = findFree(isFree, 660, 60, 42);
    if (mp1) miniPlanet(mp1.x, mp1.y, 26, '#9BD8FF', '#FFE066');
    if (mp2) miniPlanet(mp2.x, mp2.y, 22, '#D8B4FE', '#8FE0D0');

    /* Petits monstres ronds souriants */
    function monster(x, y, r, color, horns) {
      ctx.save(); ctx.translate(x, y);
      ellipseShadow(ctx, 0, r * 0.9, r * 1.1, r * 0.36, 0.3);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2; ctx.stroke();
      if (horns) {
        ctx.fillStyle = color;
        for (const s of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(s * r * 0.45, -r * 0.75); ctx.lineTo(s * r * 0.72, -r * 1.3); ctx.lineTo(s * r * 0.12, -r * 0.92); ctx.closePath(); ctx.fill();
        }
      } else {
        // antenne avec boule
        ctx.strokeStyle = color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.quadraticCurveTo(r * 0.1, -r * 1.45, r * 0.3, -r * 1.5); ctx.stroke();
        ctx.fillStyle = '#FFE066';
        ctx.beginPath(); ctx.arc(r * 0.32, -r * 1.52, r * 0.17, 0, Math.PI * 2); ctx.fill();
      }
      // yeux (un ou deux)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(-r * 0.36, -r * 0.15, r * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.36, -r * 0.15, r * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2B2B33';
      ctx.beginPath(); ctx.arc(-r * 0.34, -r * 0.13, r * 0.115, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.38, -r * 0.13, r * 0.115, 0, Math.PI * 2); ctx.fill();
      // grand sourire
      ctx.strokeStyle = '#2B2B33'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, r * 0.18, r * 0.42, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
      // petites dents
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-r * 0.18, r * 0.40, r * 0.13, r * 0.14);
      ctx.fillRect(r * 0.05, r * 0.40, r * 0.13, r * 0.14);
      // petits pieds
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(-r * 0.4, r * 0.92, r * 0.2, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.4, r * 0.92, r * 0.2, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const m1 = findFree(isFree, -640, 150, 42);
    const m2 = findFree(isFree, 650, -150, 42);
    const m3 = findFree(isFree, 0, 330, 40);
    if (m1) monster(m1.x, m1.y, 30, '#A78BFA', true);
    if (m2) monster(m2.x, m2.y, 27, '#67E8F9', false);
    if (m3) monster(m3.x, m3.y, 24, '#FDA4AF', true);

    /* Étoile filante */
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    const sx = B.L + B.W * 0.62, sy = B.T + B.H * 0.10;
    const grad = ctx.createLinearGradient(sx, sy, sx - 120, sy + 66);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = grad;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 120, sy + 66); ctx.stroke();
    sparkle4(ctx, sx, sy, 6, '#FFFFFF', 1);
    ctx.restore();
  }

  /* ~~~~~~~~~~~~~~~~~~~~ AU-DESSUS DES NUAGES ~~~~~~~~~~~~~~~~~~~~ */
  function decorNuages(ctx, world, isFree) {
    const B = boundsOf(world);
    const rnd = makeSeededRand(20260506);

    /* Arc-en-ciel (derrière les nuages) */
    ctx.save();
    const rb = { x: B.L + B.W * 0.30, y: B.B + 60, r: B.H * 0.62 };
    const cols = ['#FF6B6B', '#FFA94D', '#FFE066', '#8CE99A', '#74C0FC', '#9775FA', '#DA77F2'];
    ctx.lineWidth = 22; ctx.globalAlpha = 0.9;
    for (let i = 0; i < cols.length; i++) {
      ctx.strokeStyle = cols[i];
      ctx.beginPath(); ctx.arc(rb.x, rb.y, rb.r - i * 22, Math.PI, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();

    /* Soleil souriant (haut-droite) */
    const sun = findFree(isFree, B.R - B.W * 0.13, B.T + B.H * 0.13, 95);
    if (sun) {
      ctx.save(); ctx.translate(sun.x, sun.y);
      // rayons
      ctx.fillStyle = '#FFD93D';
      for (let i = 0; i < 12; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 6);
        ctx.beginPath(); ctx.moveTo(0, -66); ctx.lineTo(-11, -104); ctx.lineTo(11, -104); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      const g = ctx.createRadialGradient(-10, -10, 6, 0, 0, 56);
      g.addColorStop(0, '#FFF3B0'); g.addColorStop(1, '#FFD93D');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#E8B93B'; ctx.lineWidth = 3; ctx.stroke();
      happyEyes(ctx, 0, -8, 15, 6, '#7A5B12');
      smile(ctx, 0, 6, 12, '#7A5B12');
      ctx.fillStyle = 'rgba(255,170,80,0.75)';
      ctx.beginPath(); ctx.ellipse(-19, 4, 5.5, 3.6, 0, 0, Math.PI * 2); ctx.ellipse(19, 4, 5.5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    /* Montgolfière rayée (dans la boucle) */
    const balloon = findFree(isFree, -150, -120, 105);
    if (balloon) {
      ctx.save(); ctx.translate(balloon.x, balloon.y);
      // enveloppe : sphéroïde à rayures verticales via clip
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, -30, 52, 58, 0, 0, Math.PI * 2); ctx.clip();
      const stripeCols = ['#FF6FAE', '#FFF3F9', '#FFD166', '#FFF3F9', '#FF6FAE', '#FFF3F9', '#FFD166'];
      const sw = 104 / stripeCols.length;
      for (let i = 0; i < stripeCols.length; i++) {
        ctx.fillStyle = stripeCols[i];
        ctx.fillRect(-52 + i * sw, -95, sw + 1, 135);
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(120,60,90,0.5)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(0, -30, 52, 58, 0, 0, Math.PI * 2); ctx.stroke();
      // jupe
      ctx.fillStyle = '#E85A9B';
      ctx.beginPath(); ctx.moveTo(-17, 22); ctx.lineTo(17, 22); ctx.lineTo(11, 36); ctx.lineTo(-11, 36); ctx.closePath(); ctx.fill();
      // cordes + nacelle
      ctx.strokeStyle = '#6E4A2A'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-14, 36); ctx.lineTo(-10, 52); ctx.moveTo(14, 36); ctx.lineTo(10, 52); ctx.stroke();
      ctx.fillStyle = '#A9803E';
      rr(ctx, -13, 52, 26, 15, 3); ctx.fill();
      ctx.strokeStyle = '#7A5A2C'; ctx.stroke();
      // visage kawaii sur l'enveloppe
      happyEyes(ctx, 0, -34, 13, 5, '#5A2E44');
      smile(ctx, 0, -16, 8, '#5A2E44');
      ctx.restore();
    }

    /* Hirondelles (silhouettes) */
    function swallow(x, y, s) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.strokeStyle = '#2E3A5C'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.quadraticCurveTo(-8, -9, 0, 0); ctx.quadraticCurveTo(8, -9, 16, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, 2); ctx.quadraticCurveTo(0, 5, 7, 2); ctx.stroke();
      ctx.restore();
    }
    const swallowSpots = [[-320, 60, 1.1], [340, -40, 0.9], [60, -260, 0.8], [260, 140, 1.0], [-140, 240, 0.75]];
    for (const [sx, sy, s] of swallowSpots) {
      swallow(sx, sy, s);
    }

    /* Mer de nuages : amas bouclés partout (hors piste) */
    function cloudPuff(x, y, s, alpha) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = alpha;
      // ombre douce sous le nuage
      ctx.fillStyle = 'rgba(160,190,220,0.85)';
      ctx.beginPath(); ctx.ellipse(0, 12, 52, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-30, 4, 17, 0, Math.PI * 2);
      ctx.arc(-10, -10, 21, 0, Math.PI * 2);
      ctx.arc(14, -8, 18, 0, Math.PI * 2);
      ctx.arc(32, 6, 15, 0, Math.PI * 2);
      ctx.arc(0, 8, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // gros amas sur les bords + petits partout
    for (let i = 0; i < 26; i++) {
      const edge = i < 14; // 14 gros sur les pourtours, 12 petits/partout
      let x, y;
      if (edge) {
        const side = i % 4;
        if (side === 0) { x = B.L + rnd() * B.W; y = B.T + rnd() * B.H * 0.14; }
        else if (side === 1) { x = B.L + rnd() * B.W; y = B.B - rnd() * B.H * 0.14; }
        else if (side === 2) { x = B.L + rnd() * B.W * 0.13; y = B.T + rnd() * B.H; }
        else { x = B.R - rnd() * B.W * 0.13; y = B.T + rnd() * B.H; }
      } else {
        x = B.L + B.W * 0.12 + rnd() * B.W * 0.76;
        y = B.T + B.H * 0.12 + rnd() * B.H * 0.76;
      }
      const s = edge ? (0.9 + rnd() * 0.9) : (0.45 + rnd() * 0.55);
      if (!isFree(x, y, 34 * s)) continue;
      cloudPuff(x, y, s, edge ? 0.96 : 0.88);
    }
    // 2-3 nuages bas au ventre rond avec visage endormi
    const napSpots = [[0.30, 0.62], [0.74, 0.60], [0.55, 0.28]];
    for (const [fx, fy] of napSpots) {
      const p = findFree(isFree, B.L + B.W * fx, B.T + B.H * fy, 52);
      if (!p) continue;
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.96;
      ctx.beginPath();
      ctx.arc(-18, 2, 15, 0, Math.PI * 2); ctx.arc(0, -9, 18, 0, Math.PI * 2); ctx.arc(18, 2, 15, 0, Math.PI * 2); ctx.arc(0, 7, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      happyEyes(ctx, 0, 0, 8.5, 3.4, '#7A86A0');
      ctx.restore();
    }
  }

  return {
    ellipseShadow: ellipseShadow,
    sparkle: sparkle,
    flowerStar: flowerStar,
    bush: bush,
    cloud: cloud,
    render: function (ctx, def, world, isFree) {
      switch (def.decor) {
        case 'prairie': return decorPrairie(ctx, world);
        case 'plage': return decorPlage(ctx, world, isFree);
        case 'gouter': return decorGouter(ctx, world, isFree);
        case 'potager': return decorPotager(ctx, world, isFree);
        case 'salledebain': return decorSalledebain(ctx, world, isFree);
        case 'banquise': return decorBanquise(ctx, world, isFree);
        case 'nuit': return decorNuit(ctx, world, isFree);
        case 'nuages': return decorNuages(ctx, world, isFree);
        default:
          console.warn('[decor] ambiance inconnue :', def.decor);
      }
    }
  };
})();
