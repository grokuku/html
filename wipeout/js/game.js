// Main Game Class — robust version with no silent errors
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
        this.audioManager = null;
        this.hud = null;
        this.trackLights = [];
        this.dirLight = null;
        this.menuStars = null;

        this.keys = {};
        this.playerWeaponFired = false;
        this.clock = new THREE.Clock();
        this.raceTime = 0;
        this.menuCameraAngle = 0;
        this.raceStarted = false;

        this.init();
    }

    init() {
        // Renderer
        try {
            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.5;
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        } catch (e) {
            console.error('WebGL init failed:', e);
            return;
        }

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(CONFIG.FOV, window.innerWidth / window.innerHeight, 0.5, 2000);
        this.camera.position.set(0, 30, 80);

        // Bloom
        try {
            this.composer = new EffectComposer(this.renderer);
            this.composer.addPass(new RenderPass(this.scene, this.camera));
            this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.3);
            this.composer.addPass(this.bloomPass);
        } catch (e) {
            console.warn('Bloom unavailable, using fallback');
            this.composer = null;
            this.useBloom = false;
        }

        this.setupLighting();
        this.audioManager = new AudioManager();
        this.hud = new HUD();
        this.setupInput();
        window.addEventListener('resize', () => this.onResize());
        this.setupMenuButtons();
        this.setupMenuScene();

        this.clock.start();
        console.log('%c🎮 Wipeout Clone initialized', 'color: #00ccff; font-weight: bold;');
        this.gameLoop();
    }

    setupLighting() {
        this.scene.add(new THREE.AmbientLight(0x1a1a44, 1.2));
        this.scene.add(new THREE.HemisphereLight(0x3344aa, 0x111122, 0.8));
        this.dirLight = new THREE.DirectionalLight(0xaaaaee, 1.0);
        this.dirLight.position.set(100, 200, -50);
        this.scene.add(this.dirLight);
        const fill = new THREE.DirectionalLight(0x4466aa, 0.4);
        fill.position.set(-100, 50, 100);
        this.scene.add(fill);
    }

    setupMenuScene() {
        if (this.menuStars) this.scene.remove(this.menuStars);
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

    setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
        });
        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    }

    setupMenuButtons() {
        document.getElementById('btnStart').addEventListener('click', () => { console.log('Starting race...'); this.startRace(); });
        document.getElementById('btnRestart').addEventListener('click', () => { document.getElementById('resultScreen').style.display = 'none'; this.startRace(); });
        document.getElementById('btnMenu').addEventListener('click', () => {
            document.getElementById('resultScreen').style.display = 'none';
            document.getElementById('menuScreen').style.display = 'flex';
            this.cleanup(); this.state = 'MENU'; this.setupMenuScene();
        });
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active'); SETTINGS.difficulty = btn.dataset.diff;
            });
        });
    }

    cleanup() {
        if (this.track) { this.scene.remove(this.track.meshGroup); this.track = null; }
        this.ships.forEach(s => s.destroy()); this.ships = []; this.playerShip = null; this.aiControllers = [];
        if (this.weaponManager) { this.weaponManager.destroy(); this.weaponManager = null; }
        if (this.particleSystem) { this.particleSystem.destroy(); this.particleSystem = null; }
        this.audioManager.stopMusic(); this.audioManager.stopEngine();
        this.trackLights.forEach(l => this.scene.remove(l)); this.trackLights = [];
        // Clear everything except base lights
        const toRemove = [];
        this.scene.traverse(c => { if ((c.isMesh || c.isPoints) && c !== this.menuStars) toRemove.push(c); });
        toRemove.forEach(o => { if (o.parent === this.scene) this.scene.remove(o); });
    }

    startRace() {
        console.log('Initializing race...');
        this.audioManager.init();
        this.cleanup();
        if (this.menuStars) { this.scene.remove(this.menuStars); this.menuStars = null; }

        // Track
        this.track = new Track(this.scene);
        this.track.generate();
        console.log('Track generated, frames:', this.track.framePoints.length);

        // Lights along track
        this.trackLights = [];
        for (let i = 0; i < 14; i++) {
            const t = i / 14;
            const pt = this.track.getPointAt(t);
            const light = new THREE.PointLight(0x0066ff, 6, 60);
            light.position.copy(pt); light.position.y += 10;
            this.scene.add(light); this.trackLights.push(light);
        }

        // Player
        const sf = this.track.getFrameDataAt(0.001);
        const startDir = sf.tangent.clone().normalize();
        const startRight = sf.binormal.clone().normalize();
        const startPos = sf.point.clone(); startPos.y = CONFIG.HOVER_HEIGHT + 1;

        this.playerShip = new Ship(this.scene, CONFIG.TEAM_COLORS[0], CONFIG.TEAM_NAMES[0], true);
        this.playerShip.position.copy(startPos);
        this.playerShip.rotation = Math.atan2(startDir.x, startDir.z);
        this.playerShip.trackIdx = 0;
        this.playerShip.shipGroup.position.copy(this.playerShip.position);
        this.playerShip.shipGroup.rotation.set(0, this.playerShip.rotation, 0);
        this.ships.push(this.playerShip);
        console.log('Player ship created at', this.playerShip.position.toArray());

        // AI
        for (let i = 0; i < CONFIG.NUM_OPPONENTS; i++) {
            const aiShip = new Ship(this.scene, CONFIG.TEAM_COLORS[i+1], CONFIG.TEAM_NAMES[i+1]);
            const col = i % 2 === 0 ? 1 : -1;
            const row = Math.floor(i / 2) + 1;
            const aiPos = startPos.clone()
                .add(startRight.clone().multiplyScalar(col * 3.5))
                .add(startDir.clone().multiplyScalar(-row * 6));
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

        this.weaponManager = new WeaponManager(this.scene, this.audioManager);
        this.particleSystem = new ParticleSystem(this.scene);
        this.particleSystem.createEngineTrail(this.playerShip);
        this.particleSystem.createSpeedLines();
        this.particleSystem.createBoostEffect(this.playerShip);
        for (let i = 1; i < this.ships.length; i++) this.particleSystem.createEngineTrail(this.ships[i]);

        this.state = 'COUNTDOWN';
        this.raceTime = 0;
        this.raceStarted = false;

        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        document.getElementById('resultScreen').style.display = 'none';
        const ls = document.getElementById('loadingScreen');
        if (ls) { ls.style.opacity = '0'; setTimeout(() => ls.style.display = 'none', 500); }

        this.audioManager.startMusic();
        this.audioManager.startEngine();

        // Set camera to start position immediately
        this.camera.position.copy(this.playerShip.position).add(new THREE.Vector3(0, 8, 15));
        this.camera.lookAt(this.playerShip.position);

        console.log('Starting countdown...');
        this.startCountdown();
    }

    startCountdown() {
        const cdEl = document.getElementById('countdown');
        const cdText = document.getElementById('countdownText');
        cdEl.style.display = 'flex';
        let count = 3;
        cdText.textContent = count;
        cdText.className = 'countdown-text';
        this.audioManager.playCountdownBeep(false);

        this._countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                cdText.textContent = count;
                cdText.style.animation = 'none'; void cdText.offsetWidth;
                cdText.style.animation = 'countPulse 0.8s ease-out';
                this.audioManager.playCountdownBeep(false);
            } else if (count === 0) {
                cdText.textContent = 'GO!';
                cdText.className = 'countdown-text go';
                cdText.style.animation = 'none'; void cdText.offsetWidth;
                cdText.style.animation = 'countPulse 0.8s ease-out';
                this.audioManager.playCountdownBeep(true);
            } else {
                clearInterval(this._countdownInterval);
                cdEl.style.display = 'none';
                this.state = 'RACING';
                this.raceStarted = true;
                console.log('%c🚁 RACE STARTED!', 'color: #00ff88; font-weight: bold;');
            }
        }, 1000);
    }

    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());

        const dt = Math.min(this.clock.getDelta(), 0.05);
        if (dt <= 0) { requestAnimationFrame(() => this.gameLoop()); return; } // Safety

        switch (this.state) {
            case 'MENU': this.updateMenu(dt); break;
            case 'COUNTDOWN': this.updateCountdown(dt); break;
            case 'RACING': this.updateRacing(dt); break;
            case 'FINISHED': this.updateFinished(dt); break;
        }

        // Render
        if (this.composer && this.useBloom) {
            try { this.composer.render(); } catch (e) { this.useBloom = false; this.renderer.render(this.scene, this.camera); }
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    updateMenu(dt) {
        if (this.menuStars) this.menuStars.rotation.y += dt * 0.02;
        this.menuCameraAngle += dt * 0.3;
        this.camera.position.set(Math.sin(this.menuCameraAngle) * 100, 40, Math.cos(this.menuCameraAngle) * 100);
        this.camera.lookAt(0, 10, 0);
    }

    updateCountdown(dt) {
        // Hover ships in place during countdown
        this.ships.forEach((s, i) => {
            if (this.track && this.track.framePoints.length > 0) {
                const t = i === 0 ? 0.001 : s.trackT || 0.002;
                const f = this.track.getFrameDataAt(t);
                if (f) {
                    s.position.y = f.point.y + CONFIG.HOVER_HEIGHT + 0.5 + Math.sin(performance.now() * 0.003 + i * 1.5) * 0.15;
                }
            }
            s.updateTransform();
        });
        if (this.track) this.track.update(dt);
        this.updatePlayerCamera(dt);
    }

    updateRacing(dt) {
        if (!this.raceStarted || !this.playerShip || !this.track) return;

        this.raceTime += dt;

        // Player input
        this.readInput();

        // Update ALL ships (player + AI)
        this.playerShip.update(dt, this.track, this.ships);

        for (let i = 0; i < this.aiControllers.length; i++) {
            const ai = this.aiControllers[i];
            const ship = this.ships[i + 1];
            if (ai && ship && !ship.finished) {
                ai.update(dt, this.ships);
                ship.update(dt, this.track, this.ships);
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
        this.audioManager.updateEngine(this.playerShip.speed, CONFIG.MAX_SPEED);

        // Camera
        this.updatePlayerCamera(dt);

        // HUD
        this.hud.update(this.playerShip, this.ships, this.track);

        // Events
        this.ships.forEach(ship => {
            if (ship.lapJustCompleted && ship.isPlayer) {
                this.audioManager.playLapComplete();
                this.hud.showNotification(ship.finished ? 'RACE COMPLETE!' : `LAP ${ship.lap}/${CONFIG.NUM_LAPS}`, 'lap');
                ship.lapJustCompleted = false;
            }
            if (ship.isPlayer && ship.isBoosting && ship.boostTimer > CONFIG.BOOST_DURATION - 0.1) {
                this.audioManager.playBoost();
                this.hud.showNotification('BOOST!', 'boost');
            }
            if (ship.isPlayer && ship.justPickedUpBoost) this.audioManager.playWeaponPickup();
            if (ship.isPlayer && ship.justPickedUpWeapon) this.audioManager.playWeaponPickup();
        });

        this.checkFinish();
    }

    readInput() {
        const s = this.playerShip;
        if (!s) return;
        s.inputAccel = (this.keys['ArrowUp'] || this.keys['KeyW']) ? 1 : 0;
        s.inputBrake = (this.keys['ArrowDown'] || this.keys['KeyS']) ? 1 : 0;
        let steer = 0;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) steer -= 1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) steer += 1;
        s.inputSteer = steer;
    }

    handlePlayerWeapons() {
        const s = this.playerShip;
        if (!s) return;
        if (this.keys['Space'] && s.boostEnergy > 0 && !s.isBoosting) {
            s.isBoosting = true; s.boostTimer = CONFIG.BOOST_DURATION; s.boostEnergy = 0;
        }
        if (this.keys['KeyX'] && s.currentWeapon && !this.playerWeaponFired) {
            this.playerWeaponFired = true;
            const w = s.currentWeapon; s.currentWeapon = null;
            this.fireWeapon(w, s);
        }
        if (!this.keys['KeyX']) this.playerWeaponFired = false;
        if (this.keys['KeyC'] && s.shield > CONFIG.SHIELD_BLOCK_COST) {
            s.shield -= CONFIG.SHIELD_BLOCK_COST; s.showShield(); this.audioManager.playShieldUp();
        }
    }

    handleAIWeapons() {
        for (let i = 1; i < this.ships.length; i++) {
            const s = this.ships[i];
            if (s.inputWeapon && s.currentWeapon) {
                const w = s.currentWeapon; s.currentWeapon = null;
                this.fireWeapon(w, s); s.inputWeapon = false;
            }
            if (s.inputBoost && s.boostEnergy > 0 && !s.isBoosting) {
                s.isBoosting = true; s.boostTimer = CONFIG.BOOST_DURATION; s.boostEnergy = 0; s.inputBoost = false;
            }
        }
    }

    fireWeapon(type, owner) {
        const ok = this.weaponManager.fireWeapon(type, owner, this.track, this.ships);
        if (ok && owner.isPlayer) {
            const sounds = { missile: 'playMissile', mine: 'playMine', bolt: 'playBolt', turbo: 'playBoost', shield: 'playShieldUp' };
            if (sounds[type]) this.audioManager[sounds[type]]();
            this.hud.showNotification(type.toUpperCase(), 'weapon');
        }
    }

    updatePlayerCamera(dt) {
        if (!this.playerShip || !this.track || this.track.framePoints.length === 0) return;

        const s = this.playerShip;
        const fwd = new THREE.Vector3(Math.sin(s.rotation), 0, Math.cos(s.rotation));

        const speedFactor = Math.min(1, s.speed / Math.max(1, CONFIG.MAX_SPEED));
        const dist = CONFIG.CAMERA_DISTANCE + speedFactor * 3;
        const height = CONFIG.CAMERA_HEIGHT + speedFactor * 1.5;

        const desiredPos = s.position.clone()
            .sub(fwd.clone().multiplyScalar(dist))
            .add(new THREE.Vector3(0, height, 0));

        // Smooth camera follow with minimum delta
        const lerpFactor = Math.min(1, 5 * dt);
        this.camera.position.lerp(desiredPos, lerpFactor);

        // Look at point ahead of ship
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

        // Update directional light to follow player
        if (this.dirLight && this.dirLight.target) {
            this.dirLight.position.copy(s.position).add(new THREE.Vector3(80, 150, -50));
            this.dirLight.target.position.copy(s.position);
        }
    }

    checkFinish() {
        if (!this.playerShip || !this.playerShip.finished || this.state !== 'RACING') return;
        this.calculateResults();
        this.showResults();
        this.state = 'FINISHED';
        this.audioManager.playLapComplete();
        setTimeout(() => this.audioManager.setMusicVolume(0.05), 1000);
        setTimeout(() => this.audioManager.stopMusic(), 4000);
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
        const list = document.getElementById('resultList'); list.innerHTML = '';
        this.results.forEach((r, i) => {
            const entry = document.createElement('div');
            entry.className = `result-entry ${r.isPlayer ? 'player' : ''}`;
            const min = Math.floor(r.time / 60); const sec = Math.floor(r.time % 60);
            const ms = Math.floor((r.time % 1) * 1000);
            const time = r.laps >= CONFIG.NUM_LAPS ? `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(ms).padStart(3,'0')}` : 'DNF';
            entry.innerHTML = `<span class="pos">${i+1}.</span><span class="name">${r.name}</span><span class="time">${time}</span><span class="diff">${r.laps}/${CONFIG.NUM_LAPS}</span>`;
            list.appendChild(entry);
        });
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('resultScreen').style.display = 'flex';
    }

    updateFinished(dt) {
        this.ships.forEach(s => s.update(dt, this.track, this.ships));
        if (this.track) this.track.update(dt);
        this.updatePlayerCamera(dt);
    }

    onResize() {
        const w = window.innerWidth, h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        if (this.composer) this.composer.setSize(w, h);
    }
}