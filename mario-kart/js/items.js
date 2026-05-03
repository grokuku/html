// ============================================
// ITEMS SYSTEM
// ============================================
class ItemManager {
  constructor() {
    this.items = []; // Items on the track
    this.itemBoxes = []; // Item boxes on the track
    this.itemBoxRespawnTime = 5; // seconds to respawn
  }

  init(track) {
    this.items = [];
    this.itemBoxes = [];
    track.itemBoxPositions.forEach(pos => {
      this.itemBoxes.push({
        x: pos.x,
        y: pos.y,
        active: true,
        respawnTimer: 0,
        bobTimer: 0
      });
    });
  }

  update(dt, karts, track) {
    // Update item box respawn timers
    for (const box of this.itemBoxes) {
      box.bobTimer += dt * 3;
      if (!box.active) {
        box.respawnTimer -= dt;
        if (box.respawnTimer <= 0) {
          box.active = true;
        }
      } else {
        // Check if any kart collected this box
        for (const kart of karts) {
          if (kart.finished) continue;
          const dx = kart.x - box.x;
          const dy = kart.y - box.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 25) {
            this.collectItemBox(kart);
            box.active = false;
            box.respawnTimer = this.itemBoxRespawnTime;
            break;
          }
        }
      }
    }

    // Update active items (shells, bananas)
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.lifetime -= dt;

      if (item.lifetime <= 0) {
        this.items.splice(i, 1);
        continue;
      }

