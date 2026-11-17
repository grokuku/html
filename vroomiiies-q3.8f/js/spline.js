/* Vroomiiies — splines : Catmull-Rom centripède -> rééchantillonnage arc uniforme.
   Tables {x,y,tx,ty,nx,ny,c,s} via Float32Array, at(s) en O(1).
   PIÈGE CONNU : nearest() en FENÊTRE LOCALE hint±60 — sinon un huit fait sauter
   le kart sur l'autre branche au croisement. */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};
  var U = V.U;

  var DS = 6;              // pas de rééchantillonnage (unités monde)
  var SUB = 24;            // sous-échantillons par segment avant rééchantillonnage
  var FENETRE = 60;        // demi-fenêtre de pointé local (indices)

  // ---------- Catmull-Rom centripède : un segment P1->P2 ----------
  function crPoint(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, t, out) {
    // nœuds centripètes : t_{i+1} = t_i + sqrt(dist)
    var d01 = Math.sqrt(U.dist(p0x, p0y, p1x, p1y));
    var t1 = Math.sqrt(U.dist(p1x, p1y, p2x, p2y));
    var d23 = Math.sqrt(U.dist(p2x, p2y, p3x, p3y));
    if (t1 < 1e-4) t1 = 1e-4;
    if (d01 < 1e-4) d01 = t1;
    if (d23 < 1e-4) d23 = t1;
    var t0 = 0, t2 = t1 + t1, t3 = t2 + d23;
    // temps interpolé tt dans [t1, t2]
    var tt = t1 + (t2 - t1) * t;
    // Barry–Goldman
    function lerpN(a1, a2, ta, tb) {
      if (Math.abs(tb - ta) < 1e-9) return a1;
      return ((tb - tt) / (tb - ta)) * a1 + ((tt - ta) / (tb - ta)) * a2;
    }
    var A1x = lerpN(p1x, p2x, t1, t2), A1y = lerpN(p1y, p2y, t1, t2);
    var A2x = lerpN(p2x, p3x, t2, t3), A2y = lerpN(p2y, p3y, t2, t3);
    var A0x = lerpN(p0x, p1x, t0, t1), A0y = lerpN(p0y, p1y, t0, t1);
    var Q1x = lerpN(A0x, A1x, t0, t2), Q1y = lerpN(A0y, A1y, t0, t2);
    var Q2x = lerpN(A1x, A2x, t1, t3), Q2y = lerpN(A1y, A2y, t1, t3);
    out[0] = lerpN(Q1x, Q2x, t1, t2);
    out[1] = lerpN(Q1y, Q2y, t1, t2);
    return out;
  }

  // ---------- construction ----------
  // points : [[x,y],...] boucle fermée ; opts {nom}
  function build(points, opts) {
    opts = opts || {};
    var m = points.length;
    var i, j, t;

    // 1) polyline dense (Catmull-Rom centripède, boucle fermée)
    var dense = [];
    var tmp = [0, 0];
    for (i = 0; i < m; i++) {
      var p0 = points[(i - 1 + m) % m], p1 = points[i], p2 = points[(i + 1) % m], p3 = points[(i + 2) % m];
      for (j = 0; j < SUB; j++) {
        t = j / SUB;
        crPoint(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], t, tmp);
        dense.push(tmp[0], tmp[1]);
      }
    }

    // 2) longueurs cumulées
    var M = dense.length / 2;
    var cum = new Float64Array(M + 1);
    for (i = 0; i < M; i++) {
      var nx = dense[((i + 1) % M) * 2], ny = dense[((i + 1) % M) * 2 + 1];
      cum[i + 1] = cum[i] + U.dist(dense[i * 2], dense[i * 2 + 1], nx, ny);
    }
    var perim = cum[M];

    // 3) rééchantillonnage à arc uniforme
    var n = Math.max(64, Math.round(perim / DS));
    var step = perim / n;
    var xs = new Float32Array(n), ys = new Float32Array(n);
    var k = 0;
    for (i = 0; i < n; i++) {
      var target = i * step;
      while (k < M - 1 && cum[k + 1] < target) k++;
      var segLen = cum[k + 1] - cum[k];
      var f = segLen > 1e-6 ? (target - cum[k]) / segLen : 0;
      var a = k * 2, b = ((k + 1) % M) * 2;
      xs[i] = dense[a] + (dense[b] - dense[a]) * f;
      ys[i] = dense[a + 1] + (dense[b + 1] - dense[a + 1]) * f;
    }

    // 4) tangentes / normales / courbure
    var txs = new Float32Array(n), tys = new Float32Array(n);
    var nxs = new Float32Array(n), nys = new Float32Array(n);
    var curv = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var pi = xs[(i - 1 + n) % n], pj = xs[(i + 1) % n];
      var qi = ys[(i - 1 + n) % n], qj = ys[(i + 1) % n];
      var dx = pj - pi, dy = qj - qi;
      var l = Math.hypot(dx, dy) || 1;
      txs[i] = dx / l; tys[i] = dy / l;
      nxs[i] = -tys[i]; nys[i] = txs[i];
    }
    var courbureMax = 0;
    for (i = 0; i < n; i++) {
      var a1x = txs[i], a1y = tys[i];
      var a0x = txs[(i - 1 + n) % n], a0y = tys[(i - 1 + n) % n];
      var cross = a0x * a1y - a0y * a1x;
      var dot = a0x * a1x + a0y * a1y;
      var ang = Math.atan2(cross, Math.max(-1, Math.min(1, dot)));
      curv[i] = ang / step; // signed 1/R
      if (Math.abs(curv[i]) > courbureMax) courbureMax = Math.abs(curv[i]);
    }

    var sp = {
      nom: opts.nom || 'spline',
      n: n,
      xs: xs, ys: ys, txs: txs, tys: tys, nxs: nxs, nys: nys, curv: curv,
      step: step,
      total: perim,
      courbureMax: courbureMax,
      xmin: Infinity, xmax: -Infinity, ymin: Infinity, ymax: -Infinity
    };
    for (i = 0; i < n; i++) {
      if (xs[i] < sp.xmin) sp.xmin = xs[i]; if (xs[i] > sp.xmax) sp.xmax = xs[i];
      if (ys[i] < sp.ymin) sp.ymin = ys[i]; if (ys[i] > sp.ymax) sp.ymax = ys[i];
    }

    // validations (aucune console ici : warnings consommés par debug.selftest)
    sp.warnings = [];
    if (!isFinite(perim) || perim < 400) sp.warnings.push(sp.nom + ': longueur suspecte ' + Math.round(perim));
    if (courbureMax > 0.025) sp.warnings.push(sp.nom + ': courbure max trop forte ' + courbureMax.toFixed(4));
    for (i = 0; i < n; i++) {
      if (!isFinite(xs[i]) || !isFinite(ys[i])) { sp.warnings.push(sp.nom + ': échantillon non fini @' + i); break; }
    }
    return sp;
  }

  // ---------- accès ----------
  // at(s, out) : écrit {x,y,tx,ty,nx,ny,curv} dans out (zéro allocation)
  function at(sp, s, out) {
    var u = s % sp.total; if (u < 0) u += sp.total;
    var fi = u / sp.step;
    var i = fi | 0; var f = fi - i;
    var j = (i + 1) % sp.n;
    out.x = sp.xs[i] + (sp.xs[j] - sp.xs[i]) * f;
    out.y = sp.ys[i] + (sp.ys[j] - sp.ys[i]) * f;
    out.tx = sp.txs[i]; out.ty = sp.tys[i];
    out.nx = sp.nxs[i]; out.ny = sp.nys[i];
    out.curv = sp.curv[i];
    out.s = u;
    return out;
  }
  function atIdx(sp, i, out) {
    i = ((i % sp.n) + sp.n) % sp.n;
    out.x = sp.xs[i]; out.y = sp.ys[i];
    out.tx = sp.txs[i]; out.ty = sp.tys[i];
    out.nx = sp.nxs[i]; out.ny = sp.nys[i];
    out.curv = sp.curv[i];
    out.s = i * sp.step;
    return out;
  }

  // nearest(x, y, hintIdx) : FENÊTRE LOCALE hint±60 (piège du huit), O(121).
  // hintIdx < 0 => scan global (init / placement).
  function nearest(sp, x, y, hint) {
    var n = sp.n, xs = sp.xs, ys = sp.ys;
    var best = -1, bd = Infinity;
    if (hint >= 0 && hint < n) {
      for (var d = -FENETRE; d <= FENETRE; d++) {
        var i = ((hint + d) % n + n) % n;
        var dx = xs[i] - x, dy = ys[i] - y;
        var dd = dx * dx + dy * dy;
        if (dd < bd) { bd = dd; best = i; }
      }
      if (best >= 0) return best;
    }
    for (var i2 = 0; i2 < n; i2++) {
      var dx2 = xs[i2] - x, dy2 = ys[i2] - y;
      var dd2 = dx2 * dx2 + dy2 * dy2;
      if (dd2 < bd) { bd = dd2; best = i2; }
    }
    return best;
  }

  // croisements géométriques (pairs d'indices éloignés trop proches) — info phase 2
  function croisements(sp, minEcartIdx, distMini) {
    var res = [];
    var stride = Math.max(2, (sp.n / 120) | 0);
    var gap = Math.max(minEcartIdx | 0, 8);
    for (var i = 0; i < sp.n; i += stride) {
      for (var j = i + gap; j < sp.n - gap / 2; j += stride) {
        var d = U.dist(sp.xs[i], sp.ys[i], sp.xs[j], sp.ys[j]);
        if (d < distMini) res.push({ i: i, j: j, x: (sp.xs[i] + sp.xs[j]) / 2, y: (sp.ys[i] + sp.ys[j]) / 2 });
      }
    }
    return res;
  }

  // polyligne décalée de k (normale) — remplit outX/outY (Float32Array de taille n)
  function offsetPolyline(sp, k, outX, outY) {
    for (var i = 0; i < sp.n; i++) {
      outX[i] = sp.xs[i] + sp.nxs[i] * k;
      outY[i] = sp.ys[i] + sp.nys[i] * k;
    }
    return outX;
  }

  V.spline = {
    DS: DS, FENETRE: FENETRE,
    build: build,
    at: function (sp, s, out) { return at(sp, s, out); },
    atIdx: function (sp, i, out) { return atIdx(sp, i, out); },
    nearest: nearest,
    croisements: croisements,
    offsetPolyline: offsetPolyline
  };
})(typeof window !== 'undefined' ? window : globalThis);
