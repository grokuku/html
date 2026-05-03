/* ========================================
   BOMBERMAN SS — Game Data
   Characters, stages, enemies, power-ups,
   themes, worlds — all definitions
   ======================================== */

B.Data = {

    // ---- Characters (10 from Saturn Bomberman) ----
    characters: {
        white: {
            name: 'White Bomber',
            nameJa: 'シロボン',
            type: 'Balanced',
            stats: { bombs: 1, fire: 1, speed: 3 },
            colors: {
                body: '#FFFFFF', head: '#FFFFFF', face: '#FFE0BD',
                legs: '#4488cc', shoes: '#336699', belt: '#4488cc',
                headband: '#4488cc'
            },
            desc: 'The hero. Balanced in all aspects.'
        },
        black: {
            name: 'Black Bomber',
            nameJa: 'クロボン',
            type: 'Balanced',
            stats: { bombs: 1, fire: 1, speed: 3 },
            colors: {
                body: '#222222', head: '#333333', face: '#FFE0BD',
                legs: '#555555', shoes: '#444444', belt: '#888888',
                headband: '#cc3333'
            },
            desc: 'Cool and reliable rival.'
        },
        red: {
            name: 'Red Bomber',
            nameJa: 'アカボン',
            type: 'Speed',
            stats: { bombs: 1, fire: 1, speed: 4 },
            colors: {
                body: '#EE3333', head: '#EE3333', face: '#FFE0BD',
                legs: '#cc2222', shoes: '#991111', belt: '#FFD700',
                headband: '#FFD700'
            },
            desc: 'Fast and fiery temperament.'
        },
        blue: {
            name: 'Blue Bomber',
            nameJa: 'アオボン',
            type: 'Balanced',
            stats: { bombs: 1, fire: 2, speed: 3 },
            colors: {
                body: '#3366EE', head: '#3366EE', face: '#FFE0BD',
                legs: '#2244aa', shoes: '#113388', belt: '#FFD700',
                headband: '#FFD700'
            },
            desc: 'Strong fire power from the start.'
        },
        green: {
            name: 'Green Bomber',
            nameJa: 'ミドリボン',
            type: 'Defense',
            stats: { bombs: 2, fire: 1, speed: 2 },
            colors: {
                body: '#33BB33', head: '#33BB33', face: '#FFE0BD',
                legs: '#228822', shoes: '#116611', belt: '#FFD700',
                headband: '#FFD700'
            },
            desc: 'More bombs, slower movement.'
        },
        pretty: {
            name: 'Pretty Bomber',
            nameJa: 'プリティボン',
            type: 'Speed',
            stats: { bombs: 1, fire: 1, speed: 5 },
            colors: {
                body: '#FF69B4', head: '#FF69B4', face: '#FFE0BD',
                legs: '#cc3388', shoes: '#993366', belt: '#FFFFFF',
                headband: '#FF1493'
            },
            desc: 'The fastest of all bombers!'
        },
        metal: {
            name: 'Metal Bomber',
            nameJa: 'メタルボン',
            type: 'Power',
            stats: { bombs: 1, fire: 3, speed: 2 },
            colors: {
                body: '#8899AA', head: '#8899AA', face: '#BBCCDD',
                legs: '#667788', shoes: '#556677', belt: '#AABBCC'
            },
            desc: 'Armored. Huge fire range but slow.'
        },
        golden: {
            name: 'Golden Bomber',
            nameJa: 'ゴールドボン',
            type: 'Luck',
            stats: { bombs: 1, fire: 1, speed: 3 },
            colors: {
                body: '#FFD700', head: '#FFD700', face: '#FFE0BD',
                legs: '#DAA520', shoes: '#B8860B', belt: '#FFFFFF',
                headband: '#FFFFFF'
            },
            desc: 'Lucky! Better power-ups appear.'
        },
        honey: {
            name: 'Honey',
            nameJa: 'ハニー',
            type: 'Speed',
            stats: { bombs: 1, fire: 1, speed: 4 },
            colors: {
                body: '#FFB347', head: '#FFB347', face: '#FFE0BD',
                legs: '#cc7722', shoes: '#995511', belt: '#FFFFFF',
                headband: '#FF6600'
            },
            desc: 'Agile fighter from Saturn mode.'
        },
        kotetsu: {
            name: 'Kotetsu',
            nameJa: 'コテツ',
            type: 'Power',
            stats: { bombs: 2, fire: 2, speed: 2 },
            colors: {
                body: '#6B3FA0', head: '#6B3FA0', face: '#FFE0BD',
                legs: '#4A2D6E', shoes: '#332244', belt: '#FFD700',
                headband: '#FF4444'
            },
            desc: 'Samurai bomber. Powerful but slow.'
        }
    },

    // ---- Stage Themes ----
    stageThemes: {
        classic: {
            name: 'Classic',
            floor1: '#7ec850', floor2: '#6db840',
            hardBlock: '#606060', hardBlockShade: '#505050', hardBlockDetail: '#707070',
            softBlock: '#c8a050', softBlockShade: '#a88030', softBlockHighlight: '#d8b868',
            bg: '#4a8a30'
        },
        forest: {
            name: 'Forest',
            floor1: '#3a7a2a', floor2: '#2a6a1a',
            hardBlock: '#5a3a2a', hardBlockShade: '#4a2a1a', hardBlockDetail: '#6a4a3a',
            softBlock: '#6a4a2a', softBlockShade: '#5a3a1a', softBlockHighlight: '#7a5a3a',
            bg: '#1a5a0a'
        },
        ice: {
            name: 'Ice',
            floor1: '#b0d8f0', floor2: '#98c8e0',
            hardBlock: '#7090b0', hardBlockShade: '#6080a0', hardBlockDetail: '#80a0c0',
            softBlock: '#a0c8e0', softBlockShade: '#80b0d0', softBlockHighlight: '#c0e0f0',
            bg: '#88b8d8'
        },
        volcano: {
            name: 'Volcano',
            floor1: '#4a2020', floor2: '#3a1515',
            hardBlock: '#3a2020', hardBlockShade: '#2a1010', hardBlockDetail: '#4a3030',
            softBlock: '#8a4020', softBlockShade: '#6a3010', softBlockHighlight: '#aa5030',
            bg: '#2a0a0a'
        },
        desert: {
            name: 'Desert',
            floor1: '#d4b06a', floor2: '#c4a05a',
            hardBlock: '#8a6a3a', hardBlockShade: '#705030', hardBlockDetail: '#9a7a4a',
            softBlock: '#c4944a', softBlockShade: '#a47a3a', softBlockHighlight: '#d4a45a',
            bg: '#b49050'
        },
        space: {
            name: 'Space',
            floor1: '#1a1a3a', floor2: '#151530',
            hardBlock: '#3a3a6a', hardBlockShade: '#2a2a5a', hardBlockDetail: '#4a4a7a',
            softBlock: '#5a5a9a', softBlockShade: '#4a4a8a', softBlockHighlight: '#6a6aaa',
            bg: '#0a0a2a'
        },
        factory: {
            name: 'Factory',
            floor1: '#5a5a5a', floor2: '#4a4a4a',
            hardBlock: '#7a3a3a', hardBlockShade: '#5a2a2a', hardBlockDetail: '#8a4a4a',
            softBlock: '#6a5a3a', softBlockShade: '#5a4a2a', softBlockHighlight: '#7a6a4a',
            bg: '#3a3a3a'
        },
        castle: {
            name: 'Castle',
            floor1: '#7a6a5a', floor2: '#6a5a4a',
            hardBlock: '#8a7a6a', hardBlockShade: '#7a6a5a', hardBlockDetail: '#9a8a7a',
            softBlock: '#9a6a3a', softBlockShade: '#8a5a2a', softBlockHighlight: '#aa7a4a',
            bg: '#5a4a3a'
        },
        beach: {
            name: 'Beach',
            floor1: '#e8d8a0', floor2: '#d0c088',
            hardBlock: '#8a6a4a', hardBlockShade: '#705030', hardBlockDetail: '#9a7a5a',
            softBlock: '#5ab89a', softBlockShade: '#4a9880', softBlockHighlight: '#6ac8a8',
            bg: '#c0b080'
        },
        sewer: {
            name: 'Sewer',
            floor1: '#3a5a4a', floor2: '#2a4a3a',
            hardBlock: '#5a5a5a', hardBlockShade: '#4a4a4a', hardBlockDetail: '#6a6a6a',
            softBlock: '#5a6a4a', softBlockShade: '#4a5a3a', softBlockHighlight: '#6a7a5a',
            bg: '#2a3a2a'
        }
    },

    // ---- Battle Stages (10) ----
    stages: {
        classic: {
            name: 'Bomberman Classic',
            theme: 'classic',
            feature: 'Aucun danger',
            featureDesc: 'Standard battle. No environmental hazards.',
            hazardInterval: 0, hazardType: null,
            softBlockRate: 0.55
        },
        forest: {
            name: 'Forêt Enchantée',
            theme: 'forest',
            feature: 'Racines rampantes',
            featureDesc: 'Vines grow and block paths periodically.',
            hazardInterval: 15, hazardType: 'vines',
            softBlockRate: 0.5
        },
        ice: {
            name: 'Glacier Éternel',
            theme: 'ice',
            feature: 'Sol glissant',
            featureDesc: 'Players slide on ice. Hard to stop!',
            hazardInterval: 0, hazardType: 'slippery',
            softBlockRate: 0.45
        },
        volcano: {
            name: 'Volcan Ardent',
            theme: 'volcano',
            feature: 'Éruptions',
            featureDesc: 'Lava eruptions hit random tiles.',
            hazardInterval: 8, hazardType: 'lava',
            softBlockRate: 0.5
        },
        desert: {
            name: 'Désert Scintillant',
            theme: 'desert',
            feature: 'Tempête de sable',
            featureDesc: 'Sandstorms reduce visibility.',
            hazardInterval: 20, hazardType: 'sandstorm',
            softBlockRate: 0.5
        },
        space: {
            name: 'Station Spatiale',
            theme: 'space',
            feature: 'Basse gravité',
            featureDesc: 'Bombs float and slide further when kicked.',
            hazardInterval: 0, hazardType: 'lowgravity',
            softBlockRate: 0.45
        },
        factory: {
            name: 'Usine Automatisée',
            theme: 'factory',
            feature: 'Tapis roulants',
            featureDesc: 'Conveyor belts push players and bombs.',
            hazardInterval: 0, hazardType: 'conveyor',
            softBlockRate: 0.5
        },
        castle: {
            name: 'Château Fantôme',
            theme: 'castle',
            feature: 'Murs mobiles',
            featureDesc: 'Some walls shift positions over time.',
            hazardInterval: 12, hazardType: 'movingWalls',
            softBlockRate: 0.5
        },
        beach: {
            name: 'Plage Paradisiaque',
            theme: 'beach',
            feature: 'Marée montante',
            featureDesc: 'Water rises from edges, shrinking the arena.',
            hazardInterval: 20, hazardType: 'risingWater',
            softBlockRate: 0.45
        },
        sewer: {
            name: 'Égouts Maudits',
            theme: 'sewer',
            feature: 'Gaz toxique',
            featureDesc: 'Poison gas clouds drift across the map.',
            hazardInterval: 10, hazardType: 'poisonGas',
            softBlockRate: 0.55
        }
    },

    // ---- Power-up Colors ----
    powerUpColors: {
        bombUp: { bg: '#FF6600', fg: '#FFFFFF' },
        fireUp: { bg: '#FF3333', fg: '#FFFFFF' },
        speedUp: { bg: '#33CC33', fg: '#FFFFFF' },
        fullFire: { bg: '#FF0066', fg: '#FFFFFF' },
        bombKick: { bg: '#00CCFF', fg: '#FFFFFF' },
        bombPunch: { bg: '#9900FF', fg: '#FFFFFF' },
        remote: { bg: '#3366FF', fg: '#FFFFFF' },
        wallPass: { bg: '#FF9900', fg: '#FFFFFF' },
        bombPass: { bg: '#0099FF', fg: '#FFFFFF' },
        vest: { bg: '#FFD700', fg: '#333333' },
        skull: { bg: '#333333', fg: '#FF0000' },
        timer: { bg: '#FF6699', fg: '#FFFFFF' },
        crossBomb: { bg: '#CC0033', fg: '#FFFFFF' }
    },

    // ---- Power-up Drop Rates ----
    powerUpRates: {
        bombUp: 0.25,
        fireUp: 0.25,
        speedUp: 0.15,
        fullFire: 0.02,
        bombKick: 0.06,
        bombPunch: 0.04,
        remote: 0.03,
        wallPass: 0.04,
        bombPass: 0.04,
        vest: 0.02,
        skull: 0.05,
        timer: 0.03,
        crossBomb: 0.02
    },

    // ---- Enemy Types ----
    enemyTypes: {
        balloom: {
            name: 'Balloom',
            hp: 1, speed: 1.5, score: 100,
            ai: 'random', shape: 'round',
            colors: { body: '#ff8844', eyes: '#fff' }
        },
        onil: {
            name: 'Onil',
            hp: 1, speed: 2, score: 200,
            ai: 'chase', shape: 'round',
            colors: { body: '#4488ff', eyes: '#fff' }
        },
        dahl: {
            name: 'Dahl',
            hp: 1, speed: 1.5, score: 200,
            ai: 'random', shape: 'round',
            colors: { body: '#44cc44', eyes: '#fff' }
        },
        minvo: {
            name: 'Minvo',
            hp: 1, speed: 2.5, score: 300,
            ai: 'chase', shape: 'round',
            colors: { body: '#cc44cc', eyes: '#fff' }
        },
        doria: {
            name: 'Doria',
            hp: 2, speed: 1.5, score: 400,
            ai: 'random', shape: 'round',
            colors: { body: '#ffcc44', eyes: '#fff' }
        },
        ovape: {
            name: 'Ovape',
            hp: 1, speed: 2, score: 300,
            ai: 'smart', shape: 'round',
            colors: { body: '#ff4488', eyes: '#fff' }
        },
        pompoi: {
            name: 'Pompoi',
            hp: 2, speed: 1, score: 500,
            ai: 'random', shape: 'round',
            colors: { body: '#ff6600', eyes: '#fff', spikes: '#ff9900' }
        },
        bakuda: {
            name: 'Bakuda',
            hp: 1, speed: 3, score: 600,
            ai: 'chase', shape: 'round',
            colors: { body: '#444', eyes: '#ff0000' }
        },
        pass: {
            name: 'Pass',
            hp: 2, speed: 2, score: 500,
            ai: 'smart', shape: 'round',
            colors: { body: '#888888', eyes: '#ff0' }
        },
        pontan: {
            name: 'Pontan',
            hp: 3, speed: 2.5, score: 800,
            ai: 'smart', shape: 'round',
            colors: { body: '#ffffff', eyes: '#ff0000' }
        }
    },

    // ---- Boss Types ----
    bossTypes: {
        bulldozer: {
            name: 'Bulldozer',
            hp: 8, speed: 1, score: 5000,
            colors: { body: '#8B0000', eyes: '#FFD700', horns: '#FF6600' },
            horns: true, pattern: 'charge'
        },
        dragon: {
            name: 'Fire Dragon',
            hp: 10, speed: 1.2, score: 8000,
            colors: { body: '#CC4400', eyes: '#FFFF00', horns: '#FF8800' },
            horns: true, pattern: 'breathFire'
        },
        ufo: {
            name: 'UFO Master',
            hp: 7, speed: 2, score: 6000,
            colors: { body: '#4400CC', eyes: '#00FF00' },
            horns: false, pattern: 'teleport'
        },
        mechaBomber: {
            name: 'Mecha Bomber',
            hp: 12, speed: 0.8, score: 10000,
            colors: { body: '#667788', eyes: '#FF0000', horns: '#CC0000' },
            horns: true, pattern: 'missiles'
        },
        darkBomber: {
            name: 'Dark Bomber',
            hp: 15, speed: 1.5, score: 15000,
            colors: { body: '#220022', eyes: '#FF00FF', horns: '#880088' },
            horns: true, pattern: 'all'
        }
    },

    // ---- Worlds (Normal Mode) ----
    worlds: [
        {
            name: 'Monde 1: Prairie',
            desc: 'Paysage paisible',
            stages: 8, theme: 'classic',
            enemies: ['balloom', 'onil', 'dahl'],
            boss: 'bulldozer'
        },
        {
            name: 'Monde 2: Forêt',
            desc: 'Labyrinthe boisé',
            stages: 8, theme: 'forest',
            enemies: ['onil', 'dahl', 'minvo', 'doria'],
            boss: 'dragon'
        },
        {
            name: 'Monde 3: Glacier',
            desc: 'Terres gelées',
            stages: 8, theme: 'ice',
            enemies: ['minvo', 'doria', 'ovape'],
            boss: 'ufo'
        },
        {
            name: 'Monde 4: Volcan',
            desc: 'Terres infernales',
            stages: 8, theme: 'volcano',
            enemies: ['doria', 'ovape', 'pompoi', 'bakuda'],
            boss: 'mechaBomber'
        },
        {
            name: 'Monde 5: Espace',
            desc: 'Confrontation finale',
            stages: 8, theme: 'space',
            enemies: ['ovape', 'pompoi', 'bakuda', 'pass', 'pontan'],
            boss: 'darkBomber'
        }
    ],

    // ---- Map Generation ----
    generateMap(stageId, worldNum, stageNum) {
        const stage = this.stages[stageId] || this.stages.classic;
        const map = B.Utils.createGrid(B.C.COLS, B.C.ROWS, B.C.TILE_EMPTY);

        // Border walls
        for (let r = 0; r < B.C.ROWS; r++) {
            for (let c = 0; c < B.C.COLS; c++) {
                if (r === 0 || r === B.C.ROWS - 1 || c === 0 || c === B.C.COLS - 1) {
                    map[r][c] = B.C.TILE_HARD;
                } else if (r % 2 === 0 && c % 2 === 0) {
                    map[r][c] = B.C.TILE_HARD;
                } else if (B.Utils.chance(stage.softBlockRate)) {
                    map[r][c] = B.C.TILE_SOFT;
                }
            }
        }

        // Clear space around all starting positions so no player spawns inside blocks
        B.Data.startingPositions.forEach(pos => {
            if (pos.x >= 0 && pos.x < B.C.COLS && pos.y >= 0 && pos.y < B.C.ROWS) {
                map[pos.y][pos.x] = B.C.TILE_EMPTY;
                // Also clear adjacent tiles for breathing room
                [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(dv => {
                    const ax = pos.x + dv.x;
                    const ay = pos.y + dv.y;
                    if (ax > 0 && ax < B.C.COLS - 1 && ay > 0 && ay < B.C.ROWS - 1) {
                        if (map[ay][ax] === B.C.TILE_SOFT && !(ax % 2 === 0 && ay % 2 === 0)) {
                            map[ay][ax] = B.C.TILE_EMPTY;
                        }
                    }
                });
            }
        });

        return map;
    },

    // ---- Starting Positions ----
    startingPositions: [
        { x: 1, y: 1 },                        // Top-left
        { x: B.C.COLS - 2, y: 1 },              // Top-right
        { x: 1, y: B.C.ROWS - 2 },              // Bottom-left
        { x: B.C.COLS - 2, y: B.C.ROWS - 2 },   // Bottom-right
        { x: Math.floor(B.C.COLS / 2), y: 1 },   // Top-center
        { x: Math.floor(B.C.COLS / 2), y: B.C.ROWS - 2 }, // Bottom-center
        { x: 1, y: Math.floor(B.C.ROWS / 2) },   // Left-center
        { x: B.C.COLS - 2, y: Math.floor(B.C.ROWS / 2) }, // Right-center
        { x: 3, y: 3 },                            // Near top-left
        { x: B.C.COLS - 4, y: B.C.ROWS - 4 }      // Near bottom-right
    ],

    // ---- Diseases (Skull Power-up) ----
    diseases: [
        { name: 'slow', effect: 'speed', value: 1, duration: 10 },
        { name: 'fast', effect: 'speed', value: 8, duration: 10 },
        { name: 'noBombs', effect: 'bombs', value: 0, duration: 10 },
        { name: 'minFire', effect: 'fire', value: 1, duration: 10 },
        { name: 'reverse', effect: 'controls', value: true, duration: 10 },
        { name: 'diarrhea', effect: 'autoBomb', value: true, duration: 8 }
    ],

    // ---- Stage Feature Implementations ----
    applyHazard(stageId, gameState) {
        const stage = this.stages[stageId];
        if (!stage || !stage.hazardType) return;

        switch (stage.hazardType) {
            case 'lava':
                // Random tile gets lava
                const rx = B.Utils.rand(1, B.C.COLS - 2);
                const ry = B.Utils.rand(1, B.C.ROWS - 2);
                if (gameState.map[ry][rx] === B.C.TILE_EMPTY) {
                    gameState.hazards.push({
                        type: 'lava', x: rx, y: ry, timer: 2.0
                    });
                }
                break;

            case 'vines':
                // Place random soft blocks
                const vx = B.Utils.rand(1, B.C.COLS - 2);
                const vy = B.Utils.rand(1, B.C.ROWS - 2);
                if (gameState.map[vy][vx] === B.C.TILE_EMPTY) {
                    gameState.map[vy][vx] = B.C.TILE_SOFT;
                }
                break;

            case 'poisonGas':
                gameState.hazards.push({
                    type: 'gas',
                    x: B.Utils.rand(1, B.C.COLS - 2),
                    y: B.Utils.rand(1, B.C.ROWS - 2),
                    dir: B.Utils.rand(0, 3),
                    timer: 8.0
                });
                break;

            case 'risingWater':
                if (gameState.waterLevel === undefined) gameState.waterLevel = 0;
                gameState.waterLevel = Math.min(gameState.waterLevel + 1, 5);
                // Mark edge tiles as water
                const wl = gameState.waterLevel;
                for (let r = 0; r < B.C.ROWS; r++) {
                    for (let c = 0; c < B.C.COLS; c++) {
                        if (r <= wl || r >= B.C.ROWS - 1 - wl || c <= wl || c >= B.C.COLS - 1 - wl) {
                            if (gameState.map[r][c] === B.C.TILE_EMPTY || gameState.map[r][c] === B.C.TILE_SOFT) {
                                gameState.map[r][c] = -1; // water marker
                            }
                        }
                    }
                }
                break;

            case 'movingWalls':
                // Swap some hard blocks
                const hardBlocks = [];
                for (let r = 1; r < B.C.ROWS - 1; r++) {
                    for (let c = 1; c < B.C.COLS - 1; c++) {
                        if (gameState.map[r][c] === B.C.TILE_HARD && (r % 2 !== 0 || c % 2 !== 0)) {
                            hardBlocks.push({x: c, y: r});
                        }
                    }
                }
                // Move one random non-pillar hard block
                const nonPillar = hardBlocks.filter(b => b.x % 2 !== 0 || b.y % 2 !== 0);
                if (nonPillar.length > 0) {
                    const block = nonPillar[B.Utils.rand(0, nonPillar.length - 1)];
                    const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
                    const d = dirs[B.Utils.rand(0, 3)];
                    const nx = block.x + d.x;
                    const ny = block.y + d.y;
                    if (nx > 0 && nx < B.C.COLS - 1 && ny > 0 && ny < B.C.ROWS - 1) {
                        if (gameState.map[ny][nx] === B.C.TILE_EMPTY) {
                            gameState.map[block.y][block.x] = B.C.TILE_EMPTY;
                            gameState.map[ny][nx] = B.C.TILE_HARD;
                        }
                    }
                }
                break;

            case 'sandstorm':
                gameState.sandstormActive = !gameState.sandstormActive;
                gameState.sandstormTimer = 5.0;
                break;
        }
    }
};