// ============================================
// SPRITE GENERATION
// ============================================
class SpriteGenerator {
  constructor() {
    this.cache = {};
  }

  getCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  // Generate character sprite (viewed from behind, on kart)
  generateKartSprite(charIdx, angle = 0) {
    const key = `kart_${charIdx}_${Math.round(angle * 10)}`;
    if (this.cache[key]) return this.cache[key];

    const c = this.getCanvas(32, 32);
    const ctx = c.getContext('2d');
    const ch = CHARACTERS[charIdx];
    const color = ch.color;

    // Rotation offset for steering
    const lean = Math.sin(angle) * 2;

    ctx.save();
    ctx.translate(16, 16);

    // Kart body
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(-10, 0, 20, 10);

    // Kart highlight
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(-8, 0, 16, 3);

    // Wheels
    ctx.fillStyle = '#404040';
    ctx.fillRect(-12, 2, 4, 6);
    ctx.fillRect(8, 2, 4, 6);

    // Driver body
    ctx.fillStyle = color;
    ctx.fillRect(-6 + lean, -12, 12, 14);

    // Head
    ctx.fillStyle = '#FFCC88';
    ctx.fillRect(-5 + lean, -18, 10, 8);

    // Hat
    ctx.fillStyle = color;
    ctx.fillRect(-6 + lean, -22, 12, 6);

    // Eyes (from behind, just small dots on the sides)
    ctx.fillStyle = '#FFF';
    ctx.fillRect(-6 + lean, -16, 3, 3);
    ctx.fillRect(3 + lean, -16, 3, 3);

    // Character emblem on hat
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ch.icon, lean, -19);