      if (item.type === 'green_shell' || item.type === 'red_shell') {
        this.updateShell(item, dt, karts, track);
      } else if (item.type === 'banana') {
        this.updateBanana(item, karts);
      }
    }
  }

  collectItemBox(kart) {
    if (kart.item !== ITEMS.NONE) return;
    audio.playItemPickup();

    // Determine item based on position (rubber banding)
    const position = kart.racePosition;
    const rand = Math.random();

    if (position >= 6) {
      // Back positions get better items
      if (rand < 0.15) kart.item = ITEMS.STAR;
      else if (rand < 0.30) kart.item = ITEMS.RED_SHELL;
      else if (rand < 0.50) kart.item = ITEMS.MUSHROOM;
      else if (rand < 0.65) kart.item = ITEMS.GREEN_SHELL;
      else if (rand < 0.80) kart.item = ITEMS.BANANA;
      else if (rand < 0.90) kart.item = ITEMS.LIGHTNING;
      else kart.item = ITEMS.MUSHROOM;
    } else if (position >= 3) {
      // Middle positions
      if (rand < 0.05) kart.item = ITEMS.STAR;
      else if (rand < 0.20) kart.item = ITEMS.RED_SHELL;
      else if (rand < 0.40) kart.item = ITEMS.MUSHROOM;
      else if (rand < 0.60) kart.item = ITEMS.GREEN_SHELL;
      else if (rand < 0.80) kart.item = ITEMS.BANANA;
      else kart.item = ITEMS.FEATHER;
    } else {
      // Front positions get weaker items
      if (rand < 0.05) kart.item = ITEMS.RED_SHELL;
      else if (rand < 0.15) kart.item = ITEMS.MUSHROOM;
      else if (rand < 0.45) kart.item = ITEMS.GREEN_SHELL;
      else if (rand < 0.80) kart.item = ITEMS.BANANA;
      else kart.item = ITEMS.BANANA;
    }
  }

  useItem(kart, allKarts, track) {
    if (kart.item === ITEMS.NONE || kart.itemCooldown > 0) return;
    kart.itemCooldown = 0.5;

    switch (kart.item) {
      case ITEMS.BANANA:
        this.dropBanana(kart);
        break;
      case ITEMS.GREEN_SHELL:
        this.throwGreenShell(kart, track);
        break;
      case ITEMS.RED_SHELL:
        this.throwRedShell(kart, allKarts, track);
        break;
      case ITEMS.MUSHROOM:
        kart.applyBoost(1.5);
        break;
      case ITEMS.STAR:
        kart.collectStar();
        break;
      case ITEMS.LIGHTNING:
        this.useLightning(kart, allKarts);
        break;
      case ITEMS.FEATHER:
        kart.jump();
        break;
    }

    kart.item = ITEMS.NONE;
  }

  dropBanana(kart) {
    audio.playBananaDrop();
    const behindX = kart.x - Math.cos(kart.angle) * 25;
    const behindY = kart.y - Math.sin(kart.angle) * 25;
    this.items.push({
      type: 'banana',
      x: behindX,
      y: behindY,
      owner: kart,
      lifetime: 30,
      hit: false
    });
  }

  throwGreenShell(kart, track) {
    audio.playShellThrow();
    this.items.push({
      type: 'green_shell',
      x: kart.x + Math.cos(kart.angle) * 20,
      y: kart.y + Math.sin(kart.angle) * 20,
      vx: Math.cos(kart.angle) * 6,
      vy: Math.sin(kart.angle) * 6,
      owner: kart,
      lifetime: 15,
      bounces: 5,
      hit: false,
      shellType: 'green'
    });
  }

  throwRedShell(kart, allKarts, track) {
    audio.playShellThrow();
    // Find kart ahead
    let target = null;
    let bestDist = Infinity;
    for (const other of allKarts) {
      if (other === kart || other.finished) continue;
      if (other.racePosition < kart.racePosition) {
        const d = other.racePosition < kart.racePosition ? kart.racePosition - other.racePosition : 999;
        if (d < bestDist) {
          bestDist = d;
          target = other;
        }
      }
    }

    this.items.push({
      type: 'red_shell',
      x: kart.x + Math.cos(kart.angle) * 20,
      y: kart.y + Math.sin(kart.angle) * 20,
      vx: Math.cos(kart.angle) * 6,
      vy: Math.sin(kart.angle) * 6,
      owner: kart,
      target: target,
      lifetime: 12,
      bounces: 1,
      hit: false,
      shellType: 'red'
    });
  }

  useLightning(kart, allKarts) {
    audio.playHit();
    for (const other of allKarts) {
      if (other === kart || other.starTimer > 0) continue;
      other.shrink(5);
      other.speed *= 0.3;
    }
    // Visual flash
    game.lightningFlash = 0.3;
  }

  updateShell(shell, dt, karts, track) {
    // Red shell homing
    if (shell.type === 'red_shell' && shell.target && !shell.target.finished) {
      const dx = shell.target.x - shell.x;
      const dy = shell.target.y - shell.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const speed = 6;
        const homingStrength = 0.05;
        const desiredVx = (dx / dist) * speed;
        const desiredVy = (dy / dist) * speed;
        shell.vx += (desiredVx - shell.vx) * homingStrength;
        shell.vy += (desiredVy - shell.vy) * homingStrength;
        // Normalize speed
        const spd = Math.sqrt(shell.vx * shell.vx + shell.vy * shell.vy);
        if (spd > 0) {
          shell.vx = (shell.vx / spd) * speed;
          shell.vy = (shell.vy / spd) * speed;
        }
      }
    }

    shell.x += shell.vx;
    shell.y += shell.vy;

    // Wrap around
    const ts = track.size;
    if (shell.x < 0) shell.x += ts;
    if (shell.x >= ts) shell.x -= ts;
    if (shell.y < 0) shell.y += ts;
    if (shell.y >= ts) shell.y -= ts;

    // Bounce off walls (if off road, redirect)
    const terrain = track.getTerrainAt(shell.x, shell.y);
    if (terrain === TERRAIN.GRASS || terrain === TERRAIN.OFFTRACK) {
      shell.bounces--;
      if (shell.bounces <= 0) {
        shell.lifetime = 0;
        return;
      }
      // Reflect
      shell.vx = -shell.vx * 0.9;
      shell.vy = -shell.vy * 0.9;
    }

    // Check collision with karts
    for (const kart of karts) {
      if (kart === shell.owner && shell.lifetime > 13) continue; // Grace period for owner
      const dx = kart.x - shell.x;
      const dy = kart.y - shell.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 18) {
        if (kart.hitSpin()) {
          shell.lifetime = 0;
          if (game.particles) game.particles.emitExplosion(shell.x, shell.y);
          return;
        }
      }
    }
  }

  updateBanana(banana, karts) {
    // Check collision with karts
    for (const kart of karts) {
      if (kart === banana.owner && banana.lifetime > 28) continue; // Grace period
      const dx = kart.x - banana.x;
      const dy = kart.y - banana.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 18) {
        if (kart.hitSpin()) {
          banana.lifetime = 0;
          if (game.particles) game.particles.emitExplosion(banana.x, banana.y);
          return;
        }
      }
    }
  }

  // Kart-to-kart collision
  checkKartCollisions(karts) {
    for (let i = 0; i < karts.length; i++) {
      for (let j = i + 1; j < karts.length; j++) {
        const a = karts[i];
        const b = karts[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = 20;

        if (dist < minDist && dist > 0) {
          // Push apart
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const pushA = b.weight / (a.weight + b.weight);
          const pushB = a.weight / (a.weight + b.weight);

          a.x += nx * overlap * pushA;
          a.y += ny * overlap * pushA;
          b.x -= nx * overlap * pushB;
          b.y -= ny * overlap * pushB;

          // Star collision
          if (a.starTimer > 0 && b.hitSpin()) {
            // a hit b with star
          } else if (b.starTimer > 0 && a.hitSpin()) {
            // b hit a with star
          }

          // Speed exchange based on weight
          const speedExchange = 0.3;
          const relSpeed = a.speed - b.speed;
          a.speed -= relSpeed * speedExchange * (b.weight / (a.weight + b.weight));
          b.speed += relSpeed * speedExchange * (a.weight / (a.weight + b.weight));
        }
      }
    }
  }

  getAllObjects() {
    const objects = [];
    this.itemBoxes.forEach(box => {
      if (box.active) {
        objects.push({
          x: box.x,
          y: box.y,
          type: 'itembox',
          bobTimer: box.bobTimer
        });
      }
    });
    this.items.forEach(item => {
      objects.push({
        x: item.x,
        y: item.y,
        type: item.type === 'green_shell' || item.type === 'red_shell' ? 'shell' : item.type,
        shellType: item.shellType,
        angle: Math.atan2(item.vy || 0, item.vx || 0)
      });
    });
    return objects;
  }
}