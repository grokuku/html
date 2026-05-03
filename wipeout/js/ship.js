// Ship - Player and AI ship model + physics
import * as THREE from 'three';
import { CONFIG } from './constants.js';

export class Ship {
    constructor(scene, color, name, isPlayer = false) {
        this.scene = scene;
        this.color = color;
        this.colorHex = color;
        this.name = name;
        this.isPlayer = isPlayer;

        // Physics state
        this.position = new THREE.Vector3(0, 5, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.speed = 0;
        this.rotation = 0; // Y rotation (yaw)
        this.roll = 0; // Z rotation
        this.pitch = 0; // X rotation

        // Track following
        this.trackT = 0;
        this.trackIdx = 0;
        this.lateralOffset = 0;
        this.prevTrackT = 0;
        this.prevTrackIdx = 0;
        this.checkpointT = 0;

        // Ship state
        this.shield = CONFIG.SHIELD_MAX;
        this.boostEnergy = 0;
        this.boostTimer = 0;
        this.currentWeapon = null;
        this.isBoosting = false;
        this.weaponsUsed = 0;

        // Pickup event flags
        this.justPickedUpBoost = false;
        this.justPickedUpWeapon = false;

        // Race state
        this.lap = 0;
        this.lapTimes = [];
        this.totalTime = 0;
        this.finished = false;
        this.racePosition = 0;
        this.lapJustCompleted = false;
        this.raceJustFinished = false;

        // Input state (set by player controls or AI)
        this.inputAccel = 0;
        this.inputBrake = 0;
        this.inputSteer = 0;
        this.inputBoost = false;
        this.inputWeapon = false;
        this.inputShield = false;

        this.steerInput = 0;

        // Trail
        this.trailTimer = 0;

        this.createShipMesh();
        scene.add(this.shipGroup);
    }

    createShipMesh() {
        const color = new THREE.Color(this.color);

        // === Main body using combined geometries ===

        // Fuselage - sleek elongated shape
        const fuselageGeo = new THREE.ConeGeometry(1.2, 5, 4);
        fuselageGeo.rotateX(Math.PI / 2);
        const fuselageMat = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.7,
            roughness: 0.3,
            flatShading: true,
        });
        const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
        fuselage.position.set(0, 0.4, -0.5);
        fuselage.scale.set(0.7, 0.35, 1);
        this.shipGroup = new THREE.Group();
        this.shipGroup.add(fuselage);

        // Body top
        const bodyGeo = new THREE.BoxGeometry(1.8, 0.3, 3.5);
        const body = new THREE.Mesh(bodyGeo, fuselageMat);
        body.position.set(0, 0.4, 0.3);
        this.shipGroup.add(body);

        // Cockpit
        const cockpitGeo = new THREE.SphereGeometry(0.35, 6, 4);
        const cockpitMat = new THREE.MeshStandardMaterial({
            color: 0x112244,
            metalness: 0.9,
            roughness: 0.1,
        });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(0, 0.7, -0.8);
        cockpit.scale.set(1, 0.7, 1.5);
        this.shipGroup.add(cockpit);

        // Left wing
        const wingGeo = new THREE.BoxGeometry(2.5, 0.08, 1.5);
        const wingMat = new THREE.MeshStandardMaterial({
            color: color.clone().multiplyScalar(0.7),
            metalness: 0.8,
            roughness: 0.2,
        });
        const leftWing = new THREE.Mesh(wingGeo, wingMat);
        leftWing.position.set(-1.8, 0.35, 0.5);
        leftWing.rotation.z = 0.05;
        this.shipGroup.add(leftWing);

        // Right wing
        const rightWing = new THREE.Mesh(wingGeo, wingMat);
        rightWing.position.set(1.8, 0.35, 0.5);
        rightWing.rotation.z = -0.05;
        this.shipGroup.add(rightWing);

        // Canards (front small wings)
        const canardGeo = new THREE.BoxGeometry(1.8, 0.06, 0.6);
        const canard = new THREE.Mesh(canardGeo, wingMat);
        canard.position.set(0, 0.42, -1.5);
        this.shipGroup.add(canard);

