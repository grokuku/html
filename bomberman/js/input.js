/* ========================================
   BOMBERMAN SS — Input System
   Keyboard + Gamepad support
   ======================================== */

B.Input = {
    keys: {},
    _pressed: {},
    _released: {},
    gamepadStates: [],

    mappings: {
        1: {
            up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
            bomb: 'Space', punch: 'ShiftLeft', kick: 'ControlLeft',
            menu: 'Escape', start: 'Enter'
        },
        2: {
            up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
            bomb: 'KeyQ', punch: 'KeyE', kick: 'KeyR',
            menu: 'Escape', start: 'Enter'
        }
    },

    init() {
        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) this._pressed[e.code] = true;
            this.keys[e.code] = true;
            e.preventDefault();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this._released[e.code] = true;
            e.preventDefault();
        });
    },

    update() {
        // Poll gamepads
        this.gamepadStates = [];
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < gps.length; i++) {
            if (gps[i]) {
                this.gamepadStates[i] = {
                    axes: [...gps[i].axes],
                    buttons: gps[i].buttons.map(b => b.pressed)
                };
            }
        }
    },

    endFrame() {
        this._pressed = {};
        this._released = {};
    },

    isDown(action, player) {
        const map = this.mappings[player];
        if (!map) return false;
        const code = map[action];
        if (code && this.keys[code]) return true;

        const gi = player - 1;
        const gp = this.gamepadStates[gi];
        if (gp) {
            switch (action) {
                case 'up': return gp.axes[1] < -0.5 || gp.buttons[12];
                case 'down': return gp.axes[1] > 0.5 || gp.buttons[13];
                case 'left': return gp.axes[0] < -0.5 || gp.buttons[14];
                case 'right': return gp.axes[0] > 0.5 || gp.buttons[15];
                case 'bomb': return gp.buttons[0];
                case 'punch': return gp.buttons[2];
                case 'kick': return gp.buttons[1];
            }
        }
        return false;
    },

    isPressed(action, player) {
        const map = this.mappings[player];
        if (!map) return false;
        const code = map[action];
        return code && !!this._pressed[code];
    },

    // Menu navigation helpers (any source)
    menuUp()    { return this._pressed['ArrowUp'] || this._pressed['KeyW']; },
    menuDown()  { return this._pressed['ArrowDown'] || this._pressed['KeyS']; },
    menuLeft()  { return this._pressed['ArrowLeft'] || this._pressed['KeyA']; },
    menuRight() { return this._pressed['ArrowRight'] || this._pressed['KeyD']; },
    menuConfirm() { return this._pressed['Enter'] || this._pressed['Space'] || this._pressed['KeyZ']; },
    menuBack()    { return this._pressed['Escape'] || this._pressed['Backspace'] || this._pressed['KeyX']; }
};