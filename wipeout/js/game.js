// Main Game Class - orchestrates everything
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

        // Three.js
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.composer = null;
        this.bloomPass = null;

        // Game objects
        this.track = null;
        this.ships = [];
        this.playerShip = null;
        this.aiControllers = [];
        this.weaponManager = null;
        this.particleSystem = null;
        this.audioManager = null;
        this.hud = null;

        // Input
        this.keys = {};

        // Timing
        this.clock = new THREE.Clock();
        this.raceTime = 0;
        this.menuCameraAngle = 0;

        this.init();
    }

    init() {
        // Three.js renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = false; // Performance

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020012);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.FOV,
            window.innerWidth / window.innerHeight,
            0.5,
            2000
        );
        this.camera.position.set(0, 50, 100);

        // Post-processing with bloom
        try {
            this.composer = new EffectComposer(this.renderer);
            const renderPass = new RenderPass(this.scene, this.camera);
            this.composer.addPass(renderPass);

            this.bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                0.6,  // strength - subtle bloom
                0.3,  // radius
                0.3   // threshold
            );
            this.composer.addPass(this.bloomPass);
        } catch (e) {
            console.warn('Bloom not available, using fallback renderer');
            this.composer = null;
        }

        // Lighting
        this.setupLighting();

        // Audio
        this.audioManager = new AudioManager();

        // HUD
        this.hud = new HUD();

        // Input
        this.setupInput();

        // Resize
        window.addEventListener('resize', () => this.onResize());

        // Menu buttons
        this.setupMenuButtons();

        // Build menu scene
        this.setupMenuScene();

        // Start
        this.clock.start();
        this.gameLoop();
    }

    setupLighting() {
        // Ambient
        const ambient = new THREE.AmbientLight(0x111133, 0.6);
        this.scene.add(ambient);

        // Hemisphere
        const hemi = new THREE.HemisphereLight(0x222255, 0x001111, 0.4);
        this.scene.add(hemi);

        // Main directional light
        const dirLight = new THREE.DirectionalLight(0x8888cc, 0.8);
        dirLight.position.set(100, 200, -50);
        this.scene.add(dirLight);
        this.dirLight = dirLight;
    }

    setupMenuScene() {
        // Create a simple animated background for menu
        // Stars
        const starGeo = new THREE.BufferGeometry();
        const positions = [];
        for (let i = 0; i < 2000; i++) {
            positions.push(
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000,
                (Math.random() - 0.5) * 2000
            );
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const starMat = new THREE.PointsMaterial({ color: 0x8888cc, size: 2, transparent: true, opacity: 0.6 });
        this.menuStars = new THREE.Points(starGeo, starMat);
        this.scene.add(this.menuStars);
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            // Prevent scrolling
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    setupMenuButtons() {
        document.getElementById('btnStart').addEventListener('click', () => {
            this.startRace();
        });
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
        // Remove game objects but keep scene
        if (this.track) {
            this.scene.remove(this.track.meshGroup);
            this.track = null;
        }
        this.ships.forEach(ship => ship.destroy());
        this.ships = [];
        this.playerShip = null;
        this.aiControllers = [];
        if (this.weaponManager) {
            this.weaponManager.destroy();
            this.weaponManager = null;
        }
        if (this.particleSystem) {
            this.particleSystem.destroy();
            this.particleSystem = null;
        }
        this.audioManager.stopMusic();
        this.audioManager.stopEngine();

        // Remove track lights
        if (this.trackLights) {
            this.trackLights.forEach(l => this.scene.remove(l));
            this.trackLights = [];
        }

        // Remove other scene objects except base lights
        const toRemove = [];
        this.scene.traverse(child => {
            if (child.isPoints && child !== this.menuStars) toRemove.push(child);
            if (child.isMesh && !child.parent?.isGroup) toRemove.push(child);
        });
        toRemove.forEach(obj => this.scene.remove(obj));
    }

    startRace() {
        // Init audio on user gesture
        this.audioManager.init();

        this.cleanup();

        // Remove menu stars
        if (this.menuStars) {
            this.scene.remove(this.menuStars);
        }

        // Create track
        this.track = new Track(this.scene);
        this.track.generate();

        // Add track accent lights
        this.trackLights = [];
        for (let i = 0; i < 12; i++) {
            const t = i / 12;
            const point = this.track.getPointAt(t);
            const light = new THREE.PointLight(0x0066ff, 6, 50);
            light.position.copy(point);
            light.position.y += 8;
            this.scene.add(light);
            this.trackLights.push(light);
        }

        // Create player ship
        const startFrame = this.track.getFrameDataAt(0.001);
        const startPos = startFrame.point.clone();
        startPos.y += CONFIG.HOVER_HEIGHT + 1;
        const rightDir = startFrame.binormal.clone();

        this.playerShip = new Ship(this.scene, CONFIG.TEAM_COLORS[0], CONFIG.TEAM_NAMES[0], true);
        this.playerShip.position.copy(startPos).add(rightDir.clone().multiplyScalar(-2));
        this.playerShip.rotation = Math.atan2(startFrame.tangent.x, startFrame.tangent.z);
        this.playerShip.shipGroup.position.copy(this.playerShip.position);
        this.playerShip.shipGroup.rotation.set(0, this.playerShip.rotation, 0);
        this.playerShip.trackIdx = 0;
        this.ships.push(this.playerShip);

        // Create AI opponents
        for (let i = 0; i < CONFIG.NUM_OPPONENTS; i++) {
            const aiShip = new Ship(this.scene, CONFIG.TEAM_COLORS[i + 1], CONFIG.TEAM_NAMES[i + 1]);
            const col = i % 2 === 0 ? 1 : -1;
            const row = Math.floor(i / 2) + 1;
            const offset = col * 3;
            const aiPos = startPos.clone()
                .add(rightDir.clone().multiplyScalar(offset))
                .add(startFrame.tangent.clone().multiplyScalar(-row * 6));
            aiPos.y = startPos.y;
            aiShip.position.copy(aiPos);
            aiShip.rotation = this.playerShip.rotation;
            aiShip.shipGroup.position.copy(aiShip.position);
            aiShip.shipGroup.rotation.set(0, aiShip.rotation, 0);
            aiShip.trackIdx = Math.min(i + 1, 10);
            aiShip.trackT = aiShip.trackIdx / CONFIG.TRACK_SEGMENTS;
            this.ships.push(aiShip);

            const ai = new AIController(aiShip, this.track, SETTINGS.difficulty);
            this.aiControllers.push(ai);
        }

        // Weapon manager
        this.weaponManager = new WeaponManager(this.scene, this.audioManager);

        // Particle system
        this.particleSystem = new ParticleSystem(this.scene);
        this.particleSystem.createEngineTrail(this.playerShip);
        this.particleSystem.createSpeedLines();
        this.particleSystem.createBoostEffect(this.playerShip);

        // Engine trails for AI
        for (let i = 1; i < this.ships.length; i++) {
            this.particleSystem.createEngineTrail(this.ships[i]);
        }

        // Start countdown
        this.state = 'COUNTDOWN';
        this.countdownTimer = CONFIG.START_DELAY;
        this.raceTime = 0;

        // Show game screen
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        document.getElementById('resultScreen').style.display = 'none';

        // Start music
        this.audioManager.startMusic();
        this.audioManager.startEngine();

        // Countdown
        this.startCountdown();
    }

    startCountdown() {
        const countdownEl = document.getElementById('countdown');
        const countdownText = document.getElementById('countdownText');
        countdownEl.style.display = 'flex';

        let count = 3;
        countdownText.textContent = count;
        countdownText.className = 'countdown-text';
        this.audioManager.playCountdownBeep(false);

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownText.textContent = count;
                countdownText.style.animation = 'none';
                void countdownText.offsetWidth;
                countdownText.style.animation = 'countPulse 0.8s ease-out';
                this.audioManager.playCountdownBeep(false);
            } else if (count === 0) {
                countdownText.textContent = 'GO!';
                countdownText.className = 'countdown-text go';
                countdownText.style.animation = 'none';
                void countdownText.offsetWidth;
                countdownText.style.animation = 'countPulse 0.8s ease-out';
                this.audioManager.playCountdownBeep(true);
            } else {
                clearInterval(interval);
                countdownEl.style.display = 'none';
                this.state = 'RACING';
            }
        }, 1000);
    }

    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());

        let dt = this.clock.getDelta();
        dt = Math.min(dt, 0.05); // Cap at 50ms

        switch (this.state) {
            case 'MENU':
                this.updateMenu(dt);
                break;
            case 'COUNTDOWN':
                this.updateCountdown(dt);
                break;
            case 'RACING':
                this.updateRacing(dt);
                break;
            case 'FINISHED':
                this.updateFinished(dt);
                break;
        }

        // Render
        if (this.composer && this.scene.children.length > 2) {
            try {
                this.composer.render();
            } catch (e) {
                this.renderer.render(this.scene, this.camera);
            }
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    updateMenu(dt) {
        // Animate menu stars
        if (this.menuStars) {
            this.menuStars.rotation.y += dt * 0.02;
        }
        this.menuCameraAngle += dt * 0.3;
        this.camera.position.set(
            Math.sin(this.menuCameraAngle) * 100,
            40,
            Math.cos(this.menuCameraAngle) * 100
        );
        this.camera.lookAt(0, 0, 0);
    }

    updateCountdown(dt) {
        // Gently hover ships in place
        if (this.playerShip) {
            const frame = this.track.getFrameDataAt(0.001);
            const hoverY = frame.point.y + CONFIG.HOVER_HEIGHT + Math.sin(performance.now() * 0.003) * 0.2;
            this.playerShip.position.y = hoverY;
            this.playerShip.updateTransform();
        }
        this.ships.forEach((ship, i) => {
            if (i > 0) {
                const baseY = ship.position.y;
                ship.position.y += Math.sin(performance.now() * 0.003 + i) * 0.003;
                ship.updateTransform();
            }
        });

        this.track.update(dt);
        this.updatePlayerCamera(dt);
    }

    updateRacing(dt) {
        this.raceTime += dt;

        // Read player input
        this.readInput();

        // Update player ship
        this.playerShip.update(dt, this.track, this.ships);

        // Update AI controllers and ships
        this.aiControllers.forEach((ai, i) => {
            ai.update(dt, this.ships);
            this.ships[i + 1].update(dt, this.track, this.ships);
        });

        // Process player weapons
        this.handlePlayerWeapons();

        // Process AI weapons
        this.handleAIWeapons();

        // Update weapons
        this.weaponManager.update(dt, this.track, this.ships);

        // Update track (for pad animations)
        this.track.update(dt);

        // Update particles
        this.particleSystem.update(dt, this.playerShip);

        // Update audio
        this.audioManager.updateEngine(this.playerShip.speed, CONFIG.MAX_SPEED);

        // Update camera
        this.updatePlayerCamera(dt);

        // Update HUD
        this.hud.update(this.playerShip, this.ships, this.track);

        // Notifications for lap completion
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

            // Boost notification
            if (ship.isPlayer && ship.isBoosting && ship.boostTimer > CONFIG.BOOST_DURATION - 0.05) {
                this.audioManager.playBoost();
                this.hud.showNotification('BOOST!', 'boost');
            }

            // Pickup sounds
            if (ship.isPlayer && ship.justPickedUpBoost) {
                this.audioManager.playWeaponPickup();
                this.hud.showNotification('BOOST Ready', 'weapon');
            }
            if (ship.isPlayer && ship.justPickedUpWeapon) {
                this.audioManager.playWeaponPickup();
            }
        });

        // Check for race finish
        this.checkFinish();
    }

    readInput() {
        if (!this.playerShip) return;
        const ship = this.playerShip;

        ship.inputAccel = (this.keys['ArrowUp'] || this.keys['KeyW']) ? 1 : 0;
        ship.inputBrake = (this.keys['ArrowDown'] || this.keys['KeyS']) ? 1 : 0;

        let steer = 0;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) steer -= 1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) steer += 1;
        ship.inputSteer = steer;

        ship.inputBoost = this.keys['Space'];
        // Weapon and shield are triggered on key press, not hold
        // We handle this differently - check for new presses
    }

    handlePlayerWeapons() {
        const ship = this.playerShip;
        if (!ship) return;

        // Boost activation
        if (this.keys['Space'] && ship.boostEnergy > 0 && !ship.isBoosting) {
            ship.isBoosting = true;
            ship.boostTimer = CONFIG.BOOST_DURATION;
            ship.boostEnergy = 0;
        }

        // Weapon firing (on key press, not hold)
        if (this.keys['KeyX'] && ship.currentWeapon && !this.playerWeaponFired) {
            this.playerWeaponFired = true;
            const weapon = ship.currentWeapon;
            ship.currentWeapon = null;

            this.fireWeapon(weapon, ship);
        }
        if (!this.keys['KeyX']) {
            this.playerWeaponFired = false;
        }

        // Shield activation
        if (this.keys['KeyC'] && ship.shield > CONFIG.SHIELD_BLOCK_COST) {
            ship.shield -= CONFIG.SHIELD_BLOCK_COST;
            ship.showShield();
            this.audioManager.playShieldUp();
        }
    }

    playerWeaponFired = false;

    handleAIWeapons() {
        // AI weapon firing is handled in ai.js through the weapon manager
        for (let i = 1; i < this.ships.length; i++) {
            const ship = this.ships[i];
            if (ship.inputWeapon && ship.currentWeapon) {
                const weapon = ship.currentWeapon;
                ship.currentWeapon = null;
                this.fireWeapon(weapon, ship);
                ship.inputWeapon = false;
            }

            // AI boost
            if (ship.inputBoost && ship.boostEnergy > 0 && !ship.isBoosting) {
                ship.isBoosting = true;
                ship.boostTimer = CONFIG.BOOST_DURATION;
                ship.boostEnergy = 0;
                ship.inputBoost = false;
            }

            // AI shield
            if (ship.inputShield && ship.shield > CONFIG.SHIELD_BLOCK_COST) {
                ship.shield -= CONFIG.SHIELD_BLOCK_COST;
                ship.showShield();
                ship.inputShield = false;
            }
        }
    }

    fireWeapon(type, owner) {
        const success = this.weaponManager.fireWeapon(type, owner, this.track, this.ships);
        if (success && owner.isPlayer) {
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

        const ship = this.playerShip;
        const forward = new THREE.Vector3(Math.sin(ship.rotation), 0, Math.cos(ship.rotation));

        // Desired camera position: behind and above
        const camDist = CONFIG.CAMERA_DISTANCE + (ship.speed / CONFIG.MAX_SPEED) * 3;
        const camHeight = CONFIG.CAMERA_HEIGHT + (ship.speed / CONFIG.MAX_SPEED) * 1.5;

        const desiredPos = ship.position.clone()
            .sub(forward.clone().multiplyScalar(camDist))
            .add(new THREE.Vector3(0, camHeight, 0));

        // Smooth follow
        this.camera.position.lerp(desiredPos, Math.min(1, 6 * dt));

        // Look at point ahead
        const lookTarget = ship.position.clone()
            .add(forward.clone().multiplyScalar(CONFIG.CAMERA_LOOK_AHEAD))
            .add(new THREE.Vector3(0, 2, 0));

        // Smooth look
        const currentTarget = new THREE.Vector3();
        this.camera.getWorldDirection(currentTarget);
        this.camera.lookAt(lookTarget);

        // Camera shake at high speed
        if (ship.speed > CONFIG.MAX_SPEED * 0.8) {
            const intensity = (ship.speed / CONFIG.MAX_SPEED - 0.8) * 0.4;
            this.camera.position.x += (Math.random() - 0.5) * intensity;
            this.camera.position.y += (Math.random() - 0.5) * intensity * 0.5;
        }

        // Update shadow light
        if (this.dirLight) {
            this.dirLight.position.copy(ship.position).add(new THREE.Vector3(80, 150, -50));
            this.dirLight.target.position.copy(ship.position);
        }
    }

    checkFinish() {
        const playerFinished = this.playerShip.finished;
        if (playerFinished && this.state === 'RACING') {
            this.calculateResults();
            this.showResults();
            this.state = 'FINISHED';
            this.audioManager.playLapComplete();

            // Stop music gradually
            setTimeout(() => {
                this.audioManager.setMusicVolume(0.05);
            }, 1000);
            setTimeout(() => {
                this.audioManager.stopMusic();
            }, 3000);
        }
    }

    calculateResults() {
        this.results = this.ships.map(ship => ({
            name: ship.name,
            isPlayer: ship.isPlayer,
            laps: ship.lap,
            time: ship.totalTime,
            progress: ship.lap + ship.trackT,
        }));

        this.results.sort((a, b) => {
            if (b.laps !== a.laps) return b.laps - a.laps;
            if (a.laps >= CONFIG.NUM_LAPS && b.laps >= CONFIG.NUM_LAPS) return a.time - b.time;
            return b.progress - a.progress;
        });
    }

    showResults() {
        const listEl = document.getElementById('resultList');
        listEl.innerHTML = '';

        this.results.forEach((result, i) => {
            const entry = document.createElement('div');
            entry.className = `result-entry ${result.isPlayer ? 'player' : ''}`;

            const minutes = Math.floor(result.time / 60);
            const seconds = Math.floor(result.time % 60);
            const ms = Math.floor((result.time % 1) * 1000);
            const timeStr = result.laps >= CONFIG.NUM_LAPS
                ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
                : 'DNF';

            entry.innerHTML = `
                <span class="pos">${i + 1}.</span>
                <span class="name">${result.name}</span>
                <span class="time">${timeStr}</span>
                <span class="diff">${result.laps}/${CONFIG.NUM_LAPS}</span>
            `;
            listEl.appendChild(entry);
        });

        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('resultScreen').style.display = 'flex';
    }

    updateFinished(dt) {
        // Slow down all ships
        this.ships.forEach(ship => {
            ship.update(dt, this.track, this.ships);
        });
        this.track.update(dt);
        this.updatePlayerCamera(dt);
        this.audioManager.updateEngine(this.playerShip.speed, CONFIG.MAX_SPEED);
    }

    onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        if (this.composer) {
            this.composer.setSize(w, h);
        }
    }
}