/* ========================================
   BOMBERMAN SS — Menu System
   Title, Character/Stage Select, Battle Config,
   World Map, Pause, Options, Results
   ======================================== */

B.Menus = {
    overlay: null,
    currentMenu: null,
    menuIndex: 0,
    maxIndex: 0,
    selectedChars: { 1: 'white' },
    selectedStage: 'classic',
    numAI: 3,
    selectedWorld: 0,
    options: { sfx: true, music: true, scanlines: false, difficulty: 'normal' },
    _prevMenu: 'title',
    _scrollTimer: 0,
    _menuRepeatActive: false,
    _lastConfirmTime: 0,

    init() {
        this.overlay = document.getElementById('menu-overlay');
        // Event delegation for all menu clicks — attached once
        this.overlay.addEventListener('click', (e) => {
            const el = e.target.closest('[data-menu-idx]');
            if (el) {
                this.menuIndex = parseInt(el.dataset.menuIdx);
                this.highlightItem();
                B.Audio.playSfx('menuMove');
                this.handleConfirm();
            }
        });
    },

    update(dt) {
        if (!this.currentMenu) return;

        // Allow first press immediately; use timer only for auto-repeat
        this._scrollTimer += dt;
        const canAct = this._scrollTimer >= 0.12;

        const up    = B.Input.menuUp();
        const down  = B.Input.menuDown();
        const left  = B.Input.menuLeft();
        const right = B.Input.menuRight();
        const confirm = B.Input.menuConfirm();
        const back  = B.Input.menuBack();

        // Directional: act immediately, then throttle repeats
        if (up || down || left || right) {
            if (!canAct && this._menuRepeatActive) return;
            this._menuRepeatActive = true;
            if (canAct) this._scrollTimer = 0;
            if (up) {
                this.menuIndex = Math.max(0, this.menuIndex - 1);
                this.highlightItem();
                B.Audio.playSfx('menuMove');
            }
            if (down) {
                this.menuIndex = Math.min(this.maxIndex, this.menuIndex + 1);
                this.highlightItem();
                B.Audio.playSfx('menuMove');
            }
            if (left) this.handleLeft();
            if (right) this.handleRight();
        } else {
            this._menuRepeatActive = false;
        }

        // Confirm: debounce
        if (confirm) {
            const now = performance.now();
            if (now - this._lastConfirmTime > 300) {
                this._lastConfirmTime = now;
                this.handleConfirm();
            }
        }
        if (back) {
            const now = performance.now();
            if (now - this._lastConfirmTime > 300) {
                this._lastConfirmTime = now;
                this.handleBack();
            }
        }
    },

    show(menuId) {
        this.currentMenu = menuId;
        this.menuIndex = 0;

        switch (menuId) {
            case 'title': this.renderTitle(); break;
            case 'charSelect': this.renderCharSelect(); break;
            case 'stageSelect': this.renderStageSelect(); break;
            case 'battleConfig': this.renderBattleConfig(); break;
            case 'worldMap': this.renderWorldMap(); break;
            case 'pause': this.renderPause(); break;
            case 'results': this.renderResults(); break;
            case 'gameOver': this.renderGameOver(); break;
            case 'victory': this.renderVictory(); break;
            case 'options': this.renderOptions(); break;
        }

        this.overlay.classList.add('active');
    },

    hide() {
        this.currentMenu = null;
        this.overlay.innerHTML = '';
        this.overlay.classList.remove('active');
    },

    highlightItem() {
        const items = this.overlay.querySelectorAll('[data-menu-idx]');
        items.forEach((el, i) => {
            if (i === this.menuIndex) {
                el.classList.add('selected');
                if (!el.classList.contains('char-card') && !el.classList.contains('stage-card') && !el.classList.contains('world-node')) {
                    // Scroll into view if needed
                }
            } else {
                el.classList.remove('selected');
            }
        });
    },

    handleLeft() {
        if (this.currentMenu === 'battleConfig') {
            if (this.menuIndex === 0 && this.numAI > 1) {
                this.numAI--;
                B.Audio.playSfx('menuMove');
                this.renderBattleConfig();
            }
        } else if (this.currentMenu === 'options') {
            this.changeOption(-1);
        }
    },

    handleRight() {
        if (this.currentMenu === 'battleConfig') {
            if (this.menuIndex === 0 && this.numAI < 9) {
                this.numAI++;
                B.Audio.playSfx('menuMove');
                this.renderBattleConfig();
            }
        } else if (this.currentMenu === 'options') {
            this.changeOption(1);
        }
    },

    handleConfirm() {
        B.Audio.playSfx('menuSelect');

        switch (this.currentMenu) {
            case 'title':
                if (this.menuIndex === 0) {
                    B.Game.mode = 'normal';
                    this.show('worldMap');
                } else if (this.menuIndex === 1) {
                    B.Game.mode = 'battle';
                    this.show('charSelect');
                } else if (this.menuIndex === 2) {
                    B.Game.mode = 'master';
                    this.show('charSelect');
                } else if (this.menuIndex === 3) {
                    this._prevMenu = 'title';
                    this.show('options');
                }
                break;

            case 'charSelect': {
                const chars = Object.keys(B.Data.characters);
                this.selectedChars[1] = chars[this.menuIndex] || 'white';
                if (B.Game.mode === 'battle') {
                    this.show('stageSelect');
                } else if (B.Game.mode === 'master') {
                    this.show('stageSelect');
                } else {
                    // Normal mode - go directly
                    this.hide();
                    B.Game.startNormal(this.selectedWorld, 0, this.selectedChars[1]);
                    B.Audio.playMusic('battle');
                }
                break;
            }

            case 'stageSelect': {
                const stages = Object.keys(B.Data.stages);
                this.selectedStage = stages[this.menuIndex] || 'classic';
                if (B.Game.mode === 'battle') {
                    this.show('battleConfig');
                } else {
                    this.hide();
                    B.Game.startMaster(this.selectedStage, this.selectedChars[1]);
                    B.Audio.playMusic('battle');
                }
                break;
            }

            case 'battleConfig':
                this.hide();
                B.Game.startBattle(this.selectedStage, this.selectedChars[1], this.numAI);
                B.Audio.playMusic('battle');
                break;

            case 'worldMap':
                this.selectedWorld = this.menuIndex;
                this.show('charSelect');
                break;

            case 'pause':
                if (this.menuIndex === 0) B.Game.togglePause();
                else if (this.menuIndex === 1) { this._prevMenu = 'pause'; this.show('options'); }
                else if (this.menuIndex === 2) {
                    this.hide();
                    B.Audio.stopMusic();
                    B.Game.state = B.C.STATE.TITLE;
                    B.Game.current = null;
                    this.show('title');
                }
                break;

            case 'results':
                if (B.Game.mode === 'battle' && B.Game.roundNum < B.Game.maxRounds) {
                    // Next round
                    this.hide();
                    const players = B.Game.current.players;
                    players.forEach(p => {
                        p.alive = true;
                        p.deathTimer = 0;
                        p.deathAnimDone = false;
                        p.invincible = B.C.INVINCIBLE_TIME;
                        p.bombsPlaced = 0;
                        p.cureDisease();
                        const pos = B.Data.startingPositions[(p.id - 1) % B.Data.startingPositions.length];
                        p.tileX = pos.x; p.tileY = pos.y;
                        p.subX = pos.x * B.C.TILE;
                        p.subY = pos.y * B.C.TILE;
                    });
                    B.Game.startRound(B.Game.stage, players);
                    B.Audio.playMusic('battle');
                } else {
                    this.hide();
                    B.Audio.stopMusic();
                    B.Game.state = B.C.STATE.TITLE;
                    B.Game.current = null;
                    this.show('title');
                }
                break;

            case 'gameOver':
            case 'victory':
                this.hide();
                B.Audio.stopMusic();
                B.Game.state = B.C.STATE.TITLE;
                B.Game.current = null;
                this.show('title');
                break;

            case 'options':
                this.show(this._prevMenu || 'title');
                break;
        }
    },

    handleBack() {
        B.Audio.playSfx('menuMove');
        switch (this.currentMenu) {
            case 'charSelect': this.show('title'); break;
            case 'stageSelect': this.show('charSelect'); break;
            case 'battleConfig': this.show('stageSelect'); break;
            case 'worldMap': this.show('title'); break;
            case 'options': this.show(this._prevMenu || 'title'); break;
            default: this.show('title'); break;
        }
    },

    changeOption(dir) {
        const keys = Object.keys(this.options);
        const key = keys[this.menuIndex];
        if (!key) return;
        switch (key) {
            case 'sfx': this.options.sfx = !this.options.sfx; break;
            case 'music':
                this.options.music = !this.options.music;
                if (!this.options.music) B.Audio.stopMusic();
                break;
            case 'scanlines':
                this.options.scanlines = !this.options.scanlines;
                document.getElementById('scanlines').style.display = this.options.scanlines ? 'block' : 'none';
                break;
            case 'difficulty':
                const d = ['easy', 'normal', 'hard'];
                let idx = d.indexOf(this.options.difficulty);
                idx = B.Utils.clamp(idx + dir, 0, 2);
                this.options.difficulty = d[idx];
                break;
        }
        B.Audio.playSfx('menuMove');
        this.renderOptions();
    },

    // ====== Render Functions ======

    renderTitle() {
        this.maxIndex = 3;
        this.overlay.innerHTML = `
            <div class="menu-container title-screen fade-in">
                <h1>BOMBERMAN SS</h1>
                <div class="subtitle">SATURN REMAKE</div>
                <div class="title-menu">
                    <div class="menu-item selected" data-menu-idx="0">NORMAL GAME</div>
                    <div class="menu-item" data-menu-idx="1">BATTLE GAME</div>
                    <div class="menu-item" data-menu-idx="2">MASTER GAME</div>
                    <div class="menu-item" data-menu-idx="3">OPTIONS</div>
                </div>
                <div style="margin-top:40px;font-size:0.45rem;color:#555;letter-spacing:1px;">
                    ↑↓ Naviguer &nbsp; Entrée Sélectionner &nbsp; Échap Retour
                </div>
            </div>`;
        if (!B.Audio.currentMusic) B.Audio.playMusic('title');
    },

    renderCharSelect() {
        const chars = B.Data.characters;
        const keys = Object.keys(chars);
        this.maxIndex = keys.length - 1;
        this.menuIndex = Math.max(0, keys.indexOf(this.selectedChars[1]));

        this.overlay.innerHTML = `
            <div class="menu-container character-select fade-in">
                <h2>CHOIX DU PERSONNAGE</h2>
                <p style="font-size:0.5rem;color:#999;margin-bottom:18px;">
                    Joueur 1 — Choisissez votre combattant
                </p>
                <div class="char-grid">
                    ${keys.map((key, i) => {
                        const c = chars[key];
                        return `
                        <div class="char-card ${i === this.menuIndex ? 'selected' : ''}"
                             data-menu-idx="${i}" data-char="${key}">
                            <canvas class="char-preview" data-char="${key}" width="48" height="48"></canvas>
                            <div class="char-name">${c.name}</div>
                            <div class="char-type">${c.type}</div>
                        </div>`;
                    }).join('')}
                </div>
                <div style="font-size:0.4rem;color:#666;margin-top:14px;">
                    B= Bombes &nbsp; F= Feu &nbsp; Sp= Vitesse &nbsp; Stats de base du personnage
                </div>
            </div>`;

        // Draw character previews
        requestAnimationFrame(() => {
            this.overlay.querySelectorAll('.char-preview').forEach(canvas => {
                const charId = canvas.dataset.char;
                const ctx2 = canvas.getContext('2d');
                ctx2.imageSmoothingEnabled = false;
                B.Sprites.drawCharacter(ctx2, charId, 0, B.C.DIR.DOWN, 0, 0, 48, false);
            });
        });
    },

    renderStageSelect() {
        const stages = B.Data.stages;
        const keys = Object.keys(stages);
        this.maxIndex = keys.length - 1;
        this.menuIndex = Math.max(0, keys.indexOf(this.selectedStage));

        this.overlay.innerHTML = `
            <div class="menu-container stage-select fade-in">
                <h2>CHOIX DU TERRAIN</h2>
                <div class="stage-grid">
                    ${keys.map((key, i) => {
                        const s = stages[key];
                        return `
                        <div class="stage-card ${i === this.menuIndex ? 'selected' : ''}"
                             data-menu-idx="${i}" data-stage="${key}">
                            <canvas class="stage-preview" data-stage="${key}" width="90" height="78"></canvas>
                            <div class="stage-name">${s.name}</div>
                            <div class="stage-feature">${s.feature}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;

        requestAnimationFrame(() => {
            this.overlay.querySelectorAll('.stage-preview').forEach(canvas => {
                const ctx2 = canvas.getContext('2d');
                ctx2.imageSmoothingEnabled = false;
                B.Sprites.drawMiniMap(ctx2, 90, 78, canvas.dataset.stage);
            });
        });
    },

    renderBattleConfig() {
        this.maxIndex = 1;
        this.overlay.innerHTML = `
            <div class="menu-container battle-config fade-in">
                <h2>CONFIGURATION BATAILLE</h2>
                <div style="margin-bottom:20px;">
                    <div class="config-row" data-menu-idx="0">
                        <label>ADVERSAIRES IA</label>
                        <div class="config-arrows">
                            <button onclick="B.Menus.numAI=Math.max(1,B.Menus.numAI-1);B.Menus.renderBattleConfig();">◀</button>
                            <div class="config-value">${this.numAI}</div>
                            <button onclick="B.Menus.numAI=Math.min(9,B.Menus.numAI+1);B.Menus.renderBattleConfig();">▶</button>
                        </div>
                    </div>
                    <div class="config-row" data-menu-idx="1">
                        <label>MANCHES</label>
                        <div class="config-value">Meilleur des 3</div>
                    </div>
                    <div class="config-row">
                        <label>TEMPS LIMITE</label>
                        <div class="config-value">3:00</div>
                    </div>
                </div>
                <div class="menu-nav">
                    <button class="primary" onclick="B.Menus.handleConfirm()">COMMENCER!</button>
                    <button onclick="B.Menus.handleBack()">RETOUR</button>
                </div>
            </div>`;
    },

    renderWorldMap() {
        const worlds = B.Data.worlds;
        this.maxIndex = worlds.length - 1;
        this.menuIndex = Math.min(this.selectedWorld, this.maxIndex);

        this.overlay.innerHTML = `
            <div class="menu-container world-map fade-in">
                <h2>CARTE DU MONDE</h2>
                <div class="world-nodes">
                    ${worlds.map((w, i) => {
                        const boss = B.Data.bossTypes[w.boss];
                        return `
                        <div class="world-node ${i === this.menuIndex ? 'current' : ''} ${i > this.selectedWorld + 1 ? 'locked' : ''}"
                             data-menu-idx="${i}">
                            <div class="world-number">W${i + 1}</div>
                            <div class="world-info">
                                <div class="world-name">${w.name}</div>
                                <div class="world-desc">${w.desc} — ${w.stages} stages | Boss: ${boss ? boss.name : '?'}</div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
                <div class="menu-nav">
                    <button class="primary" onclick="B.Menus.handleConfirm()">ENTRER</button>
                    <button onclick="B.Menus.handleBack()">RETOUR</button>
                </div>
            </div>`;
    },

    renderPause() {
        this.maxIndex = 2;
        this.overlay.innerHTML = `
            <div class="menu-container pause-screen fade-in">
                <h2>PAUSE</h2>
                <div class="title-menu">
                    <div class="menu-item selected" data-menu-idx="0">REPRENDRE</div>
                    <div class="menu-item" data-menu-idx="1">OPTIONS</div>
                    <div class="menu-item" data-menu-idx="2">QUITTER</div>
                </div>
            </div>`;
    },

    renderResults() {
        const gs = B.Game.current;
        if (!gs) { this.show('title'); return; }

        const sorted = gs.players.slice().sort((a, b) => {
            if (a.placeInRound && b.placeInRound) return a.placeInRound - b.placeInRound;
            if (a.alive && !b.alive) return -1;
            if (!a.alive && b.alive) return 1;
            return b.score - a.score;
        });

        const winnerName = gs.winner ? (B.Data.characters[gs.winner.charId] || {}).name || 'P' + gs.winner.id : null;

        this.maxIndex = 0;
        this.overlay.innerHTML = `
            <div class="menu-container results-screen fade-in">
                <h2>${gs.winner ? (gs.winner.isAI ? 'DÉFAITE!' : 'VICTOIRE!') : 'ÉGALITÉ!'}</h2>
                ${winnerName ? `<p style="font-size:0.7rem;color:#FFD700;margin-bottom:20px;">${winnerName} gagne!</p>` : ''}
                <div class="results-players">
                    ${sorted.map((p, i) => {
                        const cd = B.Data.characters[p.charId] || {};
                        const rank = i === 0 ? '1er' : (i + 1) + 'e';
                        const isW = p === gs.winner;
                        return `
                        <div class="result-row ${isW ? 'winner' : ''}">
                            <div class="rank">${rank}</div>
                            <div class="result-name">${cd.name || 'P' + p.id} ${p.isAI ? '(CPU)' : '(Vous)'}</div>
                            <div class="result-score">K:${p.kills} S:${p.score}</div>
                        </div>`;
                    }).join('')}
                </div>
                <div class="menu-nav">
                    <button class="primary" onclick="B.Menus.handleConfirm()">
                        ${B.Game.mode === 'battle' && B.Game.roundNum < B.Game.maxRounds ? 'MANCHE SUIVANTE' : 'RETOUR'}
                    </button>
                </div>
            </div>`;

        if (gs.winner && !gs.winner.isAI) B.Audio.playMusic('victory');
    },

    renderGameOver() {
        this.maxIndex = 0;
        const info = B.Game.mode === 'normal'
            ? `Monde ${B.Game.worldNum + 1} — Stage ${B.Game.stageNum + 1}`
            : `Manche ${B.Game.roundNum}`;

        this.overlay.innerHTML = `
            <div class="menu-container fade-in" style="text-align:center;">
                <h2 style="color:#FF3333;font-size:2rem;margin-bottom:20px;">GAME OVER</h2>
                <p style="font-size:0.6rem;color:#888;margin-bottom:30px;">${info}</p>
                <div class="menu-nav">
                    <button onclick="B.Menus.handleConfirm()">RETOUR</button>
                </div>
            </div>`;
    },

    renderVictory() {
        this.maxIndex = 0;
        const p = B.Game.current ? B.Game.current.players.find(p2 => p2.id === 1) : null;

        this.overlay.innerHTML = `
            <div class="menu-container fade-in" style="text-align:center;">
                <h2 style="color:#FFD700;font-size:2rem;margin-bottom:20px;">FÉLICITATIONS!</h2>
                <p style="font-size:0.8rem;color:#FFD700;margin-bottom:8px;">Vous avez sauvé le monde!</p>
                <p style="font-size:0.65rem;color:#aaa;margin-bottom:30px;">Score final: ${p ? p.score : 0}</p>
                <div class="menu-nav">
                    <button onclick="B.Menus.handleConfirm()">RETOUR</button>
                </div>
            </div>`;
        B.Audio.playMusic('victory');
    },

    renderOptions() {
        const optKeys = Object.keys(this.options);
        this.maxIndex = optKeys.length - 1;

        this.overlay.innerHTML = `
            <div class="menu-container options-screen fade-in">
                <h2>OPTIONS</h2>
                <div>
                    ${optKeys.map((key, i) => {
                        const labels = { sfx: 'Effets sonores', music: 'Musique', scanlines: 'Lignes de scan (Rétro)', difficulty: 'Difficulté' };
                        const val = key === 'difficulty' ? this.options[key].toUpperCase() : (this.options[key] ? 'OUI' : 'NON');
                        return `
                        <div class="option-row ${i === this.menuIndex ? 'selected' : ''}" data-menu-idx="${i}">
                            <div class="option-label">${labels[key] || key}</div>
                            <div class="option-value">${val}</div>
                        </div>`;
                    }).join('')}
                </div>
                <div style="font-size:0.4rem;color:#555;margin-top:16px;">
                    ←→ pour changer les options &nbsp; Échap pour retour
                </div>
            </div>`;
    },

    showPause() { this.show('pause'); },
    hidePause() { this.hide(); },
    showGameOver() { this.show('gameOver'); },
    showResults() {
        if (B.Game.mode === 'normal' && B.Game.current &&
            B.Game.current.players.find(p => p.id === 1 && p.alive)) {
            this.show('victory');
        } else {
            this.show('results');
        }
    },
    showVictory() { this.show('victory'); },
    showWorldMap() { this.show('worldMap'); }
};