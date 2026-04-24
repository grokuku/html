// ===== RAYCASTING RENDERER =====

const Renderer = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    zBuffer: [],
    time: 0,
    monsterSprites: [], // rendered monster sprite data

    init() {
        this.canvas = document.getElementById('dungeon-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        const viewport = document.getElementById('dungeon-viewport');
        if (!viewport) return;
        this.width = viewport.clientWidth;
        this.height = viewport.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    },

    render() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        if (w === 0 || h === 0) return;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        this.time += 0.016;

        // Raycasting
        const player = Game.player;
        const map = Game.currentLevel.map;
        const mapH = Game.currentLevel.height;
        const mapW = Game.currentLevel.width;

        const dirX = DIR_DX[player.dir];
        const dirY = DIR_DY[player.dir];
        // Camera plane (perpendicular to direction)
        const planeX = -dirY * Math.tan(FOV / 2);
        const planeY = dirX * Math.tan(FOV / 2);

        const halfH = h / 2;

        // Draw ceiling gradient
        const ceilTex = TextureGen.ceilingTexture();
        for (let y = 0; y < halfH; y++) {
            const rowDist = halfH / (halfH - y);
            const brightness = Math.max(0, 1 - rowDist / MAX_DEPTH) * 0.7;
            ctx.fillStyle = `rgb(${Math.floor(20 * brightness)},${Math.floor(20 * brightness)},${Math.floor(28 * brightness)})`;
            ctx.fillRect(0, y, w, 1);
        }

        // Draw floor gradient
        for (let y = halfH; y < h; y++) {
            const rowDist = halfH / (y - halfH);
            const brightness = Math.max(0, 1 - rowDist / MAX_DEPTH) * 0.7;
            ctx.fillStyle = `rgb(${Math.floor(30 * brightness)},${Math.floor(28 * brightness)},${Math.floor(25 * brightness)})`;
            ctx.fillRect(0, y, w, 1);
        }

        // Cast rays
        this.zBuffer = [];
        this.monsterSprites = [];
        const numRays = Math.min(w, NUM_RAYS);
        const stripWidth = w / numRays;

        for (let i = 0; i < numRays; i++) {
            const cameraX = 2 * i / numRays - 1;
            const rayDirX = dirX + planeX * cameraX;
            const rayDirY = dirY + planeY * cameraX;

            let mapX = Math.floor(player.x);
            let mapY = Math.floor(player.y);

            const deltaDistX = Math.abs(1 / (rayDirX || 0.00001));
            const deltaDistY = Math.abs(1 / (rayDirY || 0.00001));

            let stepX, stepY, sideDistX, sideDistY;

            if (rayDirX < 0) {
                stepX = -1;
                sideDistX = (player.x - mapX) * deltaDistX;
            } else {
                stepX = 1;
                sideDistX = (mapX + 1 - player.x) * deltaDistX;
            }
            if (rayDirY < 0) {
                stepY = -1;
                sideDistY = (player.y - mapY) * deltaDistY;
            } else {
                stepY = 1;
                sideDistY = (mapY + 1 - player.y) * deltaDistY;
            }

            // DDA
            let hit = false;
            let side = 0; // 0 = x-side, 1 = y-side
            let wallType = WALL_TYPE.STONE;
            let perpWallDist = 0;

            for (let depth = 0; depth < MAX_DEPTH * 2 && !hit; depth++) {
                if (sideDistX < sideDistY) {
                    sideDistX += deltaDistX;
                    mapX += stepX;
                    side = 0;
                } else {
                    sideDistY += deltaDistY;
                    mapY += stepY;
                    side = 1;
                }

                // Check bounds
                if (mapX < 0 || mapX >= mapW || mapY < 0 || mapY >= mapH) {
                    hit = true;
                    wallType = WALL_TYPE.STONE;
                    perpWallDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
                    break;
                }

                const cell = map[mapY] && map[mapY][mapX];
                if (!cell) { hit = true; wallType = WALL_TYPE.STONE; break; }

                if (cell.base === TILE.WALL) {
                    hit = true;
                    // Try to use themed wall texture from the previous (floor) cell
                    wallType = WALL_TYPE.STONE;
                    const oppositeSide = { north: 'south', south: 'north', east: 'west', west: 'east' };
                    let wallSide;
                    if (side === 0) {
                        wallSide = stepX > 0 ? 'west' : 'east';
                    } else {
                        wallSide = stepY > 0 ? 'north' : 'south';
                    }
                    const prevX = mapX - (side === 0 ? stepX : 0);
                    const prevY = mapY - (side === 0 ? 0 : stepY);
                    const prevCell = map[prevY] && map[prevY][prevX];
                    if (prevCell && prevCell.base !== TILE.WALL) {
                        const opp = oppositeSide[wallSide];
                        if (prevCell.walls[opp] >= 0) {
                            wallType = prevCell.walls[opp];
                        }
                    }
                    perpWallDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
                } else {
                    // FLOOR cell: check the wall edge we crossed to enter this cell
                    let wallSide;
                    if (side === 0) {
                        wallSide = stepX > 0 ? 'west' : 'east';
                    } else {
                        wallSide = stepY > 0 ? 'north' : 'south';
                    }
                    if (cell.walls[wallSide] >= 0) {
                        hit = true;
                        wallType = cell.walls[wallSide];
                        perpWallDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
                        perpWallDist = Math.max(perpWallDist, 0.01);
                    }
                }
            }

            if (!hit) {
                perpWallDist = MAX_DEPTH;
                wallType = WALL_TYPE.STONE;
            }

            perpWallDist = Math.max(perpWallDist, 0.01);
            this.zBuffer[i] = perpWallDist;

            // Calculate wall height
            const lineHeight = Math.floor(h / perpWallDist);
            let drawStart = Math.floor(-lineHeight / 2 + halfH);
            let drawEnd = Math.floor(lineHeight / 2 + halfH);

            if (drawStart < 0) drawStart = 0;
            if (drawEnd >= h) drawEnd = h - 1;

            // Texture mapping
            let texX = 0;
            if (hit) {
                let wallX;
                if (side === 0) wallX = player.y + perpWallDist * rayDirY;
                else wallX = player.x + perpWallDist * rayDirX;
                wallX -= Math.floor(wallX);
                texX = Math.floor(wallX * 64);
            }

            // Get texture and draw wall strip
            const tex = TextureGen.getWallTexture(wallType);
            if (tex && hit) {
                const stripH = drawEnd - drawStart;

                // Get or create offscreen canvas for this texture
                if (!this._texCanvases) this._texCanvases = {};
                let texCanvas = this._texCanvases[wallType];
                if (!texCanvas) {
                    texCanvas = document.createElement('canvas');
                    texCanvas.width = 64;
                    texCanvas.height = 64;
                    texCanvas.getContext('2d').putImageData(tex, 0, 0);
                    this._texCanvases[wallType] = texCanvas;
                }

                // Distance fog
                const fogFactor = Math.max(0, 1 - perpWallDist / MAX_DEPTH);

                // Draw texture column scaled to wall height
                ctx.drawImage(texCanvas, texX, 0, 1, 64,
                    Math.floor(i * stripWidth), drawStart, Math.ceil(stripWidth), stripH);

                // Fog overlay
                const fogAlpha = 1 - fogFactor;
                if (fogAlpha > 0.01) {
                    ctx.fillStyle = `rgba(10,10,15,${fogAlpha.toFixed(2)})`;
                    ctx.fillRect(Math.floor(i * stripWidth), drawStart, Math.ceil(stripWidth), stripH);
                }
                // Side darkening for Y-side walls
                if (side === 1) {
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.fillRect(Math.floor(i * stripWidth), drawStart, Math.ceil(stripWidth), stripH);
                }
            } else if (hit) {
                // Fallback solid color
                const fogFactor = Math.max(0, 1 - perpWallDist / MAX_DEPTH);
                const shade = Math.floor(100 * fogFactor * (side === 1 ? 0.7 : 1));
                ctx.fillStyle = `rgb(${shade},${shade},${shade + 10})`;
                ctx.fillRect(Math.floor(i * stripWidth), drawStart, Math.ceil(stripWidth), drawEnd - drawStart);
            }
        }

        // Render sprites (monsters, items)
        this.renderSprites(ctx, w, h, numRays, stripWidth, player, dirX, dirY, planeX, planeY);
    },

    renderSprites(ctx, w, h, numRays, stripWidth, player, dirX, dirY, planeX, planeY) {
        // Gather all visible entities
        const sprites = [];
        const map = Game.currentLevel.map;
        const mapH = Game.currentLevel.height;
        const mapW = Game.currentLevel.width;
        const halfH = h / 2;

        // Monsters
        for (let my = 0; my < mapH; my++) {
            for (let mx = 0; mx < mapW; mx++) {
                const cell = map[my][mx];
                if (cell.monsters.length > 0) {
                    const dx = mx + 0.5 - player.x;
                    const dy = my + 0.5 - player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Check if visible
                    if (dist < MAX_DEPTH && dist > 0.3) {
                        // Transform relative to camera
                        const invDet = 1.0 / (planeX * dirY - dirX * planeY);
                        const transformX = invDet * (dirY * dx - dirX * dy);
                        const transformY = invDet * (-planeY * dx + planeX * dy);

                        if (transformY > 0.1) { // In front of camera
                            const spriteScreenX = Math.floor((w / 2) * (1 + transformX / transformY));
                            const spriteHeight = Math.abs(Math.floor(h / transformY));
                            const spriteWidth = Math.abs(Math.floor(h / transformY));

                            // Only first monster per cell (for simplicity)
                            for (const monster of cell.monsters) {
                                if (monster.alive) {
                                    sprites.push({
                                        x: spriteScreenX,
                                        y: halfH - spriteHeight / 2,
                                        w: spriteWidth,
                                        h: spriteHeight,
                                        dist: transformY,
                                        perpDist: transformY,
                                        monster: monster
                                    });
                                }
                            }
                        }
                    }
                }

                // Items on ground
                if (cell.items.length > 0 && cell.base !== TILE.WALL) {
                    const idx = cell.items.length - 1;
                    const dx = mx + 0.3 - player.x;
                    const dy = my + 0.5 - player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < MAX_DEPTH && dist > 0.3) {
                        const invDet = 1.0 / (planeX * dirY - dirX * planeY);
                        const transformX = invDet * (dirY * dx - dirX * dy);
                        const transformY = invDet * (-planeY * dx + planeX * dy);
                        if (transformY > 0.1) {
                            const spriteScreenX = Math.floor((w / 2) * (1 + transformX / transformY));
                            const size = Math.abs(Math.floor(h / transformY * 0.5));
                            sprites.push({
                                x: spriteScreenX,
                                y: halfH + size * 0.2,
                                w: size,
                                h: size,
                                dist: transformY,
                                perpDist: transformY,
                                item: cell.items[idx],
                                isItem: true
                            });
                        }
                    }
                }
            }
        }

        // Sort by distance (far first)
        sprites.sort((a, b) => b.dist - a.dist);

        // Draw sprites
        for (const sprite of sprites) {
            const fogFactor = Math.max(0, 1 - sprite.perpDist / MAX_DEPTH);

            if (sprite.monster) {
                this.drawMonsterSprite(ctx, sprite, w, h, numRays, stripWidth, fogFactor);
            } else if (sprite.isItem) {
                this.drawItemSprite(ctx, sprite, w, h, fogFactor);
            }
        }
    },

    drawMonsterSprite(ctx, sprite, w, h, numRays, stripWidth, fogFactor) {
        const monster = sprite.monster;
        const halfH = h / 2;
        const spriteW = sprite.w;
        const spriteH = sprite.h;
        const sx = sprite.x;
        const sy = sprite.y;

        // Clipping against z-buffer
        const startX = Math.max(0, Math.floor(sx - spriteW / 2));
        const endX = Math.min(w, Math.floor(sx + spriteW / 2));

        for (let x = startX; x < endX; x += stripWidth) {
            const rayIdx = Math.floor(x / (w / numRays));
            if (rayIdx >= 0 && rayIdx < this.zBuffer.length && sprite.perpDist < this.zBuffer[rayIdx]) {
                // Draw this strip of the monster
                const bob = Math.sin(this.time * 2 + monster.id) * 3;
                const size = Math.min(spriteH * 0.8, h * 0.7);

                // Body
                const shade = Math.floor(200 * fogFactor);
                const bodyY = sy + bob + (spriteH - size) / 2;

                // Draw monster body as colored block with details
                ctx.fillStyle = monster.color;
                ctx.globalAlpha = fogFactor;
                const margin = (endX - startX) * 0.1;
                const bw = Math.max(stripWidth * 1.5, (endX - startX - margin * 2) / ((endX - startX) / stripWidth));
                ctx.fillRect(x, bodyY + size * 0.2, bw, size * 0.6);

                // Eyes
                ctx.fillStyle = monster.isBoss ? '#ff0000' : '#ffff00';
                const eyeSize = Math.max(2, size * 0.08);
                ctx.fillRect(x, bodyY + size * 0.25, eyeSize, eyeSize);
                ctx.fillRect(x + bw * 0.6, bodyY + size * 0.25, eyeSize, eyeSize);

                // Boss glow
                if (monster.isBoss) {
                    ctx.fillStyle = `rgba(255,0,0,${0.3 * fogFactor * Math.abs(Math.sin(this.time * 3))})`;
                    ctx.fillRect(x, bodyY, bw, size * 0.8);
                }

                ctx.globalAlpha = 1;
            }
        }

        // Draw name and HP bar above monster
        if (fogFactor > 0.2) {
            const nameY = Math.max(10, sprite.y - 10);
            ctx.font = `${Math.max(10, Math.floor(14 * fogFactor))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(255,255,255,${fogFactor})`;
            ctx.fillText(monster.name, sprite.x, nameY);

            // HP bar
            const barW = Math.min(sprite.w * 0.5, 80) * fogFactor;
            const barH = 4;
            const barX = sprite.x - barW / 2;
            const barY = nameY + 4;
            ctx.fillStyle = `rgba(60,0,0,${fogFactor})`;
            ctx.fillRect(barX, barY, barW, barH);
            const hpPct = monster.hp / monster.maxHp;
            ctx.fillStyle = hpPct > 0.5 ? `rgba(0,200,0,${fogFactor})` : hpPct > 0.25 ? `rgba(200,200,0,${fogFactor})` : `rgba(200,0,0,${fogFactor})`;
            ctx.fillRect(barX, barY, barW * hpPct, barH);
        }
    },

    drawItemSprite(ctx, sprite, w, h, fogFactor) {
        const item = sprite.item;
        const size = Math.max(8, sprite.w * 0.4);

        ctx.globalAlpha = fogFactor;
        ctx.font = `${Math.floor(size)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Pulsing effect
        const pulse = 0.8 + Math.sin(this.time * 3) * 0.2;
        ctx.globalAlpha = fogFactor * pulse;
        ctx.fillText(item.icon, sprite.x, sprite.y);
        ctx.globalAlpha = 1;
    },

    renderMinimap() {
        const canvas = document.getElementById('minimap');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const map = Game.currentLevel.map;
        const player = Game.player;
        const viewRadius = 5;

        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, w, h);

        const cellSize = Math.floor(Math.min(w, h) / (viewRadius * 2 + 1));

        for (let dy = -viewRadius; dy <= viewRadius; dy++) {
            for (let dx = -viewRadius; dx <= viewRadius; dx++) {
                const mx = Math.floor(player.x) + dx;
                const my = Math.floor(player.y) + dy;
                const sx = (dx + viewRadius) * cellSize;
                const sy = (dy + viewRadius) * cellSize;

                if (mx >= 0 && mx < Game.currentLevel.width && my >= 0 && my < Game.currentLevel.height) {
                    const cell = map[my][mx];
                    if (cell.visited || (Math.abs(dx) <= 1 && Math.abs(dy) <= 1)) {
                        if (cell.base === TILE.WALL) {
                            ctx.fillStyle = '#444466';
                        } else if (cell.base === TILE.STAIRS_DOWN) {
                            ctx.fillStyle = '#448844';
                        } else if (cell.base === TILE.STAIRS_UP) {
                            ctx.fillStyle = '#884444';
                        } else if (cell.base === TILE.FOUNTAIN) {
                            ctx.fillStyle = '#446688';
                        } else {
                            ctx.fillStyle = '#222233';
                        }
                        ctx.fillRect(sx, sy, cellSize, cellSize);

                        // Monsters
                        if (cell.monsters.length > 0 && cell.monsters.some(m => m.alive)) {
                            ctx.fillStyle = '#ff4444';
                            ctx.fillRect(sx + cellSize * 0.3, sy + cellSize * 0.3, cellSize * 0.4, cellSize * 0.4);
                        }

                        // Items
                        if (cell.items.length > 0) {
                            ctx.fillStyle = '#44ff44';
                            ctx.fillRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2);
                        }

                        // Walls on edges
                        ctx.strokeStyle = '#555577';
                        ctx.lineWidth = 1;
                        if (cell.walls.north >= 0) {
                            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + cellSize, sy); ctx.stroke();
                        }
                        if (cell.walls.south >= 0) {
                            ctx.beginPath(); ctx.moveTo(sx, sy + cellSize); ctx.lineTo(sx + cellSize, sy + cellSize); ctx.stroke();
                        }
                        if (cell.walls.west >= 0) {
                            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + cellSize); ctx.stroke();
                        }
                        if (cell.walls.east >= 0) {
                            ctx.beginPath(); ctx.moveTo(sx + cellSize, sy); ctx.lineTo(sx + cellSize, sy + cellSize); ctx.stroke();
                        }
                    }
                }
            }
        }

        // Player arrow
        const arrowSize = cellSize * 0.6;
        const cx = viewRadius * cellSize + cellSize / 2;
        const cy = viewRadius * cellSize + cellSize / 2;
        const angle = [Math.PI * 1.5, 0, Math.PI * 0.5, Math.PI][player.dir];

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.moveTo(0, -arrowSize / 2);
        ctx.lineTo(arrowSize / 3, arrowSize / 3);
        ctx.lineTo(-arrowSize / 3, arrowSize / 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    },

    renderCompass() {
        const canvas = document.getElementById('compass-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const cx = w / 2, cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        const dirs = ['N', 'E', 'S', 'W'];
        const angles = [Math.PI * 1.5, 0, Math.PI * 0.5, Math.PI];

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.fill();

        // Rotate based on player direction
        const playerAngle = angles[Game.player.dir];

        for (let i = 0; i < 4; i++) {
            const a = angles[i] - playerAngle;
            const label = dirs[i];
            const x = cx + Math.cos(a) * 20;
            const y = cy + Math.sin(a) * 20;

            ctx.fillStyle = label === 'N' ? '#ff4444' : '#888888';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x, y);
        }

        // Center dot
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
    }
};