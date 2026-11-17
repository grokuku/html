/* Vroomiiies — physique arcade scalaire.
   pos + heading + speed ; steering modulé par la vitesse ; hors-piste = ralentissement
   (kart.off 0..1) ; collisions kart-kart O(n²) AVEC garde pont : si les directions
   divergent (cos < seuil), on ne collide pas — on passe « sur » le pont. */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};
  var U = V.U, P = V.C.PHYSIQUE;

  // épure d'input réutilisée (zéro allocation)
  var entree = { gauche: false, droite: false, gas: false, frein: false };

  // marqueurs de collision (lus par race après chaque step)
  var chocJoueur = 0; // nb de chocs impliquant un kart humain ce pas

  function creerKart(track, slot, charId, humain, joueurIdx) {
    var g = { x: 0, y: 0, heading: 0, sHint: 0 };
    V.tracks.grilleSlot(track, slot, g);
    var perso = V.draw.perso(charId);
    var k = {
      charId: charId,
      stats: perso.stats,
      humain: !!humain,
      joueur: joueurIdx == null ? -1 : joueurIdx,
      x: g.x, y: g.y,
      heading: g.heading,
      speed: 0,
      sIdx: g.sHint,
      s: 0, off: 0,
      lap: 0, qmask: 0, aCroise: false,
      padCd: 0, // rearm des zones d'accélération (AGRÉ-1)
      rang: 0,
      stars: 0, pts: 0,
      boostT: 0,
      finished: false, finishT: 0, finishRang: 0,
      lapStart: 0, meilleurLap: 0,
      // IA
      ia: false, facteur: 1, lookahead: 55, lane: 0, laneCible: 0, eviteT: 0
    };
    return k;
  }

  // step d'un kart ; inp = {gauche, droite, gas, frein} (ou null = Liberté zéro)
  function stepKart(k, inp, track, dt) {
    var st = k.stats;
    var vmax = st.vmax;
    if (k.boostT > 0) {
      k.boostT -= dt;
      vmax *= P.PASSAGE_FACTEUR;
    }
    vmax *= (1 - k.off * (1 - P.HORS_VMAX)); // hors-piste => plafonné

    var accel = st.accel;
    if (inp && inp.gas) {
      k.speed += accel * dt * Math.max(0.12, 1 - k.speed / vmax);
      if (k.speed > vmax) k.speed = vmax;
    } else if (inp && inp.frein) {
      k.speed -= P.FREIN * dt;
      if (k.speed < 0) k.speed = 0;
    } else {
      k.speed -= (P.TRAINER + k.off * P.HORS_TRAINE) * dt;
      if (k.speed < 0) k.speed = 0;
    }
    // sous l'effet du boost, on recolle pas sous le boost instantané
    if (k.speed < 0) k.speed = 0;

    // braquage : efficace dès qu'on roule, un peu plus braqueur à basse vitesse
    var braquage = 0;
    if (inp) braquage = (inp.droite ? 1 : 0) - (inp.gauche ? 1 : 0);
    var vitesseRel = Math.min(1, k.speed / 55);
    var tournee = 0.55 + 0.5 * (1 - Math.min(1, k.speed / (st.vmax * 1.1)));
    tournee *= 1 + k.off * (P.HORS_BRAQUAGE - 1); // hors piste : plus de braquage pour revenir
    k.heading += braquage * P.VIRAGE * st.grip * tournee * vitesseRel * dt;

    k.x += Math.cos(k.heading) * k.speed * dt;
    k.y += Math.sin(k.heading) * k.speed * dt;

    // pointé piste en fenêtre locale (hint) — piège du huit
    var idx = V.spline.nearest(track.sp, k.x, k.y, k.sIdx);
    k.prevSIdx = k.sIdx;
    k.sIdx = idx;
    k.s = idx * track.sp.step;

    // facteur hors-piste lissé
    var dx = k.x - track.sp.xs[idx], dy = k.y - track.sp.ys[idx];
    var d = Math.sqrt(dx * dx + dy * dy);
    var cible = U.clamp((d - (track.demi + P.R_KART * 0.45)) / 55, 0, 1);
    k.off = U.damp(k.off, cible, 7, dt);
  }

  // collisions kart-kart : cercles O(n²), garde pont (directions divergentes)
  var COS_PONT = P.ANGLE_COLISION;
  function collider(karts) {
    var R = P.R_KART, minD = R * 2 - 2; // léger chevauchement toléré
    chocJoueur = 0;
    var n = karts.length;
    for (var i = 0; i < n; i++) {
      var a = karts[i];
      for (var j = i + 1; j < n; j++) {
        var b = karts[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var d2 = dx * dx + dy * dy;
        if (d2 >= minD * minD || d2 < 1e-6) continue;
        // garde pont : directions quasi opposées/perpendiculaires => on se traverse
        var dot = Math.cos(a.heading) * Math.cos(b.heading) + Math.sin(a.heading) * Math.sin(b.heading);
        if (dot < COS_PONT) continue;
        var d = Math.sqrt(d2);
        var nx = dx / d, ny = dy / d;
        var rec = (minD - d) * 0.5;
        a.x -= nx * rec; a.y -= ny * rec;
        b.x += nx * rec; b.y += ny * rec;
        // échange arcade : on ralentit un peu des deux
        var mol = 1 - Math.min(0.18, (a.speed + b.speed) * 0.0004);
        a.speed *= mol; b.speed *= mol;
        if (a.humain || b.humain) chocJoueur++;
      }
    }
  }

  V.physics = {
    creerKart: creerKart,
    stepKart: stepKart,
    collider: collider,
    entree: entree,
    get chocJoueur() { return chocJoueur; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
