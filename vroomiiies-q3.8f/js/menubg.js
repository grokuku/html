/* Vroomiiies — fond animé du menu : vue de dessus d'un circuit décoratif violet
   sur nappe à carreaux rose/blanc + décorations sucrées animées (pancakes, bocal
   de bonbons, gâteau fraises, tasse marshmallows, sucettes, fantômes-œufs,
   cupcakes spectateurs) + karts de démo qui tournent. */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};
  var U = V.U;

  var cv = null, ctx = null, bakeCv = null, bctx = null;
  var dpr = 1, w = 0, h = 0;
  var sp = null;                  // tracé décoratif (en px écran)
  var kartsDemo = [];
  var key = '';
  var actif = false;

  function init(canvasEl) {
    cv = canvasEl;
    ctx = cv.getContext('2d');
    root.addEventListener('resize', dimensionner);
    dimensionner();
  }

  function dimensionner() {
    w = root.innerWidth; h = root.innerHeight;
    dpr = Math.min(2, root.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    if (!bakeCv) { bakeCv = root.document.createElement('canvas'); bctx = bakeCv.getContext('2d'); }
    bakeCv.width = cv.width; bakeCv.height = cv.height;

    // tracé décoratif : boucle organique dans l'espace écran
    var cx = w * 0.5, cy = h * 0.52;
    var rx = Math.min(w * 0.42, 640), ry = Math.min(h * 0.34, 330);
    var pts = [];
    var N = 18;
    for (var i = 0; i < N; i++) {
      var th = (i / N) * U.TAU;
      var f = 1 + 0.16 * Math.sin(3 * th + 0.8) + 0.1 * Math.sin(2 * th - 1.2);
      pts.push([cx + rx * f * Math.cos(th), cy + ry * f * Math.sin(th)]);
    }
    sp = V.spline.build(pts, { nom: 'menubg' });

    // karts de démo
    kartsDemo.length = 0;
    var ids = ['mimi', 'pop', 'doudou', 'etoile'];
    for (var k = 0; k < ids.length; k++) {
      kartsDemo.push({ charId: ids[k], s: (sp.total / ids.length) * k, v: 105 + k * 14, lane: (k % 2 ? 1 : -1) * 13 });
    }
    key = w + 'x' + h;
    bake();
  }

  function bake() {
    var c = bctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // nappe à carreaux rose/blanc
    var carreau = 64;
    c.fillStyle = '#FFE9F4';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#FFD9EB';
    for (var y = 0; y < h; y += carreau) {
      for (var x = ((y / carreau) % 2) * carreau; x < w; x += carreau * 2) {
        c.fillRect(x, y, carreau, carreau);
      }
    }
    // léger vignettage sucré
    var g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(244,147,188,.25)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);

    // circuit violet
    var p = new root.Path2D();
    p.moveTo(sp.xs[0], sp.ys[0]);
    for (var i = 1; i < sp.n; i += 2) p.lineTo(sp.xs[i], sp.ys[i]);
    p.closePath();
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 86; c.stroke(p);
    c.strokeStyle = '#9B8CC9'; c.lineWidth = 70; c.stroke(p);
    c.strokeStyle = '#8A78BC'; c.lineWidth = 4;
    c.setLineDash([14, 22]); c.stroke(p); c.setLineDash([]);
    // pastilles "cupcakes spectateurs" le long du tracé (statiques : socle)
    var out = {};
    for (var q = 0; q < 14; q++) {
      V.spline.at(sp, (q / 14) * sp.total, out);
      var cot = q % 2 ? 1 : -1;
      var px = out.x - out.ny * cot * 62, py = out.y + out.nx * cot * 62;
      c.fillStyle = 'rgba(255,255,255,.5)';
      c.beginPath(); c.arc(px, py, 16, 0, U.TAU); c.fill();
    }
  }

  // ---------- décorations sucrées ----------
  function S() { return Math.min(w, h) / 800; }

  var SUCKERIES = [
    { type: 'pancakes', fx: 0.12, fy: 0.2 },
    { type: 'bocal', fx: 0.88, fy: 0.16 },
    { type: 'gateau', fx: 0.14, fy: 0.82 },
    { type: 'tasse', fx: 0.87, fy: 0.8 },
    { type: 'sucette', fx: 0.05, fy: 0.5 },
    { type: 'sucette', fx: 0.95, fy: 0.45, miroir: 1 },
    { type: 'fantome', fx: 0.3, fy: 0.12 },
    { type: 'fantome', fx: 0.7, fy: 0.9 }
  ];

  function roundRect(c, x, y, rw, rh, r) {
    if (c.roundRect) { c.beginPath(); c.roundRect(x, y, rw, rh, r); return; }
    c.beginPath(); c.rect(x, y, rw, rh);
  }

  function dessineSucre(c, type, x, y, t, i) {
    var s = S();
    c.save();
    c.translate(x, y + Math.sin(t * 1.3 + i * 2) * 4 * s);
    if (type === 'pancakes') {
      c.scale(1, 1 + Math.sin(t * 2.2 + i) * 0.02);
      c.fillStyle = '#FFFFFF'; c.strokeStyle = '#6D4C7D'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(0, 26 * s, 44 * s, 14 * s, 0, 0, U.TAU); c.fill(); c.stroke();
      for (var p = 0; p < 3; p++) {
        c.fillStyle = '#F2C87E';
        c.beginPath(); c.ellipse(0, (14 - p * 11) * s, (38 - p * 3) * s, 9 * s, 0, 0, U.TAU); c.fill(); c.stroke();
      }
      c.fillStyle = '#FCE38A'; // beurre
      roundRect(c, -8 * s, -14 * s, 16 * s, 10 * s, 3 * s); c.fill(); c.stroke();
    } else if (type === 'bocal') {
      c.fillStyle = 'rgba(255,255,255,.75)'; c.strokeStyle = '#6D4C7D'; c.lineWidth = 3;
      roundRect(c, -26 * s, -26 * s, 52 * s, 62 * s, 12 * s); c.fill(); c.stroke();
      var cols = ['#FF7EB9', '#A2B9E7', '#FCE38A', '#CFF3C8'];
      for (var b = 0; b < 14; b++) {
        c.fillStyle = cols[b % 4];
        var bx = (((b * 53) % 40) - 20) * s;
        var by = (((b * 31) % 44) - 18) * s + 4 * s;
        c.beginPath(); c.arc(bx, by, 5.4 * s, 0, U.TAU); c.fill();
      }
      c.fillStyle = '#F493BC';
      roundRect(c, -29 * s, -36 * s, 58 * s, 12 * s, 5 * s); c.fill(); c.stroke();
    } else if (type === 'gateau') {
      var etages = [[40, 22, '#FFF3C4'], [31, 18, '#FFD9EB'], [22, 15, '#FFF3C4']];
      var yy = 26;
      for (var e = 0; e < 3; e++) {
        var et = etages[e];
        c.fillStyle = et[2]; c.strokeStyle = '#6D4C7D'; c.lineWidth = 3;
        roundRect(c, -et[0] * s, (yy - et[1]) * s, et[0] * 2 * s, et[1] * s, 6 * s); c.fill(); c.stroke();
        yy -= et[1] - 3;
      }
      for (var f2 = -1; f2 <= 1; f2++) { // fraises
        c.fillStyle = '#FF5F7A';
        c.beginPath(); c.arc(f2 * 13 * s, (yy - 2) * s, 6.5 * s, 0, U.TAU); c.fill(); c.stroke();
        c.fillStyle = '#7EC97A';
        c.beginPath(); c.arc(f2 * 13 * s, (yy - 7) * s, 2.6 * s, 0, U.TAU); c.fill();
      }
    } else if (type === 'tasse') {
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3.4 * s;
      for (var v = 0; v < 2; v++) {
        c.beginPath();
        var vx = (v ? -9 : 9) * s;
        c.moveTo(vx, -22 * s);
        c.quadraticCurveTo(vx + Math.sin(t * 2 + v * 2) * 7 * s, -36 * s, vx, -50 * s);
        c.stroke();
      }
      c.fillStyle = '#A2B9E7'; c.strokeStyle = '#6D4C7D'; c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-30 * s, -20 * s); c.lineTo(30 * s, -20 * s);
      c.lineTo(20 * s, 22 * s); c.lineTo(-20 * s, 22 * s);
      c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(32 * s, -4 * s, 11 * s, -1.2, 1.6); c.stroke();
      c.fillStyle = '#FFFFFF';
      for (var mm = 0; mm < 3; mm++) {
        c.beginPath(); c.arc((mm - 1) * 14 * s, -20 * s + Math.sin(t * 2.4 + mm * 2) * 1.5 * s, 7 * s, 0, U.TAU); c.fill();
      }
    } else if (type === 'sucette') {
      c.rotate(Math.sin(t * 0.9 + i * 3) * 0.12);
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 4.5 * s;
      c.beginPath(); c.moveTo(0, 8 * s); c.lineTo(0, 46 * s); c.stroke();
      c.strokeStyle = '#6D4C7D'; c.lineWidth = 3;
      c.fillStyle = '#FF7EB9';
      c.beginPath(); c.arc(0, -12 * s, 24 * s, 0, U.TAU); c.fill(); c.stroke();
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 4 * s;
      c.beginPath();
      for (var a = 0; a < 4 * Math.PI; a += 0.2) {
        var rr = (a / (4 * Math.PI)) * 18 * s;
        var sx2 = Math.cos(a + t * 0.4) * rr, sy2 = Math.sin(a + t * 0.4) * rr - 12 * s;
        a === 0 ? c.moveTo(sx2, sy2) : c.lineTo(sx2, sy2);
      }
      c.stroke();
    } else if (type === 'fantome') {
      var fl = Math.sin(t * 1.8 + i * 5) * 6 * s;
      c.translate(0, fl);
      c.globalAlpha = 0.88;
      c.fillStyle = '#FFFDF6'; c.strokeStyle = '#6D4C7D'; c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-18 * s, 22 * s);
      c.quadraticCurveTo(-22 * s, -26 * s, 0, -26 * s);
      c.quadraticCurveTo(22 * s, -26 * s, 18 * s, 22 * s);
      // petit zigzag fantôme
      c.quadraticCurveTo(12 * s, 14 * s, 6 * s, 22 * s);
      c.quadraticCurveTo(0, 14 * s, -6 * s, 22 * s);
      c.quadraticCurveTo(-12 * s, 14 * s, -18 * s, 22 * s);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#6D4C7D';
      c.beginPath(); c.arc(-7 * s, -8 * s, 2.8 * s, 0, U.TAU); c.fill();
      c.beginPath(); c.arc(7 * s, -8 * s, 2.8 * s, 0, U.TAU); c.fill();
      c.globalAlpha = 1;
    }
    c.restore();
  }

  function cupcakesSpectateurs(c, t) {
    var out = {};
    for (var q = 0; q < 14; q++) {
      V.spline.at(sp, (q / 14) * sp.total, out);
      var cot = q % 2 ? 1 : -1;
      var px = out.x - out.ny * cot * 62;
      var py = out.y + out.nx * cot * 62 - Math.abs(Math.sin(t * 2.6 + q * 1.4)) * 7;
      var s = S();
      c.save();
      c.translate(px, py);
      // caissette
      c.fillStyle = '#F493BC'; c.strokeStyle = '#6D4C7D'; c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(-11 * s, 12 * s); c.lineTo(11 * s, 12 * s); c.lineTo(8 * s, 26 * s); c.lineTo(-8 * s, 26 * s);
      c.closePath(); c.fill(); c.stroke();
      // crème
      c.fillStyle = '#FFF6E8';
      c.beginPath(); c.arc(0, 4 * s, 12 * s, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(0, -8 * s, 7 * s, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      // cerise + yeux kawaii
      c.fillStyle = '#FF5F7A';
      c.beginPath(); c.arc(0, -15 * s, 3.4 * s, 0, U.TAU); c.fill();
      c.fillStyle = '#6D4C7D';
      c.beginPath(); c.arc(-4 * s, 0, 1.5 * s, 0, U.TAU); c.fill();
      c.beginPath(); c.arc(4 * s, 0, 1.5 * s, 0, U.TAU); c.fill();
      c.restore();
    }
  }

  // ---------- frame ----------
  var _p = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0, curv: 0, s: 0 };
  function frame(dt, t) {
    if (!cv || cv.hidden || !sp) return;
    if (w + 'x' + h !== key) dimensionner();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bakeCv, 0, 0, w, h);

    cupcakesSpectateurs(ctx, t);

    // décorations sucrées du pourtour
    for (var i = 0; i < SUCKERIES.length; i++) {
      var d = SUCKERIES[i];
      dessineSucre(ctx, d.type, d.fx * w, d.fy * h, t, i);
    }

    // karts de démo
    for (var k = 0; k < kartsDemo.length; k++) {
      var kd = kartsDemo[k];
      kd.s = (kd.s + kd.v * dt) % sp.total;
      V.spline.at(sp, kd.s, _p);
      var x = _p.x + _p.nx * kd.lane, y = _p.y + _p.ny * kd.lane;
      ctx.fillStyle = 'rgba(60,40,70,.2)';
      ctx.beginPath(); ctx.ellipse(x, y + 9, 13, 6, 0, 0, U.TAU); ctx.fill();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(_p.ty, _p.tx));
      var spr = V.draw.kartSprite(kd.charId);
      ctx.drawImage(spr, -17, -17, 34, 34);
      ctx.restore();
    }
  }

  V.menubg = {
    init: init,
    frame: frame,
    actif: false
  };
})(typeof window !== 'undefined' ? window : globalThis);
