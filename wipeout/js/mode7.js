// ============================================
// MODE 7 RENDERER (Optimized)
// ============================================
class Mode7Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.horizonRatio = 0.42;
    this.cameraHeight = 55;
    this.focalLength = 200;
    this.maxDrawDist = 800;

    // Pre-allocate buffers
    this.groundW = W;
    this.groundH = Math.ceil(H * (1 - this.horizonRatio)) + 2;
    this.groundCanvas = document.createElement('canvas');
    this.groundCanvas.width = this.groundW;
    this.groundCanvas.height = this.groundH;
    this.groundCtx = this.groundCanvas.getContext('2d');
    this.groundImageData = this.groundCtx.createImageData(this.groundW, this.groundH);
    this.groundPixels = new Uint32Array(this.groundImageData.data.buffer);

    // Cached track surface data
    this.surfaceData = null;
    this.surfacePixels32 = null;
    this.cachedTrackId = null;
    this.lastSurfaceSize = 0;

    // Sky
    this.skyCanvas = null;
    this.generateSky();

    // Frame counter for animations
    this.frameCount = 0;
  }

  generateSky() {
    // Make sky 2x wide for seamless scrolling
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = W * 2;
    this.skyCanvas.height = Math.floor(H * this.horizonRatio) + 50;
    const skyW = W * 2;
    const ctx = this.skyCanvas.getContext('2d');

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, this.skyCanvas.height);
    gradient.addColorStop(0, '#14148C');
    gradient.addColorStop(0.3, '#3060D0');
    gradient.addColorStop(0.6, '#5C94FC');
    gradient.addColorStop(0.85, '#88CCFF');
    gradient.addColorStop(1, '#CCE0FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, skyW, this.skyCanvas.height);

    // Clouds - use seeded random for consistent pattern
    const rng = this.seededRandom(42);
    for (let i = 0; i < 25; i++) {
      const cx = rng() * skyW;
      const cy = 15 + rng() * (this.skyCanvas.height * 0.55);
      const sz = 25 + rng() * 55;
      this.drawCloud(ctx, cx, cy, sz);
    }

    // Background hills - seamless across full width
    ctx.fillStyle = '#60A030';
    ctx.beginPath();
    ctx.moveTo(0, this.skyCanvas.height);
    for (let x = 0; x <= skyW; x += 8) {
      const h = this.skyCanvas.height - 15
        + Math.sin(x * 0.008) * 22
        + Math.sin(x * 0.02) * 11
        + Math.sin(x * 0.005 + 1) * 16;
      ctx.lineTo(x, h);
    }
    ctx.lineTo(skyW, this.skyCanvas.height);
    ctx.closePath();
    ctx.fill();

    // Closer hills
    ctx.fillStyle = '#488020';
    ctx.beginPath();
    ctx.moveTo(0, this.skyCanvas.height);
    for (let x = 0; x <= skyW; x += 8) {
      const h = this.skyCanvas.height - 5
        + Math.sin(x * 0.012 + 2) * 16
        + Math.sin(x * 0.025) * 9;
      ctx.lineTo(x, h);
    }
    ctx.lineTo(skyW, this.skyCanvas.height);
    ctx.closePath();
    ctx.fill();
  }

  seededRandom(seed) {
    return function() {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  drawCloud(ctx, x, y, size) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y - size * 0.1, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y, size * 0.35, 0, Math.PI * 2);
    ctx.arc(x - size * 0.25, y + size * 0.05, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cache track surface data for fast access
  cacheTrackData(track) {
    if (this.cachedTrackId === track.name && this.lastSurfaceSize === track.size) {
      return; // Already cached
    }

    try {
      const size = track.size;
      const surfCtx = track.surfaceCanvas.getContext('2d');
      if (!surfCtx) {
        console.error('Failed to get surface canvas context');
        return;
      }
      const surfaceImageData = surfCtx.getImageData(0, 0, size, size);
      this.surfaceData = surfaceImageData.data;
      this.surfacePixels32 = new Uint32Array(surfaceImageData.data.buffer);
      this.cachedTrackId = track.name;
      this.lastSurfaceSize = size;
    } catch(e) {
      console.error('Failed to cache track data:', e);
    }
  }

  // Main render function
  render(track, cameraX, cameraY, cameraAngle, objects, playerKart) {
    this.frameCount++;

    // Cache track surface data
    this.cacheTrackData(track);

    const ctx = this.ctx;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Draw sky - seamless horizontal scroll using 2x wide sky canvas
    const skyW = this.skyCanvas.width; // W * 2
    // Normalize angle offset to wrap within sky canvas width
    let skyOffset = ((-cameraAngle * 60) % skyW);
    if (skyOffset > 0) skyOffset -= skyW;
    if (skyOffset < -skyW) skyOffset += skyW;
    ctx.drawImage(this.skyCanvas, skyOffset, 0);
    // Only draw second copy if needed
    if (skyOffset + skyW > 0) {
      ctx.drawImage(this.skyCanvas, skyOffset + skyW, 0);
    }

    // Render ground using Mode 7
    this.renderGround(ctx, track, cameraX, cameraY, cameraAngle);

    // Render sprites
    this.renderSprites(ctx, track, cameraX, cameraY, cameraAngle, objects);
  }

  renderGround(ctx, track, camX, camY, camAngle) {
    // Safety: skip ground render if surface data not loaded
    if (!this.surfaceData) {
      const hPx = Math.floor(H * this.horizonRatio);
      ctx.fillStyle = '#50A800';
      ctx.fillRect(0, hPx, W, H - hPx);
      return;
    }

    const horizonPx = Math.floor(H * this.horizonRatio);
    const camHeight = this.cameraHeight;
    const focal = this.focalLength;
    const trackSize = track.size;
    const surfaceData = this.surfaceData;
    const halfW = W / 2;
    const gw = this.groundW;
    const gh = this.groundH;
    const pixels = this.groundPixels;

    // Check if Rainbow Road for special fx
    const isRainbow = track.config.name && track.config.name.includes('Rainbow');

    // Pre-compute trig
    const cosA = Math.cos(camAngle);
    const sinA = Math.sin(camAngle);

    // Pre-compute row start values
    for (let sy = 0; sy < gh; sy++) {
      const screenY = sy + horizonPx;
      const dy = sy + 1; // distance below horizon
      if (dy <= 1) continue;

      const depth = camHeight * focal / dy;
      const lateralScale = depth / focal;

      // Distance fog
      const fogFactor = depth / this.maxDrawDist;
      let fogR = 80, fogG = 168, fogB = 0;
      if (isRainbow) { fogR = 10; fogG = 5; fogB = 30; }

      // Row base offset
      const rowOffset = sy * gw;

      // Road stripe effect
      const stripeEffect = (sy % 2 === 0) ? 0.97 : 1.0;

      for (let sx = 0; sx < gw; sx++) {
        const dx = sx - halfW;

        // World coordinates
        const localForward = depth;
        const localRight = dx * lateralScale;

        let worldX = camX + localForward * cosA - localRight * sinA;
        let worldY = camY + localForward * sinA + localRight * cosA;

        // Wrap
        let tx = ((worldX % trackSize) + trackSize) % trackSize;
        let ty = ((worldY % trackSize) + trackSize) % trackSize;

        const txi = tx | 0; // fast floor
        const tyi = ty | 0;

        // Bounds check
        if (txi < 0 || txi >= trackSize || tyi < 0 || tyi >= trackSize) {
          // Fog color
          const fogVal = (255 << 24) | ((fogB | 0) << 16) | ((fogG | 0) << 8) | (fogR | 0);
          pixels[rowOffset + sx] = fogVal;
          continue;
        }

        // Sample track surface
        const sIdx = (tyi * trackSize + txi) * 4;
        let r = surfaceData[sIdx];
        let g = surfaceData[sIdx + 1];
        let b = surfaceData[sIdx + 2];

        // Apply fog
        if (fogFactor > 0.02) {
          const f = 1 - fogFactor;
          r = (r * f + fogR * fogFactor) | 0;
          g = (g * f + fogG * fogFactor) | 0;
          b = (b * f + fogB * fogFactor) | 0;
        }

        // Stripe effect
        if (stripeEffect < 1) {
          r = (r * stripeEffect) | 0;
          g = (g * stripeEffect) | 0;
          b = (b * stripeEffect) | 0;
        }

        // ABGR format for Uint32Array (little-endian)
        pixels[rowOffset + sx] = (255 << 24) | (b << 16) | (g << 8) | r;
      }
    }

    // Write ground image data
    this.groundCtx.putImageData(this.groundImageData, 0, 0);

    // Draw ground to main canvas
    ctx.drawImage(this.groundCanvas, 0, horizonPx);

    // Rainbow Road rainbow borders
    if (isRainbow) {
      ctx.save();
      ctx.globalAlpha = 0.15;
      for (let sy = 0; sy < gh; sy += 3) {
        const depth = camHeight * focal / (sy + 2);
        if (depth > 500) continue;
        const hue = ((sy * 2) + this.frameCount) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.fillRect(0, sy + horizonPx, W, 3);
      }
      ctx.restore();
    }
  }

  // Project world position to screen
  projectToScreen(wx, wy, camX, camY, camAngle) {
    const dx = wx - camX;
    const dy = wy - camY;

    const forward = dx * Math.cos(camAngle) + dy * Math.sin(camAngle);
    const right = -dx * Math.sin(camAngle) + dy * Math.cos(camAngle);

    if (forward <= 5) return null;

    const horizonPx = Math.floor(H * this.horizonRatio);
    const screenY = horizonPx + (this.cameraHeight * this.focalLength) / forward;
    const screenX = W / 2 + (right * this.focalLength) / forward;

    if (screenX < -60 || screenX > W + 60 || screenY < horizonPx - 30 || screenY > H + 30) {
      return null;
    }

    return {
      x: screenX,
      y: screenY,
      scale: this.focalLength / forward,
      distance: forward
    };
  }

  renderSprites(ctx, track, camX, camY, camAngle, objects) {
    const projected = [];

    // Project all objects (karts, items, trees, etc. - all passed via objects array)
    for (const obj of objects) {
      const proj = this.projectToScreen(obj.x, obj.y, camX, camY, camAngle);
      if (!proj) continue;
      projected.push({ ...proj, obj });
    }

    // Sort by distance (far first - painter's algorithm)
    projected.sort((a, b) => b.distance - a.distance);

    // Draw each sprite
    for (const p of projected) {
      const obj = p.obj;
      const scale = Math.max(0.05, p.scale * 0.15);

      // Shadow
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + scale * 14, scale * 12, scale * 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(p.x, p.y);

      if (obj.type === 'kart') {
        this.drawKartSprite(ctx, obj.kart, scale);
      } else if (obj.type === 'itembox') {
        this.drawItemBoxSprite(ctx, obj, scale);
      } else if (obj.type === 'banana') {
        this.drawBananaSprite(ctx, obj, scale);
      } else if (obj.type === 'shell') {
        this.drawShellSprite(ctx, obj, scale);
      } else if (obj.type === 'tree') {
        this.drawTreeSprite(ctx, scale);
      } else if (obj.type === 'pipe') {
        this.drawPipeSprite(ctx, scale);
      }

      ctx.restore();
    }
  }

  drawKartSprite(ctx, kart, scale) {
    const ch = CHARACTERS[kart.characterIndex];
    const color = ch.color;
    const size = scale * 16;

    if (size < 2) return; // Too far to see

    // Spin effect
    if (kart.spinTimer > 0) {
      ctx.rotate(kart.spinTimer * 12);
    }

    // Shrink effect
    if (kart.shrinkTimer > 0) {
      ctx.scale(0.6, 0.6);
    }

    // Star effect
    if (kart.starTimer > 0) {
      const hue = (performance.now() * 0.5) % 360;
      ctx.globalAlpha = 0.8 + Math.sin(performance.now() * 0.02) * 0.2;
    }

    // Kart body
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(-size * 0.8, -size * 0.1, size * 1.6, size * 0.8);
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(-size * 0.6, -size * 0.1, size * 1.2, size * 0.25);

    // Wheels
    ctx.fillStyle = '#333';
    ctx.fillRect(-size * 0.9, size * 0.1, size * 0.25, size * 0.5);
    ctx.fillRect(size * 0.65, size * 0.1, size * 0.25, size * 0.5);

    // Driver body
    ctx.fillStyle = color;
    ctx.fillRect(-size * 0.45, -size * 1.0, size * 0.9, size * 0.85);

    // Driver head
    ctx.fillStyle = '#FFCC88';
    ctx.fillRect(-size * 0.35, -size * 1.5, size * 0.7, size * 0.55);

    // Hat
    ctx.fillStyle = color;
    ctx.fillRect(-size * 0.4, -size * 1.8, size * 0.8, size * 0.4);

    // Character emblem
    if (size > 8) {
      ctx.fillStyle = '#FFF';
      ctx.font = `bold ${Math.max(4, size * 0.3)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(ch.icon, 0, -size * 1.55);
    }

    // Star trail
    if (kart.starTimer > 0) {
      ctx.strokeStyle = `hsl(${(performance.now() * 0.5) % 360}, 100%, 60%)`;
      ctx.lineWidth = Math.max(1, size * 0.1);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = performance.now() * 0.003 + i * Math.PI / 4;
        const r = size * 1.3;
        ctx.moveTo(0, -size * 0.5);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r - size * 0.5);
      }
      ctx.stroke();
    }
  }

  drawItemBoxSprite(ctx, obj, scale) {
    const size = scale * 12;
    if (size < 2) return;

    const bobY = Math.sin((obj.bobTimer || 0) + performance.now() * 0.003) * size * 0.25;

    ctx.save();
    ctx.translate(0, bobY);

    // Shadow
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.6, size * 0.8, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 3D box - bottom face
    ctx.fillStyle = '#2050B0';
    ctx.fillRect(-size, -size + size * 0.2, size * 2, size * 2);

    // 3D box - top face
    ctx.fillStyle = '#4080E0';
    ctx.fillRect(-size, -size, size * 2, size * 1.2);

    // 3D box - side highlight
    ctx.fillStyle = '#3060C8';
    ctx.fillRect(-size, -size + size * 0.2, size * 0.15, size * 2);
    ctx.fillRect(size * 0.85, -size + size * 0.2, size * 0.15, size * 2);

    // Yellow center
    ctx.fillStyle = '#FFE030';
    ctx.fillRect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.1);

    // Question mark
    if (size > 4) {
      ctx.fillStyle = '#2050B0';
      ctx.font = `bold ${Math.max(6, size * 1.2)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, -size * 0.1);
    }

    // Border glow
    ctx.strokeStyle = '#FFE030';
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.strokeRect(-size, -size, size * 2, size * 2);

    ctx.restore();
  }

  drawBananaSprite(ctx, obj, scale) {
    const size = scale * 8;
    if (size < 2) return;
    ctx.fillStyle = '#FFE020';
    ctx.beginPath();
    ctx.arc(0, -size * 0.3, size * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C8A010';
    ctx.beginPath();
    ctx.arc(-size * 0.15, -size * 0.5, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  drawShellSprite(ctx, obj, scale) {
    const size = scale * 8;
    if (size < 2) return;
    const isRed = obj.shellType === 'red';
    ctx.fillStyle = isRed ? '#E03030' : '#30C030';
    ctx.beginPath();
    ctx.arc(0, -size * 0.3, size * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isRed ? '#FF6060' : '#60E060';
    ctx.beginPath();
    ctx.arc(-size * 0.1, -size * 0.5, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  drawTreeSprite(ctx, scale) {
    const size = scale * 20;
    if (size < 2) return;

    // Shadow on ground
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.3, size * 0.3, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Trunk (tapered)
    ctx.fillStyle = '#6B3410';
    ctx.beginPath();
    ctx.moveTo(-size * 0.05, size * 0.2);
    ctx.lineTo(-size * 0.09, -size * 0.15);
    ctx.lineTo(size * 0.09, -size * 0.15);
    ctx.lineTo(size * 0.05, size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Trunk shading
    ctx.fillStyle = '#4A2508';
    ctx.beginPath();
    ctx.moveTo(-size * 0.02, size * 0.2);
    ctx.lineTo(-size * 0.02, -size * 0.15);
    ctx.lineTo(size * 0.09, -size * 0.15);
    ctx.lineTo(size * 0.05, size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Canopy layers (back to front for depth)
    // Bottom layer (darker, wider)
    ctx.fillStyle = '#145A14';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.2, size * 0.38, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Middle layer
    ctx.fillStyle = '#1E7A1E';
    ctx.beginPath();
    ctx.ellipse(-size * 0.03, -size * 0.32, size * 0.3, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Top layer (lighter, smaller)
    ctx.fillStyle = '#2A9A2A';
    ctx.beginPath();
    ctx.ellipse(-size * 0.05, -size * 0.44, size * 0.22, size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = '#40B840';
    ctx.beginPath();
    ctx.ellipse(-size * 0.1, -size * 0.42, size * 0.1, size * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPipeSprite(ctx, scale) {
    const size = scale * 15;
    if (size < 3) return;

    ctx.fillStyle = '#68A868';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.05, size * 0.3, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#50C850';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.15, size * 0.35, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.12, size * 0.22, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}