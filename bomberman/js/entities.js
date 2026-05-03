/* ========================================
   BOMBERMAN SS — Entity System
   Player, Bomb, Explosion, PowerUp, Enemy, Boss
   ======================================== */

B.Entities = {

    // ---- Player ----
    Player: class {
        constructor(id, charId, posX, posY, isAI = false) {
            this.id = id;
            this.charId = charId;
            this.isAI = isAI;

            // Tile position (integer grid)
            this.tileX = posX;
            this.tileY = posY;

            // Sub-pixel position (for smooth movement)
            this.subX = posX * B.C.TILE;
            this.subY = posY * B.C.TILE;

            // Movement
            this.speed = B.C.DEFAULT_SPEED; // tiles/sec
            this.direction = B.C.DIR.DOWN;
            this.moving = false;
            this.animFrame = 0;
            this.animTimer = 0;

            // Stats
            this.maxBombs = B.C.DEFAULT_BOMBS;
            this.fireRange = B.C.DEFAULT_FIRE;
            this.bombsPlaced = 0;

            // Abilities
            this.hasKick = false;
            this.hasPunch = false;
            this.hasRemote = false;
            this.hasWallPass = false;
            this.hasBombPass = false;
            this.bombType = 'normal';
            this.remoteBombs = [];

            // Status
            this.alive = true;
            this.invincible = 0;
            this.vestTimer = 0;
            this.disease = null;
            this.diseaseTimer = 0;
            this.reversed = false;
            this.autoBombTimer = 0;

            // Score & Kills
            this.score = 0;
            this.kills = 0;
            this.placeInRound = 0;

            // AI
            this.aiTarget = null;
            this.aiThinkTimer = 0;
            this.aiState = 'wander';
            this.aiDangerMap = null;
            this.aiMoveTimer = 0;

            // Death
            this.deathTimer = 0;
            this.deathAnimDone = false;

            // Apply character stats
            if (B.Data.characters[charId]) {
                const stats = B.Data.characters[charId].stats;
                this.maxBombs = stats.bombs;
                this.fireRange = stats.fire;
                this.speed = stats.speed;
            }
        }

        update(dt, gameState) {
            if (!this.alive) {
                this.deathTimer += dt;
                if (this.deathTimer > B.C.DEATH_ANIM_TIME) this.deathAnimDone = true;
                return;
            }

            if (this.invincible > 0) this.invincible -= dt;
            if (this.vestTimer > 0) this.vestTimer -= dt;

            // Disease timer
            if (this.diseaseTimer > 0) {
                this.diseaseTimer -= dt;
                if (this.diseaseTimer <= 0) this.cureDisease();
            }

            // Auto-bomb disease
            if (this.disease && this.disease.name === 'diarrhea') {
                this.autoBombTimer += dt;
                if (this.autoBombTimer >= 0.8) {
                    this.autoBombTimer = 0;
                    this.placeBomb(gameState);
                }
            }

            // Animation
            this.animTimer += dt;
            if (this.animTimer > 1 / B.C.ANIM_SPEED) {
                this.animTimer = 0;
                this.animFrame = (this.animFrame + 1) % 4;
            }

            // AI decision
            if (this.isAI) {
                this.updateAI(dt, gameState);
            }

            // Movement: grid-aligned with smooth interpolation
            this.updateMovement(dt, gameState);
        }

        updateMovement(dt, gs) {
            const T = B.C.TILE;
            const moveAmt = this.speed * T * dt;

            // Current tile center
            const cx = this.tileX * T;
            const cy = this.tileY * T;

            // Check if player is aligned with tile center (tight epsilon)
            const aligned = Math.abs(this.subX - cx) < 1 &&
                            Math.abs(this.subY - cy) < 1;

            if (aligned) {
                // Snap to tile center
                this.subX = cx;
                this.subY = cy;
                this.tileX = Math.round(this.subX / T);
                this.tileY = Math.round(this.subY / T);

                if (!this.moving) return;

                // Determine desired movement
                const dv = B.Utils.dirVec(this.direction);
                const nextTX = this.tileX + dv.x;
                const nextTY = this.tileY + dv.y;

                // Can we move in the desired direction?
                if (this.canEnterTile(nextTX, nextTY, gs)) {
                    // Move
                    this.subX += dv.x * moveAmt;
                    this.subY += dv.y * moveAmt;
                    this.tileX = Math.round(this.subX / T);
                    this.tileY = Math.round(this.subY / T);
                }
                // If blocked, stay put (already snapped to center)
            } else {
                // Player is between tiles — keep moving toward the target tile
                if (!this.moving) {
                    // Snap back to nearest tile
                    this.subX = cx;
                    this.subY = cy;
                    return;
                }

                const dv = B.Utils.dirVec(this.direction);

                // Move toward the next tile
                this.subX += dv.x * moveAmt;
                this.subY += dv.y * moveAmt;

                // Don't overshoot the target tile center
                const targetX = (this.tileX + (dv.x > 0 ? 1 : dv.x < 0 ? -1 : 0)) * T;
                const targetY = (this.tileY + (dv.y > 0 ? 1 : dv.y < 0 ? -1 : 0)) * T;

                if (dv.x > 0 && this.subX >= targetX) this.subX = targetX;
                else if (dv.x < 0 && this.subX <= targetX) this.subX = targetX;
                if (dv.y > 0 && this.subY >= targetY) this.subY = targetY;
                else if (dv.y < 0 && this.subY <= targetY) this.subY = targetY;

                this.tileX = Math.round(this.subX / T);
                this.tileY = Math.round(this.subY / T);
            }
        }

        canEnterTile(tx, ty, gs) {
            if (tx < 0 || tx >= B.C.COLS || ty < 0 || ty >= B.C.ROWS) return false;
            const tile = gs.map[ty][tx];
            if (tile === B.C.TILE_HARD) return false;
            if (tile === B.C.TILE_SOFT && !this.hasWallPass) return false;
            if (tile === B.C.TILE_BOMB && !this.hasBombPass) {
                // Allow walking through own recently-placed bombs
                const bomb = gs.bombs.find(b => b.tileX === tx && b.tileY === ty);
                if (bomb && bomb.gracePeriod > 0 && bomb.ownerId === this.id) return true;
                return false;
            }
            if (tile === B.C.TILE_WATER) return false;
            return true;
        }

        placeBomb(gs) {
            if (this.bombsPlaced >= this.maxBombs) return false;
            const tx = this.tileX;
            const ty = this.tileY;
            if (gs.bombs.find(b => b.tileX === tx && b.tileY === ty && b.alive)) return false;
            if (gs.map[ty][tx] !== B.C.TILE_EMPTY) return false;

            const bomb = new B.Entities.Bomb(tx, ty, this.id, this.fireRange, this.bombType);
            gs.bombs.push(bomb);
            this.bombsPlaced++;
            gs.map[ty][tx] = B.C.TILE_BOMB;

            if (this.hasRemote) {
                this.remoteBombs.push(bomb);
            }
            B.Audio.playSfx('bombPlace');
            return true;
        }

        detonateRemote(gs) {
            let det = false;
            this.remoteBombs.forEach(b => { if (b.alive) { b.timer = 0; det = true; } });
            this.remoteBombs = this.remoteBombs.filter(b => b.alive);
            return det;
        }

        kickBomb(dir, gs) {
            if (!this.hasKick) return false;
            const dv = B.Utils.dirVec(dir);
            const tx = this.tileX + dv.x;
            const ty = this.tileY + dv.y;
            const bomb = gs.bombs.find(b => b.tileX === tx && b.tileY === ty && b.alive && !b.kicked);
            if (bomb) {
                bomb.kicked = true;
                bomb.kickDir = dir;
                bomb.kickSpeed = 6; // tiles per second
                bomb.kickProgress = 0;
                B.Audio.playSfx('kick');
                return true;
            }
            return false;
        }

        punchBomb(dir, gs) {
            if (!this.hasPunch) return false;
            const dv = B.Utils.dirVec(dir);
            const tx = this.tileX + dv.x;
            const ty = this.tileY + dv.y;
            const bomb = gs.bombs.find(b => b.tileX === tx && b.tileY === ty && b.alive);
            if (bomb) {
                bomb.timer = Math.min(bomb.timer, 0.1);
                B.Audio.playSfx('punch');
                return true;
            }
            return false;
        }

        pickupPowerUp(type, gs) {
            B.Audio.playSfx('powerup');
            switch (type) {
                case B.C.PU.BOMB_UP: this.maxBombs++; break;
                case B.C.PU.FIRE_UP: this.fireRange++; break;
                case B.C.PU.SPEED_UP: this.speed = Math.min(this.speed + 1, 8); break;
                case B.C.PU.FULL_FIRE: this.fireRange = B.C.COLS; break;
                case B.C.PU.BOMB_KICK: this.hasKick = true; break;
                case B.C.PU.BOMB_PUNCH: this.hasPunch = true; break;
                case B.C.PU.REMOTE: this.hasRemote = true; this.bombType = 'remote'; break;
                case B.C.PU.WALL_PASS: this.hasWallPass = true; break;
                case B.C.PU.BOMB_PASS: this.hasBombPass = true; break;
                case B.C.PU.VEST: this.vestTimer = 10; this.invincible = 10; break;
                case B.C.PU.TIMER: this.bombsPlaced = 0; break;
                case B.C.PU.CROSS_BOMB: this.bombType = 'cross'; break;
                case B.C.PU.SKULL:
                    B.Audio.playSfx('powerupBad');
                    this.applyDisease();
                    break;
            }
        }

        applyDisease() {
            const disease = B.Data.diseases[B.Utils.rand(0, B.Data.diseases.length - 1)];
            this.cureDisease();
            this.disease = disease;
            this.diseaseTimer = disease.duration;
            switch (disease.effect) {
                case 'speed': this.speed = disease.value; break;
                case 'bombs': this.maxBombs = disease.value; break;
                case 'fire': this.fireRange = disease.value; break;
                case 'controls': this.reversed = true; break;
                case 'autoBomb': this.autoBombTimer = 0; break;
            }
        }

        cureDisease() {
            if (!this.disease) return;
            const charData = B.Data.characters[this.charId];
            if (charData) {
                this.speed = charData.stats.speed;
                this.maxBombs = charData.stats.bombs;
                this.fireRange = charData.stats.fire;
            }
            this.reversed = false;
            this.disease = null;
            this.diseaseTimer = 0;
        }

        hit(gs) {
            if (this.invincible > 0 || this.vestTimer > 0) return false;
            this.alive = false;
            this.deathTimer = 0;
            B.Audio.playSfx('death');
            return true;
        }

        // ---- AI ----
        updateAI(dt, gs) {
            this.aiThinkTimer += dt;
            if (this.aiThinkTimer < B.C.AI_THINK_INTERVAL) return;
            this.aiThinkTimer = 0;

            this.buildDangerMap(gs);
            const curDanger = this.aiDangerMap[this.tileY] && this.aiDangerMap[this.tileY][this.tileX];

            this.moving = true;

            if (curDanger > 0) {
                this.aiState = 'flee';
                this.findSafeSpot(gs);
            } else if (this.bombsPlaced < this.maxBombs && B.Utils.chance(0.3)) {
                const nearEnemy = this.findNearestPlayer(gs);
                if (nearEnemy && nearEnemy.dist <= 3) {
                    this.aiState = 'attack';
                    this.moveToward(nearEnemy.tx, nearEnemy.ty, gs);
                    if (nearEnemy.dist <= 2 && curDanger === 0) {
                        this.placeBomb(gs);
                    }
                } else {
                    const nearPU = this.findNearestPowerUp(gs);
                    if (nearPU && nearPU.dist < 6) {
                        this.aiState = 'powerup';
                        this.moveToward(nearPU.tx, nearPU.ty, gs);
                    } else {
                        this.aiState = 'wander';
                        if (B.Utils.chance(0.2)) this.direction = B.Utils.rand(0, 3);
                    }
                }
            } else {
                this.aiState = 'flee';
                this.findSafeSpot(gs);
            }
        }

        buildDangerMap(gs) {
            this.aiDangerMap = B.Utils.createGrid(B.C.COLS, B.C.ROWS, 0);
            gs.bombs.forEach(bomb => {
                if (!bomb.alive) return;
                if (this.aiDangerMap[bomb.tileY]) this.aiDangerMap[bomb.tileY][bomb.tileX] = 2;
                const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
                dirs.forEach(d => {
                    for (let i = 1; i <= bomb.fireRange; i++) {
                        const tx = bomb.tileX + d.x * i;
                        const ty = bomb.tileY + d.y * i;
                        if (tx < 0 || tx >= B.C.COLS || ty < 0 || ty >= B.C.ROWS) break;
                        if (gs.map[ty][tx] === B.C.TILE_HARD) break;
                        this.aiDangerMap[ty][tx] = Math.max(this.aiDangerMap[ty][tx], 2);
                        if (gs.map[ty][tx] === B.C.TILE_SOFT) break;
                    }
                });
            });
            gs.explosions.forEach(e => {
                if (e.tileY >= 0 && e.tileY < B.C.ROWS && e.tileX >= 0 && e.tileX < B.C.COLS) {
                    this.aiDangerMap[e.tileY][e.tileX] = 3;
                }
            });
        }

        findSafeSpot(gs) {
            const dirs = [{d:B.C.DIR.UP,dx:0,dy:-1},{d:B.C.DIR.DOWN,dx:0,dy:1},
                          {d:B.C.DIR.LEFT,dx:-1,dy:0},{d:B.C.DIR.RIGHT,dx:1,dy:0}];
            for (const {d, dx, dy} of B.Utils.shuffle(dirs)) {
                const tx = this.tileX + dx;
                const ty = this.tileY + dy;
                if (tx < 0 || tx >= B.C.COLS || ty < 0 || ty >= B.C.ROWS) continue;
                if (this.aiDangerMap[ty][tx] > 0) continue;
                if (!this.canEnterTile(tx, ty, gs)) continue;
                this.direction = this.reversed ? B.Utils.oppositeDir(d) : d;
                return;
            }
        }

        findNearestPlayer(gs) {
            let best = null;
            for (const p of gs.players) {
                if (p.id === this.id || !p.alive) continue;
                const dist = B.Utils.dist(this.tileX, this.tileY, p.tileX, p.tileY);
                if (!best || dist < best.dist) best = { tx: p.tileX, ty: p.tileY, dist };
            }
            return best;
        }

        findNearestPowerUp(gs) {
            let best = null;
            for (const pu of gs.powerUps) {
                if (pu.type === B.C.PU.SKULL) continue;
                const dist = B.Utils.dist(this.tileX, this.tileY, pu.tileX, pu.tileY);
                if (!best || dist < best.dist) best = { tx: pu.tileX, ty: pu.tileY, dist };
            }
            return best;
        }

        moveToward(tx, ty, gs) {
            const dx = tx - this.tileX;
            const dy = ty - this.tileY;
            let dir;
            if (Math.abs(dx) > Math.abs(dy)) {
                dir = dx > 0 ? B.C.DIR.RIGHT : B.C.DIR.LEFT;
            } else {
                dir = dy > 0 ? B.C.DIR.DOWN : B.C.DIR.UP;
            }
            this.direction = this.reversed ? B.Utils.oppositeDir(dir) : dir;
        }
    },

    // ---- Bomb ----
    Bomb: class {
        constructor(tileX, tileY, ownerId, fireRange, bombType = 'normal') {
            this.tileX = tileX;
            this.tileY = tileY;
            this.ownerId = ownerId;
            this.fireRange = fireRange;
            this.bombType = bombType;
            this.timer = B.C.BOMB_TIMER;
            this.alive = true;
            this.gracePeriod = 0.2;
            this.kicked = false;
            this.kickDir = B.C.DIR.NONE;
            this.kickSpeed = 0;
            this.kickProgress = 0;
            this.animTimer = 0;
        }

        update(dt, gs) {
            if (!this.alive) return;
            this.gracePeriod = Math.max(0, this.gracePeriod - dt);
            this.timer -= dt;
            this.animTimer += dt;

            // Kicked bomb movement — slide tile-by-tile
            if (this.kicked) {
                const T = B.C.TILE;
                const dv = B.Utils.dirVec(this.kickDir);
                this.kickProgress = (this.kickProgress || 0) + this.kickSpeed * dt;

                while (this.kickProgress >= 1) {
                    this.kickProgress -= 1;
                    const nextTX = this.tileX + dv.x;
                    const nextTY = this.tileY + dv.y;

                    // Check if blocked
                    let blocked = false;
                    if (nextTX < 0 || nextTX >= B.C.COLS || nextTY < 0 || nextTY >= B.C.ROWS) {
                        blocked = true;
                    } else {
                        const tile = gs.map[nextTY][nextTX];
                        if (tile === B.C.TILE_HARD || tile === B.C.TILE_SOFT) blocked = true;
                        if (gs.bombs.some(b => b !== this && b.alive && b.tileX === nextTX && b.tileY === nextTY)) blocked = true;
                    }

                    if (blocked) {
                        this.kicked = false;
                        this.kickProgress = 0;
                        break;
                    } else {
                        // Move to next tile
                        gs.map[this.tileY][this.tileX] = B.C.TILE_EMPTY;
                        this.tileX = nextTX;
                        this.tileY = nextTY;
                        gs.map[this.tileY][this.tileX] = B.C.TILE_BOMB;
                    }
                }

                if (this.kicked && this.kickProgress >= 0.8) {
                    // Will settle on next tile
                    const nextTX = this.tileX + dv.x;
                    const nextTY = this.tileY + dv.y;
                    let willBlock = false;
                    if (nextTX < 0 || nextTX >= B.C.COLS || nextTY < 0 || nextTY >= B.C.ROWS) willBlock = true;
                    else if (gs.map[nextTY][nextTX] === B.C.TILE_HARD || gs.map[nextTY][nextTX] === B.C.TILE_SOFT) willBlock = true;
                    else if (gs.bombs.some(b => b !== this && b.alive && b.tileX === nextTX && b.tileY === nextTY)) willBlock = true;
                    if (willBlock) { this.kicked = false; this.kickProgress = 0; }
                }
            }

            if (this.timer <= 0) this.explode(gs);
        }

        explode(gs) {
            this.alive = false;
            if (gs.map[this.tileY] && gs.map[this.tileY][this.tileX] === B.C.TILE_BOMB) {
                gs.map[this.tileY][this.tileX] = B.C.TILE_EMPTY;
            }

            // Release owner bomb slot
            const owner = gs.players.find(p => p.id === this.ownerId);
            if (owner) {
                owner.bombsPlaced = Math.max(0, owner.bombsPlaced - 1);
                owner.remoteBombs = owner.remoteBombs.filter(b => b !== this);
            }

            // Create center explosion
            gs.explosions.push(new B.Entities.Explosion(this.tileX, this.tileY, 'center', this.ownerId));

            // Directional explosions
            const dirs = [
                {x:0,y:-1,type:'vertical'}, {x:0,y:1,type:'vertical'},
                {x:-1,y:0,type:'horizontal'}, {x:1,y:0,type:'horizontal'}
            ];

            dirs.forEach(dir => {
                const range = this.bombType === 'cross' ? B.C.COLS : this.fireRange;
                for (let i = 1; i <= range; i++) {
                    const tx = this.tileX + dir.x * i;
                    const ty = this.tileY + dir.y * i;
                    if (tx < 0 || tx >= B.C.COLS || ty < 0 || ty >= B.C.ROWS) break;

                    const tile = gs.map[ty][tx];

                    if (tile === B.C.TILE_HARD) break;

                    if (tile === B.C.TILE_SOFT) {
                        gs.explosions.push(new B.Entities.Explosion(tx, ty, dir.type, this.ownerId));
                        gs.map[ty][tx] = B.C.TILE_EMPTY;
                        this.spawnPowerUp(tx, ty, gs);
                        gs.particles.push({
                            type: 'blockBreak', x: tx, y: ty,
                            progress: 0, timer: 0.5, stage: gs.stage
                        });
                        B.Audio.playSfx('blockBreak');
                        break;
                    }

                    // Chain reaction
                    const chainBomb = gs.bombs.find(b => b.alive && b.tileX === tx && b.tileY === ty);
                    if (chainBomb) {
                        gs.explosions.push(new B.Entities.Explosion(tx, ty, dir.type, this.ownerId));
                        chainBomb.timer = Math.min(chainBomb.timer, 0.05);
                        continue;
                    }

                    gs.explosions.push(new B.Entities.Explosion(tx, ty, dir.type, this.ownerId));
                }
            });

            B.Audio.playSfx('explosion');
        }

        spawnPowerUp(tx, ty, gs) {
            if (!B.Utils.chance(0.65)) return;
            const rates = B.Data.powerUpRates;
            const roll = Math.random();
            let cumul = 0;
            for (const [type, rate] of Object.entries(rates)) {
                cumul += rate;
                if (roll < cumul) {
                    gs.powerUps.push(new B.Entities.PowerUp(tx, ty, type));
                    return;
                }
            }
        }
    },

    // ---- Explosion ----
    Explosion: class {
        constructor(tileX, tileY, type, ownerId = -1) {
            this.tileX = tileX;
            this.tileY = tileY;
            this.type = type;
            this.ownerId = ownerId;
            this.timer = 0;
            this.duration = B.C.EXPLOSION_DURATION;
            this.alive = true;
        }
        update(dt) {
            this.timer += dt;
            if (this.timer >= this.duration) this.alive = false;
        }
        getProgress() { return this.timer / this.duration; }
    },

    // ---- Power-Up ----
    PowerUp: class {
        constructor(tileX, tileY, type) {
            this.tileX = tileX;
            this.tileY = tileY;
            this.type = type;
            this.alive = true;
            this.animTimer = 0;
            this.survivedExplosion = false;
        }
        update(dt) { this.animTimer += dt; }
    },

    // ---- Enemy ----
    Enemy: class {
        constructor(type, tileX, tileY) {
            const ed = B.Data.enemyTypes[type] || B.Data.enemyTypes.balloom;
            this.type = type;
            this.tileX = tileX;
            this.tileY = tileY;
            this.subX = tileX * B.C.TILE;
            this.subY = tileY * B.C.TILE;
            this.speed = ed.speed;
            this.hp = ed.hp;
            this.maxHp = ed.hp;
            this.ai = ed.ai;
            this.score = ed.score;
            this.alive = true;
            this.direction = B.Utils.rand(0, 3);
            this.thinkTimer = 0;
            this.animFrame = 0;
            this.animTimer = 0;
            this.hitTimer = 0;
        }

        update(dt, gs) {
            if (!this.alive) return;
            this.animTimer += dt;
            if (this.animTimer > 1/6) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }
            this.hitTimer = Math.max(0, this.hitTimer - dt);

            this.thinkTimer += dt;
            if (this.thinkTimer >= 0.5) {
                this.thinkTimer = 0;
                this.think(gs);
            }

            // Move
            const T = B.C.TILE;
            const moveAmt = this.speed * T * dt;
            const dv = B.Utils.dirVec(this.direction);
            const nx = this.subX + dv.x * moveAmt;
            const ny = this.subY + dv.y * moveAmt;
            const ntx = Math.floor(nx / T);
            const nty = Math.floor(ny / T);

            if (ntx >= 0 && ntx < B.C.COLS && nty >= 0 && nty < B.C.ROWS) {
                const tile = gs.map[nty][ntx];
                if (tile !== B.C.TILE_HARD && tile !== B.C.TILE_SOFT && tile !== B.C.TILE_BOMB && tile !== B.C.TILE_WATER) {
                    this.subX = nx;
                    this.subY = ny;
                    this.tileX = Math.round(this.subX / T);
                    this.tileY = Math.round(this.subY / T);
                } else {
                    this.direction = B.Utils.rand(0, 3);
                }
            } else {
                this.direction = B.Utils.rand(0, 3);
            }
        }

        think(gs) {
            switch (this.ai) {
                case 'random':
                    if (B.Utils.chance(0.3)) this.direction = B.Utils.rand(0, 3);
                    break;
                case 'chase': {
                    const p = gs.players.find(p2 => p2.alive && !p2.isAI);
                    if (p && B.Utils.dist(this.tileX, this.tileY, p.tileX, p.tileY) <= 5) {
                        const dx = p.tileX - this.tileX;
                        const dy = p.tileY - this.tileY;
                        this.direction = Math.abs(dx) > Math.abs(dy) ?
                            (dx > 0 ? B.C.DIR.RIGHT : B.C.DIR.LEFT) :
                            (dy > 0 ? B.C.DIR.DOWN : B.C.DIR.UP);
                    } else if (B.Utils.chance(0.3)) {
                        this.direction = B.Utils.rand(0, 3);
                    }
                    break;
                }
                case 'smart': {
                    const p = gs.players.find(p2 => p2.alive);
                    if (p && B.Utils.chance(0.5)) {
                        const dx = p.tileX - this.tileX;
                        const dy = p.tileY - this.tileY;
                        this.direction = Math.abs(dx) > Math.abs(dy) ?
                            (dx > 0 ? B.C.DIR.RIGHT : B.C.DIR.LEFT) :
                            (dy > 0 ? B.C.DIR.DOWN : B.C.DIR.UP);
                    }
                    break;
                }
            }
        }
    },

    // ---- Boss ----
    Boss: class {
        constructor(type, tileX, tileY) {
            const bd = B.Data.bossTypes[type] || B.Data.bossTypes.bulldozer;
            this.type = type;
            this.tileX = tileX;
            this.tileY = tileY;
            this.x = tileX * B.C.TILE;
            this.y = tileY * B.C.TILE;
            this.hp = bd.hp;
            this.maxHp = bd.hp;
            this.speed = bd.speed;
            this.score = bd.score;
            this.pattern = bd.pattern;
            this.alive = true;
            this.direction = B.C.DIR.DOWN;
            this.thinkTimer = 0;
            this.attackTimer = 0;
            this.invulnerable = 0;
            this.animTimer = 0;
            this.size = B.C.TILE * 1.5;
        }

        update(dt, gs) {
            if (!this.alive) return;
            this.animTimer += dt;
            this.thinkTimer += dt;
            this.attackTimer += dt;
            this.invulnerable = Math.max(0, this.invulnerable - dt);

            const T = B.C.TILE;
            if (this.thinkTimer > 1.5) {
                this.thinkTimer = 0;
                const p = gs.players.find(p2 => p2.alive);
                if (p) {
                    const dx = p.tileX - this.tileX;
                    const dy = p.tileY - this.tileY;
                    this.direction = Math.abs(dx) > Math.abs(dy) ?
                        (dx > 0 ? B.C.DIR.RIGHT : B.C.DIR.LEFT) :
                        (dy > 0 ? B.C.DIR.DOWN : B.C.DIR.UP);
                }
            }

            const dv = B.Utils.dirVec(this.direction);
            const spd = this.speed * T * dt;
            this.x = B.Utils.clamp(this.x + dv.x * spd, T, (B.C.COLS - 2) * T);
            this.y = B.Utils.clamp(this.y + dv.y * spd, T, (B.C.ROWS - 2) * T);
            this.tileX = Math.floor(this.x / T);
            this.tileY = Math.floor(this.y / T);

            if (this.attackTimer > 3.0) {
                this.attackTimer = 0;
                this.bossAttack(gs);
            }
        }

        bossAttack(gs) {
            const T = B.C.TILE;
            switch (this.pattern) {
                case 'charge':
                    this.speed = 4;
                    setTimeout(() => { if (this.alive) this.speed = 1; }, 1500);
                    break;
                case 'breathFire': {
                    const dv = B.Utils.dirVec(this.direction);
                    for (let i = 1; i <= 4; i++) {
                        const tx = this.tileX + dv.x * i;
                        const ty = this.tileY + dv.y * i;
                        if (tx >= 0 && tx < B.C.COLS && ty >= 0 && ty < B.C.ROWS) {
                            gs.explosions.push(new B.Entities.Explosion(tx, ty, 'center'));
                        }
                    }
                    B.Audio.playSfx('explosion');
                    break;
                }
                case 'teleport':
                    this.tileX = B.Utils.rand(2, B.C.COLS - 3);
                    this.tileY = B.Utils.rand(2, B.C.ROWS - 3);
                    this.x = this.tileX * T;
                    this.y = this.tileY * T;
                    break;
                case 'missiles':
                    [B.C.DIR.UP, B.C.DIR.DOWN, B.C.DIR.LEFT, B.C.DIR.RIGHT].forEach(d => {
                        const dv = B.Utils.dirVec(d);
                        const tx = this.tileX + dv.x;
                        const ty = this.tileY + dv.y;
                        if (tx >= 0 && tx < B.C.COLS && ty >= 0 && ty < B.C.ROWS && gs.map[ty][tx] === B.C.TILE_EMPTY) {
                            const b = new B.Entities.Bomb(tx, ty, -1, 2);
                            b.timer = 1.5;
                            gs.bombs.push(b);
                            gs.map[ty][tx] = B.C.TILE_BOMB;
                        }
                    });
                    break;
                case 'all': {
                    const atks = ['charge', 'breathFire', 'teleport', 'missiles'];
                    const savedPattern = this.pattern;
                    this.pattern = atks[B.Utils.rand(0, atks.length - 1)];
                    this.bossAttack(gs);
                    this.pattern = savedPattern;
                    break;
                }
            }
        }

        takeDamage(amount) {
            if (this.invulnerable > 0) return;
            this.hp = Math.max(0, this.hp - amount);
            this.invulnerable = 0.5;
            if (this.hp <= 0) this.alive = false;
            B.Audio.playSfx('bossHit');
        }
    }
};