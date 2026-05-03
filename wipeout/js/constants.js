// Game constants and configuration
export const CONFIG = {
    // Physics
    MAX_SPEED: 150,
    ACCELERATION: 55,
    BRAKE_FORCE: 80,
    DRAG: 0.985,
    STEER_SPEED: 2.2,
    STEER_RETURN: 3.0,
    HOVER_HEIGHT: 1.8,
    HOVER_SPRING: 50,
    HOVER_DAMPING: 10,
    LATERAL_DRAG: 0.92,
    BOOST_SPEED_MULT: 1.6,
    BOOST_DURATION: 2.5,
    BOOST_COOLDOWN: 5.0,

    // Track
    TRACK_WIDTH: 20,
    TRACK_SEGMENTS: 500,
    WALL_HEIGHT: 5,
    WALL_THICKNESS: 0.5,

    // Race
    NUM_LAPS: 3,
    NUM_OPPONENTS: 5,
    START_DELAY: 3.5,

    // AI
    AI_SPEED_FACTOR: {
        easy: 0.70,
        medium: 0.85,
        hard: 0.97
    },
    AI_STEER_FACTOR: {
        easy: 0.6,
        medium: 0.8,
        hard: 0.95
    },

    // Combat
    SHIELD_MAX: 100,
    SHIELD_REGEN: 2,
    MISSILE_DAMAGE: 30,
    MINE_DAMAGE: 25,
    SHIELD_BLOCK_COST: 15,

    // Weapons
    WEAPONS: ['missile', 'mine', 'turbo', 'shield', 'bolt'],

    // Visual
    FOV: 80,
    CAMERA_DISTANCE: 14,
    CAMERA_HEIGHT: 5,
    CAMERA_LOOK_AHEAD: 18,

    // Colors
    TEAM_COLORS: [
        0x00ccff, // Player - cyan
        0xff3333, // Red
        0xffaa00, // Orange
        0x33ff33, // Green  
        0xff33ff, // Magenta
        0xffff33, // Yellow
    ],

    TEAM_NAMES: [
        'PLAYER',
        'FEISAR',
        'AG-SYS',
        'GOTHI',
        'AURICOM',
        'QIREX',
    ],

    TRACK_COLOR: 0x222244,
    TRACK_EDGE_COLOR: 0x00eeff,
    BOOST_PAD_COLOR: 0x00ff88,
    WEAPON_PAD_COLOR: 0xff8800,
    WALL_COLOR: 0x1a1a3a,
};

export const SETTINGS = {
    difficulty: 'medium',
    musicVolume: 0.3,
    sfxVolume: 0.5,
};