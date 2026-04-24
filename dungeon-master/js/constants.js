// ===== CONSTANTS & ENUMS =====

const TILE = {
    FLOOR: 0,
    WALL: 1,
    DOOR_CLOSED: 2,
    DOOR_OPEN: 3,
    STAIRS_DOWN: 4,
    STAIRS_UP: 5,
    PRESSURE_PLATE: 6,
    SWITCH: 7,
    PIT: 8,
    FALSE_WALL: 9,
    DECORATION: 10,
    FOUNTAIN: 11,
    ALTAR: 12,
    TELEPORT: 13,
    LOCKED_DOOR: 14,
    KEY_DOOR: 15,
};

const DIR = {
    NORTH: 0,
    EAST: 1,
    SOUTH: 2,
    WEST: 3,
};

const DIR_DX = [0, 1, 0, -1];
const DIR_DY = [-1, 0, 1, 0];

const WALL_TYPE = {
    STONE: 0,
    MOSSY: 1,
    BRICK: 2,
    DOOR: 3,
    DOOR_OPEN: 4,
    LOCKED: 5,
    FALSE_WALL: 6,
    DECORATION: 7,
    GRATE: 8,
};

const ITEM_TYPE = {
    WEAPON: 'weapon',
    SHIELD: 'shield',
    ARMOR: 'armor',
    HELMET: 'helmet',
    BOOTS: 'boots',
    NECKLACE: 'necklace',
    POTION: 'potion',
    FOOD: 'food',
    SCROLL: 'scroll',
    KEY: 'key',
    MISC: 'misc',
    THROWING: 'throwing',
};

const RARITY = {
    COMMON: 'common',
    UNCOMMON: 'uncommon',
    RARE: 'rare',
    EPIC: 'epic',
    LEGENDARY: 'legendary',
};

const ELEMENT = {
    FIRE: 'fire',
    WATER: 'water',
    AIR: 'air',
    EARTH: 'earth',
    LIGHT: 'light',
    DARK: 'dark',
};

const STAT = {
    STR: 'strength',
    INT: 'intelligence',
    WIS: 'wisdom',
    DEX: 'dexterity',
    CON: 'constitution',
    LCK: 'luck',
};

const CHAMPION_CLASSES = [
    {
        id: 'warrior',
        name: 'Warrior',
        icon: '⚔️',
        desc: 'Mighty fighter',
        stats: { strength: 18, intelligence: 6, wisdom: 8, dexterity: 12, constitution: 16, luck: 8 },
        hp: 40, mana: 10, stamina: 30,
        hpPerLevel: 8, manaPerLevel: 2, staminaPerLevel: 4,
    },
    {
        id: 'wizard',
        name: 'Wizard',
        icon: '🧙',
        desc: 'Arcane scholar',
        stats: { strength: 6, intelligence: 18, wisdom: 14, dexterity: 10, constitution: 8, luck: 10 },
        hp: 20, mana: 40, stamina: 15,
        hpPerLevel: 3, manaPerLevel: 8, staminaPerLevel: 2,
    },
    {
        id: 'priest',
        name: 'Priest',
        icon: '✝️',
        desc: 'Divine healer',
        stats: { strength: 10, intelligence: 12, wisdom: 18, dexterity: 8, constitution: 12, luck: 12 },
        hp: 28, mana: 30, stamina: 20,
        hpPerLevel: 5, manaPerLevel: 6, staminaPerLevel: 3,
    },
    {
        id: 'thief',
        name: 'Thief',
        icon: '🗡️',
        desc: 'Shadow rogue',
        stats: { strength: 10, intelligence: 10, wisdom: 8, dexterity: 18, constitution: 10, luck: 16 },
        hp: 24, mana: 15, stamina: 28,
        hpPerLevel: 4, manaPerLevel: 3, staminaPerLevel: 5,
    },
    {
        id: 'knight',
        name: 'Knight',
        icon: '🛡️',
        desc: 'Holy defender',
        stats: { strength: 14, intelligence: 10, wisdom: 12, dexterity: 10, constitution: 18, luck: 8 },
        hp: 36, mana: 20, stamina: 25,
        hpPerLevel: 7, manaPerLevel: 4, staminaPerLevel: 3,
    },
    {
        id: 'ranger',
        name: 'Ranger',
        icon: '🏹',
        desc: 'Wilderness scout',
        stats: { strength: 12, intelligence: 10, wisdom: 12, dexterity: 16, constitution: 12, luck: 10 },
        hp: 28, mana: 18, stamina: 28,
        hpPerLevel: 5, manaPerLevel: 3, staminaPerLevel: 5,
    },
];

const RUNE_SYMBOLS = [
    { id: 'lo', symbol: '◆', name: 'Lo', desc: 'Power' },
    { id: 'um', symbol: '✦', name: 'Um', desc: 'Movement' },
    { id: 'on', symbol: '○', name: 'On', desc: 'Protection' },
    { id: 'ee', symbol: '⬡', name: 'Ee', desc: 'Light' },
    { id: 'pal', symbol: '☀', name: 'Pal', desc: 'Fire' },
    { id: 'mon', symbol: '■', name: 'Mon', desc: 'Earth' },
    { id: 'ya', symbol: '◈', name: 'Ya', desc: 'Air' },
    { id: 'vi', symbol: '▼', name: 'Vi', desc: 'Water' },
    { id: 'oh', symbol: '♢', name: 'Oh', desc: 'Life' },
    { id: 'gus', symbol: '⬢', name: 'Gus', desc: 'Darkness' },
    { id: 'des', symbol: '◇', name: 'Des', desc: 'Dispell' },
    { id: 'zet', symbol: '△', name: 'Zet', desc: 'Time' },
];

const MAX_PARTY_SIZE = 4;
const MAX_INVENTORY = 16;
const MOVE_COOLDOWN = 200;
const ATTACK_COOLDOWN = 800;
const TURN_SPEED = 0.1;

const FOV = Math.PI / 3; // 60 degrees
const NUM_RAYS = 320;
const MAX_DEPTH = 16;