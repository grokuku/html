// ============================================
// MAIN GAME
// ============================================
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx.imageSmoothingEnabled = false;

    this.renderer = new Mode7Renderer(this.canvas);
    this.screenManager = new ScreenManager(this.canvas);
    this.hud = new HUD(this.canvas);
    this.input = new InputManager();
    this.particles = new ParticleSystem();

    this.state = GAME_STATES.TITLE;
    this.race = null;
    this.selectedCharacter = 0;
    this.selectedTrack = 0;
    this.lightningFlash = 0;
    this.lastTime = 0;
    this.showResults = false;
    this.resultsTimer = 0;
    this.wrongWay = false;
    this.wrongWayTimer = 0;
    this.countdownAnnounced = [false, false, false]; // 3, 2, 1

    this.setupCanvas();
  }

  setupCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    const scale = Math.min(windowW / W, windowH / H) * 0.98;

    this.canvas.style.width = (W * scale) + 'px';
    this.canvas.style.height = (H * scale) + 'px';
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = ((windowW - W * scale) / 2) + 'px';
    this.canvas.style.top = ((windowH - H * scale) / 2) + 'px';
  }

  start() {
    const initAudio = () => {
      audio.init();
      audio.resume();
      document.removeEventListener('keydown', initAudio);
      document.removeEventListener('mousedown', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
    document.addEventListener('keydown', initAudio);
    document.addEventListener('mousedown', initAudio);
    document.addEventListener('touchstart', initAudio);

    // Show loading screen
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LOADING...', W / 2, H / 2 - 20);
    ctx.fillStyle = '#FFF';
    ctx.font = '14px monospace';
    ctx.fillText('Generating tracks...', W / 2, H / 2 + 20);

    // Defer heavy init to let loading screen render
    setTimeout(() => {
      initTracks();

      ctx.fillStyle = '#FFF';
      ctx.font = '14px monospace';
      ctx.fillText('Generating sprites...', W / 2, H / 2 + 40);

      setTimeout(() => {
        sprites.generateAll();
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
      }, 50);
    }, 50);
  }

  gameLoop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    try {
      this.update(dt);
      this.render();
    } catch(e) {
      console.error('Game loop error:', e);
      // Try to show error on screen
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, H - 30, W, 30);
      this.ctx.fillStyle = '#FF0';
      this.ctx.font = '10px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('ERROR: ' + e.message, 4, H - 12);
    }

    this.input.update();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    switch (this.state) {
      case GAME_STATES.TITLE:
        this.screenManager.update(dt);
        if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('Space')) {
          this.state = GAME_STATES.CHARACTER_SELECT;
          this.screenManager.setCharacterSelectState();
        }
        break;

      case GAME_STATES.CHARACTER_SELECT:
        this.screenManager.update(dt);
        this.handleCharacterSelectInput();
        break;

      case GAME_STATES.TRACK_SELECT:
        this.screenManager.update(dt);
        this.handleTrackSelectInput();
        break;

      case GAME_STATES.COUNTDOWN:
      case GAME_STATES.RACING:
        this.updateRacing(dt);
        break;

      case GAME_STATES.RACE_FINISH:
        this.resultsTimer += dt;
        if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('Space')) {
          if (this.resultsTimer > 2) {
            this.state = GAME_STATES.RESULTS;
          }
        }
        break;

      case GAME_STATES.RESULTS:
        if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('Space')) {
          this.state = GAME_STATES.TRACK_SELECT;
          this.screenManager.setTrackSelectState();
          audio.stopMusic();
        }
        if (this.input.isKeyJustPressed('Escape')) {
          this.state = GAME_STATES.TITLE;
          this.screenManager.setTitleState();
          audio.stopMusic();
        }
        break;
    }
  }

  handleCharacterSelectInput() {
    if (this.input.isKeyJustPressed('ArrowLeft') || this.input.isKeyJustPressed('KeyA')) {
      this.selectedCharacter = (this.selectedCharacter - 1 + 8) % 8;
      this.screenManager.selectedCharacter = this.selectedCharacter;
      audio.playMenuSelect();
    }
    if (this.input.isKeyJustPressed('ArrowRight') || this.input.isKeyJustPressed('KeyD')) {
      this.selectedCharacter = (this.selectedCharacter + 1) % 8;
      this.screenManager.selectedCharacter = this.selectedCharacter;
      audio.playMenuSelect();
    }
    if (this.input.isKeyJustPressed('ArrowUp') || this.input.isKeyJustPressed('KeyW')) {
      this.selectedCharacter = (this.selectedCharacter - 4 + 8) % 8;
      this.screenManager.selectedCharacter = this.selectedCharacter;
      audio.playMenuSelect();
    }
    if (this.input.isKeyJustPressed('ArrowDown') || this.input.isKeyJustPressed('KeyS')) {
      this.selectedCharacter = (this.selectedCharacter + 4) % 8;
      this.screenManager.selectedCharacter = this.selectedCharacter;
      audio.playMenuSelect();
    }
    if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('Space')) {
      this.state = GAME_STATES.TRACK_SELECT;
      this.screenManager.setTrackSelectState();
    }
    if (this.input.isKeyJustPressed('Escape')) {
      this.state = GAME_STATES.TITLE;
      this.screenManager.setTitleState();
    }
  }

  handleTrackSelectInput() {
    if (this.input.isKeyJustPressed('ArrowLeft') || this.input.isKeyJustPressed('KeyA')) {
      this.selectedTrack = (this.selectedTrack - 1 + tracks.length) % tracks.length;
      this.screenManager.selectedTrack = this.selectedTrack;
      audio.playMenuSelect();
    }
    if (this.input.isKeyJustPressed('ArrowRight') || this.input.isKeyJustPressed('KeyD')) {
      this.selectedTrack = (this.selectedTrack + 1) % tracks.length;
      this.screenManager.selectedTrack = this.selectedTrack;
      audio.playMenuSelect();
    }
    if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('Space')) {
      this.startRace();
    }
    if (this.input.isKeyJustPressed('Escape')) {
      this.state = GAME_STATES.CHARACTER_SELECT;
      this.screenManager.setCharacterSelectState();
    }
  }

  startRace() {
    audio.playMenuConfirm();
    this.race = new Race();
    this.race.init(this.selectedTrack, this.selectedCharacter);
    this.state = GAME_STATES.COUNTDOWN;
    this.particles.reset();
    this.lightningFlash = 0;
    this.showResults = false;
    this.resultsTimer = 0;
    this.wrongWay = false;
    this.wrongWayTimer = 0;
    this.countdownAnnounced = [false, false, false];

    audio.playTrackMusic(this.selectedTrack);
  }

  updateRacing(dt) {
    if (!this.race) return;

    const prevStarted = this.race.started;

    this.race.update(dt);

    // Transition from countdown to racing
    if (this.state === GAME_STATES.COUNTDOWN && this.race.started) {
      this.state = GAME_STATES.RACING;
    }

    // Update particles
    this.particles.update(dt);

    // Emit particles for player kart
    const pk = this.race.playerKart;
    if (pk.speed > 1 && !pk.finished) {
      const terrain = this.race.track.getTerrainAt(pk.x, pk.y);
      if ((terrain === TERRAIN.GRASS || terrain === TERRAIN.OFFTRACK || terrain === TERRAIN.SAND) && Math.random() < 0.4) {
        this.particles.emitDust(pk.x, pk.y, pk.angle);
      }
      if (pk.boostTimer > 0 || pk.driftBoostTimer > 0) {
        this.particles.emitBoost(pk.x, pk.y, pk.angle);
      }
      if (pk.starTimer > 0 && Math.random() < 0.5) {
        this.particles.emitStar(pk.x, pk.y);
      }
    }

    // Lightning flash
    if (this.lightningFlash > 0) this.lightningFlash -= dt * 3;

    // Wrong way detection
    this.updateWrongWay();

    // Check race finish
    if (pk.finished && !this.showResults) {
      this.showResults = true;
      this.resultsTimer = 0;
    }

    if (this.race.finished && !this.showResults) {
      this.state = GAME_STATES.RACE_FINISH;
      this.resultsTimer = 0;
    }

    if (this.showResults) {
      this.resultsTimer += dt;
      if (this.resultsTimer > 3) {
        this.state = GAME_STATES.RACE_FINISH;
      }
    }
  }

  updateWrongWay() {
    const pk = this.race.playerKart;
    const track = this.race.track;

    if (pk.speed < 0.5 || pk.finished) {
      this.wrongWay = false;
      this.wrongWayTimer = 0;
      return;
    }

    // Check if player is moving opposite to track direction
    const pathIdx = track.getNearestPathIndex(pk.x, pk.y);
    const trackAngle = track.getPathDirection(pathIdx);

    let angleDiff = pk.angle - trackAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (Math.abs(angleDiff) > Math.PI * 0.65) {
      this.wrongWayTimer += 1/60;
      if (this.wrongWayTimer > 1.5) this.wrongWay = true;
    } else {
      this.wrongWayTimer = Math.max(0, this.wrongWayTimer - 1/60);
      if (this.wrongWayTimer < 0.5) this.wrongWay = false;
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);

    switch (this.state) {
      case GAME_STATES.TITLE:
      case GAME_STATES.CHARACTER_SELECT:
      case GAME_STATES.TRACK_SELECT:
        this.screenManager.render();
        break;

      case GAME_STATES.COUNTDOWN:
      case GAME_STATES.RACING:
      case GAME_STATES.RACE_FINISH:
        this.renderRace();
        break;

      case GAME_STATES.RESULTS:
        this.renderResultsScreen();
        break;
    }
  }

  renderRace() {
    if (!this.race) return;

    const ctx = this.ctx;
    const track = this.race.track;
    const pk = this.race.playerKart;
    const camX = pk.x;
    const camY = pk.y;
    const camAngle = pk.angle;

    // Camera shake
    let shakeX = 0, shakeY = 0;
    if (pk.spinTimer > 0) {
      shakeX = (Math.random() - 0.5) * pk.spinTimer * 10;
      shakeY = (Math.random() - 0.5) * pk.spinTimer * 10;
    }
    if (this.lightningFlash > 0) {
      shakeX += (Math.random() - 0.5) * this.lightningFlash * 8;
      shakeY += (Math.random() - 0.5) * this.lightningFlash * 8;
    }

    // Collect 3D objects for rendering
    const objects3D = [];

    // AI karts
    for (const kart of this.race.karts) {
      if (kart === pk) continue;
      objects3D.push({
        x: kart.x, y: kart.y, type: 'kart',
        kart: kart, angle: kart.angle, characterIndex: kart.characterIndex
      });
    }

    // Item boxes and items
    objects3D.push(...this.race.itemManager.getAllObjects());

    // Trees near the player
    this.addNearbyTrees(objects3D, track, camX, camY);

    // Render Mode 7 scene
    this.renderer.render(track, camX + shakeX, camY + shakeY, camAngle, objects3D, pk);

    // Render particles in 3D space
    this.particles.render(ctx, this.renderer, camX + shakeX, camY + shakeY, camAngle);

    // Render player kart on screen
    this.renderPlayerKart(pk);

    // Lightning flash overlay
    if (this.lightningFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, this.lightningFlash)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Speed lines
    if (pk.boostTimer > 0 || pk.driftBoostTimer > 0 || pk.starTimer > 0) {
      this.renderSpeedLines();
    }

    // Off-track warning
    const terrain = track.getTerrainAt(pk.x, pk.y);
    if (terrain === TERRAIN.GRASS || terrain === TERRAIN.OFFTRACK || terrain === TERRAIN.SAND) {
      this.renderOffTrackWarning();
    }

    // Wrong way
    if (this.wrongWay) {
      this.hud.renderWrongWay(ctx);
    }

    // Final lap
    if (pk.lap === this.race.totalLaps - 1 && !pk.finished) {
      this.hud.renderFinalLap(ctx);
    }

    // HUD
    this.hud.render(this.race);

    // Touch controls overlay (mobile)
    this.hud.renderTouchControls(ctx);

    // Countdown overlay
    if (!this.race.started && this.race.countdown > 0) {
      this.hud.renderCountdown(ctx, this.race.countdown);
    }
    
    // Show "GO!" briefly after race starts
    if (this.race.started && this.race.raceTime < 1.5) {
      const goAlpha = 1 - (this.race.raceTime / 1.5);
      if (goAlpha > 0) {
        this.hud.renderGo(ctx, goAlpha);
      }
    }

    // Race results overlay
    if (this.showResults && this.resultsTimer > 1) {
      const results = this.race.getResults();
      const playerResult = results.find(r => r.characterIndex === pk.characterIndex);
      this.hud.renderFinish(ctx, results, playerResult);
    }
  }

  addNearbyTrees(objects, track, camX, camY) {
    const viewDist = 800;
    const viewDistSq = viewDist * viewDist;
    const roadWidth = track.roadWidth;

    for (let i = 0; i < track.centerPath.length; i += 25) {
      const p = track.centerPath[i];
      const dx = p.x - camX;
      const dy = p.y - camY;
      const distSq = dx * dx + dy * dy;

      if (distSq < viewDistSq) {
        const nextI = (i + 1) % track.centerPath.length;
        const next = track.centerPath[nextI];
        const ddx = next.x - p.x;
        const ddy = next.y - p.y;
        const dlen = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        const dnx = -ddy / dlen;
        const dny = ddx / dlen;

        const offset = roadWidth + 30;
        objects.push({ x: p.x + dnx * offset, y: p.y + dny * offset, type: 'tree' });
        objects.push({ x: p.x - dnx * offset, y: p.y - dny * offset, type: 'tree' });
      }
    }
  }

  renderPlayerKart(kart) {
    const ctx = this.ctx;
    const ch = CHARACTERS[kart.characterIndex];
    const screenX = W / 2;
    const screenY = H * 0.73;
    const bounce = kart.jumping ? -kart.jumpHeight * 3 : 0;
    const tilt = kart.drifting ? kart.driftDirection * 0.05 : 0;

    ctx.save();
    ctx.translate(screenX, screenY + bounce);

    // Shadow
    if (!kart.jumping) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 18, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    if (tilt) ctx.rotate(tilt);

    // Squash effect
    if (kart.squashTimer > 0) ctx.scale(1.3, 0.7);
    if (kart.shrinkTimer > 0) ctx.scale(0.6, 0.6);

    // Spin effect
    if (kart.spinTimer > 0) ctx.rotate(kart.spinTimer * 12);

    // Star flash
    if (kart.starTimer > 0 && Math.sin(performance.now() * 0.02) > 0) {
      ctx.globalAlpha = 0.8;
    }

    // ---- KART BODY ----
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(-15, 4, 30, 14);
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(-12, 4, 24, 5);
    ctx.fillStyle = '#909090';
    ctx.fillRect(-15, 15, 30, 3);

    // ---- WHEELS ----
    ctx.fillStyle = '#333';
    ctx.fillRect(-17, 7, 6, 10);
    ctx.fillRect(11, 7, 6, 10);
    ctx.fillStyle = '#555';
    ctx.fillRect(-16, 8, 3, 3);
    ctx.fillRect(12, 8, 3, 3);

    // ---- DRIVER BODY ----
    ctx.fillStyle = ch.color;
    ctx.fillRect(-10, -14, 20, 20);

    // Body shading
    ctx.fillStyle = this.darkenColor(ch.color, 40);
    ctx.fillRect(-10, 0, 20, 6);

    // ---- DRIVER HEAD ----
    ctx.fillStyle = '#FFCC88';
    ctx.fillRect(-9, -26, 18, 14);

    // ---- HAT ----
    ctx.fillStyle = ch.color;
    ctx.fillRect(-10, -32, 20, 10);
    ctx.fillRect(-12, -26, 24, 3);

    // ---- EYES ----
    ctx.fillStyle = '#FFF';
    ctx.fillRect(-7, -24, 6, 5);
    ctx.fillRect(1, -24, 6, 5);

    // Pupils (look in steering direction)
    ctx.fillStyle = '#000';
    const lookDir = (this.input.getState().right ? 1 : 0) - (this.input.getState().left ? 1 : 0);
    ctx.fillRect(-5 + lookDir, -23, 3, 3);
    ctx.fillRect(3 + lookDir, -23, 3, 3);

    // Mustache (Mario/Luigi)
    if (kart.characterIndex === 0 || kart.characterIndex === 1) {
      ctx.fillStyle = '#6B3300';
      ctx.fillRect(-6, -15, 12, 2);
    }

    // Character emblem
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ch.icon, 0, -28);

    // ---- HANDS ----
    ctx.fillStyle = '#FFCC88';
    const steerAngle = (this.input.getState().right ? 3 : 0) - (this.input.getState().left ? 3 : 0);
    ctx.fillRect(-16 + steerAngle, 0, 5, 5);
    ctx.fillRect(11 + steerAngle, 0, 5, 5);

    ctx.restore(); // tilt/squash

    // ---- DRIFT SPARKS ----
    if (kart.drifting && kart.miniTurbo > 30) {
      const sparkColor = kart.miniTurbo > 70 ? '#FF4400' : kart.miniTurbo > 50 ? '#FFD700' : '#FF8800';
      for (let i = 0; i < 4; i++) {
        const side = kart.driftDirection > 0 ? 1 : -1;
        const sx = side * (14 + Math.random() * 8);
        const sy = 10 + Math.random() * 6;
        ctx.fillStyle = sparkColor;
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.fillRect(sx - 1, sy - 1, 3, 3);
      }
    }
    ctx.globalAlpha = 1;

    ctx.restore(); // position
  }

  renderSpeedLines() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    const t = performance.now() * 0.01;
    for (let i = 0; i < 15; i++) {
      const sx = (i * 37 + t * 7) % W;
      const sy = (i * 29 + t * 3) % H;
      const len = 20 + Math.random() * 40;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (sx > W / 2 ? len : -len), sy + len);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderOffTrackWarning() {
    const ctx = this.ctx;
    const alpha = 0.08 + Math.sin(performance.now() * 0.008) * 0.04;
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, W, 25);
    ctx.fillRect(0, H - 25, W, 25);
    ctx.fillRect(0, 0, 8, H);
    ctx.fillRect(W - 8, 0, 8, H);
  }

  renderResultsScreen() {
    const ctx = this.ctx;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0520');
    grad.addColorStop(1, '#1a0a3e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (!this.race) return;

    const results = this.race.getResults();
    const playerPos = results.findIndex(r => r.characterIndex === this.race.playerKart.characterIndex) + 1;

    // Trophy
    const trophyColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#666', '#666', '#666', '#666', '#666'];
    const posTexts = ['1ST!', '2ND!', '3RD!', '4TH', '5TH', '6TH', '7TH', '8TH'];

    ctx.fillStyle = trophyColors[playerPos - 1];
    ctx.font = 'bold 52px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(posTexts[playerPos - 1], W / 2, 72);

    // Trophy emblem
    if (playerPos <= 3) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '40px serif';
      ctx.fillText('🏆', W / 2 - 80, 70);
      ctx.fillText('🏆', W / 2 + 80, 70);
    }

    // Results table
    const startY = 110;
    const rowH = 32;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const ch = CHARACTERS[r.characterIndex];
      const y = startY + i * rowH;
      const isPlayer = r.characterIndex === this.race.playerKart.characterIndex;

      if (isPlayer) {
        ctx.fillStyle = 'rgba(255,215,0,0.15)';
        ctx.fillRect(W / 2 - 200, y - 14, 400, rowH);
      }

      const suffixes = ['ST', 'ND', 'RD', 'TH', 'TH', 'TH', 'TH', 'TH'];
      ctx.fillStyle = trophyColors[i];
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}${suffixes[i]}`, W / 2 - 190, y);

      // Character color dot
      ctx.fillStyle = ch.color;
      ctx.beginPath();
      ctx.arc(W / 2 - 100, y - 4, 8, 0, Math.PI * 2);
      ctx.fill();

      // Name
      ctx.fillStyle = isPlayer ? '#FFD700' : '#CCC';
      ctx.font = `${isPlayer ? 'bold ' : ''}14px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(ch.name, W / 2 - 80, y);

      // Time
      ctx.textAlign = 'right';
      if (r.time !== null) {
        const mins = Math.floor(r.time / 60);
        const secs = Math.floor(r.time % 60);
        const ms = Math.floor((r.time * 100) % 100);
        ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`, W / 2 + 190, y);
      } else {
        ctx.fillStyle = '#F66';
        ctx.fillText('DNF', W / 2 + 190, y);
      }
    }

    // Continue
    if (Math.sin(performance.now() * 0.005) > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS ENTER TO CONTINUE', W / 2, H - 38);
    }

    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESC TO RETURN TO TITLE', W / 2, H - 16);
  }

  darkenColor(hex, amount) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.max(0, r - amount)},${Math.max(0, g - amount)},${Math.max(0, b - amount)})`;
  }
}

// ============================================
// INIT
// ============================================
const game = new Game();
window.addEventListener('load', () => game.start());