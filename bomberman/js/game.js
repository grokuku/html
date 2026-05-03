/* ========================================
   BOMBERMAN SS — Game Logic
   State management, modes, rounds, collision
   ======================================== */

B.Game = {
    state: B.C.STATE.LOADING,
    mode: null,
    stage: null,
    worldNum: 0,
    stageNum: 0,
    roundNum: 0,
    maxRounds: 3,
    timeLimit: 180,
    gameTimer: 0,
    gameTime: 0,
    countdownTimer: 0,
    messages: [],
    _lastCount: 4,
    _stageCompleteTimer: 0,
    _gameOverTimer: 0,

    current: null,

    init() {
        this.state = B.C.STATE.TITLE;
    },

    createGameState(stageId, players, enemies, isBoss) {
        const map = B.Data.generateMap(stageId, this.worldNum, this.stageNum);
        // Clear tiles at enemy spawn points so they don't start inside soft blocks
        (enemies || []).forEach(en => {
            if (en.tileX >= 0 && en.tileX < B.C.COLS && en.tileY >= 0 && en.tileY < B.C.ROWS) {
                map[en.tileY][en.tileX] = B.C.TILE_EMPTY;
            }
        });
        return {
            stage: stageId,
            map: map,
            players: players,
            bombs: [],
            explosions: [],
            powerUps: [],
            enemies: enemies || [],
            boss: isBoss ? this.createBoss() : null,
            hazards: [],
            particles: [],
            waterLevel: 0,
            sandstormActive: false,
            sandstormTimer: 0,
            hazardTimer: 0,
            gameOver: false,
            winner: null,
            paused: false,
            frozen: false,
            suddenDeath: false,
            suddenDeathTimer: 0
        };
    },

    createBoss() {
        const world = B.Data.worlds[this.worldNum];
        if (!world) return null;
        return new B.Entities.Boss(world.boss, Math.floor(B.C.COLS / 2), Math.floor(B.C.ROWS / 2));
    },

    // ---- Start Modes ----
    startBattle(stageId, charId, numAI) {
        this.mode = 'battle';
        this.stage = stageId;
        this.roundNum = 0;

        const players = [];
        const positions = B.Data.startingPositions;

        // Player 1
        const p1 = new B.Entities.Player(1, charId, positions[0].x, positions[0].y, false);
        p1.invincible = B.C.INVINCIBLE_TIME;
        players.push(p1);

        // AI players
        const aiChars = Object.keys(B.Data.characters).filter(c => c !== charId);
        for (let i = 0; i < numAI; i++) {
            const ci = aiChars[i % aiChars.length];
            const pos = positions[(i + 1) % positions.length];
            const ai = new B.Entities.Player(i + 2, ci, pos.x, pos.y, true);
            ai.invincible = B.C.INVINCIBLE_TIME;
            players.push(ai);
        }

        this.startRound(stageId, players);
    },

    startNormal(worldNum, stageNum, charId) {
        this.mode = 'normal';
        this.worldNum = worldNum;
        this.stageNum = stageNum;

        const world = B.Data.worlds[worldNum];
        if (!world) return;

        const isBoss = (stageNum === world.stages - 1);
        const stageId = world.theme;
        const positions = B.Data.startingPositions;

        const players = [];
        const p1 = new B.Entities.Player(1, charId, positions[0].x, positions[0].y, false);
        p1.invincible = B.C.INVINCIBLE_TIME;
        players.push(p1);

        // Enemies
        const enemies = [];
        const diffMult = { easy: 0.7, normal: 1.0, hard: 1.3 }[B.Menus.options.difficulty] || 1.0;
        const numEnemies = Math.min(Math.floor((2 + stageNum) * diffMult), 10);
        for (let i = 0; i < numEnemies; i++) {
            const et = world.enemies[B.Utils.rand(0, world.enemies.length - 1)];
            let ex, ey, tries = 0;
            do {
                ex = B.Utils.rand(3, B.C.COLS - 4);
                ey = B.Utils.rand(3, B.C.ROWS - 4);
                tries++;
            } while (B.Utils.dist(ex, ey, positions[0].x, positions[0].y) < 4 && tries < 20);
            const enemy = new B.Entities.Enemy(et, ex, ey);
            enemy.speed *= diffMult;
            enemies.push(enemy);
        }

        this.current = this.createGameState(stageId, players, enemies, isBoss);
        this.gameTimer = 0;
        this.startCountdown();
    },

    startMaster(stageId, charId) {
        this.mode = 'master';
        this.stage = stageId;
        this.roundNum = 0;

        const positions = B.Data.startingPositions;
        const players = [];
        const p1 = new B.Entities.Player(1, charId, positions[0].x, positions[0].y, false);
        p1.invincible = B.C.INVINCIBLE_TIME;
        players.push(p1);

        const numAI = 3;
        const aiChars = Object.keys(B.Data.characters);
        for (let i = 0; i < numAI; i++) {
            const ci = aiChars[B.Utils.rand(0, aiChars.length - 1)];
            const pos = positions[(i + 1) % positions.length];
            const ai = new B.Entities.Player(i + 2, ci, pos.x, pos.y, true);
            ai.invincible = B.C.INVINCIBLE_TIME;
            players.push(ai);
        }

        this.startRound(stageId, players);
    },

    startRound(stageId, players) {
        this.roundNum++;
        this.current = this.createGameState(stageId, players, [], false);
        this.gameTimer = 0;
        this.startCountdown();
    },

    startCountdown() {
        this.state = B.C.STATE.COUNTDOWN;
        this.countdownTimer = 3.9;
        this._lastCount = 4;
        this.gameTime = this.timeLimit;
        if (this.current) this.current.frozen = true;
    },

    // ---- Update ----
    update(dt) {
        if (this.state === B.C.STATE.COUNTDOWN) {
            this.countdownTimer -= dt;
            const count = Math.ceil(this.countdownTimer);
            if (count !== this._lastCount && count > 0 && count <= 3) {
                B.Audio.playSfx('countdown');
                this._lastCount = count;
            }
            if (this.countdownTimer <= 0) {
                this.state = B.C.STATE.PLAYING;
                if (this.current) this.current.frozen = false;
                B.Audio.playSfx('go');
            }
            return;
        }

        if (this.state !== B.C.STATE.PLAYING) return;
        const gs = this.current;
        if (!gs) return;

        // Game over timer runs even when gameOver is true
        if (gs.gameOver) {
            this._gameOverTimer += dt;
            if (this._gameOverTimer > 2.5) {
                if (this.mode === 'normal') {
                    const aliveEnemies = gs.enemies.filter(e => e.alive).length;
                    const bossAlive = gs.boss && gs.boss.alive;
                    const p1Alive = gs.players.find(p => p.id === 1 && p.alive);
                    if (aliveEnemies === 0 && !bossAlive && p1Alive) {
                        this.advanceNormalStage();
                    } else {
                        this.showGameOver();
                    }
                } else {
                    this.showResults();
                }
            }
            // Still update messages during game over
            this.messages = this.messages.filter(m => { m.timer -= dt; return m.timer > 0; });
            return;
        }

        if (gs.paused) return;

        this.gameTimer += dt;
        this.gameTime = Math.max(0, this.timeLimit - this.gameTimer);

        // Handle player 1 input
        this.handlePlayerInput(1, gs);

        // Escape for pause
        if (B.Input.isPressed('menu', 1)) {
            this.togglePause();
            return;
        }

        // Update all entities
        gs.players.forEach(p => p.update(dt, gs));
        gs.bombs.forEach(b => b.update(dt, gs));
        gs.bombs = gs.bombs.filter(b => b.alive);
        gs.explosions.forEach(e => e.update(dt));
        gs.explosions = gs.explosions.filter(e => e.alive);
        gs.powerUps.forEach(p => p.update(dt));
        gs.powerUps = gs.powerUps.filter(p => p.alive);
        gs.enemies.forEach(e => e.update(dt, gs));
        gs.enemies = gs.enemies.filter(e => e.alive);
        if (gs.boss) gs.boss.update(dt, gs);

        // Particles
        gs.particles.forEach(p => { p.timer -= dt; p.progress += dt / 0.5; });
        gs.particles = gs.particles.filter(p => p.timer > 0);

        // Hazards
        gs.hazards = gs.hazards.filter(h => { h.timer -= dt; return h.timer > 0; });

        // Collisions
        this.checkCollisions(gs);

        // Stage hazards
        this.updateHazards(dt, gs);

        // Sandstorm
        if (gs.sandstormActive) {
            gs.sandstormTimer -= dt;
            if (gs.sandstormTimer <= 0) gs.sandstormActive = false;
        }

        // Check win/lose
        this.checkGameEnd(dt, gs);
        if (gs.gameOver) {
            this.messages = this.messages.filter(m => { m.timer -= dt; return m.timer > 0; });
            return;
        }

        // Sudden death
        if (this.gameTime <= 30 && !gs.suddenDeath) {
            gs.suddenDeath = true;
            this.addMessage('SUDDEN DEATH!');
        }
        if (gs.suddenDeath) {
            gs.suddenDeathTimer += dt;
            if (gs.suddenDeathTimer > 1.5) {
                gs.suddenDeathTimer = 0;
                const rx = B.Utils.rand(1, B.C.COLS - 2);
                const ry = B.Utils.rand(1, B.C.ROWS - 2);
                if (gs.map[ry][rx] === B.C.TILE_EMPTY) {
                    gs.bombs.push(new B.Entities.Bomb(rx, ry, -1, 3));
                    gs.map[ry][rx] = B.C.TILE_BOMB;
                }
            }
        }

        // Messages
        this.messages = this.messages.filter(m => { m.timer -= dt; return m.timer > 0; });
    },

    checkCollisions(gs) {
        // Player vs Explosion
        gs.players.forEach(player => {
            if (!player.alive) return;
            gs.explosions.forEach(exp => {
                if (exp.tileX === player.tileX && exp.tileY === player.tileY) {
                    if (player.hit(gs)) {
                        if (exp.ownerId >= 0) {
                            const killer = gs.players.find(p => p.id === exp.ownerId);
                            if (killer && killer.id !== player.id) {
                                killer.kills++;
                                killer.score += 200;
                            }
                        }
                    }
                }
            });
        });

        // Player vs Power-up
        gs.players.forEach(player => {
            if (!player.alive) return;
            gs.powerUps.forEach(pu => {
                if (!pu.alive) return;
                if (pu.tileX === player.tileX && pu.tileY === player.tileY) {
                    pu.alive = false;
                    player.pickupPowerUp(pu.type, gs);
                    player.score += 50;
                }
            });
        });

        // Player vs Enemy
        gs.players.forEach(player => {
            if (!player.alive) return;
            gs.enemies.forEach(enemy => {
                if (!enemy.alive) return;
                if (B.Utils.dist(player.tileX, player.tileY, enemy.tileX, enemy.tileY) < 1) {
                    player.hit(gs);
                }
            });
        });

        // Player vs Boss
        if (gs.boss && gs.boss.alive) {
            gs.players.forEach(player => {
                if (!player.alive) return;
                const dx = Math.abs(player.subX - gs.boss.x);
                const dy = Math.abs(player.subY - gs.boss.y);
                if (dx < B.C.TILE * 0.7 && dy < B.C.TILE * 0.7) {
                    player.hit(gs);
                }
            });
        }

        // Explosion vs Enemy
        gs.explosions.forEach(exp => {
            gs.enemies.forEach(enemy => {
                if (!enemy.alive) return;
                if (exp.tileX === enemy.tileX && exp.tileY === enemy.tileY) {
                    enemy.hp--;
                    if (enemy.hp <= 0) {
                        enemy.alive = false;
                        const nearest = gs.players.find(p => p.alive && !p.isAI) || gs.players.find(p => p.alive);
                        if (nearest) nearest.score += enemy.score;
                        if (B.Utils.chance(0.4)) {
                            const puTypes = Object.keys(B.Data.powerUpRates);
                            gs.powerUps.push(new B.Entities.PowerUp(enemy.tileX, enemy.tileY,
                                puTypes[B.Utils.rand(0, puTypes.length - 1)]));
                        }
                    }
                }
            });

            // Explosion vs Boss
            if (gs.boss && gs.boss.alive) {
                if (exp.tileX === gs.boss.tileX && exp.tileY === gs.boss.tileY) {
                    gs.boss.takeDamage(1);
                }
            }

            // Explosion vs Power-up
            gs.powerUps.forEach(pu => {
                if (!pu.alive) return;
                if (exp.tileX === pu.tileX && exp.tileY === pu.tileY) {
                    if (pu.type === B.C.PU.SKULL && !pu.survivedExplosion) {
                        pu.survivedExplosion = true;
                    } else {
                        pu.alive = false;
                    }
                }
            });
        });

        // Hazard vs Player
        gs.players.forEach(player => {
            if (!player.alive) return;
            gs.hazards.forEach(h => {
                if (h.x === player.tileX && h.y === player.tileY) {
                    if (h.type === 'lava' || h.type === 'gas') player.hit(gs);
                }
            });
        });
    },

    updateHazards(dt, gs) {
        const stage = B.Data.stages[gs.stage];
        if (!stage || !stage.hazardType || stage.hazardInterval === 0) return;
        if (['slippery', 'lowgravity', 'conveyor'].includes(stage.hazardType)) return;

        gs.hazardTimer = (gs.hazardTimer || 0) + dt;
        if (gs.hazardTimer >= stage.hazardInterval) {
            gs.hazardTimer = 0;
            B.Data.applyHazard(gs.stage, gs);
        }
    },

    checkGameEnd(dt, gs) {
        const alive = gs.players.filter(p => p.alive);
        const aliveEnemies = gs.enemies.filter(e => e.alive);

        if (this.mode === 'normal') {
            if (!gs.players.find(p => p.id === 1 && p.alive)) {
                if (!gs.gameOver) {
                    gs.gameOver = true;
                    this.addMessage('GAME OVER');
                    this._gameOverTimer = 0;
                }
                return;
            }
            if (aliveEnemies.length === 0 && (!gs.boss || !gs.boss.alive)) {
                if (!gs.gameOver) {
                    gs.gameOver = true;
                    this.addMessage('STAGE CLEAR!');
                    this._stageCompleteTimer = 0;
                    B.Audio.playSfx('win');
                    const p = gs.players.find(p2 => p2.id === 1);
                    if (p) p.score += 1000;
                    // Stage complete - show results after delay
                    this._gameOverTimer = 0;
                }
                return;
            }
        }

        if (this.mode === 'battle') {
            if (alive.length <= 1 && !gs.gameOver) {
                gs.gameOver = true;
                this._gameOverTimer = 0;
                if (alive.length === 1) {
                    gs.winner = alive[0];
                    alive[0].score += 1000;
                    let place = 2;
                    gs.players.filter(p => p !== alive[0])
                        .sort((a, b) => b.kills - a.kills)
                        .forEach(p => { p.placeInRound = place++; });
                    alive[0].placeInRound = 1;
                } else {
                    gs.winner = null;
                }
                if (alive[0] && !alive[0].isAI) B.Audio.playSfx('win');
            }
        }

        if (this.mode === 'master') {
            const aliveAI = alive.filter(p => p.isAI);
            if (aliveAI.length === 0 && alive.length > 0 && !gs.gameOver) {
                // Next wave
                this.roundNum++;
                const positions = B.Data.startingPositions;
                const aiChars = Object.keys(B.Data.characters);
                const newAI = Math.min(3 + this.roundNum, 9);
                for (let i = 0; i < newAI; i++) {
                    const ci = aiChars[B.Utils.rand(0, aiChars.length - 1)];
                    const pos = positions[(gs.players.length + i) % positions.length];
                    const ai = new B.Entities.Player(gs.players.length + i + 1, ci, pos.x, pos.y, true);
                    ai.invincible = B.C.INVINCIBLE_TIME;
                    ai.speed += this.roundNum * 0.2;
                    ai.maxBombs += this.roundNum;
                    ai.fireRange += Math.floor(this.roundNum / 2);
                    gs.players.push(ai);
                }
                this.addMessage('WAVE ' + (this.roundNum + 1));
            }

            if (!gs.players.find(p => p.id === 1 && p.alive) && !gs.gameOver) {
                gs.gameOver = true;
                this._gameOverTimer = 0;
                this.addMessage('GAME OVER');
            }
        }
    },

    advanceNormalStage() {
        this.stageNum++;
        const world = B.Data.worlds[this.worldNum];
        if (!world) return;
        if (this.stageNum >= world.stages) {
            this.worldNum++;
            this.stageNum = 0;
            if (this.worldNum >= B.Data.worlds.length) {
                this.showVictory();
                return;
            }
        }
        B.Menus.showWorldMap();
    },

    showGameOver() {
        this.state = B.C.STATE.GAME_OVER;
        B.Menus.show('gameOver');
    },

    showVictory() {
        this.state = B.C.STATE.VICTORY;
        B.Menus.showResults();
    },

    showResults() {
        this.state = B.C.STATE.RESULTS;
        B.Menus.showResults();
    },

    addMessage(text) {
        this.messages.push({ text, timer: 2.5 });
    },

    handlePlayerInput(playerId, gs) {
        const player = gs.players.find(p => p.id === playerId);
        if (!player || !player.alive) return;

        let dir = B.C.DIR.NONE;
        let moving = false;

        if (B.Input.isDown('up', playerId))    { dir = B.C.DIR.UP; moving = true; }
        else if (B.Input.isDown('down', playerId))  { dir = B.C.DIR.DOWN; moving = true; }
        else if (B.Input.isDown('left', playerId))  { dir = B.C.DIR.LEFT; moving = true; }
        else if (B.Input.isDown('right', playerId)) { dir = B.C.DIR.RIGHT; moving = true; }

        if (player.reversed && dir !== B.C.DIR.NONE) dir = B.Utils.oppositeDir(dir);

        player.direction = dir;
        player.moving = moving;

        if (B.Input.isPressed('bomb', playerId)) {
            if (player.hasRemote && player.remoteBombs.length > 0) {
                player.detonateRemote(gs);
            } else {
                player.placeBomb(gs);
            }
        }
        if (B.Input.isPressed('kick', playerId)) player.kickBomb(player.direction, gs);
        if (B.Input.isPressed('punch', playerId)) player.punchBomb(player.direction, gs);
    },

    togglePause() {
        if (this.state === B.C.STATE.PLAYING) {
            this.state = B.C.STATE.PAUSED;
            if (this.current) this.current.paused = true;
            B.Menus.showPause();
        } else if (this.state === B.C.STATE.PAUSED) {
            this.state = B.C.STATE.PLAYING;
            if (this.current) this.current.paused = false;
            B.Menus.hidePause();
        }
    }
};