// ===== MAIN GAME LOOP & STATE =====

const Game = {
    state: 'title', // title, charSelect, playing, dead, victory
    player: { x: 3, y: 2, dir: DIR.SOUTH },
    party: [],
    selectedChampions: [],
    currentLevel: null,
    currentLevelIndex: 0,
    lastTime: 0,
    animFrame: null,
    foodTimer: 0,

    init() {
        TextureGen.init();
        DungeonMaps.init();
        SpellSystem.init();
        Input.init();
        UI.init();
        Renderer.init();
        Combat.init();

        // Title screen animation
        this.animateTitleScreen();

        UI.addMessage('Welcome to the Dungeon.', 'gold');
    },

    animateTitleScreen() {
        const canvas = document.getElementById('title-bg');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const animate = () => {
            if (this.state !== 'title') return;

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const t = Date.now() * 0.001;
            const w = canvas.width, h = canvas.height;

            // Dark background with floating particles
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(0, 0, w, h);

            // Dungeon walls effect
            for (let i = 0; i < 50; i++) {
                const x = (Math.sin(t * 0.3 + i * 1.7) * 0.5 + 0.5) * w;
                const y = (Math.cos(t * 0.2 + i * 2.1) * 0.5 + 0.5) * h;
                const size = 2 + Math.sin(t + i) * 1.5;
                const alpha = 0.1 + Math.sin(t * 0.5 + i) * 0.05;
                ctx.fillStyle = `rgba(212,160,48,${alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Fog effect
            const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
            gradient.addColorStop(0, 'rgba(20,15,30,0)');
            gradient.addColorStop(1, 'rgba(5,5,10,0.8)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);

            requestAnimationFrame(animate);
        };
        animate();
    },

    newGame() {
        this.selectedChampions = [];
        this.party = [];
        UI.buildCharacterSelect();
        UI.showScreen('char-screen');
        this.state = 'charSelect';
        this.updateStartButton();
    },

    loadGame() {
        try {
            const saved = localStorage.getItem('dungeon_master_save');
            if (!saved) {
                UI.addMessage('No saved game found.', 'warning');
                return;
            }
            const data = JSON.parse(saved);
            this.party = data.party;
            this.currentLevelIndex = data.levelIndex;
            this.currentLevel = DungeonMaps.getLevel(this.currentLevelIndex);
            this.player = data.player;
            // Restore level map state
            if (data.levelMap) {
                this.currentLevel.map = data.levelMap;
            }
            this.startPlaying();
        } catch (e) {
            UI.addMessage('Failed to load game.', 'warning');
        }
    },

    saveGame() {
        try {
            const data = {
                party: this.party,
                player: this.player,
                levelIndex: this.currentLevelIndex,
                levelMap: this.currentLevel.map,
            };
            localStorage.setItem('dungeon_master_save', JSON.stringify(data));
            UI.addMessage('Game saved.', 'info');
        } catch (e) {
            UI.addMessage('Failed to save.', 'warning');
        }
    },

    toggleChampion(classId) {
        const idx = this.selectedChampions.indexOf(classId);
        if (idx >= 0) {
            this.selectedChampions.splice(idx, 1);
        } else if (this.selectedChampions.length < MAX_PARTY_SIZE) {
            this.selectedChampions.push(classId);
        }
        this.updateStartButton();
    },

    updateStartButton() {
        const btn = document.getElementById('btn-start');
        if (btn) {
            if (this.selectedChampions.length > 0) {
                btn.classList.add('ready');
            } else {
                btn.classList.remove('ready');
            }
        }

        // Update party preview
        const preview = document.getElementById('party-preview');
        if (preview) {
            preview.innerHTML = '';
            if (this.selectedChampions.length > 0) {
                const label = document.createElement('span');
                label.style.color = 'var(--text-secondary)';
                label.style.fontSize = '13px';
                label.textContent = 'Party: ';
                preview.appendChild(label);
                this.selectedChampions.forEach(classId => {
                    const cls = CHAMPION_CLASSES.find(c => c.id === classId);
                    if (cls) {
                        const chip = document.createElement('span');
                        chip.className = 'party-chip';
                        chip.textContent = cls.icon + ' ' + cls.name;
                        chip.style.cssText = 'display:inline-block;margin:4px;padding:4px 10px;background:var(--bg-panel-light);border:1px solid var(--gold);border-radius:4px;color:var(--gold);font-size:12px;';
                        preview.appendChild(chip);
                    }
                });
            }
        }
    },

    startGame() {
        if (this.selectedChampions.length === 0) {
            UI.addMessage('Select at least one champion first!', 'warning');
            const btn = document.getElementById('btn-start');
            if (btn) {
                btn.classList.remove('shake');
                void btn.offsetWidth;
                btn.classList.add('shake');
            }
            return;
        }

        // Regenerate fresh level data
        DungeonMaps.init();
        Combat.init();
        this.selectedChampions.forEach(classId => {
            const cls = CHAMPION_CLASSES.find(c => c.id === classId);
            if (cls) {
                const champion = ChampionDefs.createFromClass(cls);
                // Give starting items
                champion.inventory.push(ItemDefs.createItem('bread'));
                champion.inventory.push(ItemDefs.createItem('bread'));
                champion.inventory.push(ItemDefs.createItem('health_potion'));
                this.party.push(champion);
            }
        });

        this.currentLevelIndex = 0;
        this.currentLevel = DungeonMaps.getLevel(0);
        this.player = {
            x: this.currentLevel.startX + 0.5,
            y: this.currentLevel.startY + 0.5,
            dir: this.currentLevel.startDir
        };

        // Mark area around start as visited
        this.markVisited();

        this.startPlaying();
    },

    startPlaying() {
        this.state = 'playing';
        cancelAnimationFrame(this.animFrame);
        UI.showScreen('game-screen');
        UI.updatePartyBar();
        Combat.init();
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    },

    gameLoop(timestamp) {
        if (this.state !== 'playing') return;

        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        this.animFrame = requestAnimationFrame((t) => this.gameLoop(t));
    },

    update(dt) {
        // Food/hunger
        this.foodTimer += dt;
        if (this.foodTimer >= 30) { // Every 30 seconds
            this.foodTimer = 0;
            this.party.forEach(c => {
                if (c.alive) {
                    c.food = Math.max(0, c.food - 1);
                    if (c.food <= 0) {
                        c.hp = Math.max(0, c.hp - 2);
                        if (c.hp <= 0) {
                            c.alive = false;
                            UI.addMessage(`${c.name} died of starvation!`, 'damage');
                        }
                    }
                }
            });
        }

        // Champion regeneration
        this.party.forEach(c => {
            if (c.alive) {
                // HP regen if well-fed
                if (c.food > 50) {
                    c.hp = Math.min(c.maxHp, c.hp + 0.1);
                }
                // Stamina regen
                c.stamina = Math.min(c.maxStamina, c.stamina + 0.2);
                // Mana regen
                c.mana = Math.min(c.maxMana, c.mana + 0.1);

                // Remove temp defense over time
                if (c._tempDefense) {
                    c._tempDefense *= 0.99;
                    if (c._tempDefense < 0.1) c._tempDefense = 0;
                }
            }
        });

        // Combat
        Combat.update(dt);

        // Throttled UI updates (a few times per second)
        this._uiTimer = (this._uiTimer || 0) + dt;
        if (this._uiTimer >= 0.5) {
            this._uiTimer = 0;
            UI.updatePartyBar();
        }

        // Auto-save every 60 seconds (simplified)
    },

    render() {
        Renderer.render();
        Renderer.renderMinimap();
        Renderer.renderCompass();
    },

    // ===== MOVEMENT =====
    moveForward() { this.tryMove(DIR_DX[this.player.dir], DIR_DY[this.player.dir]); },
    moveBackward() { this.tryMove(-DIR_DX[this.player.dir], -DIR_DY[this.player.dir]); },
    strafeLeft() {
        const leftDir = (this.player.dir + 3) % 4;
        this.tryMove(DIR_DX[leftDir], DIR_DY[leftDir]);
    },
    strafeRight() {
        const rightDir = (this.player.dir + 1) % 4;
        this.tryMove(DIR_DX[rightDir], DIR_DY[rightDir]);
    },

    turnLeft() {
        this.player.dir = (this.player.dir + 3) % 4;
        this.markVisited();
        this.animateView('view-turn-left');
    },

    turnRight() {
        this.player.dir = (this.player.dir + 1) % 4;
        this.markVisited();
        this.animateView('view-turn-right');
    },

    tryMove(dx, dy) {
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        const tileX = Math.floor(newX);
        const tileY = Math.floor(newY);

        // Check bounds
        if (tileX < 0 || tileX >= this.currentLevel.width || tileY < 0 || tileY >= this.currentLevel.height) return;

        const targetCell = this.currentLevel.map[tileY][tileX];

        // Check if wall
        if (targetCell.base === TILE.WALL) return;

        // Check if there's a wall between current and target
        const currentX = Math.floor(this.player.x);
        const currentY = Math.floor(this.player.y);
        const currentCell = this.currentLevel.map[currentY][currentX];

        // Determine which wall side we're crossing
        const side = this.getWallSideForMovement(dx, dy);
        const wallOnSide = currentCell.walls[side];
        // Walls >= 0 block movement (solid walls, doors, locked doors)
        // -1 means open passage
        if (wallOnSide != null && wallOnSide !== -1) {
            return;
        }

        // Check for monsters blocking
        if (targetCell.monsters.some(m => m.alive)) {
            // Can't move into a cell with a living monster
            // But attack it instead
            const monster = targetCell.monsters.find(m => m.alive);
            if (monster) {
                // Find which champion attacks
                const attacker = this.party.find(c => c.alive);
                if (attacker) {
                    const weaponDmg = attacker.equipped.weapon ? attacker.equipped.weapon.damage : 1;
                    const dmg = Math.max(1, weaponDmg + Math.floor(attacker.stats.strength / 3) + Math.floor(Math.random() * 3));
                    Combat.dealDamageToMonster(monster, dmg, null);
                    UI.addMessage(`${attacker.name} attacks ${monster.name} for ${dmg}!`, 'damage');
                    if (monster.hp <= 0) {
                        Combat.onMonsterDeath(monster);
                    }
                    this.animateView('view-shake');
                    UI.updatePartyBar();
                }
            }
            return;
        }

        // Move
        this.player.x = newX;
        this.player.y = newY;
        this.markVisited();
        this.animateView('view-step-forward');

        // Check for stairs (player is standing on them)
        const standingCell = this.currentLevel.map[Math.floor(this.player.y)][Math.floor(this.player.x)];
        if (standingCell.base === TILE.STAIRS_DOWN) {
            UI.addMessage('Stairs leading down! Press Space to descend.', 'gold');
        }
        if (standingCell.base === TILE.STAIRS_UP) {
            UI.addMessage('Stairs leading up! Press Space to ascend.', 'gold');
        }
        if (standingCell.base === TILE.FOUNTAIN) {
            UI.addMessage('A fountain! Press Space to drink.', 'info');
        }

        // Also check cell in front for items
        const newCell = this.currentLevel.map[tileY] && this.currentLevel.map[tileY][tileX];
        if (newCell && newCell.items.length > 0) {
            UI.addMessage(`Items here: ${newCell.items.map(i => i.name).join(', ')}`, 'gold');
        }
    },

    getWallSideForMovement(dx, dy) {
        if (dx === 1) return 'east';
        if (dx === -1) return 'west';
        if (dy === 1) return 'south';
        if (dy === -1) return 'north';
        return '';
    },

    markVisited() {
        const px = Math.floor(this.player.x);
        const py = Math.floor(this.player.y);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const mx = px + dx, my = py + dy;
                if (mx >= 0 && mx < this.currentLevel.width && my >= 0 && my < this.currentLevel.height) {
                    this.currentLevel.map[my][mx].visited = true;
                }
            }
        }
    },

    animateView(className) {
        const viewport = document.getElementById('dungeon-viewport');
        if (!viewport) return;
        viewport.classList.remove('view-shake', 'view-step-forward', 'view-step-back', 'view-turn-left', 'view-turn-right');
        void viewport.offsetWidth; // force reflow
        viewport.classList.add(className);
        setTimeout(() => viewport.classList.remove(className), 300);
    },

    // ===== INTERACTIONS =====
    pickUpItems(x, y) {
        const cell = this.currentLevel.map[y][x];
        if (cell.items.length === 0) return;

        while (cell.items.length > 0) {
            const item = cell.items[0];
            // Try to add to first alive champion's inventory
            let added = false;
            for (const champion of this.party) {
                if (!champion.alive) continue;
                if (champion.inventory.length < MAX_INVENTORY) {
                    // Check stackable
                    const existing = champion.inventory.find(i => i.defId === item.defId && i.stackable && i.qty < i.maxStack);
                    if (existing) {
                        existing.qty++;
                        cell.items.shift();
                        added = true;
                    } else {
                        champion.inventory.push(item);
                        cell.items.shift();
                        added = true;
                    }
                    UI.addMessage(`${champion.name} picks up ${item.name}.`, 'gold');
                    break;
                }
            }
            if (!added) {
                UI.addMessage('Inventory full!', 'warning');
                break;
            }
        }
        UI.updatePartyBar();
    },

    descendStairs() {
        if (this.currentLevelIndex >= DungeonMaps.maps.length - 1) {
            // Boss level, can't go further
            UI.addMessage('There are no deeper stairs.', 'warning');
            return;
        }
        this.currentLevelIndex++;
        this.currentLevel = DungeonMaps.getLevel(this.currentLevelIndex);
        this.player.x = this.currentLevel.startX + 0.5;
        this.player.y = this.currentLevel.startY + 0.5;
        this.player.dir = this.currentLevel.startDir;
        this.markVisited();

        // Heal some on level transition
        this.party.forEach(c => {
            if (c.alive) {
                c.stamina = Math.min(c.maxStamina, c.stamina + 20);
            }
        });

        UI.addMessage(`Descended to ${this.currentLevel.name}!`, 'gold');
        document.getElementById('floor-num').textContent = this.currentLevelIndex + 1;

        // Check if final boss level and boss is dead
        this.checkVictory();
    },

    ascendStairs() {
        if (this.currentLevelIndex <= 0) {
            UI.addMessage('You are already at the entrance level.', 'info');
            return;
        }
        this.currentLevelIndex--;
        this.currentLevel = DungeonMaps.getLevel(this.currentLevelIndex);
        // Find stairs up position on the upper level
        let found = false;
        for (let y = 0; y < this.currentLevel.height && !found; y++) {
            for (let x = 0; x < this.currentLevel.width && !found; x++) {
                if (this.currentLevel.map[y][x].base === TILE.STAIRS_UP) {
                    this.player.x = x + 0.5;
                    this.player.y = y + 0.5;
                    found = true;
                }
            }
        }
        if (!found) {
            // Fallback to start position if no stairs up found
            this.player.x = this.currentLevel.startX + 0.5;
            this.player.y = this.currentLevel.startY + 0.5;
        }
        this.player.dir = this.currentLevel.startDir;
        this.markVisited();
        UI.addMessage(`Ascended to ${this.currentLevel.name}.`, 'info');
        document.getElementById('floor-num').textContent = this.currentLevelIndex + 1;
    },

    useFountain(x, y) {
        this.party.forEach(c => {
            if (c.alive) {
                c.hp = Math.min(c.maxHp, c.hp + Math.floor(c.maxHp * 0.3));
                c.mana = Math.min(c.maxMana, c.mana + Math.floor(c.maxMana * 0.3));
                c.stamina = Math.min(c.maxStamina, c.stamina + 20);
                c.food = Math.min(100, c.food + 30);
            }
        });
        UI.addMessage('The fountain restores your strength!', 'heal');
        this.animateView('view-step-forward');
        UI.updatePartyBar();
    },

    revealHidden() {
        // Reveal all cells within a larger radius
        const px = Math.floor(this.player.x);
        const py = Math.floor(this.player.y);
        for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
                const mx = px + dx, my = py + dy;
                if (mx >= 0 && mx < this.currentLevel.width && my >= 0 && my < this.currentLevel.height) {
                    this.currentLevel.map[my][mx].visited = true;
                }
            }
        }
        UI.addMessage('The dungeon is revealed!', 'gold');
    },

    combatAttack(championIdx) {
        Combat.combatAttack(championIdx);
    },

    openSpellPanel(championIdx) {
        SpellSystem.openPanel(championIdx);
    },

    getVisibleMonsters() {
        const result = [];
        const px = this.player.x;
        const py = this.player.y;
        const map = this.currentLevel.map;

        // Check cells around and in front of player
        for (let dy = -8; dy <= 8; dy++) {
            for (let dx = -8; dx <= 8; dx++) {
                const cx = Math.floor(px) + dx;
                const cy = Math.floor(py) + dy;
                if (cx < 0 || cx >= this.currentLevel.width || cy < 0 || cy >= this.currentLevel.height) continue;
                const cell = map[cy][cx];
                for (const monster of cell.monsters) {
                    if (monster.alive) {
                        const ddx = cx + 0.5 - px;
                        const ddy = cy + 0.5 - py;
                        result.push({
                            monster: monster,  // original reference, not a copy
                            distance: Math.sqrt(ddx * ddx + ddy * ddy),
                            x: cx, y: cy
                        });
                    }
                }
            }
        }
        // Sort by distance
        result.sort((a, b) => a.distance - b.distance);
        return result;
    },

    gameOver() {
        this.state = 'dead';
        cancelAnimationFrame(this.animFrame);
        UI.showScreen('death-screen');
    },

    checkVictory() {
        if (this.currentLevelIndex === 3) {
            let dragonDead = false;
            for (let y = 0; y < this.currentLevel.height; y++) {
                for (let x = 0; x < this.currentLevel.width; x++) {
                    for (const m of this.currentLevel.map[y][x].monsters) {
                        if (m.defId === 'dragon' && !m.alive) {
                            dragonDead = true;
                        }
                    }
                }
            }
            if (dragonDead) {
                this.state = 'victory';
                cancelAnimationFrame(this.animFrame);
                UI.showScreen('victory-screen');
            }
        }
    },

    toggleMinimap() {
        const minimap = document.getElementById('minimap');
        if (minimap) {
            minimap.style.display = minimap.style.display === 'none' ? 'block' : 'none';
        }
    }
};

// ===== STARTUP =====
window.addEventListener('DOMContentLoaded', () => {
    Game.init();
});