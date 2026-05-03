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
        this.rotation = 0;
        this.roll = 0;
        this.pitch = 0;

        // Track following
        this.trackT = 0;
        this.trackIdx = 0;
        this.prevTrackIdx = 0;
        this.checkpointT = 0;

        // Ship state
        this.shield = CONFIG.SHIELD_MAX;
        this.boostEnergy = 0;
        this.boostTimer = 0;
        this.currentWeapon = null;
        this.isBoosting = false;

        // Race state
        this.lap = 0;
        this.lapTimes = [];
        this.totalTime = 0;
        this.finished = false;
        this.lapJustCompleted = false;
        this.raceJustFinished = false;

        // Input
        this.inputAccel = 0;
        this.inputBrake = 0;
        this.inputSteer = 0;
        this.inputBoost = false;
        this.inputWeapon = false;
        this.inputShield = false;

        this.steerInput = 0;
        this.weaponsUsed = 0;
        this.justPickedUpBoost = false;
        this.justPickedUpWeapon = false;

        this.shieldTimer = 0;

        this.createShipMesh();
        scene.add(this.shipGroup);
    }

    createShipMesh() {
        const color = new THREE.Color(this.color);
        const dark = color.clone().multiplyScalar(0.4);
        const bright = color.clone().lerp(new THREE.Color(0xffffff), 0.3);

        this.shipGroup = new THREE.Group();

        // === HULL: Sleek aerodynamic body ===
        const hullShape = new THREE.Shape();
        hullShape.moveTo(0, -1.8);
        hullShape.quadraticCurveTo(1.0, -1.5, 1.4, -0.5);
        hullShape.lineTo(1.2, 0.5);
        hullShape.quadraticCurveTo(0.8, 0.8, 0, 0.9);
        hullShape.quadraticCurveTo(-0.8, 0.8, -1.2, 0.5);
        hullShape.lineTo(-1.4, -0.5);
        hullShape.quadraticCurveTo(-1.0, -1.5, 0, -1.8);

        const extrudeSettings = {
            steps: 1,
            depth: 5,
            bevelEnabled: true,
            bevelThickness: 0.15,
            bevelSize: 0.1,
            bevelSegments: 3,
        };

        const hullGeo = new THREE.ExtrudeGeometry(hullShape, extrudeSettings);
        hullGeo.rotateX(Math.PI / 2);
        hullGeo.rotateY(Math.PI);
        hullGeo.translate(0, 0.3, -2.5);
        hullGeo.scale(0.8, 0.35, 1);

        const hullMat = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.75,
            roughness: 0.2,
            flatShading: false,
            envMapIntensity: 1.0,
        });

        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.castShadow = true;
        this.shipGroup.add(hull);

        // === COCKPIT: Smooth canopy ===
        const cockpitGeo = new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const cockpitMat = new THREE.MeshStandardMaterial({
            color: 0x0a1a3a,
            metalness: 0.95,
            roughness: 0.05,
            transparent: true,
            opacity: 0.85,
        });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(0, 0.65, -1.2);
        cockpit.scale.set(0.7, 0.6, 1.8);
        this.shipGroup.add(cockpit);

        // === WINGS: Slept-back angular wings ===
        const wingGeo = this.createWingGeometry();
        const wingMat = new THREE.MeshStandardMaterial({
            color: dark,
            metalness: 0.8,
            roughness: 0.25,
            flatShading: false,
        });

        const leftWing = new THREE.Mesh(wingGeo, wingMat);
        leftWing.position.set(-1.2, 0.25, 0.3);
        leftWing.rotation.z = 0.08;
        this.shipGroup.add(leftWing);

        const rightWingGeo = this.createWingGeometry(true);
        const rightWing = new THREE.Mesh(rightWingGeo, wingMat);
        rightWing.position.set(1.2, 0.25, 0.3);
        rightWing.rotation.z = -0.08;
        this.shipGroup.add(rightWing);

        // === ENGINE PODS: Cylindrical nacelles ===
        const podGeo = new THREE.CylinderGeometry(0.25, 0.3, 2.2, 8);
        podGeo.rotateX(Math.PI / 2);

        const podMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            metalness: 0.9,
            roughness: 0.1,
        });

        const leftPod = new THREE.Mesh(podGeo, podMat);
        leftPod.position.set(-2.0, 0.25, 1.0);
        this.shipGroup.add(leftPod);

        const rightPod = new THREE.Mesh(podGeo, podMat);
        rightPod.position.set(2.0, 0.25, 1.0);
        this.shipGroup.add(rightPod);

        // Pod caps (front)
        const capGeo = new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        capGeo.rotateX(-Math.PI / 2);
        const capMat = new THREE.MeshStandardMaterial({
            color: dark,
            metalness: 0.9,
            roughness: 0.1,
        });
        const leftCap = new THREE.Mesh(capGeo, capMat);
        leftCap.position.set(-2.0, 0.25, -0.05);
        this.shipGroup.add(leftCap);

        const rightCap = new THREE.Mesh(capGeo, capMat);
        rightCap.position.set(2.0, 0.25, -0.05);
        this.shipGroup.add(rightCap);

        // === ENGINE GLOW: Bright exhaust ===
        const glowGeo = new THREE.SphereGeometry(0.35, 8, 8);

        const leftGlow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.8
        }));
        leftGlow.position.set(-2.0, 0.25, 2.2);
        this.shipGroup.add(leftGlow);
        this.engineGlowLeft = leftGlow;

        const rightGlow = new THREE.Mesh(glowGeo.clone(), new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.8
        }));
        rightGlow.position.set(2.0, 0.25, 2.2);
        this.shipGroup.add(rightGlow);
        this.engineGlowRight = rightGlow;

        // Center glow
        const centerGlow = new THREE.Mesh(glowGeo.clone(), new THREE.MeshBasicMaterial({
            color: color, transparent: true, opacity: 0.6
        }));
        centerGlow.position.set(0, 0.3, 2.2);
        centerGlow.scale.set(0.7, 0.7, 0.7);
        this.shipGroup.add(centerGlow);
        this.centerGlow = centerGlow;

        // === ENGINE LIGHTS ===
        this.engineLight = new THREE.PointLight(color, 3, 25);
        this.engineLight.position.set(0, 0.3, 3);
        this.shipGroup.add(this.engineLight);

        // === FIN / TAIL ===
        const finGeo = new THREE.BoxGeometry(0.06, 1.0, 0.8);
        const finMat = new THREE.MeshStandardMaterial({
            color: color, metalness: 0.7, roughness: 0.3
        });
        const fin = new THREE.Mesh(finGeo, finMat);
        fin.position.set(0, 0.8, 2.0);
        this.shipGroup.add(fin);

        // === STRIPES / ACCENTS ===
        // Side accent strips (glowing team color lines)
        const stripGeo = new THREE.BoxGeometry(0.05, 0.08, 3.5);
        const stripMat = new THREE.MeshBasicMaterial({ color: bright });
        const leftStrip = new THREE.Mesh(stripGeo, stripMat);
        leftStrip.position.set(-0.95, 0.42, 0.2);
        this.shipGroup.add(leftStrip);
        const rightStrip = new THREE.Mesh(stripGeo, stripMat.clone());
        rightStrip.position.set(0.95, 0.42, 0.2);
        this.shipGroup.add(rightStrip);

        // === SHIELD VISUAL ===
        const shieldGeo = new THREE.SphereGeometry(3.8, 16, 12);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x00ffaa, transparent: true, opacity: 0, wireframe: true,
        });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.shipGroup.add(this.shieldMesh);

        // Store references
        this.shipGroup.traverse(c => {
            if (c.isMesh) c.castShadow = true;
        });
    }

    createWingGeometry(mirrored = false) {
        // Create a swept wing shape
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(-2.2, 0.3);   // outer edge sweep back
        shape.lineTo(-2.0, 0.6);   // outer top
        shape.lineTo(-0.5, 0.5);   // inner top
        shape.lineTo(0, 0.2);      // trailing edge inner
        shape.lineTo(0, 0);        // close

        const geo = new THREE.ExtrudeGeometry(shape, {
            steps: 1, depth: 0.06,
            bevelEnabled: true, bevelThickness: 0.02,
            bevelSize: 0.02, bevelSegments: 1,
        });

        if (mirrored) {
            geo.scale(-1, 1, 1);
        }

        geo.rotateX(Math.PI / 2);
        return geo;
    }

    reset(trackStart, trackTangent) {
        this.position.copy(trackStart);
        this.velocity.set(0, 0, 0);
        this.speed = 0;
        this.rotation = Math.atan2(trackTangent.x, trackTangent.z);
        this.roll = 0;
        this.pitch = 0;
        this.trackT = 0;
        this.trackIdx = 0;
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
        this.justPickedUpBoost = false;
        this.justPickedUpWeapon = false;
        this.shieldTimer = 0;
        this.shipGroup.position.copy(this.position);
        this.shipGroup.rotation.set(0, this.rotation, 0);
    }

    update(dt, track, allShips) {
        this._updateInternal(dt, track, allShips);
    }

    _updateInternal(dt, track, allShips) {
        // Safety: clamp dt to avoid physics explosion
        const safeDt = Math.max(0.001, Math.min(dt, 0.05));

        if (this.finished) {
            this.speed *= Math.pow(0.95, safeDt * 60);
            const fwd = new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
            this.position.add(fwd.multiplyScalar(this.speed * safeDt));
            this.updateTransform();
            return;
        }

        this.prevTrackIdx = this.trackIdx;
        this.lapJustCompleted = false;
        this.raceJustFinished = false;

        // Find nearest track point — always get a valid frame
        this.trackIdx = track.getNearestFrameIndex(this.position, this.trackIdx);
        const frameIdx = Math.max(0, Math.min(this.trackIdx, track.framePoints.length - 1));
        const frame = track.framePoints[frameIdx];

        // If frame is invalid, still move but skip track-following
        const hasValidFrame = frame && frame.point && frame.normal && frame.tangent && frame.binormal;
        if (hasValidFrame) {
            this.trackT = this.trackIdx / CONFIG.TRACK_SEGMENTS;
        }

        // === Lap Detection (only with valid frame) ===
        if (hasValidFrame) {
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
            if (this.trackT > 0.85) {
                this.checkpointT = Math.max(this.checkpointT, this.trackT);
            }
        }

        // === Physics (ALWAYS run, even without valid frame) ===
        const maxSpeed = CONFIG.MAX_SPEED;
        const effectiveMaxSpeed = this.isBoosting ? maxSpeed * CONFIG.BOOST_SPEED_MULT : maxSpeed;

        if (this.inputAccel) this.speed += CONFIG.ACCELERATION * safeDt;
        if (this.inputBrake) this.speed -= CONFIG.BRAKE_FORCE * safeDt;

        if (this.boostTimer > 0) {
            this.boostTimer -= safeDt;
            this.isBoosting = true;
            this.speed += CONFIG.ACCELERATION * 0.5 * safeDt;
        } else {
            this.isBoosting = false;
        }

        this.speed *= Math.pow(CONFIG.DRAG, safeDt * 60);
        this.speed = Math.max(0, Math.min(effectiveMaxSpeed, this.speed));

        // Steering
        const steerFactor = 1 + (this.speed / Math.max(1, maxSpeed)) * 0.5;
        this.steerInput = this.inputSteer;
        this.rotation += this.steerInput * CONFIG.STEER_SPEED * steerFactor * safeDt;

        // Forward direction
        const forward = new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
        this.velocity.copy(forward).multiplyScalar(this.speed);

        // Lateral drift
        const right = new THREE.Vector3(Math.cos(this.rotation), 0, -Math.sin(this.rotation));
        this.velocity.add(right.clone().multiplyScalar(this.steerInput * this.speed * 0.1 * safeDt));

        this.position.add(this.velocity.clone().multiplyScalar(safeDt));

        // === Track Following (only with valid frame) ===
        if (hasValidFrame) {
            const trackPoint = frame.point;
            const trackNormal = frame.normal;
            const trackBinormal = frame.binormal;
            const trackTangent = frame.tangent;

            // Hover
            const hoverY = trackPoint.y + CONFIG.HOVER_HEIGHT +
                Math.sin(performance.now() * 0.005 + (this.isPlayer ? 0 : this.position.x)) * 0.08;
            const dy = hoverY - this.position.y;
            this.position.y += dy * Math.min(1, CONFIG.HOVER_SPRING * safeDt);

            // Track magnetism
            const offsetFromCenter = this.position.clone().sub(trackPoint);
            const lateralProj = offsetFromCenter.dot(trackBinormal);
            const pullStrength = 0.3 + Math.abs(lateralProj) / (CONFIG.TRACK_WIDTH / 2) * 0.5;
            this.position.add(trackBinormal.clone().multiplyScalar(-lateralProj * pullStrength * safeDt));

            // Roll & Pitch
            const targetRoll = -this.steerInput * 0.4 * Math.min(1, this.speed / 100);
            this.roll += (targetRoll - this.roll) * Math.min(1, 6 * safeDt);
            const slopeAngle = -Math.asin(THREE.MathUtils.clamp(trackTangent.y, -1, 1));
            const targetPitch = slopeAngle * 0.5;
            this.pitch += (targetPitch - this.pitch) * Math.min(1, 4 * safeDt);

            // Wall collision
            const wallOffset = this.position.clone().sub(trackPoint);
            const lateralWall = wallOffset.dot(trackBinormal);
            const halfW = CONFIG.TRACK_WIDTH / 2 - 1.5;
            if (Math.abs(lateralWall) > halfW) {
                const pushSign = Math.sign(lateralWall);
                const excess = Math.abs(lateralWall) - halfW;
                this.position.add(trackBinormal.clone().multiplyScalar(-pushSign * excess * 0.8));
                this.speed *= Math.pow(0.95, safeDt * 60);
            }

            // Off-track recovery
            if (this.position.distanceTo(trackPoint) > 25) {
                this.position.copy(trackPoint);
                this.position.y += CONFIG.HOVER_HEIGHT;
                this.speed *= 0.3;
            }

            // Pad pickup
            this.justPickedUpBoost = false;
            this.justPickedUpWeapon = false;
            const padResults = track.checkPads(this.position, this.trackT, !!this.currentWeapon);
            if (padResults.boost) {
                this.boostEnergy = 1;
                this.justPickedUpBoost = true;
            }
            if (padResults.weapon) {
                this.currentWeapon = CONFIG.WEAPONS[Math.floor(Math.random() * CONFIG.WEAPONS.length)];
                this.justPickedUpWeapon = true;
            }
        }

        // Shield regen
        this.shield = Math.min(CONFIG.SHIELD_MAX, this.shield + CONFIG.SHIELD_REGEN * safeDt);

        // === Ship Collision ===
        if (allShips) {
            for (const other of allShips) {
                if (other === this) continue;
                const d = this.position.distanceTo(other.position);
                if (d < 3.5 && d > 0.1) {
                    const push = this.position.clone().sub(other.position).normalize();
                    this.position.add(push.multiplyScalar((3.5 - d) * 0.5));
                    this.speed *= 0.98;
                }
            }
        }

        // Timer
        this.totalTime += dt;

        // === Update Visuals ===
        this.updateTransform();

        // Engine glow
        const speedRatio = this.speed / CONFIG.MAX_SPEED;
        const glowI = 0.3 + speedRatio * 0.7;
        const glowS = 0.4 + speedRatio * 0.8;

        [this.engineGlowLeft, this.engineGlowRight, this.centerGlow].forEach(g => {
            if (!g) return;
            g.material.opacity = glowI;
            g.scale.setScalar(glowS);
            g.material.color.setHex(this.isBoosting ? 0x00ff88 : this.color);
        });

        this.engineLight.color.setHex(this.isBoosting ? 0x00ff88 : this.color);
        this.engineLight.intensity = this.isBoosting
            ? 6 + Math.sin(performance.now() * 0.03) * 2
            : 2 + speedRatio * 3;

        // Shield visual
        if (this.shieldTimer > 0) {
            this.shieldTimer -= dt;
            this.shieldMesh.material.opacity = this.shieldTimer * 0.6;
        } else {
            this.shieldMesh.material.opacity = 0;
        }
    }

    updateTransform() {
        this.shipGroup.position.copy(this.position);
        const euler = new THREE.Euler(this.pitch, this.rotation, this.roll, 'YXZ');
        this.shipGroup.quaternion.setFromEuler(euler);
    }

    takeDamage(amount) {
        this.shield -= amount;
        if (this.shield < 0) this.shield = 0;
        if (this.isPlayer) {
            const flash = document.createElement('div');
            flash.className = 'damage-flash';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 300);
        }
    }

    showShield() {
        this.shieldMesh.material.opacity = 0.4;
        this.shieldTimer = 0.5;
    }

    destroy() {
        this.scene.remove(this.shipGroup);
        this.shipGroup.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
    }
}