    ctx.restore();
    this.cache[key] = c;
    return c;
  }

  // Generate large character portrait for menus
  generatePortrait(charIdx) {
    const key = `portrait_${charIdx}`;
    if (this.cache[key]) return this.cache[key];

    const c = this.getCanvas(64, 64);
    const ctx = c.getContext('2d');
    const ch = CHARACTERS[charIdx];
    const color = ch.color;

    // Background with border
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#333';
    ctx.fillRect(2, 2, 60, 60);

    // Head
    ctx.fillStyle = '#FFCC88';
    ctx.fillRect(16, 8, 32, 28);

    // Hat
    ctx.fillStyle = color;
    ctx.fillRect(14, 4, 36, 14);

    // Eyes
    ctx.fillStyle = '#FFF';
    ctx.fillRect(20, 16, 8, 8);
    ctx.fillRect(36, 16, 8, 8);
    ctx.fillStyle = '#000';
    ctx.fillRect(24, 18, 4, 4);
    ctx.fillRect(40, 18, 4, 4);

    // Mustache (for Mario)
    ctx.fillStyle = '#6B3300';
    if (charIdx === 0 || charIdx === 1) {
      ctx.fillRect(20, 28, 24, 4);
    }

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(18, 36, 28, 22);

    // Emblem
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ch.icon, 32, 52);

    this.cache[key] = c;
    return c;
  }

  // Item sprites
  generateItemSprite(itemType) {
    const key = `item_${itemType}`;
    if (this.cache[key]) return this.cache[key];

    const c = this.getCanvas(24, 24);
    const ctx = c.getContext('2d');
    ctx.translate(12, 12);

    switch (itemType) {
      case ITEMS.BANANA:
        ctx.fillStyle = '#FFE030';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#C8A020';
        ctx.beginPath();
        ctx.arc(-2, -2, 3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case ITEMS.GREEN_SHELL:
        ctx.fillStyle = '#30C030';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#60E060';
        ctx.beginPath();
        ctx.arc(-2, -2, 5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case ITEMS.RED_SHELL:
        ctx.fillStyle = '#E03030';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF6060';
        ctx.beginPath();
        ctx.arc(-2, -2, 5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case ITEMS.MUSHROOM:
        ctx.fillStyle = '#E03030';
        ctx.beginPath();
        ctx.arc(0, -3, 9, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(-3, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(4, -4, 2, 0, Math.PI * 2);
        ctx.fill();
        // Stem
        ctx.fillStyle = '#F0D0A0';
        ctx.fillRect(-4, -1, 8, 8);
        break;

      case ITEMS.STAR:
        ctx.fillStyle = '#FFD700';
        this.drawStar(ctx, 0, 0, 5, 10, 5);
        ctx.fill();
        ctx.fillStyle = '#FFF030';
        this.drawStar(ctx, 0, 0, 5, 6, 3);
        ctx.fill();
        break;

      case ITEMS.LIGHTNING:
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.moveTo(-2, -10);
        ctx.lineTo(4, -2);
        ctx.lineTo(0, -2);
        ctx.lineTo(3, 10);
        ctx.lineTo(-4, 2);
        ctx.lineTo(0, 2);
        ctx.lineTo(-2, -10);
        ctx.fill();
        break;

      case ITEMS.FEATHER:
        ctx.fillStyle = '#E0E0FF';
        ctx.beginPath();
        ctx.ellipse(0, -2, 4, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#A0A0FF';
        ctx.beginPath();
        ctx.ellipse(0, 0, 2, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    this.cache[key] = c;
    return c;
  }

  drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
  }

  // Item box on track
  generateItemBox() {
    const key = 'itembox';
    if (this.cache[key]) return this.cache[key];

    const c = this.getCanvas(24, 24);
    const ctx = c.getContext('2d');

    // Blue box
    ctx.fillStyle = '#3060E0';
    ctx.fillRect(2, 2, 20, 20);

    // Question mark
    ctx.fillStyle = '#FFE030';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 12, 13);

    // Border
    ctx.strokeStyle = '#FFE030';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 20, 20);

    this.cache[key] = c;
    return c;
  }

  // Lakitu sprite
  generateLakitu() {
    const key = 'lakitu';
    if (this.cache[key]) return this.cache[key];

    const c = this.getCanvas(48, 48);
    const ctx = c.getContext('2d');

    // Cloud
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(24, 32, 16, 0, Math.PI * 2);
    ctx.arc(12, 30, 10, 0, Math.PI * 2);
    ctx.arc(36, 30, 10, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(24, 18, 8, 0, Math.PI * 2);
    ctx.fill();

    // Sunglasses
    ctx.fillStyle = '#000';
    ctx.fillRect(18, 14, 12, 5);

    // Fishing rod
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 22);
    ctx.lineTo(38, 40);
    ctx.stroke();

    this.cache[key] = c;
    return c;
  }

  // Generate a rotated/animated sprite
  generateKartFrame(charIdx, frame) {
    const key = `kartframe_${charIdx}_${frame}`;
    if (this.cache[key]) return this.cache[key];

    const c = this.getCanvas(32, 32);
    const ctx = c.getContext('2d');
    const ch = CHARACTERS[charIdx];
    const color = ch.color;
    const spin = frame === 'spin';
    const squash = frame === 'squash';

    ctx.save();
    ctx.translate(16, 16);

    if (spin) ctx.rotate(Date.now() * 0.01);
    if (squash) ctx.scale(1.0, 0.6);

    // Kart body
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(-10, 0, 20, 10);
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(-8, 0, 16, 3);

    // Wheels
    ctx.fillStyle = '#404040';
    ctx.fillRect(-12, 2, 4, squash ? 3 : 6);
    ctx.fillRect(8, 2, 4, squash ? 3 : 6);

    // Driver
    ctx.fillStyle = color;
    ctx.fillRect(-6, -12, 12, 14);
    ctx.fillStyle = '#FFCC88';
    ctx.fillRect(-5, -18, 10, 8);
    ctx.fillStyle = color;
    ctx.fillRect(-6, -22, 12, 6);

    ctx.restore();

    this.cache[key] = c;
    return c;
  }

  // Coin sprite
  generateCoin() {
    const key = 'coin';
    if (this.cache[key]) return this.cache[key];

    const c = this.getCanvas(16, 16);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(8, 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.arc(8, 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 8, 9);

    this.cache[key] = c;
    return c;
  }

  // Explosion/sparkle effect
  generateSparkle() {
    const key = 'sparkle';
    if (this.cache[key]) return this.cache[key];

    const c = this.getCanvas(16, 16);
    const ctx = c.getContext('2d');
    ctx.translate(8, 8);
    const colors = ['#FFF', '#FFD700', '#FF6600', '#FF0000'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = colors[i % colors.length];
      const angle = (i / 6) * Math.PI * 2;
      ctx.fillRect(Math.cos(angle) * 4 - 1, Math.sin(angle) * 4 - 1, 3, 3);
    }
    this.cache[key] = c;
    return c;
  }

  // Generate all sprites
  generateAll() {
    for (let i = 0; i < CHARACTERS.length; i++) {
      this.generateKartSprite(i, 0);
      this.generatePortrait(i);
    }
    for (let item in ITEMS) {
      if (ITEMS[item] > 0) this.generateItemSprite(ITEMS[item]);
    }
    this.generateItemBox();
    this.generateLakitu();
    this.generateCoin();
    this.generateSparkle();
  }
}

const sprites = new SpriteGenerator();