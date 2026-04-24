// ===== MONSTER DEFINITIONS =====

const MonsterDefs = {
    definitions: {
        // Level 1
        giant_rat: { name: 'Giant Rat', icon: '🐀', hp: 8, maxHp: 8, damage: 3, defense: 0,
            exp: 5, speed: 1.5, dropChance: 0.3, drops: ['bread'], color: '#886644',
            aggroRange: 3, attackType: 'melee' },
        skeleton: { name: 'Skeleton', icon: '💀', hp: 15, maxHp: 15, damage: 5, defense: 1,
            exp: 12, speed: 1.0, dropChance: 0.4, drops: ['health_potion'], color: '#ccccaa',
            aggroRange: 4, attackType: 'melee' },
        zombie: { name: 'Zombie', icon: '🧟', hp: 20, maxHp: 20, damage: 6, defense: 2,
            exp: 15, speed: 0.6, dropChance: 0.3, drops: ['bread'], color: '#558844',
            aggroRange: 3, attackType: 'melee' },
        scorpion: { name: 'Scorpion', icon: '🦂', hp: 10, maxHp: 10, damage: 8, defense: 1,
            exp: 10, speed: 1.2, dropChance: 0.2, drops: ['mana_potion'], color: '#884422',
            aggroRange: 3, attackType: 'melee' },
        worm: { name: 'Cave Worm', icon: '🐛', hp: 12, maxHp: 12, damage: 4, defense: 1,
            exp: 8, speed: 1.8, dropChance: 0.2, drops: ['bread'], color: '#669966',
            aggroRange: 4, attackType: 'melee' },

        // Level 2
        skeleton_warrior: { name: 'Skeleton Warrior', icon: '💀', hp: 25, maxHp: 25, damage: 10, defense: 4,
            exp: 25, speed: 0.9, dropChance: 0.5, drops: ['steel_sword', 'health_potion'], color: '#ddddbb',
            aggroRange: 5, attackType: 'melee' },
        ghost: { name: 'Ghost', icon: '👻', hp: 18, maxHp: 18, damage: 12, defense: 0,
            exp: 20, speed: 1.5, dropChance: 0.3, drops: ['mana_potion'], color: '#aabbdd',
            aggroRange: 5, attackType: 'magic', element: ELEMENT.DARK },
        mummy: { name: 'Mummy', icon: '🧟', hp: 30, maxHp: 30, damage: 8, defense: 5,
            exp: 22, speed: 0.5, dropChance: 0.4, drops: ['health_potion'], color: '#aa9966',
            aggroRange: 3, attackType: 'melee' },
        wraith: { name: 'Wraith', icon: '👤', hp: 22, maxHp: 22, damage: 15, defense: 1,
            exp: 30, speed: 1.8, dropChance: 0.5, drops: ['copper_key', 'fire_scroll'], color: '#7777bb',
            aggroRange: 6, attackType: 'magic', element: ELEMENT.DARK },

        // Level 3
        troll: { name: 'Troll', icon: '👹', hp: 50, maxHp: 50, damage: 15, defense: 6,
            exp: 50, speed: 0.7, dropChance: 0.5, drops: ['plate_armor', 'health_potion'], color: '#448844',
            aggroRange: 4, attackType: 'melee' },
        golem: { name: 'Stone Golem', icon: '🗿', hp: 60, maxHp: 60, damage: 12, defense: 10,
            exp: 55, speed: 0.4, dropChance: 0.4, drops: ['magic_sword'], color: '#888888',
            aggroRange: 3, attackType: 'melee', element: ELEMENT.EARTH },
        demon: { name: 'Demon', icon: '😈', hp: 40, maxHp: 40, damage: 18, defense: 4,
            exp: 45, speed: 1.2, dropChance: 0.5, drops: ['fire_scroll', 'mana_potion'], color: '#cc3333',
            aggroRange: 5, attackType: 'magic', element: ELEMENT.FIRE },
        dark_magician: { name: 'Dark Magician', icon: '🧙', hp: 30, maxHp: 30, damage: 22, defense: 2,
            exp: 55, speed: 1.0, dropChance: 0.6, drops: ['gold_key', 'mana_potion'], color: '#9944aa',
            aggroRange: 6, attackType: 'magic', element: ELEMENT.DARK },
        beholder: { name: 'Beholder', icon: '👁️', hp: 35, maxHp: 35, damage: 20, defense: 3,
            exp: 60, speed: 0.8, dropChance: 0.5, drops: ['ultimate_potion'], color: '#cc6644',
            aggroRange: 5, attackType: 'magic', element: ELEMENT.DARK },

        // Level 4 - Boss
        dragon: { name: 'Ancient Dragon', icon: '🐉', hp: 200, maxHp: 200, damage: 35, defense: 12,
            exp: 200, speed: 0.6, dropChance: 1.0, drops: ['dragon_slayer', 'crown_of_power'], color: '#ff4400',
            aggroRange: 8, attackType: 'magic', element: ELEMENT.FIRE, isBoss: true },
    },

    _nextId: 1,

    createMonster(defId) {
        const def = this.definitions[defId];
        if (!def) return null;
        return {
            id: this._nextId++,
            defId: defId,
            name: def.name,
            icon: def.icon,
            hp: def.hp,
            maxHp: def.maxHp,
            damage: def.damage,
            defense: def.defense,
            exp: def.exp,
            speed: def.speed,
            dropChance: def.dropChance,
            drops: def.drops || [],
            color: def.color,
            aggroRange: def.aggroRange,
            attackType: def.attackType,
            element: def.element || null,
            isBoss: def.isBoss || false,
            alive: true,
            attackTimer: 0,
            moveTimer: 0,
            state: 'idle', // idle, aggro, attacking
            distance: 2,
        };
    },

    // Create monster sprite for renderer
    createSprite(monster) {
        return {
            icon: monster.icon,
            color: monster.color,
            name: monster.name,
            hp: monster.hp,
            maxHp: monster.maxHp,
            isBoss: monster.isBoss,
        };
    }
};

