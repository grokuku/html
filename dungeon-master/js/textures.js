// ===== PROCEDURAL TEXTURE GENERATION =====

const TextureGen = {
    cache: {},

    get(key, width, height, generator) {
        if (this.cache[key]) return this.cache[key];
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        generator(ctx, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        this.cache[key] = imgData;
        return imgData;
    },

    // Seeded random
    seededRandom(seed) {
        let s = seed;
        return function() {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    },

    stoneWall() {
        return this.get('stone_wall', 64, 64, (ctx, w, h) => {
            const rng = this.seededRandom(42);
            ctx.fillStyle = '#3a3a4a';
            ctx.fillRect(0, 0, w, h);
            // Stone blocks
            for (let row = 0; row < 4; row++) {
                const offset = (row % 2) * 16;
                for (let col = -1; col < 3; col++) {
                    const bx = col * 32 + offset;
                    const by = row * 16;
                    const shade = 40 + rng() * 30;
                    ctx.fillStyle = `rgb(${shade+10},${shade+8},${shade+20})`;
                    ctx.fillRect(bx + 1, by + 1, 30, 14);
                }
            }
            // Mortar lines
            ctx.strokeStyle = '#222233';
            ctx.lineWidth = 1;
            for (let row = 0; row <= 4; row++) {
                ctx.beginPath(); ctx.moveTo(0, row * 16); ctx.lineTo(w, row * 16); ctx.stroke();
            }
            for (let row = 0; row < 4; row++) {
                const off = (row % 2) * 16;
                for (let x = off; x < w + 32; x += 32) {
                    ctx.beginPath(); ctx.moveTo(x, row * 16); ctx.lineTo(x, row * 16 + 16); ctx.stroke();
                }
            }
            // Noise
            for (let i = 0; i < 200; i++) {
                const x = rng() * w, y = rng() * h;
                const v = 30 + rng() * 40;
                ctx.fillStyle = `rgba(${v},${v},${v+5},0.3)`;
                ctx.fillRect(x, y, 1, 1);
            }
        });
    },

    mossyWall() {
        return this.get('mossy_wall', 64, 64, (ctx, w, h) => {
            const rng = this.seededRandom(77);
            // Base stone
            ctx.fillStyle = '#3a3a4a';
            ctx.fillRect(0, 0, w, h);
            for (let row = 0; row < 4; row++) {
                const off = (row % 2) * 16;
                for (let col = -1; col < 3; col++) {
                    const bx = col * 32 + off;
                    const by = row * 16;
                    const shade = 35 + rng() * 25;
                    ctx.fillStyle = `rgb(${shade+5},${shade+15},${shade+5})`;
                    ctx.fillRect(bx + 1, by + 1, 30, 14);
                }
            }
            // Moss patches
            for (let i = 0; i < 30; i++) {
                const x = rng() * w, y = rng() * h;
                const s = 3 + rng() * 8;
                ctx.fillStyle = `rgba(${20+rng()*30},${60+rng()*40},${10+rng()*20},0.6)`;
                ctx.fillRect(x, y, s, s);
            }
        });
    },

    brickWall() {
        return this.get('brick_wall', 64, 64, (ctx, w, h) => {
            const rng = this.seededRandom(123);
            ctx.fillStyle = '#2a2020';
            ctx.fillRect(0, 0, w, h);
            for (let row = 0; row < 8; row++) {
                const offset = (row % 2) * 8;
                for (let col = -1; col < 5; col++) {
                    const bx = col * 16 + offset;
                    const by = row * 8;
                    const r = 80 + rng() * 40;
                    ctx.fillStyle = `rgb(${r},${r*0.4},${r*0.3})`;
                    ctx.fillRect(bx + 1, by + 1, 14, 6);
                }
            }
        });
    },

    doorTexture() {
        return this.get('door', 64, 64, (ctx, w, h) => {
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(0, 0, w, h);
            // Planks
            ctx.strokeStyle = '#3a2510';
            ctx.lineWidth = 1;
            for (let x = 0; x < w; x += 16) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            // Handle
            ctx.fillStyle = '#aa8833';
            ctx.beginPath();
            ctx.arc(48, 32, 4, 0, Math.PI * 2);
            ctx.fill();
            // Frame
            ctx.strokeStyle = '#2a1a0a';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, w - 2, h - 2);
            // Iron bands
            ctx.fillStyle = '#444444';
            ctx.fillRect(4, 12, w - 8, 3);
            ctx.fillRect(4, 48, w - 8, 3);
        });
    },

    doorOpenTexture() {
        return this.get('door_open', 64, 64, (ctx, w, h) => {
            ctx.fillStyle = '#1a1a2a';
            ctx.fillRect(0, 0, w, h);
            // Dark passage
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(8, 8, w - 16, h - 16);
        });
    },

    lockedDoorTexture() {
        return this.get('locked_door', 64, 64, (ctx, w, h) => {
            this.doorTexture();
            const prev = this.cache['door'];
            ctx.putImageData(prev, 0, 0);
            // Lock
            ctx.fillStyle = '#666666';
            ctx.fillRect(28, 28, 8, 12);
            ctx.fillStyle = '#aa8833';
            ctx.beginPath();
            ctx.arc(32, 32, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#333';
            ctx.fillRect(30, 32, 4, 5);
        });
    },

    floorTexture() {
        return this.get('floor', 64, 64, (ctx, w, h) => {
            const rng = this.seededRandom(55);
            ctx.fillStyle = '#2a2a30';
            ctx.fillRect(0, 0, w, h);
            // Flagstones
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 4; col++) {
                    const shade = 25 + rng() * 20;
                    ctx.fillStyle = `rgb(${shade},${shade},${shade+5})`;
                    ctx.fillRect(col * 16 + 1, row * 16 + 1, 14, 14);
                }
            }
            ctx.strokeStyle = '#181820';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                ctx.beginPath(); ctx.moveTo(i * 16, 0); ctx.lineTo(i * 16, h); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i * 16); ctx.lineTo(w, i * 16); ctx.stroke();
            }
        });
    },

    ceilingTexture() {
        return this.get('ceiling', 64, 64, (ctx, w, h) => {
            const rng = this.seededRandom(99);
            ctx.fillStyle = '#1a1a22';
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 100; i++) {
                const x = rng() * w, y = rng() * h;
                const v = 15 + rng() * 15;
                ctx.fillStyle = `rgba(${v},${v},${v},0.4)`;
                ctx.fillRect(x, y, 2, 2);
            }
        });
    },

    stairsTexture() {
        return this.get('stairs', 64, 64, (ctx, w, h) => {
            ctx.fillStyle = '#2a2a30';
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 4; i++) {
                const shade = 40 + i * 10;
                ctx.fillStyle = `rgb(${shade},${shade},${shade+5})`;
                ctx.fillRect(8, i * 16, w - 16, 12);
            }
            ctx.fillStyle = '#d4a030';
            ctx.font = '10px serif';
            ctx.textAlign = 'center';
            ctx.fillText('▼', 32, 40);
        });
    },

    fountainTexture() {
        return this.get('fountain', 64, 64, (ctx, w, h) => {
            ctx.fillStyle = '#2a2a30';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#4488cc';
            ctx.beginPath();
            ctx.arc(32, 32, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#66aadd';
            ctx.beginPath();
            ctx.arc(32, 30, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(32, 32, 16, 0, Math.PI * 2);
            ctx.stroke();
        });
    },

    // Sprite textures for items on ground
    itemSprite(icon, bgColor) {
        return this.get(`item_${icon}`, 64, 64, (ctx, w, h) => {
            ctx.fillStyle = bgColor || 'rgba(0,0,0,0)';
            ctx.fillRect(0, 0, w, h);
            ctx.font = '32px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, 32, 32);
        });
    },

    // Get wall texture by type
    getWallTexture(type) {
        switch (type) {
            case WALL_TYPE.STONE: return this.stoneWall();
            case WALL_TYPE.MOSSY: return this.mossyWall();
            case WALL_TYPE.BRICK: return this.brickWall();
            case WALL_TYPE.DOOR: return this.doorTexture();
            case WALL_TYPE.DOOR_OPEN: return this.doorOpenTexture();
            case WALL_TYPE.LOCKED: return this.lockedDoorTexture();
            default: return this.stoneWall();
        }
    },

    // Preload all textures
    init() {
        this.stoneWall();
        this.mossyWall();
        this.brickWall();
        this.doorTexture();
        this.doorOpenTexture();
        this.lockedDoorTexture();
        this.floorTexture();
        this.ceilingTexture();
        this.stairsTexture();
        this.fountainTexture();
    }
};