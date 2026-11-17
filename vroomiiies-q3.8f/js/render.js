/* Vroomiiies — rendu course.
   Décision carnet : caméra = circuit entier visible (fit-to-track), pas de scroll.
   scale = min(vw/1600, vh/900), centré sur la bbox du tracé. Monde 1600×900 u.
   Trois couches :
     1. bakeFond  : couleur + motif du thème (cuit)
     2. animé     : fond animé par thème (flocons, étoiles, nuages, vagues, bulles) — frame
     3. bakePiste : piste + damier + ponts + décors statiques (cuit, canvas transparent)
   puis par frame : décors animés, grille, bonbons, karts (+halo), particules, badges. */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};
  var U = V.U, C = V.C;

  var cv = null, ctx = null;
  var bake = null, bctx = null;            // piste (transparent)
  var fond = null, fctx = null;            // fond (motif cuit)
  var dpr = 1, vw = 0, vh = 0;
  var track = null;
  var cam = { s: 1, ox: 0, oy: 0 };       // monde -> écran (css px)
  var paths = null;                        // Path2D de la piste (monde)
  var sortBuf = [];                        // buffer de tri des karts
  var fontBadge = null;
  var slotM = { x: 0, y: 0, heading: 0, sHint: 0 }; // marqueur de grille (réutilisé)
  var haloSpr = null, haloT = null;
  var parts = [];                          // particules d'étoiles (bonbon)
  var tPrec = 0;

  function init(canvasEl) {
    cv = canvasEl;
    ctx = cv.getContext('2d');
    root.addEventListener('resize', resize);
    // éclats d'étoiles au passage d'un bonbon
    if (V.race && V.race.on) {
      V.race.on(function (ev, data) {
        if (ev === 'pick' && data && data.kart) exploser(data.kart.x, data.kart.y);
      });
    }
    resize();
  }

  function resize() {
    vw = root.innerWidth; vh = root.innerHeight;
    dpr = Math.min(2, root.devicePixelRatio || 1);
    if (cv) {
      cv.width = Math.round(vw * dpr);
      cv.height = Math.round(vh * dpr);
    }
    if (bake) { bake.width = cv.width; bake.height = cv.height; }
    if (fond) { fond.width = cv.width; fond.height = cv.height; }
    if (track) prepare(track); // rebake
  }

  function prepare(t) {
    track = t;
    if (!bake) {
      bake = root.document.createElement('canvas');
      bctx = bake.getContext('2d');
      fond = root.document.createElement('canvas');
      fctx = fond.getContext('2d');
    }
    bake.width = cv.width; bake.height = cv.height;
    fond.width = cv.width; fond.height = cv.height;

    // caméra fit-to-track : bbox du tracé ÉLARGIE aux décors (rien n'est coupé à l'écran)
    var sp = t.sp, cd = t.theme.cadre || {};
    var marge = t.largeur / 2 + 26;
    var x0 = sp.xmin, x1 = sp.xmax, y0 = sp.ymin, y1 = sp.ymax;
    for (var d = 0; d < t.decors.length; d++) {
      var dec = t.decors[d], rd = dec.r * 1.9;
      if (dec.x - rd < x0) x0 = dec.x - rd;
      if (dec.x + rd > x1) x1 = dec.x + rd;
      if (dec.y - rd < y0) y0 = dec.y - rd;
      if (dec.y + rd > y1) y1 = dec.y + rd;
    }
    x0 -= cd.gauche || 0; x1 += cd.droit || 0;
    y0 -= cd.haut || 0; y1 += cd.bas || 0;
    var bw = (x1 - x0) + marge * 2;
    var bh = (y1 - y0) + marge * 2;
    var s = Math.min(vw / C.MONDE.L, vh / C.MONDE.H);
    // garantir que la bbox tient (tracés compacts) sans jamais zoomer > 1.15
    s = Math.min(s, Math.min(vw / bw, vh / bh) * 0.98);
    s = Math.min(s, 1.15);
    cam.s = s;
    cam.ox = vw / 2 - s * (x0 + x1) / 2;
    cam.oy = vh / 2 - s * (y0 + y1) / 2;

    // chemins piste (monde)
    var p = new root.Path2D();
    p.moveTo(sp.xs[0], sp.ys[0]);
    for (var i = 1; i < sp.n; i++) p.lineTo(sp.xs[i], sp.ys[i]);
    p.closePath();
    paths = p;

    preparerFond();
    bakeScene();
  }

  function setWorld(c) {
    c.setTransform(dpr * cam.s, 0, 0, dpr * cam.s, dpr * cam.ox, dpr * cam.oy);
  }

  // ---------- couche 1 : fond + motif ----------
  function bboxMonde(c, pad) {
    var sp = track.sp;
    return { x0: sp.xmin - pad, y0: sp.ymin - pad, x1: sp.xmax + pad, y1: sp.ymax + pad };
  }

  function preparerFond() {
    var c = fctx, th = track.theme, sp = track.sp;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, fond.width, fond.height);
    c.fillStyle = th.fond;
    c.fillRect(0, 0, fond.width, fond.height);
    setWorld(c);
    var b = bboxMonde(c, 460), i, j;
    var rng = U.seeded(777);

    if (th.motif === 'ciel') {
      // dégradé de ciel (haut clair → plus saturé en bas)
      var g = c.createLinearGradient(0, b.y0, 0, b.y1);
      g.addColorStop(0, '#EAF4FF'); g.addColorStop(0.55, '#D6E8FF'); g.addColorStop(1, '#BCD4F5');
      c.fillStyle = g;
      c.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      // voile de nuages immobiles (les nuages mobiles sont dessinés par frame)
      c.fillStyle = 'rgba(255,255,255,.30)';
      for (i = 0; i < 16; i++) {
        var cx = b.x0 + rng() * (b.x1 - b.x0), cy = b.y0 + rng() * (b.y1 - b.y0), rr = 40 + rng() * 70;
        for (j = 0; j < 3; j++) {
          c.beginPath();
          c.ellipse(cx + (j - 1) * rr * 0.7, cy + Math.sin(j) * rr * 0.12, rr * (0.6 + j * 0.1), rr * 0.32, 0, 0, U.TAU);
          c.fill();
        }
      }
    } else if (th.motif === 'carreaux') {
      // nappe à carreaux rose/blanc (gingham)
      var car = 96;
      c.fillStyle = th.carreau;
      for (i = Math.floor(b.x0 / car) ; i * car < b.x1; i++) {
        for (j = Math.floor(b.y0 / car); j * car < b.y1; j++) {
          if ((i + j) % 2 === 0) c.fillRect(i * car, j * car, car, car);
        }
      }
      c.fillStyle = 'rgba(255,255,255,.35)';
      for (i = Math.floor(b.x0 / car); i * car < b.x1; i++) {
        for (j = Math.floor(b.y0 / car); j * car < b.y1; j++) {
          if ((i + j) % 2 === 1) c.fillRect(i * car, j * car, car, car);
        }
      }
    } else if (th.motif === 'sillons') {
      // sillons de potager : rangs ondulés
      var pas = 58;
      c.strokeStyle = th.sillon; c.lineWidth = 10; c.lineCap = 'round';
      for (j = Math.floor(b.y0 / pas) * pas; j < b.y1; j += pas) {
        c.beginPath();
        for (var x = b.x0; x < b.x1; x += 40) {
          var y = j + Math.sin(x * 0.006 + j * 0.05) * 7;
          x === b.x0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.stroke();
      }
      // cailloux kawaii
      c.fillStyle = 'rgba(255,255,255,.5)';
      for (i = 0; i < 40; i++) {
        c.beginPath(); c.ellipse(b.x0 + rng() * (b.x1 - b.x0), b.y0 + rng() * (b.y1 - b.y0), 4 + rng() * 4, 3 + rng() * 3, rng(), 0, U.TAU); c.fill();
      }
    } else if (th.motif === 'carrelage') {
      // carrelage pastel avec joints blancs
      var tuile = 84;
      c.strokeStyle = th.joint; c.lineWidth = 4;
      for (i = Math.floor(b.x0 / tuile) * tuile; i < b.x1; i += tuile) {
        c.beginPath(); c.moveTo(i, b.y0); c.lineTo(i, b.y1); c.stroke();
      }
      for (j = Math.floor(b.y0 / tuile) * tuile; j < b.y1; j += tuile) {
        c.beginPath(); c.moveTo(b.x0, j); c.lineTo(b.x1, j); c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,.35)';
      for (i = Math.floor(b.x0 / tuile); i * tuile < b.x1; i++) {
        for (j = Math.floor(b.y0 / tuile); j * tuile < b.y1; j++) {
          if ((i + j) % 3 === 0) c.fillRect(i * tuile + 4, j * tuile + 4, tuile - 8, tuile - 8);
        }
      }
      // flaque (le canard y flotte)
      if (th.flaque) {
        var f = th.flaque;
        c.fillStyle = 'rgba(154,221,240,.75)';
        c.beginPath(); c.ellipse(f.x, f.y, f.rx, f.ry, 0.2, 0, U.TAU); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3;
        c.beginPath(); c.ellipse(f.x, f.y, f.rx * 0.66, f.ry * 0.6, 0.2, 0, U.TAU); c.stroke();
      }
    } else if (th.motif === 'flocons') {
      // neige : congères douces + flocons posés
      c.fillStyle = 'rgba(255,255,255,.6)';
      for (i = 0; i < 16; i++) {
        var dx = b.x0 + rng() * (b.x1 - b.x0), dy = b.y0 + rng() * (b.y1 - b.y0), dr = 70 + rng() * 110;
        c.beginPath(); c.ellipse(dx, dy, dr, dr * 0.34, rng() * 0.5 - 0.25, 0, U.TAU); c.fill();
      }
      c.fillStyle = 'rgba(191,214,240,.35)';
      for (i = 0; i < 10; i++) {
        var gx = b.x0 + rng() * (b.x1 - b.x0), gy = b.y0 + rng() * (b.y1 - b.y0);
        c.beginPath(); c.ellipse(gx, gy, 40 + rng() * 60, 18 + rng() * 26, rng() * 0.6 - 0.3, 0, U.TAU); c.fill();
      }
      flocon(c, b, 70, 'rgba(255,255,255,.75)', rng);
    } else if (th.motif === 'etoiles') {
      // nuit étoilée : halos lointains + poussière d'étoiles
      var gg = c.createRadialGradient(800, 450, 60, 800, 450, 900);
      gg.addColorStop(0, 'rgba(120,90,180,.35)'); gg.addColorStop(1, 'rgba(30,20,60,0)');
      c.fillStyle = gg;
      c.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      c.fillStyle = 'rgba(255,246,201,.55)';
      for (i = 0; i < 260; i++) {
        var sx = b.x0 + rng() * (b.x1 - b.x0), sy = b.y0 + rng() * (b.y1 - b.y0), sr = 0.9 + rng() * 1.9;
        c.beginPath(); c.arc(sx, sy, sr, 0, U.TAU); c.fill();
      }
    } else if (th.motif === 'sable') {
      // sable : grain + petites coquilles
      c.fillStyle = th.pois;
      for (i = 0; i < 520; i++) {
        var px = b.x0 + rng() * (b.x1 - b.x0), py = b.y0 + rng() * (b.y1 - b.y0);
        c.beginPath(); c.arc(px, py, 1.6 + rng() * 3.4, 0, U.TAU); c.fill();
      }
      c.strokeStyle = 'rgba(224,167,184,.5)'; c.lineWidth = 2;
      for (i = 0; i < 26; i++) {
        var qx = b.x0 + rng() * (b.x1 - b.x0), qy = b.y0 + rng() * (b.y1 - b.y0), qr = 5 + rng() * 5;
        c.beginPath(); c.arc(qx, qy, qr, Math.PI * 0.1, Math.PI * 0.9); c.stroke();
      }
    } else {
      // pois (prairie) — grille régulière, déterministe
      var pas2 = 84;
      var x0 = Math.floor(sp.xmin / pas2) * pas2, y0 = Math.floor(sp.ymin / pas2) * pas2;
      c.fillStyle = th.pois;
      for (var py = y0; py < sp.ymax + 420; py += pas2) {
        for (var px = x0; px < sp.xmax + 420; px += pas2) {
          var jx = px + (rng() - 0.5) * 30, jy = py + (rng() - 0.5) * 30;
          var rr2 = 5 + rng() * 5;
          c.beginPath(); c.arc(jx, jy, rr2, 0, U.TAU); c.fill();
        }
      }
    }

    // mer de la plage (eauplate sous les vagues animées)
    if (th.mer) {
      var m = th.mer;
      var mg = c.createRadialGradient(m.x, m.y - m.ry * 0.4, m.rx * 0.2, m.x, m.y, m.rx);
      mg.addColorStop(0, '#A8E7F2'); mg.addColorStop(1, '#5FBFD8');
      c.fillStyle = mg;
      c.beginPath(); c.ellipse(m.x, m.y, m.rx, m.ry, 0, 0, U.TAU); c.fill();
    }
  }

  function flocon(c, b, n, coul, rng) {
    c.strokeStyle = coul; c.lineWidth = 1.6;
    for (var i = 0; i < n; i++) {
      var x = b.x0 + rng() * (b.x1 - b.x0), y = b.y0 + rng() * (b.y1 - b.y0), r = 2.5 + rng() * 4;
      c.beginPath();
      for (var k = 0; k < 3; k++) {
        var an = k * Math.PI / 3;
        c.moveTo(x - Math.cos(an) * r, y - Math.sin(an) * r);
        c.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r);
      }
      c.stroke();
    }
  }

  // ---------- couche 3 : piste, damier, ponts, décors statiques ----------
  function strokeStylePiste(c) {
    var th = track.theme, sp = track.sp;
    if (th.pisteDegrade) {
      var g = c.createLinearGradient(sp.xmin, sp.ymin, sp.xmax, sp.ymax);
      var n = th.pisteDegrade.length;
      for (var i = 0; i < n; i++) g.addColorStop(i / (n - 1), th.pisteDegrade[i]);
      return g;
    }
    return th.piste;
  }

  function bakeScene() {
    var c = bctx, sp = track.sp, th = track.theme;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, bake.width, bake.height);
    setWorld(c);

    // ombre portée douce sous la piste (lisibilité sur fond clair ET sombre)
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = th.fonce ? 'rgba(0,0,0,.35)' : 'rgba(60,40,70,.10)';
    c.lineWidth = track.largeur + 34;
    c.stroke(paths);

    // piste : bordure -> revêtement -> pointillés
    c.strokeStyle = th.bordure; c.lineWidth = track.largeur + 16;
    c.stroke(paths);
    c.strokeStyle = strokeStylePiste(c); c.lineWidth = track.largeur;
    c.stroke(paths);
    c.strokeStyle = th.pointille; c.lineWidth = 4;
    c.setLineDash([16, 26]);
    c.stroke(paths);
    c.setLineDash([]);

    // ponts des circuits en huit (tablier par-dessus la branche basse)
    for (var p = 0; p < track.ponts.length; p++) dessinerPont(c, track.ponts[p]);

    // bandes des zones d'accélération (AGRÉ-1) : les chevrons animés sont dessinés par frame()
    if (track.passages) {
      var nSp = sp.n;
      c.lineCap = 'round';
      for (var pz = 0; pz < track.passages.length; pz++) {
        var z = track.passages[pz];
        var zp = new root.Path2D();
        var firstZ = true;
        for (var zi = -z.demi; zi <= z.demi; zi++) {
          var zk = ((z.centre + zi) % nSp + nSp) % nSp;
          if (firstZ) { zp.moveTo(sp.xs[zk], sp.ys[zk]); firstZ = false; }
          else zp.lineTo(sp.xs[zk], sp.ys[zk]);
        }
        c.strokeStyle = 'rgba(63,211,198,.42)'; c.lineWidth = track.largeur * 0.74;
        c.stroke(zp);
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = track.largeur * 0.74 - 14;
        c.stroke(zp);
      }
      c.lineCap = 'butt';
    }

    // damier de départ/arrivée (2 rangées sur la largeur)
    var out = {}; V.spline.at(sp, 0, out);
    var cases = 8, taille = track.largeur / cases;
    var dam = th.damier || ['#FFFFFF', '#3A3243'];
    c.save();
    c.translate(out.x, out.y);
    c.rotate(Math.atan2(out.ty, out.tx));
    for (var row = 0; row < 2; row++) {
      for (var col = 0; col < cases; col++) {
        c.fillStyle = (row + col) % 2 ? dam[0] : dam[1];
        c.fillRect(row * taille - taille, -track.largeur / 2 + col * taille, taille, taille);
      }
    }
    c.restore();

    // décors statiques (cuit ici) ; les animés sont redessinés par frame()
    for (var d = 0; d < track.decors.length; d++) {
      if (V.draw.STATIQUES[track.decors[d].type]) V.draw.drawDecor(c, track.decors[d], 0);
    }
  }

  // tablier du pont : planches le long de la branche haute, rails, puis re-stroke
  // de la branche du dessus (elle passe donc « sur » le pont).
  function dessinerPont(c, pont) {
    var th = track.theme, L = track.largeur;
    var tp = th.pont || { tablier: '#C89A6B', planche: '#B4825A', rail: '#8C6140' };
    var long = L * 3.4, larg = L + 30;
    c.save();
    c.translate(pont.x, pont.y);
    c.rotate(pont.angle);
    // ombre du tablier
    c.fillStyle = 'rgba(40,25,55,.22)';
    c.beginPath();
    if (c.roundRect) c.roundRect(-long / 2 + 5, -larg / 2 + 7, long, larg, 12); else c.rect(-long / 2 + 5, -larg / 2 + 7, long, larg);
    c.fill();
    // tablier
    c.fillStyle = tp.tablier;
    c.beginPath();
    if (c.roundRect) c.roundRect(-long / 2, -larg / 2, long, larg, 12); else c.rect(-long / 2, -larg / 2, long, larg);
    c.fill();
    // planches perpendiculaires
    c.strokeStyle = tp.planche; c.lineWidth = 3;
    for (var x = -long / 2 + 12; x < long / 2 - 6; x += 20) {
      c.beginPath(); c.moveTo(x, -larg / 2 + 8); c.lineTo(x, larg / 2 - 8); c.stroke();
    }
    // rails
    c.strokeStyle = tp.rail; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-long / 2 + 4, -larg / 2 + 4); c.lineTo(long / 2 - 4, -larg / 2 + 4); c.stroke();
    c.beginPath(); c.moveTo(-long / 2 + 4, larg / 2 - 4); c.lineTo(long / 2 - 4, larg / 2 - 4); c.stroke();
    c.restore();

    // re-dessiner la branche du dessus par-dessus le tablier
    var sp = track.sp, demi = 34; // ~200 u de chaque côté du croisement
    var p = new root.Path2D();
    var i0 = pont.sur - demi, i1 = pont.sur + demi;
    var first = true;
    for (var i = i0; i <= i1; i++) {
      var k = ((i % sp.n) + sp.n) % sp.n;
      if (first) { p.moveTo(sp.xs[k], sp.ys[k]); first = false; } else p.lineTo(sp.xs[k], sp.ys[k]);
    }
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = th.bordure; c.lineWidth = track.largeur + 16; c.stroke(p);
    c.strokeStyle = strokeStylePiste(c); c.lineWidth = track.largeur; c.stroke(p);
    c.strokeStyle = th.pointille; c.lineWidth = 4; c.setLineDash([16, 26]); c.stroke(p); c.setLineDash([]);
  }

  // ---------- couche 2 animée (sous la piste) ----------
  var fondAnime = null;
  function preparerFondAnime() {
    var th = track.theme, sp = track.sp;
    var b = bboxMonde(null, 500);
    var rng = U.seeded(4242);
    var liste = [];
    if (th.motif === 'flocons') {
      for (var i = 0; i < 90; i++) {
        liste.push({ x: b.x0 + rng() * (b.x1 - b.x0), y: b.y0 + rng() * (b.y1 - b.y0),
          r: 2 + rng() * 5, v: 12 + rng() * 26, ph: rng() * 6 });
      }
    } else if (th.motif === 'etoiles') {
      for (var j = 0; j < 70; j++) {
        liste.push({ x: b.x0 + rng() * (b.x1 - b.x0), y: b.y0 + rng() * (b.y1 - b.y0),
          r: 1.4 + rng() * 3.4, ph: rng() * 6.28, v: 0.6 + rng() * 1.8 });
      }
    } else if (th.motif === 'ciel') {
      for (var k = 0; k < 14; k++) {
        var etage = k % 2;
        liste.push({ x: b.x0 + rng() * (b.x1 - b.x0), y: b.y0 + rng() * (b.y1 - b.y0),
          r: 60 + rng() * 90, v: (7 + rng() * 9) * (etage ? 1 : 0.45), alpha: etage ? 0.55 : 0.3 });
      }
    } else if (track.id === 'sdb') {
      for (var m = 0; m < 26; m++) {
        liste.push({ x: b.x0 + rng() * (b.x1 - b.x0), y: b.y0 + rng() * (b.y1 - b.y0),
          r: 4 + rng() * 11, v: 9 + rng() * 16, ph: rng() * 6.28 });
      }
    } else if (th.mer) {
      for (var n = 0; n < 3; n++) liste.push({ ph: n * 0.33, fac: 1 - n * 0.13 });
    }
    return { items: liste, b: b, kind: th.motif === 'flocons' ? 'flocons' : th.motif === 'etoiles' ? 'etoiles' :
      th.motif === 'ciel' ? 'nuages' : track.id === 'sdb' ? 'bulles' : th.mer ? 'vagues' : 'rien' };
  }

  function dessinerFondAnime(c, t) {
    if (!fondAnime || fondAnime.track !== track) {
      fondAnime = preparerFondAnime();
      fondAnime.track = track;
    }
    var th = track.theme, sp = track.sp, b = fondAnime.b, it = fondAnime.items, i;
    setWorld(c);
    if (fondAnime.kind === 'flocons') {
      var H = b.y1 - b.y0;
      c.fillStyle = 'rgba(255,255,255,.9)';
      for (i = 0; i < it.length; i++) {
        var o = it[i];
        var y = b.y0 + ((o.y - b.y0 + t * o.v) % H);
        var x = o.x + Math.sin(t * 0.7 + o.ph) * 16;
        c.beginPath(); c.arc(x, y, o.r, 0, U.TAU); c.fill();
      }
    } else if (fondAnime.kind === 'etoiles') {
      for (i = 0; i < it.length; i++) {
        var s = it[i];
        var a = 0.25 + 0.75 * Math.abs(Math.sin(t * s.v + s.ph));
        c.fillStyle = 'rgba(255,246,201,' + a.toFixed(3) + ')';
        c.beginPath(); c.arc(s.x, s.y, s.r, 0, U.TAU); c.fill();
        if (s.r > 4) { // étincelle en croix
          c.strokeStyle = 'rgba(255,246,201,' + (a * 0.6).toFixed(3) + ')'; c.lineWidth = 1.2;
          c.beginPath(); c.moveTo(s.x - s.r * 2.4, s.y); c.lineTo(s.x + s.r * 2.4, s.y);
          c.moveTo(s.x, s.y - s.r * 2.4); c.lineTo(s.x, s.y + s.r * 2.4); c.stroke();
        }
      }
    } else if (fondAnime.kind === 'nuages') {
      var W = b.x1 - b.x0;
      for (i = 0; i < it.length; i++) {
        var n = it[i];
        var x2 = b.x0 + ((n.x - b.x0 + t * n.v) % W);
        c.fillStyle = 'rgba(255,255,255,' + n.alpha + ')';
        for (var k2 = 0; k2 < 3; k2++) {
          c.beginPath();
          c.ellipse(x2 + (k2 - 1) * n.r * 0.72, n.y + Math.sin(k2 * 1.7) * n.r * 0.1,
            n.r * (0.62 + k2 * 0.08), n.r * 0.34, 0, 0, U.TAU);
          c.fill();
        }
      }
    } else if (fondAnime.kind === 'bulles') {
      var H2 = b.y1 - b.y0;
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.8;
      for (i = 0; i < it.length; i++) {
        var u = it[i];
        var y2 = b.y1 - ((b.y1 - u.y + t * u.v) % H2);
        var x3 = u.x + Math.sin(t * 1.1 + u.ph) * 12;
        c.beginPath(); c.arc(x3, y2, u.r, 0, U.TAU); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.35)';
        c.beginPath(); c.arc(x3 - u.r * 0.3, y2 - u.r * 0.3, u.r * 0.28, 0, U.TAU); c.fill();
      }
    } else if (fondAnime.kind === 'vagues') {
      // écume : lignes ondulées le long du rivage (bord haut de la mer)
      var m = th.mer, kx = m.rx * 0.94;
      for (var i = 0; i < it.length; i++) {
        var v = it[i];
        var fac = v.fac;
        var ry2 = m.ry * fac;
        var rx2 = m.rx * (0.34 + fac * 0.62);
        c.strokeStyle = 'rgba(255,255,255,' + (0.9 - i * 0.22) + ')';
        c.lineWidth = 4 - i;
        c.beginPath();
        var first = true;
        for (var a = -1; a <= 1.001; a += 0.04) {
          var wob = Math.sin(a * 7 + t * (1.6 + i * 0.4) + v.ph * 6.28) * (4 + i * 3);
          var px = m.x + a * rx2;
          var py = m.y - Math.sqrt(Math.max(0, 1 - (a * rx2 / m.rx) * (a * rx2 / m.rx))) * ry2 + wob;
          first ? (c.moveTo(px, py), (first = false)) : c.lineTo(px, py);
        }
        c.stroke();
        // reflets cassés sur l'eau
        c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 3;
        for (var q = 0; q < 3; q++) {
          var qx = m.x + ((q - 1) * 0.5 + Math.sin(t * 0.6 + q + i) * 0.12) * rx2;
          var qy = m.y + (0.18 + q * 0.2) * ry2 + Math.sin(t * 1.4 + q) * 4;
          c.beginPath(); c.moveTo(qx - 26, qy); c.quadraticCurveTo(qx, qy - 8, qx + 26, qy); c.stroke();
        }
      }
    }
  }

  // ---------- particules d'étoiles ----------
  function exploser(x, y) {
    for (var i = 0; i < 12; i++) {
      var an = (i / 12) * U.TAU + Math.random() * 0.5;
      var v = 60 + Math.random() * 110;
      parts.push({ x: x, y: y, vx: Math.cos(an) * v, vy: Math.sin(an) * v - 30,
        vie: 0.75 + Math.random() * 0.3, t: 0, r: 5 + Math.random() * 5, rot: Math.random() * 6 });
    }
    if (parts.length > 220) parts.splice(0, parts.length - 220);
  }
  function dessinerParticules(c, t, dt) {
    if (!parts.length) return;
    setWorld(c);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.t += dt;
      if (p.t >= p.vie) { parts.splice(i, 1); continue; }
      var f = p.t / p.vie;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 120 * dt;
      c.save();
      c.globalAlpha = 1 - f * f;
      c.translate(p.x + p.vx * p.t * 0.4, p.y + p.vy * p.t * 0.4);
      c.rotate(p.rot + p.t * 4);
      c.fillStyle = f < 0.5 ? '#FFD34E' : '#FFF3C4';
      c.strokeStyle = '#6D4C7D'; c.lineWidth = 1.2;
      var r = p.r * (1 - f * 0.4);
      c.beginPath();
      for (var s = 0; s < 10; s++) {
        var an = -Math.PI / 2 + s * Math.PI / 5, rr4 = s % 2 ? r * 0.45 : r;
        var px = Math.cos(an) * rr4, py = Math.sin(an) * rr4;
        s ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
    c.globalAlpha = 1;
  }

  // halo sous un kart (lisibilité sur tous les fonds)
  function halo(c, x, y, r, fort) {
    if (!haloSpr) {
      haloSpr = root.document.createElement('canvas');
      haloSpr.width = haloSpr.height = 128;
      var h = haloSpr.getContext('2d');
      var g = h.createRadialGradient(64, 64, 6, 64, 64, 62);
      g.addColorStop(0, 'rgba(255,255,255,.95)');
      g.addColorStop(0.45, 'rgba(255,241,196,.45)');
      g.addColorStop(1, 'rgba(255,241,196,0)');
      h.fillStyle = g;
      h.fillRect(0, 0, 128, 128);
    }
    if (haloT !== (track.theme.halo || null)) { haloT = track.theme.halo || null; }
    var d = r * (fort ? 5.4 : 4.2);
    c.save();
    c.globalAlpha = fort ? 0.95 : (track.theme.fonce ? 0.55 : 0.22);
    c.drawImage(haloSpr, x - d / 2, y - d / 2, d, d);
    c.restore();
  }

  // chevrons turquoise glissant le long des zones d'accélération (AGRÉ-1)
  function dessinerChevrons(c, t) {
    var ps = track.passages;
    if (!ps) return;
    var sp = track.sp, nSp = sp.n;
    var taille = track.largeur * 0.26;
    for (var z = 0; z < ps.length; z++) {
      var zone = ps[z];
      for (var q = 0; q < 3; q++) {
        var frac = (t * 0.9 + q / 3) % 1; // progression dans la zone, bouclante
        var zi = (((zone.centre - zone.demi + frac * zone.demi * 2) % nSp) + nSp) % nSp | 0;
        var x = sp.xs[zi], y = sp.ys[zi];
        var tx = sp.txs[zi], ty = sp.tys[zi];
        var nx = sp.nxs[zi], ny = sp.nys[zi];
        var alpha = 0.5 + 0.45 * Math.abs(Math.sin(t * 3.2 + q * 2.1));
        c.strokeStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
        c.lineWidth = 5; c.lineCap = 'round';
        // pointe vers l'avant, ailes vers l'arrière : « › »
        c.beginPath();
        c.moveTo(x - tx * taille + nx * taille * 0.72, y - ty * taille + ny * taille * 0.72);
        c.lineTo(x, y);
        c.moveTo(x - tx * taille - nx * taille * 0.72, y - ty * taille - ny * taille * 0.72);
        c.lineTo(x, y);
        c.stroke();
        c.lineCap = 'butt';
      }
    }
  }

  // ---------- frame ----------
  var _k = null;
  function frame(race, t) {
    if (!track) return;
    var dt = tPrec ? Math.min(0.1, t - tPrec) : 0.016;
    tPrec = t;

    // 1) fond cuit
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(fond, 0, 0);
    // 2) fond animé du thème
    dessinerFondAnime(ctx, t);
    // 3) piste + décors statiques
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bake, 0, 0);

    setWorld(ctx);

    // décors animés
    var d, dec;
    for (d = 0; d < track.decors.length; d++) {
      dec = track.decors[d];
      if (!V.draw.STATIQUES[dec.type]) V.draw.drawDecor(ctx, dec, t);
    }

    // chevrons animés des zones d'accélération (AGRÉ-1), sous les karts
    dessinerChevrons(ctx, t);

    // marqueurs de grille (peigne), sous les karts — uniquement pendant le compte à
    // rebours (MINEUR-3) : en course, ces pastilles grises « kart immobile » prêtent à confusion
    if (race.state === 'compte') {
      var nSlot = Math.min(race.karts.length, 40);
      for (var g = 0; g < nSlot; g++) {
        V.tracks.grilleSlot(track, g, slotM);
        ctx.fillStyle = 'rgba(255,255,255,.30)';
        ctx.beginPath(); ctx.arc(slotM.x, slotM.y, 11, 0, U.TAU); ctx.fill();
      }
    }

    // bonbons
    var bb = race.bonbons || [];
    for (d = 0; d < bb.length; d++) {
      if (!bb[d].pris) V.draw.etoile(ctx, bb[d].x, bb[d].y, 11, t);
    }

    // karts — peintre par y
    var karts = race.karts, n = karts.length, i;
    sortBuf.length = n;
    for (i = 0; i < n; i++) sortBuf[i] = karts[i];
    sortBuf.sort(function (a, b) { return a.y - b.y; });

    var R = C.PHYSIQUE.R_KART;
    var taille = 34; // taille monde du sprite
    for (i = 0; i < n; i++) {
      _k = karts2sprite(ctx, sortBuf[i], t, taille, R);
    }

    // particules d'étoiles (au-dessus des karts)
    dessinerParticules(ctx, t, dt);

    // badges position (joueur(s)) au-dessus des karts, en espace écran
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (i = 0; i < n; i++) {
      var k = karts[i];
      if (k.humain && k.rang > 0) badge(k, k.rang);
    }
  }

  function karts2sprite(c, k, t, taille, R) {
    // halo de lisibilité : fort sous le kart joueur, doux partout sur fond sombre
    if (k.humain || track.theme.fonce) halo(c, k.x, k.y, R, k.humain);
    // ombre
    c.fillStyle = 'rgba(60,40,70,.22)';
    c.beginPath(); c.ellipse(k.x, k.y + R * 0.55, R * 0.95, R * 0.5, 0, 0, U.TAU); c.fill();
    c.save();
    c.translate(k.x, k.y);
    c.rotate(k.heading);
    var spr = V.draw.kartSprite(k.charId);
    c.drawImage(spr, -taille / 2, -taille / 2, taille, taille);
    c.restore();
    // liseré pulsé sous le kart joueur (AGRÉ-3) : repère visible dans le peloton
    if (k.humain) {
      var pulse = 0.5 + 0.5 * Math.sin(t * 5.4 + k.joueur * 2.2);
      var base = k.joueur === 0 ? [244, 147, 188] : [127, 216, 232];
      c.strokeStyle = 'rgba(' + base[0] + ',' + base[1] + ',' + base[2] + ',' + (0.35 + 0.6 * pulse).toFixed(3) + ')';
      c.lineWidth = 2.2 + 1.8 * pulse;
      c.beginPath();
      c.ellipse(k.x, k.y + R * 0.55, R * (1.3 + 0.18 * pulse), R * (0.7 + 0.1 * pulse), 0, 0, U.TAU);
      c.stroke();
    }
    // étincelles de boost
    if (k.boostT > 0) {
      c.strokeStyle = 'rgba(255,211,78,.8)';
      c.lineWidth = 2.4;
      for (var s = 0; s < 3; s++) {
        var a = k.heading + Math.PI + (s - 1) * 0.35;
        var d0 = R + 4 + ((t * 40 + s * 7) % 10);
        c.beginPath();
        c.moveTo(k.x + Math.cos(a) * d0, k.y + Math.sin(a) * d0);
        c.lineTo(k.x + Math.cos(a) * (d0 + 6), k.y + Math.sin(a) * (d0 + 6));
        c.stroke();
      }
    }
    return null;
  }

  function badge(k, rang) {
    var sx = cam.ox + cam.s * k.x;
    var sy = cam.oy + cam.s * (k.y - 26);
    // liseré contrasté (fond nuit)
    ctx.strokeStyle = 'rgba(46,36,80,.55)';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(sx, sy, 14, 0, U.TAU); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#6D4C7D';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(sx, sy, 13, 0, U.TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6D4C7D';
    if (!fontBadge) {
      fontBadge = '700 12px ' + (root.getComputedStyle && root.body ? root.getComputedStyle(root.body).fontFamily : 'sans-serif');
    }
    ctx.font = fontBadge;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(rang), sx, sy + 1);
  }

  // mini-vue d'un circuit (cartes UI) : renvoie le dessin dans un canvas fourni
  function miniTrack(cvs, tr) {
    var w = cvs.width, h = cvs.height;
    var c = cvs.getContext('2d');
    c.clearRect(0, 0, w, h);
    var sp = tr.sp;
    var marge = tr.largeur / 2 + 40;
    var s = Math.min(w / (sp.xmax - sp.xmin + marge * 2), h / (sp.ymax - sp.ymin + marge * 2));
    var ox = w / 2 - s * (sp.xmin + sp.xmax) / 2;
    var oy = h / 2 - s * (sp.ymin + sp.ymax) / 2;
    c.fillStyle = tr.theme.fond;
    c.fillRect(0, 0, w, h);
    c.setTransform(s, 0, 0, s, ox, oy);
    var p = new root.Path2D();
    p.moveTo(sp.xs[0], sp.ys[0]);
    for (var i = 1; i < sp.n; i += 2) p.lineTo(sp.xs[i], sp.ys[i]);
    p.closePath();
    c.lineJoin = 'round';
    c.strokeStyle = tr.theme.bordure; c.lineWidth = tr.largeur + 22; c.stroke(p);
    if (tr.theme.pisteDegrade) {
      var g = c.createLinearGradient(sp.xmin, sp.ymin, sp.xmax, sp.ymax);
      var n = tr.theme.pisteDegrade.length;
      for (var j = 0; j < n; j++) g.addColorStop(j / (n - 1), tr.theme.pisteDegrade[j]);
      c.strokeStyle = g;
    } else c.strokeStyle = tr.theme.piste;
    c.lineWidth = tr.largeur; c.stroke(p);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  V.render = {
    init: init,
    resize: resize,
    prepare: prepare,
    frame: frame,
    miniTrack: miniTrack,
    particules: exploser,
    cam: cam,
    get ctx() { return ctx; },
    get track() { return track; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
