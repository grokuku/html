// AI Controller for opponent ships
import * as THREE from 'three';
import { CONFIG } from './constants.js';

export class AIController {
    constructor(ship, track, difficulty) {
        this.ship = ship;
        this.track = track;
        this.difficulty = difficulty;
        this.targetSpeedFactor = CONFIG.AI_SPEED_FACTOR[difficulty] || 0.85;
        this.steerFactor = CONFIG.AI_STEER_FACTOR[difficulty] || 0.8;
        this.targetLateralOffset = 0;
        this.laneChangeTimer = 0;
        this.weaponUseTimer = 0;
        this.avoidanceTimer = 0;
        this.stuckTimer = 0;
        this.lastTrackT = 0;
    }

    update(dt, allShips) {
        if (this.ship.finished) return;

        // Get track info — with fallback
        const frame = this.ship.trackT != null ? this.track.getFrameDataAt(this.ship.trackT) : this.track.framePoints[0];
        if (!frame || !frame.tangent || !frame.binormal) return;

        const trackTangent = frame.tangent;
        const trackBinormal = frame.binormal;

        // Current ship direction
        const shipForward = new THREE.Vector3(
            Math.sin(this.ship.rotation),
            0,
            Math.cos(this.ship.rotation)
        );

        // Calculate angle between ship direction and track tangent
        const angleDiff = Math.atan2(
            shipForward.x * trackTangent.z - shipForward.z * trackTangent.x,
            shipForward.x * trackTangent.x + shipForward.z * trackTangent.z
        );

        // Lane change behavior
        this.laneChangeTimer -= dt;
        if (this.laneChangeTimer <= 0) {
            // Pick a new target lateral offset
            this.targetLateralOffset = (Math.random() - 0.5) * CONFIG.TRACK_WIDTH * 0.6;
            this.laneChangeTimer = 2 + Math.random() * 5;
        }

        // Avoid other ships (basic)
        let avoidanceOffset = 0;
        allShips.forEach(other => {
            if (other === this.ship) return;
            const dist = this.ship.position.distanceTo(other.position);
            if (dist < 8) {
                const awayDir = this.ship.position.clone().sub(other.position);
                const lateralComp = awayDir.dot(trackBinormal);
                avoidanceOffset += Math.sign(lateralComp) * (8 - dist) * 0.1;
            }
        });

        // Target point ahead on the track
        const lookAheadDist = 0.02 + (this.ship.speed / CONFIG.MAX_SPEED) * 0.03;
        const targetT = (this.ship.trackT + lookAheadDist) % 1;
        const targetPoint = this.track.getPointAt(targetT);

        // Add lateral offset and avoidance to target
        const targetFrame = this.track.getFrameDataAt(targetT);
        const offsetCombined = this.targetLateralOffset + avoidanceOffset;
        targetPoint.add(targetFrame.binormal.clone().multiplyScalar(offsetCombined));

        // Steer towards target point
        const toTarget = targetPoint.clone().sub(this.ship.position).normalize();
        const steerAngle = Math.atan2(toTarget.x, toTarget.z);
        let steerDiff = steerAngle - this.ship.rotation;

        // Normalize to [-PI, PI]
        while (steerDiff > Math.PI) steerDiff -= Math.PI * 2;
        while (steerDiff < -Math.PI) steerDiff += Math.PI * 2;

        // Apply steering with skill factor
        this.ship.inputSteer = Math.max(-1, Math.min(1, steerDiff * this.steerFactor * 2));

        // Speed control
        const targetSpeed = CONFIG.MAX_SPEED * this.targetSpeedFactor;
        // Slow down on turns
        const turnAmount = Math.abs(steerDiff);
        const turnSlowdown = 1 - Math.min(0.3, turnAmount * 0.3);
        const adjustedTargetSpeed = targetSpeed * turnSlowdown;

        if (this.ship.speed < adjustedTargetSpeed) {
            this.ship.inputAccel = 1;
            this.ship.inputBrake = 0;
        } else {
            this.ship.inputAccel = 0;
            this.ship.inputBrake = turnAmount > 0.5 ? 0.3 : 0;
        }

        // Use boost when available
        this.ship.inputBoost = this.ship.boostEnergy > 0 && this.ship.speed < targetSpeed * 0.8;

        // Use weapons
        this.weaponUseTimer -= dt;
        if (this.ship.currentWeapon && this.weaponUseTimer <= 0) {
            this.weaponUseTimer = 3 + Math.random() * 5;

            // Find nearest opponent ahead
            let nearestAhead = null;
            let nearestDist = Infinity;
            allShips.forEach(other => {
                if (other === this.ship) return;
                const dist = this.ship.position.distanceTo(other.position);
                const dot = other.position.clone().sub(this.ship.position).dot(shipForward);
                if (dot > 0 && dist < 100 && dist < nearestDist) {
                    nearestDist = dist;
                    nearestAhead = other;
                }
            });

            // Use weapon
            if (this.ship.currentWeapon === 'missile' && nearestAhead) {
                this.ship.inputWeapon = true;
                setTimeout(() => { this.ship.inputWeapon = false; }, 100);
            } else if (this.ship.currentWeapon === 'mine') {
                this.ship.inputWeapon = true;
                setTimeout(() => { this.ship.inputWeapon = false; }, 100);
            } else if (this.ship.currentWeapon === 'bolt' && nearestAhead) {
                this.ship.inputWeapon = true;
                setTimeout(() => { this.ship.inputWeapon = false; }, 100);
            } else if (this.ship.currentWeapon === 'turbo') {
                // Use turbo boost
                this.ship.inputBoost = true;
            } else if (this.ship.currentWeapon === 'shield') {
                this.ship.inputShield = true;
                setTimeout(() => { this.ship.inputShield = false; }, 100);
            }
        }

        // Stuck detection
        if (Math.abs(this.ship.trackT - this.lastTrackT) < 0.0001) {
            this.stuckTimer += dt;
            if (this.stuckTimer > 1) {
                // Reverse and turn
                this.ship.inputBrake = 0.5;
                this.ship.inputSteer = 1;
                this.ship.speed *= 0.8;
            }
        } else {
            this.stuckTimer = 0;
        }
        this.lastTrackT = this.ship.trackT;
    }
}