// Main Game Class — fixed loop, keyboard start, error recovery
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CONFIG, SETTINGS } from './constants.js';
import { Track } from './track.js';
import { Ship } from './ship.js';
import { AIController } from './ai.js';
import { WeaponManager } from './weapons.js';
import { ParticleSystem } from './effects.js';
import { AudioManager } from './audio.js';
import { HUD } from './hud.js';

export class Game {
    constructor() {
        this.state = 'MENU';
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.composer = null;
        this.bloomPass = null;
        this.useBloom = true;

        this.track = null;
        this.ships = [];
        this.playerShip = null;
        this.aiControllers = [];
        this.weaponManager = null;
        this.particleSystem = null;
        this.audioManager = new AudioManager();
        this.hud = new HUD();
        this.trackLights = [];
        this.dirLight = null;
        this.menuStars = null;

        this.keys = {};
        this.playerWeaponFired = false;
        this.clock = new THREE.Clock(false);
        this.raceTime = 0;
        this.menuCameraAngle = 0;
        this.raceStarted = false;
        this._countdownInterval = null;
        this._errorCount = 0;

        this.init();
    }

    init() {
        try {
            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.5;
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        } catch (e) {
            console.error('WebGL init failed:', e);
            alert('WebGL non disponible. Essayez un navigateur récent.');
            return;
        }

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(CONFIG.FOV, window.innerWidth / window.innerHeight, 0.5, 2000);
        this.camera.position.set(0, 30, 80);

        try {
            this.composer = new EffectComposer(this.renderer);
            this.composer.addPass(new RenderPass(this.scene, this.camera));
            this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.3);
            this.composer.addPass(this.bloomPass);
        } catch (e) {
            console.warn('Bloom unavailable, using fallback renderer');
            this.composer = null;
            this.useBloom = false;
        }

        this.setupLighting();
        this.setupInput();
        this.setupMenuButtons();
        this.setupMenuScene();

        window.addEventListener('resize', () => this.onResize());

