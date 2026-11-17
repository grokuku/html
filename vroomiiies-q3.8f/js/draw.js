/* Vroomiiies — dessin procédural : sprites karts (orientés +x, pré-rendus),
   avatars buste, décors animés (paramètre t). Types de décors inconnus = rien ne
   dessine (garde dans drawDecor). */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};
  var C = V.C, U = V.U;

  var SPR = 64; // taille logique du sprite kart (px)
  var ZOOM_SPR = 2; // supersampling du sprite

  function perso(id) {
    for (var i = 0; i < C.PERSONNAGES.length; i++) if (C.PERSONNAGES[i].id === id) return C.PERSONNAGES[i];
    return C.PERSONNAGES[0];
  }

  // ---------- formes kawaii partagées ----------
  function visage(ctx, x, y, r, colVisage, colContour) {
    ctx.fillStyle = colVisage;
    ctx.strokeStyle = colContour;
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU); ctx.fill();
    // yeux
    ctx.fillStyle = colContour;
    var ex = r * 0.38, ey = -r * 0.08, er = r * 0.14;
    ctx.beginPath(); ctx.arc(x - ex, y + ey, er, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + ex, y + ey, er, 0, U.TAU); ctx.fill();
    // reflets
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(x - ex + er * 0.35, y + ey - er * 0.35, er * 0.42, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + ex + er * 0.35, y + ey - er * 0.35, er * 0.42, 0, U.TAU); ctx.fill();
    // joues
    ctx.fillStyle = 'rgba(255,126,185,.5)';
    ctx.beginPath(); ctx.arc(x - r * 0.6, y + r * 0.3, r * 0.16, 0, U.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.6, y + r * 0.3, r * 0.16, 0, U.TAU); ctx.fill();
    // bouche « w »
    ctx.strokeStyle = colContour;
    ctx.lineWidth = Math.max(1.2, r * 0.09);
    ctx.beginPath();
    var my = y + r * 0.34, mw = r * 0.2;
    ctx.moveTo(x - mw, my);
    ctx.quadraticCurveTo(x - mw / 2, my + r * 0.16, x, my);
    ctx.quadraticCurveTo(x + mw / 2, my + r * 0.16, x + mw, my);
    ctx.stroke();
  }

  function oreilles(ctx, type, x, y, r, col, colContour, colAcc) {
    ctx.fillStyle = col;
    ctx.strokeStyle = colContour;
    ctx.lineWidth = Math.max(1.2, r * 0.1);
    var i;
    if (type === 'lapin') {
      for (i = -1; i <= 1; i += 2) {
        ctx.save(); ctx.translate(x + i * r * 0.42, y - r * 0.9); ctx.rotate(i * 0.22);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.24, r * 0.72, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.beginPath(); ctx.ellipse(0, r * 0.04, r * 0.11, r * 0.5, 0, 0, U.TAU); ctx.fill();
        ctx.restore();
      }
    } else if (type === 'ours') {
      for (i = -1; i <= 1; i += 2) {
        ctx.beginPath(); ctx.arc(x + i * r * 0.72, y - r * 0.72, r * 0.34, 0, U.TAU); ctx.fill(); ctx.stroke();
      }
    } else if (type === 'chat') {
      for (i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(x + i * r * 0.35, y - r * 0.95);
        ctx.lineTo(x + i * r * 0.95, y - r * 0.95 + i * 0 - r * 0.1);
        ctx.lineTo(x + i * r * 0.78, y - r * 0.28);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    } else if (type === 'capme') { // oreilles tombantes
      for (i = -1; i <= 1; i += 2) {
        ctx.save(); ctx.translate(x + i * r * 0.8, y - r * 0.35); ctx.rotate(i * 0.5);
        ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.26, r * 0.6, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    } else if (type === 'antenne') {
      ctx.strokeStyle = colContour;
      ctx.beginPath(); ctx.moveTo(x, y - r * 0.9); ctx.lineTo(x, y - r * 1.45); ctx.stroke();
      ctx.fillStyle = colAcc;
      ctx.beginPath();
      for (var s = 0; s < 10; s++) {
        var ang = -Math.PI / 2 + s * Math.PI / 5;
        var rr = s % 2 === 0 ? r * 0.3 : r * 0.13;
        var px = x + Math.cos(ang) * rr, py = y - r * 1.6 + Math.sin(ang) * rr;
        s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }

  // ---------- sprite kart (orienté +x, nez à droite) ----------
  var spriteCache = {};
  function kartSprite(id) {
    if (spriteCache[id]) return spriteCache[id];
    var p = perso(id);
    var cv = root.document.createElement('canvas');
    cv.width = cv.height = SPR * ZOOM_SPR;
    var ctx = cv.getContext('2d');
    ctx.scale(ZOOM_SPR, ZOOM_SPR);
    var cx = SPR / 2, cy = SPR / 2;
    var col = p.couleurs;

    // roues (avant à droite)
    ctx.fillStyle = '#5A4668';
    function roue(wx, wy) {
      ctx.save(); ctx.translate(wx, wy);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-7, -4.5, 14, 9, 4); else ctx.rect(-7, -4.5, 14, 9);
      ctx.fill(); ctx.restore();
    }
    roue(cx + 15, cy - 15); roue(cx + 15, cy + 15);
    roue(cx - 15, cy - 15); roue(cx - 15, cy + 15);

    // aileron arrière
    ctx.fillStyle = col.accent;
    ctx.strokeStyle = col.contour; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx - 27, cy - 13, 7, 26, 3); else ctx.rect(cx - 27, cy - 13, 7, 26);
    ctx.fill(); ctx.stroke();

    // corps : la boulette-character du kart
    ctx.fillStyle = col.corps;
    ctx.strokeStyle = col.contour;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx + 2, cy, 19, 0, U.TAU); ctx.fill(); ctx.stroke();
    // nez (capot avant)
    ctx.fillStyle = col.toit;
    ctx.beginPath(); ctx.ellipse(cx + 16, cy, 8, 11, 0, 0, U.TAU); ctx.fill(); ctx.stroke();

    // visage du character sur le corps
    oreilles(ctx, p.oreilles, cx + 2, cy, 19 * 0.9, col.corps, col.contour, col.accent);
    visage(ctx, cx + 2, cy, 12, col.visage, col.contour);

    spriteCache[id] = cv;
    return cv;
  }

  // ---------- avatar buste pour les écrans ----------
  var avatarCache = {};
  function avatar(id, size) {
    size = size || 56;
    var key = id + '@' + size;
    if (avatarCache[key]) return avatarCache[key];
    var p = perso(id);
    var z = 2;
    var cv = root.document.createElement('canvas');
    cv.width = cv.height = size * z;
    var ctx = cv.getContext('2d');
    ctx.scale(z, z);
    var cx = size / 2, r = size * 0.34;
    // buste
    ctx.fillStyle = p.couleurs.accent;
    ctx.strokeStyle = p.couleurs.contour; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(cx, size * 1.02, size * 0.4, size * 0.3, 0, Math.PI, 0); ctx.fill();
    oreilles(ctx, p.oreilles, cx, size * 0.44, r, p.couleurs.corps, p.couleurs.contour, p.couleurs.accent);
    // tête
    ctx.fillStyle = p.couleurs.corps;
    ctx.beginPath(); ctx.arc(cx, size * 0.44, r * 0.95, 0, U.TAU); ctx.fill();
    ctx.stroke();
    visage(ctx, cx, size * 0.44, r * 0.72, p.couleurs.visage, p.couleurs.contour);
    avatarCache[key] = cv;
    return cv;
  }

  // ---------- bonbon étoile (item) ----------
  function etoile(ctx, x, y, r, t, teinte) {
    var pulse = 1 + 0.12 * Math.sin(t * 5 + x * 0.05);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 2) * 0.15);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = teinte || '#FFD34E';
    ctx.strokeStyle = '#6D4C7D';
    ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.beginPath();
    for (var s = 0; s < 10; s++) {
      var ang = -Math.PI / 2 + s * Math.PI / 5;
      var rr = s % 2 === 0 ? r : r * 0.45;
      var px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
      s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // petit reflet
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.3, r * 0.16, 0, U.TAU); ctx.fill();
    ctx.restore();
  }

  // ---------- décors ----------
  function ombre(ctx, x, y, rx, ry) {
    ctx.fillStyle = 'rgba(109,76,125,.15)';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, U.TAU); ctx.fill();
  }

  var DECORS = {
    // manège rotatif
    manege: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, a = t * 0.9 + d.graine * 6;
      ombre(ctx, x, y + r * 0.2, r * 1.05, r * 0.42);
      // estrade
      ctx.fillStyle = '#FFE3F1'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.42, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      // mât + toit rayé
      ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r * 1.5); ctx.stroke();
      for (var i = 0; i < 8; i++) {
        var a0 = (i / 8) * U.TAU, a1 = ((i + 1) / 8) * U.TAU;
        ctx.fillStyle = i % 2 ? '#FF7EB9' : '#FFF3C4';
        ctx.beginPath(); ctx.moveTo(x, y - r * 1.5);
        ctx.arc(x, y - r * 1.5, r * 1.02, a0 + a * 0.2, a1 + a * 0.2);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y - r * 1.5, r * 1.02, 0, U.TAU); ctx.stroke();
      // chevaux (pastilles) qui tournent
      for (var k = 0; k < 4; k++) {
        var ang = a + (k / 4) * U.TAU;
        var px = x + Math.cos(ang) * r * 0.72, py = y + Math.sin(ang) * r * 0.3 - r * 0.3 + Math.sin(t * 4 + k) * 3;
        ctx.fillStyle = ['#A2B9E7', '#CFF3C8', '#FCE38A', '#FF9EC9'][k];
        ctx.beginPath(); ctx.arc(px, py, r * 0.16, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2; ctx.stroke();
      }
    },
    // grappe de ballons flottants
    ballons: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.8, r * 0.7, r * 0.25);
      var cols = ['#FF7EB9', '#A2B9E7', '#FCE38A', '#CFF3C8'];
      for (var i = 0; i < 4; i++) {
        var bx = x + Math.cos(i * 1.9 + d.graine * 9) * r * 0.55 + Math.sin(t * 1.4 + i * 2.1) * 3;
        var by = y + Math.sin(i * 1.9 + d.graine * 9) * r * 0.3 - Math.sin(t * 1.1 + i) * 4;
        ctx.strokeStyle = 'rgba(109,76,125,.5)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(bx, by + r * 0.4); ctx.quadraticCurveTo(bx + 3, by + r * 0.9, x, y + r * 0.7); ctx.stroke();
        ctx.fillStyle = cols[i];
        ctx.beginPath(); ctx.ellipse(bx, by, r * 0.34, r * 0.42, 0, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.arc(bx - r * 0.12, by - r * 0.15, r * 0.09, 0, U.TAU); ctx.fill();
      }
    },
    // rangées de lapins spectateurs
    lapins: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      var cols = ['#FFFFFF', '#FFE3F1', '#E8D9F5', '#D9F0B8'];
      for (var row = 0; row < 3; row++) {
        for (var i = 0; i < 4 - row; i++) {
          var bx = x + (i - (3 - row) / 2) * r * 0.62 + row * r * 0.1;
          var by = y + row * r * 0.34;
          var saut = Math.abs(Math.sin(t * 3.4 + i * 1.3 + row * 0.9)) * r * 0.16;
          bx += Math.sin((i * 7 + row * 13 + d.graine * 31)) * r * 0.2;
          by -= saut;
          var rr = r * 0.2;
          ctx.fillStyle = cols[(i + row) % 4];
          ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 1.6;
          // oreilles
          for (var e = -1; e <= 1; e += 2) {
            ctx.save(); ctx.translate(bx + e * rr * 0.45, by - rr * 1.25); ctx.rotate(e * 0.18);
            ctx.beginPath(); ctx.ellipse(0, 0, rr * 0.26, rr * 0.8, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
            ctx.restore();
          }
          ctx.beginPath(); ctx.arc(bx, by, rr, 0, U.TAU); ctx.fill(); ctx.stroke();
          // yeux (points)
          ctx.fillStyle = '#6D4C7D';
          ctx.beginPath(); ctx.arc(bx - rr * 0.35, by - rr * 0.1, rr * 0.12, 0, U.TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(bx + rr * 0.35, by - rr * 0.1, rr * 0.12, 0, U.TAU); ctx.fill();
        }
      }
    },
    // fleur-bouton
    fleur: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      var respire = 1 + 0.08 * Math.sin(t * 2 + d.graine * 9);
      ombre(ctx, x, y + r * 1.6, r * 0.5, r * 0.18);
      ctx.strokeStyle = '#5FA85A'; ctx.lineWidth = Math.max(2, r * 0.16);
      ctx.beginPath(); ctx.moveTo(x, y + r * 1.5); ctx.quadraticCurveTo(x + Math.sin(t + d.graine * 7) * 3, y + r * 0.6, x, y); ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.8) * 0.1); ctx.scale(respire, respire);
      for (var i = 0; i < 6; i++) {
        var ang = (i / 6) * U.TAU + d.graine * 3;
        ctx.fillStyle = i % 2 ? '#FF9EC9' : '#FFD3E6';
        ctx.beginPath(); ctx.ellipse(Math.cos(ang) * r * 0.75, Math.sin(ang) * r * 0.75, r * 0.42, r * 0.3, ang, 0, U.TAU); ctx.fill();
      }
      ctx.fillStyle = '#FCE38A'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    },
    // moulin rotatif
    moulin: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.3, r * 0.9, r * 0.35);
      ctx.fillStyle = '#FFE3F1'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.4, y + r * 0.2); ctx.lineTo(x - r * 0.22, y - r * 1.1);
      ctx.lineTo(x + r * 0.22, y - r * 1.1); ctx.lineTo(x + r * 0.4, y + r * 0.2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      var a = t * 1.3 + d.graine * 5;
      ctx.save(); ctx.translate(x, y - r * 1.2);
      for (var i = 0; i < 4; i++) {
        ctx.save(); ctx.rotate(a + i * Math.PI / 2);
        ctx.fillStyle = i % 2 ? '#A2B9E7' : '#FFFFFF';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-r * 0.18, -r * 0.85); ctx.lineTo(r * 0.18, -r * 0.85); ctx.closePath();
        ctx.fill(); ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#F493BC'; ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = '#6D4C7D'; ctx.stroke();
      ctx.restore();
    },
    // bassin + grenouille animée
    bassin: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ctx.fillStyle = '#9ADDF0'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, d.graine * 2, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
      var ond = Math.sin(t * 2) * r * 0.06;
      ctx.beginPath(); ctx.ellipse(x, y + ond * 0.4, r * 0.62, r * 0.34, d.graine * 2, 0, U.TAU); ctx.stroke();
      // nénuphar
      ctx.fillStyle = '#7EC97A';
      ctx.beginPath(); ctx.arc(x - r * 0.45, y + r * 0.15, r * 0.2, 0.4, U.TAU + 0.1); ctx.fill();
      // grenouille : respire, coasse tous les ~3 s
      var cycle = (t + d.graine * 10) % 3;
      var gonfle = cycle < 0.45 ? 1 + 0.25 * Math.sin((cycle / 0.45) * Math.PI) : 1;
      var gx = x - r * 0.45, gy = y + r * 0.05 - (gonfle - 1) * r * 0.6;
      var gr = r * 0.24 * gonfle;
      ctx.fillStyle = '#8FD46E'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(gx, gy, gr, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8FD46E';
      ctx.beginPath(); ctx.arc(gx - gr * 0.5, gy - gr * 0.9, gr * 0.4, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(gx + gr * 0.5, gy - gr * 0.9, gr * 0.4, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6D4C7D';
      ctx.beginPath(); ctx.arc(gx - gr * 0.5, gy - gr * 0.95, gr * 0.14, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(gx + gr * 0.5, gy - gr * 0.95, gr * 0.14, 0, U.TAU); ctx.fill();
    },
    // couverture de pique-nique
    picnic: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ctx.save(); ctx.translate(x, y); ctx.rotate(d.graine * 6);
      ctx.fillStyle = '#FF9EC9';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-r, -r * 0.62, r * 2, r * 1.24, 10); else ctx.rect(-r, -r * 0.62, r * 2, r * 1.24);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (var i = -1; i <= 1; i++) { ctx.moveTo(i * r * 0.66, -r * 0.6); ctx.lineTo(i * r * 0.66, r * 0.6); }
      for (var j = 0; j < 2; j++) { ctx.moveTo(-r, (j - 0.5) * r * 0.62); ctx.lineTo(r, (j - 0.5) * r * 0.62); }
      ctx.stroke();
      ctx.restore();
      // panier
      ctx.fillStyle = '#E8C39E'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(x + r * 0.2, y - r * 0.2, r * 0.6, r * 0.44); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + r * 0.5, y - r * 0.2, r * 0.28, Math.PI, 0); ctx.stroke();
      // sandwich
      ctx.fillStyle = '#FCE38A';
      ctx.beginPath(); ctx.arc(x - r * 0.35, y + r * 0.1, r * 0.18, 0, U.TAU); ctx.fill(); ctx.stroke();
    },
    // stand de jouets
    stand: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.55, r * 1.1, r * 0.3);
      // comptoir
      ctx.fillStyle = '#FFF3C4'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - r * 0.9, y - r * 0.1, r * 1.8, r * 0.6, 6); else ctx.rect(x - r * 0.9, y - r * 0.1, r * 1.8, r * 0.6);
      ctx.fill(); ctx.stroke();
      // auvent rayé (légement ondulant)
      var a = Math.sin(t * 1.6 + d.graine * 8) * 0.03;
      ctx.save(); ctx.translate(x, y - r * 0.75); ctx.rotate(a);
      for (var i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#FF7EB9' : '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-r * 0.95 + i * r * 0.32, 0);
        ctx.lineTo(-r * 0.95 + (i + 1) * r * 0.32, 0);
        ctx.lineTo(-r * 0.95 + (i + 1) * r * 0.32 - r * 0.16, r * 0.34);
        ctx.lineTo(-r * 0.95 + i * r * 0.32 - r * 0.16, r * 0.34);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // peluche en vitrine
      ctx.fillStyle = '#C9B6E4'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y - r * 0.1, r * 0.2, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x - r * 0.14, y - r * 0.28, r * 0.07, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.14, y - r * 0.28, r * 0.07, 0, U.TAU); ctx.fill();
    }
  };

  // ---------- helpers partagés (phase 2) ----------
  // vapeur qui monte (tasses, théières, baignoire)
  function vapeur(ctx, x, y, r, t, graine) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = Math.max(1.6, r * 0.1);
    for (var i = 0; i < 3; i++) {
      var ph = ((t * 0.55 + graine + i * 0.33) % 1);
      var yy = y - ph * r * 2.1;
      var ww = r * (0.22 + ph * 0.5);
      ctx.globalAlpha = 0.85 * (1 - ph);
      ctx.beginPath();
      ctx.moveTo(x + (i - 1) * r * 0.3, yy + r * 0.5);
      ctx.quadraticCurveTo(x + (i - 1) * r * 0.3 + ww, yy + r * 0.1, x + (i - 1) * r * 0.3 - ww * 0.4, yy - r * 0.4);
      ctx.stroke();
    }
    ctx.restore();
  }
  // pluie / jet d'eau : n gouttes qui tombent en boucle
  function pluie(ctx, x, y, r, n, t, coul, etal) {
    ctx.strokeStyle = coul || 'rgba(154,221,240,.9)';
    ctx.lineWidth = Math.max(1.4, r * 0.07);
    for (var i = 0; i < n; i++) {
      var ph = ((t * 1.6 + i * 0.37) % 1);
      var xx = x + (i / (n - 1) - 0.5) * r * (etal || 1.4);
      ctx.globalAlpha = 1 - ph * 0.7;
      ctx.beginPath(); ctx.moveTo(xx, y + ph * r * 1.5); ctx.lineTo(xx, y + ph * r * 1.5 + r * 0.3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // petite troupe de spectateurs (3 rangées), callback dessine(c,x,y,r,phase)
  function troupe(ctx, d, t, r, dessine) {
    for (var row = 0; row < 3; row++) {
      for (var i = 0; i < 4 - row; i++) {
        var bx = d.x + (i - (3 - row) / 2) * r * 0.66 + row * r * 0.1 + Math.sin(i * 7 + row * 13 + d.graine * 31) * r * 0.18;
        var saut = Math.abs(Math.sin(t * 3.1 + i * 1.4 + row * 0.8 + d.graine * 4)) * r * 0.14;
        var by = d.y + row * r * 0.36 - saut;
        dessine(ctx, bx, by, r * 0.21, t + i * 0.7 + row);
      }
    }
  }
  // halo lumineux en dégradé radial (lisibilité sur fond nuit, pas de bord dur)
  function lueur(ctx, x, y, r, rgb, alpha) {
    var g = ctx.createRadialGradient(x, y, r * 0.12, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')');
    g.addColorStop(0.55, 'rgba(' + rgb + ',' + (alpha * 0.42) + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU); ctx.fill();
  }
  function contour(c, col) { c.strokeStyle = col || '#6D4C7D'; c.lineWidth = 2; }
  function rr(c, x, y, w, h, r) { if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }

  // ---------- décors phase 2 : PLAGE + GOÛTER ----------
  var D2 = {
    // parasol qui tourne doucement
    parasol: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, a = t * 0.45 + d.graine * 6;
      ombre(ctx, x, y + r * 0.15, r * 0.9, r * 0.3);
      ctx.strokeStyle = '#E8C39E'; ctx.lineWidth = Math.max(2.5, r * 0.11);
      ctx.beginPath(); ctx.moveTo(x, y + r * 0.1); ctx.lineTo(x, y - r * 0.9); ctx.stroke();
      for (var i = 0; i < 8; i++) {
        var a0 = (i / 8) * U.TAU + a, a1 = ((i + 1) / 8) * U.TAU + a;
        ctx.fillStyle = i % 2 ? '#FF7EB9' : '#FFFFFF';
        ctx.beginPath(); ctx.moveTo(x, y - r * 0.9);
        ctx.arc(x, y - r * 0.9, r * 0.95, a0, a1);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(109,76,125,.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y - r * 0.9, r * 0.95, 0, U.TAU); ctx.stroke();
      ctx.fillStyle = '#FCE38A'; ctx.beginPath(); ctx.arc(x, y - r * 1.25, r * 0.1, 0, U.TAU); ctx.fill();
    },
    // château de sable à trois tours
    chateausable: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.35, r * 1.05, r * 0.34);
      ctx.fillStyle = '#F5D9A8'; ctx.strokeStyle = '#C89A6B'; ctx.lineWidth = 2.5;
      rr(ctx, x - r * 0.75, y - r * 0.35, r * 0.5, r * 0.7, 4); ctx.fill(); ctx.stroke();
      rr(ctx, x + r * 0.25, y - r * 0.3, r * 0.5, r * 0.65, 4); ctx.fill(); ctx.stroke();
      rr(ctx, x - r * 0.35, y - r * 0.8, r * 0.7, r * 1.15, 5); ctx.fill(); ctx.stroke();
      // créneaux
      ctx.fillStyle = '#F5D9A8';
      for (var i = -1; i <= 1; i++) { ctx.beginPath(); rr(ctx, x + i * r * 0.24 - r * 0.08, y - r * 0.98, r * 0.17, r * 0.2, 2); ctx.fill(); ctx.stroke(); }
      // porte + drapeau qui frémit
      ctx.fillStyle = '#C89A6B'; ctx.beginPath(); ctx.arc(x, y + r * 0.12, r * 0.14, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#6D4C7D'; ctx.beginPath(); ctx.moveTo(x, y - r * 0.98); ctx.lineTo(x, y - r * 1.35); ctx.stroke();
      var f = Math.sin(t * 4 + d.graine * 8) * r * 0.05;
      ctx.fillStyle = '#FF7EB9'; ctx.beginPath();
      ctx.moveTo(x, y - r * 1.35); ctx.lineTo(x + r * 0.3 + f, y - r * 1.24); ctx.lineTo(x, y - r * 1.12); ctx.closePath(); ctx.fill();
    },
    // coquillage saint-jacques
    coquillage: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, cols = ['#FFFFFF', '#FFD9E8', '#FFE9D1'];
      ctx.fillStyle = cols[(d.graine * 3) | 0]; ctx.strokeStyle = '#E0A7B8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y + r * 0.5);
      ctx.arc(x, y + r * 0.5, r, -Math.PI * 0.95, -Math.PI * 0.05); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      for (var i = 1; i < 4; i++) {
        var an = -Math.PI + (i / 4) * Math.PI;
        ctx.moveTo(x, y + r * 0.5); ctx.lineTo(x + Math.cos(an) * r * 0.92, y + r * 0.5 + Math.sin(an) * r * 0.92);
      }
      ctx.stroke();
    },
    // étoile de mer qui respire
    etoilemer: function (ctx, d, t) {
      var p = 1 + 0.06 * Math.sin(t * 1.8 + d.graine * 7);
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.graine * 3 + Math.sin(t * 0.5) * 0.06); ctx.scale(p, p);
      ctx.fillStyle = '#FF8A6B'; ctx.strokeStyle = '#D9694E'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (var s = 0; s < 10; s++) {
        var an = -Math.PI / 2 + s * Math.PI / 5, rr2 = s % 2 ? r0(d.r) * 0.42 : r0(d.r);
        var px = Math.cos(an) * rr2, py = Math.sin(an) * rr2;
        s ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6D4C7D';
      ctx.beginPath(); ctx.arc(-d.r * 0.12, -d.r * 0.05, d.r * 0.07, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(d.r * 0.12, -d.r * 0.05, d.r * 0.07, 0, U.TAU); ctx.fill();
      ctx.restore();
    },
    // crabe qui se déplace le long de son trottoir de sable
    crabe: function (ctx, d, t) {
      var x = d.x + Math.sin(t * 0.7 + d.graine * 6) * d.r * 1.1, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.45, r * 0.8, r * 0.24);
      ctx.strokeStyle = '#D9694E'; ctx.lineWidth = 2;
      for (var i = -1; i <= 1; i += 2) {
        for (var k = 0; k < 2; k++) {
          var pat = Math.sin(t * 6 + i + k) * r * 0.1;
          ctx.beginPath(); ctx.moveTo(x + i * r * 0.5, y + r * 0.1);
          ctx.lineTo(x + i * r * (0.85 + k * 0.12), y + r * 0.42 + pat); ctx.stroke();
        }
      }
      ctx.fillStyle = '#FF8A6B'; ctx.strokeStyle = '#D9694E'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.72, r * 0.5, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      // pinces
      for (var s2 = -1; s2 <= 1; s2 += 2) {
        var ou = Math.abs(Math.sin(t * 2 + s2)) * r * 0.16;
        ctx.beginPath(); ctx.arc(x + s2 * r * 0.95, y - r * 0.35, r * 0.2, 0, U.TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(x + s2 * r * 0.95, y - r * 0.35 - ou * 0.4, r * 0.09, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#FF8A6B';
      }
      visage(ctx, x, y - r * 0.1, r * 0.4, '#FFB39A', '#D9694E');
    },
    // spectateurs : petits crabes alignés
    crabes: function (ctx, d, t) {
      troupe(ctx, d, t, d.r, function (c, x, y, r, ph) {
        c.fillStyle = '#FF9E7D'; contour(c, '#D9694E');
        c.beginPath(); c.ellipse(x, y, r * 0.8, r * 0.55, 0, 0, U.TAU); c.fill(); c.stroke();
        c.fillStyle = '#6D4C7D';
        c.beginPath(); c.arc(x - r * 0.3, y - r * 0.2, r * 0.13, 0, U.TAU); c.fill();
        c.beginPath(); c.arc(x + r * 0.3, y - r * 0.2, r * 0.13, 0, U.TAU); c.fill();
      });
    },
    // godet + pelle
    seau: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.4, r * 0.7, r * 0.2);
      ctx.fillStyle = '#9ADDF0'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.4); ctx.lineTo(x + r * 0.55, y - r * 0.4);
      ctx.lineTo(x + r * 0.4, y + r * 0.4); ctx.lineTo(x - r * 0.4, y + r * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - r * 0.4, r * 0.5, Math.PI, 0); ctx.stroke();
      ctx.strokeStyle = '#F493BC'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + r * 0.75, y + r * 0.4); ctx.lineTo(x + r * 0.9, y - r * 0.5); ctx.stroke();
      ctx.fillStyle = '#F493BC'; ctx.beginPath(); rr(ctx, x + r * 0.75, y - r * 0.75, r * 0.3, r * 0.3, 3); ctx.fill();
    },
    // goéland tout rond qui fait un petit rebond
    goeland: function (ctx, d, t) {
      var y = d.y - Math.abs(Math.sin(t * 1.6 + d.graine * 5)) * d.r * 0.35;
      var x = d.x + Math.sin(t * 0.5 + d.graine * 3) * d.r * 0.5, r = d.r;
      ombre(ctx, x, d.y + r * 0.5, r * 0.6, r * 0.18);
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, U.TAU); ctx.fill(); ctx.stroke();
      // ailes
      var bat = Math.sin(t * 5 + d.graine * 9) * r * 0.22;
      ctx.fillStyle = '#E8F0FA';
      ctx.beginPath(); ctx.ellipse(x - r * 0.5, y - bat * 0.3, r * 0.34, r * 0.18, -0.4 - bat * 0.02, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + r * 0.5, y - bat * 0.3, r * 0.34, r * 0.18, 0.4 + bat * 0.02, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FCE38A'; ctx.beginPath();
      ctx.moveTo(x - r * 0.1, y + r * 0.05); ctx.lineTo(x + r * 0.1, y + r * 0.05); ctx.lineTo(x, y + r * 0.28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6D4C7D';
      ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.12, r * 0.08, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.2, y - r * 0.12, r * 0.08, 0, U.TAU); ctx.fill();
    },

    // ---------- GOÛTER ----------
    theiere: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.45, r * 0.85, r * 0.26);
      ctx.fillStyle = '#FFD9E8'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.72, r * 0.55, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      // bec
      ctx.beginPath(); ctx.moveTo(x - r * 0.62, y - r * 0.1); ctx.quadraticCurveTo(x - r * 1.1, y - r * 0.35, x - r * 0.95, y - r * 0.62);
      ctx.lineTo(x - r * 0.72, y - r * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
      // anse
      ctx.beginPath(); ctx.arc(x + r * 0.72, y - r * 0.1, r * 0.34, -1.2, 1.3); ctx.stroke();
      // couvercle
      ctx.fillStyle = '#F493BC'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.52, r * 0.34, r * 0.16, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FCE38A'; ctx.beginPath(); ctx.arc(x, y - r * 0.68, r * 0.1, 0, U.TAU); ctx.fill();
      visage(ctx, x + r * 0.1, y + r * 0.05, r * 0.3, '#FFE9F2', '#6D4C7D');
      vapeur(ctx, x, y - r * 0.8, r * 0.5, t, d.graine);
    },
    tasse : function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.42, r * 0.9, r * 0.26);
      // soucoupe
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.22, r * 0.85, r * 0.26, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#A2B9E7';
      ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.35); ctx.lineTo(x + r * 0.5, y - r * 0.35);
      ctx.quadraticCurveTo(x + r * 0.42, y + r * 0.2, x, y + r * 0.22);
      ctx.quadraticCurveTo(x - r * 0.42, y + r * 0.2, x - r * 0.5, y - r * 0.35);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + r * 0.55, y - r * 0.12, r * 0.24, -1.4, 1.4); ctx.stroke();
      ctx.fillStyle = '#C89A6B'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.35, r * 0.46, r * 0.14, 0, 0, U.TAU); ctx.fill();
      vapeur(ctx, x, y - r * 0.55, r * 0.45, t, d.graine);
    },
    pancakes: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.42, r * 0.95, r * 0.28);
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.25, r * 0.9, r * 0.24, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      var cols = ['#F0C58A', '#E8B876', '#F5D09A'];
      for (var i = 2; i >= 0; i--) {
        var yy = y + r * 0.1 - i * r * 0.26, wob = Math.sin(t * 1.4 + i + d.graine * 6) * r * 0.02;
        ctx.fillStyle = cols[i]; contour(ctx);
        ctx.beginPath(); ctx.ellipse(x + wob, yy, r * 0.62, r * 0.15, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      }
      // beurre qui fond + sirop
      ctx.fillStyle = '#FCE38A'; contour(ctx, '#E0B24A');
      ctx.beginPath(); rr(ctx, x - r * 0.14, y - r * 0.85 + Math.sin(t * 2) * r * 0.02, r * 0.28, r * 0.2, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(200,154,107,.85)';
      ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.6);
      ctx.quadraticCurveTo(x, y - r * 0.72, x + r * 0.5, y - r * 0.6);
      ctx.quadraticCurveTo(x + r * 0.3, y - r * 0.4, x + r * 0.45, y - r * 0.2);
      ctx.quadraticCurveTo(x, y - r * 0.32, x - r * 0.45, y - r * 0.2);
      ctx.quadraticCurveTo(x - r * 0.3, y - r * 0.42, x - r * 0.5, y - r * 0.6);
      ctx.closePath(); ctx.fill();
    },
    bol: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.42, r * 0.85, r * 0.24);
      ctx.fillStyle = '#CFF3C8'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y - r * 0.05, r * 0.7, 0.15, Math.PI - 0.15); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFF6E0'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.05, r * 0.68, r * 0.2, 0, 0, U.TAU); ctx.fill();
      // céréales colorées
      var cols = ['#FF7EB9', '#FCE38A', '#A2B9E7', '#FF9E7D'];
      for (var i = 0; i < 8; i++) {
        var an = i * 0.8 + d.graine * 5;
        ctx.fillStyle = cols[i % 4];
        ctx.beginPath(); ctx.arc(x + Math.cos(an) * r * 0.42, y - r * 0.05 + Math.sin(an) * r * 0.13, r * 0.09, 0, U.TAU); ctx.fill();
      }
      visage(ctx, x, y + r * 0.2, r * 0.26, '#E4F8DC', '#6D4C7D');
    },
    cuillere: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, a = d.rot + 0.6 + Math.sin(t * 0.8 + d.graine * 5) * 0.05;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = '#E8EEF8'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2;
      rr(ctx, -r * 0.14, -r * 0.1, r * 0.28, r * 1.1, r * 0.13); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -r * 0.45, r * 0.26, r * 0.42, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    },
    fourchette: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, a = d.rot - 0.7 + Math.sin(t * 0.8 + d.graine * 5) * 0.05;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = '#E8EEF8'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2;
      rr(ctx, -r * 0.13, -r * 0.05, r * 0.26, r * 1.05, r * 0.12); ctx.fill(); ctx.stroke();
      rr(ctx, -r * 0.26, -r * 0.6, r * 0.52, r * 0.6, r * 0.1); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFF2E6';
      for (var i = -1; i <= 1; i++) { rr(ctx, i * r * 0.17 - r * 0.045, -r * 0.78, r * 0.09, r * 0.3, 2); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    },
    miettes: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      for (var i = 0; i < 9; i++) {
        var an = i * 2.4 + d.graine * 7, dd = r * (0.25 + (i % 3) * 0.28);
        ctx.fillStyle = i % 2 ? '#F0C58A' : '#E0B27A';
        ctx.beginPath(); ctx.arc(x + Math.cos(an) * dd, y + Math.sin(an) * dd * 0.6, r * 0.09, 0, U.TAU); ctx.fill();
      }
      // fourmi curieuse
      var fy = y + Math.sin(t * 2.2 + d.graine * 4) * r * 0.2;
      ctx.fillStyle = '#6D4C7D';
      ctx.beginPath(); ctx.arc(x - r * 0.7, fy, r * 0.09, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x - r * 0.88, fy - r * 0.06, r * 0.06, 0, U.TAU); ctx.fill();
    },
    // guêpes mignonnes qui volent en rond
    guepes: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.5, r * 0.6, r * 0.16);
      for (var i = 0; i < 3; i++) {
        var an = t * (1.1 + i * 0.25) + (i / 3) * U.TAU + d.graine * 6;
        var bx = x + Math.cos(an) * r * 0.62, by = y + Math.sin(an) * r * 0.4 - r * 0.35 + Math.sin(t * 3 + i) * r * 0.1;
        var br = r * 0.19;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(an + Math.PI / 2);
        ctx.fillStyle = '#FCE38A'; contour(ctx, '#B98A2A');
        ctx.beginPath(); ctx.ellipse(0, 0, br * 0.7, br, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#6D4C7D';
        rr(ctx, -br * 0.65, -br * 0.25, br * 1.3, br * 0.22, 1); ctx.fill();
        rr(ctx, -br * 0.55, br * 0.2, br * 1.1, br * 0.2, 1); ctx.fill();
        // ailes
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        var bat = Math.sin(t * 30 + i) * 0.4;
        ctx.beginPath(); ctx.ellipse(-br * 0.5, -br * 0.3, br * 0.5, br * 0.2, -0.6 + bat, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(br * 0.5, -br * 0.3, br * 0.5, br * 0.2, 0.6 - bat, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#6D4C7D';
        ctx.beginPath(); ctx.arc(-br * 0.28, -br * 0.45, br * 0.12, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(br * 0.28, -br * 0.45, br * 0.12, 0, U.TAU); ctx.fill();
        ctx.restore();
      }
    }
  };
  for (var _k2 in D2) DECORS[_k2] = D2[_k2];

  function r0(v) { return v; }

  // ---------- décors phase 2 : POTAGER + SALLE DE BAINS ----------
  var D3 = {
    cabanon: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.55, r * 1.05, r * 0.3);
      // murs
      ctx.fillStyle = '#E0B98C'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 3;
      rr(ctx, x - r * 0.75, y - r * 0.35, r * 1.5, r * 0.9, 5); ctx.fill(); ctx.stroke();
      // planches
      ctx.strokeStyle = 'rgba(109,76,125,.3)'; ctx.lineWidth = 1.6;
      for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * 0.3, y - r * 0.32); ctx.lineTo(x + i * r * 0.3, y + r * 0.52); ctx.stroke(); }
      // toit de chaume
      ctx.fillStyle = '#C89A6B'; contour(ctx);
      ctx.beginPath(); ctx.moveTo(x - r * 0.95, y - r * 0.3); ctx.lineTo(x, y - r * 1.05); ctx.lineTo(x + r * 0.95, y - r * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
      // porte ronde + fenêtre
      ctx.fillStyle = '#8C6140'; ctx.beginPath(); ctx.arc(x, y + r * 0.22, r * 0.28, Math.PI, 0); rr(ctx, x - r * 0.28, y + r * 0.22, r * 0.56, r * 0.32, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFF3C4'; ctx.beginPath(); ctx.arc(x - r * 0.45, y - r * 0.05, r * 0.14, 0, U.TAU); ctx.fill(); ctx.stroke();
      // tuile de toit qui glisse (vieillit) : lampe kawaii
      ctx.fillStyle = '#FCE38A'; ctx.beginPath(); ctx.arc(x + r * 0.5, y - r * 0.45, r * 0.09, 0, U.TAU); ctx.fill();
    },
    // légumes qui poussent (scale animé en boucle)
    carotte: function (ctx, d, t) {
      var p = 0.55 + 0.45 * (0.5 - 0.5 * Math.cos(t * 0.9 + d.graine * 7));
      var x = d.x, y = d.y, r = d.r * (0.7 + p * 0.5);
      ombre(ctx, x, y + r * 0.55, r * 0.55, r * 0.18);
      ctx.fillStyle = '#7EC97A'; ctx.strokeStyle = '#4E8F4A'; ctx.lineWidth = 2;
      for (var i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(x, y - r * 0.25);
        ctx.quadraticCurveTo(x + i * r * 0.45, y - r * 0.85, x + i * r * 0.28, y - r * 1.2);
        ctx.quadraticCurveTo(x + i * r * 0.1, y - r * 0.7, x, y - r * 0.25);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#FF8A4A'; contour(ctx, '#C9622A');
      ctx.beginPath(); ctx.moveTo(x - r * 0.32, y - r * 0.3); ctx.lineTo(x + r * 0.32, y - r * 0.3); ctx.lineTo(x, y + r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    },
    radis: function (ctx, d, t) {
      var p = 0.6 + 0.4 * (0.5 - 0.5 * Math.cos(t * 1.1 + d.graine * 5));
      var x = d.x, y = d.y, r = d.r * (0.7 + p * 0.45);
      ombre(ctx, x, y + r * 0.5, r * 0.5, r * 0.16);
      ctx.strokeStyle = '#4E8F4A'; ctx.lineWidth = 2;
      for (var i = -1; i <= 1; i += 2) {
        ctx.beginPath(); ctx.moveTo(x, y - r * 0.3);
        ctx.quadraticCurveTo(x + i * r * 0.5, y - r * 0.9, x + i * r * 0.3, y - r * 1.15); ctx.stroke();
      }
      ctx.fillStyle = '#F493BC'; contour(ctx, '#C25E90');
      ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(x - r * 0.1, y + r * 0.05, r * 0.2, 2.2, 3.9); ctx.stroke();
    },
    salade: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, resp = 1 + 0.07 * Math.sin(t * 1.6 + d.graine * 4);
      ombre(ctx, x, y + r * 0.4, r * 0.7, r * 0.18);
      ctx.save(); ctx.translate(x, y); ctx.scale(resp, resp);
      for (var i = 0; i < 7; i++) {
        var an = -Math.PI / 2 + (i - 3) * 0.42;
        ctx.fillStyle = i % 2 ? '#8FD46E' : '#B9E8B0'; contour(ctx, '#4E8F4A');
        ctx.beginPath();
        ctx.ellipse(Math.cos(an) * r * 0.28, Math.sin(an) * r * 0.3 - r * 0.1, r * 0.24, r * 0.46, an + Math.PI / 2, 0, U.TAU);
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    },
    tournesol: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, a = Math.sin(t * 0.55 + d.graine * 6) * 0.35;
      ombre(ctx, x, y + r * 1.6, r * 0.5, r * 0.16);
      ctx.strokeStyle = '#5FA85A'; ctx.lineWidth = Math.max(2.5, r * 0.16);
      ctx.beginPath(); ctx.moveTo(x, y + r * 1.5); ctx.quadraticCurveTo(x + a * r * 0.4, y + r * 0.6, x + a * r * 0.7, y); ctx.stroke();
      ctx.save(); ctx.translate(x + a * r * 0.7, y); ctx.rotate(a * 0.4);
      for (var i = 0; i < 12; i++) {
        var an = (i / 12) * U.TAU;
        ctx.fillStyle = i % 2 ? '#FCE38A' : '#FFB627';
        ctx.beginPath(); ctx.ellipse(Math.cos(an) * r * 0.72, Math.sin(an) * r * 0.72, r * 0.3, r * 0.16, an, 0, U.TAU); ctx.fill();
      }
      ctx.fillStyle = '#8C6140'; contour(ctx);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3A3243';
      ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.05, r * 0.07, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.05, r * 0.07, 0, U.TAU); ctx.fill();
      ctx.restore();
    },
    // épouvantail qui tourne la tête
    epouvantail: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.75, r * 0.7, r * 0.2);
      ctx.strokeStyle = '#C89A6B'; ctx.lineWidth = Math.max(3, r * 0.14);
      ctx.beginPath(); ctx.moveTo(x, y - r * 0.4); ctx.lineTo(x, y + r * 0.75); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r * 0.7, y - r * 0.2); ctx.lineTo(x + r * 0.7, y - r * 0.2); ctx.stroke();
      // corps (chemise à carreaux simple)
      ctx.fillStyle = '#FF9E7D'; contour(ctx);
      rr(ctx, x - r * 0.34, y - r * 0.22, r * 0.68, r * 0.75, 6); ctx.fill(); ctx.stroke();
      // tête qui tourne (pivote autour du mât)
      var tete = Math.sin(t * 0.6 + d.graine * 5);
      var hx = x + tete * r * 0.3, hy = y - r * 0.62;
      var sq = Math.max(0.25, 1 - Math.abs(tete) * 0.75); // aplatissement = perspective
      ctx.save(); ctx.translate(hx, hy); ctx.scale(sq, 1);
      ctx.fillStyle = '#F5D9A8'; contour(ctx);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#E8B876';
      ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.3); ctx.lineTo(r * 0.55, -r * 0.3); ctx.lineTo(r * 0.4, -r * 0.62); ctx.lineTo(-r * 0.4, -r * 0.62); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6D4C7D';
      ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.05, r * 0.06, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.05, r * 0.06, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, r * 0.08, r * 0.16, 0.3, Math.PI - 0.3); ctx.stroke();
      ctx.restore();
      // paille qui dépasse
      ctx.strokeStyle = '#FCE38A'; ctx.lineWidth = 1.6;
      for (var i = 0; i < 4; i++) {
        var an = -0.6 + i * 0.4;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r * 0.7, y - r * 0.2);
        ctx.lineTo(x + Math.cos(an) * r * 0.95, y - r * 0.05 + Math.sin(t * 3 + i) * 2); ctx.stroke();
      }
    },
    // jet d'eau qui pulse
    jet: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.35, r * 0.7, r * 0.2);
      ctx.fillStyle = '#B9C8D8'; contour(ctx);
      rr(ctx, x - r * 0.16, y - r * 0.2, r * 0.32, r * 0.55, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9FB6D8'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.22, r * 0.22, r * 0.1, 0, 0, U.TAU); ctx.fill();
      var p = 0.55 + 0.45 * Math.sin(t * 2.2 + d.graine * 6);
      ctx.strokeStyle = 'rgba(127,216,232,.9)'; ctx.lineWidth = Math.max(2, r * 0.09);
      for (var i = 0; i < 5; i++) {
        var an = -Math.PI / 2 + (i - 2) * 0.42;
        ctx.beginPath(); ctx.moveTo(x, y - r * 0.3);
        ctx.quadraticCurveTo(x + Math.cos(an) * r * 0.6 * p, y - r * (0.6 + 0.7 * p), x + Math.cos(an) * r * 1.05 * p, y - r * 0.1 + Math.sin(an + 1.2) * r * 0.2);
        ctx.stroke();
      }
      // gouttelettes
      ctx.fillStyle = 'rgba(154,221,240,.85)';
      for (var k = 0; k < 4; k++) {
        var ph = ((t * 1.1 + k * 0.25 + d.graine) % 1);
        ctx.beginPath(); ctx.arc(x + (k - 1.5) * r * 0.35 * p, y - r * 0.2 - ph * r * 0.9, r * 0.07, 0, U.TAU); ctx.fill();
      }
    },
    // terrier : lapins qui sortent en boucle
    terrier: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.35, r * 0.9, r * 0.26);
      ctx.fillStyle = '#8C6140'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - r * 0.8, y + r * 0.25);
      ctx.quadraticCurveTo(x, y - r * 0.9, x + r * 0.8, y + r * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3A3243';
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.1, r * 0.3, r * 0.26, 0, Math.PI, 0); ctx.fill();
      // lapin qui pointe le bout du nez
      var cycle = ((t * 0.7 + d.graine * 3) % 1);
      var sortie = cycle < 0.5 ? Math.sin(cycle * 2 * Math.PI) : 0;
      if (sortie > 0.05) {
        var hy = y + r * 0.1 - sortie * r * 0.5, hr = r * 0.24;
        ctx.fillStyle = '#FFFFFF'; contour(ctx);
        for (var e = -1; e <= 1; e += 2) {
          ctx.save(); ctx.translate(x + e * hr * 0.4, hy - hr * 1.2); ctx.rotate(e * 0.2);
          ctx.beginPath(); ctx.ellipse(0, 0, hr * 0.26, hr * 0.8, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        ctx.beginPath(); ctx.arc(x, hy, hr, 0, U.TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#6D4C7D';
        ctx.beginPath(); ctx.arc(x - hr * 0.35, hy - hr * 0.1, hr * 0.13, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(x + hr * 0.35, hy - hr * 0.1, hr * 0.13, 0, U.TAU); ctx.fill();
      }
    },

    // ---------- SALLE DE BAINS ----------
    // baignoire qui se remplit et se vide en boucle
    baignoire: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      var rempl = 0.5 - 0.5 * Math.cos(t * 0.45 + d.graine * 4);
      ombre(ctx, x, y + r * 0.42, r * 1.05, r * 0.28);
      // coussin / tapis sous la baignoire
      ctx.fillStyle = '#E8F6FC'; contour(ctx);
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.42, r * 1.05, r * 0.22, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      // bassin
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.88, r * 0.46, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      // eau
      ctx.save();
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.78, r * 0.38, 0, 0, U.TAU); ctx.clip();
      ctx.fillStyle = '#9ADDF0';
      var nh = r * 0.38 * rempl;
      ctx.fillRect(x - r * 0.8, y + r * 0.38 - nh, r * 1.6, nh);
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (var i = 0; i <= 8; i++) {
        var px = x - r * 0.78 + (i / 8) * r * 1.56;
        var py = y + r * 0.38 - nh + Math.sin(t * 3 + i * 0.9) * r * 0.03;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
      // mousse sur le rebord
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      for (var b = 0; b < 6; b++) {
        var an = b * 1.05 + d.graine * 3;
        ctx.beginPath(); ctx.arc(x + Math.cos(an) * r * 0.8, y + Math.sin(an) * r * 0.4, r * (0.09 + 0.05 * rempl), 0, U.TAU); ctx.fill();
      }
      // robinet + pommeau
      ctx.fillStyle = '#C9D6E4'; contour(ctx);
      rr(ctx, x + r * 0.72, y - r * 0.5, r * 0.16, r * 0.3, 3); ctx.fill(); ctx.stroke();
      // canard qui flotte si l'eau est haute
      if (rempl > 0.4) {
        var cy = y + r * 0.38 - nh + Math.sin(t * 2) * r * 0.03;
        ctx.fillStyle = '#FCE38A'; contour(ctx);
        ctx.beginPath(); ctx.ellipse(x - r * 0.2, cy, r * 0.16, r * 0.1, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x - r * 0.3, cy - r * 0.1, r * 0.08, 0, U.TAU); ctx.fill(); ctx.stroke();
      }
    },
    peignoir: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, bal = Math.sin(t * 0.9 + d.graine * 5) * 0.06;
      ctx.save(); ctx.translate(x, y - r * 0.9); ctx.rotate(bal);
      // crochet + patère
      ctx.fillStyle = '#C9D6E4'; contour(ctx);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.09, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.translate(0, r * 0.9);
      ctx.fillStyle = '#FFD9E8'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, 0); ctx.lineTo(r * 0.45, 0);
      ctx.lineTo(r * 0.6, r * 1.5); ctx.lineTo(-r * 0.6, r * 1.5); ctx.closePath();
      ctx.fill(); ctx.stroke();
      // manches
      ctx.beginPath(); ctx.moveTo(-r * 0.45, r * 0.1); ctx.lineTo(-r * 0.75, r * 0.7); ctx.lineTo(-r * 0.5, r * 0.75); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.45, r * 0.1); ctx.lineTo(r * 0.75, r * 0.7); ctx.lineTo(r * 0.5, r * 0.75); ctx.closePath(); ctx.fill(); ctx.stroke();
      // ceinture
      ctx.fillStyle = '#F493BC'; rr(ctx, -r * 0.5, r * 0.6, r * 1.0, r * 0.14, 3); ctx.fill(); ctx.stroke();
      ctx.restore();
    },
    miroir: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.62, r * 0.7, r * 0.16);
      ctx.fillStyle = '#C9D6E4'; contour(ctx);
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.66, r * 0.78, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#E6F4FB';
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.54, r * 0.66, 0, 0, U.TAU); ctx.fill();
      // reflet qui glisse
      var ph = ((t * 0.3 + d.graine) % 1) * 2 - 1;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.54, r * 0.66, 0, 0, U.TAU); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = r * 0.12;
      ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + ph * r * 1.2); ctx.lineTo(x + r * 0.2, y + ph * r * 1.2 - r * 0.8); ctx.stroke();
      ctx.restore();
    },
    canard: function (ctx, d, t) {
      var x = d.x, y = d.y - Math.abs(Math.sin(t * 1.3 + d.graine * 4)) * d.r * 0.2, r = d.r;
      ombre(ctx, d.x, d.y + r * 0.35, r * 0.6, r * 0.18);
      ctx.fillStyle = '#FCE38A'; ctx.strokeStyle = '#E0B24A'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.1, r * 0.55, r * 0.34, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.3, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FF9E7D';
      ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.35); ctx.lineTo(x - r * 0.85, y - r * 0.25); ctx.lineTo(x - r * 0.55, y - r * 0.18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6D4C7D';
      ctx.beginPath(); ctx.arc(x - r * 0.36, y - r * 0.42, r * 0.07, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#F0C54E';
      ctx.beginPath(); ctx.ellipse(x + r * 0.4, y + r * 0.02, r * 0.18, r * 0.12, -0.5, 0, U.TAU); ctx.fill();
    },
    canards: function (ctx, d, t) {
      troupe(ctx, d, t, d.r, function (c, x, y, r, ph) {
        var yy = y - Math.abs(Math.sin(ph * 1.6)) * r * 0.3;
        c.fillStyle = '#FCE38A'; contour(c, '#E0B24A');
        c.beginPath(); c.ellipse(x, yy, r * 0.75, r * 0.5, 0, 0, U.TAU); c.fill(); c.stroke();
        c.beginPath(); c.arc(x - r * 0.35, yy - r * 0.5, r * 0.4, 0, U.TAU); c.fill(); c.stroke();
        c.fillStyle = '#FF9E7D';
        c.beginPath(); c.moveTo(x - r * 0.65, yy - r * 0.5); c.lineTo(x - r * 1.0, yy - r * 0.4); c.lineTo(x - r * 0.65, yy - r * 0.3); c.closePath(); c.fill();
        c.fillStyle = '#6D4C7D';
        c.beginPath(); c.arc(x - r * 0.42, yy - r * 0.58, r * 0.11, 0, U.TAU); c.fill();
      });
    },
    // pommeau de douche qui arrose
    douche: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.75, r * 0.5, r * 0.14);
      ctx.strokeStyle = '#C9D6E4'; ctx.lineWidth = Math.max(3, r * 0.13);
      ctx.beginPath(); ctx.moveTo(x + r * 0.55, y + r * 0.7); ctx.lineTo(x + r * 0.55, y - r * 0.5);
      ctx.quadraticCurveTo(x + r * 0.55, y - r * 0.85, x + r * 0.1, y - r * 0.85); ctx.stroke();
      ctx.fillStyle = '#9FB6D8'; contour(ctx);
      ctx.beginPath(); ctx.ellipse(x, y - r * 0.78, r * 0.3, r * 0.13, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      pluie(ctx, x, y - r * 0.6, r, 6, t, 'rgba(127,216,232,.9)', 1.1);
    },
    tapis: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ctx.save(); ctx.translate(x, y); ctx.rotate(d.graine * 2 - 1);
      ctx.fillStyle = '#FFD9E8'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2.5;
      ctx.beginPath(); rr(ctx, -r, -r * 0.6, r * 2, r * 1.2, r * 0.3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); rr(ctx, -r * 0.78, -r * 0.42, r * 1.56, r * 0.84, r * 0.24); ctx.stroke();
      // OURS brodé
      ctx.fillStyle = '#F493BC';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, U.TAU); ctx.fill();
      for (var e = -1; e <= 1; e += 2) { ctx.beginPath(); ctx.arc(e * r * 0.17, -r * 0.17, r * 0.07, 0, U.TAU); ctx.fill(); }
      ctx.restore();
    },
    savon: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.35, r * 0.55, r * 0.16);
      ctx.fillStyle = '#CFF3C8'; contour(ctx);
      ctx.beginPath(); rr(ctx, x - r * 0.45, y - r * 0.28, r * 0.9, r * 0.6, r * 0.2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath(); ctx.ellipse(x - r * 0.15, y - r * 0.12, r * 0.14, r * 0.07, -0.4, 0, U.TAU); ctx.fill();
      // bulle qui naît du savon
      var ph = ((t * 0.5 + d.graine * 2) % 1);
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(x + r * 0.3, y - ph * r * 1.4, r * 0.1 + ph * r * 0.12, 0, U.TAU); ctx.stroke();
    }
  };
  for (var _k3 in D3) DECORS[_k3] = D3[_k3];

  // ---------- décors phase 2 : BANQUISE + NUIT + NUAGES ----------
  var D4 = {
    igloo: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.4, r * 1.05, r * 0.3);
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#9FB6D8'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 0.85, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      // rangées de blocs
      ctx.strokeStyle = 'rgba(159,182,216,.8)'; ctx.lineWidth = 2;
      for (var i = 1; i <= 2; i++) {
        ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 0.85 * (1 - i * 0.28), Math.PI, 0); ctx.stroke();
        for (var k = -2; k <= 2; k++) {
          var an = Math.PI / 2 + k * 0.45;
          var rx2 = r * 0.85 * (1 - i * 0.28);
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(an) * rx2, y + r * 0.2 - Math.sin(an) * rx2);
          ctx.lineTo(x + Math.cos(an) * r * 0.85, y + r * 0.2 - Math.sin(an) * r * 0.85);
          ctx.stroke();
        }
      }
      // trou lumineux
      ctx.fillStyle = '#BBD8F5';
      ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.3, Math.PI, 0); rr(ctx, x - r * 0.3, y + r * 0.1, r * 0.6, r * 0.3, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(252,227,138,' + (0.35 + 0.2 * Math.sin(t * 1.6 + d.graine * 5)) + ')';
      ctx.beginPath(); ctx.arc(x, y + r * 0.15, r * 0.18, 0, U.TAU); ctx.fill();
    },
    manchots: function (ctx, d, t) {
      troupe(ctx, d, t, d.r, function (c, x, y, r, ph) {
        var pen = Math.sin(ph * 2.4) * 0.12;
        c.save(); c.translate(x, y); c.rotate(pen);
        c.fillStyle = '#3A3243'; contour(c, '#241E2C');
        c.beginPath(); c.ellipse(0, 0, r * 0.6, r * 0.85, 0, 0, U.TAU); c.fill(); c.stroke();
        c.fillStyle = '#FFFFFF';
        c.beginPath(); c.ellipse(0, r * 0.12, r * 0.38, r * 0.58, 0, 0, U.TAU); c.fill();
        // ailes
        c.fillStyle = '#3A3243';
        c.beginPath(); c.ellipse(-r * 0.6, 0, r * 0.16, r * 0.42, 0.3, 0, U.TAU); c.fill();
        c.beginPath(); c.ellipse(r * 0.6, 0, r * 0.16, r * 0.42, -0.3, 0, U.TAU); c.fill();
        c.fillStyle = '#FCE38A';
        c.beginPath(); c.moveTo(0, -r * 0.2); c.lineTo(r * 0.22, -r * 0.05); c.lineTo(0, r * 0.05); c.closePath(); c.fill();
        c.fillStyle = '#FF9E7D';
        c.beginPath(); c.arc(-r * 0.2, -r * 0.42, r * 0.12, 0, U.TAU); c.fill();
        c.beginPath(); c.arc(r * 0.2, -r * 0.42, r * 0.12, 0, U.TAU); c.fill();
        c.fillStyle = '#FFFFFF';
        c.beginPath(); c.arc(-r * 0.18, -r * 0.3, r * 0.08, 0, U.TAU); c.fill();
        c.beginPath(); c.arc(r * 0.18, -r * 0.3, r * 0.08, 0, U.TAU); c.fill();
        c.restore();
      });
    },
    sapin: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.5, r * 0.6, r * 0.18);
      ctx.fillStyle = '#C89A6B'; contour(ctx);
      rr(ctx, x - r * 0.09, y + r * 0.15, r * 0.18, r * 0.35, 2); ctx.fill(); ctx.stroke();
      for (var i = 0; i < 3; i++) {
        var yy = y + r * 0.2 - i * r * 0.5, ww = r * (0.62 - i * 0.14);
        ctx.fillStyle = '#7FB98F'; contour(ctx, '#4E8F6A');
        ctx.beginPath(); ctx.moveTo(x - ww, yy); ctx.lineTo(x + ww, yy); ctx.lineTo(x, yy - r * 0.62); ctx.closePath();
        ctx.fill(); ctx.stroke();
        // givre
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.moveTo(x - ww * 0.7, yy - r * 0.04); ctx.lineTo(x + ww * 0.7, yy - r * 0.04);
        ctx.lineTo(x, yy - r * 0.24); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(x, y - r * 1.35, r * 0.1 + Math.abs(Math.sin(t + d.graine * 4)) * r * 0.04, 0, U.TAU); ctx.fill();
    },
    bonhomme: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.7, r * 0.6, r * 0.18);
      ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#9FB6D8'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y + r * 0.35, r * 0.42, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - r * 0.15, r * 0.32, 0, U.TAU); ctx.fill(); ctx.stroke();
      // tête qui se tourne légèrement
      var turn = Math.sin(t * 0.8 + d.graine * 4);
      var hx = x + turn * r * 0.06, hy = y - r * 0.62;
      ctx.beginPath(); ctx.arc(hx, hy, r * 0.26, 0, U.TAU); ctx.fill(); ctx.stroke();
      // nez carotte qui frémit
      ctx.fillStyle = '#FF8A4A'; contour(ctx, '#C9622A');
      ctx.beginPath(); ctx.moveTo(hx, hy - r * 0.02);
      ctx.lineTo(hx + r * 0.3 * Math.sign(turn || 1), hy + r * 0.06 + Math.sin(t * 4) * r * 0.02);
      ctx.lineTo(hx, hy + r * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
      // yeux qui clignent
      var clin = ((t * 0.9 + d.graine * 3) % 1) < 0.09;
      ctx.fillStyle = '#3A3243';
      for (var e = -1; e <= 1; e += 2) {
        if (clin) { ctx.fillRect(hx + e * r * 0.12 - r * 0.05, hy - r * 0.08, r * 0.1, r * 0.025); }
        else { ctx.beginPath(); ctx.arc(hx + e * r * 0.12, hy - r * 0.07, r * 0.045, 0, U.TAU); ctx.fill(); }
      }
      // sourire en boutons
      ctx.strokeStyle = '#3A3243'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(hx, hy + r * 0.04, r * 0.1, 0.3, Math.PI - 0.3); ctx.stroke();
      // bras branchus
      ctx.strokeStyle = '#8C6140'; ctx.lineWidth = 2.5;
      for (var s2 = -1; s2 <= 1; s2 += 2) {
        var lev = Math.sin(t * 1.2 + s2 + d.graine * 2) * r * 0.12;
        ctx.beginPath(); ctx.moveTo(x + s2 * r * 0.3, y - r * 0.12);
        ctx.lineTo(x + s2 * r * 0.85, y - r * 0.3 - lev); ctx.stroke();
      }
      // bonnet
      ctx.fillStyle = '#FF6B7A'; contour(ctx);
      ctx.beginPath(); ctx.arc(hx, hy - r * 0.16, r * 0.26, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(hx, hy - r * 0.42, r * 0.08, 0, U.TAU); ctx.fill();
    },
    // bloc de glace avec chevrons directionnels
    blocglace: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, a = d.rot;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ombre(ctx, 0, r * 0.42, r * 0.75, r * 0.2);
      ctx.fillStyle = 'rgba(159,190,230,.92)'; ctx.strokeStyle = '#6D8FBF'; ctx.lineWidth = 2.5;
      ctx.beginPath(); rr(ctx, -r * 0.7, -r * 0.45, r * 1.4, r * 0.9, r * 0.16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); rr(ctx, -r * 0.6, -r * 0.38, r * 1.2, r * 0.22, r * 0.1); ctx.fill();
      // chevrons »»
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(2, r * 0.1);
      for (var i = -1; i <= 1; i++) {
        var ox = i * r * 0.42 + Math.sin(t * 2 + i) * r * 0.04;
        ctx.beginPath();
        ctx.moveTo(ox - r * 0.12, -r * 0.18); ctx.lineTo(ox + r * 0.1, 0); ctx.lineTo(ox - r * 0.12, r * 0.18);
        ctx.stroke();
      }
      ctx.restore();
    },
    // manchot pêcheur : canne à pêche + flotteur qui s'agite
    pecheur: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.8, r * 0.55, r * 0.18);
      // corps
      ctx.fillStyle = '#3A3243'; contour(ctx, '#241E2C');
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.48, r * 0.72, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.12, r * 0.3, r * 0.5, 0, 0, U.TAU); ctx.fill();
      visage(ctx, x, y - r * 0.4, r * 0.24, '#FFF9EC', '#241E2C');
      // écharpe
      ctx.fillStyle = '#FF6B7A'; ctx.beginPath(); rr(ctx, x - r * 0.3, y - r * 0.18, r * 0.6, r * 0.13, 3); ctx.fill();
      // canne
      ctx.strokeStyle = '#8C6140'; ctx.lineWidth = 2.5;
      var bt = Math.sin(t * 1.8 + d.graine * 5);
      ctx.beginPath(); ctx.moveTo(x + r * 0.4, y);
      ctx.quadraticCurveTo(x + r * 1.1, y - r * 0.4, x + r * 1.3, y + r * 0.2 + bt * r * 0.06); ctx.stroke();
      // ligne + flotteur
      ctx.strokeStyle = 'rgba(109,76,125,.6)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x + r * 1.3, y + r * 0.2 + bt * r * 0.06); ctx.lineTo(x + r * 1.25, y + r * 0.85 + bt * r * 0.12); ctx.stroke();
      ctx.fillStyle = '#FF6B7A';
      ctx.beginPath(); ctx.arc(x + r * 1.25, y + r * 0.9 + bt * r * 0.14, r * 0.11, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(x + r * 1.25, y + r * 0.9 + bt * r * 0.14, r * 0.055, 0, U.TAU); ctx.fill();
    },
    // bassin de glace : phoque qui plonge puis ressort
    bassinphoque: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ctx.fillStyle = '#7FB6D8'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.58, d.graine, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
      var ond = Math.sin(t * 1.8) * r * 0.05;
      ctx.beginPath(); ctx.ellipse(x, y + ond * 0.5, r * 0.66, r * 0.36, d.graine, 0, U.TAU); ctx.stroke();
      // cycle : 0..0.45 sous l'eau, 0.5..0.9 dehors
      var c = ((t * 0.35 + d.graine) % 1), up = c > 0.5 ? Math.sin((c - 0.5) * 2 * Math.PI) : 0;
      var py = y - up * r * 0.42;
      if (up > 0.08) {
        ctx.fillStyle = '#BFD4E8'; contour(ctx, '#7A93AC');
        ctx.beginPath(); ctx.ellipse(x, py, r * 0.42, r * 0.3, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, py - r * 0.28, r * 0.24, 0, U.TAU); ctx.fill(); ctx.stroke();
        visage(ctx, x, py - r * 0.3, r * 0.16, '#DCE9F5', '#4A5E73');
        // moustaches
        ctx.strokeStyle = '#4A5E73'; ctx.lineWidth = 1.2;
        for (var i = -1; i <= 1; i += 2) {
          ctx.beginPath(); ctx.moveTo(x + i * r * 0.1, py - r * 0.24); ctx.lineTo(x + i * r * 0.3, py - r * 0.2); ctx.stroke();
        }
      }
      // gouttes qui retombent
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      for (var k = 0; k < 3; k++) {
        var ph = ((t * 1.2 + k * 0.33) % 1);
        ctx.beginPath(); ctx.arc(x + (k - 1) * r * 0.4, y - r * 0.1 + ph * r * 0.3, r * 0.05, 0, U.TAU); ctx.fill();
      }
    },
    // bassin : ours polaire qui s'ébroue
    bassinours: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ctx.fillStyle = '#7FB6D8'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.58, -d.graine, 0, U.TAU); ctx.fill(); ctx.stroke();
      var eb = Math.sin(t * 6) * Math.max(0, Math.sin(t * 0.7 + d.graine * 3));
      var bx = x + eb * r * 0.06, by = y - r * 0.34;
      ctx.fillStyle = '#FFFFFF'; contour(ctx, '#9FB6D8');
      ctx.beginPath(); ctx.ellipse(x, y - r * 0.1, r * 0.5, r * 0.3, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(bx, by); ctx.rotate(eb * 0.12);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, U.TAU); ctx.fill(); ctx.stroke();
      for (var e = -1; e <= 1; e += 2) { ctx.beginPath(); ctx.arc(e * r * 0.22, -r * 0.24, r * 0.11, 0, U.TAU); ctx.fill(); ctx.stroke(); }
      visage(ctx, 0, r * 0.02, r * 0.16, '#FFF6FB', '#6D4C7D');
      ctx.restore();
      // gouttelettes de l'ébrouement
      ctx.fillStyle = 'rgba(191,220,240,.9)';
      for (var k = 0; k < 7; k++) {
        var an = k * 0.9 + d.graine * 4, dd = r * (0.35 + Math.abs(eb) * 0.5);
        ctx.beginPath(); ctx.arc(x + Math.cos(an) * dd, y - r * 0.25 + Math.sin(an) * dd * 0.5, r * 0.05, 0, U.TAU); ctx.fill();
      }
    },

    // ---------- NUIT ----------
    lune: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, glow = 0.4 + 0.16 * Math.sin(t * 0.8 + d.graine * 3);
      lueur(ctx, x, y, r * 2.1, '252,227,138', glow);
      ctx.fillStyle = '#FCE38A'; ctx.strokeStyle = '#E0B24A'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(224,178,74,.35)';
      ctx.beginPath(); ctx.arc(x - r * 0.3, y + r * 0.2, r * 0.14, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.1, r * 0.1, 0, U.TAU); ctx.fill();
      visage(ctx, x, y, r * 0.5, '#FFF3C4', '#B98A2A');
      // petite étoile compagne
      var an = t * 0.6 + d.graine * 5;
      V.draw.etoile(ctx, x + Math.cos(an) * r * 1.5, y + Math.sin(an) * r * 1.2, r * 0.18, t, '#FFF6C9');
    },
    // fleur lumineuse qui pulse
    fleurlum: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, p = 0.5 + 0.5 * Math.sin(t * 1.4 + d.graine * 8);
      lueur(ctx, x, y, r * (1.9 + p * 0.8), '214,178,255', 0.3 + p * 0.34);
      ombre(ctx, x, y + r * 1.4, r * 0.4, r * 0.14);
      ctx.strokeStyle = '#5E8A5A'; ctx.lineWidth = Math.max(2, r * 0.13);
      ctx.beginPath(); ctx.moveTo(x, y + r * 1.4); ctx.quadraticCurveTo(x + Math.sin(t + d.graine * 5) * 3, y + r * 0.5, x, y); ctx.stroke();
      for (var i = 0; i < 6; i++) {
        var an = (i / 6) * U.TAU + d.graine * 3;
        ctx.fillStyle = i % 2 ? '#D9B3FF' : '#B98CF5';
        ctx.beginPath(); ctx.ellipse(Math.cos(an) * r * 0.7, Math.sin(an) * r * 0.7, r * 0.4, r * 0.24, an, 0, U.TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,246,201,' + (0.65 + p * 0.35) + ')'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r * 0.36, 0, U.TAU); ctx.fill(); ctx.stroke();
    },
    lampadaire: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, p = 0.7 + 0.3 * Math.sin(t * 2.3 + d.graine * 9);
      ombre(ctx, x, y + r * 0.85, r * 0.4, r * 0.14);
      lueur(ctx, x, y - r * 0.55, r * 1.9, '252,227,138', 0.22 + 0.2 * p);
      ctx.strokeStyle = '#4B3A6B'; ctx.lineWidth = Math.max(3, r * 0.13);
      ctx.beginPath(); ctx.moveTo(x, y + r * 0.8); ctx.lineTo(x, y - r * 0.4); ctx.stroke();
      ctx.fillStyle = '#FCE38A'; ctx.strokeStyle = '#F493BC'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y - r * 0.62, r * 0.34, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.4 * p) + ')';
      ctx.beginPath(); ctx.arc(x - r * 0.1, y - r * 0.7, r * 0.1, 0, U.TAU); ctx.fill();
    },
    lucioles: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      for (var i = 0; i < 5; i++) {
        var an = t * (0.6 + i * 0.12) + i * 1.6 + d.graine * 6;
        var lx = x + Math.cos(an) * r * (0.5 + 0.3 * Math.sin(t * 1.3 + i));
        var ly = y + Math.sin(an * 1.4) * r * 0.5;
        var p = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.4 + i * 1.2));
        lueur(ctx, lx, ly, r * 0.42, '214,255,138', 0.4 * p);
        ctx.fillStyle = 'rgba(232,255,160,' + (0.55 + 0.45 * p) + ')';
        ctx.beginPath(); ctx.arc(lx, ly, r * 0.07, 0, U.TAU); ctx.fill();
      }
    },
    hibou: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ombre(ctx, x, y + r * 0.7, r * 0.55, r * 0.16);
      // branche
      ctx.strokeStyle = '#8C6140'; ctx.lineWidth = Math.max(3, r * 0.13);
      ctx.beginPath(); ctx.moveTo(x - r * 0.8, y + r * 0.55); ctx.lineTo(x + r * 0.8, y + r * 0.5); ctx.stroke();
      ctx.fillStyle = '#C9B6E4'; contour(ctx);
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.5, r * 0.58, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      // ailes
      ctx.fillStyle = '#B49AD8';
      ctx.beginPath(); ctx.ellipse(x - r * 0.42, y + r * 0.05, r * 0.16, r * 0.36, 0.2, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + r * 0.42, y + r * 0.05, r * 0.16, r * 0.36, -0.2, 0, U.TAU); ctx.fill();
      // oreilles
      ctx.fillStyle = '#C9B6E4'; contour(ctx);
      for (var e = -1; e <= 1; e += 2) {
        ctx.beginPath(); ctx.moveTo(x + e * r * 0.2, y - r * 0.5); ctx.lineTo(x + e * r * 0.42, y - r * 0.72); ctx.lineTo(x + e * r * 0.36, y - r * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // tête qui tourne (les yeux restent, la tête pivote)
      var turn = Math.sin(t * 0.55 + d.graine * 4), sq = Math.max(0.3, Math.cos(turn * 1.1));
      ctx.save(); ctx.translate(x, y - r * 0.16); ctx.scale(sq, 1);
      ctx.fillStyle = '#FFF6E0'; contour(ctx);
      ctx.beginPath(); ctx.arc(-r * 0.19, 0, r * 0.19, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.19, 0, r * 0.19, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3A3243';
      var clin = ((t * 0.7 + d.graine * 2) % 1) < 0.08;
      for (var e2 = -1; e2 <= 1; e2 += 2) {
        if (clin) { ctx.fillRect(e2 * r * 0.19 - r * 0.1, -r * 0.02, r * 0.2, r * 0.04); }
        else { ctx.beginPath(); ctx.arc(e2 * r * 0.19, 0, r * 0.08, 0, U.TAU); ctx.fill(); }
      }
      ctx.fillStyle = '#FCE38A';
      ctx.beginPath(); ctx.moveTo(0, r * 0.02); ctx.lineTo(-r * 0.07, r * 0.14); ctx.lineTo(r * 0.07, r * 0.14); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    flaque: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      ctx.fillStyle = 'rgba(120,150,220,.4)'; ctx.strokeStyle = 'rgba(255,246,201,.75)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, d.graine * 2, 0, U.TAU); ctx.fill(); ctx.stroke();
      // reflets qui glissent
      ctx.strokeStyle = 'rgba(255,246,201,.7)'; ctx.lineWidth = 2;
      for (var i = 0; i < 3; i++) {
        var ph = ((t * 0.25 + i * 0.33 + d.graine) % 1) * 2 - 1;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.6 + ph * r * 0.4, y - r * 0.18 + i * r * 0.16);
        ctx.lineTo(x - r * 0.2 + ph * r * 0.4, y - r * 0.24 + i * r * 0.16);
        ctx.stroke();
      }
    },
    // chat noir qui dort (queue qui bouge, ventre qui respire)
    chat: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, resp = 1 + 0.05 * Math.sin(t * 1.1 + d.graine * 4);
      ombre(ctx, x, y + r * 0.42, r * 0.75, r * 0.2);
      ctx.save(); ctx.translate(x, y); ctx.scale(resp, resp);
      ctx.fillStyle = '#3A3243'; ctx.strokeStyle = '#241E2C'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.62, r * 0.34, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
      // queue
      var q = Math.sin(t * 1.4 + d.graine * 3) * r * 0.2;
      ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.15);
      ctx.quadraticCurveTo(r * 0.95, r * 0.1 + q, r * 0.85, -r * 0.25 + q); ctx.stroke();
      // tête posée
      ctx.beginPath(); ctx.arc(-r * 0.42, -r * 0.08, r * 0.3, 0, U.TAU); ctx.fill(); ctx.stroke();
      for (var e = -1; e <= 1; e += 2) {
        ctx.beginPath(); ctx.moveTo(-r * 0.42 + e * r * 0.18, -r * 0.32); ctx.lineTo(-r * 0.42 + e * r * 0.3, -r * 0.55); ctx.lineTo(-r * 0.42 + e * r * 0.32, -r * 0.22); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // yeux clos
      ctx.strokeStyle = '#FFF6C9'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-r * 0.52, -r * 0.08, r * 0.08, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.08, r * 0.08, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,126,185,.5)';
      ctx.beginPath(); ctx.arc(-r * 0.62, r * 0.04, r * 0.07, 0, U.TAU); ctx.fill();
      ctx.restore();
      // Zzz
      var ph = ((t * 0.5 + d.graine) % 1);
      ctx.fillStyle = 'rgba(255,246,201,' + (0.8 - ph * 0.8) + ')';
      ctx.font = '700 ' + Math.round(r * 0.4) + 'px sans-serif';
      ctx.fillText('z', x - r * 0.1 + ph * r * 0.3, y - r * 0.6 - ph * r * 0.6);
    },

    // ---------- NUAGES ----------
    montgolfiere: function (ctx, d, t) {
      var x = d.x, y = d.y - ((t * 6 + d.graine * 200) % 90) * d.r * 0.012, r = d.r;
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 0.5, r * 0.16, 0, 0, U.TAU); ctx.fill();
      // envelope : bandes pastel
      var cols = ['#FFD8EC', '#FFE9C7', '#C9DBFF'];
      for (var i = 0; i < 3; i++) {
        ctx.fillStyle = cols[i];
        ctx.beginPath();
        ctx.arc(x, y, r * 0.62, -Math.PI / 2 + (i / 3) * Math.PI * 2, -Math.PI / 2 + ((i + 1) / 3) * Math.PI * 2);
        ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#FFD8EC';
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.62, r * 0.68, 0, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(109,76,125,.5)'; ctx.lineWidth = 2;
      for (var k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.ellipse(x, y, Math.abs(k) * r * 0.3 + r * 0.12, r * 0.68, 0, 0, U.TAU); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, U.TAU); ctx.stroke();
      // nacelle
      ctx.strokeStyle = 'rgba(109,76,125,.6)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x - r * 0.2, y + r * 0.6); ctx.lineTo(x - r * 0.16, y + r * 0.85);
      ctx.moveTo(x + r * 0.2, y + r * 0.6); ctx.lineTo(x + r * 0.16, y + r * 0.85); ctx.stroke();
      ctx.fillStyle = '#E8C39E'; contour(ctx);
      ctx.beginPath(); rr(ctx, x - r * 0.22, y + r * 0.85, r * 0.44, r * 0.28, 4); ctx.fill(); ctx.stroke();
    },
    arcenciel: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      var cols = ['#FFB3CD', '#FFD9A8', '#FBF3A8', '#B9E8B0', '#A8D8F0', '#C9B6F0'];
      ctx.lineWidth = r * 0.14;
      for (var i = 0; i < cols.length; i++) {
        ctx.strokeStyle = cols[i];
        ctx.beginPath(); ctx.arc(x, y, r * (1 - i * 0.13), Math.PI, U.TAU); ctx.stroke();
      }
      // nuages aux extrémités
      ctx.fillStyle = '#FFFFFF'; contour(ctx);
      for (var s = -1; s <= 1; s += 2) {
        ctx.beginPath(); ctx.arc(x + s * r, y, r * 0.22, 0, U.TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + s * r * 0.78, y - r * 0.14, r * 0.15, 0, U.TAU); ctx.fill(); ctx.stroke();
      }
    },
    oiseaux: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r;
      for (var i = 0; i < 3; i++) {
        var bx = x + (i - 1) * r * 0.7 + Math.sin(t * 0.5 + i) * r * 0.2;
        var by = y + Math.abs(i - 1) * r * 0.34 + Math.sin(t * 1.6 + i * 0.8) * r * 0.1;
        var bat = Math.sin(t * 6 + i * 1.2) * r * 0.22;
        ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = Math.max(2, r * 0.1);
        ctx.beginPath();
        ctx.moveTo(bx - r * 0.28, by - bat); ctx.quadraticCurveTo(bx - r * 0.1, by + r * 0.06, bx, by);
        ctx.quadraticCurveTo(bx + r * 0.1, by + r * 0.06, bx + r * 0.28, by - bat);
        ctx.stroke();
        ctx.fillStyle = '#FFF6E0'; contour(ctx);
        ctx.beginPath(); ctx.arc(bx, by + r * 0.06, r * 0.11, 0, U.TAU); ctx.fill(); ctx.stroke();
      }
    },
    // nuage gris avec pluie localisée
    nuagepluie: function (ctx, d, t) {
      var x = d.x, y = d.y - Math.sin(t * 0.7 + d.graine * 4) * d.r * 0.08, r = d.r;
      ctx.fillStyle = '#D6E0EE'; ctx.strokeStyle = '#9AA9C4'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x - r * 0.45, y, r * 0.38, 0, U.TAU);
      ctx.arc(x, y - r * 0.2, r * 0.46, 0, U.TAU);
      ctx.arc(x + r * 0.48, y + r * 0.02, r * 0.34, 0, U.TAU);
      ctx.fill(); ctx.stroke();
      visage(ctx, x, y - r * 0.12, r * 0.26, '#EDF3FA', '#6D7E9C');
      pluie(ctx, x, y + r * 0.3, r, 5, t, 'rgba(127,190,232,.9)', 1.3);
    },
    cerfvolant: function (ctx, d, t) {
      var x = d.x + Math.sin(t * 1.2 + d.graine * 5) * d.r * 0.35;
      var y = d.y + Math.cos(t * 0.9 + d.graine * 3) * d.r * 0.25, r = d.r;
      var gite = Math.sin(t * 1.2 + d.graine * 5) * 0.3;
      ctx.save(); ctx.translate(x, y); ctx.rotate(gite);
      // losange arc-en-ciel
      var cols = ['#FFB3CD', '#FFE9C7', '#B9E8B0', '#C9DBFF'];
      for (var i = 0; i < 4; i++) {
        ctx.fillStyle = cols[i];
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.6 + i * r * 0.3); ctx.lineTo(-r * 0.42, -r * 0.6 + i * r * 0.3 + r * 0.3);
        ctx.lineTo(r * 0.42, -r * 0.6 + i * r * 0.3 + r * 0.3); ctx.lineTo(0, -r * 0.6 + i * r * 0.3 + r * 0.62);
        ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(-r * 0.42, 0); ctx.lineTo(0, r * 0.62); ctx.lineTo(r * 0.42, 0); ctx.closePath(); ctx.stroke();
      ctx.restore();
      // fil qui se débat
      ctx.strokeStyle = 'rgba(109,76,125,.55)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y + r * 0.62);
      ctx.quadraticCurveTo(x + Math.sin(t * 3) * r * 0.5 - r * 0.6, y + r * 1.4, x - r * 0.9, y + r * 1.9);
      ctx.stroke();
      // petit nœud au bout
      ctx.fillStyle = '#FF7EB9';
      ctx.beginPath(); ctx.arc(x - r * 0.9, y + r * 1.9, r * 0.1, 0, U.TAU); ctx.fill();
    },
    chateaucartes: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, tremble = Math.sin(t * 5 + d.graine * 8) * r * 0.012;
      ombre(ctx, x, y + r * 0.5, r * 0.95, r * 0.26);
      ctx.save(); ctx.translate(x, y); ctx.rotate(tremble);
      function carte(cx, cy, a) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
        ctx.fillStyle = '#FFF6E0'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2;
        rr(ctx, -r * 0.16, -r * 0.5, r * 0.32, r * 1.0, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#F493BC';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.07, 0, U.TAU); ctx.fill();
        ctx.restore();
      }
      // deux étages de cartes en A
      carte(-r * 0.42, -r * 0.05, -0.22); carte(-r * 0.18, -r * 0.05, 0.22);
      carte(r * 0.18, -r * 0.05, -0.22); carte(r * 0.42, -r * 0.05, 0.22);
      ctx.fillStyle = '#FFD9E8'; ctx.strokeStyle = '#6D4C7D'; ctx.lineWidth = 2;
      rr(ctx, -r * 0.62, -r * 0.66, r * 1.24, r * 0.1, 3); ctx.fill(); ctx.stroke();
      carte(-r * 0.22, -r * 1.12, -0.22); carte(r * 0.06, -r * 1.12, 0.22);
      // drapeau
      ctx.fillStyle = '#A2B9E7';
      ctx.beginPath(); ctx.moveTo(0, -r * 1.62); ctx.lineTo(r * 0.28, -r * 1.5); ctx.lineTo(0, -r * 1.38); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    // éclair mignon (clignote doucement)
    eclair: function (ctx, d, t) {
      var x = d.x, y = d.y, r = d.r, p = ((t * 0.8 + d.graine * 3) % 1);
      var vif = p < 0.12 ? 1 : 0.35;
      lueur(ctx, x, y, r * 1.8, '252,227,138', 0.16 + 0.24 * vif);
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(252,227,138,' + (0.5 + 0.5 * vif) + ')';
      ctx.strokeStyle = '#E0B24A'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.18, -r * 0.75); ctx.lineTo(r * 0.32, -r * 0.12); ctx.lineTo(r * 0.02, -r * 0.08);
      ctx.lineTo(r * 0.24, r * 0.75); ctx.lineTo(-r * 0.34, r * 0.02); ctx.lineTo(-r * 0.02, r * 0.0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // yeux mignons
      ctx.fillStyle = '#6D4C7D';
      ctx.beginPath(); ctx.arc(-r * 0.02, -r * 0.18, r * 0.06, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.16, -r * 0.18, r * 0.06, 0, U.TAU); ctx.fill();
      ctx.restore();
    }
  };
  for (var _k4 in D4) DECORS[_k4] = D4[_k4];

  // types sans animation : cuit dans le bake (tout le reste est redessiné par frame)
  var STATIQUES = {
    coquillage: 1, seau: 1, pancakes: 1, bol: 1, cuillere: 1, fourchette: 1, miettes: 1,
    cabanon: 1, tapis: 1, savon: 1, igloo: 1, sapin: 1, arcenciel: 1, miroir: 1, peignoir: 1
  };

  function drawDecor(ctx, d, t) {
    var f = DECORS[d.type];
    if (!f) return; // type manquant = rien ne dessine (garde)
    f(ctx, d, t);
  }

  V.draw = {
    SPR: SPR,
    perso: perso,
    kartSprite: kartSprite,
    avatar: avatar,
    visage: visage,
    oreilles: oreilles,
    etoile: etoile,
    ombre: ombre,
    DECORS: DECORS,
    STATIQUES: STATIQUES,
    drawDecor: drawDecor
  };
})(typeof window !== 'undefined' ? window : globalThis);
