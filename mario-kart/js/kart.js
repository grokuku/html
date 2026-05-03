// ============================================
// KART PHYSICS & MOVEMENT
// ============================================
class Kart {
  constructor(characterIndex, startX, startY, startAngle) {
    this.characterIndex = characterIndex;
    this.x = startX;
    this.y = startY;
    this.angle = startAngle;
    this.speed = 0;

    const ch = CHARACTERS[characterIndex];
    this.maxSpeed = 3.0 + ch.speed * 0.35;
    this.acceleration = 0.035 + ch.accel * 0.009;
    this.handling = 0.022 + ch.handling * 0.004;
    this.weight = ch.weight;
    this.turnSpeed = 0;

    // Boost state
    this.boostTimer = 0;
    this.boostSpeed = 0;

    // Status effects
    this.spinTimer = 0;
    this.squashTimer = 0;
    this.starTimer = 0;
    this.invincibleTimer = 0;
    this.shrinkTimer = 0;

    // Drift
    this.drifting = false;
    this.driftDirection = 0;
    this.driftBoostTimer = 0;
    this.miniTurbo = 0;

    // Jump
    this.jumping = false;
    this.jumpHeight = 0;
    this.jumpVelocity = 0;

    // Items
    this.item = ITEMS.NONE;
    this.itemCooldown = 0;

    // Race state
    this.lap = 0;
    this.nextCheckpoint = 1;
    this.finished = false;
    this.finishTime = 0;
    this.racePosition = 1;
    this.distanceTraveled = 0;
    this.lastPathIndex = 0;

    // Coins
    this.coins = 0;

    // Previous position
    this.prevX = startX;
    this.prevY = startY;

    // Track progress tracking
    this.pathProgress = 0; // 0 to centerPath.length per lap
  }

  reset(startX, startY, startAngle) {
    this.x = startX;
    this.y = startY;
    this.angle = startAngle;
    this.speed = 0;
    this.boostTimer = 0;
    this.boostSpeed = 0;
    this.spinTimer = 0;
    this.squashTimer = 0;
    this.starTimer = 0;
    this.invincibleTimer = 0;
    this.shrinkTimer = 0;
    this.drifting = false;
    this.driftDirection = 0;
    this.driftBoostTimer = 0;
    this.miniTurbo = 0;
    this.jumping = false;
    this.jumpHeight = 0;
    this.jumpVelocity = 0;
    this.item = ITEMS.NONE;
    this.itemCooldown = 0;
    this.lap = 0;
    this.nextCheckpoint = 1;
    this.finished = false;
    this.finishTime = 0;
    this.coins = 0;
    this.prevX = startX;
    this.prevY = startY;
    this.lastPathIndex = 0;
    this.pathProgress = 0;
  }

  update(inputState, track) {
    if (this.finished) {
      this.speed *= 0.98;
      // Keep moving slowly after finish
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
      return;
    }

    // Timer updates
    this.itemCooldown -= 1/60;

    if (this.spinTimer > 0) {
      this.spinTimer -= 1/60;
      this.angle += 0.15;
      this.speed *= 0.95;
      this.updatePosition(track);
      return;
    }

    if (this.squashTimer > 0) this.squashTimer -= 1/60;
    if (this.invincibleTimer > 0) this.invincibleTimer -= 1/60;
    if (this.starTimer > 0) {
      this.starTimer -= 1/60;
      this.invincibleTimer = Math.max(this.invincibleTimer, 0.05);
    }
    if (this.shrinkTimer > 0) this.shrinkTimer -= 1/60;

    // Boost
    if (this.boostTimer > 0) {
      this.boostTimer -= 1/60;
      this.boostSpeed = this.maxSpeed * 1.5;
    } else {
      this.boostSpeed = 0;
    }

    if (this.driftBoostTimer > 0) {
      this.driftBoostTimer -= 1/60;
    }

    // Jump physics
    if (this.jumping) {
      this.jumpVelocity -= 0.5;
      this.jumpHeight += this.jumpVelocity;
      if (this.jumpHeight <= 0) {
        this.jumpHeight = 0;
        this.jumping = false;
        this.jumpVelocity = 0;
      }
    }

    // Get terrain
    const terrain = track.getTerrainAt(this.x, this.y);
    const terrainSpeedMult = TERRAIN_SPEED[terrain] || 0.5;

    // Calculate effective max speed
    const maxSpd = this.boostSpeed > 0
      ? Math.max(this.maxSpeed, this.boostSpeed)
      : (this.driftBoostTimer > 0 ? this.maxSpeed * 1.25 : this.maxSpeed);

    const coinBonus = 1 + Math.min(this.coins, 10) * 0.01;
    let effectiveMaxSpeed = maxSpd * coinBonus;

    // Boost or star override
    if (terrainSpeedMult > 1) effectiveMaxSpeed *= terrainSpeedMult;
    if (this.starTimer > 0) effectiveMaxSpeed = this.maxSpeed * 1.4;
    if (this.shrinkTimer > 0) effectiveMaxSpeed *= 0.5;

    // Acceleration/Braking
    if (inputState.accelerate) {
      if (this.speed < effectiveMaxSpeed) {
        this.speed += this.acceleration;
      }
    } else if (inputState.brake) {
      if (this.speed > -1) {
        this.speed -= this.acceleration * 1.5;
      }
    } else {
      // Friction
      if (this.speed > 0) this.speed -= 0.012;
      else if (this.speed < 0) this.speed += 0.02;
      if (Math.abs(this.speed) < 0.02) this.speed = 0;
    }

    // Speed cap
    this.speed = Math.max(-1.5, Math.min(this.speed, effectiveMaxSpeed));

    // Offroad penalty
    if (terrainSpeedMult < 1 && !this.jumping) {
      // Gradual slow down on offroad
      const penalty = 0.02 * (1 - terrainSpeedMult);
      this.speed -= penalty;
      if (this.speed < 0.5 * terrainSpeedMult) {
        this.speed = Math.max(this.speed * 0.98, 0.5 * terrainSpeedMult);
      }
    }

    // Water - even more slowdown + particle effects
    if (terrain === TERRAIN.WATER && !this.jumping) {
      this.speed *= 0.96;
      if (game.particles && Math.random() < 0.3) {
        game.particles.emitSplash(this.x, this.y);
      }
    }

    // Turning
    let turnAmount = 0;
    if (inputState.left) turnAmount = -this.handling;
    if (inputState.right) turnAmount = this.handling;

    // Turn rate depends on speed
    const speedFactor = Math.min(1, Math.abs(this.speed) / 2);
    turnAmount *= speedFactor;

    // Drift mechanics
    if (inputState.drift && (inputState.left || inputState.right) && Math.abs(this.speed) > 1.5) {
      this.drifting = true;
      this.driftDirection = inputState.left ? -1 : 1;
      this.miniTurbo = Math.min(this.miniTurbo + 0.4, 100);
      turnAmount *= 1.6;

      // Drift sparks
      if (game.particles && Math.random() < 0.5) {
        game.particles.emitDriftSparks(this.x, this.y, this.angle, this.miniTurbo);
      }
    } else {
      if (this.drifting && this.miniTurbo > 40) {
        this.driftBoostTimer = 0.3 + (this.miniTurbo / 100) * 0.3;
      }
      this.drifting = false;
      this.driftDirection = 0;
      this.miniTurbo = Math.max(0, this.miniTurbo - 3);
    }

    if (this.drifting) {
      turnAmount += this.driftDirection * this.handling * 0.5;
    }

    this.angle += turnAmount;

    // Move
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Wrap around track edges
    const ts = track.size;
    if (this.x < 0) this.x += ts;
    if (this.x >= ts) this.x -= ts;
    if (this.y < 0) this.y += ts;
    if (this.y >= ts) this.y -= ts;

    // Update path progress for positioning
    this.updatePathProgress(track);

    // Check lap progress
    this.checkLapProgress(track);
  }