        // Left engine pod
        const podGeo = new THREE.BoxGeometry(0.5, 0.4, 2);
        const podMat = new THREE.MeshStandardMaterial({
            color: 0x222233,
            metalness: 0.9,
            roughness: 0.1,
        });
        const leftPod = new THREE.Mesh(podGeo, podMat);
        leftPod.position.set(-2.2, 0.25, 1.2);
        this.shipGroup.add(leftPod);

        // Right engine pod
        const rightPod = new THREE.Mesh(podGeo, podMat);
        rightPod.position.set(2.2, 0.25, 1.2);
        this.shipGroup.add(rightPod);

        // Engine intakes (front of pods)
        const intakeGeo = new THREE.CircleGeometry(0.25, 6);
        const intakeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const leftIntake = new THREE.Mesh(intakeGeo, intakeMat);
        leftIntake.position.set(-2.2, 0.25, 0.2);
        leftIntake.rotation.y = Math.PI;
        this.shipGroup.add(leftIntake);

        const rightIntake = new THREE.Mesh(intakeGeo, intakeMat);
        rightIntake.position.set(2.2, 0.25, 0.2);
        rightIntake.rotation.y = Math.PI;
        this.shipGroup.add(rightIntake);

        // Engine glow exhausts
        const glowGeo = new THREE.SphereGeometry(0.35, 6, 6);
        const glowMat = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.7,
        });

        this.engineGlowLeft = new THREE.Mesh(glowGeo, glowMat.clone());
        this.engineGlowLeft.position.set(-2.2, 0.25, 2.3);
        this.shipGroup.add(this.engineGlowLeft);

        this.engineGlowRight = new THREE.Mesh(glowGeo, glowMat.clone());
        this.engineGlowRight.position.set(2.2, 0.25, 2.3);
        this.shipGroup.add(this.engineGlowRight);

        // Center engine
        const centerGlow = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 6, 6),
            glowMat.clone()
        );
        centerGlow.position.set(0, 0.3, 2);
        this.shipGroup.add(centerGlow);
        this.centerGlow = centerGlow;

        // Point light from engines
        this.engineLight = new THREE.PointLight(this.color, 3, 20);
        this.engineLight.position.set(0, 0.3, 2.5);
        this.shipGroup.add(this.engineLight);

        // Shield sphere (initially hidden)
        const shieldGeo = new THREE.SphereGeometry(3.5, 16, 12);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x00ffaa,
            transparent: true,
            opacity: 0,
            wireframe: true,
        });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.shipGroup.add(this.shieldMesh);
        this.shieldTimer = 0;
    }

    reset(trackStart, trackTangent) {
        this.position.copy(trackStart);
        this.velocity.set(0, 0, 0);
        this.speed = 0;
        this.rotation = Math.atan2(trackTangent.x, trackTangent.z);
        this.roll = 0;
        this.pitch = 0;
        this.lateralOffset = 0;
        this.trackT = 0;
        this.trackIdx = 0;
        this.prevTrackT = 0;
        this.prevTrackIdx = 0;
        this.checkpointT = 0;
        this.shield = CONFIG.SHIELD_MAX;
        this.boostEnergy = 0;
        this.boostTimer = 0;
        this.currentWeapon = null;
        this.isBoosting = false;
        this.lap = 0;
        this.lapTimes = [];
        this.totalTime = 0;
        this.finished = false;
        this.lapJustCompleted = false;
        this.raceJustFinished = false;
        this.inputAccel = 0;
        this.inputBrake = 0;
        this.inputSteer = 0;
        this.steerInput = 0;
        this.weaponsUsed = 0;

        this.shipGroup.position.copy(this.position);
        this.shipGroup.rotation.set(0, this.rotation, 0);
    }

    update(dt, track, allShips) {
        if (this.finished) {
            // Still update position but very slow
            this.speed *= 0.95;
            this.position.add(
                new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation))
                    .multiplyScalar(this.speed * dt)
            );
            this.shipGroup.position.copy(this.position);
            this.updateTransform();
            return;
        }

        // Save previous track index for lap detection
        this.prevTrackIdx = this.trackIdx;
        this.prevTrackT = this.trackT;
        this.lapJustCompleted = false;
        this.raceJustFinished = false;

        // Find nearest track point
        this.trackIdx = track.getNearestFrameIndex(this.position, this.trackIdx);
        const frame = track.framePoints[Math.min(this.trackIdx, track.framePoints.length - 1)];
        this.trackT = this.trackIdx / CONFIG.TRACK_SEGMENTS;

        // === Lap Detection ===
        // Ship must pass through most of the track then cross start line
        if (this.prevTrackIdx > 20 && this.trackIdx <= 5 && this.checkpointT > 0.85) {
            this.lap++;
            this.lapTimes.push(this.totalTime);
            this.checkpointT = 0;
            this.lapJustCompleted = true;

            if (this.lap >= CONFIG.NUM_LAPS) {
                this.finished = true;
                this.raceJustFinished = true;
            }
        }

        // Update checkpoint
        if (this.trackT > 0.85) {
            this.checkpointT = Math.max(this.checkpointT, this.trackT);
        }

        // === Physics ===
        const maxSpeed = CONFIG.MAX_SPEED;
        const effectiveMaxSpeed = this.isBoosting ? maxSpeed * CONFIG.BOOST_SPEED_MULT : maxSpeed;

        // Forward acceleration
        if (this.inputAccel) {
            this.speed += CONFIG.ACCELERATION * dt;
        }
        if (this.inputBrake) {
            this.speed -= CONFIG.BRAKE_FORCE * dt;
        }

        // Boost handling
        if (this.boostTimer > 0) {
            this.boostTimer -= dt;
            this.isBoosting = true;
            // Extra acceleration during boost
            this.speed += CONFIG.ACCELERATION * 0.5 * dt;
        } else {
            this.isBoosting = false;
        }

        // Framerate-independent drag
        this.speed *= Math.pow(CONFIG.DRAG, dt * 60);

        // Clamp speed
        this.speed = Math.max(0, Math.min(effectiveMaxSpeed, this.speed));

        // Steering - more responsive at higher speeds
        const steerFactor = 1 + (this.speed / maxSpeed) * 0.5;
        this.steerInput = this.inputSteer;
        this.rotation += this.steerInput * CONFIG.STEER_SPEED * steerFactor * dt;

        // Calculate forward direction
        const forward = new THREE.Vector3(
            Math.sin(this.rotation),
            0,
            Math.cos(this.rotation)
        );

        // Calculate velocity
        this.velocity.copy(forward).multiplyScalar(this.speed);

        // Subtle lateral drift from steering
        const right = new THREE.Vector3(
            Math.cos(this.rotation),
            0,
            -Math.sin(this.rotation)
        );
        const lateralDrift = this.steerInput * this.speed * 0.1;
        this.velocity.add(right.multiplyScalar(lateralDrift * dt));

        // Apply velocity
        this.position.add(this.velocity.clone().multiplyScalar(dt));

        // === Track Following / Hovering ===
        const trackPoint = frame.point.clone();
        const trackNormal = frame.normal.clone();
        const trackTangent = frame.tangent.clone();
        const trackBinormal = frame.binormal.clone();

        // Target Y: hover above track surface
        const targetY = trackPoint.y + CONFIG.HOVER_HEIGHT;

        // Add hover oscillation
        const hoverOscillation = Math.sin(performance.now() * 0.005 + this.position.x) * 0.1;
        const finalTargetY = targetY + hoverOscillation;

        // Spring force to hover
        const dy = finalTargetY - this.position.y;
        this.position.y += dy * Math.min(1, CONFIG.HOVER_SPRING * dt);

        // === Track Magnetism ===
        // Gently pull ship toward track center to prevent flying off
        const offsetFromCenter = this.position.clone().sub(trackPoint);
        const lateralProjection = offsetFromCenter.dot(trackBinormal);

        // Soft center pull (stronger at edges)
        const pullStrength = 0.3 + Math.abs(lateralProjection) / (CONFIG.TRACK_WIDTH / 2) * 0.5;
        this.position.add(
            trackBinormal.clone().multiplyScalar(-lateralProjection * pullStrength * dt)
        );

        // === Roll and Pitch ===
        const targetRoll = -this.steerInput * 0.4 * Math.min(1, this.speed / 200);
        this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, 6 * dt);

        const trackSlopeAngle = -Math.asin(THREE.MathUtils.clamp(trackTangent.y, -1, 1));
        const targetPitch = trackSlopeAngle * 0.5;
        this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, 4 * dt);

        // === Wall Collision ===
        const wallOffset = this.position.clone().sub(trackPoint);
        const lateralWall = wallOffset.dot(trackBinormal);
        const halfW = CONFIG.TRACK_WIDTH / 2 - 1.5;

        if (Math.abs(lateralWall) > halfW) {
            const pushSign = Math.sign(lateralWall);
            const wallDist = Math.abs(lateralWall) - halfW;
            this.position.add(
                trackBinormal.clone().multiplyScalar(-pushSign * wallDist * 0.8)
            );
            this.speed *= Math.pow(0.95, dt * 60); // Wall friction
        }

        // === Off-track recovery ===
        const distanceToTrack = this.position.distanceTo(trackPoint);
        if (distanceToTrack > 15) {
            // Reset to track surface
            this.position.copy(trackPoint);
            this.position.y += CONFIG.HOVER_HEIGHT;
            this.speed *= 0.3;
        }

        // === Pad Pickup ===
        const padResults = track.checkPads(this.position, this.trackT, !!this.currentWeapon);
        if (padResults.boost) {
            this.boostEnergy = 1;
            this.justPickedUpBoost = true;
        } else {
            this.justPickedUpBoost = false;
        }
        if (padResults.weapon) {
            this.currentWeapon = CONFIG.WEAPONS[Math.floor(Math.random() * CONFIG.WEAPONS.length)];
            this.justPickedUpWeapon = true;
        } else {
            this.justPickedUpWeapon = false;
        }

        // === Shield Regen ===
        this.shield = Math.min(CONFIG.SHIELD_MAX, this.shield + CONFIG.SHIELD_REGEN * dt);

        // === Ship Collision ===
        if (allShips) {
            allShips.forEach(other => {
                if (other === this) return;
                const dist = this.position.distanceTo(other.position);
                if (dist < 3.5 && dist > 0.1) {
                    const pushDir = this.position.clone().sub(other.position).normalize();
                    const overlap = 3.5 - dist;
                    this.position.add(pushDir.clone().multiplyScalar(overlap * 0.5));
                    this.speed *= 0.98;
                }
            });
        }

        // === Timer ===
        this.totalTime += dt;

        // === Update Visuals ===
        this.updateTransform();

        // Engine glow intensity
        const speedRatio = this.speed / CONFIG.MAX_SPEED;
        const glowIntensity = 0.3 + speedRatio * 0.7;
        const glowScale = 0.4 + speedRatio * 0.8;

        [this.engineGlowLeft, this.engineGlowRight, this.centerGlow].forEach(g => {
            if (g) {
                g.material.opacity = glowIntensity;
                g.scale.setScalar(glowScale);
            }
        });

        if (this.isBoosting) {
            [this.engineGlowLeft, this.engineGlowRight, this.centerGlow].forEach(g => {
                if (g) g.material.color.setHex(0x00ff88);
            });
            this.engineLight.color.setHex(0x00ff88);
            this.engineLight.intensity = 6 + Math.sin(performance.now() * 0.03) * 2;
        } else {
            [this.engineGlowLeft, this.engineGlowRight, this.centerGlow].forEach(g => {
                if (g) g.material.color.setHex(this.color);
            });
            this.engineLight.color.setHex(this.color);
            this.engineLight.intensity = 2 + speedRatio * 3;
        }

        // Shield visual
        this.updateShieldVisual(dt);
    }

    updateTransform() {
        this.shipGroup.position.copy(this.position);
        const euler = new THREE.Euler(this.pitch, this.rotation, this.roll, 'YXZ');
        this.shipGroup.quaternion.setFromEuler(euler);
    }

    updateShieldVisual(dt) {
        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt;
            this.shieldMesh.material.opacity = this.shieldTimer * 0.6;
        } else {
            this.shieldMesh.material.opacity = 0;
        }
    }

    takeDamage(amount) {
        this.shield -= amount;
        if (this.shield < 0) this.shield = 0;
        if (this.isPlayer) {
            this.showDamageFlash();
        }
    }

    showDamageFlash() {
        const flash = document.createElement('div');
        flash.className = 'damage-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 300);
    }

    showShield() {
        this.shieldMesh.material.opacity = 0.4;
        this.shieldTimer = 0.5;
    }

    destroy() {
        this.scene.remove(this.shipGroup);
        // Dispose geometries/materials
        this.shipGroup.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
}