/* ========================================
   BOMBERMAN SS — Sprite Drawing System
   All pixel-art characters, tiles, items
   rendered via canvas 2D primitives
   ======================================== */

B.Sprites = {
    cache: {},

    // Generate a sprite canvas and cache it
    get(key, w, h, drawFn) {
        const k = key;
        if (this.cache[k]) return this.cache[k];
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        drawFn(ctx, w, h);
        this.cache[k] = c;
        return c;
    },

    clearCache() {
        this.cache = {};
    },

    // ---- Characters ----
    drawCharacter(ctx, charId, frame, dir, x, y, size, flashing) {
        const charData = B.Data.characters[charId];
        if (!charData) return;

        const s = size;
        const colors = charData.colors;

        // Flash effect (invincibility)
        if (flashing && Math.floor(B.Engine.currentTime * 10) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        ctx.save();
        ctx.translate(x + s/2, y + s/2);

        // Walking animation bob
        const walkBob = (frame % 4 < 2) ? -1 : 0;

        // Body
        const bw = s * 0.6;
        const bh = s * 0.5;

        // Legs (animated)
        const legSpread = (frame % 2 === 0) ? 3 : -3;
        ctx.fillStyle = colors.legs || colors.body;
        ctx.fillRect(-bw * 0.35 + legSpread, bh * 0.2, bw * 0.25, s * 0.3);
        ctx.fillRect(bw * 0.1 - legSpread, bh * 0.2, bw * 0.25, s * 0.3);

        // Shoes
        ctx.fillStyle = colors.shoes || '#333';
        ctx.fillRect(-bw * 0.35 + legSpread, s * 0.45, bw * 0.3, s * 0.08);
        ctx.fillRect(bw * 0.1 - legSpread, s * 0.45, bw * 0.3, s * 0.08);

        // Body
        ctx.fillStyle = colors.body;
        const radius = bw * 0.35;
        ctx.beginPath();
        ctx.moveTo(-bw * 0.45, -bh * 0.1 + walkBob);
        ctx.lineTo(-bw * 0.45, bh * 0.25);
        ctx.quadraticCurveTo(-bw * 0.45, bh * 0.35, -bw * 0.35, bh * 0.35);
        ctx.lineTo(bw * 0.35, bh * 0.35);
        ctx.quadraticCurveTo(bw * 0.45, bh * 0.35, bw * 0.45, bh * 0.25);
        ctx.lineTo(bw * 0.45, -bh * 0.1 + walkBob);
        ctx.quadraticCurveTo(bw * 0.45, -bh * 0.2, bw * 0.35, -bh * 0.2 + walkBob);
        ctx.lineTo(-bw * 0.35, -bh * 0.2 + walkBob);
        ctx.quadraticCurveTo(-bw * 0.45, -bh * 0.2, -bw * 0.45, -bh * 0.1 + walkBob);
        ctx.fill();

        // Belt / detail
        if (colors.belt) {
            ctx.fillStyle = colors.belt;
            ctx.fillRect(-bw * 0.4, bh * 0.05, bw * 0.8, bh * 0.1);
        }

        // Head
        const hw = s * 0.55;
        const hh = s * 0.48;
        ctx.fillStyle = colors.head || colors.body;
        ctx.beginPath();
        ctx.arc(0, -hh * 0.55 + walkBob, hw * 0.48, 0, Math.PI * 2);
        ctx.fill();

        // Face area
        ctx.fillStyle = colors.face || '#FFE0BD';
        ctx.beginPath();
        ctx.arc(0, -hh * 0.42 + walkBob, hw * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        const eyeOffset = (dir === B.C.DIR.LEFT) ? -3 : (dir === B.C.DIR.RIGHT) ? 3 : 0;
        const eyeY = -hh * 0.5 + walkBob;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-6 + eyeOffset, eyeY, 5, 5);
        ctx.fillRect(2 + eyeOffset, eyeY, 5, 5);
        ctx.fillStyle = '#000000';
        const pupilOff = (dir === B.C.DIR.LEFT) ? -1 : (dir === B.C.DIR.RIGHT) ? 2 : 0;
        ctx.fillRect(-5 + eyeOffset + pupilOff, eyeY + 1, 3, 3);
        ctx.fillRect(3 + eyeOffset + pupilOff, eyeY + 1, 3, 3);

        // Mouth
        ctx.fillStyle = '#333';
        ctx.fillRect(-2, -hh * 0.3 + walkBob, 4, 2);

        // Headband / Hat (character specific)
        if (colors.headband) {
            ctx.fillStyle = colors.headband;
            ctx.fillRect(-hw * 0.5, -hh * 0.65 + walkBob, hw, hh * 0.15);
            // Pom
            ctx.beginPath();
            ctx.arc(0, -hh * 0.7 + walkBob, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Helmet for Metal Bomber
        if (charId === 'metal') {
            ctx.fillStyle = '#8899aa';
            ctx.beginPath();
            ctx.arc(0, -hh * 0.6 + walkBob, hw * 0.52, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = '#aabbcc';
            ctx.fillRect(-hw * 0.5, -hh * 0.6 + walkBob, hw, 4);
            // Visor
            ctx.fillStyle = '#66ccff';
            ctx.fillRect(-4, -hh * 0.45 + walkBob, 8, 3);
        }

        // Crown for Golden Bomber
        if (charId === 'golden') {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(-6, -hh * 0.78 + walkBob, 12, 6);
            // Crown points
            [[-6, -6], [0, -9], [6, -6]].forEach(([cx, cy]) => {
                ctx.fillRect(cx - 2, cy + walkBob - hh * 0.5 + hh * 0.2, 4, 5);
            });
        }

        // Ribbon for Pretty Bomber
        if (charId === 'pretty') {
            ctx.fillStyle = '#FF69B4';
            // Left ribbon
            ctx.beginPath();
            ctx.moveTo(-hw * 0.35, -hh * 0.65 + walkBob);
            ctx.lineTo(-hw * 0.55, -hh * 0.9 + walkBob);
            ctx.lineTo(-hw * 0.2, -hh * 0.7 + walkBob);
            ctx.fill();
            // Right ribbon
            ctx.beginPath();
            ctx.moveTo(hw * 0.35, -hh * 0.65 + walkBob);
            ctx.lineTo(hw * 0.55, -hh * 0.9 + walkBob);
            ctx.lineTo(hw * 0.2, -hh * 0.7 + walkBob);
            ctx.fill();
        }

        // Katana hint for Kotetsu
        if (charId === 'kotetsu') {
            ctx.strokeStyle = '#c0c0c0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bw * 0.3, -bh * 0.1 + walkBob);
            ctx.lineTo(bw * 0.3 + 12, -bh * 0.4 + walkBob);
            ctx.stroke();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    },

    // Death animation
    drawDeath(ctx, x, y, size, progress, charId) {
        const charData = B.Data.characters[charId];
        const colors = charData ? charData.colors : { body: '#fff', head: '#fff', face: '#FFE0BD' };

        ctx.save();
        ctx.translate(x + size/2, y + size/2);

        const scale = 1 - progress * 0.5;
        const rot = progress * Math.PI * 4;
        ctx.rotate(rot);
        ctx.scale(scale, scale);

        // Ghost/spirit rising
        const rise = -progress * size * 0.5;

        // Simplified ghost body
        ctx.fillStyle = 'rgba(255,255,255,' + (1 - progress) + ')';
        ctx.beginPath();
        ctx.arc(0, rise, size * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'rgba(0,0,0,' + (1 - progress) + ')';
        ctx.fillRect(-4, rise - 3, 3, 3);
        ctx.fillRect(2, rise - 3, 3, 3);

        ctx.restore();
    },

    // ---- Tiles ----
    drawHardBlock(ctx, x, y, size, theme) {
        const t = theme || 'classic';
        const colors = B.Data.stageThemes[t] || B.Data.stageThemes.classic;

        ctx.fillStyle = colors.hardBlock;
        ctx.fillRect(x, y, size, size);

        // Stone pattern
        ctx.fillStyle = colors.hardBlockShade;
        ctx.fillRect(x, y, size, 3);
        ctx.fillRect(x, y, 3, size);
        ctx.fillRect(x + size - 3, y, 3, size);
        ctx.fillRect(x, y + size - 3, size, 3);

        // Cross pattern
        ctx.fillStyle = colors.hardBlockDetail;
        ctx.fillRect(x + size * 0.45, y + 3, size * 0.1, size - 6);
        ctx.fillRect(x + 3, y + size * 0.45, size - 6, size * 0.1);

        // Center circle
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
    },

    drawSoftBlock(ctx, x, y, size, theme) {
        const t = theme || 'classic';
        const colors = B.Data.stageThemes[t] || B.Data.stageThemes.classic;

        ctx.fillStyle = colors.softBlock;
        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

        // Block detail lines
        ctx.fillStyle = colors.softBlockShade;
        ctx.fillRect(x + 4, y + size * 0.33, size - 8, 2);
        ctx.fillRect(x + 4, y + size * 0.66, size - 8, 2);
        ctx.fillRect(x + size * 0.33, y + 4, 2, size - 8);
        ctx.fillRect(x + size * 0.66, y + 4, 2, size - 8);

        // Highlight
        ctx.fillStyle = colors.softBlockHighlight;
        ctx.fillRect(x + 4, y + 4, size * 0.15, size * 0.15);

        // Shadows
        ctx.fillStyle = colors.softBlockShade;
        ctx.fillRect(x + 2, y + size - 5, size - 4, 3);
        ctx.fillRect(x + size - 5, y + 2, 3, size - 4);
    },

    drawFloor(ctx, x, y, size, theme) {
        const t = theme || 'classic';
        const colors = B.Data.stageThemes[t] || B.Data.stageThemes.classic;

        ctx.fillStyle = colors.floor1;
        ctx.fillRect(x, y, size, size);

        // Checkerboard
        const tx = Math.floor(x / size);
        const ty = Math.floor(y / size);
        if ((tx + ty) % 2 === 0) {
            ctx.fillStyle = colors.floor2;
            ctx.fillRect(x, y, size, size);
        }
    },

    // ---- Bombs ----
    drawBomb(ctx, x, y, size, timer, bombType) {
        const pulse = Math.sin(timer * 8) * 0.1 + 1;
        const s = size * 0.7 * pulse;

        ctx.save();
        ctx.translate(x + size/2, y + size/2);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(-s/2, s/2 - 2, s, 4);

        // Bomb body
        if (bombType === 'remote') {
            ctx.fillStyle = '#3366cc';
        } else if (bombType === 'cross') {
            ctx.fillStyle = '#cc3333';
        } else {
            ctx.fillStyle = '#222';
        }
        ctx.beginPath();
        ctx.arc(0, 0, s/2, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(-s * 0.15, -s * 0.15, s * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Fuse
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -s/2);
        ctx.quadraticCurveTo(3, -s/2 - 6, 6, -s/2 - 4);
        ctx.stroke();

        // Fuse spark
        if (timer > 0) {
            const sparkSize = 3 + Math.sin(timer * 12) * 2;
            ctx.fillStyle = Math.sin(timer * 15) > 0 ? '#FFD700' : '#FF6600';
            ctx.beginPath();
            ctx.arc(6, -s/2 - 5, sparkSize, 0, Math.PI * 2);
            ctx.fill();

            // Extra glow
            ctx.fillStyle = 'rgba(255,150,0,0.3)';
            ctx.beginPath();
            ctx.arc(6, -s/2 - 5, sparkSize + 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Timer indicator (flashing speed increases as timer runs down)
        if (timer < 1.0) {
            ctx.fillStyle = `rgba(255,0,0,${Math.sin(timer * 20) * 0.3 + 0.3})`;
            ctx.beginPath();
            ctx.arc(0, 0, s/2 + 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    // ---- Explosions ----
    drawExplosion(ctx, x, y, size, progress, type) {
        const alpha = 1 - progress;
        const expand = B.Utils.easeOutQuad(Math.min(progress * 3, 1));
        const shrink = progress > 0.5 ? (progress - 0.5) * 2 : 0;

        ctx.save();
        ctx.translate(x + size/2, y + size/2);

        const s = size * (0.3 + expand * 0.6) * (1 - shrink * 0.3);

        // Outer glow
        ctx.fillStyle = `rgba(255,100,0,${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();

        // Main fire
        ctx.fillStyle = `rgba(255,180,0,${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgba(255,255,200,${alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Type-specific shapes
        if (type === 'horizontal') {
            ctx.fillStyle = `rgba(255,150,0,${alpha * 0.6})`;
            ctx.fillRect(-size/2, -s * 0.35, size, s * 0.7);
            ctx.fillStyle = `rgba(255,255,200,${alpha * 0.6})`;
            ctx.fillRect(-size/2, -s * 0.15, size, s * 0.3);
        } else if (type === 'vertical') {
            ctx.fillStyle = `rgba(255,150,0,${alpha * 0.6})`;
            ctx.fillRect(-s * 0.35, -size/2, s * 0.7, size);
            ctx.fillStyle = `rgba(255,255,200,${alpha * 0.6})`;
            ctx.fillRect(-s * 0.15, -size/2, s * 0.3, size);
        } else if (type === 'center') {
            // Full cross
            ctx.fillStyle = `rgba(255,150,0,${alpha * 0.5})`;
            ctx.fillRect(-size/2, -s * 0.3, size, s * 0.6);
            ctx.fillRect(-s * 0.3, -size/2, s * 0.6, size);
        }

        // Particles
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + progress * 3;
            const dist = s * (0.5 + progress * 0.5);
            ctx.fillStyle = `rgba(255,${100 + Math.random() * 100},0,${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 2 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    // ---- Power-ups ----
    drawPowerUp(ctx, x, y, size, type, time) {
        const pulse = Math.sin(time * 4) * 0.05 + 1;
        const s = size * 0.7 * pulse;

        ctx.save();
        ctx.translate(x + size/2, y + size/2);

        // Glow
        const puColors = B.Data.powerUpColors[type] || { bg: '#888', fg: '#fff' };

        ctx.fillStyle = puColors.bg + '44';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Background circle
        ctx.fillStyle = puColors.bg;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(-s * 0.1, -s * 0.1, s * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Icon
        ctx.fillStyle = puColors.fg;
        ctx.font = `bold ${Math.floor(s * 0.5)}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const icons = {
            bombUp: 'B+', fireUp: 'F+', speedUp: 'S',
            fullFire: 'F!', bombKick: 'K', bombPunch: 'P',
            remote: 'R', wallPass: 'W', bombPass: 'BP',
            vest: 'V', skull: '☠', timer: 'T', crossBomb: 'C+'
        };

        ctx.fillText(icons[type] || '?', 0, 0);

        ctx.restore();
    },

    // ---- Enemies ----
    drawEnemy(ctx, x, y, size, enemyType, frame, time) {
        const bob = Math.sin(time * 4) * 2;
        ctx.save();
        ctx.translate(x + size/2, y + size/2 + bob);

        const ed = B.Data.enemyTypes[enemyType];
        const colors = ed ? ed.colors : { body: '#aa4400', eyes: '#ff0000' };

        // Body
        ctx.fillStyle = colors.body;
        if (ed && ed.shape === 'round') {
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.32, 0, Math.PI * 2);
            ctx.fill();
        } else if (ed && ed.shape === 'square') {
            const hs = size * 0.3;
            ctx.fillRect(-hs, -hs, hs * 2, hs * 2);
        } else {
            // Default blob
            ctx.beginPath();
            ctx.ellipse(0, size * 0.05, size * 0.3, size * 0.28, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Eyes
        ctx.fillStyle = colors.eyes;
        const eyeShift = (frame % 2 === 0) ? 1 : -1;
        ctx.fillRect(-5 + eyeShift, -4, 4, 4);
        ctx.fillRect(2 + eyeShift, -4, 4, 4);

        // Pupils
        ctx.fillStyle = '#000';
        ctx.fillRect(-4 + eyeShift, -3, 2, 2);
        ctx.fillRect(3 + eyeShift, -3, 2, 2);

        // Enemy-specific features
        if (enemyType === 'pompoi') {
            // Spikes
            ctx.fillStyle = colors.spikes || '#ff6600';
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 + time * 2;
                const r = size * 0.35;
                ctx.beginPath();
                ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (enemyType === 'bakuda') {
            // Bomb-like fuse
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.3);
            ctx.lineTo(3, -size * 0.4);
            ctx.stroke();
            ctx.fillStyle = '#FF6600';
            ctx.beginPath();
            ctx.arc(3, -size * 0.42, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(0, size * 0.32, size * 0.25, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    // ---- Boss ----
    drawBoss(ctx, x, y, size, bossType, hp, maxHp, time) {
        ctx.save();
        ctx.translate(x + size/2, y + size/2);

        const boss = B.Data.bossTypes[bossType];
        const colors = boss ? boss.colors : { body: '#660000', eyes: '#ff0' };

        // Shake when hit
        const shake = (hp < maxHp && Math.sin(time * 30) > 0.8) ? 2 : 0;
        ctx.translate(shake, 0);

        // Large body
        ctx.fillStyle = colors.body;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
        ctx.fill();

        // Horns
        if (boss && boss.horns) {
            ctx.fillStyle = colors.horns || colors.body;
            ctx.beginPath();
            ctx.moveTo(-size * 0.2, -size * 0.35);
            ctx.lineTo(-size * 0.3, -size * 0.55);
            ctx.lineTo(-size * 0.1, -size * 0.35);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(size * 0.2, -size * 0.35);
            ctx.lineTo(size * 0.3, -size * 0.55);
            ctx.lineTo(size * 0.1, -size * 0.35);
            ctx.fill();
        }

        // Eyes
        ctx.fillStyle = colors.eyes || '#ff0';
        ctx.fillRect(-8, -6, 6, 6);
        ctx.fillRect(3, -6, 6, 6);
        ctx.fillStyle = '#000';
        ctx.fillRect(-6, -4, 3, 3);
        ctx.fillRect(5, -4, 3, 3);

        // Mouth
        ctx.fillStyle = '#300';
        ctx.fillRect(-6, 4, 12, 5);
        // Teeth
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(-5 + i * 3, 4, 2, 2);
        }

        // HP bar
        const barW = size * 0.6;
        ctx.fillStyle = '#333';
        ctx.fillRect(-barW/2, -size * 0.48, barW, 4);
        ctx.fillStyle = hp > maxHp * 0.3 ? '#ff3333' : '#ff0000';
        ctx.fillRect(-barW/2, -size * 0.48, barW * (hp / maxHp), 4);

        ctx.restore();
    },

    // ---- Soft block destruction effect ----
    drawBlockBreak(ctx, x, y, size, progress, theme) {
        const t = theme || 'classic';
        const colors = B.Data.stageThemes[t] || B.Data.stageThemes.classic;
        const numPieces = 6;

        for (let i = 0; i < numPieces; i++) {
            const angle = (i / numPieces) * Math.PI * 2;
            const dist = progress * size * 0.6;
            const px = x + size/2 + Math.cos(angle) * dist;
            const py = y + size/2 + Math.sin(angle) * dist - progress * size * 0.3;
            const ps = size * 0.15 * (1 - progress);
            const alpha = 1 - progress;

            ctx.fillStyle = colors.softBlock;
            ctx.globalAlpha = alpha;
            ctx.fillRect(px - ps/2, py - ps/2, ps, ps);
        }
        ctx.globalAlpha = 1;
    },

    // ---- Particles ----
    drawParticle(ctx, x, y, type, progress) {
        const alpha = 1 - progress;
        switch (type) {
            case 'smoke':
                ctx.fillStyle = `rgba(100,100,100,${alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(x, y - progress * 20, 3 + progress * 5, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'spark':
                ctx.fillStyle = `rgba(255,200,50,${alpha})`;
                ctx.fillRect(x - 1, y - 1, 2, 2);
                break;
            case 'star':
                ctx.fillStyle = `rgba(255,255,100,${alpha})`;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(progress * Math.PI);
                ctx.fillRect(-2, -2, 4, 4);
                ctx.restore();
                break;
        }
    },

    // ---- Minimap for stage select ----
    drawMiniMap(ctx, w, h, stageId) {
        const stage = B.Data.stages[stageId];
        const theme = stage ? stage.theme : 'classic';
        const colors = B.Data.stageThemes[theme] || B.Data.stageThemes.classic;
        const tileW = w / B.C.COLS;
        const tileH = h / B.C.ROWS;

        // Background
        ctx.fillStyle = colors.floor1;
        ctx.fillRect(0, 0, w, h);

        // Generate a preview pattern
        for (let r = 0; r < B.C.ROWS; r++) {
            for (let c = 0; c < B.C.COLS; c++) {
                if (r === 0 || r === B.C.ROWS - 1 || c === 0 || c === B.C.COLS - 1) {
                    ctx.fillStyle = colors.hardBlock;
                    ctx.fillRect(c * tileW, r * tileH, tileW, tileH);
                } else if (r % 2 === 0 && c % 2 === 0) {
                    ctx.fillStyle = colors.hardBlock;
                    ctx.fillRect(c * tileW, r * tileH, tileW, tileH);
                } else if (((r * 7 + c * 13) % 3) !== 0) {
                    ctx.fillStyle = colors.softBlock;
                    ctx.fillRect(c * tileW, r * tileH, tileW, tileH);
                }
            }
        }
    }
};