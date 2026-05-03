// ============================================
// HUD (Heads-Up Display)
// ============================================
class HUD {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  render(race) {
    const ctx = this.ctx;
    const playerKart = race.playerKart;
    const ch = CHARACTERS[playerKart.characterIndex];

    // Draw HUD background panels
    this.drawHUDFrame(ctx, race);

    // Position display (top left)
    this.drawPosition(ctx, playerKart.racePosition);

    // Lap display (top right)
    this.drawLapCounter(ctx, playerKart.lap, race.totalLaps);

    // Speed display (bottom center)
    this.drawSpeedometer(ctx, playerKart);

    // Item display (top section)
    this.drawItemDisplay(ctx, playerKart);

    // Minimap (bottom left)
    this.drawMinimap(ctx, race);

    // Race time (top center)
    this.drawRaceTime(ctx, race);

    // Character name tag
    this.drawNameTag(ctx, ch);
  }

  drawHUDFrame(ctx, race) {
    // Top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 30);

    // Bottom bar background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, H - 45, W, 45);
  }

  drawPosition(ctx, position) {
    const suffixes = ['ST', 'ND', 'RD', 'TH', 'TH', 'TH', 'TH', 'TH'];
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#888', '#888', '#888', '#888', '#888'];

    // Large position number
    ctx.fillStyle = colors[position - 1] || '#FFF';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(position.toString(), 10, 23);

    // Suffix
    ctx.font = 'bold 12px monospace';
    ctx.fillText(suffixes[position - 1], 35, 23);
  }

