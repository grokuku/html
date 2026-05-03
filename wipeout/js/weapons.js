// Weapons System - Missiles, Mines, Bolts, Turbo
import * as THREE from 'three';
import { CONFIG } from './constants.js';

export class WeaponManager {
    constructor(scene, audioManager) {
        this.scene = scene;
        this.audio = audioManager;
        this.projectiles = [];
        this.mines = [];
    }

    fireWeapon(type, owner, track, allShips) {
        switch (type) {
            case 'missile': return this.fireMissile(owner, track, allShips);
            case 'mine': return this.fireMine(owner);
            case 'bolt': return this.fireBolt(owner, track, allShips);
            case 'turbo': return this.fireTurbo(owner);
            case 'shield': return this.fireShield(owner);
            default: return false;
        }
    }

    fireMissile(owner, track, allShips) {
        const missile = {
            type: 'missile',
            owner: owner,
            position: owner.position.clone().add(
                new THREE.Vector3(Math.sin(owner.rotation), 0, Math.cos(owner.rotation)).multiplyScalar(3)
            ),
            velocity: new THREE.Vector3(
                Math.sin(owner.rotation) * 600,
                0,
                Math.cos(owner.rotation) * 600
            ),
            lifetime: 5,
            target: this.findNearestTarget(owner, allShips),
            mesh: null,
            trail: [],
        };

        // Create missile mesh
        const geo = new THREE.ConeGeometry(0.2, 1.5, 6);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
        missile.mesh = new THREE.Mesh(geo, mat);
        missile.mesh.position.copy(missile.position);
        missile.mesh.quaternion.copy(owner.shipGroup.quaternion);
        this.scene.add(missile.mesh);

        // Add engine glow
        const glow = new THREE.PointLight(0xff3333, 3, 20);
        missile.mesh.add(glow);

        this.projectiles.push(missile);
        return true;
    }

