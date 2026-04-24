// ===== DUNGEON MAPS =====
const DungeonMaps = {
    maps: [],
    init() {
        this.maps = [this.buildLevel1(), this.buildLevel2(), this.buildLevel3(), this.buildLevel4()];
    },
    getLevel(index) {
        if (index >= 0 && index < this.maps.length) return this.maps[index];
        return null;
    },
    createEmptyMap(w, h) {
        const map = [];
        for (let y = 0; y < h; y++) {
            map[y] = [];
            for (let x = 0; x < w; x++) {
                map[y][x] = {
                    base: TILE.WALL,
                    walls: { north: -1, east: -1, south: -1, west: -1 },
                    items: [], monsters: [], event: null, visited: false,
                };
            }
        }
        return map;
    },
    rebuildWalls(map, w, h, wallType) {
        const wt = wallType || WALL_TYPE.STONE;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (map[y][x].base === TILE.WALL) continue;
                map[y][x].walls.north = (y === 0 || map[y-1][x].base === TILE.WALL) ? wt : -1;
                map[y][x].walls.south = (y === h-1 || map[y+1][x].base === TILE.WALL) ? wt : -1;
                map[y][x].walls.west = (x === 0 || map[y][x-1].base === TILE.WALL) ? wt : -1;
                map[y][x].walls.east = (x === w-1 || map[y][x+1].base === TILE.WALL) ? wt : -1;
            }
        }
    },
    carveRoom(map, rx, ry, rw, rh) {
        for (let dy = ry; dy < ry + rh; dy++)
            for (let dx = rx; dx < rx + rw; dx++)
                if (map[dy] && map[dy][dx]) map[dy][dx].base = TILE.FLOOR;
    },
    carveH(map, x1, x2, y) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
            if (map[y] && map[y][x]) map[y][x].base = TILE.FLOOR;
    },
    carveV(map, y1, y2, x) {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
            if (map[y] && map[y][x]) map[y][x].base = TILE.FLOOR;
    },
    addDoor(map, x, y, side, locked) {
        const opp = { north: 'south', south: 'north', east: 'west', west: 'east' };
        const d = { north: [0,-1], south: [0,1], east: [1,0], west: [-1,0] };
        const wt = locked ? WALL_TYPE.LOCKED : WALL_TYPE.DOOR;
        map[y][x].walls[side] = wt;
        const nx = x + d[side][0], ny = y + d[side][1];
        if (map[ny] && map[ny][nx]) map[ny][nx].walls[opp[side]] = wt;
    },
    placeItem(map, x, y, itemId) {
        const item = ItemDefs.createItem(itemId);
        if (item) map[y][x].items.push(item);
    },
    placeMonster(map, x, y, monsterId) {
        const m = MonsterDefs.createMonster(monsterId);
        if (m) map[y][x].monsters.push(m);
    },

    // ===== LEVEL 1 =====
    buildLevel1() {
        const W = 24, H = 24;
        const map = this.createEmptyMap(W, H);
        // Rooms
        this.carveRoom(map, 2, 2, 5, 5);       // A: start
        this.carveRoom(map, 10, 2, 5, 5);       // B: east room
        this.carveRoom(map, 2, 11, 8, 6);       // C: big hall
        this.carveRoom(map, 12, 11, 5, 5);       // D: east wing
        this.carveRoom(map, 3, 20, 6, 2);       // E: south room
        // Corridors (2 wide for visibility)
        this.carveH(map, 7, 9, 4);   // A-B connector
        this.carveV(map, 7, 10, 4);  // A-C connector
        this.carveH(map, 10, 11, 13); // C-D connector
        this.carveV(map, 17, 19, 6);  // C-E connector

        this.rebuildWalls(map, W, H, WALL_TYPE.STONE);

        this.addDoor(map, 4, 6, 'south', false);
        this.addDoor(map, 7, 4, 'east', false);
        this.addDoor(map, 6, 16, 'south', true);
        this.addDoor(map, 10, 13, 'east', false);

        map[3][4].base = TILE.STAIRS_UP;
        map[20][6].base = TILE.STAIRS_DOWN;
        map[13][5].base = TILE.FOUNTAIN;

        this.placeItem(map, 4, 3, 'rusty_sword');
        this.placeItem(map, 4, 4, 'bread');
        this.placeItem(map, 3, 4, 'health_potion');
        this.placeItem(map, 12, 4, 'leather_armor');
        this.placeItem(map, 13, 3, 'mana_potion');
        this.placeItem(map, 13, 13, 'iron_key');
        this.placeItem(map, 6, 13, 'wooden_shield');

        this.placeMonster(map, 8, 4, 'skeleton');
        this.placeMonster(map, 7, 8, 'giant_rat');
        this.placeMonster(map, 8, 8, 'giant_rat');
        this.placeMonster(map, 14, 13, 'zombie');
        this.placeMonster(map, 13, 14, 'skeleton');
        this.placeMonster(map, 5, 14, 'worm');
        this.placeMonster(map, 6, 14, 'scorpion');

        return { map, name: 'The Entry Halls', width: W, height: H, startX: 4, startY: 3, startDir: DIR.SOUTH };
    },

    // ===== LEVEL 2 =====
    buildLevel2() {
        const W = 24, H = 24;
        const map = this.createEmptyMap(W, H);
        this.carveRoom(map, 2, 2, 5, 5);       // start
        this.carveRoom(map, 10, 2, 6, 5);       // north crypt
        this.carveRoom(map, 2, 10, 5, 5);       // west crypt
        this.carveRoom(map, 10, 10, 6, 6);      // central
        this.carveRoom(map, 18, 10, 4, 5);      // east vault
        this.carveRoom(map, 4, 20, 5, 2);        // south room
        // Corridors
        this.carveH(map, 7, 9, 4);   // start → north crypt
        this.carveV(map, 7, 9, 4);    // start → west crypt
        this.carveH(map, 7, 9, 12);   // west crypt → central
        this.carveH(map, 16, 17, 13); // central → east vault
        this.carveV(map, 12, 19, 6);  // central → south

        this.rebuildWalls(map, W, H, WALL_TYPE.BRICK);

        this.addDoor(map, 4, 7, 'south', false);
        this.addDoor(map, 7, 4, 'east', false);
        this.addDoor(map, 7, 12, 'east', true); // copper key
        this.addDoor(map, 9, 12, 'east', false);
        this.addDoor(map, 16, 13, 'east', false);
        this.addDoor(map, 6, 19, 'south', false);

        map[3][4].base = TILE.STAIRS_UP;
        map[20][6].base = TILE.STAIRS_DOWN;

        this.placeItem(map, 4, 3, 'steel_sword');
        this.placeItem(map, 4, 4, 'health_potion');
        this.placeItem(map, 3, 12, 'copper_key');
        this.placeItem(map, 12, 12, 'mana_potion');
        this.placeItem(map, 20, 12, 'fire_scroll');
        this.placeItem(map, 19, 12, 'steel_helmet');

        this.placeMonster(map, 12, 4, 'skeleton_warrior');
        this.placeMonster(map, 13, 4, 'skeleton');
        this.placeMonster(map, 3, 12, 'ghost');
        this.placeMonster(map, 4, 12, 'ghost');
        this.placeMonster(map, 13, 13, 'mummy');
        this.placeMonster(map, 14, 14, 'mummy');
        this.placeMonster(map, 20, 12, 'wraith');

        return { map, name: 'The Crypts', width: W, height: H, startX: 4, startY: 3, startDir: DIR.SOUTH };
    },

    // ===== LEVEL 3 =====
    buildLevel3() {
        const W = 24, H = 24;
        const map = this.createEmptyMap(W, H);
        this.carveRoom(map, 2, 2, 5, 5);       // start
        this.carveRoom(map, 10, 2, 5, 5);       // mid room
        this.carveRoom(map, 2, 11, 7, 6);       // big room
        this.carveRoom(map, 12, 11, 7, 6);      // east chamber
        this.carveRoom(map, 3, 20, 6, 2);        // south
        this.carveH(map, 7, 9, 4);     // start → mid
        this.carveH(map, 9, 11, 14);   // mid → east chamber
        this.carveV(map, 7, 10, 5);    // start → big room
        this.carveH(map, 9, 11, 14);   // big → east
        this.carveV(map, 17, 19, 6);   // → south

        this.rebuildWalls(map, W, H, WALL_TYPE.MOSSY);

        this.addDoor(map, 5, 7, 'south', false);
        this.addDoor(map, 7, 4, 'east', false);
        this.addDoor(map, 9, 14, 'east', true); // gold key
        this.addDoor(map, 11, 14, 'east', false);
        this.addDoor(map, 6, 19, 'south', true); // locked

        map[3][4].base = TILE.STAIRS_UP;
        map[20][6].base = TILE.STAIRS_DOWN;

        this.placeItem(map, 4, 4, 'magic_sword');
        this.placeItem(map, 12, 4, 'plate_armor');
        this.placeItem(map, 13, 4, 'gold_key');
        this.placeItem(map, 5, 14, 'power_necklace');
        this.placeItem(map, 15, 14, 'health_potion');

        this.placeMonster(map, 12, 4, 'troll');
        this.placeMonster(map, 13, 4, 'dark_magician');
        this.placeMonster(map, 5, 14, 'golem');
        this.placeMonster(map, 15, 14, 'demon');
        this.placeMonster(map, 16, 15, 'demon');
        this.placeMonster(map, 5, 21, 'beholder');

        return { map, name: 'The Depths', width: W, height: H, startX: 4, startY: 3, startDir: DIR.SOUTH };
    },

    // ===== LEVEL 4 =====
    buildLevel4() {
        const W = 24, H = 24;
        const map = this.createEmptyMap(W, H);
        this.carveRoom(map, 2, 2, 5, 5);       // start
        this.carveRoom(map, 12, 2, 6, 5);       // armory
        this.carveRoom(map, 2, 11, 5, 5);       // west
        this.carveRoom(map, 14, 11, 6, 5);      // east
        this.carveRoom(map, 7, 19, 10, 3);       // arena (boss)
        // Corridors
        this.carveH(map, 7, 11, 4);   // start → armory
        this.carveV(map, 7, 10, 5);   // start → west
        this.carveH(map, 7, 13, 13);   // west → east
        this.carveV(map, 14, 18, 8);  // → arena
        this.carveH(map, 7, 9, 20);   // center → arena

        this.rebuildWalls(map, W, H, WALL_TYPE.BRICK);

        this.addDoor(map, 5, 7, 'south', false);
        this.addDoor(map, 7, 4, 'east', false);
        this.addDoor(map, 11, 4, 'east', false);
        this.addDoor(map, 7, 13, 'east', true); // diamond key
        this.addDoor(map, 13, 13, 'east', false);
        this.addDoor(map, 8, 18, 'south', false);

        map[3][4].base = TILE.STAIRS_UP;
        map[20][10].base = TILE.FOUNTAIN;

        this.placeItem(map, 4, 3, 'health_potion');
        this.placeItem(map, 4, 13, 'health_potion');
        this.placeItem(map, 14, 4, 'diamond_key');
        this.placeItem(map, 9, 20, 'dragon_slayer');
        this.placeItem(map, 10, 20, 'crown_of_power');

        this.placeMonster(map, 8, 4, 'dark_magician');
        this.placeMonster(map, 4, 13, 'demon');
        this.placeMonster(map, 16, 13, 'demon');
        this.placeMonster(map, 9, 20, 'dragon');
        this.placeMonster(map, 12, 20, 'demon');

        return { map, name: "The Dragon's Lair", width: W, height: H, startX: 4, startY: 3, startDir: DIR.SOUTH };
    }
};