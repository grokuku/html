// Procedural Audio System - Music, Engine, SFX
import { CONFIG } from './constants.js';

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.initialized = false;
        this.musicPlaying = false;
    }

    init() {
        if (this.initialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0;
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.25;
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.4;
        this.sfxGain.connect(this.masterGain);

        this.initEngine();
        this.initialized = true;
    }

    initEngine() {
        // Engine sound: multiple oscillators for richness
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0;
        this.engineGain.connect(this.sfxGain);

        // Base oscillator
        this.engineOsc1 = this.ctx.createOscillator();
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc1.frequency.value = 60;

        // Harmonics
        this.engineOsc2 = this.ctx.createOscillator();
        this.engineOsc2.type = 'square';
        this.engineOsc2.frequency.value = 120;

        this.engineOsc3 = this.ctx.createOscillator();
        this.engineOsc3.type = 'triangle';
        this.engineOsc3.frequency.value = 30;

        // Filter for engine character
        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 300;
        this.engineFilter.Q.value = 5;

        // Distortion for grit
        this.engineDist = this.ctx.createWaveShaper();
        this.engineDist.curve = this.makeDistortionCurve(100);

        this.engineOsc1.connect(this.engineFilter);
        this.engineOsc2.connect(this.engineFilter);
        this.engineOsc3.connect(this.engineFilter);
        this.engineFilter.connect(this.engineDist);
        this.engineDist.connect(this.engineGain);

        this.engineOsc1.start();
        this.engineOsc2.start();
        this.engineOsc3.start();
    }

    makeDistortionCurve(amount) {
        const k = amount;
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    updateEngine(speed, maxSpeed) {
        if (!this.initialized) return;
        const t = Math.max(0, Math.min(1, speed / maxSpeed));

        // Pitch rises with speed
        this.engineOsc1.frequency.setTargetAtTime(55 + t * 200, this.ctx.currentTime, 0.05);
        this.engineOsc2.frequency.setTargetAtTime(90 + t * 300, this.ctx.currentTime, 0.05);
        this.engineOsc3.frequency.setTargetAtTime(25 + t * 80, this.ctx.currentTime, 0.05);

        // Volume and filter cutoff
        this.engineGain.gain.setTargetAtTime(0.06 + t * 0.12, this.ctx.currentTime, 0.05);
        this.engineFilter.frequency.setTargetAtTime(200 + t * 2000, this.ctx.currentTime, 0.05);
    }

    startEngine() {
        if (!this.initialized) return;
        this.engineGain.gain.setTargetAtTime(0.08, this.ctx.currentTime, 0.1);
    }

    stopEngine() {
        if (!this.initialized) return;
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    }

    // === SOUND EFFECTS ===

    playBoost() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        // Rising sweep
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(1500, now + 0.4);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(3000, now + 0.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.5);
    }

    playMissile() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        // Missile launch: sharp attack + whoosh
        const noise = this.createNoise(0.3);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.3);

        // Sub bass thump
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.2, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playExplosion() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        // Low frequency boom
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.3, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.6);

        // Noise burst
        const noise = this.createNoise(0.6);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.25, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.6);
    }

    playMine() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    playShieldHit() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        // Metallic ring
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2400, now);
        osc2.frequency.exponentialRampToValueAtTime(800, now + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.4);
        osc2.stop(now + 0.3);
    }

    playShieldUp() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    playCollision() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        const noise = this.createNoise(0.2);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1500;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.2);

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.15, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playCountdownBeep(final = false) {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;
        const freq = final ? 1000 : 600;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (final ? 0.5 : 0.2));

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + (final ? 0.6 : 0.25));
    }

    playLapComplete() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        // Ascending chime
        [523, 659, 784].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now + i * 0.1);
            gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.5);
        });
    }

    playWeaponPickup() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playBolt() {
        if (!this.initialized) return;
        const now = this.ctx.currentTime;

        // Electric zap
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);

        // Rapid frequency modulation for zapping effect
        for (let i = 0; i < 10; i++) {
            osc.frequency.setValueAtTime(200 + Math.random() * 2000, now + i * 0.02);
        }

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    // Noise generator helper
    createNoise(duration) {
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        return source;
    }

    // === MUSIC SYSTEM ===
    startMusic() {
        if (!this.initialized || this.musicPlaying) return;
        this.musicPlaying = true;
        this.musicContext = {};

        const now = this.ctx.currentTime;

        // Create music bus with compressor
        this.musicContext.compressor = this.ctx.createDynamicsCompressor();
        this.musicContext.compressor.threshold.value = -20;
        this.musicContext.compressor.knee.value = 10;
        this.musicContext.compressor.ratio.value = 4;
        this.musicContext.compressor.connect(this.musicGain);

        // BPM: 140
        this.musicContext.bpm = 140;
        this.musicContext.beatDuration = 60 / 140;
        this.musicContext.nextBeatTime = now;
        this.musicContext.currentBeat = 0;

        // Kick drum
        this.musicContext.kickActive = true;
        // Hi-hat
        this.musicContext.hihatActive = true;
        // Bass
        this.musicContext.bassActive = true;
        // Pad
        this.musicContext.padActive = true;

        // Sustained pad
        this.musicContext.padOscs = [];
        this.setupPad();

        // Start sequencer
        this.musicContext.schedulerId = setInterval(() => this.scheduleMusic(), 25);
    }

    setupPad() {
        const now = this.ctx.currentTime;
        // Ambient pad with detuned oscillators
        const notes = [65.41, 98.00, 130.81]; // C2, G2, C3
        notes.forEach(freq => {
            for (let d = -5; d <= 5; d += 5) {
                const osc = this.ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = freq * (1 + d * 0.001);

                const gain = this.ctx.createGain();
                gain.gain.value = 0.015;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 400;
                filter.Q.value = 2;

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.musicContext.compressor);

                osc.start(now);
                this.musicContext.padOscs.push({ osc, gain, filter });
            }
        });
    }

    scheduleMusic() {
        if (!this.musicPlaying) return;

        const beatDuration = this.musicContext.beatDuration;
        const lookAhead = 0.1;

        while (this.musicContext.nextBeatTime < this.ctx.currentTime + lookAhead) {
            const beatTime = this.musicContext.nextBeatTime;
            const beat = this.musicContext.currentBeat;
            this.playMusicBeat(beatTime, beat);
            this.musicContext.nextBeatTime += beatDuration;
            this.musicContext.currentBeat++;
        }
    }

    playMusicBeat(time, beat) {
        const bd = this.musicContext.beatDuration;
        const beatInBar = beat % 16;

        // Kick: on beats 0, 4, 8, 12
        if (this.musicContext.kickActive && beatInBar % 4 === 0) {
            this.playKick(time);
        }

        // Hi-hat: every beat with variations
        if (this.musicContext.hihatActive) {
            this.playHiHat(time, beatInBar % 2 === 0 ? 0.03 : 0.015);
        }

        // Bass line pattern (every 4 beats, with variation)
        if (this.musicContext.bassActive && beatInBar % 2 === 0) {
            const bassPattern = [
                65.41, 65.41, 73.42, 77.78,
                87.31, 87.31, 82.41, 77.78,
                98.00, 98.00, 87.31, 82.41,
                73.42, 73.42, 77.78, 65.41
            ];
            this.playBass(time, bassPattern[beatInBar]);
        }

        // Arpeggiated synth on some beats
        if (beatInBar % 2 === 0 && Math.random() > 0.5) {
            const arpNotes = [130.81, 164.81, 196.00, 261.63, 329.63];
            const note = arpNotes[Math.floor(beat / 2) % arpNotes.length];
            this.playArp(time, note);
        }
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

        osc.connect(gain);
        gain.connect(this.musicContext.compressor);
        osc.start(time);
        osc.stop(time + 0.2);
    }

    playHiHat(time, vol) {
        const noise = this.createNoise(0.05);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicContext.compressor);
        noise.start(time);
        noise.stop(time + 0.06);
    }

    playBass(time, freq) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + this.musicContext.beatDuration * 1.5);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicContext.compressor);
        osc.start(time);
        osc.stop(time + this.musicContext.beatDuration * 2);
    }

    playArp(time, freq) {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.03, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicContext.compressor);
        osc.start(time);
        osc.stop(time + 0.25);
    }

    stopMusic() {
        if (!this.musicPlaying) return;
        this.musicPlaying = false;
        if (this.musicContext.schedulerId) {
            clearInterval(this.musicContext.schedulerId);
        }
        if (this.musicContext.padOscs) {
            this.musicContext.padOscs.forEach(({ osc }) => {
                try { osc.stop(); } catch (e) {}
            });
        }
    }

    setMusicVolume(v) {
        if (this.musicGain) this.musicGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
    }

    setSfxVolume(v) {
        if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
    }
}