/* ========================================
   BOMBERMAN SS — Engine Core
   Game loop, constants, utilities
   ======================================== */

const B = B || {};

// ---- Constants ----
B.C = {
    COLS: 15,
    ROWS: 13,
    TILE: 48,

    STATE: {
        LOADING: 'loading', TITLE: 'title',
        CHAR_SELECT: 'charSelect', STAGE_SELECT: 'stageSelect',
        BATTLE_CONFIG: 'battleConfig', WORLD_MAP: 'worldMap',
        PLAYING: 'playing', PAUSED: 'paused',
        COUNTDOWN: 'countdown', RESULTS: 'results',
        GAME_OVER: 'gameOver', VICTORY: 'victory'
    },

    TILE_EMPTY: 0, TILE_SOFT: 1, TILE_HARD: 2, TILE_BOMB: 3,
    TILE_WATER: -1,

    DIR: { UP: 0, DOWN: 1, LEFT: 2, RIGHT: 3, NONE: 4 },

    PU: {
        BOMB_UP: 'bombUp', FIRE_UP: 'fireUp', SPEED_UP: 'speedUp',
        FULL_FIRE: 'fullFire', BOMB_KICK: 'bombKick', BOMB_PUNCH: 'bombPunch',
        REMOTE: 'remote', WALL_PASS: 'wallPass', BOMB_PASS: 'bombPass',
        VEST: 'vest', SKULL: 'skull', TIMER: 'timer', CROSS_BOMB: 'crossBomb'
    },

    DEFAULT_BOMBS: 1, DEFAULT_FIRE: 1, DEFAULT_SPEED: 3,
    BOMB_TIMER: 3.0, EXPLOSION_DURATION: 0.5, INVINCIBLE_TIME: 3.0,
    ANIM_SPEED: 8, DEATH_ANIM_TIME: 1.5, DISEASE_TIME: 10.0,
    AI_THINK_INTERVAL: 0.15
};

// ---- Utility Functions ----
B.Utils = {
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    randFloat: (min, max) => Math.random() * (max - min) + min,
    chance: (pct) => Math.random() < pct,
    dist: (x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2),

    tileToPixel: (tx, ty) => ({ x: tx * B.C.TILE, y: ty * B.C.TILE }),
    pixelToTile: (px, py) => ({ x: Math.floor(px / B.C.TILE), y: Math.floor(py / B.C.TILE) }),

    dirVec: (dir) => {
        return [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0},{x:0,y:0}][dir] || {x:0,y:0};
    },
    oppositeDir: (dir) => [1, 0, 3, 2, 4][dir],

    clone: (obj) => JSON.parse(JSON.stringify(obj)),

    hexToRgb: (hex) => {
        return { r: parseInt(hex.slice(1,3),16), g: parseInt(hex.slice(3,5),16), b: parseInt(hex.slice(5,7),16) };
    },
    rgbToHex: (r, g, b) => '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join(''),
    shadeColor: (hex, factor) => {
        const {r,g,b} = B.Utils.hexToRgb(hex);
        const s = (v) => B.Utils.clamp(Math.floor(v * factor), 0, 255);
        return B.Utils.rgbToHex(s(r), s(g), s(b));
    },

    easeOutQuad: (t) => t * (2 - t),
    easeInQuad: (t) => t * t,

    createGrid: (cols, rows, val) => Array.from({length: rows}, () => Array(cols).fill(val)),
    shuffle: (arr) => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
};

// ---- Core Engine ----
B.Engine = {
    canvas: null, ctx: null,
    lastTime: 0, deltaTime: 0,
    fps: 0, fpsCounter: 0, fpsTimer: 0,
    running: false, scale: 1,
    currentTime: 0,

    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const gw = B.C.COLS * B.C.TILE;
        const gh = B.C.ROWS * B.C.TILE;
        const maxW = window.innerWidth - 20;
        const maxH = window.innerHeight - 80;
        this.scale = Math.min(maxW / gw, maxH / gh, 1.5);
        this.canvas.width = Math.floor(gw * this.scale);
        this.canvas.height = Math.floor(gh * this.scale);
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    },

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this._loopFn = (ts) => {
            if (!this.running) return;
            this.tick(ts);
            requestAnimationFrame(this._loopFn);
        };
        requestAnimationFrame(this._loopFn);
    },

    tick(timestamp) {
        this.deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;
        this.currentTime = timestamp / 1000;

        // FPS
        this.fpsCounter++;
        this.fpsTimer += this.deltaTime;
        if (this.fpsTimer >= 1.0) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTimer = 0;
        }

        // Input
        B.Input.update();

        // Update
        B.Menus.update(this.deltaTime);
        if (B.Game.state === B.C.STATE.PLAYING || B.Game.state === B.C.STATE.COUNTDOWN) {
            B.Game.update(this.deltaTime);
        }

        // Render always
        B.Renderer.render(this.deltaTime);

        // Input end (clear single-frame states)
        B.Input.endFrame();
    }
};