// ===== CHAMPION (PLAYER CHARACTER) DEFINITIONS =====

const ChampionDefs = {
    createFromClass(classDef, customName) {
        const names = ['Aram', 'Borin', 'Elara', 'Fiona', 'Gorath', 'Haela', 'Igris', 'Jaren', 'Kira', 'Lyra', 'Mord', 'Nira'];
        return {
            name: customName || names[Math.floor(Math.random() * names.length)] + ' the ' + classDef.name,
            classId: classDef.id,
            className: classDef.name,
            icon: classDef.icon,
            level: 1,
            exp: 0,
            expToLevel: 50,
            hp: classDef.hp,
            maxHp: classDef.hp,
            mana: classDef.mana,
            maxMana: classDef.mana,
            stamina: classDef.stamina,
            maxStamina: classDef.stamina,
            stats: { ...classDef.stats },
            hpPerLevel: classDef.hpPerLevel,
            manaPerLevel: classDef.manaPerLevel,
            staminaPerLevel: classDef.staminaPerLevel,
            food: 80,
            maxFood: 100,
            alive: true,
            attackCooldown: 0,
            spellCooldown: 0,
            inventory: [],
            equipped: {
                weapon: null,
                shield: null,
                armor: null,
                helmet: null,
                boots: null,
                necklace: null,
            },
            conditions: [], // poison, paralyze, etc.
        };
    },

    levelUp(champion) {
        champion.level++;
        champion.expToLevel = Math.floor(champion.expToLevel * 1.8);
        champion.maxHp += champion.hpPerLevel;
        champion.maxMana += champion.manaPerLevel;
        champion.maxStamina += champion.staminaPerLevel;
        champion.hp = champion.maxHp;
        champion.mana = champion.maxMana;
        champion.stamina = champion.maxStamina;
        // Stat increase
        for (const stat of Object.keys(champion.stats)) {
            if (Math.random() < 0.4) {
                champion.stats[stat] += 1;
            }
        }
        return champion;
    }
};