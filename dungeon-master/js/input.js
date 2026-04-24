// ===== INPUT HANDLING =====

const Input = {
    keys: {},
    lastMoveTime: 0,
    touchStartX: 0,
    touchStartY: 0,

    init() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Touch/swipe support
        const viewport = document.getElementById('dungeon-viewport');
        if (viewport) {
            viewport.addEventListener('touchstart', (e) => { e.preventDefault(); this.onTouchStart(e); }, { passive: false });
            viewport.addEventListener('touchend', (e) => { e.preventDefault(); this.onTouchEnd(e); }, { passive: false });
            viewport.addEventListener('click', (e) => this.onClick(e));
            viewport.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.interactCurrent();
            });
        }

        // Keyboard shortcuts for inventory
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '4') {
                const idx = parseInt(e.key) - 1;
                if (Game.party[idx] && Game.party[idx].alive) {
                    UI.openInventory(idx);
                }
            }
        });
    },

    onKeyDown(e) {
        if (Game.state !== 'playing') return;

        const key = e.key.toLowerCase();
        this.keys[key] = true;

        // Prevent scrolling
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
            e.preventDefault();
        }

        // Movement
        if (key === 'arrowup' || key === 'w') this.queueMove('forward');
        if (key === 'arrowdown' || key === 's') this.queueMove('backward');
        if (key === 'arrowleft' || key === 'a') this.queueMove('turnLeft');
        if (key === 'arrowright' || key === 'd') this.queueMove('turnRight');
        if (key === 'q') this.queueMove('strafeLeft');
        if (key === 'e') this.queueMove('strafeRight');

        // Actions
        if (key === ' ' || key === 'f') this.interactCurrent();
        if (key === 'g') this.interactForward();
        if (key === 'i') this.openCurrentInventory();
        if (key === 'm') Game.toggleMinimap();

        // Quick attack
        if (key === 'j') Game.combatAttack(0);
        if (key === 'k') Game.combatAttack(1);
    },

    onKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
    },

    queueMove(direction) {
        const now = Date.now();
        if (now - this.lastMoveTime < MOVE_COOLDOWN) return;
        this.lastMoveTime = now;

        switch (direction) {
            case 'forward': Game.moveForward(); break;
            case 'backward': Game.moveBackward(); break;
            case 'turnLeft': Game.turnLeft(); break;
            case 'turnRight': Game.turnRight(); break;
            case 'strafeLeft': Game.strafeLeft(); break;
            case 'strafeRight': Game.strafeRight(); break;
        }
    },

    onTouchStart(e) {
        if (Game.state !== 'playing') return;
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    },

    onTouchEnd(e) {
        if (Game.state !== 'playing') return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx < 20 && absDy < 20) {
            this.interactCurrent();
            return;
        }

        if (absDx > absDy) {
            if (dx > 30) Game.turnRight();
            else if (dx < -30) Game.turnLeft();
        } else {
            if (dy < -30) Game.moveForward();
            else if (dy > 30) Game.moveBackward();
        }
    },

    onClick(e) {
        if (Game.state !== 'playing') return;
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;

        // Click on center = interact with current cell
        if (Math.abs(x - w / 2) < 50 && Math.abs(y - h / 2) < 50) {
            this.interactCurrent();
        }
    },

    // Interact with the cell the player is STANDING ON (stairs, fountain, items)
    interactCurrent() {
        if (Game.state !== 'playing') return;

        const px = Math.floor(Game.player.x);
        const py = Math.floor(Game.player.y);
        const map = Game.currentLevel.map;
        const currentCell = map[py][px];

        // Stairs down — descend
        if (currentCell.base === TILE.STAIRS_DOWN) {
            Game.descendStairs();
            return;
        }

        // Stairs up — ascend
        if (currentCell.base === TILE.STAIRS_UP) {
            Game.ascendStairs();
            return;
        }

        // Fountain
        if (currentCell.base === TILE.FOUNTAIN) {
            Game.useFountain(px, py);
            return;
        }

        // Pick up items
        if (currentCell.items.length > 0) {
            Game.pickUpItems(px, py);
            return;
        }

        // If nothing on current cell, try the cell in front
        this.interactForward();
    },

    // Interact with the cell in front of the player (doors, etc.)
    interactForward() {
        if (Game.state !== 'playing') return;

        const px = Game.player.x;
        const py = Game.player.y;
        const dx = DIR_DX[Game.player.dir];
        const dy = DIR_DY[Game.player.dir];
        const fx = Math.floor(px + dx);
        const fy = Math.floor(py + dy);
        const map = Game.currentLevel.map;
        const currentCell = map[Math.floor(py)][Math.floor(px)];

        // Check cell in front
        if (fx < 0 || fx >= Game.currentLevel.width || fy < 0 || fy >= Game.currentLevel.height) return;
        const frontCell = map[fy][fx];

        // Check for doors on current cell facing forward
        const wallSide = this.getWallSide(Game.player.dir);
        if (currentCell.walls[wallSide] === WALL_TYPE.DOOR) {
            this.openDoor(currentCell, Math.floor(px), Math.floor(py), wallSide);
            return;
        }

        if (currentCell.walls[wallSide] === WALL_TYPE.LOCKED) {
            this.tryUnlockDoor(currentCell, Math.floor(px), Math.floor(py), wallSide);
            return;
        }

        // Pick up items in front
        if (frontCell.items.length > 0) {
            Game.pickUpItems(fx, fy);
            return;
        }
    },

    openDoor(cell, x, y, side) {
        const opposite = { north: 'south', south: 'north', east: 'west', west: 'east' };
        const dirMap = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
        const [ddx, ddy] = dirMap[side];
        const nx = x + ddx, ny = y + ddy;

        cell.walls[side] = -1; // Open passage
        if (Game.currentLevel.map[ny] && Game.currentLevel.map[ny][nx]) {
            Game.currentLevel.map[ny][nx].walls[opposite[side]] = -1;
        }
        UI.addMessage('Door opened.', 'info');
    },

    tryUnlockDoor(cell, x, y, side) {
        const hasKey = Game.party.some(c =>
            c.alive && c.inventory.some(item => item.type === ITEM_TYPE.KEY)
        );
        if (hasKey) {
            const opposite = { north: 'south', south: 'north', east: 'west', west: 'east' };
            const dirMap = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
            const [ddx, ddy] = dirMap[side];
            const nx = x + ddx, ny = y + ddy;

            cell.walls[side] = -1; // Open passage
            if (Game.currentLevel.map[ny] && Game.currentLevel.map[ny][nx]) {
                Game.currentLevel.map[ny][nx].walls[opposite[side]] = -1;
            }
            // Remove key
            for (const champion of Game.party) {
                if (!champion.alive) continue;
                const keyIdx = champion.inventory.findIndex(item => item.type === ITEM_TYPE.KEY);
                if (keyIdx >= 0) {
                    champion.inventory.splice(keyIdx, 1);
                    break;
                }
            }
            UI.addMessage('Door unlocked!', 'gold');
        } else {
            UI.addMessage('The door is locked. You need a key.', 'warning');
        }
    },

    getWallSide(dir) {
        return ['north', 'east', 'south', 'west'][dir];
    },

    openCurrentInventory() {
        const idx = Game.party.findIndex(c => c.alive);
        if (idx >= 0) UI.openInventory(idx);
    },

    update(dt) {
        // Handled via discrete key events
    }
};