  updatePosition(track) {
    // Used when spinning - just move with current momentum
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    const ts = track.size;
    if (this.x < 0) this.x += ts;
    if (this.x >= ts) this.x -= ts;
    if (this.y < 0) this.y += ts;
    if (this.y >= ts) this.y -= ts;

    this.updatePathProgress(track);
  }

  updatePathProgress(track) {
    const pathIdx = track.getNearestPathIndex(this.x, this.y);
    this.lastPathIndex = pathIdx;
    this.distanceTraveled = this.lap * track.centerPath.length + pathIdx;
    this.pathProgress = pathIdx;
  }

  checkLapProgress(track) {
    if (this.finished || !track.lapCheckpoints || track.lapCheckpoints.length === 0) return;

    // Check if we're near the next expected checkpoint
    const cp = track.lapCheckpoints[this.nextCheckpoint % track.lapCheckpoints.length];
    const dx = this.x - cp.x;
    const dy = this.y - cp.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Checkpoint radius
    const checkpointRadius = 120;

    if (dist < checkpointRadius) {
      this.nextCheckpoint++;

      // Check if we've passed all checkpoints for the current lap
      if (this.nextCheckpoint >= track.lapCheckpoints.length + 1) {
        // Completed a full set of checkpoints = completed a lap
        this.lap++;
        this.nextCheckpoint = 1; // Reset to first checkpoint (0 is start area)

        if (this.lap >= (game.race ? game.race.totalLaps : 3)) {
          this.finished = true;
          this.finishTime = game.race ? game.race.raceTime : 0;
          audio.playRaceFinish();
        } else {
          audio.playLapDone();
          if (this.lap === (game.race ? game.race.totalLaps : 3) - 1) {
            audio.playFinalLap();
          }
        }
      }
    }

    // Also detect shortcuts / wrong-way based on path progress
    // Simple: if pathIndex jumped backwards too much, it might be going wrong way
    // (We won't penalize but it helps with wrong-way detection)
  }

  hitSpin() {
    if (this.invincibleTimer > 0 || this.starTimer > 0) return false;
    this.spinTimer = 1.2;
    this.speed *= 0.3;
    this.drifting = false;
    this.miniTurbo = 0;
    audio.playSpinout();
    return true;
  }

  hitSquash() {
    if (this.invincibleTimer > 0 || this.starTimer > 0) return false;
    this.squashTimer = 2.0;
    this.speed *= 0.5;
    audio.playHit();
    return true;
  }

  applyBoost(duration = 1.0) {
    this.boostTimer = duration;
    audio.playBoost();
  }

  collectStar(duration = 8.0) {
    this.starTimer = duration;
    this.invincibleTimer = duration;
    audio.playBoost();
  }

  shrink(duration = 8.0) {
    this.shrinkTimer = duration;
  }

  jump() {
    if (!this.jumping) {
      this.jumping = true;
      this.jumpHeight = 0.01;
      this.jumpVelocity = 5;
    }
  }

  isOffTrack(track) {
    const terrain = track.getTerrainAt(this.x, this.y);
    return terrain !== TERRAIN.ROAD && terrain !== TERRAIN.FINISH && terrain !== TERRAIN.RAMPL && terrain !== TERRAIN.RAMPR;
  }
}