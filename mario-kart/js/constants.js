// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const W = 512;
const H = 384;
const ASPECT = W / H;

const TRACK_SIZE = 2048;

const TERRAIN = {
  ROAD: 0,
  GRASS: 1,
  DIRT: 2,
  SAND: 3,
  WATER: 4,
  RAMPL: 5,
  RAMPR: 6,
  BOOST: 7,
  OFFTRACK: 8,
  FINISH: 9
};

const TERRAIN_COLORS = {
  [TERRAIN.ROAD]: [128, 128, 128],
  [TERRAIN.GRASS]: [80, 168, 0],
  [TERRAIN.DIRT]: [168, 120, 64],
  [TERRAIN.SAND]: [216, 192, 120],
  [TERRAIN.WATER]: [32, 96, 216],
  [TERRAIN.RAMPL]: [200, 48, 48],
  [TERRAIN.RAMPR]: [240, 240, 240],
  [TERRAIN.BOOST]: [255, 224, 0],
  [TERRAIN.OFFTRACK]: [40, 100, 0],
  [TERRAIN.FINISH]: [240, 240, 240]
};

const TERRAIN_SPEED = {
  [TERRAIN.ROAD]: 1.0,
  [TERRAIN.GRASS]: 0.55,
  [TERRAIN.DIRT]: 0.7,
  [TERRAIN.SAND]: 0.45,
  [TERRAIN.WATER]: 0.3,
  [TERRAIN.RAMPL]: 1.0,
  [TERRAIN.RAMPR]: 1.0,
  [TERRAIN.BOOST]: 1.5,
  [TERRAIN.OFFTRACK]: 0.35,
  [TERRAIN.FINISH]: 1.0
};

const CHARACTERS = [
  { name: 'Mario',     color: '#E44040', kartColor: '#E44040', speed: 3, accel: 3, weight: 3, handling: 3, icon: 'M' },
  { name: 'Luigi',     color: '#40C040', kartColor: '#40C040', speed: 3, accel: 3, weight: 2, handling: 4, icon: 'L' },
  { name: 'Peach',     color: '#FFB0D0', kartColor: '#FFB0D0', speed: 2, accel: 5, weight: 1, handling: 5, icon: 'P' },
  { name: 'Toad',      color: '#FF6090', kartColor: '#FF6090', speed: 2, accel: 5, weight: 1, handling: 5, icon: 'T' },
  { name: 'Yoshi',     color: '#40D840', kartColor: '#40D840', speed: 3, accel: 4, weight: 2, handling: 4, icon: 'Y' },
  { name: 'Koopa',     color: '#40D840', kartColor: '#40D840', speed: 3, accel: 4, weight: 1, handling: 4, icon: 'K' },
  { name: 'DK Jr.',    color: '#D87830', kartColor: '#D87830', speed: 5, accel: 1, weight: 5, handling: 1, icon: 'D' },
  { name: 'Bowser',    color: '#D87020', kartColor: '#D87020', speed: 5, accel: 1, weight: 5, handling: 1, icon: 'B' }
];

const ITEMS = {
  NONE: 0,
  BANANA: 1,
  GREEN_SHELL: 2,
  RED_SHELL: 3,
  MUSHROOM: 4,
  STAR: 5,
  LIGHTNING: 6,
  FEATHER: 7
};

const GAME_STATES = {
  TITLE: 0,
  CHARACTER_SELECT: 1,
  TRACK_SELECT: 2,
  COUNTDOWN: 3,
  RACING: 4,
  RACE_FINISH: 5,
  RESULTS: 6
};