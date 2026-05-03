// ============================================
// SCREENS (Title, Select, Results)
// ============================================
class ScreenManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = GAME_STATES.TITLE;
    this.selectedCharacter = 0;
    this.selectedTrack = 0;
    this.animationTimer = 0;
    this.flashTimer = 0;
    this.menuScroll = 0;
    this.titleKarts = [];

    // Initialize title screen kart positions
    for (let i = 0; i < 8; i++) {
      this.titleKarts.push({
        angle: (i / 8) * Math.PI * 2,
        x: 256 + Math.cos((i / 8) * Math.PI * 2) * 150,
        y: 192 + Math.sin((i / 8) * Math.PI * 2) * 100,
        speed: 1.5,
        characterIndex: i
      });
    }
  }

  update(dt) {
    this.animationTimer += dt;
    this.flashTimer += dt;

    // Animate title karts
    for (const kart of this.titleKarts) {
      kart.angle += kart.speed * dt;
      kart.x = W / 2 + Math.cos(kart.angle) * 200;
      kart.y = H / 2 + Math.sin(kart.angle * 0.7) * 80;
    }
  }

  setTitleState() {
    this.state = GAME_STATES.TITLE;
    this.animationTimer = 0;
  }

  setCharacterSelectState() {
    this.state = GAME_STATES.CHARACTER_SELECT;
    this.selectedCharacter = 0;
    this.animationTimer = 0;
    audio.playMenuConfirm();
  }

  setTrackSelectState() {
    this.state = GAME_STATES.TRACK_SELECT;
    this.selectedTrack = 0;
    this.animationTimer = 0;
    audio.playMenuConfirm();
  }

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    switch (this.state) {
      case GAME_STATES.TITLE:
        this.renderTitle(ctx);
        break;
      case GAME_STATES.CHARACTER_SELECT:
        this.renderCharacterSelect(ctx);
        break;
      case GAME_STATES.TRACK_SELECT:
        this.renderTrackSelect(ctx);
        break;
    }
  }

  renderTitle(ctx) {
    // Background - gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a0a2e');
    grad.addColorStop(0.5, '#2d1b69');
    grad.addColorStop(1, '#0a1628');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (let i = 0; i < 50; i++) {
      const x = (i * 137 + this.animationTimer * 10) % W;
      const y = (i * 97) % H;
      const brightness = 0.3 + Math.sin(this.animationTimer * 2 + i) * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${brightness})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Animated kart circle
    for (const kart of this.titleKarts) {
      const ch = CHARACTERS[kart.characterIndex];
      ctx.fillStyle = ch.color;
      ctx.fillRect(kart.x - 8, kart.y - 8, 16, 16);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ch.icon, kart.x, kart.y - 12);
    }

    // Checkered flag pattern
    ctx.fillStyle = '#FFF';
    for (let x = 0; x < W; x += 16) {
      for (let y = 0; y < 20; y += 16) {
        if ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0) {
          ctx.fillRect(x, y, 16, 16);
        }
      }
    }
    ctx.fillStyle = '#000';
    for (let x = 0; x < W; x += 16) {
      for (let y = 0; y < 20; y += 16) {
        if ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 1) {
          ctx.fillRect(x, y, 16, 16);
        }
      }
    }

    // Title
    const titleY = 70 + Math.sin(this.animationTimer * 2) * 5;

    // Title shadow
    ctx.fillStyle = '#000';
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SUPER', W / 2 + 3, titleY + 3);
    ctx.fillText('MARIO KART', W / 2 + 3, titleY + 53);

    // Title text with gradient-like effect
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.fillText('SUPER', W / 2, titleY);
    ctx.fillStyle = '#E03030';
    ctx.fillText('MARIO KART', W / 2, titleY + 50);

    // Subtitle
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('HTML EDITION', W / 2, titleY + 75);

    // Menu options
    const menuY = H - 100;
    const options = ['GRAND PRIX', 'TIME TRIAL', 'VS RACE'];
    options.forEach((option, i) => {
      const y = menuY + i * 30;
      const isSelected = i === 0;
      const flash = Math.sin(this.animationTimer * 4 + i * 0.5) > 0;

      if (isSelected && flash) {
        ctx.fillStyle = '#FFD700';
      } else {
        ctx.fillStyle = '#FFF';
      }
      ctx.font = `${isSelected ? 'bold ' : ''}18px monospace`;
      ctx.fillText(option, W / 2, y);
    });

    // Press start
    if (Math.sin(this.animationTimer * 3) > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('PRESS ENTER TO START', W / 2, H - 30);
    }

    // Credits
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText('Use Arrow Keys / WASD to Drive • Space for Items • Shift to Drift', W / 2, H - 10);
  }

  renderCharacterSelect(ctx) {
    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a0a2e');
    grad.addColorStop(1, '#0a1628');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT YOUR RACER', W / 2, 40);

    // Character grid - 2 rows of 4
    const startX = W / 2 - 210;
    const startY = 90;
    const cardW = 100;
    const cardH = 120;
    const gap = 12;

    for (let i = 0; i < 8; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const ch = CHARACTERS[i];
      const isSelected = i === this.selectedCharacter;

      // Card background
      ctx.fillStyle = isSelected ? '#FFD700' : '#333';
      ctx.fillRect(x - 2, y - 2, cardW + 4, cardH + 4);

      ctx.fillStyle = isSelected ? '#2a1a00' : '#222';
      ctx.fillRect(x, y, cardW, cardH);

      // Character color accent
      ctx.fillStyle = ch.color;
      ctx.fillRect(x, y, cardW, 4);

      // Portrait
      const portrait = sprites.generatePortrait(i);
      ctx.drawImage(portrait, x + 18, y + 10, 64, 64);

      // Name
      ctx.fillStyle = isSelected ? '#FFD700' : '#CCC';
      ctx.font = `${isSelected ? 'bold ' : ''}12px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(ch.name, x + cardW / 2, y + cardH - 30);

      // Stats
      ctx.font = '9px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText(`SPD:${'★'.repeat(ch.speed)}${'☆'.repeat(5 - ch.speed)}`, x + cardW / 2, y + cardH - 17);
      ctx.fillText(`ACC:${'★'.repeat(ch.accel)}${'☆'.repeat(5 - ch.accel)}`, x + cardW / 2, y + cardH - 6);
    }

    // Selected character detail
    const sel = CHARACTERS[this.selectedCharacter];
    const detailY = startY + 2 * (cardH + gap) + 20;

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(sel.name, W / 2, detailY);

    // Stats bars
    const stats = [
      { name: 'SPEED', value: sel.speed },
      { name: 'ACCEL', value: sel.accel },
      { name: 'WEIGHT', value: sel.weight },
      { name: 'HANDLING', value: sel.handling }
    ];

    stats.forEach((stat, i) => {
      const y = detailY + 25 + i * 22;
      ctx.fillStyle = '#AAA';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(stat.name, W / 2 - 80, y);

      // Bar background
      ctx.fillStyle = '#444';
      ctx.fillRect(W / 2 - 10, y - 10, 100, 12);

      // Bar fill
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(W / 2 - 10, y - 10, stat.value * 20, 12);
    });

    // Instructions
    if (Math.sin(this.animationTimer * 3) > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS ENTER TO SELECT', W / 2, H - 25);
    }

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('← → TO SELECT   ENTER TO CONFIRM', W / 2, H - 8);
  }

  renderTrackSelect(ctx) {
    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a0a2e');
    grad.addColorStop(1, '#0a1628');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT COURSE', W / 2, 40);

    // Track previews
    const cardW = 220;
    const cardH = 120;
    const startX = W / 2 - cardW - 10;
    const startY = 70;

    for (let i = 0; i < tracks.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (cardW + 20);
      const y = startY + row * (cardH + 15);
      const track = tracks[i];
      const isSelected = i === this.selectedTrack;

      // Card border
      ctx.fillStyle = isSelected ? '#FFD700' : '#555';
      ctx.fillRect(x - 3, y - 3, cardW + 6, cardH + 6);

      ctx.fillStyle = '#111';
      ctx.fillRect(x, y, cardW, cardH);

      // Mini track preview
      const previewSize = 70;
      const px = x + 10;
      const py = y + (cardH - previewSize) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, previewSize, previewSize);
      ctx.clip();

      // Draw track path miniaturized
      ctx.fillStyle = '#0a3a0a';
      ctx.fillRect(px, py, previewSize, previewSize);

      const path = track.centerPath;
      const bounds = this.getPathBounds(path);
      const scale = Math.min(previewSize / (bounds.maxX - bounds.minX), previewSize / (bounds.maxY - bounds.minY)) * 0.8;
      const offsetX = px + (previewSize - (bounds.maxX - bounds.minX) * scale) / 2;
      const offsetY = py + (previewSize - (bounds.maxY - bounds.minY) * scale) / 2;

      ctx.strokeStyle = '#888';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let j = 0; j < path.length; j += 5) {
        const p = path[j];
        const sx = offsetX + (p.x - bounds.minX) * scale;
        const sy = offsetY + (p.y - bounds.minY) * scale;
        if (j === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.stroke();

      // Start position
      const sp = path[0];
      const spx = offsetX + (sp.x - bounds.minX) * scale;
      const spy = offsetY + (sp.y - bounds.minY) * scale;
      ctx.fillStyle = '#FF0';
      ctx.fillRect(spx - 3, spy - 3, 6, 6);

      ctx.restore();

      // Track name
      ctx.fillStyle = isSelected ? '#FFD700' : '#CCC';
      ctx.font = `${isSelected ? 'bold ' : ''}16px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(track.name, x + 90, y + 30);

      // Track info
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.fillText('Laps: 3', x + 90, y + 50);

      // Difficulty stars
      const difficulty = i + 1;
      ctx.fillText(`Difficulty: ${'★'.repeat(difficulty)}${'☆'.repeat(4 - difficulty)}`, x + 90, y + 65);
    }

    // Instructions
    if (Math.sin(this.animationTimer * 3) > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS ENTER TO RACE!', W / 2, H - 25);
    }

    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    ctx.fillText('← → TO SELECT   ENTER TO CONFIRM   ESC TO GO BACK', W / 2, H - 8);
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
}