// Particle Effects System
import * as THREE from 'three';
import { CONFIG } from './constants.js';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.emitters = [];
    }

    // Engine exhaust trail
    createEngineTrail(parentShip) {
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const lifetimes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -1000; // Hidden
            positions[i * 3 + 2] = 0;
            sizes[i] = 0;
            lifetimes[i] = 0;
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: parentShip.color,
            transparent: true,
            opacity: 0.6,
            size: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        const emitter = {
            type: 'engineTrail',
            points,
            geometry,
            parentShip,
            nextEmit: 0,
            index: 0,
            particleCount,
            lifetimes,
        };

        this.emitters.push(emitter);
        return emitter;
    }

    // Speed lines effect at high speed
    createSpeedLines() {
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -1000;
            positions[i * 3 + 2] = 0;
            velocities.push(new THREE.Vector3());
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0,
            size: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        const emitter = {
            type: 'speedLines',
            points,
            geometry,
            material,
            velocities,
            particleCount,
        };

        this.emitters.push(emitter);
        return emitter;
    }

    // Boost flash effect
    createBoostEffect(parentShip) {
        const coneGeo = new THREE.ConeGeometry(2, 4, 8);
        const coneMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
        });

        const cone = new THREE.Mesh(coneGeo, coneMat);
        parentShip.shipGroup.add(cone);
        cone.position.set(0, 0, 2);

        const emitter = {
            type: 'boostEffect',
            mesh: cone,
            parentShip,
        };

        this.emitters.push(emitter);
        return emitter;
    }

    // Track pad glow particles
    createPadParticles() {
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        const lifetimes = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -1000;
            positions[i * 3 + 2] = 0;
            velocities.push(new THREE.Vector3());
            lifetimes.push(0);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x00ccff,
            transparent: true,
            opacity: 0.5,
            size: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        const emitter = {
            type: 'padParticles',
            points,
            geometry,
            material,
            velocities,
            lifetimes,
            particleCount,
            emitIndex: 0,
        };

        this.emitters.push(emitter);
        return emitter;
    }

    update(dt, playerShip) {
        this.emitters.forEach(emitter => {
            switch (emitter.type) {
                case 'engineTrail':
                    this.updateEngineTrail(emitter, dt);
                    break;
                case 'speedLines':
                    this.updateSpeedLines(emitter, dt, playerShip);
                    break;
                case 'boostEffect':
                    this.updateBoostEffect(emitter, dt);
                    break;
                case 'padParticles':
                    // This type is handled separately
                    break;
            }
        });
    }

    updateEngineTrail(emitter, dt) {
        const ship = emitter.parentShip;
        const posArray = emitter.geometry.attributes.position.array;
        const speed = ship.speed;
        const time = performance.now() * 0.001;

        // Emit new particles
        if (speed > 10) {
            emitter.nextEmit -= dt;
            if (emitter.nextEmit <= 0) {
                const emitRate = Math.min(0.05, 0.15 - (speed / CONFIG.MAX_SPEED) * 0.1);
                emitter.nextEmit = emitRate;

                const idx = emitter.index;
                const backOffset = new THREE.Vector3(
                    -Math.sin(ship.rotation),
                    0,
                    -Math.cos(ship.rotation)
                ).multiplyScalar(2.5);

                // Two engine positions
                const sideOffset = new THREE.Vector3(
                    Math.cos(ship.rotation),
                    0,
                    -Math.sin(ship.rotation)
                );

                const engineSide = emitter.index % 2 === 0 ? -1 : 1;

                posArray[idx * 3] = ship.position.x + backOffset.x + sideOffset.x * engineSide * 2.2;
                posArray[idx * 3 + 1] = ship.position.y + 0.2;
                posArray[idx * 3 + 2] = ship.position.z + backOffset.z + sideOffset.z * engineSide * 2.2;

                emitter.lifetimes[idx] = 1.0;
                emitter.index = (emitter.index + 1) % emitter.particleCount;
            }
        }

        // Update all particles
        for (let i = 0; i < emitter.particleCount; i++) {
            if (emitter.lifetimes[i] > 0) {
                emitter.lifetimes[i] -= dt * 2;
                posArray[i * 3] += (Math.random() - 0.5) * 0.1;
                posArray[i * 3 + 1] += dt * 3;
                posArray[i * 3 + 2] += (Math.random() - 0.5) * 0.1;

                if (emitter.lifetimes[i] <= 0) {
                    posArray[i * 3 + 1] = -1000;
                }
            }
        }

        emitter.geometry.attributes.position.needsUpdate = true;

        // Adjust trail visibility based on speed
        const intensity = Math.min(1, speed / (CONFIG.MAX_SPEED * 0.5));
        emitter.points.material.opacity = intensity * 0.6;
    }

    updateSpeedLines(emitter, dt, playerShip) {
        if (!playerShip) return;

        const posArray = emitter.geometry.attributes.position.array;
        const speed = playerShip.speed;
        const speedRatio = speed / CONFIG.MAX_SPEED;

        // Show speed lines only at high speed
        emitter.material.opacity = Math.max(0, (speedRatio - 0.7) * 2);

        if (speedRatio > 0.7) {
            const forward = new THREE.Vector3(
                -Math.sin(playerShip.rotation),
                0,
                -Math.cos(playerShip.rotation)
            );

            for (let i = 0; i < emitter.particleCount; i++) {
                const vel = emitter.velocities[i];

                // Reset particles that are behind camera or done
                const dist = posArray[i * 3 + 1]; // using Y as lifetime marker
                if (posArray[i * 3 + 1] === -1000 || Math.random() < 0.05) {
                    // Spawn new speed line near camera
                    const offset = new THREE.Vector3(
                        (Math.random() - 0.5) * 30,
                        (Math.random() - 0.5) * 20,
                        (Math.random() - 0.5) * 30
                    );
                    const pos = playerShip.position.clone()
                        .add(forward.clone().multiplyScalar(40))
                        .add(offset);

                    posArray[i * 3] = pos.x;
                    posArray[i * 3 + 1] = pos.y;
                    posArray[i * 3 + 2] = pos.z;

                    vel.copy(forward.clone().multiplyScalar(speed * 2));
                } else {
                    // Move towards camera
                    posArray[i * 3] += vel.x * dt;
                    posArray[i * 3 + 1] += vel.y * dt;
                    posArray[i * 3 + 2] += vel.z * dt;
                }

                // Remove if past camera
                const dotPos = new THREE.Vector3(
                    posArray[i * 3] - playerShip.position.x,
                    posArray[i * 3 + 1] - playerShip.position.y,
                    posArray[i * 3 + 2] - playerShip.position.z
                ).dot(forward);

                if (dotPos < -10) {
                    posArray[i * 3 + 1] = -1000;
                }
            }

            emitter.geometry.attributes.position.needsUpdate = true;
        }
    }

    updateBoostEffect(emitter, dt) {
        const ship = emitter.parentShip;
        if (ship.isBoosting) {
            emitter.mesh.material.opacity = 0.5 + Math.sin(performance.now() * 0.02) * 0.3;
            emitter.mesh.scale.setScalar(1 + Math.random() * 0.3);
        } else {
            emitter.mesh.material.opacity *= 0.9;
        }
    }

    destroy() {
        this.emitters.forEach(emitter => {
            if (emitter.points) {
                this.scene.remove(emitter.points);
                emitter.geometry?.dispose();
            }
            if (emitter.mesh) {
                emitter.mesh.parent?.remove(emitter.mesh);
                emitter.mesh.geometry?.dispose();
                emitter.mesh.material?.dispose();
            }
        });
        this.emitters = [];
    }
}