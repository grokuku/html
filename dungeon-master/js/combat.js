// ===== COMBAT SYSTEM =====

const Combat = {
    attackCooldowns: [0, 0, 0, 0],

    init() {
        this.attackCooldowns = [0, 0, 0, 0];
    },

    update(dt) {
        for (let i = 0; i < this.attackCooldowns.length; i++) {
            if (this.attackCooldowns[i] > 0) {
                let reduction = dt;
                // Haste doubles cooldown decay
                const champion = Game.party[i];
                if (champion && champion._hasteTurns > 0) {
                    reduction *= 2;
                    champion._hasteTurns -= dt;
                    if (champion._hasteTurns <= 0) {
                        champion._hasteTurns = 0;
                        UI.addMessage(`${champion.name}'s haste wears off.`, 'info');
                    }
                }
                this.attackCooldowns[i] -= reduction;
                if (this.attackCooldowns[i] <= 0) {
                    this.attackCooldowns[i] = 0;
                    const slots = document.querySelectorAll('.party-slot');
                    if (slots[i]) {
                        slots[i].querySelector('.attack-btn')?.classList.remove('on-cooldown');
                    }
                }
            }
        }

        // Monster attacks on party
        this.processMonsterAttacks(dt);
    },

    combatAttack(championIdx) {
        if (this.attackCooldowns[championIdx] > 0) return;

        const champion = Game.party[championIdx];
        if (!champion || !champion.alive) return;

        const monsters = Game.getVisibleMonsters();
        if (monsters.length === 0) {
            UI.addMessage('No visible enemies.', 'info');
            return;
        }

        // Attack closest monster
        const target = monsters[0].monster;

        const weaponDmg = champion.equipped.weapon ? champion.equipped.weapon.damage : 1;
        const statBonus = Math.floor(champion.stats.strength / 3);
        const totalDmg = Math.max(1, weaponDmg + statBonus + Math.floor(Math.random() * 4));

        this.dealDamageToMonster(target, totalDmg, null);

        UI.addMessage(`${champion.name} attacks ${target.name} for ${totalDmg} damage!`, 'damage');

        // Set cooldown
        this.attackCooldowns[championIdx] = ATTACK_COOLDOWN / 1000;
        const slots = document.querySelectorAll('.party-slot');
        if (slots[championIdx]) {
            slots[championIdx].querySelector('.attack-btn')?.classList.add('on-cooldown');
        }

        // Stamina consumption
        champion.stamina = Math.max(0, champion.stamina - 2);

        // Screen shake
        const viewport = document.getElementById('dungeon-viewport');
        if (viewport) {
            viewport.classList.remove('view-shake');
            void viewport.offsetWidth;
            viewport.classList.add('view-shake');
        }

        // Remove dead monster
        if (target.hp <= 0) {
            this.onMonsterDeath(target);
        }

        UI.updatePartyBar();
    },

    dealDamageToMonster(monster, dmg, element) {
        if (!monster || !monster.alive) return;

        let effectiveDmg = dmg;

        // Elemental weaknesses (simplified)
        if (element) {
            // Fire beats earth, water beats fire, air beats water, earth beats air, light beats dark, dark beats light
            // ... simplified system
        }

        effectiveDmg = Math.max(1, effectiveDmg - monster.defense);
        monster.hp -= effectiveDmg;

        if (monster.hp <= 0) {
            monster.hp = 0;
            monster.alive = false;
        }
    },

    processMonsterAttacks(dt) {
        const map = Game.currentLevel.map;
        const px = Game.player.x;
        const py = Game.player.y;
        const pDir = Game.player.dir;

        for (let my = 0; my < Game.currentLevel.height; my++) {
            for (let mx = 0; mx < Game.currentLevel.width; mx++) {
                const cell = map[my][mx];
                for (const monster of cell.monsters) {
                    if (!monster.alive) continue;

                    const dx = mx - px;
                    const dy = my - py;
                    const dist = Math.abs(dx) + Math.abs(dy);

                    // Aggro
                    if (dist <= monster.aggroRange) {
                        monster.state = 'aggro';
                    }

                    // Attack if adjacent
                    if (dist <= 1 && monster.state === 'aggro') {
                        monster.attackTimer += dt;
                        if (monster.attackTimer >= 1 / monster.speed) {
                            monster.attackTimer = 0;
                            this.monsterAttackParty(monster);
                        }
                    }

                    // Movement towards player
                    if (monster.state === 'aggro' && dist > 1 && dist <= monster.aggroRange) {
                        monster.moveTimer += dt;
                        if (monster.moveTimer >= 1 / monster.speed) {
                            monster.moveTimer = 0;

                            // Simple pathfinding: move towards player
                            let bestDx = 0, bestDy = 0;
                            if (Math.abs(dx) > Math.abs(dy)) {
                                bestDx = dx > 0 ? 1 : -1;
                            } else {
                                bestDy = dy > 0 ? 1 : -1;
                            }

                            const newX = mx + bestDx;
                            const newY = my + bestDy;

                            // Check if can move there
                            if (newX >= 0 && newX < Game.currentLevel.width &&
                                newY >= 0 && newY < Game.currentLevel.height) {
                                const newCell = map[newY][newX];
                                if (newCell.base !== TILE.WALL && !newCell.monsters.some(m => m.alive) &&
                                    !(newX === Math.floor(px) && newY === Math.floor(py)) &&
                                    this.canPassWall(mx, my, bestDx, bestDy)) {
                                    // Move monster
                                    const idx = cell.monsters.indexOf(monster);
                                    cell.monsters.splice(idx, 1);
                                    newCell.monsters.push(monster);
                                }
                            }
                        }
                    }

                    // Lose aggro if far away
                    if (dist > monster.aggroRange + 3) {
                        monster.state = 'idle';
                    }
                }
            }
        }
    },

    canPassWall(fromX, fromY, dx, dy) {
        const map = Game.currentLevel.map;
        const cell = map[fromY][fromX];
        // Determine which wall side the monster is crossing
        let side;
        if (dx === 1) side = 'east';
        else if (dx === -1) side = 'west';
        else if (dy === 1) side = 'south';
        else if (dy === -1) side = 'north';
        else return true; // no movement

        const wallValue = cell.walls[side];
        // -1 means no wall (opening), DOOR_OPEN is also treated as passable by convention
        // but we stored DOOR_OPEN as WALL_TYPE.DOOR_OPEN (3) in constants
        if (wallValue >= 0) {
            // There is a wall here
            if (wallValue === WALL_TYPE.DOOR_OPEN) return true;
            return false; // solid wall, closed door, locked door
        }
        return true;
    },

    monsterAttackParty(monster) {
        // Find alive party members
        const aliveChampions = Game.party.filter(c => c.alive);
        if (aliveChampions.length === 0) return;

        // Pick random target
        // Front-line champions (0,1) are more likely to be hit
        const weights = aliveChampions.map((c, i) => {
            const idx = Game.party.indexOf(c);
            return idx < 2 ? 3 : 1;
        });
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let roll = Math.random() * totalWeight;
        let targetIdx = 0;
        for (let i = 0; i < weights.length; i++) {
            roll -= weights[i];
            if (roll <= 0) { targetIdx = i; break; }
        }

        const target = aliveChampions[targetIdx];
        if (!target) return;

        let dmg = monster.damage + Math.floor(Math.random() * 3) - 1;

        // Defense from armor
        let defense = 0;
        for (const slot of Object.values(target.equipped)) {
            if (slot) defense += slot.defense || 0;
        }
        defense += target._tempDefense || 0;
        dmg = Math.max(1, dmg - defense);

        target.hp -= dmg;
        UI.addMessage(`${monster.name} hits ${target.name} for ${dmg} damage!`, 'damage');

        // Screen flash
        const viewport = document.getElementById('dungeon-viewport');
        if (viewport) {
            const flash = document.createElement('div');
            flash.className = 'flash-damage';
            viewport.appendChild(flash);
            setTimeout(() => flash.remove(), 500);
        }

        if (target.hp <= 0) {
            target.hp = 0;
            target.alive = false;
            UI.addMessage(`${target.name} has fallen!`, 'damage');
        }

        UI.updatePartyBar();

        // Check party wipe
        if (Game.party.every(c => !c.alive)) {
            Game.gameOver();
        }
    },

    onMonsterDeath(monster) {
        UI.addMessage(`${monster.name} is defeated!`, 'gold');

        // Drop items
        if (Math.random() < monster.dropChance) {
            const dropId = monster.drops[Math.floor(Math.random() * monster.drops.length)];
            const item = ItemDefs.createItem(dropId);
            if (item) {
                // Place item on ground where monster was
                Game.currentLevel.monsterLocations = Game.currentLevel.monsterLocations || {};
                const loc = this.findMonsterLocation(monster);
                if (loc) {
                    Game.currentLevel.map[loc.y][loc.x].items.push(item);
                    UI.addMessage(`Dropped: ${item.name}`, 'gold');
                }
            }
        }

        // EXP to party
        const expPerMember = Math.floor(monster.exp / Game.party.filter(c => c.alive).length);
        Game.party.filter(c => c.alive).forEach(c => {
            c.exp += expPerMember;
            if (c.exp >= c.expToLevel) {
                ChampionDefs.levelUp(c);
                UI.addMessage(`${c.name} leveled up to ${c.level}!`, 'gold');
            }
        });

        UI.updatePartyBar();

        // Check victory condition after defeating a boss
        Game.checkVictory();
    },

    findMonsterLocation(monster) {
        const map = Game.currentLevel.map;
        for (let y = 0; y < Game.currentLevel.height; y++) {
            for (let x = 0; x < Game.currentLevel.width; x++) {
                if (map[y][x].monsters.includes(monster)) {
                    return { x, y };
                }
            }
        }
        return null;
    }
};