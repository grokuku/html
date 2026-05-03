// ============================================
// INPUT HANDLER
// ============================================
class InputManager {
  constructor() {
    this.keys = {};
    this.prevKeys = {};
    this.gamepads = {};

    // Touch controls state
    this.touchAccelerate = false;
    this.touchBrake = false;
    this.touchLeft = false;
    this.touchRight = false;
    this.touchItem = false;
    this.touchDrift = false;
    this.touchJustPressedItem = false;
    this._lastTouchItem = false;
    this.touchActive = false;
    this._lastTouchActive = false;

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('gamepadconnected', (e) => {
      this.gamepads[e.gamepad.index] = e.gamepad;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      delete this.gamepads[e.gamepad.index];
    });

    this.setupTouchControls();
  }

  setupTouchControls() {
    const canvas = document.getElementById('gameCanvas');
    
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleTouches(e.touches);
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.handleTouches(e.touches);
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handleTouches(e.touches);
    }, { passive: false });
    
    canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.resetTouchControls();
    }, { passive: false });
  }

  handleTouches(touches) {
    this.resetTouchControls();
    this.touchActive = touches.length > 0;
    if (touches.length === 0) return;
    
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();

    for (let i = 0; i < touches.length; i++) {
      const t = touches[i];
      const x = (t.clientX - rect.left) / rect.width;
      const y = (t.clientY - rect.top) / rect.height;

      // Bottom-left quadrant: steering
      if (x < 0.4 && y > 0.55) {
        if (x < 0.2) this.touchLeft = true;
        else if (x > 0.2) this.touchRight = true;
      }

      // Bottom-right: accelerate + brake
      if (x > 0.6 && y > 0.5) {
        this.touchAccelerate = true;
        if (y > 0.8) this.touchBrake = true;
      }

      // Right side lower: drift
      if (x > 0.6 && y > 0.7 && y < 0.95) {
        this.touchDrift = true;
      }

      // Top half or any touch: use item / confirm
      if (y < 0.5) {
        this.touchItem = true;
      }
    }
  }

  resetTouchControls() {
    this.touchAccelerate = false;
    this.touchBrake = false;
    this.touchLeft = false;
    this.touchRight = false;
    this.touchItem = false;
    this.touchDrift = false;
  }

  getState() {
    const state = {
      accelerate: false,
      brake: false,
      left: false,
      right: false,
      drift: false,
      useItem: false,
      jump: false
    };

    // Keyboard
    if (this.keys['ArrowUp'] || this.keys['KeyW']) state.accelerate = true;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) state.brake = true;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) state.left = true;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) state.right = true;
    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) state.drift = true;
    if (this.keys['Space']) state.useItem = true;

    // Touch controls
    if (this.touchAccelerate) state.accelerate = true;
    if (this.touchBrake) state.brake = true;
    if (this.touchLeft) state.left = true;
    if (this.touchRight) state.right = true;
    if (this.touchDrift) state.drift = true;
    if (this.touchItem) state.useItem = true;

    // Gamepad
    this.pollGamepads();
    const gp = this.getFirstGamepad();
    if (gp) {
      if (gp.buttons[0] && gp.buttons[0].pressed) state.accelerate = true;
      if (gp.buttons[1] && gp.buttons[1].pressed) state.brake = true;
      if (gp.buttons[2] && gp.buttons[2].pressed) state.drift = true;
      if (gp.buttons[3] && gp.buttons[3].pressed) state.useItem = true;
      if (gp.buttons[6] && gp.buttons[6].pressed) state.accelerate = true;
      if (gp.buttons[7] && gp.buttons[7].pressed) state.brake = true;
      if (gp.axes[0] < -0.3) state.left = true;
      if (gp.axes[0] > 0.3) state.right = true;
      if (gp.buttons[14] && gp.buttons[14].pressed) state.left = true;
      if (gp.buttons[15] && gp.buttons[15].pressed) state.right = true;
    }

    return state;
  }

  getMenuInput() {
    // Touch: any touch counts as confirm in menus
    let touchConfirm = this.touchActive && !this._lastTouchActive;
    this._lastTouchActive = this.touchActive;
    
    return {
      up: this.isKeyJustPressed('ArrowUp') || this.isKeyJustPressed('KeyW'),
      down: this.isKeyJustPressed('ArrowDown') || this.isKeyJustPressed('KeyS'),
      left: this.isKeyJustPressed('ArrowLeft') || this.isKeyJustPressed('KeyA'),
      right: this.isKeyJustPressed('ArrowRight') || this.isKeyJustPressed('KeyD'),
      confirm: this.isKeyJustPressed('Enter') || this.isKeyJustPressed('Space') || touchConfirm,
      back: this.isKeyJustPressed('Escape') || this.isKeyJustPressed('Backspace'),
      useItem: this.isKeyJustPressed('Space')
    };
  }

  isKeyJustPressed(code) {
    return this.keys[code] && !this.prevKeys[code];
  }

  isKeyDown(code) {
    return !!this.keys[code];
  }

  update() {
    // Copy current keys to previous
    this.prevKeys = { ...this.keys };
  }

  pollGamepads() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.gamepads[gamepads[i].index] = gamepads[i];
      }
    }
  }

  getFirstGamepad() {
    const ids = Object.keys(this.gamepads);
    if (ids.length > 0) {
      return navigator.getGamepads ? navigator.getGamepads()[ids[0]] : null;
    }
    return null;
  }
}