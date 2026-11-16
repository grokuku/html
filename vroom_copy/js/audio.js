/* ============================================================
   VROOMIIIES — audio.js
   Web Audio API : SFX + moteur + musique.
   Init paresseux au 1er geste. Son persisté dans options.son.
   Le toggle Son coupe TOUT (moteur, sfx, musiques, jingles).
   =============================================================== */
'use strict';

const AudioSys = (function () {
  let ctx = null;
  let master = null;
  let engineOsc = null, engineGain = null, engineFilter = null;
  let engineVibrato = null, engineVibratoGain = null;
  let noiseBuf = null;

  /* musique */
  let musicBus = null;
  let musicTimer = null;
  let musicStep = 0;
  let musicNextTime = 0;
  let musicDesired = null;   // mode voulu ('menu' | 'race'), même si inaudible (pas encore de geste)
  let musicCurrent = null;   // mode réellement schedulé
  let jinglePending = false; // jingle titre en attente d'un contexte actif

  let enabled = true;

  const midiToFreq = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  /* ---------- motifs musicaux (croches, 0 = silence) ---------- */
  const MUSIC = {
    menu: { bpm: 92, wave: 'triangle', vol: 0.055,
      steps: [72, 0, 76, 0, 79, 0, 76, 0,  81, 0, 79, 0, 76, 0, 74, 0] },
    race: { bpm: 126, wave: 'square', vol: 0.038,
      steps: [76, 0, 76, 79, 76, 0, 72, 74,  76, 0, 76, 79, 84, 0, 79, 0] }
  };

  function init() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = enabled ? 0.5 : 0;
      master.connect(ctx.destination);
      return true;
    } catch (e) {
      console.warn('[audio] AudioContext indisponible', e);
      ctx = null;
      return false;
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
  }

  /* À appeler à chaque geste utilisateur (main.js le branche) :
     débloque le contexte et démarre la musique en attente. */
  function onGesture() {
    if (!init()) return;
    const kick = function () {
      if (ctx && ctx.state === 'running') ensureMusic();
    };
    if (ctx.state === 'running') { kick(); return; }
    ctx.resume().then(kick).catch(function () {});
  }

  function setEnabled(on) {
    enabled = !!on;
    if (master && ctx) master.gain.setTargetAtTime(enabled ? 0.5 : 0, ctx.currentTime, 0.02);
    if (engineGain && ctx) {
      if (!enabled) engineGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
    }
    if (enabled) ensureMusic();
    /* si coupé : le master à 0 rend la musique inaudible ; on laisse
       le scheduler tourner (négligeable) mais on coupe le bus pour la CPU */
    if (!enabled) stopMusicTimer();
  }
  function isEnabled() { return enabled; }

  /* ---------- note générique ---------- */
  function playNote(freq, t0, dur, type, vol, dest) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.015);
    g.gain.setValueAtTime(Math.max(0.0002, vol), t0 + Math.max(0.02, dur - 0.06));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  function getNoiseBuffer(dur) {
    if (noiseBuf && noiseBuf.duration >= dur) return noiseBuf;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    return noiseBuf;
  }

  /* ---------- Bip générique ---------- */
  function beep(freq, dur, type, vol, when) {
    if (!init()) return;
    resume();
    if (!enabled) return;
    dur = dur || 0.12; type = type || 'square'; vol = vol || 0.5; when = when || 0;
    playNote(freq, ctx.currentTime + when, dur, type, vol, master);
  }

  /* ---------- SFX ---------- */
  const SFX = {
    click:     function () { beep(660, 0.06, 'square', 0.25); },
    count:     function () { beep(440, 0.18, 'square', 0.5); },
    go:        function () { beep(880, 0.5, 'square', 0.6); beep(1174, 0.4, 'square', 0.35, 0.08); },
    collision: function () { beep(140, 0.12, 'sawtooth', 0.4); beep(90, 0.1, 'square', 0.25, 0.02); },
    lap:       function () {
      beep(523, 0.14, 'triangle', 0.5);
      beep(659, 0.14, 'triangle', 0.5, 0.12);
      beep(784, 0.22, 'triangle', 0.5, 0.24);
    },
    /* Turbo : balayage montant bruit + triangle 300→900 Hz (~0.5 s) */
    turbo: function () {
      if (!init()) return;
      resume();
      if (!enabled) return;
      const t0 = ctx.currentTime, dur = 0.5;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(300, t0);
      o.frequency.exponentialRampToValueAtTime(900, t0 + dur * 0.9);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.exponentialRampToValueAtTime(0.5, t0 + 0.05);
      og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(og); og.connect(master);
      o.start(t0); o.stop(t0 + dur + 0.02);
      /* souffle de bruit filtré, balayage vers le haut */
      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(dur);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(380, t0);
      bp.frequency.exponentialRampToValueAtTime(2300, t0 + dur);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t0);
      ng.gain.exponentialRampToValueAtTime(0.32, t0 + 0.06);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bp); bp.connect(ng); ng.connect(master);
      src.start(t0); src.stop(t0 + dur + 0.02);
    },
    /* Mini-turbo : petit « poing » grave + swoosh aigu */
    miniTurbo: function () {
      if (!init()) return;
      resume();
      if (!enabled) return;
      const t0 = ctx.currentTime;
      /* poing : sinus grave qui chute */
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(165, t0);
      o.frequency.exponentialRampToValueAtTime(68, t0 + 0.14);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.55, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + 0.2);
      /* swoosh : triangle montant, très court */
      const o2 = ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(480, t0 + 0.05);
      o2.frequency.exponentialRampToValueAtTime(780, t0 + 0.22);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t0 + 0.05);
      g2.gain.exponentialRampToValueAtTime(0.28, t0 + 0.08);
      g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
      o2.connect(g2); g2.connect(master);
      o2.start(t0 + 0.05); o2.stop(t0 + 0.3);
    }
  };

  /* ---------- Fanfare de fin de course (6 notes) ---------- */
  function fanfare() {
    if (!init()) return;
    resume();
    if (!enabled) return;
    const notes = [72, 76, 79, 84, 88, 91];        // C5 E5 G5 C6 E6 G6
    const durs  = [0.16, 0.16, 0.16, 0.22, 0.22, 0.55];
    const gaps  = [0, 0.15, 0.30, 0.46, 0.66, 0.88];
    const t0 = ctx.currentTime + 0.05;
    for (let i = 0; i < notes.length; i++) {
      const type = i < 3 ? 'square' : 'triangle';
      const vol = i < 3 ? 0.32 : 0.4;
      playNote(midiToFreq(notes[i]), t0 + gaps[i], durs[i], type, vol, master);
    }
  }

  /* ---------- Jingle titre (4 notes, une fois par affichage) ---------- */
  function jingleTitle() {
    jinglePending = true;
    ensureMusic();
  }
  function playJingle() {
    if (!ctx || ctx.state !== 'running' || !enabled) return;
    const notes = [76, 79, 84, 88];                // E5 G5 C6 E6
    const gaps  = [0, 0.17, 0.34, 0.52];
    const durs  = [0.22, 0.22, 0.22, 0.55];
    const t0 = ctx.currentTime + 0.05;
    for (let i = 0; i < notes.length; i++) {
      playNote(midiToFreq(notes[i]), t0 + gaps[i], durs[i], 'triangle', 0.34, master);
    }
  }

  /* ---------- Musique (boucle chiptune très légère) ---------- */
  function stopMusicTimer() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    musicCurrent = null;
    if (musicBus && ctx) {
      const bus = musicBus;
      try { bus.gain.setTargetAtTime(0, ctx.currentTime, 0.04); } catch (e) { /* noop */ }
      setTimeout(function () { try { bus.disconnect(); } catch (e) { /* noop */ } }, 300);
    }
    musicBus = null;
  }

  function scheduleMusic() {
    const m = MUSIC[musicCurrent];
    if (!m || !ctx) return;
    const stepDur = 60 / m.bpm / 2;
    while (musicNextTime < ctx.currentTime + 0.3) {
      const n = m.steps[musicStep % m.steps.length];
      if (n) playNote(midiToFreq(n), Math.max(musicNextTime, ctx.currentTime + 0.01), stepDur * 0.9, m.wave, m.vol, musicBus);
      musicStep++;
      musicNextTime += stepDur;
    }
  }

  function startMusicNow(mode) {
    if (!ctx || ctx.state !== 'running' || !MUSIC[mode]) return;
    if (musicCurrent === mode && musicTimer) return;
    stopMusicTimer();
    musicCurrent = mode;
    musicBus = ctx.createGain();
    musicBus.gain.value = 1;
    musicBus.connect(master);
    musicStep = 0;
    musicNextTime = ctx.currentTime + 0.12;
    musicTimer = setInterval(scheduleMusic, 40);
    if (mode === 'menu' && jinglePending) {
      jinglePending = false;
      playJingle();
    }
  }

  function ensureMusic() {
    if (!musicDesired || !enabled) return;
    if (!init()) return;
    if (ctx.state !== 'running') {
      ctx.resume().then(function () { if (musicDesired) startMusicNow(musicDesired); }).catch(function () {});
      return;
    }
    startMusicNow(musicDesired);
  }

  /* mode : 'menu' | 'race' | null (stop) */
  function startMusic(mode) {
    musicDesired = mode || null;
    if (!mode) { stopMusicTimer(); return; }
    ensureMusic();
  }
  function stopMusic() {
    musicDesired = null;
    stopMusicTimer();
  }

  /* ---------- Moteur kart ---------- */
  function engineStart() {
    if (!init()) return;
    resume();
    if (engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 70;
    /* léger vibrato (6,5 Hz, ±5 Hz) */
    engineVibrato = ctx.createOscillator();
    engineVibrato.type = 'sine';
    engineVibrato.frequency.value = 6.5;
    engineVibratoGain = ctx.createGain();
    engineVibratoGain.gain.value = 5;
    engineVibrato.connect(engineVibratoGain);
    engineVibratoGain.connect(engineOsc.frequency);
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 900;
    engineFilter.Q.value = 6;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0001;
    engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(master);
    engineOsc.start();
    engineVibrato.start();
  }
  function engineUpdate(speedRatio, boosting) {
    if (!ctx || !engineOsc) return;
    const r = clamp(speedRatio, 0, 1);
    const boost = boosting ? 40 : 0;
    const t = ctx.currentTime;
    engineOsc.frequency.setTargetAtTime(70 + r * 150 + boost, t, 0.05);
    engineFilter.frequency.setTargetAtTime(500 + r * 2400 + (boosting ? 500 : 0), t, 0.05);
    engineGain.gain.setTargetAtTime(enabled ? (0.05 + r * 0.16 + (boosting ? 0.03 : 0)) : 0.0001, t, 0.05);
  }
  function engineStop() {
    if (!ctx || !engineOsc) return;
    try {
      const stopAt = ctx.currentTime + 0.45;
      engineGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
      const osc = engineOsc, vib = engineVibrato;
      setTimeout(function () {
        try { osc.stop(); } catch (e) { /* noop */ }
        try { if (vib) vib.stop(); } catch (e) { /* noop */ }
      }, 450);
    } catch (e) { /* noop */ }
    engineOsc = null; engineGain = null; engineFilter = null;
    engineVibrato = null; engineVibratoGain = null;
  }

  return {
    init: init,
    resume: resume,
    onGesture: onGesture,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    beep: beep,
    sfx: SFX,
    fanfare: fanfare,
    jingleTitle: jingleTitle,
    startMusic: startMusic,
    stopMusic: stopMusic,
    engineStart: engineStart,
    engineUpdate: engineUpdate,
    engineStop: engineStop
  };
})();