    fireMine(owner) {
        const mine = {
            type: 'mine',
            owner: owner,
            position: owner.position.clone().add(
                new THREE.Vector3(Math.sin(owner.rotation), 0, Math.cos(owner.rotation)).multiplyScalar(-5)
            ),
            lifetime: 30,
            mesh: null,
            armed: false,
            armTimer: 1.0,
        };

        // Set mine on track surface
        const frame = null; // Will be found in update
        mine.position.y += 0.5;

        // Create mine mesh
        const geo = new THREE.OctahedronGeometry(0.8);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.8,
            wireframe: true,
        });
        mine.mesh = new THREE.Mesh(geo, mat);
        mine.mesh.position.copy(mine.position);
        this.scene.add(mine.mesh);

        // Add pulsing light
        const light = new THREE.PointLight(0xff4400, 2, 10);
        mine.mesh.add(light);

        this.mines.push(mine);
        return true;
    }

    fireBolt(owner, track, allShips) {
        const bolt = {
            type: 'bolt',
            owner: owner,
            position: owner.position.clone().add(
                new THREE.Vector3(Math.sin(owner.rotation), 0, Math.cos(owner.rotation)).multiplyScalar(3)
            ),
            velocity: new THREE.Vector3(
                Math.sin(owner.rotation) * 400,
                0,
                Math.cos(owner.rotation) * 400
            ),
            lifetime: 2,
            mesh: null,
        };

        // Bolt is a rapid-fire energy discharge
        // Multiple small projectiles
        for (let i = 0; i < 3; i++) {
            const spread = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            );

            const boltP = {
                ...bolt,
                velocity: bolt.velocity.clone().add(spread.multiplyScalar(100)),
                position: bolt.position.clone().add(spread),
                lifetime: 1.5,
            };

            const geo = new THREE.SphereGeometry(0.15, 4, 4);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.9,
            });
            boltP.mesh = new THREE.Mesh(geo, mat);
            boltP.mesh.position.copy(boltP.position);
            this.scene.add(boltP.mesh);
            this.projectiles.push(boltP);
        }

        return true;
    }

    fireTurbo(owner) {
        // Instant turbo boost
        owner.speed = CONFIG.MAX_SPEED * CONFIG.BOOST_SPEED_MULT;
        owner.isBoosting = true;
        owner.boostTimer = CONFIG.BOOST_DURATION;
        return true;
    }

    fireShield(owner) {
        owner.shield = Math.min(CONFIG.SHIELD_MAX, owner.shield + 30);
        owner.showShield();
        return true;
    }

    findNearestTarget(owner, allShips) {
        let nearest = null;
        let nearestDist = Infinity;
        const forward = new THREE.Vector3(Math.sin(owner.rotation), 0, Math.cos(owner.rotation));

        allShips.forEach(ship => {
            if (ship === owner) return;
            const toShip = ship.position.clone().sub(owner.position);
            const dot = toShip.dot(forward);
            if (dot > 0) { // In front
                const dist = owner.position.distanceTo(ship.position);
                if (dist < nearestDist && dist < 200) {
                    nearestDist = dist;
                    nearest = ship;
                }
            }
        });

        return nearest;
    }

    update(dt, track, allShips) {
        // Update projectiles (missiles, bolts)
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            // Homing for missiles
            if (proj.type === 'missile' && proj.target) {
                const toTarget = proj.target.position.clone().sub(proj.position).normalize();
                proj.velocity.lerp(toTarget.multiplyScalar(600), 2 * dt);
                proj.velocity.normalize().multiplyScalar(600);
            }

            proj.position.add(proj.velocity.clone().multiplyScalar(dt));
            proj.lifetime -= dt;

            // Update mesh
            if (proj.mesh) {
                proj.mesh.position.copy(proj.position);
                proj.mesh.lookAt(proj.position.clone().add(proj.velocity));
            }

            // Check hit on ships
            let hit = false;
            allShips.forEach(ship => {
                if (ship === proj.owner) return;
                const dist = proj.position.distanceTo(ship.position);
                if (dist < 3) {
                    // Hit!
                    const damage = proj.type === 'missile' ? CONFIG.MISSILE_DAMAGE : 15;
                    ship.takeDamage(damage);
                    hit = true;
                    this.createExplosion(proj.position);
                    if (this.audio) this.audio.playExplosion();
                }
            });

            // Check track collision
            const trackFrame = track.getFrameDataAt(track.getNearestT(proj.position));
            if (proj.position.distanceTo(trackFrame.point) > CONFIG.TRACK_WIDTH) {
                hit = true;
                this.createExplosion(proj.position);
            }

            if (hit || proj.lifetime <= 0) {
                if (proj.mesh) {
                    this.scene.remove(proj.mesh);
                    proj.mesh.geometry?.dispose();
                    proj.mesh.material?.dispose();
                }
                this.projectiles.splice(i, 1);
            }
        }

        // Update mines
        for (let i = this.mines.length - 1; i >= 0; i--) {
            const mine = this.mines[i];

            // Arm timer
            if (!mine.armed) {
                mine.armTimer -= dt;
                if (mine.armTimer <= 0) mine.armed = true;
            }

            mine.lifetime -= dt;

            // Animate mine
            if (mine.mesh) {
                mine.mesh.rotation.y += dt * 2;
                mine.mesh.rotation.x += dt;
                mine.mesh.material.opacity = mine.armed ? 0.5 + Math.sin(performance.now() * 0.01) * 0.3 : 0.3;
            }

            // Check proximity to ships
            if (mine.armed) {
                allShips.forEach(ship => {
                    const dist = mine.position.distanceTo(ship.position);
                    if (dist < 4) {
                        // Explode!
                        ship.takeDamage(CONFIG.MINE_DAMAGE);
                        this.createExplosion(mine.position);
                        if (this.audio) this.audio.playExplosion();
                        mine.lifetime = 0;
                    }
                });
            }

            if (mine.lifetime <= 0) {
                if (mine.mesh) {
                    this.scene.remove(mine.mesh);
                    mine.mesh.geometry?.dispose();
                    mine.mesh.material?.dispose();
                }
                this.mines.splice(i, 1);
            }
        }
    }

    createExplosion(position) {
        // Create particle explosion
        const particleCount = 30;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 30
            ));

            // Random warm color
            const r = 0.8 + Math.random() * 0.2;
            const g = 0.3 + Math.random() * 0.5;
            const b = Math.random() * 0.3;
            colors[i * 3] = r;
            colors[i * 3 + 1] = g;
            colors[i * 3 + 2] = b;
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 1,
        });

        const mesh = new THREE.Points(geometry, material);
        this.scene.add(mesh);

        // Animate explosion
        const startTime = performance.now();
        const animate = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed > 1) {
                this.scene.remove(mesh);
                geometry.dispose();
                material.dispose();
                return;
            }

            const posArray = geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                posArray[i * 3] += velocities[i].x * 0.016;
                posArray[i * 3 + 1] += velocities[i].y * 0.016;
                posArray[i * 3 + 2] += velocities[i].z * 0.016;
                velocities[i].multiplyScalar(0.95); // Drag
                velocities[i].y -= 9.8 * 0.016; // Gravity
            }
            geometry.attributes.position.needsUpdate = true;
            material.opacity = 1 - elapsed;

            requestAnimationFrame(animate);
        };
        animate();
    }

    destroy() {
        // Clean up all projectiles and mines
        [...this.projectiles, ...this.mines].forEach(p => {
            if (p.mesh) {
                this.scene.remove(p.mesh);
                p.mesh.geometry?.dispose();
                p.mesh.material?.dispose();
            }
        });
        this.projectiles = [];
        this.mines = [];
    }
}