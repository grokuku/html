// ============================================
// AI CONTROLLER
// ============================================
class AIController {
  constructor(kart, track, difficulty = 1.0) {
    this.kart = kart;
    this.track = track;
    this.difficulty = difficulty; // 0.5 = easy, 1.0 = normal, 1.5 = hard
    this.targetIndex = 10;
    this.stuckTimer = 0;
    this.lastX = kart.x;
    this.lastY = kart.y;
    this.useItemTimer = 0;
    this.avoidTimer = 0;
  }

  update(allKarts) {
    if (this.kart.finished || this.kart.spinTimer > 0) {
      return this.getIdleInput();
    }

    const path = this.track.centerPath;
    this.targetIndex = this.track.getNearestPathIndex(this.kart.x, this.kart.y);

    // Look ahead based on speed
    const lookAhead = Math.floor(Math.max(10, this.kart.speed * 3));
    let targetIdx = (this.targetIndex + lookAhead) % path.length;
    const target = path[targetIdx];

    // Calculate direction to target
    const dx = target.x - this.kart.x;
    const dy = target.y - this.kart.y;
    const targetAngle = Math.atan2(dy, dx);

    // Calculate angle difference
    let angleDiff = targetAngle - this.kart.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Build input state
    const input = {
      accelerate: true,
      brake: false,
      left: false,
      right: false,
      drift: false,
      useItem: false,
      jump: false
    };

    // Steering
    const turnThreshold = 0.05;
    if (angleDiff > turnThreshold) {
      input.right = true;
    } else if (angleDiff < -turnThreshold) {
      input.left = true;
    }

    // Drifting on sharp turns
    if (Math.abs(angleDiff) > 0.4 && this.kart.speed > 2.5) {
      input.drift = true;
    }

    // Slow down on very sharp turns
    if (Math.abs(angleDiff) > 0.8 && this.kart.speed > 2) {
      input.accelerate = false;
      // Sometimes brake
      if (this.difficulty > 0.7) {
        input.brake = true;
      }
    }

    // Avoid going off-track
    const terrain = this.track.getTerrainAt(this.kart.x, this.kart.y);
    if (terrain === TERRAIN.OFFTRACK || terrain === TERRAIN.WATER) {
      input.accelerate = true;
      // Turn towards track
      const pathIdx = this.targetIndex;
      const tp = path[pathIdx];
      const dx2 = tp.x - this.kart.x;
      const dy2 = tp.y - this.kart.y;
      const ta = Math.atan2(dy2, dx2);
      let ad = ta - this.kart.angle;
      while (ad > Math.PI) ad -= Math.PI * 2;
      while (ad < -Math.PI) ad += Math.PI * 2;
      if (ad > 0) input.right = true;
      else input.left = true;
    }

    // Speed management based on terrain
    if (terrain === TERRAIN.GRASS || terrain === TERRAIN.SAND) {
      // On grass, we might want to steer back to road
      input.accelerate = true;
    }

    // Item usage
    this.useItemTimer -= 1/60;
    if (this.kart.item !== ITEMS.NONE && this.useItemTimer <= 0) {
      this.useItemTimer = 1.0 + Math.random() * 2.0;

      const distToNext = this.getDistanceToNearestKartAhead(allKarts);
      const position = this.kart.racePosition;

      switch (this.kart.item) {
        case ITEMS.BANANA:
          // Drop banana when someone is close behind
          if (position <= 4 || Math.random() < 0.3) {
            input.useItem = true;
          }
          break;
        case ITEMS.GREEN_SHELL:
          // Fire forward when someone is ahead
          if (distToNext < 300 || Math.random() < 0.3) {
            input.useItem = true;
          }
          break;
        case ITEMS.RED_SHELL:
          // Always use red shell when available
          input.useItem = true;
          break;
        case ITEMS.MUSHROOM:
          // Use mushroom on straightaways or when behind
          if (Math.abs(angleDiff) < 0.3 || position >= 4) {
            input.useItem = true;
          }
          break;
        case ITEMS.STAR:
          // Use star when behind
          if (position >= 3) {
            input.useItem = true;
          } else if (Math.random() < 0.1) {
            input.useItem = true;
          }
          break;
        case ITEMS.LIGHTNING:
          // Use when behind
          if (position >= 2) {
            input.useItem = true;
          }
          break;
        case ITEMS.FEATHER:
          // Use when about to go off track
          if (terrain === TERRAIN.GRASS) {
            input.useItem = true;
          }
          break;
      }
    }

    // Rubber banding - adjust speed based on position relative to player
    if (this.difficulty > 0) {
      const playerKart = game.race ? game.race.playerKart : null;
      if (playerKart) {
        const playerDist = playerKart.distanceTraveled;
        const aiDist = this.kart.distanceTraveled;
        const distBehind = playerDist - aiDist;

        if (distBehind > 500) {
          // AI is far behind, speed up
          this.kart.speed = Math.min(this.kart.speed * 1.05, this.kart.maxSpeed * this.difficulty);
        } else if (distBehind < -800) {
          // AI is far ahead, slow down
          this.kart.speed *= 0.98;
        }
      }
    }

    // Stuck detection
    const moveDx = this.kart.x - this.lastX;
    const moveDy = this.kart.y - this.lastY;
    const moveDist = Math.sqrt(moveDx * moveDx + moveDy * moveDy);

    if (moveDist < 0.5 && this.kart.speed > 0.5) {
      this.stuckTimer += 1/60;
      if (this.stuckTimer > 1.0) {
        // Try to reverse
        input.accelerate = false;
        input.brake = true;
        input.left = true; // Turn around
        if (this.stuckTimer > 2.0) {
          this.kart.x += Math.cos(this.kart.angle) * 50;
          this.kart.y += Math.sin(this.kart.angle) * 50;
          this.stuckTimer = 0;
        }
      }
    } else {
      this.stuckTimer = 0;
    }

    this.lastX = this.kart.x;
    this.lastY = this.kart.y;

    // Add slight randomness for less perfect driving
    if (Math.random() < (1.0 - this.difficulty * 0.6) * 0.05) {
      input.accelerate = false;
    }

    return input;
  }

  getDistanceToNearestKartAhead(allKarts) {
    let minDist = Infinity;
    for (const other of allKarts) {
      if (other === this.kart) continue;
      const dx = other.x - this.kart.x;
      const dy = other.y - this.kart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Check if the other kart is ahead
      if (other.racePosition < this.kart.racePosition) {
        minDist = Math.min(minDist, dist);
      }
    }
    return minDist;
  }

  getIdleInput() {
    return {
      accelerate: false,
      brake: false,
      left: false,
      right: false,
      drift: false,
      useItem: false,
      jump: false
    };
  }
}