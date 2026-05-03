// Track Generation System
import * as THREE from 'three';
import { CONFIG } from './constants.js';

export class Track {
    constructor(scene) {
        this.scene = scene;
        this.curve = null;
        this.trackLength = 0;
        this.framePoints = [];
        this.meshGroup = new THREE.Group();
        this.padData = [];
        scene.add(this.meshGroup);
    }

    generate() {
        // Circuit control points - a Wipeout-style track
        const pts = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -200),
            new THREE.Vector3(80, 8, -380),
            new THREE.Vector3(180, 20, -460),
            new THREE.Vector3(320, 35, -420),
            new THREE.Vector3(420, 45, -320),
            new THREE.Vector3(440, 50, -180),
            new THREE.Vector3(380, 42, -80),
            new THREE.Vector3(280, 28, -60),
            new THREE.Vector3(220, 15, -120),
            new THREE.Vector3(180, 8, -220),
            new THREE.Vector3(240, 5, -340),
            new THREE.Vector3(200, 10, -460),
            new THREE.Vector3(120, 18, -520),
            new THREE.Vector3(0, 12, -550),
            new THREE.Vector3(-120, 5, -480),
            new THREE.Vector3(-200, -5, -360),
            new THREE.Vector3(-220, -8, -220),
            new THREE.Vector3(-180, 0, -100),
            new THREE.Vector3(-100, 5, 0),
            new THREE.Vector3(-40, 2, 80),
            new THREE.Vector3(0, 0, 40),
        ];

        this.curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5);
        this.trackLength = this.curve.getLength();

        // Generate frame data along the track
        const N = CONFIG.TRACK_SEGMENTS;
        this.framePoints = [];

        // Use Three.js Frenet frames for reliable normal/binormal computation
        // Fall back to manual computation where needed
        let prevNormal = new THREE.Vector3(0, 1, 0);

        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const point = this.curve.getPointAt(t);
            const tangent = this.curve.getTangentAt(t).normalize();

            // Compute binormal using reference up vector
            let up = new THREE.Vector3(0, 1, 0);
            if (Math.abs(tangent.dot(up)) > 0.95) {
                up = new THREE.Vector3(0, 0, 1);
            }

            const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
            const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

            // Smooth the normals to avoid flipping
            if (prevNormal) {
                const dot = normal.dot(prevNormal);
                if (dot < 0) {
                    normal.negate();
                }
                normal.lerp(prevNormal, 0.1).normalize();
            }
            prevNormal = normal.clone();

            const halfW = CONFIG.TRACK_WIDTH / 2;

            this.framePoints.push({
                t, point: point.clone(), tangent: tangent.clone(),
                normal: normal.clone(), binormal: binormal.clone(),
                leftEdge: point.clone().add(binormal.clone().multiplyScalar(halfW)),
                rightEdge: point.clone().add(binormal.clone().multiplyScalar(-halfW)),
            });
        }

        // Build 3D meshes
        this.buildTrackSurface();
        this.buildEdgeLines();
        this.buildBarriers();
        this.buildPads();
        this.buildStartLine();
        this.buildEnvironment();

        // Store start position
        const sf = this.framePoints[0];
        this.startPosition = sf.point.clone();
        this.startPosition.y += CONFIG.HOVER_HEIGHT + 1;
        this.startTangent = sf.tangent.clone();

        return this;
    }

    buildTrackSurface() {
        const halfW = CONFIG.TRACK_WIDTH / 2;
        const N = this.framePoints.length - 1;

        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        for (let i = 0; i <= N; i++) {
            const frame = this.framePoints[i];
            const left = frame.leftEdge;
            const right = frame.rightEdge;

            positions.push(left.x, left.y + 0.05, left.z);
            positions.push(right.x, right.y + 0.05, right.z);
            normals.push(frame.normal.x, frame.normal.y, frame.normal.z);
            normals.push(frame.normal.x, frame.normal.y, frame.normal.z);

            const v = frame.t;
            uvs.push(0, v * 30);
            uvs.push(1, v * 30);
        }

        for (let i = 0; i < N; i++) {
            const a = i * 2;
            const b = i * 2 + 1;
            const c = (i + 1) * 2;
            const d = (i + 1) * 2 + 1;
            indices.push(a, c, b);
            indices.push(b, c, d);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        // Track texture
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Base surface
        ctx.fillStyle = '#0c0c1e';
        ctx.fillRect(0, 0, 256, 256);

        // Grid pattern
        ctx.strokeStyle = '#151535';
        ctx.lineWidth = 1;
        for (let i = 0; i < 256; i += 32) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
        }

        // Center dashed line
        ctx.strokeStyle = '#222255';
        ctx.lineWidth = 2;
        ctx.setLineDash([16, 16]);
        ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(128, 256); ctx.stroke();
        ctx.setLineDash([]);

        // Edge markers
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(0, 0, 8, 256);
        ctx.fillRect(248, 0, 8, 256);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);

        const mat = new THREE.MeshStandardMaterial({
            map: texture,
            color: CONFIG.TRACK_COLOR,
            metalness: 0.4,
            roughness: 0.6,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        this.meshGroup.add(mesh);
    }

    buildEdgeLines() {
        const halfW = CONFIG.TRACK_WIDTH / 2;
        const segCount = this.framePoints.length - 1;

        // Build point arrays for edge tubes
        const leftPoints = [];
        const rightPoints = [];

        for (let i = 0; i <= segCount; i += 2) {
            const frame = this.framePoints[i];
            const elevated = frame.normal.clone().multiplyScalar(0.2);
            leftPoints.push(frame.leftEdge.clone().add(elevated));
            rightPoints.push(frame.rightEdge.clone().add(elevated));
        }

        const edgeMat = new THREE.MeshBasicMaterial({
            color: CONFIG.TRACK_EDGE_COLOR,
            transparent: true,
            opacity: 0.9,
        });

        const leftCurve = new THREE.CatmullRomCurve3(leftPoints, true);
        const rightCurve = new THREE.CatmullRomCurve3(rightPoints, true);

        const leftTube = new THREE.TubeGeometry(leftCurve, segCount / 2, 0.12, 6, true);
        const rightTube = new THREE.TubeGeometry(rightCurve, segCount / 2, 0.12, 6, true);

        this.meshGroup.add(new THREE.Mesh(leftTube, edgeMat));
        this.meshGroup.add(new THREE.Mesh(rightTube, edgeMat.clone()));

        // Bottom edge glow lines
        const bottomMat = new THREE.MeshBasicMaterial({
            color: CONFIG.TRACK_EDGE_COLOR,
            transparent: true,
            opacity: 0.5,
        });

        const leftBottom = [];
        const rightBottom = [];
        for (let i = 0; i <= segCount; i += 2) {
            const frame = this.framePoints[i];
            leftBottom.push(frame.leftEdge.clone().add(frame.normal.clone().multiplyScalar(-0.1)));
            rightBottom.push(frame.rightEdge.clone().add(frame.normal.clone().multiplyScalar(-0.1)));
        }

        const lbCurve = new THREE.CatmullRomCurve3(leftBottom, true);
        const rbCurve = new THREE.CatmullRomCurve3(rightBottom, true);
        this.meshGroup.add(new THREE.Mesh(
            new THREE.TubeGeometry(lbCurve, segCount / 2, 0.06, 4, true), bottomMat
        ));
        this.meshGroup.add(new THREE.Mesh(
            new THREE.TubeGeometry(rbCurve, segCount / 2, 0.06, 4, true), bottomMat.clone()
        ));
    }

    buildBarriers() {
        // Semi-transparent wall barriers using simple geometry
        const halfW = CONFIG.TRACK_WIDTH / 2 + 0.3;
        const wallH = CONFIG.WALL_HEIGHT;
        const N = this.framePoints.length - 1;

        ['left', 'right'].forEach(side => {
            const wallPositions = [];
            const wallNormals = [];
            const wallUVs = [];
            const wallIndices = [];

            for (let i = 0; i <= N; i += 2) {
                const frame = this.framePoints[i];
                const sign = side === 'left' ? 1 : -1;
                const offset = frame.binormal.clone().multiplyScalar(sign * halfW);

                const base = frame.point.clone().add(offset);
                const top = base.clone().add(frame.normal.clone().multiplyScalar(wallH));

                wallPositions.push(base.x, base.y, base.z);
                wallPositions.push(top.x, top.y, top.z);
                wallNormals.push(frame.binormal.x * sign, frame.binormal.y * sign, frame.binormal.z * sign);
                wallNormals.push(frame.normal.x, frame.normal.y, frame.normal.z);

                const v = frame.t;
                wallUVs.push(0, v * 10);
                wallUVs.push(1, v * 10);
            }

            const stepN = Math.floor(N / 2);
            for (let i = 0; i < stepN; i++) {
                const a = i * 2;
                const b = i * 2 + 1;
                const c = (i + 1) * 2;
                const d = (i + 1) * 2 + 1;

                // Ensure consistent winding
                if (side === 'left') {
                    wallIndices.push(a, c, b);
                    wallIndices.push(b, c, d);
                } else {
                    wallIndices.push(a, b, c);
                    wallIndices.push(b, d, c);
                }
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(wallNormals, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(wallUVs, 2));
            geo.setIndex(wallIndices);
            geo.computeVertexNormals();

            const mat = new THREE.MeshStandardMaterial({
                color: 0x080820,
                metalness: 0.6,
                roughness: 0.4,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide,
            });

            this.meshGroup.add(new THREE.Mesh(geo, mat));
        });
    }

    buildPads() {
        const boostPadTs = [0.08, 0.22, 0.38, 0.55, 0.72, 0.88];
        const weaponPadTs = [0.04, 0.15, 0.30, 0.48, 0.63, 0.80, 0.92];

        const padGeo = new THREE.PlaneGeometry(3, 6);

        boostPadTs.forEach(t => {
            this.createPad(t, 'boost', CONFIG.BOOST_PAD_COLOR, padGeo);
        });

        weaponPadTs.forEach(t => {
            this.createPad(t, 'weapon', CONFIG.WEAPON_PAD_COLOR, padGeo);
        });
    }

    createPad(t, type, color, geo) {
        const frame = this.getFrameDataAt(t);
        const pos = frame.point.clone().add(frame.normal.clone().multiplyScalar(0.15));

        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);

        // Orient pad to lie on track surface
        const m4 = new THREE.Matrix4().makeBasis(
            frame.binormal, frame.normal, frame.tangent.clone().negate()
        );
        mesh.quaternion.setFromRotationMatrix(m4);
        this.meshGroup.add(mesh);

        // Add a light above the pad
        const light = new THREE.PointLight(color, 3, 15);
        light.position.copy(pos).add(frame.normal.clone().multiplyScalar(2));
        this.meshGroup.add(light);

        this.padData.push({
            type, t, position: pos.clone(), frame,
            mesh, light, mat,
            active: true, timer: 0, respawnTime: type === 'boost' ? 5 : 8,
        });
    }

    buildStartLine() {
        const frame = this.getFrameDataAt(0);

        // Checkered start line on track surface
        const lineGeo = new THREE.PlaneGeometry(CONFIG.TRACK_WIDTH, 3);
        const lineCanvas = document.createElement('canvas');
        lineCanvas.width = 128;
        lineCanvas.height = 32;
        const ctx = lineCanvas.getContext('2d');

        // Checkered pattern
        for (let y = 0; y < 32; y += 8) {
            for (let x = 0; x < 128; x += 8) {
                ctx.fillStyle = ((x / 8 + y / 8) % 2 === 0) ? '#ffffff' : '#000000';
                ctx.fillRect(x, y, 8, 8);
            }
        }

        const lineTex = new THREE.CanvasTexture(lineCanvas);
        const lineMat = new THREE.MeshBasicMaterial({
            map: lineTex,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
        });

        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.copy(frame.point).add(frame.normal.clone().multiplyScalar(0.2));
        const m4 = new THREE.Matrix4().makeBasis(
            frame.binormal, frame.normal, frame.tangent.clone().negate()
        );
        line.quaternion.setFromRotationMatrix(m4);
        this.meshGroup.add(line);

        // Start arch
        const archGeo = new THREE.TorusGeometry(CONFIG.TRACK_WIDTH / 2 + 2, 0.25, 8, 16, Math.PI);
        const archMat = new THREE.MeshBasicMaterial({
            color: 0x00ccff,
            transparent: true,
            opacity: 0.5,
        });
        const arch = new THREE.Mesh(archGeo, archMat);
        arch.position.copy(frame.point).add(frame.normal.clone().multiplyScalar(6));
        const am4 = new THREE.Matrix4().makeBasis(
            frame.binormal, frame.normal, frame.tangent.clone().negate()
        );
        arch.quaternion.setFromRotationMatrix(am4);
        this.meshGroup.add(arch);
    }

    buildEnvironment() {
        // Fog
        this.scene.fog = new THREE.FogExp2(0x020012, 0.0008);
        this.scene.background = new THREE.Color(0x020012);

        // Starfield
        const starGeo = new THREE.BufferGeometry();
        const starPos = [];
        const starCols = [];
        for (let i = 0; i < 4000; i++) {
            const r = 800 + Math.random() * 1200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            starPos.push(
                r * Math.sin(phi) * Math.cos(theta),
                Math.abs(r * Math.cos(phi)), // Keep stars above horizon
                r * Math.sin(phi) * Math.sin(theta)
            );
            const b = 0.4 + Math.random() * 0.6;
            starCols.push(b * 0.8, b * 0.8, b);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
        starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starCols, 3));
        const starMat = new THREE.PointsMaterial({
            size: 2.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
        });
        this.scene.add(new THREE.Points(starGeo, starMat));

        // Cityscape buildings along track
        this.buildScenery();

        // Ambient particles floating on track
        this.buildFloatingParticles();
    }

    buildScenery() {
        const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
        const buildingColors = [0x080818, 0x0c0820, 0x081018, 0x100820, 0x081528];
        const accentColors = [0x00ccff, 0xff0066, 0x00ff88, 0xffaa00, 0x8844ff];

        for (let i = 0; i < 60; i++) {
            const t = Math.random();
            const frame = this.getFrameDataAt(t);
            const side = Math.random() > 0.5 ? 1 : -1;
            const distance = CONFIG.TRACK_WIDTH / 2 + 12 + Math.random() * 60;

            const pos = frame.point.clone()
                .add(frame.binormal.clone().multiplyScalar(side * distance));

            const w = 5 + Math.random() * 20;
            const h = 15 + Math.random() * 80;
            const d = 5 + Math.random() * 15;

            const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
            const mat = new THREE.MeshStandardMaterial({
                color,
                metalness: 0.4,
                roughness: 0.8,
            });

            const building = new THREE.Mesh(buildingGeo, mat);
            building.scale.set(w, h, d);
            building.position.copy(pos);
            building.position.y += h / 2 - 5;
            this.scene.add(building);

            // Neon accent lights on some buildings
            if (Math.random() > 0.5) {
                const accent = accentColors[Math.floor(Math.random() * accentColors.length)];
                const pl = new THREE.PointLight(accent, 4, 30);
                pl.position.copy(pos);
                pl.position.y += h * 0.3;
                this.scene.add(pl);

                // Glowing strip
                const stripGeo = new THREE.PlaneGeometry(w * 0.8, 0.5);
                const stripMat = new THREE.MeshBasicMaterial({
                    color: accent,
                    transparent: true,
                    opacity: 0.7,
                    side: THREE.DoubleSide,
                });
                const strip = new THREE.Mesh(stripGeo, stripMat);
                strip.position.copy(pos);
                strip.position.y += h * 0.3;
                strip.rotation.y = Math.random() * Math.PI;
                this.scene.add(strip);
            }
        }
    }

    buildFloatingParticles() {
        // Small glowing particles floating above the track
        const count = 200;
        const geo = new THREE.BufferGeometry();
        const positions = [];

        for (let i = 0; i < count; i++) {
            const t = Math.random();
            const frame = this.getFrameDataAt(t);
            const lateral = (Math.random() - 0.5) * CONFIG.TRACK_WIDTH * 0.8;
            const pos = frame.point.clone()
                .add(frame.binormal.clone().multiplyScalar(lateral))
                .add(frame.normal.clone().multiplyScalar(1 + Math.random() * 4));
            positions.push(pos.x, pos.y, pos.z);
        }

        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0x0088ff,
            size: 0.3,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.scene.add(new THREE.Points(geo, mat));
    }

    // === Query methods ===

    getFrameDataAt(t) {
        const idx = Math.round(t * CONFIG.TRACK_SEGMENTS) % (CONFIG.TRACK_SEGMENTS + 1);
        return this.framePoints[Math.min(idx, this.framePoints.length - 1)];
    }

    getPointAt(t) {
        return this.curve.getPointAt(((t % 1) + 1) % 1);
    }

    getTangentAt(t) {
        return this.curve.getTangentAt(((t % 1) + 1) % 1).normalize();
    }

    getNearestFrameIndex(position, hintIdx = null) {
        let bestIdx = 0;
        let bestDist = Infinity;

        const start = hintIdx !== null ? Math.max(0, hintIdx - 30) : 0;
        const end = hintIdx !== null ? Math.min(this.framePoints.length, hintIdx + 30) : this.framePoints.length;

        for (let i = start; i < end; i++) {
            const fp = this.framePoints[i];
            const dx = position.x - fp.point.x;
            const dy = position.y - fp.point.y;
            const dz = position.z - fp.point.z;
            const dist = dx * dx + dy * dy + dz * dz;
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }

        // If using hint and found nothing close, do full search
        if (hintIdx !== null && bestDist > 2500) {
            return this.getNearestFrameIndex(position, null);
        }

        return bestIdx;
    }

    // Check if a ship at position/trackT overlaps any pad
    // hasWeapon: whether the ship already has a weapon (prevents weapon pad pickup)
    checkPads(position, t, hasWeapon = false) {
        const results = { boost: false, weapon: false };

        this.padData.forEach(pad => {
            if (!pad.active) return;

            let tDist = Math.abs(t - pad.t);
            if (tDist > 0.5) tDist = 1 - tDist;

            if (tDist < 0.01) {
                const posDist = position.distanceTo(pad.position);
                if (posDist < 8) {
                    if (pad.type === 'boost') {
                        results.boost = true;
                        this.deactivatePad(pad);
                    }
                    if (pad.type === 'weapon' && !hasWeapon) {
                        results.weapon = true;
                        this.deactivatePad(pad);
                    }
                }
            }
        });

        return results;
    }

    update(dt) {
        const time = performance.now() * 0.001;

        // Animate pads
        this.padData.forEach(pad => {
            if (pad.active) {
                pad.mat.opacity = 0.5 + Math.sin(time * 4 + pad.t * 20) * 0.3;
                pad.light.intensity = 2 + Math.sin(time * 3 + pad.t * 15) * 1.5;
            } else {
                pad.mat.opacity = 0.1;
                pad.light.intensity = 0.2;
                pad.timer -= dt;
                if (pad.timer <= 0) {
                    pad.active = true;
                    pad.mesh.visible = true;
                }
            }
        });
    }

    // Called when a pad is picked up
    deactivatePad(pad) {
        pad.active = false;
        pad.mesh.visible = false;
        pad.timer = pad.respawnTime;
    }
}