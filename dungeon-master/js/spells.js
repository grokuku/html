// ===== SPELL SYSTEM =====

const SpellSystem = {
    activeChampion: null,
    runeQueue: [],

    spells: {
        // { name, runes, manaCost, effect(element, power, champion), minPower }
        'light_heal': {
            name: 'Light Heal',
            runes: ['oh', 'lo'],
            manaCost: 5,
            minPower: 1,
            desc: 'Heals a small amount',
            effect(caster, target, power) {
                const heal = 10 + power * 5;
                target.hp = Math.min(target.maxHp, target.hp + heal);
                return `Healed ${heal} HP`;
            }
        },
        'greater_heal': {
            name: 'Greater Heal',
            runes: ['oh', 'lo', 'ee'],
            manaCost: 15,
            minPower: 2,
            desc: 'Heals a large amount',
            effect(caster, target, power) {
                const heal = 25 + power * 8;
                target.hp = Math.min(target.maxHp, target.hp + heal);
                return `Healed ${heal} HP`;
            }
        },
        'fireball': {
            name: 'Fireball',
            runes: ['pal', 'lo'],
            manaCost: 8,
            minPower: 1,
            desc: 'Hurls a ball of fire',
            effect(caster, target, power) {
                const dmg = 12 + power * 6;
                Combat.dealDamageToMonster(target, dmg, ELEMENT.FIRE);
                return `Fireball deals ${dmg} fire damage!`;
            }
        },
        'lightning_bolt': {
            name: 'Lightning Bolt',
            runes: ['ya', 'lo'],
            manaCost: 10,
            minPower: 1,
            desc: 'Blast of electrical energy',
            effect(caster, target, power) {
                const dmg = 15 + power * 5;
                Combat.dealDamageToMonster(target, dmg, ELEMENT.AIR);
                return `Lightning deals ${dmg} damage!`;
            }
        },
        'ice_bolt': {
            name: 'Ice Bolt',
            runes: ['vi', 'lo'],
            manaCost: 7,
            minPower: 1,
            desc: 'Freezing projectile',
            effect(caster, target, power) {
                const dmg = 10 + power * 4;
                Combat.dealDamageToMonster(target, dmg, ELEMENT.WATER);
                return `Ice bolt deals ${dmg} damage!`;
            }
        },
        'earthquake': {
            name: 'Earthquake',
            runes: ['mon', 'lo', 'um'],
            manaCost: 20,
            minPower: 3,
            desc: 'Shakes the dungeon',
            effect(caster, target, power) {
                const dmg = 20 + power * 8;
                Combat.dealDamageToMonster(target, dmg, ELEMENT.EARTH);
                return `Earthquake deals ${dmg} damage!`;
            }
        },
        'shield': {
            name: 'Shield',
            runes: ['on', 'lo'],
            manaCost: 6,
            minPower: 1,
            desc: 'Raises magical defense',
            effect(caster, target, power) {
                // Temporarily add defense to all party members
                Game.party.forEach(c => {
                    if (c.alive) {
                        c._tempDefense = (c._tempDefense || 0) + power * 2;
                    }
                });
                return `Shield raised! +${power * 2} defense`;
            }
        },
        'true_sight': {
            name: 'True Sight',
            runes: ['ee', 'um'],
            manaCost: 5,
            minPower: 1,
            desc: 'Reveals hidden things',
            effect(caster, target, power) {
                Game.revealHidden();
                return 'The dungeon reveals its secrets!';
            }
        },
        'dispell': {
            name: 'Dispell',
            runes: ['des', 'lo'],
            manaCost: 8,
            minPower: 2,
            desc: 'Removes enchantments',
            effect(caster, target, power) {
                Game.party.forEach(c => {
                    c.conditions = [];
                });
                return 'All conditions cleared!';
            }
        },
        'dark_bolt': {
            name: 'Dark Bolt',
            runes: ['gus', 'lo'],
            manaCost: 12,
            minPower: 2,
            desc: 'Shadow energy blast',
            effect(caster, target, power) {
                const dmg = 18 + power * 6;
                Combat.dealDamageToMonster(target, dmg, ELEMENT.DARK);
                return `Dark bolt deals ${dmg} damage!`;
            }
        },
        'haste': {
            name: 'Haste',
            runes: ['um', 'zet'],
            manaCost: 10,
            minPower: 2,
            desc: 'Speeds up the party',
            effect(caster, target, power) {
                Game.party.forEach(c => {
                    if (c.alive) c._hasteTurns = power * 3;
                });
                return 'The party moves faster!';
            }
        },
        'mana_restore': {
            name: 'Mana Restore',
            runes: ['ee', 'oh'],
            manaCost: 0,
            minPower: 2,
            desc: 'Converts stamina to mana',
            effect(caster, target, power) {
                const conv = Math.min(caster.stamina, power * 10);
                caster.stamina -= conv;
                caster.mana = Math.min(caster.maxMana, caster.mana + conv);
                return `Converted ${conv} stamina to mana`;
            }
        },
        'holy_light': {
            name: 'Holy Light',
            runes: ['ee', 'lo', 'oh'],
            manaCost: 20,
            minPower: 3,
            desc: 'Blinding radiance',
            effect(caster, target, power) {
                const dmg = 30 + power * 10;
                Combat.dealDamageToMonster(target, dmg, ELEMENT.LIGHT);
                return `Holy light deals ${dmg} damage!`;
            }
        },
        'inferno': {
            name: 'Inferno',
            runes: ['pal', 'lo', 'um'],
            manaCost: 25,
            minPower: 4,
            desc: 'Devastating fire storm',
            effect(caster, target, power) {
                const dmg = 40 + power * 12;
                Combat.dealDamageToMonster(target, dmg, ELEMENT.FIRE);
                return `Inferno deals ${dmg} fire damage!`;
            }
        },
    },

    init() {
        // Build rune buttons
        const container = document.getElementById('spell-runes');
        if (!container) return;
        container.innerHTML = '';
        RUNE_SYMBOLS.forEach(rune => {
            const btn = document.createElement('button');
            btn.className = 'rune-btn';
            btn.innerHTML = `<span>${rune.symbol}</span>`;
            btn.title = `${rune.name}: ${rune.desc}`;
            btn.addEventListener('click', () => this.addRune(rune));
            container.appendChild(btn);
        });
    },

    openPanel(championIndex) {
        this.activeChampion = championIndex;
        this.runeQueue = [];
        this.updateQueue();
        document.getElementById('spell-panel').classList.remove('hidden');
        this.updateCastButton();
    },

    close() {
        document.getElementById('spell-panel').classList.add('hidden');
        this.activeChampion = null;
        this.runeQueue = [];
    },

    addRune(rune) {
        if (this.runeQueue.length >= 4) return;
        this.runeQueue.push(rune);
        this.updateQueue();
        this.updateCastButton();
    },

    clear() {
        this.runeQueue = [];
        this.updateQueue();
        this.updateCastButton();
    },

    updateQueue() {
        const container = document.getElementById('spell-queue');
        container.innerHTML = '';
        this.runeQueue.forEach(rune => {
            const span = document.createElement('span');
            span.className = 'spell-queue-rune';
            span.textContent = rune.symbol;
            span.title = `${rune.name}: ${rune.desc}`;
            container.appendChild(span);
        });
    },

    updateCastButton() {
        const btn = document.getElementById('spell-cast');
        const spell = this.identifySpell();
        if (spell) {
            btn.textContent = `CAST: ${spell.name}`;
            btn.style.opacity = '1';
            btn.disabled = false;
        } else {
            btn.textContent = 'CAST';
            btn.style.opacity = '0.5';
            btn.disabled = true;
        }
    },

    identifySpell() {
        if (this.runeQueue.length === 0) return null;
        const runeIds = this.runeQueue.map(r => r.id);
        for (const [id, spell] of Object.entries(this.spells)) {
            if (spell.runes.length === runeIds.length &&
                spell.runes.every((r, i) => r === runeIds[i])) {
                return { ...spell, id };
            }
        }
        return null;
    },

    cast() {
        const spell = this.identifySpell();
        if (!spell || this.activeChampion === null) return;

        const caster = Game.party[this.activeChampion];
        if (!caster || !caster.alive) {
            UI.addMessage('Champion is dead!', 'damage');
            return;
        }
        if (caster.mana < spell.manaCost) {
            UI.addMessage('Not enough mana!', 'warning');
            return;
        }

        const power = Math.floor(caster.stats.intelligence / 5) + Math.floor(caster.level / 2);
        if (power < spell.minPower) {
            UI.addMessage(`Need power level ${spell.minPower}!`, 'warning');
            return;
        }

        caster.mana -= spell.manaCost;

        // Determine target: healing/buff spells target caster, offensive target monster
        const healingSpells = ['light_heal', 'greater_heal', 'shield', 'true_sight', 'dispell', 'haste', 'mana_restore'];
        let spellTarget;
        if (healingSpells.includes(spell.id)) {
            spellTarget = caster;
        } else {
            const monsters = Game.getVisibleMonsters();
            spellTarget = monsters.length > 0 ? monsters[0].monster : null;
            if (!spellTarget) {
                UI.addMessage('No target in sight!', 'warning');
                this.close();
                return;
            }
        }

        const msg = spell.effect(caster, spellTarget, power);
        UI.addMessage(`${caster.name}: ${msg}`, 'gold');

        // Check if offensive spell killed the monster
        if (spellTarget && spellTarget.hp <= 0 && !spellTarget.alive) {
            Combat.onMonsterDeath(spellTarget);
        }

        // Animate with appropriate flash
        const viewport = document.getElementById('dungeon-viewport');
        const flash = document.createElement('div');
        flash.className = healingSpells.includes(spell.id) ? 'flash-heal' : 'flash-damage';
        viewport.appendChild(flash);
        setTimeout(() => flash.remove(), 500);

        this.close();
        UI.updatePartyBar();
    },

    castScrollSpell(spellId, champion) {
        const spell = this.spells[spellId];
        if (!spell) return;
        const power = Math.floor(champion.stats.intelligence / 4) + champion.level;
        const healingSpells = ['light_heal', 'greater_heal', 'shield', 'true_sight', 'dispell', 'haste', 'mana_restore'];
        let target;
        if (healingSpells.includes(spellId)) {
            target = champion;
        } else {
            const monsters = Game.getVisibleMonsters();
            target = monsters.length > 0 ? monsters[0].monster : null;
        }
        const result = spell.effect(champion, target, power);
        if (result) UI.addMessage(`${champion.name}: ${result}`, 'gold');

        // Check if offensive scroll killed the monster
        if (target && target.hp <= 0 && !target.alive) {
            Combat.onMonsterDeath(target);
        }
    }
};