  drawLapCounter(ctx, lap, totalLaps) {
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`LAP ${Math.min(lap + 1, totalLaps)}/${totalLaps}`, W - 10, 20);
  }

  drawSpeedometer(ctx, kart) {
    const cx = W / 2;
    const cy = H - 22;

    // Speed bar background
    const barW = 200;
    const barH = 12;
    ctx.fillStyle = '#333';
    ctx.fillRect(cx - barW / 2, cy - barH / 2, barW, barH);

    // Speed bar fill
    const speedRatio = Math.abs(kart.speed) / kart.maxSpeed;
    const fillColor = kart.boostTimer > 0 || kart.driftBoostTimer > 0 ? '#FFD700' :
                     kart.starTimer > 0 ? '#FF60FF' : '#40C040';
    ctx.fillStyle = fillColor;
    ctx.fillRect(cx - barW / 2, cy - barH / 2, barW * Math.min(1, speedRatio), barH);

    // Border
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - barW / 2, cy - barH / 2, barW, barH);

    // Speed number
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(Math.abs(kart.speed) * 40)} km/h`, cx, cy - 10);
  }

  drawItemDisplay(ctx, kart) {
    const boxX = W / 2 - 20;
    const boxY = 2;
    const boxSize = 26;

    // Item box
    ctx.fillStyle = '#2060A0';
    ctx.fillRect(boxX, boxY, boxSize, boxSize);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    // Draw item icon
    if (kart.item !== ITEMS.NONE) {
      const itemSprite = sprites.generateItemSprite(kart.item);
      if (itemSprite) {
        ctx.drawImage(itemSprite, boxX + 1, boxY + 1, boxSize - 2, boxSize - 2);
      }
    } else {
      // Empty
      ctx.fillStyle = '#555';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('-', boxX + boxSize / 2, boxY + boxSize / 2 + 4);
    }
  }

  drawMinimap(ctx, race) {
    const mapSize = 80;
    const mapX = 8;
    const mapY = H - mapSize - 8;
    const track = race.track;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(mapX - 2, mapY - 2, mapSize + 4, mapSize + 4);
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);

    // Draw track path
    const path = track.centerPath;
    const bounds = this.getPathBounds(path);
    const scaleX = (mapSize - 8) / (bounds.maxX - bounds.minX);
    const scaleY = (mapSize - 8) / (bounds.maxY - bounds.minY);
    const scale = Math.min(scaleX, scaleY);
    const offsetX = mapX + (mapSize - (bounds.maxX - bounds.minX) * scale) / 2;
    const offsetY = mapY + (mapSize - (bounds.maxY - bounds.minY) * scale) / 2;

    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < path.length; i += 8) {
      const p = path[i];
      const sx = offsetX + (p.x - bounds.minX) * scale;
      const sy = offsetY + (p.y - bounds.minY) * scale;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw karts
    for (const kart of race.karts) {
      const sx = offsetX + (kart.x - bounds.minX) * scale;
      const sy = offsetY + (kart.y - bounds.minY) * scale;

      if (kart === race.playerKart) {
        // Player is larger and highlighted
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(sx - 3, sy - 3, 6, 6);
      } else {
        const ch = CHARACTERS[kart.characterIndex];
        ctx.fillStyle = ch.color;
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      }
    }

    // Border
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);
  }

  drawRaceTime(ctx, race) {
    const time = race.raceTime;
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time * 100) % 100);

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`, W / 2 - 80, 20);
  }

  drawNameTag(ctx, ch) {
    ctx.fillStyle = ch.color;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(ch.name, 60, 20);
  }

  getPathBounds(path) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of path) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, maxX, minY, maxY };
  }

  // Countdown overlay
  renderCountdown(ctx, countdown) {
    const num = Math.ceil(countdown);

    // Show "GO!" for the first moment after countdown reaches 0
    if (countdown > 0 && num > 3) return;

    if (countdown <= 0) {
      // Show "GO!" briefly
      return; // GO! will be shown via a different mechanism
    }

    const text = num.toString();
    const t = num - countdown; // 0 to 1 animation progress
    const scale = 1 + t * 0.5;

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);

    // Glow
    ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.font = 'bold 80px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 2, 2);

    // Text
    const colors = ['#E03030', '#E03030', '#FFD700'];
    ctx.fillStyle = colors[Math.min(num - 1, 2)] || '#FFD700';
    ctx.font = 'bold 80px monospace';
    ctx.fillText(text, 0, 0);

    ctx.restore();
  }

  renderGo(ctx, alpha) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(W / 2, H / 2);
    ctx.scale(1.5, 1.5);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 80px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GO!', 0, 0);
    ctx.restore();
  }

  // Race finish overlay
  renderFinish(ctx, results, playerResult) {
    // Dim background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    // Results board
    const boardW = 350;
    const boardH = 320;
    const bx = (W - boardW) / 2;
    const by = (H - boardH) / 2;

    // Board background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(bx, by, boardW, boardH);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, boardW, boardH);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RACE RESULTS', W / 2, by + 30);

    // Results list
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const ch = CHARACTERS[r.characterIndex];
      const y = by + 50 + i * 30;
      const isPlayer = r.characterIndex === playerResult.characterIndex;

      // Highlight player
      if (isPlayer) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.fillRect(bx + 5, y - 12, boardW - 10, 25);
      }

      // Position
      const suffixes = ['ST', 'ND', 'RD', 'TH', 'TH', 'TH', 'TH', 'TH'];
      const posColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#888', '#888', '#888', '#888', '#888'];
      ctx.fillStyle = posColors[i];
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}${suffixes[i]}`, bx + 15, y);

      // Character color dot
      ctx.fillStyle = ch.color;
      ctx.fillRect(bx + 60, y - 8, 12, 12);

      // Name
      ctx.fillStyle = isPlayer ? '#FFD700' : '#CCC';
      ctx.font = `${isPlayer ? 'bold ' : ''}14px monospace`;
      ctx.fillText(ch.name, bx + 80, y);

      // Time
      if (r.time !== null) {
        const mins = Math.floor(r.time / 60);
        const secs = Math.floor(r.time % 60);
        const ms = Math.floor((r.time * 100) % 100);
        ctx.textAlign = 'right';
        ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`, bx + boardW - 15, y);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText('DNF', bx + boardW - 15, y);
      }
    }

    // Continue prompt
    if (Math.sin(performance.now() * 0.005) > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS ENTER TO CONTINUE', W / 2, by + boardH - 10);
    }
  }

  // Off-track warning
  renderOffTrackWarning(ctx) {
    ctx.fillStyle = `rgba(255, 0, 0, ${0.1 + Math.sin(performance.now() * 0.01) * 0.05})`;
    ctx.fillRect(0, 0, W, 30);
    ctx.fillRect(0, H - 30, W, 30);
    ctx.fillRect(0, 0, 10, H);
    ctx.fillRect(W - 10, 0, 10, H);
  }

  // Render touch controls overlay
  renderTouchControls(ctx) {
    if (!this.isTouchDevice) return;
    
    ctx.save();
    ctx.globalAlpha = 0.25;
    
    // Left arrow button
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(W * 0.12, H * 0.78, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.5;
    ctx.fillText('\u25C0', W * 0.12, H * 0.77);
    
    // Right arrow button
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(W * 0.28, H * 0.78, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.5;
    ctx.font = 'bold 24px monospace';
    ctx.fillText('\u25B6', W * 0.28, H * 0.77);
    
    // Accelerate button
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#4C4';
    ctx.beginPath();
    ctx.arc(W * 0.82, H * 0.72, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.5;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('GAS', W * 0.82, H * 0.71);
    
    // Item button
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#44F';
    ctx.beginPath();
    ctx.arc(W * 0.72, H * 0.55, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.5;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('ITEM', W * 0.72, H * 0.545);
    
    // Brake button
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#C44';
    ctx.beginPath();
    ctx.arc(W * 0.92, H * 0.85, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.5;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('BRAKE', W * 0.92, H * 0.845);
    
    // Drift button
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#CA4';
    ctx.beginPath();
    ctx.arc(W * 0.72, H * 0.88, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.5;
    ctx.font = 'bold 10px monospace';
    ctx.fillText('DRIFT', W * 0.72, H * 0.875);
    
    ctx.restore();
  }

  // Wrong way warning
  renderWrongWay(ctx) {
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WRONG WAY!', W / 2, H / 2 - 50);
  }

  // Final lap warning
  renderFinalLap(ctx) {
    const t = performance.now() * 0.005;
    if (Math.sin(t) > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FINAL LAP!', W / 2, 90);
    }
  }

  // Lap timing
  renderLapTime(ctx, lapTime) {
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LAP: ${Math.floor(lapTime / 60)}:${(lapTime % 60).toFixed(2).padStart(5, '0')}`, W / 2, H / 2);
  }
}