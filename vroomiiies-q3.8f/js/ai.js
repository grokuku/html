/* Vroomiiies — IA : suivi de spline en look-ahead (cible = at(s+lookahead) +
   normale × lane), vitesse cible = vmax × f(courbure) × facteur difficulté,
   évitement latéral simple des karts proches devant. */
(function (root) {
   'use strict';
  var V = root.V = root.V || {};
  var U = V.U;

  var _p = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0, curv: 0, s: 0 };
  var _q = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0, curv: 0, s: 0 };

  // prépare les paramètres d'une IA (rng = seeded du race)
  function preparer(kart, defDiff, rng) {
    kart.ia = true;
    kart.facteur = defDiff.facteur * (0.88 + rng() * 0.16);
    kart.lookahead = defDiff.lookahead + rng() * 18;
    kart.lane = (rng() - 0.5) * 30;
    kart.evite = 0;
    kart.iaGraine = rng();
  }

  // remplit out ({gauche,droite,gas,frein}) pour ce kart
  function piloter(kart, track, karts, out) {
    var sp = track.sp;

    // lookahead ; hors-piste : on recible le point le plus proche pour revenir
    var la = kart.lookahead + kart.speed * 0.16;
    if (kart.off > 0.35) la = Math.min(la, 34);

    // point visé + tangente locale pour anticiper la courbure
    V.spline.at(sp, kart.s + la, _p);
    V.spline.at(sp, kart.s + Math.max(24, la * 0.4), _q);

    // courbure ressentie sur les prochaines unités
    var courb = Math.abs(_q.curv);
    if (Math.abs(_p.curv) > courb) courb = Math.abs(_p.curv);
    var coefCourb = U.clamp(1 - courb * 210, 0.55, 1);

    // --- évitement latéral simple ---
    var evite = 0;
    var hx = Math.cos(kart.heading), hy = Math.sin(kart.heading);
    for (var i = 0; i < karts.length; i++) {
      var a = karts[i];
      if (a === kart) continue;
      var dx = a.x - kart.x, dy = a.y - kart.y;
      var devant = dx * hx + dy * hy;
      if (devant < 8 || devant > 95) continue;
      var lateral = dx * -hy + dy * hx;
      if (Math.abs(lateral) > 26) continue;
      var pousse = (1 - devant / 95) * (1 - Math.abs(lateral) / 26);
      var cote = lateral >= 0 ? -1 : 1; // on s'écarte du kart
      if (Math.abs(evite) < Math.abs(pousse * 34 * cote)) evite = pousse * 34 * cote;
    }
    kart.evite = U.damp(kart.evite, evite, 5, 1 / 60);

    var lane = kart.lane * 0.6 + kart.evite;
    if (kart.off > 0.35) lane = 0;
    var tx = _p.x + _p.nx * lane;
    var ty = _p.y + _p.ny * lane;

    // --- braquage ---
    var err = U.wrapAngle(Math.atan2(ty - kart.y, tx - kart.x) - kart.heading);
    var steer = U.clamp(Math.sin(err) * 2.4, -1, 1);
    out.gauche = steer < -0.14;
    out.droite = steer > 0.14;

    // --- gaz / frein ---
    // AGRÉ-3 : plafond = vmax du personnage de l'IA (et non une valeur absolue) ×
    // facteur difficulté borné : Expert égale le joueur le plus rapide en ligne droite
    // mais ne le dépasse jamais ; Facile/Normal restent battables à la régularité.
    var plafond = kart.stats ? kart.stats.vmax : 305;
    var vmaxPiste = plafond * coefCourb * U.clamp(kart.facteur, 0.6, 1.0);
    if (kart.boostT > 0) vmaxPiste = Math.min(plafond * 1.22, vmaxPiste * 1.12);
    if (kart.speed > vmaxPiste * 1.12) {
      out.gas = false;
      out.frein = kart.speed > vmaxPiste * 1.3;
    } else {
      out.gas = true;
      out.frein = false;
    }
    return out;
  }

  V.ai = { preparer: preparer, piloter: piloter };
})(typeof window !== 'undefined' ? window : globalThis);
