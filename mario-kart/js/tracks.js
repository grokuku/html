// ============================================
// TRACK GENERATION & DEFINITIONS
// ============================================
class Track {
  constructor(config) {
    this.name = config.name;
    this.config = config;
    this.size = TRACK_SIZE;
    this.surfaceCanvas = null;
    this.terrainCanvas = null;
    this.terrainData = null;
    this.centerPath = [];
    this.itemBoxPositions = [];
    this.startLine = { x: 0, y: 0, angle: 0 };
    this.lapCheckpoints = [];
    this.roadWidth = config.roadWidth || 80;
  }

  generate() {
    const c = document.createElement('canvas');
    c.width = this.size;
    c.height = this.size;
    const ctx = c.getContext('2d');
    this.surfaceCanvas = c;

    const config = this.config;
    const roadWidth = this.roadWidth;

    // Generate smooth center path via Catmull-Rom
    this.centerPath = this.generateCenterPath(config.controlPoints, config.pathResolution || 500);

    // 1) Fill base terrain (grass, sand, etc.)
    this.fillBaseTerrain(ctx, config);

    // 2) Draw road as a thick stroked path
    this.drawRoadSurface(ctx, roadWidth, config);

    // 3) Draw rumble strips
    this.drawRumbleStripsEfficient(ctx, roadWidth);

    // 4) Draw center lane markings
    this.drawLaneMarkings(ctx, roadWidth);

    // 5) Draw start/finish line
    this.drawStartFinishLine(ctx, roadWidth);

    // 6) Place item boxes
    this.placeItemBoxes(config);

    // 7) Draw decorations (trees, etc.)
    this.drawDecorations(ctx, config, roadWidth);

    // 8) Draw terrain-specific details
    if (config.waterAreas) this.drawWaterDetails(ctx, config);

    // 9) Generate terrain map for gameplay
    this.generateTerrainMap(config, roadWidth);

    // 10) Generate lap checkpoints
    this.generateCheckpoints();

    // Set start line from path
    const sp = this.centerPath[0];
    const sp2 = this.centerPath[3];
    this.startLine = {
      x: sp.x,
      y: sp.y,
      angle: Math.atan2(sp2.y - sp.y, sp2.x - sp.x)
    };
  }

  generateCenterPath(points, resolution) {
    const path = [];
    const n = points.length;

    for (let i = 0; i < resolution; i++) {
      const t = i / resolution;
      const scaledT = t * n;
      const idx = Math.floor(scaledT) % n;
      const frac = scaledT - Math.floor(scaledT);

      const p0 = points[(idx - 1 + n) % n];
      const p1 = points[idx];
      const p2 = points[(idx + 1) % n];
      const p3 = points[(idx + 2) % n];

      const t2 = frac * frac;
      const t3 = t2 * frac;

      const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * frac + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * frac + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

      path.push({ x, y });
    }
    return path;
  }

  fillBaseTerrain(ctx, config) {
    // Base color
    const bg = config.backgroundColor || { r: 80, g: 168, b: 0 };
    ctx.fillStyle = `rgb(${bg.r},${bg.g},${bg.b})`;
    ctx.fillRect(0, 0, this.size, this.size);

    // Grass texture (lighter)
    const rng = this.seededRandom(123);
    for (let i = 0; i < 15000; i++) {
      const x = rng() * this.size;
      const y = rng() * this.size;
      const shade = (rng() - 0.5) * 25;
      const r = Math.max(0, Math.min(255, bg.r + shade)) | 0;
      const g = Math.max(0, Math.min(255, bg.g + shade + rng() * 8)) | 0;
      const b = Math.max(0, Math.min(255, bg.b + shade)) | 0;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1 + (rng() * 2 | 0), 1);
    }

