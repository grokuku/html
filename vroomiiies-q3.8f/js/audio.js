/* Vroomiiies — audio : AudioContext + unlock au premier geste, bus music/sfx,
   séquenceur lookahead (setInterval 25 ms). Trois thèmes 100 % synthétisés :
   menu = valse douce au kalimba (3/4), course = pop qui monte en intensité
   (mélodie / basse marcheuse / balais / arpèges et carillon aux paliers hauts),
   podium = fanfare de carillon. Crossfade menu↔course↔podium (bascule silencieuse
   à la mesure). Nettoyage des oscillateurs via onended. SFX : choc, clic,
   paslage, pick, fanfare. setSon persistant. */
(function (root) {
  'use strict';
  var V = root.V = root.V || {};

  var ctx = null, master = null, busMusic = null, busSfx = null;
  var sonOn = true;
  try { sonOn = V.store.get('son', true) !== false; } catch (e) {}

  var mode = null;            // 'menu' | 'race' | 'podium' | null
  var pending = null;         // mode visé pendant un crossfade
  var bascule = 0;            // horloge de bascule du crossfade
  var intensite = 0.5;
  var step = 0;
  var nextTime = 0;
  var timer = null;
  var pret = false;

  var VOL_BUS = 0.42;

  // ---------- création du graphe ----------
  function garantir() {
    if (ctx) return true;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain();
    master.gain.value = sonOn ? 0.5 : 0;
    master.connect(ctx.destination);
    busMusic = ctx.createGain(); busMusic.gain.value = VOL_BUS; busMusic.connect(master);
    busSfx = ctx.createGain(); busSfx.gain.value = 0.8; busSfx.connect(master);
    return true;
  }

  function premieGeste() {
    if (pret) return;
    pret = garantir();
    if (pret && ctx.state === 'suspended') ctx.resume();
    if (pret && mode) demarrerSequenceur();
  }
  function init() {
    root.addEventListener('pointerdown', premieGeste);
    root.addEventListener('keydown', premieGeste);
    // MINEUR-2 : la reprise d'activité de l'onglet doit réveiller le graphe si l'audio est actif
    root.document.addEventListener('visibilitychange', function () {
      if (!root.document.hidden && pret && sonOn && ctx.state === 'suspended') ctx.resume();
    });
  }

  // ---------- instruments ----------
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  // cleanup : débranche gain + source dès que l'oscillateur est fini
  function branche(o, g, t0, duree) {
    o.connect(g);
    o.start(t0); o.stop(t0 + duree + 0.02);
    o.onended = function () {
      try { g.disconnect(); } catch (e) {}
      try { o.disconnect(); } catch (e) {}
      o.onended = null;
    };
  }

  function tonal(freq, t0, duree, type, bus, vol, glide) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * glide), t0 + duree);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
    branche(o, g, t0, duree);
    g.connect(bus);
  }

  // kalimba : fondamentale sine + partielle douce, attaque rapide, decay long
  function kalimba(freq, t0, vol, bus, duree) {
    duree = duree || 0.55;
    var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.72;
    var g = ctx.createGain(); var g2 = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.exponentialRampToValueAtTime(vol * 0.28, t0 + 0.004);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + duree * 0.4);
    o.connect(g); o2.connect(g2);
    branche(o, g, t0, duree); branche(o2, g2, t0, duree * 0.4);
    g.connect(bus); g2.connect(bus);
  }

  // carillon / glockenspiel : deux partiels inharmoniques, filature brillante
  function carillon(freq, t0, vol, bus, duree) {
    duree = duree || 0.8;
    var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    var o3 = ctx.createOscillator(); o3.type = 'sine'; o3.frequency.value = freq * 3.01;
    var o5 = ctx.createOscillator(); o5.type = 'sine'; o5.frequency.value = freq * 5.07;
    var g = ctx.createGain(); var g3 = ctx.createGain(); var g5 = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
    g3.gain.setValueAtTime(0.0001, t0);
    g3.gain.exponentialRampToValueAtTime(vol * 0.4, t0 + 0.003);
    g3.gain.exponentialRampToValueAtTime(0.0001, t0 + duree * 0.5);
    g5.gain.setValueAtTime(0.0001, t0);
    g5.gain.exponentialRampToValueAtTime(vol * 0.16, t0 + 0.002);
    g5.gain.exponentialRampToValueAtTime(0.0001, t0 + duree * 0.22);
    o.connect(g); o3.connect(g3); o5.connect(g5);
    branche(o, g, t0, duree); branche(o3, g3, t0, duree * 0.5); branche(o5, g5, t0, duree * 0.22);
    g.connect(bus); g3.connect(bus); g5.connect(bus);
  }

  // basse marcheuse : sine ronde avec léger corps triangle
  function basseMarshe(freq, t0, duree, vol) {
    tonal(freq, t0, duree, 'sine', busMusic, vol);
    tonal(freq, t0, duree * 0.6, 'triangle', busMusic, vol * 0.35);
  }

  var bruitBuf = null;
  function bruit() {
    if (bruitBuf) return bruitBuf;
    var len = Math.floor(ctx.sampleRate * 0.4);
    bruitBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = bruitBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return bruitBuf;
  }
  function noise(t0, duree, f0, f1, vol, bus, q, attaque) {
    var src = ctx.createBufferSource();
    src.buffer = bruit();
    var f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = q || 1.2;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + duree);
    var g = ctx.createGain();
    if (attaque) { // montée douce (balais / cymbale)
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + duree * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
    } else {
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
    }
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t0); src.stop(t0 + duree + 0.02);
    src.onended = function () {
      try { g.disconnect(); f.disconnect(); src.disconnect(); } catch (e) {}
      src.onended = null;
    };
  }
  // balais : bruit aigu brossé, attaque étalée
  function balai(t0, duree, vol, accent) {
    noise(t0, duree, accent ? 7200 : 5200, accent ? 3600 : 2600, vol, busMusic, 0.9, true);
  }
  function cymbale(t0, vol) {
    noise(t0, 0.9, 3000, 6500, vol, busMusic, 0.4, true);
  }

  // triades diatoniques par classe de hauteur (relatives à do)
  var TIERCES = { 0: [0, 4, 7], 7: [0, 4, 7], 5: [0, 4, 7], 2: [0, 3, 7], 4: [0, 3, 7], 9: [0, 3, 7] };
  function arpere(rootMidi, t0, vol, inverse) {
    var tier = TIERCES[rootMidi % 12] || [0, 4, 7];
    var i = inverse ? 2 : 0;
    kalimba(midi(rootMidi + 12 + tier[inverse ? ((i + 1) % 3) : i]), t0, vol, busMusic, 0.35);
  }

  // ---------- thèmes ----------
  // menu : valse 3/4 au kalimba — pas = croche, 6 pas par mesure, 6 mesures
  var MENU = {
    bpm: 104,
    mel: [
      76, 0, 79, 84, 0, 0,
      81, 79, 76, 79, 0, 0,
      79, 0, 76, 72, 74, 76,
      74, 0, 0, 67, 0, 0,
      76, 0, 79, 84, 86, 84,
      81, 79, 79, 79, 0, 0
    ],
    basses: [48, 55, 57, 53, 48, 55],  // fondamentale par mesure (do sol la min fa do sol)
    bat: 6
  };
  // course : pop 4/4, pas = croche, 8 pas par mesure, 4 mesures ; l'intensité
  // ajoute des couches (tempo, arpèges, carillon) et pousse le volume
  var RACE = {
    bpm: 148,
    mel: [72, 76, 79, 76, 81, 79, 76, 72, 74, 77, 81, 77, 83, 81, 77, 74,
          76, 79, 84, 79, 72, 79, 81, 84, 86, 84, 81, 79, 76, 79, 72, 0],
    basse: [48, 48, 55, 48, 45, 45, 53, 45, 45, 45, 52, 45, 43, 43, 55, 43],
    bat: 8
  };
  // podium : fanfare de carillon, 4/4 lent, 4 mesures + pointe finale
  var PODIUM = {
    bpm: 100,
    mel: [
      79, 0, 79, 0, 84, 0, 0, 0,
      86, 84, 79, 81, 84, 0, 0, 0,
      79, 0, 76, 79, 81, 0, 79, 0,
      72, 0, 79, 0, 84, 0, 88, 0
    ],
    basses: [48, 55, 53, 48],
    bat: 8
  };

  function theme(m) { return m === 'race' ? RACE : m === 'podium' ? PODIUM : MENU; }

  function pasSec() {
    var p = theme(mode);
    var bpm = p.bpm * (mode === 'race' ? (0.95 + intensite * 0.12) : 1);
    return 60 / bpm / 2; // croches
  }

  // ---------- séquenceur ----------
  function scheduler() {
    if (!pret || !mode || !sonOn) return;

    // MINEUR-2 : retour d'onglet throttlé → ne pas rattraper le retard note par note
    // (blast d'oscillateurs) : on recale le curseur et on repart proprement.
    if (nextTime < ctx.currentTime - 0.25) {
      nextTime = ctx.currentTime + 0.05;
      if (root.console && root.console.info) root.console.info('vroomiies audio : clamp séquenceur (retour d’onglet throttlé)');
    }

    // bascule du crossfade une fois le bus descendu au silence
    if (pending && ctx.currentTime >= bascule) {
      mode = pending; pending = null;
      step = 0;
      nextTime = Math.max(nextTime, ctx.currentTime + 0.05);
      busMusic.gain.cancelScheduledValues(ctx.currentTime);
      busMusic.gain.setValueAtTime(0.0001, ctx.currentTime);
      busMusic.gain.linearRampToValueAtTime(VOL_BUS, ctx.currentTime + 0.5);
    }

    var p = theme(mode);
    var lookahead = 0.12;
    while (nextTime < ctx.currentTime + lookahead) {
      // ne pas écrire de note pendant la descente du crossfade
      var silencieux = pending && ctx.currentTime >= bascule - 0.35;
      var i = step % p.mel.length;
      var dt = pasSec();
      var t = nextTime;
      var mes = Math.floor(i / p.bat);
      var tempsMes = i % p.bat;
      if (!silencieux) {
        var n = p.mel[i];
        if (n) {
          if (mode === 'menu') {
            kalimba(midi(n), t, 0.13 + (tempsMes === 0 ? 0.05 : 0), busMusic, dt * 2.4);
            // triolets d'accompagnement discret (sauf première mesure)
            if (mes > 0) arpere(p.basses[mes], t, 0.035, tempsMes === 2);
            if (tempsMes === 2 || tempsMes === 4) balai(t, 0.05, tempsMes === 2 ? 0.030 : 0.018, tempsMes === 2);
          } else if (mode === 'podium') {
            carillon(midi(n), t, 0.12, busMusic, dt * 3.2);
            kalimba(midi(n - 12), t, 0.045, busMusic, dt * 1.6);
            if (tempsMes === 2 || tempsMes === 4) balai(t, 0.06, 0.022, tempsMes === 2);
          } else { // race
            var volM = 0.15 + intensite * 0.11;
            tonal(midi(n), t, dt * 0.9, 'triangle', busMusic, volM);
            if (i % 4 === 0) tonal(midi(n + 12), t + dt * 0.5, dt * 0.4, 'triangle', busMusic, 0.03 + intensite * 0.05);
            // couches d'intensité : arpèges de croches, puis carillon
            if (intensite > 0.5 && n) {
              var rac = p.basse[Math.floor(i / 2) % p.basse.length];
              kalimba(midi(rac + 12 + (TIERCES[rac % 12] || [0, 4, 7])[i % 3] + (i % 4 === 2 ? 12 : 0)),
                      t + dt * 0.5, 0.028 + (intensite - 0.5) * 0.05, busMusic, dt * 0.5);
            }
            if (intensite > 0.75 && i % 8 === 6) carillon(midi(n + 12), t + dt * 0.5, 0.05, busMusic, 0.5);
            // balais : croches brossées, accent sur les temps forts
            balai(t, 0.045, tempsMes % 4 === 0 ? 0.034 : 0.016, tempsMes % 4 === 0);
            balai(t + dt * 0.5, 0.035, 0.012, false);
          }
        }
        if (mode === 'race') {
          // basse marcheuse : une noire, fondamentale qui avance à la mesures
          if (tempsMes % 2 === 0) {
            var rb = p.basse[Math.floor(i / 2) % p.basse.length];
            if (rb) basseMarshe(midi(rb), t, dt * 1.6, tempsMes === 0 ? 0.21 : 0.15);
          }
        } else {
          var b = p.basses[mes];
          if (b && tempsMes === 0) basseMarshe(midi(b), t, dt * 2.6, 0.16);
        }
        if (mode === 'podium' && i === 0) cymbale(t, 0.05);
        if (mode !== 'menu' && i % 8 === 0) tonal(90, t, 0.09, 'sine', busMusic, 0.12, 0.45); // kick doux
        if (mode === 'menu' && mes === 0) balai(t, 0.05, 0.02, true);
      }
      step++;
      nextTime += dt;
    }
  }

  function demarrerSequenceur() {
    if (timer || !pret || !sonOn) return;
    step = 0;
    nextTime = ctx.currentTime + 0.06;
    timer = root.setInterval(scheduler, 25);
  }
  function arreterSequenceur() {
    if (timer) { root.clearInterval(timer); timer = null; }
  }

  // ---------- API ----------
  var audio = {
    init: init,
    setSon: function (on) {
      sonOn = !!on;
      V.store.set('son', sonOn);
      if (!garantir()) return;
      master.gain.value = sonOn ? 0.5 : 0;
      if (sonOn && mode) demarrerSequenceur();
      if (!sonOn) arreterSequenceur();
    },
    getSon: function () { return sonOn; },
    setMode: function (m) {
      m = m || null;
      if (m === mode || m === pending) return;
      if (!mode || !pret || !sonOn) { // premier thème ou audio muet : bascule sèche
        mode = m; pending = null;
        arreterSequenceur();
        if (mode && pret && sonOn) {
          busMusic.gain.cancelScheduledValues(ctx.currentTime);
          busMusic.gain.value = VOL_BUS;
          demarrerSequenceur();
        }
        return;
      }
      // crossfade : on descend le bus, le séquenceur basculera au silence
      pending = m;
      bascule = ctx.currentTime + 0.35;
      busMusic.gain.cancelScheduledValues(ctx.currentTime);
      busMusic.gain.setValueAtTime(busMusic.gain.value, ctx.currentTime);
      busMusic.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.34);
    },
    setIntensite: function (x) { intensite = Math.max(0, Math.min(1, x)); },
    // petit œil de test (clamp du séquenceur au retour d'onglet) — pas utilisé par le jeu
    _seq: {
      get next() { return nextTime; },
      set next(v) { nextTime = v; },
      get cur() { return ctx ? ctx.currentTime : 0; }
    },
    sfx: function (nom) {
      if (!pret || !sonOn) return;
      if (ctx.state === 'suspended') { ctx.resume(); }
      var t = ctx.currentTime + 0.001;
      if (nom === 'clic') {
        tonal(880, t, 0.05, 'square', busSfx, 0.05);
        tonal(1320, t + 0.03, 0.05, 'square', busSfx, 0.04);
      } else if (nom === 'choc') {
        noise(t, 0.12, 900, 180, 0.4, busSfx, 0.9);
        tonal(160, t, 0.14, 'sine', busSfx, 0.3, 0.4);
      } else if (nom === 'paslage') {
        noise(t, 0.35, 350, 2400, 0.18, busSfx, 1.6);
      } else if (nom === 'pick') {
        kalimba(midi(99), t, 0.18, busSfx, 0.3);
        kalimba(midi(103), t + 0.07, 0.16, busSfx, 0.4);
      } else if (nom === 'fanfare') {
        var notes = [72, 76, 79, 84];
        for (var i = 0; i < notes.length; i++) {
          carillon(midi(notes[i]), t + i * 0.11, 0.14, busSfx, 0.5);
          tonal(midi(notes[i] - 12), t + i * 0.11, 0.12, 'triangle', busSfx, 0.1);
        }
        carillon(midi(84), t + 0.44, 0.15, busSfx, 1.1);
        carillon(midi(88), t + 0.44, 0.09, busSfx, 1.0);
        carillon(midi(79), t + 0.44, 0.07, busSfx, 0.9);
        tonal(midi(60), t + 0.44, 0.6, 'triangle', busSfx, 0.12);
      }
    }
  };

  V.audio = audio;
})(typeof window !== 'undefined' ? window : globalThis);
