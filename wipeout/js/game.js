// Main Game Class — with error handling and bright lighting
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

        this.keys = {};
        this.playerWeaponFired = false;
        this.clock = new THREE.Clock();
        this.raceTime = 0;
        this.menuCameraAngle = 0;

        this.init();
    }

    init() {
        try {
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                powerPreference: 'high-performance',
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.5;
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        } catch (e) {
            console.error('WebGL init failed:', e);
            alert('WebGL non disponible. Utilisez un navigateur moderne.');
            return;
        }

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(
            CONFIG.FOV, window.innerWidth / window.innerHeight, 0.5, 2000
        );
        this.camera.position.set(0, 50, 100);

        // Post-processing with bloom (fallback if unavailable)
        try {
            this.composer = new EffectComposer(this.renderer);
            this.composer.addPass(new RenderPass(this.scene, this.camera));
            this.bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                0.7, 0.4, 0.25
            );
            this.composer.addPass(this.bloomPass);
        } catch (e) {
            console.warn('Bloom not available, using fallback renderer');
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
        console.log('%c🎮 Game initialized', 'color: #00ccff');
        this.gameLoop();
    }

    setupLighting() {
        // Strong ambient for track visibility
        const ambient = new THREE.AmbientLight(0x1a1a44, 1.2);
        this.scene.add(ambient);

        // Hemisphere light — brighter
        const hemi = new THREE.HemisphereLight(0x3344aa, 0x111122, 0.8);
        this.scene.add(hemi);

        // Main directional (moon)
        const dir = new THREE.DirectionalLight(0xaaaaee, 1.0);
        dir.position.set(100, 200, -50);
        this.scene.add(dir);
        this.dirLight = dir;

        // Secondary fill
        const fill = new THREE.DirectionalLight(0x4466aa, 0.4);
        fill.position.set(-100, 50, 100);
        this.scene.add(fill);
    }

    setupMenuScene() {
        // Animated stars during menu
        const sGeo = new THREE.BufferGeometry();
        const sPos = [];
        for (let i = 0; i < 1500; i++) {
            const r = 500 + Math.random() * 1000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            sPos.push(r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(theta));
        }
        sGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
        this.menuStars = new THREE.Points(sGeo, new THREE.PointsMaterial({
            color: 0x8888cc, size: 2, transparent: true, opacity: 0.6,
        }));
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
        document.getElementById('btnStart').addEventListener('click', () => this.startRace());
        document.getElementById('btnRestart').addEventListener('click', () => {
            document.getElementById('resultScreen').style.display = 'none';
            this.startRace();
        });
        document.getElementById('btnMenu').addEventListener('click', () => {
            document.getElementById('resultScreen').style.display = 'none';
            document.getElementById('menuScreen').style.display = 'flex';
            this.cleanup();
            this.state = 'MENU';
            this.setupMenuScene();
        });
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                SETTINGS.difficulty = btn.dataset.diff;
            });
        });
    }

    cleanup() {
        if (this.track) { this.scene.remove(this.track.meshGroup); this.track = null; }
        this.ships.forEach(s => s.destroy());
        this.ships = [];
        this.playerShip = null;
        this.aiControllers = [];
        if (this.weaponManager) { this.weaponManager.destroy(); this.weaponManager = null; }
        if (this.particleSystem) { this.particleSystem.destroy(); this.particleSystem = null; }
        this.audioManager.stopMusic();
        this.audioManager.stopEngine();
        this.trackLights.forEach(l => this.scene.remove(l));
        this.trackLights = [];
        // Remove game objects but keep base lights
        const remove = [];
        this.scene.traverse(c => {
            if ((c.isMesh || c.isPoints || c.isLight) && c !== this.menuStars &&
                !c.isAmbientLight && !c.isHemisphereLight && c !== this.dirLight) {
                if (c.parent === this.scene) remove.push(c);
            }
        });
        remove.forEach(o => this.scene.remove(o));
    }

    startRace() {
        this.audioManager.init();
        this.cleanup();
        if (this.menuStars) this.scene.remove(this.menuStars);

        this.track = new Track(this.scene);
        this.track.generate();

        // Track accent lights
        this.trackLights = [];
        for (let i = 0; i < 14; i++) {
            const t = i / 14;
            const pt = this.track.getPointAt(t);
            const light = new THREE.PointLight(0x0066ff, 6, 60);
            light.position.copy(pt); light.position.y += 10;
            this.scene.add(light);
            this.trackLights.push(light);
        }

        // Player ship
        const sf = this.track.getFrameDataAt(0.001);
        const startPos = sf.point.clone(); startPos.y += CONFIG.HOVER_HEIGHT + 1;
        const rightDir = sf.binormal.clone();

        this.playerShip = new Ship(this.scene, CONFIG.TEAM_COLORS[0], CONFIG.TEAM_NAMES[0], true);
        this.playerShip.position.copy(startPos).add(rightDir.clone().multiplyScalar(-2));
        this.playerShip.rotation = Math.atan2(sf.tangent.x, sf.tangent.z);
        this.playerShip.shipGroup.position.copy(this.playerShip.position);
        this.playerShip.shipGroup.rotation.set(0, this.playerShip.rotation, 0);
        this.playerShip.trackIdx = 0;
        this.ships.push(this.playerShip);

        // AI ships
        for (let i = 0; i < CONFIG.NUM_OPPONENTS; i++) {
            const aiShip = new Ship(this.scene, CONFIG.TEAM_COLORS[i+1], CONFIG.TEAM_NAMES[i+1]);
            const col = i % 2 === 0 ? 1 : -1;
            const row = Math.floor(i / 2) + 1;
            const aiPos = startPos.clone()
                .add(rightDir.clone().multiplyScalar(col * 3))
                .add(sf.tangent.clone().multiplyScalar(-row * 6));
            aiPos.y = startPos.y;
            aiShip.position.copy(aiPos);
            aiShip.rotation = this.playerShip.rotation;
            aiShip.shipGroup.position.copy(aiShip.position);
            aiShip.shipGroup.rotation.set(0, aiShip.rotation, 0);
            aiShip.trackIdx = Math.min(i + 1, 8);
            this.ships.push(aiShip);

            const ai = new AIController(aiShip, this.track, SETTINGS.difficulty);
            ai.targetSpeedFactor = CONFIG.AI_SPEED_FACTOR[SETTINGS.difficulty] * (0.85 + Math.random() * 0.3);
            this.aiControllers.push(ai);
        }

        this.weaponManager = new WeaponManager(this.scene, this.audioManager);
        this.particleSystem = new ParticleSystem(this.scene);
        this.particleSystem.createEngineTrail(this.playerShip);
        this.particleSystem.createSpeedLines();
        this.particleSystem.createBoostEffect(this.playerShip);
        for (let i = 1; i < this.ships.length; i++) {
            this.particleSystem.createEngineTrail(this.ships[i]);
        }

        this.state = 'COUNTDOWN';
        this.raceTime = 0;

        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        document.getElementById('resultScreen').style.display = 'none';

        // Hide loading screen
        const ls = document.getElementById('loadingScreen');
        if (ls) { ls.style.opacity = '0'; setTimeout(() => ls.style.display = 'none', 500); }

        this.audioManager.startMusic();
        this.audioManager.startEngine();
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

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                cdText.textContent = count;
                cdText.style.animation = 'none';
                void cdText.offsetWidth;
                cdText.style.animation = 'countPulse 0.8s ease-out';
                this.audioManager.playCountdownBeep(false);
            } else if (count === 0) {
                cdText.textContent = 'GO!';
                cdText.className = 'countdown-text go';
                cdText.style.animation = 'none';
                void cdText.offsetWidth;
                cdText.style.animation = 'countPulse 0.8s ease-out';
                this.audioManager.playCountdownBeep(true);
            } else {
                clearInterval(interval);
                cdEl.style.display = 'none';
                this.state = 'RACING';
            }
        }, 1000);
    }

    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());
        let dt = 0;
        try { dt = Math.min(this.clock.getDelta(), 0.05); } catch (e) { dt = 0.016; }

        try {
            switch (this.state) {
                case 'MENU': this.updateMenu(dt); break;
                case 'COUNTDOWN': this.updateCountdown(dt); break;
                case 'RACING': this.updateRacing(dt); break;
                case 'FINISHED': this.updateFinished(dt); break;
            }
        } catch (e) {
            console.error('Game update error:', e);
        }

        try {
            if (this.composer && this.useBloom) {
                this.composer.render();
            } else {
                this.renderer.render(this.scene, this.camera);
            }
        } catch (e) {
            if (this.useBloom) {
                this.useBloom = false;
                this.composer = null;
                try { this.renderer.render(this.scene, this.camera); } catch(e2) {}
            }
        }
    }

    updateMenu(dt) {
        if (this.menuStars) this.menuStars.rotation.y += dt * 0.02;
        this.menuCameraAngle += dt * 0.3;
        this.camera.position.set(Math.sin(this.menuCameraAngle) * 100, 40, Math.cos(this.menuCameraAngle) * 100);
        this.camera.lookAt(0, 0, 0);
    }

    updateCountdown(dt) {
        if (this.playerShip) {
            const f = this.track.getFrameDataAt(0.001);
            this.playerShip.position.y = f.point.y + CONFIG.HOVER_HEIGHT + Math.sin(performance.now() * 0.003) * 0.15;
            this.playerShip.updateTransform();
        }
        this.ships.forEach((s, i) => {
            if (i > 0) {
                s.position.y += Math.sin(performance.now() * 0.003 + i) * 0.003;
                s.updateTransform();
            }
        });
        if (this.track) this.track.update(dt);
        this.updatePlayerCamera(dt);
    }

    updateRacing(dt) {
        this.raceTime += dt;
        this.readInput();
        this.playerShip.update(dt, this.track, this.ships);

        this.aiControllers.forEach((ai, i) => {
            ai.update(dt, this.ships);
            this.ships[i + 1].update(dt, this.track, this.ships);
        });

        this.handlePlayerWeapons();
        this.handleAIWeapons();
        this.weaponManager.update(dt, this.track, this.ships);
        if (this.track) this.track.update(dt);
        this.particleSystem.update(dt, this.playerShip);
        this.audioManager.updateEngine(this.playerShip.speed, CONFIG.MAX_SPEED);
        this.updatePlayerCamera(dt);
        this.hud.update(this.playerShip, this.ships, this.track);

        // Events
        this.ships.forEach(ship => {
            if (ship.lapJustCompleted) {
                if (ship.isPlayer) {
                    if (ship.finished) {
                        this.audioManager.playLapComplete();
                        this.hud.showNotification('RACE COMPLETE!', 'lap');
                    } else {
                        this.audioManager.playLapComplete();
                        this.hud.showNotification(`LAP ${ship.lap}/${CONFIG.NUM_LAPS}`, 'lap');
                    }
                }
                ship.lapJustCompleted = false;
            }

            if (ship.isPlayer && ship.isBoosting && ship.boostTimer > CONFIG.BOOST_DURATION - 0.05) {
                this.audioManager.playBoost();
                this.hud.showNotification('BOOST!', 'boost');
            }

            if (ship.isPlayer && ship.justPickedUpBoost) {
                this.audioManager.playWeaponPickup();
                this.hud.showNotification('BOOST', 'weapon');
            }
            if (ship.isPlayer && ship.justPickedUpWeapon) {
                this.audioManager.playWeaponPickup();
            }
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

        // Boost
        if (this.keys['Space'] && s.boostEnergy > 0 && !s.isBoosting) {
            s.isBoosting = true;
            s.boostTimer = CONFIG.BOOST_DURATION;
            s.boostEnergy = 0;
        }

        // Weapon
        if (this.keys['KeyX'] && s.currentWeapon && !this.playerWeaponFired) {
            this.playerWeaponFired = true;
            const w = s.currentWeapon;
            s.currentWeapon = null;
            this.fireWeapon(w, s);
        }
        if (!this.keys['KeyX']) this.playerWeaponFired = false;

        // Shield
        if (this.keys['KeyC'] && s.shield > CONFIG.SHIELD_BLOCK_COST) {
            s.shield -= CONFIG.SHIELD_BLOCK_COST;
            s.showShield();
            this.audioManager.playShieldUp();
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
            if (s.inputShield && s.shield > CONFIG.SHIELD_BLOCK_COST) {
                s.shield -= CONFIG.SHIELD_BLOCK_COST;
                s.showShield();
                s.inputShield = false;
            }
        }
    }

    fireWeapon(type, owner) {
        const ok = this.weaponManager.fireWeapon(type, owner, this.track, this.ships);
        if (ok && owner.isPlayer) {
            switch (type) {
                case 'missile': this.audioManager.playMissile(); break;
                case 'mine': this.audioManager.playMine(); break;
                case 'bolt': this.audioManager.playBolt(); break;
                case 'turbo': this.audioManager.playBoost(); break;
                case 'shield': this.audioManager.playShieldUp(); break;
            }
            this.hud.showNotification(type.toUpperCase(), 'weapon');
        }
    }

    updatePlayerCamera(dt) {
        if (!this.playerShip) return;
        const s = this.playerShip;
        const fwd = new THREE.Vector3(Math.sin(s.rotation), 0, Math.cos(s.rotation));

        const spd = s.speed / CONFIG.MAX_SPEED;
        const dist = CONFIG.CAMERA_DISTANCE + spd * 3;
        const height = CONFIG.CAMERA_HEIGHT + spd * 1.5;

        const desired = s.position.clone().sub(fwd.clone().multiplyScalar(dist)).add(new THREE.Vector3(0, height, 0));
        this.camera.position.lerp(desired, Math.min(1, 6 * dt));

        const lookAt = s.position.clone().add(fwd.clone().multiplyScalar(CONFIG.CAMERA_LOOK_AHEAD)).add(new THREE.Vector3(0, 2, 0));
        this.camera.lookAt(lookAt);

        // Speed shake
        if (spd > 0.8) {
            const intensity = (spd - 0.8) * 0.3;
            this.camera.position.x += (Math.random() - 0.5) * intensity;
            this.camera.position.y += (Math.random() - 0.5) * intensity * 0.5;
        }

        if (this.dirLight) {
            this.dirLight.position.copy(s.position).add(new THREE.Vector3(80, 150, -50));
        }
    }

    checkFinish() {
        if (this.playerShip.finished && this.state === 'RACING') {
            this.calculateResults();
            this.showResults();
            this.state = 'FINISHED';
            this.audioManager.playLapComplete();
            setTimeout(() => this.audioManager.setMusicVolume(0.05), 1000);
            setTimeout(() => this.audioManager.stopMusic(), 4000);
        }
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
        list.innerHTML = '';
        this.results.forEach((r, i) => {
            const entry = document.createElement('div');
            entry.className = `result-entry ${r.isPlayer ? 'player' : ''}`;
            const min = Math.floor(r.time / 60);
            const sec = Math.floor(r.time % 60);
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
        this.audioManager.updateEngine(this.playerShip.speed, CONFIG.MAX_SPEED);
    }

    onResize() {
        const w = window.innerWidth, h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        if (this.composer) this.composer.setSize(w, h);
    }
}