        this.clock.start();
        console.log('%c🎮 Wipeout Clone initialized', 'color: #00ccff; font-weight: bold;');
        this.gameLoop();
    }

    // ======================== LIGHTING ========================
    setupLighting() {
        this.scene.add(new THREE.AmbientLight(0x1a1a44, 1.2));
        this.scene.add(new THREE.HemisphereLight(0x3344aa, 0x111122, 0.8));
        this.dirLight = new THREE.DirectionalLight(0xaaaaee, 1.0);
        this.dirLight.position.set(100, 200, -50);
        this.scene.add(this.dirLight);
        this.scene.add(this.dirLight.target);
        const fill = new THREE.DirectionalLight(0x4466aa, 0.4);
        fill.position.set(-100, 50, 100);
        this.scene.add(fill);
    }

    // ======================== MENU ========================
    setupMenuScene() {
        if (this.menuStars) { this.scene.remove(this.menuStars); this.menuStars = null; }
        const sGeo = new THREE.BufferGeometry();
        const sPos = [];
        for (let i = 0; i < 1500; i++) {
            const r = 500 + Math.random() * 1000;
            const t = Math.random() * Math.PI * 2;
            const p = Math.random() * Math.PI;
            sPos.push(r*Math.sin(p)*Math.cos(t), r*Math.cos(p), r*Math.sin(p)*Math.sin(t));
        }
        sGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
        this.menuStars = new THREE.Points(sGeo, new THREE.PointsMaterial({color: 0x8888cc, size: 2, transparent: true, opacity: 0.6}));
        this.scene.add(this.menuStars);
    }

    // ======================== INPUT ========================
    setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();

            // Keyboard start: Enter or Space on menu
            if (this.state === 'MENU' && (e.code === 'Enter' || e.code === 'Space')) {
                e.preventDefault();
                this.startRace();
            }
            // Restart from results: Enter
            if (this.state === 'FINISHED' && e.code === 'Enter') {
                this.startRace();
            }
        });
        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    }

    setupMenuButtons() {
        const btnStart = document.getElementById('btnStart');
        const btnRestart = document.getElementById('btnRestart');
        const btnMenu = document.getElementById('btnMenu');

        if (btnStart) btnStart.addEventListener('click', () => this.startRace());
        if (btnRestart) btnRestart.addEventListener('click', () => this.startRace());
        if (btnMenu) btnMenu.addEventListener('click', () => {
            this.cleanup();
            this.state = 'MENU';
            this.setupMenuScene();
            document.getElementById('resultScreen').style.display = 'none';
            document.getElementById('menuScreen').style.display = 'flex';
            document.getElementById('gameScreen').style.display = 'none';
        });

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                SETTINGS.difficulty = btn.dataset.diff;
            });
        });
    }

    // ======================== CLEANUP ========================
    cleanup() {
        // Stop countdown if active
        if (this._countdownInterval) {
            clearInterval(this._countdownInterval);
            this._countdownInterval = null;
        }

        // Remove track
        if (this.track) {
            this.scene.remove(this.track.meshGroup);
            this.track = null;
        }

        // Remove ships
        for (const s of this.ships) {
            try { s.destroy(); } catch(e) { console.warn('Ship destroy error:', e); }
        }
        this.ships = [];
        this.playerShip = null;
        this.aiControllers = [];

        // Remove weapon manager & particles
        if (this.weaponManager) { try { this.weaponManager.destroy(); } catch(e) {} this.weaponManager = null; }
        if (this.particleSystem) { try { this.particleSystem.destroy(); } catch(e) {} this.particleSystem = null; }

        // Stop audio
        try { this.audioManager.stopMusic(); this.audioManager.stopEngine(); } catch(e) {}

        // Remove track lights
        for (const l of this.trackLights) { this.scene.remove(l); }
        this.trackLights = [];

        // Remove leftover meshes/points (but keep base lights)
        const toRemove = [];
        this.scene.traverse(c => {
            if ((c.isMesh || c.isPoints) && c !== this.menuStars) toRemove.push(c);
        });
        for (const o of toRemove) {
            if (o.parent) o.parent.remove(o);
        }

        this.raceStarted = false;
        this.raceTime = 0;
    }

    // ======================== START RACE ========================
    startRace() {
        if (this.state === 'COUNTDOWN' || this.state === 'RACING') return;
        console.log('%c🏁 Initializing race...', 'color: #ffaa00; font-weight: bold;');

        try {
            this.audioManager.init();
        } catch(e) {
            console.warn('Audio init failed:', e);
        }

        this.cleanup();

        // Remove menu stars
        if (this.menuStars) {
            this.scene.remove(this.menuStars);
            this.menuStars = null;
        }

        // --- Generate track ---
        try {
            this.track = new Track(this.scene);
            this.track.generate();
            console.log('Track generated:', this.track.framePoints.length, 'frames');
        } catch(e) {
            console.error('Track generation failed:', e);
            alert('Erreur de génération de piste. Réessayez.');
            this.state = 'MENU';
            this.setupMenuScene();
            return;
        }

        // --- Track lights ---
        this.trackLights = [];
        for (let i = 0; i < 14; i++) {
            const t = i / 14;
            const pt = this.track.getPointAt(t);
            const light = new THREE.PointLight(0x0066ff, 6, 60);
            light.position.copy(pt);
            light.position.y += 10;
            this.scene.add(light);
            this.trackLights.push(light);
        }

        // --- Player ship ---
        const sf = this.track.getFrameDataAt(0.001);
        const startDir = sf.tangent.clone().normalize();
        const startRight = sf.binormal.clone().normalize();
        const startPos = sf.point.clone();
        startPos.y = CONFIG.HOVER_HEIGHT + 1;

        this.playerShip = new Ship(this.scene, CONFIG.TEAM_COLORS[0], CONFIG.TEAM_NAMES[0], true);
        this.playerShip.position.copy(startPos);
        this.playerShip.rotation = Math.atan2(startDir.x, startDir.z);
        this.playerShip.trackIdx = 0;
        this.playerShip.shipGroup.position.copy(startPos);
        this.playerShip.shipGroup.rotation.set(0, this.playerShip.rotation, 0);
        this.ships.push(this.playerShip);

        // --- AI ships ---
        for (let i = 0; i < CONFIG.NUM_OPPONENTS; i++) {
            const col = i % 2 === 0 ? 1 : -1;
            const row = Math.floor(i / 2) + 1;
            const aiPos = startPos.clone()
                .add(startRight.clone().multiplyScalar(col * 3.5))
                .add(startDir.clone().multiplyScalar(-row * 6));
            const aiShip = new Ship(this.scene, CONFIG.TEAM_COLORS[i + 1], CONFIG.TEAM_NAMES[i + 1]);
            aiShip.position.copy(aiPos);
            aiShip.rotation = this.playerShip.rotation;
            aiShip.trackIdx = Math.min(i + 1, 10);
            aiShip.trackT = aiShip.trackIdx / CONFIG.TRACK_SEGMENTS;
            aiShip.shipGroup.position.copy(aiPos);
            aiShip.shipGroup.rotation.set(0, aiShip.rotation, 0);
            this.ships.push(aiShip);

            const ai = new AIController(aiShip, this.track, SETTINGS.difficulty);
            ai.targetSpeedFactor = CONFIG.AI_SPEED_FACTOR[SETTINGS.difficulty] * (0.85 + Math.random() * 0.3);
            this.aiControllers.push(ai);
        }
        console.log('Created', this.ships.length, 'ships');

        // --- Weapon manager & particles ---
        this.weaponManager = new WeaponManager(this.scene, this.audioManager);
        this.particleSystem = new ParticleSystem(this.scene);
        this.particleSystem.createEngineTrail(this.playerShip);
        this.particleSystem.createSpeedLines();
        this.particleSystem.createBoostEffect(this.playerShip);
        for (let i = 1; i < this.ships.length; i++) {
            this.particleSystem.createEngineTrail(this.ships[i]);
        }

        // --- State setup ---
        this.state = 'COUNTDOWN';
        this.raceTime = 0;
        this.raceStarted = false;

        // --- UI ---
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        document.getElementById('resultScreen').style.display = 'none';
        const ls = document.getElementById('loadingScreen');
        if (ls) { ls.style.opacity = '0'; setTimeout(() => ls.style.display = 'none', 500); }

        // --- Audio ---
        try {
            this.audioManager.startMusic();
            this.audioManager.startEngine();
        } catch(e) {
            console.warn('Audio start failed:', e);
        }

        // --- Camera snap to start ---
        this.camera.position.copy(startPos).add(new THREE.Vector3(0, 8, 15));
        this.camera.lookAt(startPos);

        // --- Start countdown ---
        console.log('Starting countdown...');
        this.startCountdown();
    }

    // ======================== COUNTDOWN ========================
    startCountdown() {
        if (this._countdownInterval) clearInterval(this._countdownInterval);

        const cdEl = document.getElementById('countdown');
        const cdText = document.getElementById('countdownText');
        if (!cdEl || !cdText) { this.state = 'RACING'; this.raceStarted = true; return; }

        cdEl.style.display = 'flex';
        let count = 3;
        cdText.textContent = count;
        cdText.className = 'countdown-text';
        try { this.audioManager.playCountdownBeep(false); } catch(e) {}

        this._countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                cdText.textContent = count;
                cdText.style.animation = 'none';
                void cdText.offsetWidth;
                cdText.style.animation = 'countPulse 0.8s ease-out';
                try { this.audioManager.playCountdownBeep(false); } catch(e) {}
            } else if (count === 0) {
                cdText.textContent = 'GO!';
                cdText.className = 'countdown-text go';
                cdText.style.animation = 'none';
                void cdText.offsetWidth;
                cdText.style.animation = 'countPulse 0.8s ease-out';
                try { this.audioManager.playCountdownBeep(true); } catch(e) {}
            } else {
                clearInterval(this._countdownInterval);
                this._countdownInterval = null;
                cdEl.style.display = 'none';
                this.state = 'RACING';
                this.raceStarted = true;
                console.log('%c🚁 RACE STARTED!', 'color: #00ff88; font-weight: bold;');
            }
        }, 1000);
    }

    // ======================== GAME LOOP ========================
    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());

        // Get delta time — always valid, never zero
        const rawDt = this.clock.getDelta();
        const dt = Math.max(0.001, Math.min(rawDt, 0.05));

        // Update state
        try {
            switch (this.state) {
                case 'MENU': this.updateMenu(dt); break;
                case 'COUNTDOWN': this.updateCountdown(dt); break;
                case 'RACING': this.updateRacing(dt); break;
                case 'FINISHED': this.updateFinished(dt); break;
            }
        } catch (e) {
            this._errorCount++;
            if (this._errorCount < 10) {
                console.error('Game update error [', this.state, ']:', e);
            }
            // If too many errors, go back to menu
            if (this._errorCount > 100) {
                console.error('Too many errors, resetting to menu');
                try { this.cleanup(); } catch(e2) {}
                this.state = 'MENU';
                this.setupMenuScene();
            }
        }

        // Render
        try {
            if (this.composer && this.useBloom) {
                this.composer.render();
            } else {
                this.renderer.render(this.scene, this.camera);
            }
        } catch (e) {
            // If bloom fails, fall back to regular rendering
            if (this.useBloom) {
                console.warn('Bloom render failed, switching to fallback');
                this.useBloom = false;
                this.composer = null;
                try { this.renderer.render(this.scene, this.camera); } catch(e2) {}
            }
        }
    }

    // ======================== UPDATE STATES ========================
    updateMenu(dt) {
        if (this.menuStars) this.menuStars.rotation.y += dt * 0.02;
        this.menuCameraAngle += dt * 0.3;
        this.camera.position.set(Math.sin(this.menuCameraAngle) * 100, 40, Math.cos(this.menuCameraAngle) * 100);
        this.camera.lookAt(0, 10, 0);
    }

    updateCountdown(dt) {
        if (!this.ships.length) return;
        // Hover ships in place during countdown
        for (let i = 0; i < this.ships.length; i++) {
            const s = this.ships[i];
            if (this.track && this.track.framePoints.length > 0) {
                const t = i === 0 ? 0.001 : (s.trackT || 0.002);
                const f = this.track.getFrameDataAt(t);
                if (f) {
                    s.position.y = f.point.y + CONFIG.HOVER_HEIGHT + 0.5 + Math.sin(performance.now() * 0.003 + i * 1.5) * 0.15;
                }
            }
            s.updateTransform();
        }
        if (this.track) this.track.update(dt);
        this.updatePlayerCamera(dt);
    }

    updateRacing(dt) {
        if (!this.raceStarted || !this.playerShip || !this.track) return;

        this.raceTime += dt;

        // Player input
        this.readInput();

        // Update player ship
        this.playerShip.update(dt, this.track, this.ships);

        // Update AI ships
        for (let i = 0; i < this.aiControllers.length; i++) {
            const ai = this.aiControllers[i];
            const ship = this.ships[i + 1];
            if (ai && ship && !ship.finished) {
                try { ai.update(dt, this.ships); } catch(e) {}
                try { ship.update(dt, this.track, this.ships); } catch(e) {}
            }
        }

        // Weapons
        this.handlePlayerWeapons();
        this.handleAIWeapons();
        if (this.weaponManager) this.weaponManager.update(dt, this.track, this.ships);

        // Track + particles
        this.track.update(dt);
        if (this.particleSystem) this.particleSystem.update(dt, this.playerShip);

        // Audio
        try { this.audioManager.updateEngine(this.playerShip.speed, CONFIG.MAX_SPEED); } catch(e) {}

        // Camera
        this.updatePlayerCamera(dt);

        // HUD
        this.hud.update(this.playerShip, this.ships, this.track);

        // Race events
        for (const ship of this.ships) {
            if (ship.lapJustCompleted && ship.isPlayer) {
                try { this.audioManager.playLapComplete(); } catch(e) {}
                this.hud.showNotification(ship.finished ? 'RACE COMPLETE!' : `LAP ${ship.lap}/${CONFIG.NUM_LAPS}`, 'lap');
                ship.lapJustCompleted = false;
            }
            if (ship.isPlayer && ship.isBoosting && ship.boostTimer > CONFIG.BOOST_DURATION - 0.1) {
                try { this.audioManager.playBoost(); } catch(e) {}
                this.hud.showNotification('BOOST!', 'boost');
            }
            if (ship.isPlayer && ship.justPickedUpBoost) { try { this.audioManager.playWeaponPickup(); } catch(e) {} }
            if (ship.isPlayer && ship.justPickedUpWeapon) { try { this.audioManager.playWeaponPickup(); } catch(e) {} }
        }

        this.checkFinish();
    }

    updateFinished(dt) {
        if (!this.ships.length) return;
        for (const s of this.ships) { try { s.update(dt, this.track, this.ships); } catch(e) {} }
        if (this.track) this.track.update(dt);
        this.updatePlayerCamera(dt);
    }

    // ======================== INPUT ========================
    readInput() {
        if (!this.playerShip) return;
        const s = this.playerShip;
        s.inputAccel = (this.keys['ArrowUp'] || this.keys['KeyW']) ? 1 : 0;
        s.inputBrake = (this.keys['ArrowDown'] || this.keys['KeyS']) ? 1 : 0;
        let steer = 0;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) steer -= 1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) steer += 1;
        s.inputSteer = steer;
    }

    handlePlayerWeapons() {
        if (!this.playerShip) return;
        const s = this.playerShip;

        if (this.keys['Space'] && s.boostEnergy > 0 && !s.isBoosting) {
            s.isBoosting = true;
            s.boostTimer = CONFIG.BOOST_DURATION;
            s.boostEnergy = 0;
        }
        if (this.keys['KeyX'] && s.currentWeapon && !this.playerWeaponFired) {
            this.playerWeaponFired = true;
            const w = s.currentWeapon;
            s.currentWeapon = null;
            this.fireWeapon(w, s);
        }
        if (!this.keys['KeyX']) this.playerWeaponFired = false;
        if (this.keys['KeyC'] && s.shield > CONFIG.SHIELD_BLOCK_COST) {
            s.shield -= CONFIG.SHIELD_BLOCK_COST;
            s.showShield();
            try { this.audioManager.playShieldUp(); } catch(e) {}
        }
    }

    handleAIWeapons() {
        for (let i = 1; i < this.ships.length; i++) {
            const s = this.ships[i];
            if (s.inputWeapon && s.currentWeapon) {
                const w = s.currentWeapon;
                s.currentWeapon = null;
                this.fireWeapon(w, s);
                s.inputWeapon = false;
            }
            if (s.inputBoost && s.boostEnergy > 0 && !s.isBoosting) {
                s.isBoosting = true;
                s.boostTimer = CONFIG.BOOST_DURATION;
                s.boostEnergy = 0;
                s.inputBoost = false;
            }
        }
    }

    fireWeapon(type, owner) {
        if (!this.weaponManager) return;
        try {
            const ok = this.weaponManager.fireWeapon(type, owner, this.track, this.ships);
            if (ok && owner.isPlayer) {
                const sounds = { missile: 'playMissile', mine: 'playMine', bolt: 'playBolt', turbo: 'playBoost', shield: 'playShieldUp' };
                if (sounds[type]) this.audioManager[sounds[type]]();
                this.hud.showNotification(type.toUpperCase(), 'weapon');
            }
        } catch(e) {
            console.warn('Weapon fire error:', e);
        }
    }

    // ======================== CAMERA ========================
    updatePlayerCamera(dt) {
        if (!this.playerShip) return;
        const s = this.playerShip;
        const fwd = new THREE.Vector3(Math.sin(s.rotation), 0, Math.cos(s.rotation));

        const speedFactor = Math.min(1, s.speed / Math.max(1, CONFIG.MAX_SPEED));
        const dist = CONFIG.CAMERA_DISTANCE + speedFactor * 3;
        const height = CONFIG.CAMERA_HEIGHT + speedFactor * 1.5;

        const desiredPos = s.position.clone()
            .sub(fwd.clone().multiplyScalar(dist))
            .add(new THREE.Vector3(0, height, 0));

        const lerpFactor = Math.min(1, 5 * dt);
        this.camera.position.lerp(desiredPos, lerpFactor);

        const lookTarget = s.position.clone()
            .add(fwd.clone().multiplyScalar(CONFIG.CAMERA_LOOK_AHEAD))
            .add(new THREE.Vector3(0, 2, 0));
        this.camera.lookAt(lookTarget);

        // Speed shake
        if (speedFactor > 0.8) {
            const shake = (speedFactor - 0.8) * 0.4;
            this.camera.position.x += (Math.random() - 0.5) * shake;
            this.camera.position.y += (Math.random() - 0.5) * shake * 0.5;
        }

        // Move directional light with player
        if (this.dirLight) {
            this.dirLight.position.copy(s.position).add(new THREE.Vector3(80, 150, -50));
            this.dirLight.target.position.copy(s.position);
        }
    }

    // ======================== FINISH ========================
    checkFinish() {
        if (!this.playerShip || !this.playerShip.finished || this.state !== 'RACING') return;
        this.calculateResults();
        this.showResults();
        this.state = 'FINISHED';
        try { this.audioManager.playLapComplete(); } catch(e) {}
        setTimeout(() => { try { this.audioManager.setMusicVolume(0.05); } catch(e) {} }, 1000);
        setTimeout(() => { try { this.audioManager.stopMusic(); } catch(e) {} }, 4000);
    }

    calculateResults() {
        this.results = this.ships.map(s => ({
            name: s.name, isPlayer: s.isPlayer,
            laps: s.lap, time: s.totalTime, progress: s.lap + s.trackT,
        }));
        this.results.sort((a, b) => {
            if (b.laps !== a.laps) return b.laps - a.laps;
            if (a.laps >= CONFIG.NUM_LAPS && b.laps >= CONFIG.NUM_LAPS) return a.time - b.time;
            return b.progress - a.progress;
        });
    }

    showResults() {
        const list = document.getElementById('resultList');
        if (!list) return;
        list.innerHTML = '';
        for (const r of this.results) {
            const entry = document.createElement('div');
            entry.className = `result-entry ${r.isPlayer ? 'player' : ''}`;
            const min = Math.floor(r.time / 60);
            const sec = Math.floor(r.time % 60);
            const ms = Math.floor((r.time % 1) * 1000);
            const time = r.laps >= CONFIG.NUM_LAPS
                ? `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(ms).padStart(3,'0')}`
                : 'DNF';
            entry.innerHTML = `<span class="pos">${this.results.indexOf(r)+1}.</span><span class="name">${r.name}</span><span class="time">${time}</span><span class="diff">${r.laps}/${CONFIG.NUM_LAPS}</span>`;
            list.appendChild(entry);
        }
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('resultScreen').style.display = 'flex';
    }

    onResize() {
        const w = window.innerWidth, h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        if (this.composer) this.composer.setSize(w, h);
    }
}