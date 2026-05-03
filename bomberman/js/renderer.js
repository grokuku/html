/* ========================================
   BOMBERMAN SS — Renderer
   Main canvas rendering pipeline
   ======================================== */

B.Renderer = {
    ctx: null, canvas: null,

    init() {
        this.canvas = B.Engine.canvas;
        this.ctx = B.Engine.ctx;
    },

    render(dt) {
        const ctx = this.ctx;
        if (!ctx) return;

        ctx.save();

        const gs = B.Game.current;
        const inGamePlay = (B.Game.state === B.C.STATE.PLAYING ||
                            B.Game.state === B.C.STATE.COUNTDOWN ||
                            B.Game.state === B.C.STATE.PAUSED);

        if (inGamePlay && gs) {
            this.renderGame(ctx, gs, dt);
        } else {
            this.renderMenuBackground(ctx, dt);
        }

        ctx.restore();
    },

    renderGame(ctx, gs, dt) {
        const T = B.C.TILE;
        const W = B.C.COLS * T;
        const H = B.C.ROWS * T;
        const theme = B.Data.stages[gs.stage] ? B.Data.stages[gs.stage].theme : 'classic';
        const colors = B.Data.stageThemes[theme] || B.Data.stageThemes.classic;
        const time = B.Engine.currentTime;

        // Clear
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, W, H);

        // Floor
        for (let r = 0; r < B.C.ROWS; r++) {
            for (let c = 0; c < B.C.COLS; c++) {
                const x = c * T, y = r * T;
                const tile = gs.map[r][c];
                if (tile === B.C.TILE_WATER) {
                    this.drawWater(ctx, x, y, T, time);
                } else {
                    B.Sprites.drawFloor(ctx, x, y, T, theme);
                }
            }
        }

        // Soft blocks
        for (let r = 0; r < B.C.ROWS; r++) {
            for (let c = 0; c < B.C.COLS; c++) {
                if (gs.map[r][c] === B.C.TILE_SOFT) {
                    B.Sprites.drawSoftBlock(ctx, c * T, r * T, T, theme);
                }
            }
        }

        // Hard blocks
        for (let r = 0; r < B.C.ROWS; r++) {
            for (let c = 0; c < B.C.COLS; c++) {
                if (gs.map[r][c] === B.C.TILE_HARD) {
                    B.Sprites.drawHardBlock(ctx, c * T, r * T, T, theme);
                }
            }
        }

        // Hazards
        gs.hazards.forEach(h => {
            const x = h.x * T, y = h.y * T;
            if (h.type === 'lava') this.drawLava(ctx, x, y, T, time, h.timer / 2);
            else if (h.type === 'gas') this.drawGas(ctx, x, y, T, time, h.timer / 8);
        });

        // Power-ups
        gs.powerUps.forEach(pu => {
            if (pu.alive) B.Sprites.drawPowerUp(ctx, pu.tileX * T, pu.tileY * T, T, pu.type, time);
        });

        // Bombs
        gs.bombs.forEach(b => {
            if (b.alive) {
                // When kicked, render at interpolated position
                let bx = b.tileX, by = b.tileY;
                if (b.kicked && b.kickProgress > 0) {
                    const dv = B.Utils.dirVec(b.kickDir);
                    bx = b.tileX + dv.x * b.kickProgress;
                    by = b.tileY + dv.y * b.kickProgress;
                }
                B.Sprites.drawBomb(ctx, bx * T, by * T, T, b.timer, b.bombType);
            }
        });

        // Explosions
        gs.explosions.forEach(e => {
            if (e.alive) B.Sprites.drawExplosion(ctx, e.tileX * T, e.tileY * T, T, e.getProgress(), e.type);
        });

        // Enemies
        gs.enemies.forEach(e => {
            if (e.alive) B.Sprites.drawEnemy(ctx, e.subX, e.subY, T, e.type, e.animFrame, time);
        });

        // Boss
        if (gs.boss && gs.boss.alive) {
            B.Sprites.drawBoss(ctx, gs.boss.x - T * 0.25, gs.boss.y - T * 0.25,
                T * 1.5, gs.boss.type, gs.boss.hp, gs.boss.maxHp, time);
        }

        // Players (draw alive first, then death anims)
        gs.players.forEach(p => {
            if (!p.alive) {
                if (!p.deathAnimDone) {
                    B.Sprites.drawDeath(ctx, p.subX, p.subY, T,
                        p.deathTimer / B.C.DEATH_ANIM_TIME, p.charId);
                }
                return;
            }
            const flash = p.invincible > 0 || p.vestTimer > 0;
            B.Sprites.drawCharacter(ctx, p.charId, p.animFrame, p.direction,
                p.subX, p.subY, T, flash);

            // Disease indicator
            if (p.disease) {
                ctx.fillStyle = '#ff0';
                ctx.font = '8px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText('☠', p.subX + T/2, p.subY - 4);
            }

            // Vest aura
            if (p.vestTimer > 0) {
                ctx.strokeStyle = 'rgba(255,215,0,0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(p.subX + T/2, p.subY + T/2, T * 0.6, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Player label
            ctx.fillStyle = p.isAI ? '#aaa' : '#FFD700';
            ctx.font = '6px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(p.isAI ? 'CPU' : 'P' + p.id, p.subX + T/2, p.subY - 5);
        });

        // Block break particles
        gs.particles.forEach(p => {
            if (p.type === 'blockBreak') {
                B.Sprites.drawBlockBreak(ctx, p.x * T, p.y * T, T, p.progress, p.stage);
            }
        });

        // Sandstorm overlay
        if (gs.sandstormActive) this.drawSandstorm(ctx, time);

        // Conveyor indicators
        if (B.Data.stages[gs.stage] && B.Data.stages[gs.stage].hazardType === 'conveyor') {
            this.drawConveyors(ctx, time);
        }

        // Countdown overlay
        if (B.Game.state === B.C.STATE.COUNTDOWN) {
            const count = Math.ceil(B.Game.countdownTimer);
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(0, 0, W, H);
            
            if (count > 0 && count <= 3) {
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 56px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(255,215,0,0.5)';
                ctx.shadowBlur = 20;
                ctx.fillText(count, W / 2, H / 2);
                ctx.shadowBlur = 0;
            }
            
            if (B.Game.countdownTimer <= 0.5 && B.Game.countdownTimer > -0.5) {
                const alpha = Math.min(1, (0.5 - B.Game.countdownTimer) * 2);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#FF6600';
                ctx.font = 'bold 40px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('FIGHT!', W / 2, H / 2);
                ctx.globalAlpha = 1;
            }
        }

        // In-game messages
        B.Game.messages.forEach(m => {
            const alpha = Math.min(1, m.timer);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#000';
            ctx.font = 'bold 16px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(m.text, W / 2 + 2, H / 3 + 2);
            ctx.fillStyle = '#FFD700';
            ctx.fillText(m.text, W / 2, H / 3);
            ctx.restore();
        });

        // Sudden death flash
        if (gs.suddenDeath && Math.sin(time * 6) > 0) {
            ctx.fillStyle = 'rgba(255,0,0,0.08)';
            ctx.fillRect(0, 0, W, H);
        }

        // HUD
        this.drawHUD(ctx, gs);
    },

    drawHUD(ctx, gs) {
        const T = B.C.TILE;
        const W = B.C.COLS * T;

        // HUD bar at top
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, W, 34);
        ctx.fillStyle = 'rgba(255,215,0,0.15)';
        ctx.fillRect(0, 32, W, 2);

        // Timer
        const timeStr = this.formatTime(B.Game.gameTime);
        ctx.fillStyle = B.Game.gameTime <= 30 ? '#FF3333' : '#FFD700';
        ctx.font = '11px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(timeStr, W / 2, 22);

        // Mode / Round
        ctx.fillStyle = '#888';
        ctx.font = '7px "Press Start 2P"';
        ctx.textAlign = 'left';
        if (B.Game.mode === 'battle') ctx.fillText('ROUND ' + B.Game.roundNum + '/' + B.Game.maxRounds, 8, 22);
        else if (B.Game.mode === 'master') ctx.fillText('WAVE ' + (B.Game.roundNum + 1), 8, 22);
        else if (B.Game.mode === 'normal') {
            ctx.fillText('W' + (B.Game.worldNum + 1) + '-S' + (B.Game.stageNum + 1), 8, 22);
        }

        // Normal: enemies/boss
        if (B.Game.mode === 'normal') {
            const alive = gs.enemies.filter(e => e.alive).length;
            ctx.fillStyle = '#ff6';
            ctx.font = '7px "Press Start 2P"';
            ctx.textAlign = 'left';
            ctx.fillText('ENEMY: ' + alive, 8, 12);
            if (gs.boss && gs.boss.alive) {
                ctx.fillStyle = '#f66';
                ctx.fillText('BOSS: ' + gs.boss.hp + '/' + gs.boss.maxHp, 80, 12);
            }
        }

        // Player 1 stats
        const p1 = gs.players.find(p => p.id === 1);
        if (p1) {
            ctx.textAlign = 'right';
            ctx.fillStyle = '#FFD700';
            ctx.font = '7px "Press Start 2P"';
            ctx.fillText('P1', W - 8, 10);
            ctx.fillStyle = '#fff';
            ctx.fillText('B:' + p1.maxBombs + ' F:' + p1.fireRange + ' Sp:' + p1.speed, W - 8, 20);
            ctx.fillStyle = '#FFD700';
            ctx.fillText(p1.score + 'pts  K:' + p1.kills, W - 8, 30);

            // Abilities
            let abX = W - 160;
            const abils = [];
            if (p1.hasKick) abils.push('K');
            if (p1.hasPunch) abils.push('P');
            if (p1.hasRemote) abils.push('R');
            if (p1.hasWallPass) abils.push('W');
            if (p1.hasBombPass) abils.push('BP');
            if (abils.length > 0) {
                ctx.fillStyle = '#0af';
                ctx.font = '6px "Press Start 2P"';
                ctx.fillText(abils.join(' '), abX, 10);
            }
        }

        // AI count alive
        const aliveAI = gs.players.filter(p => p.isAI && p.alive).length;
        const totalAI = gs.players.filter(p => p.isAI).length;
        ctx.fillStyle = '#888';
        ctx.font = '7px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('CPU: ' + aliveAI + '/' + totalAI, W / 2, 10);
    },

    drawWater(ctx, x, y, size, time) {
        const wave = Math.sin(time * 3 + x * 0.05) * 3;
        ctx.fillStyle = '#3388cc';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#55aaee';
        ctx.fillRect(x, y + wave + size * 0.3, size, 3);
        ctx.fillRect(x, y + wave + size * 0.6, size, 2);
    },

    drawLava(ctx, x, y, size, time, life) {
        const alpha = Math.min(1, life);
        ctx.fillStyle = `rgba(255,80,0,${alpha * 0.5})`;
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = `rgba(255,200,0,${alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(x + size/2 + Math.sin(time * 5) * 5, y + size/2, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    },

    drawGas(ctx, x, y, size, time, life) {
        const alpha = Math.min(1, life) * 0.5;
        ctx.fillStyle = `rgba(100,200,50,${alpha})`;
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size * 0.4 * life, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 3; i++) {
            const bx = x + size * 0.3 + i * size * 0.2;
            const by = y + Math.sin(time * 2 + i) * size * 0.2 + size * 0.5;
            ctx.fillStyle = `rgba(150,255,100,${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(bx, by, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    drawSandstorm(ctx, time) {
        const W = B.C.COLS * B.C.TILE;
        const H = B.C.ROWS * B.C.TILE;
        ctx.fillStyle = 'rgba(200,180,130,0.35)';
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 50; i++) {
            const px = (time * 100 + i * 37) % W;
            const py = (i * 23 + Math.sin(time + i) * 30) % H;
            ctx.fillStyle = 'rgba(220,200,150,0.6)';
            ctx.fillRect(px, py, 2, 1);
        }
    },

    drawConveyors(ctx, time) {
        const T = B.C.TILE;
        [3, 6, 9].forEach(r => {
            const dir = r % 2 === 0 ? 1 : -1;
            for (let c = 1; c < B.C.COLS - 1; c++) {
                ctx.strokeStyle = 'rgba(255,255,0,0.2)';
                ctx.lineWidth = 1;
                const x = c * T;
                const y = r * T;
                ctx.beginPath();
                const off = (time * 15 * dir) % 12;
                ctx.moveTo(x + 8 + off, y + T/2);
                ctx.lineTo(x + 14 + off, y + T/2 - 4);
                ctx.moveTo(x + 8 + off, y + T/2);
                ctx.lineTo(x + 14 + off, y + T/2 + 4);
                ctx.stroke();
            }
        });
    },

    renderMenuBackground(ctx, dt) {
        const W = B.C.COLS * B.C.TILE;
        const H = B.C.ROWS * B.C.TILE;
        const time = B.Engine.currentTime;

        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, W, H);

        // Animated grid
        ctx.strokeStyle = 'rgba(255,107,53,0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= B.C.COLS; i++) {
            ctx.beginPath();
            ctx.moveTo(i * B.C.TILE, 0);
            ctx.lineTo(i * B.C.TILE, H);
            ctx.stroke();
        }
        for (let i = 0; i <= B.C.ROWS; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * B.C.TILE);
            ctx.lineTo(W, i * B.C.TILE);
            ctx.stroke();
        }

        // Floating bombs
        for (let i = 0; i < 5; i++) {
            const bx = ((time * 25 + i * 180) % (W + 100)) - 50;
            const by = H - 55 + Math.sin(time * 1.5 + i * 2) * 8;
            B.Sprites.drawBomb(ctx, bx, by, 28, time + i, 'normal');
        }

        // Particle stars
        for (let i = 0; i < 40; i++) {
            const sx = (i * 73 + time * 3) % W;
            const sy = (i * 41 + i * i * 7) % H;
            const alpha = Math.sin(time * 2 + i) * 0.3 + 0.4;
            ctx.fillStyle = `rgba(255,215,0,${alpha})`;
            ctx.fillRect(sx, sy, 2, 2);
        }

        // Subtle glow center
        const gradient = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W/2);
        gradient.addColorStop(0, 'rgba(255,107,53,0.05)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m + ':' + s.toString().padStart(2, '0');
    }
};