    // Sand patches (beach tracks)
    if (config.sandAreas) {
      config.sandAreas.forEach(area => {
        ctx.fillStyle = '#D8C078';
        ctx.beginPath();
        ctx.ellipse(area.x, area.y, area.rx, area.ry, area.rotation || 0, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 500; i++) {
          const a = rng() * Math.PI * 2;
          const d = rng();
          ctx.fillStyle = `rgb(${210 + (rng()*20)|0},${186 + (rng()*20)|0},${110 + (rng()*20)|0})`;
          ctx.fillRect(area.x + Math.cos(a) * area.rx * d, area.y + Math.sin(a) * area.ry * d, 2, 1);
        }
      });
    }
  }

  drawRoadSurface(ctx, roadWidth, config) {
    // Draw road as thick path
    const path = this.centerPath;

    // Road shadow (slightly wider, darker)
    ctx.strokeStyle = '#555';
    ctx.lineWidth = (roadWidth + 14) * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Main road
    ctx.strokeStyle = '#909090';
    ctx.lineWidth = roadWidth * 2;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Road highlight (center strip lighter)
    ctx.strokeStyle = '#A0A0A0';
    ctx.lineWidth = roadWidth * 1.2;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Road surface texture - add subtle variation
    ctx.strokeStyle = '#888';
    ctx.lineWidth = roadWidth * 1.0;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  drawRumbleStripsEfficient(ctx, roadWidth) {
    const path = this.centerPath;
    const rw = roadWidth + 6; // Slightly outside the road edge

    // Draw rumble strips as dashed thick lines on each side
    const drawRumbleSide = (side) => {
      const segLen = 6;
      for (let i = 0; i < path.length; i++) {
        if ((Math.floor(i / segLen)) % 2 === 0) continue; // Alternating

        const p = path[i];
        const next = path[(i + 1) % path.length];
        const dx = next.x - p.x;
        const dy = next.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const ox = nx * rw * side;
        const oy = ny * rw * side;

        const isRed = (Math.floor(i / (segLen * 2)) % 2 === 0);

        // Draw rumble strip segment
        ctx.fillStyle = isRed ? '#D83030' : '#F0F0F0';
        const width = 10;

        ctx.save();
        ctx.translate(p.x + ox, p.y + oy);
        ctx.rotate(Math.atan2(dy, dx));

        // Each rumble strip tile
        ctx.fillRect(-len / 2, -width / 2, len, width);

        ctx.restore();
      }
    };

    drawRumbleSide(1);
    drawRumbleSide(-1);
  }

  drawLaneMarkings(ctx, roadWidth) {
    const path = this.centerPath;
    // Dashed yellow center line
    ctx.strokeStyle = '#E0D020';
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 20]);
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawStartFinishLine(ctx, roadWidth) {
    const sp = this.centerPath[0];
    const sp2 = this.centerPath[3];
    const dx = sp2.x - sp.x;
    const dy = sp2.y - sp.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    // Checkered pattern across the road
    const squares = 10;
    const squareW = roadWidth * 2 / squares;
    const squareH = 8;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < squares; col++) {
        const isBlack = (row + col) % 2 === 0;
        ctx.fillStyle = isBlack ? '#222' : '#FFF';

        const cx = sp.x + nx * (-roadWidth + col * squareW) + (dx / len) * (row - 1) * squareH;
        const cy = sp.y + ny * (-roadWidth + col * squareW) + (dy / len) * (row - 1) * squareH;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.fillRect(-squareW / 2, -squareH / 2, squareW, squareH);
        ctx.restore();
      }
    }
  }

  placeItemBoxes(config) {
    this.itemBoxPositions = [];
    const count = config.itemBoxCount || 12;
    const spacing = Math.floor(this.centerPath.length / count);
    for (let i = spacing / 2; i < this.centerPath.length; i += spacing) {
      const idx = Math.floor(i) % this.centerPath.length;
      const p = this.centerPath[idx];
      this.itemBoxPositions.push({ x: p.x, y: p.y });
    }
  }

  drawDecorations(ctx, config, roadWidth) {
    if (config.trees === false) return;
    const path = this.centerPath;
    const rng = this.seededRandom(777);

    for (let i = 0; i < path.length; i += 35) {
      const p = path[i];
      const next = path[(i + 1) % path.length];
      const dx = next.x - p.x;
      const dy = next.y - p.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const offset = roadWidth + 25 + rng() * 50;

      // Left tree
      this.drawTree(ctx, p.x + nx * offset, p.y + ny * offset, rng);
      // Right tree
      this.drawTree(ctx, p.x - nx * offset, p.y - ny * offset, rng);
    }

    // Custom decorations
    if (config.decorations) {
      config.decorations.forEach(d => {
        if (d.type === 'pipe') this.drawPipe(ctx, d.x, d.y);
        else if (d.type === 'rock') this.drawRock(ctx, d.x, d.y);
      });
    }
  }

  drawTree(ctx, x, y, rng) {
    const s = 0.8 + rng() * 0.5;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 5, 12 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = '#6B3A10';
    ctx.fillRect(x - 3 * s, y - 4 * s, 6 * s, 16 * s);

    // Canopy
    ctx.fillStyle = '#1B6B1B';
    ctx.beginPath();
    ctx.arc(x, y - 10 * s, 13 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#28A828';
    ctx.beginPath();
    ctx.arc(x - 2 * s, y - 14 * s, 9 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPipe(ctx, x, y) {
    ctx.fillStyle = '#68A868';
    ctx.beginPath();
    ctx.ellipse(x, y, 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#50C850';
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 14, 10, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 10, 7, 0, 0, Math.PI);
    ctx.fill();
  }

  drawRock(ctx, x, y) {
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#AAA';
    ctx.beginPath();
    ctx.ellipse(x - 2, y - 2, 5, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawWaterDetails(ctx, config) {
    if (!config.waterAreas) return;
    config.waterAreas.forEach(area => {
      ctx.fillStyle = '#2060D0';
      ctx.beginPath();
      ctx.ellipse(area.x, area.y, area.rx, area.ry, area.rotation || 0, 0, Math.PI * 2);
      ctx.fill();
      // Water shimmer
      const rng = this.seededRandom(area.x | 0);
      for (let i = 0; i < 400; i++) {
        const a = rng() * Math.PI * 2;
        const d = rng();
        ctx.fillStyle = `rgba(100,180,255,${(0.2 + rng() * 0.3).toFixed(2)})`;
        ctx.fillRect(
          area.x + Math.cos(a) * area.rx * d,
          area.y + Math.sin(a) * area.ry * d,
          2 + rng() * 3, 1 + rng() * 2
        );
      }
    });
  }

  seededRandom(seed) {
    let s = seed;
    return function() {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  generateTerrainMap(config, roadWidth) {
    // Use distance-based terrain detection instead of a separate map
    // For more reliable detection, we'll use the path geometry

    // Still create a simple terrain map for pixel-level lookups
    const tc = document.createElement('canvas');
    tc.width = this.size;
    tc.height = this.size;
    const tCtx = tc.getContext('2d');
    this.terrainCanvas = tc;

    // Fill with GRASS
    tCtx.fillStyle = `rgb(${TERRAIN.GRASS},0,0)`;
    tCtx.fillRect(0, 0, this.size, this.size);

    // Sand areas
    if (config.sandAreas) {
      config.sandAreas.forEach(area => {
        tCtx.save();
        tCtx.translate(area.x, area.y);
        tCtx.rotate(area.rotation || 0);
        tCtx.fillStyle = `rgb(${TERRAIN.SAND},0,0)`;
        tCtx.beginPath();
        tCtx.ellipse(0, 0, area.rx, area.ry, 0, 0, Math.PI * 2);
        tCtx.fill();
        tCtx.restore();
      });
    }

    // Water areas
    if (config.waterAreas) {
      config.waterAreas.forEach(area => {
        tCtx.save();
        tCtx.translate(area.x, area.y);
        tCtx.rotate(area.rotation || 0);
        tCtx.fillStyle = `rgb(${TERRAIN.WATER},0,0)`;
        tCtx.beginPath();
        tCtx.ellipse(0, 0, area.rx, area.ry, 0, 0, Math.PI * 2);
        tCtx.fill();
        tCtx.restore();
      });
    }

    // Road area - draw as thick path
    const rw = roadWidth + 14; // Include rumble strip area
    tCtx.strokeStyle = `rgb(${TERRAIN.ROAD},0,0)`;
    tCtx.lineWidth = rw * 2;
    tCtx.lineCap = 'round';
    tCtx.lineJoin = 'round';
    tCtx.beginPath();
    tCtx.moveTo(this.centerPath[0].x, this.centerPath[0].y);
    for (let i = 1; i < this.centerPath.length; i++) {
      tCtx.lineTo(this.centerPath[i].x, this.centerPath[i].y);
    }
    tCtx.closePath();
    tCtx.stroke();

    // Finish line area
    tCtx.fillStyle = `rgb(${TERRAIN.FINISH},0,0)`;
    const sp = this.centerPath[0];
    const sp2 = this.centerPath[3];
    const fdx = sp2.x - sp.x;
    const fdy = sp2.y - sp.y;
    const flen = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
    const fnx = -fdy / flen;
    const fny = fdx / flen;
    tCtx.beginPath();
    tCtx.moveTo(sp.x + fnx * roadWidth, sp.y + fny * roadWidth);
    tCtx.lineTo(sp2.x + fnx * roadWidth, sp2.y + fny * roadWidth);
    tCtx.lineTo(sp2.x - fnx * roadWidth, sp2.y - fny * roadWidth);
    tCtx.lineTo(sp.x - fnx * roadWidth, sp.y - fny * roadWidth);
    tCtx.closePath();
    tCtx.fill();

    // Cache terrain data
    this.terrainData = tCtx.getImageData(0, 0, this.size, this.size).data;
  }

  generateCheckpoints() {
    this.lapCheckpoints = [];
    const numCp = 8;
    for (let i = 0; i < numCp; i++) {
      const idx = Math.floor((i / numCp) * this.centerPath.length);
      this.lapCheckpoints.push({
        x: this.centerPath[idx].x,
        y: this.centerPath[idx].y,
        pathIndex: idx
      });
    }
  }

  // Get terrain type at world position
  getTerrainAt(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.size || iy < 0 || iy >= this.size) return TERRAIN.OFFTRACK;

    if (!this.terrainData) return this.getTerrainByDistance(x, y);

    const idx = (iy * this.size + ix) * 4;
    const r = this.terrainData[idx];

    // Direct terrain map lookup
    if (r <= 9) return r;

    // Fallback: distance-based
    return this.getTerrainByDistance(x, y);
  }

  // Distance-based terrain detection (more reliable)
  getTerrainByDistance(x, y) {
    const pathIdx = this.getNearestPathIndex(x, y);
    const p = this.centerPath[pathIdx];
    const dx = p.x - x;
    const dy = p.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const rw = this.roadWidth + 10;
    if (dist < rw) return TERRAIN.ROAD;
    if (dist < rw + 5) return TERRAIN.RAMPL; // Rumble strip
    return TERRAIN.GRASS;
  }

  // Get nearest path index (optimized with spatial hashing)
  getNearestPathIndex(x, y) {
    let minDist = Infinity;
    let bestIdx = 0;
    const step = 4;
    for (let i = 0; i < this.centerPath.length; i += step) {
      const p = this.centerPath[i];
      const dx = p.x - x;
      const dy = p.y - y;
      const d = dx * dx + dy * dy;
      if (d < minDist) {
        minDist = d;
        bestIdx = i;
      }
    }
    // Refine
    const start = Math.max(0, bestIdx - step);
    const end = Math.min(this.centerPath.length, bestIdx + step + 1);
    for (let i = start; i < end; i++) {
      const p = this.centerPath[i];
      const dx = p.x - x;
      const dy = p.y - y;
      const d = dx * dx + dy * dy;
      if (d < minDist) {
        minDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  isOnRoad(x, y) {
    const t = this.getTerrainAt(x, y);
    return t === TERRAIN.ROAD || t === TERRAIN.FINISH || t === TERRAIN.BOOST || t === TERRAIN.RAMPL || t === TERRAIN.RAMPR;
  }

  getDistanceFromCenter(x, y) {
    const idx = this.getNearestPathIndex(x, y);
    const p = this.centerPath[idx];
    const dx = p.x - x;
    const dy = p.y - y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Get direction (tangent) at path index
  getPathDirection(idx) {
    const p = this.centerPath[idx];
    const next = this.centerPath[(idx + 1) % this.centerPath.length];
    return Math.atan2(next.y - p.y, next.x - p.x);
  }
}

// ============================================
// TRACK DEFINITIONS
// ============================================
const TRACK_CONFIGS = [
  {
    name: 'Mario Circuit 1',
    backgroundColor: { r: 74, g: 158, b: 0 },
    roadWidth: 80,
    controlPoints: [
      { x: 800, y: 300 },  { x: 1100, y: 250 },  { x: 1400, y: 350 },
      { x: 1550, y: 550 },  { x: 1500, y: 800 },  { x: 1350, y: 1000 },
      { x: 1100, y: 1100 }, { x: 850, y: 1200 },   { x: 650, y: 1150 },
      { x: 450, y: 1000 },  { x: 350, y: 800 },    { x: 350, y: 600 },
      { x: 450, y: 400 },   { x: 600, y: 320 },
    ],
    itemBoxCount: 12,
    pathResolution: 600,
  },
  {
    name: 'Koopa Beach 1',
    backgroundColor: { r: 210, g: 185, b: 120 },
    sandAreas: [
      { x: 500, y: 500, rx: 400, ry: 300, rotation: 0.3 },
      { x: 1500, y: 1500, rx: 350, ry: 250, rotation: -0.2 },
    ],
    waterAreas: [
      { x: 300, y: 1200, rx: 300, ry: 200, rotation: 0.5 },
      { x: 1700, y: 400, rx: 250, ry: 350, rotation: -0.3 },
      { x: 1000, y: 1650, rx: 400, ry: 200, rotation: 0.1 },
    ],
    roadWidth: 85,
    controlPoints: [
      { x: 600, y: 300 },   { x: 1000, y: 250 },  { x: 1400, y: 350 },
      { x: 1650, y: 600 },  { x: 1700, y: 900 },  { x: 1550, y: 1100 },
      { x: 1300, y: 1200 }, { x: 1000, y: 1150 }, { x: 700, y: 1050 },
      { x: 500, y: 900 },   { x: 400, y: 700 },   { x: 450, y: 500 },
    ],
    itemBoxCount: 14,
    pathResolution: 600,
  },
  {
    name: 'Choco Island 1',
    backgroundColor: { r: 139, g: 90, b: 43 },
    roadWidth: 75,
    controlPoints: [
      { x: 700, y: 400 },   { x: 1000, y: 300 },   { x: 1300, y: 350 },
      { x: 1500, y: 500 },   { x: 1600, y: 750 },   { x: 1550, y: 1000 },
      { x: 1400, y: 1150 },  { x: 1300, y: 1350 },  { x: 1100, y: 1450 },
      { x: 850, y: 1400 },   { x: 600, y: 1250 },   { x: 450, y: 1050 },
      { x: 400, y: 800 },    { x: 500, y: 600 },
    ],
    itemBoxCount: 12,
    pathResolution: 600,
  },
  {
    name: 'Rainbow Road',
    backgroundColor: { r: 8, g: 4, b: 24 },
    roadWidth: 90,
    controlPoints: [
      { x: 600, y: 350 },   { x: 900, y: 250 },  { x: 1100, y: 180 },
      { x: 1350, y: 250 },  { x: 1500, y: 400 }, { x: 1650, y: 600 },
      { x: 1750, y: 850 },  { x: 1700, y: 1050 }, { x: 1550, y: 1200 },
      { x: 1350, y: 1350 }, { x: 1100, y: 1400 }, { x: 850, y: 1350 },
      { x: 650, y: 1200 },  { x: 450, y: 1000 },  { x: 350, y: 750 },
      { x: 400, y: 550 },
    ],
    itemBoxCount: 16,
    pathResolution: 800,
  },
];

const tracks = [];

function initTracks() {
  TRACK_CONFIGS.forEach(config => {
    const track = new Track(config);
    track.generate();
    tracks.push(track);
  });
}