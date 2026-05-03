// ============================================
// RACE MANAGER
// ============================================
class Race {
  constructor() {
    this.karts = [];
    this.playerKart = null;
    this.aiControllers = [];
    this.itemManager = new ItemManager();
    this.track = null;
    this.totalLaps = 3;
    this.raceTime = 0;
    this.countdown = 0;
    this.started = false;
    this.finished = false;
    this.results = [];
  }

  init(trackIndex, characterIndex) {
    this.track = tracks[trackIndex];
    this.karts = [];
    this.aiControllers = [];
    this.results = [];
    this.raceTime = 0;
    this.started = false;
    this.finished = false;
    this.countdown = 4.0; // 3-2-1-GO sequence

    const sp = this.track.startLine;
    const startAngle = sp.angle;
    const perpAngle = startAngle + Math.PI / 2;

    // Build character list - player first, then others
    const charList = [characterIndex];
    for (let i = 0; i < 8; i++) {
      if (i !== characterIndex) charList.push(i);
    }

    // Position karts on starting grid
    for (let i = 0; i < 8; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;

      // Start behind the finish line, in a grid
      const fwdOffset = -(row * 40 + 60);
      const sideOffset = col === 0 ? -30 : 30;

      const sx = sp.x + Math.cos(startAngle) * fwdOffset + Math.cos(perpAngle) * sideOffset;
      const sy = sp.y + Math.sin(startAngle) * fwdOffset + Math.sin(perpAngle) * sideOffset;

      const kart = new Kart(charList[i], sx, sy, startAngle);
      this.karts.push(kart);

      if (i === 0) {
        this.playerKart = kart;
      } else {
        const difficulty = 0.6 + 0.4 * (1 - i / 8);
        this.aiControllers.push(new AIController(kart, this.track, difficulty));
      }
    }

    this.itemManager.init(this.track);
  }

  update(dt) {
    // Countdown phase
    if (!this.started) {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.started = true;
        audio.playGo();
      } else {
        // Countdown beeps at 3, 2, 1
        const prev = this.countdown + dt;
        if (prev > 3 && this.countdown <= 3) audio.playCountdown();
        if (prev > 2 && this.countdown <= 2) audio.playCountdown();
        if (prev > 1 && this.countdown <= 1) audio.playCountdown();
      }
      return;
    }

    this.raceTime += dt;

    // Update player kart
    const playerInput = game.input ? game.input.getState() : { accelerate: false, brake: false, left: false, right: false, drift: false };
    this.playerKart.update(playerInput, this.track);

    // Player item use
    if (this.playerKart.item !== ITEMS.NONE) {
      const useItem = game.input.isKeyJustPressed('Space');
      if (useItem && this.playerKart.itemCooldown <= 0) {
        this.itemManager.useItem(this.playerKart, this.karts, this.track);
      }
    }

    // Update AI karts
    for (const ai of this.aiControllers) {
      if (ai.kart.spinTimer > 0) {
        ai.kart.update({ accelerate: false, brake: false, left: false, right: false, drift: false, useItem: false, jump: false }, this.track);
        continue;
      }
      const input = ai.update(this.karts);
      ai.kart.update(input, this.track);

      // AI item use
      if (input.useItem && ai.kart.item !== ITEMS.NONE && ai.kart.itemCooldown <= 0) {
        this.itemManager.useItem(ai.kart, this.karts, this.track);
      }
    }

    // Item box & item updates
    this.itemManager.update(dt, this.karts, this.track);

    // Kart-to-kart collisions
    this.itemManager.checkKartCollisions(this.karts);

    // Race positions
    this.updatePositions();

    // Check overall race completion
    const allKartsDone = this.karts.every(k => k.finished);
    const anyNotDone = this.karts.some(k => !k.finished);

    if (allKartsDone || (this.playerKart.finished && this.raceTime > this.playerKart.finishTime + 20)) {
      // Mark remaining karts as finished
      this.karts.forEach(k => {
        if (!k.finished) {
          k.finished = true;
          k.finishTime = this.raceTime;
        }
      });
      this.finished = true;
    }
  }

  updatePositions() {
    const sorted = [...this.karts].sort((a, b) => b.distanceTraveled - a.distanceTraveled);
    sorted.forEach((kart, idx) => {
      kart.racePosition = idx + 1;
    });
  }

  getResults() {
    const sorted = [...this.karts].sort((a, b) => {
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      return b.distanceTraveled - a.distanceTraveled;
    });
    return sorted.map((k, i) => ({
      position: i + 1,
      characterIndex: k.characterIndex,
      name: CHARACTERS[k.characterIndex].name,
      time: k.finished ? k.finishTime : null,
      laps: k.lap
    }));
  }
}