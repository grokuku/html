/* ========================================
   BOMBERMAN SS — Audio System
   Web Audio API sound effects & music
   ======================================== */

B.Audio = {
    ctx: null,
    masterGain: null,
    sfxGain: null,
    musicGain: null,
    muted: false,
    musicVolume: 0.3,
    sfxVolume: 0.5,
    currentMusic: null,
    musicOscillators: [],

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);
        } catch (e) {
            console.warn('Web Audio not available');
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // ---- Sound Effects ----
    playSfx(type) {
        if (!this.ctx || this.muted) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.sfxGain);

        switch (type) {
            case 'bombPlace':
                osc.type = 'square';
                osc.frequency.setValueAtTime(200, t);
                osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t); osc.stop(t + 0.1);
                break;

            case 'explosion':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, t);
                osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
                gain.gain.setValueAtTime(0.4, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
                osc.start(t); osc.stop(t + 0.4);
                // Add noise-like component
                const noise = this.ctx.createOscillator();
                const ng = this.ctx.createGain();
                noise.type = 'sawtooth';
                noise.frequency.setValueAtTime(80, t);
                noise.connect(ng);
                ng.connect(this.sfxGain);
                ng.gain.setValueAtTime(0.2, t);
                ng.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                noise.start(t); noise.stop(t + 0.3);
                break;

            case 'powerup':
                osc.type = 'square';
                osc.frequency.setValueAtTime(523, t);
                osc.frequency.setValueAtTime(659, t + 0.06);
                osc.frequency.setValueAtTime(784, t + 0.12);
                osc.frequency.setValueAtTime(1047, t + 0.18);
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
                osc.start(t); osc.stop(t + 0.25);
                break;

            case 'powerupBad':
                osc.type = 'square';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.start(t); osc.stop(t + 0.3);
                break;

            case 'death':
                osc.type = 'square';
                osc.frequency.setValueAtTime(440, t);
                osc.frequency.exponentialRampToValueAtTime(50, t + 0.8);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
                osc.start(t); osc.stop(t + 0.8);
                break;

            case 'win':
                osc.type = 'square';
                [523, 659, 784, 1047, 784, 1047].forEach((f, i) => {
                    osc.frequency.setValueAtTime(f, t + i * 0.12);
                });
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
                osc.start(t); osc.stop(t + 0.8);
                break;

            case 'menuSelect':
                osc.type = 'square';
                osc.frequency.setValueAtTime(440, t);
                osc.frequency.setValueAtTime(660, t + 0.05);
                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t); osc.stop(t + 0.1);
                break;

            case 'menuMove':
                osc.type = 'square';
                osc.frequency.setValueAtTime(330, t);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
                osc.start(t); osc.stop(t + 0.05);
                break;

            case 'kick':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300, t);
                osc.frequency.setValueAtTime(600, t + 0.05);
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t); osc.stop(t + 0.1);
                break;

            case 'punch':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(500, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                osc.start(t); osc.stop(t + 0.08);
                break;

            case 'start':
                osc.type = 'square';
                [523, 659, 784].forEach((f, i) => {
                    osc.frequency.setValueAtTime(f, t + i * 0.15);
                });
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.linearRampToValueAtTime(0.25, t + 0.3);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
                osc.start(t); osc.stop(t + 0.6);
                break;

            case 'countdown':
                osc.type = 'square';
                osc.frequency.setValueAtTime(440, t);
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                osc.start(t); osc.stop(t + 0.15);
                break;

            case 'go':
                osc.type = 'square';
                osc.frequency.setValueAtTime(880, t);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.start(t); osc.stop(t + 0.3);
                break;

            case 'blockBreak':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, t);
                osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                osc.start(t); osc.stop(t + 0.15);
                break;

            case 'bombPass':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, t);
                osc.frequency.exponentialRampToValueAtTime(400, t + 0.08);
                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                osc.start(t); osc.stop(t + 0.08);
                break;

            case 'disease':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, t);
                osc.frequency.setValueAtTime(150, t + 0.1);
                osc.frequency.setValueAtTime(100, t + 0.2);
                osc.frequency.setValueAtTime(150, t + 0.3);
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
                osc.start(t); osc.stop(t + 0.4);
                break;

            case 'bossHit':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, t);
                osc.frequency.exponentialRampToValueAtTime(50, t + 0.3);
                gain.gain.setValueAtTime(0.35, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.start(t); osc.stop(t + 0.3);
                break;

            default:
                osc.start(t); osc.stop(t + 0.01);
        }
    },

    // ---- Music (simple chiptune) ----
    playMusic(track) {
        this.stopMusic();
        if (!this.ctx || this.muted) return;
        this.resume();

        const melodies = {
            title: {
                tempo: 140,
                notes: [
                    // Simple catchy title melody
                    [523,0.25],[587,0.25],[659,0.25],[523,0.25],
                    [659,0.25],[784,0.5],[659,0.25],[523,0.25],
                    [587,0.25],[523,0.25],[440,0.5],[0,0.25],
                    [523,0.25],[587,0.25],[659,0.25],[784,0.25],
                    [880,0.5],[784,0.25],[659,0.25],
                    [587,0.25],[659,0.25],[523,0.75],[0,0.25],
                ]
            },
            battle: {
                tempo: 160,
                notes: [
                    [330,0.2],[392,0.2],[440,0.2],[330,0.2],
                    [440,0.2],[523,0.4],[440,0.2],[330,0.2],
                    [392,0.2],[330,0.2],[294,0.4],[0,0.2],
                    [330,0.2],[392,0.2],[440,0.2],[523,0.2],
                    [587,0.4],[523,0.2],[440,0.2],
                    [392,0.2],[440,0.2],[330,0.6],[0,0.2],
                ]
            },
            boss: {
                tempo: 180,
                notes: [
                    [196,0.15],[0,0.05],[196,0.15],[0,0.05],
                    [233,0.2],[196,0.2],[165,0.2],[196,0.15],[0,0.05],
                    [233,0.15],[262,0.15],[233,0.15],[196,0.3],
                    [0,0.1],[165,0.15],[0,0.05],[165,0.15],[0,0.05],
                    [196,0.2],[165,0.2],[147,0.2],[165,0.15],[0,0.05],
                    [196,0.15],[233,0.15],[196,0.15],[165,0.3],[0,0.1],
                ]
            },
            victory: {
                tempo: 120,
                notes: [
                    [523,0.2],[659,0.2],[784,0.2],[1047,0.4],
                    [784,0.2],[1047,0.6],[0,0.2],
                    [523,0.2],[659,0.2],[784,0.2],[1047,0.2],
                    [1175,0.4],[1047,0.2],[784,0.2],
                    [1047,0.8],[0,0.2],
                ]
            },
            worldmap: {
                tempo: 100,
                notes: [
                    [262,0.3],[330,0.3],[392,0.3],[330,0.3],
                    [262,0.3],[294,0.3],[330,0.6],[0,0.3],
                    [392,0.3],[440,0.3],[392,0.3],[330,0.3],
                    [262,0.3],[330,0.3],[262,0.6],[0,0.3],
                ]
            }
        };

        const music = melodies[track];
        if (!music) return;

        this.currentMusic = track;
        const playLoop = () => {
            if (this.currentMusic !== track || this.muted) return;
            let t = this.ctx.currentTime + 0.05;
            const beatDur = 60 / music.tempo;

            music.notes.forEach(([freq, dur]) => {
                if (freq > 0) {
                    const osc = this.ctx.createOscillator();
                    const g = this.ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(freq, t);
                    g.gain.setValueAtTime(0.12, t);
                    g.gain.setValueAtTime(0.12, t + dur * beatDur * 0.8);
                    g.gain.exponentialRampToValueAtTime(0.01, t + dur * beatDur);
                    osc.connect(g);
                    g.connect(this.musicGain);
                    osc.start(t);
                    osc.stop(t + dur * beatDur + 0.01);
                    this.musicOscillators.push(osc);
                }
                t += dur * beatDur;
            });

            const totalDur = music.notes.reduce((s, [, d]) => s + d * beatDur, 0);
            this.musicTimeout = setTimeout(() => playLoop(), totalDur * 1000);
        };

        playLoop();
    },

    stopMusic() {
        this.currentMusic = null;
        if (this.musicTimeout) clearTimeout(this.musicTimeout);
        this.musicOscillators.forEach(o => {
            try { o.stop(); } catch(e) {}
        });
        this.musicOscillators = [];
    },

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 1;
        }
    }
};