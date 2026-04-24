// ===== ITEM DEFINITIONS =====

const ItemDefs = {
    definitions: {
        // Weapons
        rusty_sword: { name: 'Rusty Sword', type: ITEM_TYPE.WEAPON, icon: '🗡️', rarity: RARITY.COMMON,
            desc: 'A worn but usable blade', damage: 4, stats: { strength: 1 } },
        steel_sword: { name: 'Steel Sword', type: ITEM_TYPE.WEAPON, icon: '⚔️', rarity: RARITY.UNCOMMON,
            desc: 'A well-forged sword', damage: 8, stats: { strength: 3 } },
        magic_sword: { name: 'Magic Sword', type: ITEM_TYPE.WEAPON, icon: '⚡', rarity: RARITY.RARE,
            desc: 'Glows with arcane power', damage: 14, stats: { strength: 5, intelligence: 2 }, element: ELEMENT.LIGHT },
        dragon_slayer: { name: 'Dragon Slayer', type: ITEM_TYPE.WEAPON, icon: '🔥', rarity: RARITY.LEGENDARY,
            desc: 'Ancient blade forged to slay dragons', damage: 25, stats: { strength: 10, constitution: 5 }, element: ELEMENT.FIRE },
        dagger: { name: 'Dagger', type: ITEM_TYPE.WEAPON, icon: '🔪', rarity: RARITY.COMMON,
            desc: 'A quick little blade', damage: 3, stats: { dexterity: 2 } },
        staff: { name: 'Oak Staff', type: ITEM_TYPE.WEAPON, icon: '🪄', rarity: RARITY.COMMON,
            desc: 'A simple wizard staff', damage: 2, stats: { intelligence: 3 } },
        // Armor
        leather_armor: { name: 'Leather Armor', type: ITEM_TYPE.ARMOR, icon: '🦺', rarity: RARITY.COMMON,
            desc: 'Basic leather protection', defense: 3, stats: { constitution: 1 } },
        chainmail: { name: 'Chainmail', type: ITEM_TYPE.ARMOR, icon: '🛡️', rarity: RARITY.UNCOMMON,
            desc: 'Interlocking metal rings', defense: 6, stats: { constitution: 3 } },
        plate_armor: { name: 'Plate Armor', type: ITEM_TYPE.ARMOR, icon: '🏰', rarity: RARITY.RARE,
            desc: 'Heavy but powerful protection', defense: 10, stats: { constitution: 5, strength: 2 } },
        // Helmet
        steel_helmet: { name: 'Steel Helmet', type: ITEM_TYPE.HELMET, icon: '⛑️', rarity: RARITY.UNCOMMON,
            desc: 'Protects the head', defense: 2, stats: { constitution: 1 } },
        // Shield
        wooden_shield: { name: 'Wooden Shield', type: ITEM_TYPE.SHIELD, icon: '🛡️', rarity: RARITY.COMMON,
            desc: 'Simple shield', defense: 2, stats: { constitution: 1 } },
        // Boots
        leather_boots: { name: 'Leather Boots', type: ITEM_TYPE.BOOTS, icon: '👢', rarity: RARITY.COMMON,
            desc: 'Comfortable travel boots', defense: 1, stats: { dexterity: 1 } },
        // Neck
        power_necklace: { name: 'Necklace of Power', type: ITEM_TYPE.NECKLACE, icon: '📿', rarity: RARITY.RARE,
            desc: 'Amplifies magical energy', stats: { intelligence: 5, wisdom: 3 } },
        crown_of_power: { name: 'Crown of Power', type: ITEM_TYPE.NECKLACE, icon: '👑', rarity: RARITY.LEGENDARY,
            desc: 'The dungeon master\'s crown', stats: { intelligence: 10, strength: 10, constitution: 10 }, defense: 5 },
        // Potions
        health_potion: { name: 'Health Potion', type: ITEM_TYPE.POTION, icon: '❤️', rarity: RARITY.COMMON,
            desc: 'Restores 30 HP', healAmount: 30, stackable: true, maxStack: 5 },
        mana_potion: { name: 'Mana Potion', type: ITEM_TYPE.POTION, icon: '💙', rarity: RARITY.COMMON,
            desc: 'Restores 25 Mana', manaAmount: 25, stackable: true, maxStack: 5 },
        ultimate_potion: { name: 'Ultimate Elixir', type: ITEM_TYPE.POTION, icon: '💜', rarity: RARITY.EPIC,
            desc: 'Fully restores HP & Mana', healAmount: 999, manaAmount: 999, stackable: true, maxStack: 1 },
        // Food
        bread: { name: 'Bread', type: ITEM_TYPE.FOOD, icon: '🍞', rarity: RARITY.COMMON,
            desc: 'Fills the belly', foodAmount: 20, stackable: true, maxStack: 10 },
        cheese: { name: 'Cheese', type: ITEM_TYPE.FOOD, icon: '🧀', rarity: RARITY.COMMON,
            desc: 'Aged cheese wheel', foodAmount: 15, stackable: true, maxStack: 10 },
        apple: { name: 'Apple', type: ITEM_TYPE.FOOD, icon: '🍎', rarity: RARITY.COMMON,
            desc: 'Fresh apple', foodAmount: 10, stackable: true, maxStack: 10 },
        // Scrolls
        fire_scroll: { name: 'Fire Scroll', type: ITEM_TYPE.SCROLL, icon: '📜', rarity: RARITY.UNCOMMON,
            desc: 'Casts fireball', spellId: 'fireball', stackable: true, maxStack: 3 },
        // Keys
        iron_key: { name: 'Iron Key', type: ITEM_TYPE.KEY, icon: '🗝️', rarity: RARITY.UNCOMMON,
            desc: 'Opens iron-locked doors', keyId: 'iron', stackable: false },
        copper_key: { name: 'Copper Key', type: ITEM_TYPE.KEY, icon: '🗝️', rarity: RARITY.UNCOMMON,
            desc: 'Opens copper-locked doors', keyId: 'copper', stackable: false },
        gold_key: { name: 'Gold Key', type: ITEM_TYPE.KEY, icon: '🗝️', rarity: RARITY.RARE,
            desc: 'Opens gold-locked doors', keyId: 'gold', stackable: false },
        diamond_key: { name: 'Diamond Key', type: ITEM_TYPE.KEY, icon: '💎', rarity: RARITY.EPIC,
            desc: 'Opens the hardest locks', keyId: 'diamond', stackable: false },
    },
    _nextId: 1,

    createItem(defId) {
        const def = this.definitions[defId];
        if (!def) return null;
        return {
            id: this._nextId++,
            defId: defId,
            name: def.name,
            type: def.type,
            icon: def.icon,
            rarity: def.rarity,
            desc: def.desc,
            damage: def.damage || 0,
            defense: def.defense || 0,
            stats: def.stats ? { ...def.stats } : {},
            healAmount: def.healAmount || 0,
            manaAmount: def.manaAmount || 0,
            foodAmount: def.foodAmount || 0,
            element: def.element || null,
            keyId: def.keyId || null,
            spellId: def.spellId || null,
            stackable: def.stackable || false,
            maxStack: def.maxStack || 1,
            qty: 1,
        };
    },

    useItem(item, champion) {
        if (!item || !champion) return false;

        if (item.type === ITEM_TYPE.POTION) {
            if (item.healAmount) {
                champion.hp = Math.min(champion.maxHp, champion.hp + item.healAmount);
            }
            if (item.manaAmount) {
                champion.mana = Math.min(champion.maxMana, champion.mana + item.manaAmount);
            }
            return true;
        }
        if (item.type === ITEM_TYPE.FOOD) {
            champion.food = Math.min(100, champion.food + item.foodAmount);
            champion.stamina = Math.min(champion.maxStamina, champion.stamina + 10);
            return true;
        }
        if (item.type === ITEM_TYPE.SCROLL && item.spellId) {
            SpellSystem.castScrollSpell(item.spellId, champion);
            return true;
        }
        return false;
    }
};