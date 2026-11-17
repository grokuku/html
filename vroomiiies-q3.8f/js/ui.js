/* Vroomiiies — interface : écrans (menu / réglages / pause / résultats / isolation),
   HUD de course, compte à rebours, flux championnat (multi-manches, élimination
   si > 7e) et libre. 100 % française. */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};
  var U = V.U, C = V.C;

  var el = {};
  var courant = 'menu';     // menu | reglages | course | resultats
  var modalOuverte = null;  // 'pause' | 'isolation'
  var championship = null;  // {trackIdx, points, manches:[{id,nom,rang}]}
  var hudAccum = 0;
  var compteHideT = null;

  function $(id) { return root.document.getElementById(id); }

  // ---------- init ----------
  function init() {
    var ids = ['hud', 'hud-pos', 'hud-score', 'hud-tour', 'hud-chrono', 'hud-reglages', 'hud-champ',
      'compte', 'compte-txt', 'ecran-menu', 'ecran-reglages', 'ecran-pause', 'ecran-resultats',
      'modal-isolation', 'circuits', 'sur-titre-circuit', 'onglets-difficulte', 'onglets-joueurs',
      'aide-joueurs', 'stepper-karts-valeur', 'stepper-tours-valeur', 'reglages-titre',
      'reglages-note', 'resultats-titre', 'resultats-record', 'classement',
      'resultats-progression', 'resultats-actions', 'canvas-course', 'menu-canvas',
      'btn-demarrer', 'bloc-2joueurs',
      'carrousel-perso', 'perso-avatar', 'perso-nom', 'perso-desc', 'perso-onglets', 'perso-hint',
      'btn-perso-prev', 'btn-perso-next'];
    for (var i = 0; i < ids.length; i++) el[ids[i]] = $(ids[i]);

    // menu
    $('btn-championnat').onclick = function () { ouvreglages('championnat'); };
    $('btn-libre').onclick = function () { ouvreglages('libre'); };
    $('lien-isolation').onclick = function (e) { e.preventDefault(); ouvrirModal('isolation'); };
    $('btn-son-menu').onclick = toggleSon;

    // réglages
    $('btn-retour').onclick = function () { montrer('menu'); };
    $('btn-son-reglages').onclick = toggleSon;
    $('btn-son-resultats').onclick = toggleSon;
    $('btn-demarrer').onclick = demarrer;
    wiresSteppers();
    wiresCarrousel();

    // pause
    $('btn-reprendre').onclick = function () { fermerPause(); };
    $('btn-son-pause').onclick = toggleSon;
    $('btn-recommencer').onclick = function () {
      fermerPause();
      V.race.recommencer();
    };
    $('btn-quitter').onclick = function () {
      modalOuverte = null; el['ecran-pause'].hidden = true;
      V.race.quitter();
      championship = null;
      montrer('menu');
    };
    el['hud-reglages'].onclick = function () { ouvrirModal('pause'); };

    // isolation
    $('btn-fermer-isolation').onclick = function () { ouvrirModal(null); };
    $('btn-reset').onclick = function () {
      V.store.clearAll();
      root.location.reload();
    };

    construireCartes();
    construireOnglets();
    majReglages();
    majSons();

    // actions clavier/manette
    V.input.onAction(traiterAction);

    // événements de course
    V.race.on(function (ev, data) {
      if (ev === 'countdown') afficherCompte(data);
      if (ev === 'finish') surFinish(data);
    });

    montrer('menu');
  }

  // ---------- écrans ----------
  function montrer(quoi) {
    courant = quoi;
    el['ecran-menu'].hidden = quoi !== 'menu';
    el['ecran-reglages'].hidden = quoi !== 'reglages';
    el['ecran-resultats'].hidden = quoi !== 'resultats';
    // la pause n'a de sens qu'en course : on la referme si on change d'écran
    if (quoi !== 'course' && modalOuverte === 'pause') {
      el['ecran-pause'].hidden = true;
      modalOuverte = null;
    }
    if (quoi === 'course') {
      el['canvas-course'].hidden = false;
      el['menu-canvas'].hidden = true;
      el['hud'].hidden = false;
    } else if (quoi === 'menu' || quoi === 'reglages') {
      el['menu-canvas'].hidden = false;
      el['hud'].hidden = true;
      // CRIT-3 : jamais d'image de course figée derrière le menu/réglages ;
      // une course terminée (« finie ») y est soldée proprement.
      el['canvas-course'].hidden = true;
      if (V.race.state === 'finie') V.race.quitter();
    } else if (quoi === 'resultats') {
      el['hud'].hidden = true;
      el['menu-canvas'].hidden = true;
      // on garde le canvas de course figé derrière les résultats
    }
    // musique : menu ↔ course ↔ podium (résultats), avec crossfade interne
    V.audio.setMode(quoi === 'course' ? 'race' : quoi === 'resultats' ? 'podium' : 'menu');
    // fond animé du menu
    if (V.menubg) V.menubg.actif = (quoi === 'menu' || quoi === 'reglages');
  }

  function ouvrirModal(quoi) {
    modalOuverte = quoi;
    el['ecran-pause'].hidden = quoi !== 'pause';
    el['modal-isolation'].hidden = quoi !== 'isolation';
    if (quoi === 'pause') {
      if (V.race.state === 'course' || V.race.state === 'compte') V.race.pause();
    }
  }
  function fermerPause() {
    modalOuverte = null;
    el['ecran-pause'].hidden = true;
    V.race.reprendre();
  }

  function traiterAction(a) {
    if (a === 'back') {
      if (modalOuverte === 'isolation') { ouvrirModal(null); return; }
      if (modalOuverte === 'pause') { fermerPause(); return; }
      if (courant === 'course') { ouvrirModal('pause'); return; }
      if (courant === 'reglages' || courant === 'resultats') { montrer('menu'); return; }
      return;
    }
    if (a === 'pause') {
      if (courant === 'course' && !modalOuverte) ouvrirModal('pause');
      else if (modalOuverte === 'pause') fermerPause();
      return;
    }
    if (a === 'confirm') {
      // évite le double-déclenchement si un bouton a le focus (le clic natif suit)
      var focus = root.document.activeElement;
      if (focus && focus.tagName === 'BUTTON') return;
      if (modalOuverte === 'isolation') { ouvrirModal(null); return; }
      if (modalOuverte === 'pause') { fermerPause(); return; }
      if (courant === 'menu') { ouvreglages('championnat'); return; }
      if (courant === 'reglages') { demarrer(); return; }
      if (courant === 'resultats') {
        var b = el['resultats-actions'].querySelector('button');
        if (b) b.click();
        return;
      }
    }
  }

  // ---------- son ----------
  function toggleSon() {
    V.audio.setSon(!V.audio.getSon());
    majSons();
  }
  function majSons() {
    var txt = V.audio.getSon() ? 'Son : activé' : 'Son : coupé';
    ['btn-son-menu', 'btn-son-reglages', 'btn-son-pause', 'btn-son-resultats'].forEach(function (id) {
      var b = $(id); if (b) b.textContent = txt;
    });
  }

  // ---------- réglages UI ----------
  var modeCourant = 'championnat';

  function ouvreglages(mode) {
    modeCourant = mode;
    if (mode === 'championnat' && !championship) {
      var reg = C.reglages();
      championship = { trackIdx: 0, points: 0, manches: [] };
      reg.track = 0;
    }
    el['reglages-titre'].textContent = mode === 'championnat' ? 'Championnat' : 'Course libre';
    el['reglages-note'].textContent = mode === 'championnat'
      ? 'Pour passer au circuit suivant : finir 7e ou mieux.'
      : 'Une seule course, pour le plaisir.';
    el['bloc-2joueurs'].hidden = mode !== 'libre';
    el['aide-joueurs'].textContent = 'Joueur 1 : flèches ou manette 1 · Joueur 2 : ZQSD ou WASD';
    majReglages();
    montrer('reglages');
  }

  function majReglages() {
    var reg = C.reglages();
    var enChamp = modeCourant === 'championnat' && championship;
    // circuits : la grille des 8 n'apparaît qu'en course libre (MINEUR-5) ;
    // en championnat, seule la carte du manche en cours reste visible, centrée.
    var cartes = el['circuits'].children;
    el['circuits'].className = 'grille-circuits' + (enChamp ? ' unique' : '');
    if (el['sur-titre-circuit']) el['sur-titre-circuit'].textContent = enChamp ? 'Manche en cours' : 'Circuit';
    for (var i = 0; i < cartes.length; i++) {
      var actif, masque;
      if (enChamp) {
        actif = (i === championship.trackIdx);
        masque = !actif;
        cartes[i].className = 'carte-circuit' + (actif ? ' active' : '') + (masque ? ' masquee' : '');
      } else {
        cartes[i].className = 'carte-circuit' + (i === reg.track ? ' active' : '');
      }
    }
    majRecords();
    majCarrousel();
    // difficulté
    var ong = el['onglets-difficulte'].children;
    for (var d = 0; d < ong.length; d++) ong[d].className = 'onglet' + (d === reg.diff ? ' actif' : '');
    // joueurs
    var ogj = el['onglets-joueurs'].children;
    for (var j = 0; j < ogj.length; j++) {
      var deux = j === 1;
      ogj[j].className = 'onglet' + (reg.deuxJoueurs === deux ? ' actif' : '');
    }
    el['stepper-karts-valeur'].textContent = String(C.KART_COUNTS[reg.karts]);
    el['stepper-tours-valeur'].textContent = String(C.TOUR_COUNTS[reg.tours]);
  }

  // ---------- MINEUR-1 : record affiché sur chaque carte circuit ----------
  function majRecords() {
    var records = V.store.get('records', {}) || {};
    var cartes = el['circuits'].children;
    var defs = V.tracks.lister();
    for (var i = 0; i < cartes.length && i < defs.length; i++) {
      var rec = cartes[i].querySelector('.record');
      if (!rec) continue;
      var ms = records[defs[i].id];
      rec.textContent = 'Record : ' + (ms ? U.fmtTime(ms) : '—');
    }
  }

  // ---------- MINEUR-5 : carrousel « Joueur N · Prénom » ----------
  var joueurCarrousel = 0; // joueur édité par le carrousel (0 ou 1)

  function wiresCarrousel() {
    $('btn-perso-prev').onclick = function () { deplacerCarrousel(-1); };
    $('btn-perso-next').onclick = function () { deplacerCarrousel(1); };
  }
  function clePerso() {
    var reg = C.reglages();
    return (modeCourant === 'libre' && reg.deuxJoueurs && joueurCarrousel === 1) ? 'perso2' : 'perso';
  }
  function deplacerCarrousel(pas) {
    var reg = C.reglages();
    var cle = clePerso();
    var n = C.PERSONNAGES.length;
    var idx = (reg[cle] + pas + n) % n;
    choisirPerso(idx);
  }
  function choisirPerso(idx) {
    var reg = C.reglages();
    var cle = clePerso();
    var autre = cle === 'perso' ? 'perso2' : 'perso';
    if (reg[autre] === idx) reg[autre] = (idx + 2) % C.PERSONNAGES.length;
    reg[cle] = idx;
    C.sauverReglages();
    majReglages();
    V.audio.sfx('clic');
  }
  function majCarrousel() {
    var reg = C.reglages();
    var cle = clePerso();
    if (reg[cle] == null) reg[cle] = 0;
    if (joueurCarrousel === 1 && !(modeCourant === 'libre' && reg.deuxJoueurs)) joueurCarrousel = 0;
    var idx = reg[cle];
    var perso = C.PERSONNAGES[idx];
    el['perso-nom'].textContent = 'Joueur ' + (joueurCarrousel + 1) + ' · ' + perso.nom;
    el['perso-desc'].textContent = perso.desc;
    el['perso-hint'].textContent = joueurCarrousel === 0 ? 'Flèches ou manette 1' : 'ZQSD / WASD';
    // avatar frais (V.draw.avatar renvoie un canvas)
    var box = el['perso-avatar'];
    box.textContent = '';
    try { box.appendChild(V.draw.avatar(perso.id, 72)); } catch (e) { /* avatar optionnel */ }
    // onglets J1/J2 : utiles seulement à deux
    var og = el['perso-onglets'];
    var montrerOnglets = modeCourant === 'libre' && reg.deuxJoueurs;
    og.hidden = !montrerOnglets;
    if (montrerOnglets && og.children.length !== 2) {
      og.textContent = '';
      for (var j = 0; j < 2; j++) {
        (function (jj) {
          var b = root.document.createElement('button');
          b.className = 'onglet';
          b.textContent = 'Joueur ' + (jj + 1);
          b.onclick = function () { joueurCarrousel = jj; majReglages(); };
          og.appendChild(b);
        })(j);
      }
    }
    for (var k = 0; k < og.children.length; k++) {
      og.children[k].className = 'onglet' + (k === joueurCarrousel ? ' actif' : '');
    }
  }

  function construireCartes() {
    var defs = V.tracks.lister();
    var frag = root.document.createDocumentFragment();
    for (var i = 0; i < defs.length; i++) {
      (function (idx) {
        var d = defs[idx];
        var c = root.document.createElement('div');
        c.className = 'carte-circuit';
        var cvv = root.document.createElement('canvas');
        cvv.width = 220; cvv.height = 120;
        var lbl = root.document.createElement('div');
        lbl.className = 'nom';
        lbl.textContent = d.nom;
        var rec = root.document.createElement('div');
        rec.className = 'record';
        rec.textContent = 'Record : —';
        c.appendChild(cvv); c.appendChild(lbl); c.appendChild(rec);
        try { V.render.miniTrack(cvv, V.tracks.build(idx)); } catch (e) { /* carte vide si souci */ }
        c.onclick = function () {
          if (modeCourant === 'championnat') return; // imposé
          C.reglages().track = idx;
          C.sauverReglages();
          majReglages();
          V.audio.sfx('clic');
        };
        frag.appendChild(c);
      })(i);
    }
    el['circuits'].appendChild(frag);
  }

  function construireOnglets() {
    var frag = root.document.createDocumentFragment();
    C.DIFFICULTES.forEach(function (d, idx) {
      var b = root.document.createElement('button');
      b.className = 'onglet';
      b.textContent = d.nom;
      b.title = d.desc;
      b.onclick = function () {
        C.reglages().diff = idx;
        C.sauverReglages();
        majReglages();
        V.audio.sfx('clic');
      };
      frag.appendChild(b);
    });
    el['onglets-difficulte'].appendChild(frag);

    var fragj = root.document.createDocumentFragment();
    [['1 joueur'], ['2 joueurs']].forEach(function (lib, idx) {
      var b = root.document.createElement('button');
      b.className = 'onglet';
      b.textContent = lib[0];
      b.onclick = function () {
        C.reglages().deuxJoueurs = idx === 1;
        C.sauverReglages();
        majReglages();
        V.audio.sfx('clic');
      };
      fragj.appendChild(b);
    });
    el['onglets-joueurs'].appendChild(fragj);
  }

  function wiresSteppers() {
    function stepper(idValeur, liste, cle) {
      var conteneur = $(idValeur).parentElement;
      var btns = conteneur.querySelectorAll('.btn-stepper');
      for (var i = 0; i < btns.length; i++) {
        btns[i].onclick = function (e) {
          var pas = parseInt(e.currentTarget.getAttribute('data-step'), 10);
          var reg = C.reglages();
          reg[cle] = U.clamp(reg[cle] + pas, 0, liste.length - 1);
          C.sauverReglages();
          majReglages();
          V.audio.sfx('clic');
        };
      }
    }
    stepper('stepper-karts-valeur', C.KART_COUNTS, 'karts');
    stepper('stepper-tours-valeur', C.TOUR_COUNTS, 'tours');
  }

  // ---------- démarrage de course ----------
  function demarrer() {
    var reg = C.reglages();
    var trackIdx = modeCourant === 'championnat' && championship ? championship.trackIdx : reg.track;
    var joueurs = [{ joueur: 0, persoIdx: reg.perso }];
    if (modeCourant === 'libre' && reg.deuxJoueurs) {
      joueurs.push({ joueur: 1, persoIdx: reg.perso2 });
    }
    var opts = {
      mode: modeCourant,
      trackIndex: trackIdx,
      tours: C.TOUR_COUNTS[reg.tours],
      nbKarts: C.KART_COUNTS[reg.karts],
      diffIdx: reg.diff,
      joueurs: joueurs
    };
    var track = V.tracks.build(trackIdx);
    V.render.prepare(track);
    V.race.start(opts);
    montrer('course');
  }

  // ---------- compte à rebours ----------
  function afficherCompte(txt) {
    var span = el['compte-txt'];
    span.textContent = txt;
    el['compte'].hidden = false;
    // relancer l'animation pop
    span.style.animation = 'none';
    void span.offsetWidth;
    span.style.animation = '';
    if (compteHideT) root.clearTimeout(compteHideT);
    compteHideT = root.setTimeout(function () { el['compte'].hidden = true; }, 780);
  }

  // ---------- résultats ----------
  function surFinish(data) {
    var cls = data.classement;
    var estChamp = modeCourant === 'championnat';
    var joueur = V.race.joueurKart;
    var j2 = V.race.joueur2Kart;
    var rangJ = joueur ? joueur.rang : (j2 ? j2.rang : 99);

    el['resultats-titre'].textContent = estChamp ? 'Manche terminée' : 'Résultats';
    el['resultats-record'].hidden = !data.record;
    majRecords(); // MINEUR-1 : les cartes intègrent le record qui vient de tomber

    // classement
    var liste = el['classement'];
    liste.textContent = '';
    var maxAff = Math.min(cls.length, 20);
    for (var i = 0; i < maxAff; i++) {
      var c = cls[i];
      var ligne = root.document.createElement('div');
      ligne.className = 'ligne-clt' + (c.kart.humain ? ' joueur' : '');
      var rang = root.document.createElement('span');
      rang.className = 'rang' + (c.rang <= 3 ? ' medaille' : '');
      rang.textContent = U.ordinal(c.rang);
      var spr = root.document.createElement('canvas');
      spr.width = 68; spr.height = 68;
      spr.getContext('2d').drawImage(V.draw.kartSprite(c.kart.charId), 0, 0, 68, 68);
      var nom = root.document.createElement('span');
      nom.className = 'nom';
      nom.textContent = V.draw.perso(c.kart.charId).nom + (c.kart.joueur === 0 ? ' (J1)' : c.kart.joueur === 1 ? ' (J2)' : '');
      var pts = root.document.createElement('span');
      pts.className = 'stat';
      pts.textContent = c.kart.stars + ' ★ · ' + c.total + ' pts';
      ligne.appendChild(rang); ligne.appendChild(spr); ligne.appendChild(nom); ligne.appendChild(pts);
      if (c.meilleurLap) {
        var ml = root.document.createElement('span');
        ml.className = 'stat';
        ml.textContent = U.fmtTime(c.meilleurLap);
        ligne.appendChild(ml);
      }
      liste.appendChild(ligne);
    }
    if (cls.length > maxAff) {
      var suite = root.document.createElement('p');
      suite.className = 'aide';
      suite.textContent = '… et ' + (cls.length - maxAff) + ' autres pilotes.';
      liste.appendChild(suite);
    }

    // progression / championnat
    var note = el['resultats-progression'];
    var actions = el['resultats-actions'];
    actions.textContent = '';
    note.hidden = false;

    if (estChamp && championship) {
      var jClt = cls[rangJ - 1];
      var ptsManche = jClt ? jClt.total : 0;
      championship.points += ptsManche;
      championship.manches.push({ nom: V.race.track.nom, rang: rangJ, pts: ptsManche });
      var nbCircuits = V.tracks.lister().length;
      var finChampionnat = championship.trackIdx + 1 >= nbCircuits;
      var passe = rangJ <= C.REGLE_PROGRESSION;
      if (passe && finChampionnat) {
        // AGRÉ-2 : fin de championnat — écran « Championnat remporté ! »
        el['resultats-titre'].textContent = 'Championnat remporté !';
        note.textContent = 'Les ' + nbCircuits + ' circuits sont joués ! Cumul final : ' + championship.points + ' points.';
        var detail = root.document.createElement('div');
        detail.className = 'manches-championnat';
        for (var m = 0; m < championship.manches.length; m++) {
          var mn = championship.manches[m];
          var lg = root.document.createElement('div');
          lg.className = 'ligne-clt';
          var rn = root.document.createElement('span');
          rn.className = 'rang';
          rn.textContent = U.ordinal(m + 1);
          var nm = root.document.createElement('span');
          nm.className = 'nom';
          nm.textContent = mn.nom;
          var rj = root.document.createElement('span');
          rj.className = 'stat';
          rj.textContent = U.ordinal(mn.rang);
          var pp = root.document.createElement('span');
          pp.className = 'stat';
          pp.textContent = '+' + mn.pts + ' pts';
          lg.appendChild(rn); lg.appendChild(nm); lg.appendChild(rj); lg.appendChild(pp);
          detail.appendChild(lg);
        }
        el['classement'].appendChild(detail);
        bouton(actions, 'btn-rose', 'Rejouer un championnat', function () {
          championship = { trackIdx: 0, points: 0, manches: [] };
          C.reglages().track = 0;
          C.sauverReglages();
          ouvreglages('championnat');
        });
        bouton(actions, 'btn-fantome', 'Menu', function () {
          championship = null;
          montrer('menu');
        });
      } else if (passe) {
        var suivant = (championship.trackIdx + 1) % nbCircuits;
        note.textContent = 'Bravo, ' + U.ordinal(rangJ) + ' ! Cumul championnat : ' + championship.points +
          ' pts (' + championship.manches.length + '/' + nbCircuits + ' manches). Direction : ' +
          V.tracks.lister()[suivant].nom + '.';
        bouton(actions, 'btn-rose', 'Circuit suivant', function () {
          championship.trackIdx = suivant;
          C.reglages().track = suivant;
          C.sauverReglages();
          ouvreglages('championnat');
        });
        bouton(actions, 'btn-fantome', 'Abandonner le championnat', function () {
          championship = null;
          montrer('menu');
        });
      } else {
        note.textContent = 'Éliminé… Pour passer au circuit suivant : finir 7e ou mieux. ' +
          'Cumul championnat : ' + championship.points + ' pts.';
        bouton(actions, 'btn-rose', 'Recommencer le championnat', function () {
          championship = { trackIdx: 0, points: 0, manches: [] };
          C.reglages().track = 0;
          C.sauverReglages();
          ouvreglages('championnat');
        });
        bouton(actions, 'btn-fantome', 'Retour au menu', function () {
          championship = null;
          montrer('menu');
        });
      }
    } else {
      note.textContent = 'Meilleur tour : ' + U.fmtTime((joueur && joueur.meilleurLap) || (j2 && j2.meilleurLap) || 0);
      bouton(actions, 'btn-rose', 'Rejouer', function () {
        V.render.prepare(V.race.track);
        V.race.recommencer();
        montrer('course');
      });
      bouton(actions, 'btn-bleu', 'Autre circuit', function () {
        V.race.quitter();
        montrer('reglages');
      });
      bouton(actions, 'btn-fantome', 'Menu', function () {
        V.race.quitter();
        montrer('menu');
      });
    }
    montrer('resultats');
    // re-masquer le HUD caché par montrer? results gère déjà
    el['canvas-course'].hidden = false;
  }

  function bouton(conteneur, cls, txt, cb) {
    var b = root.document.createElement('button');
    b.className = 'btn ' + cls;
    b.textContent = txt;
    b.onclick = cb;
    conteneur.appendChild(b);
  }

  // ---------- HUD ----------
  function majHud(dt) {
    if (V.race.state === 'idle') return;
    var pj = V.race.joueurKart || V.race.joueur2Kart;
    if (!pj) return;
    var n = V.race.karts.length;
    // race.temps est en SECONDES, fmtTime attend des millisecondes (CRIT-1)
    el['hud-chrono'].textContent = U.fmtTime(V.race.temps * 1000);
    hudAccum += dt;
    if (hudAccum < 0.1) return;
    hudAccum = 0;
    el['hud-pos'].textContent = U.ordinal(pj.rang) + ' / ' + n;
    var pts = 0, etoiles = 0;
    var joueurs = [V.race.joueurKart, V.race.joueur2Kart];
    for (var i = 0; i < 2; i++) if (joueurs[i]) { pts += joueurs[i].pts; etoiles += joueurs[i].stars; }
    el['hud-score'].textContent = etoiles + ' ★ ' + pts + ' pts';
    // AGRÉ-2 : cumul de points du championnat visible pendant les manches
    var enChamp = championship && modeCourant === 'championnat' && V.race.mode === 'championnat';
    el['hud-champ'].hidden = !enChamp;
    if (enChamp) el['hud-champ'].textContent = 'Championnat : ' + championship.points + ' pts';
    var tour = Math.min(pj.lap + 1, V.race.tours);
    el['hud-tour'].textContent = tour + '/' + V.race.tours;
  }

  V.ui = {
    init: init,
    majHud: majHud,
    get current() { return courant; },
    montrer: montrer
  };
})(typeof window !== 'undefined' ? window : globalThis);
