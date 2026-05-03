// ============================================
// AUDIO SYSTEM - Web Audio API
// ============================================
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.25;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, duration, type = 'square', gainVal = 0.3, dest = 'sfx') {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(dest === 'music' ? this.musicGain : this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playNote(note, duration, type = 'square', dest = 'sfx') {
    const notes = {
      'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
      'C6': 1046.50
    };
    const freq = notes[note] || parseFloat(note);
    if (freq) this.playTone(freq, duration, type, 0.25, dest);
  }

  playCountdown() {
    this.playTone(440, 0.15, 'square', 0.3, 'sfx');
  }

  playGo() {
    this.playTone(880, 0.3, 'square', 0.4, 'sfx');
  }

  playItemPickup() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.08);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playShellThrow() {
    this.playTone(300, 0.1, 'sawtooth', 0.2, 'sfx');
  }

  playBananaDrop() {
    this.playTone(200, 0.08, 'sine', 0.2, 'sfx');
  }

  playHit() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    // Descending buzz
    for (let i = 0; i < 5; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 300 - i * 40;
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.05);
    }
  }

  playSpinout() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.4);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  playBoost() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(600, t + 0.3);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  playLapDone() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.2);
    });
  }

  playRaceFinish() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const melody = [
      [523.25, 0.15], [523.25, 0.15], [523.25, 0.15], [1046.50, 0.6]
    ];
    let time = t;
    melody.forEach(([freq, dur]) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(time);
      osc.stop(time + dur + 0.05);
      time += dur;
    });
  }

  playMenuSelect() {
    this.playTone(660, 0.06, 'square', 0.2, 'sfx');
  }

  playMenuConfirm() {
    this.playTone(880, 0.08, 'square', 0.25, 'sfx');
    setTimeout(() => this.playTone(1100, 0.1, 'square', 0.25, 'sfx'), 80);
  }

  playDrift() {
    this.playTone(150 + Math.random() * 50, 0.05, 'sawtooth', 0.05, 'sfx');
  }

  playEngine(speedRatio) {
    // Called each frame - lightweight continuous sound
    // This is handled by the engine sound system
  }

  // Simple music system
  _musicOscillators = [];
  _musicPlaying = false;

  stopMusic() {
    this._musicPlaying = false;
    this._musicOscillators.forEach(o => { try { o.stop(); } catch(e){} });
    this._musicOscillators = [];
  }

  playTrackMusic(trackIndex) {
    if (!this.enabled || !this.ctx) return;
    this.stopMusic();
    this._musicPlaying = true;

    const musicPatterns = [
      // Mario Circuit theme - cheerful
      [
        ['E4',0.15],['E4',0.15],['E4',0.15],['C4',0.15],['E4',0.3],['G4',0.3],
        ['G3',0.3],['C4',0.15],['G3',0.15],['E3',0.15],
        ['A3',0.3],['B3',0.15],['A3',0.15],['G3',0.15],['E4',0.15],
        ['G4',0.15],['A4',0.15],['F4',0.15],['G4',0.15],
        ['E4',0.3],['C4',0.15],['D4',0.15],['B3',0.3],
      ],
      // Beach theme - relaxed
      [
        ['A4',0.3],['E5',0.3],['C5',0.15],['D5',0.15],['E5',0.3],
        ['D5',0.15],['C5',0.15],['A4',0.3],['G4',0.15],['A4',0.15],
        ['C5',0.3],['A4',0.3],['G4',0.3],['E4',0.3],
        ['A4',0.15],['G4',0.15],['E4',0.3],['D4',0.15],['C4',0.15],
        ['D4',0.3],['E4',0.3],
      ],
      // Castle theme - dramatic
      [
        ['E4',0.2],['F4',0.2],['G4',0.2],['A4',0.4],['G4',0.2],['F4',0.2],
        ['E4',0.2],['D4',0.2],['E4',0.4],['C4',0.2],['D4',0.2],
        ['E4',0.2],['D4',0.2],['C4',0.4],['D4',0.2],['E4',0.2],
        ['F4',0.2],['E4',0.2],['D4',0.2],['C4',0.4],
      ],
      // Rainbow theme - high energy
      [
        ['C5',0.1],['E5',0.1],['G5',0.1],['E5',0.1],['C5',0.1],['G4',0.1],
        ['B4',0.1],['D5',0.1],['G5',0.1],['D5',0.1],['B4',0.1],['G4',0.1],
        ['A4',0.1],['C5',0.1],['E5',0.1],['C5',0.1],['A4',0.1],['E4',0.1],
        ['F4',0.1],['A4',0.1],['C5',0.1],['F5',0.1],['C5',0.1],['A4',0.1],
        ['G4',0.2],['B4',0.2],['D5',0.4],
      ]
    ];

    const pattern = musicPatterns[trackIndex % musicPatterns.length];
    const playPattern = () => {
      if (!this._musicPlaying || !this.ctx) return;
      let time = this.ctx.currentTime + 0.05;
      pattern.forEach(([note, dur]) => {
        this.playNoteAt(note, dur, 'square', time, 'music');
        this.playNoteAt(note, dur, 'triangle', time, 'music'); // harmony
        time += dur;
      });
      const totalTime = pattern.reduce((s, [, d]) => s + d, 0);
      setTimeout(() => { if (this._musicPlaying) playPattern(); }, totalTime * 1000);
    };
    playPattern();
  }

  playNoteAt(note, duration, type, time, dest) {
    if (!this.enabled || !this.ctx) return;
    const notes = {
      'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
      'C6': 1046.50
    };
    const freq = notes[note] || parseFloat(note);
    if (!freq) return;
    const dur = duration * 0.9;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.setValueAtTime(0.08, time + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(dest === 'music' ? this.musicGain : this.sfxGain);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  playFinalLap() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    [660, 880, 1100, 1320].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.3, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.2);
    });
  }
}

const audio = new AudioSystem();