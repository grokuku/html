// Track Generation System — Bright, vivid, Wipeout-style
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
        this.decorations = [];
        scene.add(this.meshGroup);
    }

    generate() {
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

        // Generate frames with smooth normals
        const N = CONFIG.TRACK_SEGMENTS;
        this.framePoints = [];
        let prevNormal = new THREE.Vector3(0, 1, 0);

        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const point = this.curve.getPointAt(t);
            const tangent = this.curve.getTangentAt(t).normalize();

            let up = new THREE.Vector3(0, 1, 0);
            if (Math.abs(tangent.dot(up)) > 0.95) up.set(0, 0, 1);

            const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
            const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

            if (prevNormal) {
                if (normal.dot(prevNormal) < 0) normal.negate();
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

        this.buildTrackSurface();
        this.buildEdgeLines();
        this.buildBarriers();
        this.buildPads();
        this.buildStartLine();
        this.buildGround();
        this.buildEnvironment();

        const sf = this.framePoints[0];
        this.startPosition = sf.point.clone();
        this.startPosition.y += CONFIG.HOVER_HEIGHT + 1;
        this.startTangent = sf.tangent.clone();
        return this;
    }

    // =========================== TRACK SURFACE ===========================
    buildTrackSurface() {
        const halfW = CONFIG.TRACK_WIDTH / 2;
        const N = this.framePoints.length - 1;

        const positions = [], normals = [], uvs = [], indices = [];

        for (let i = 0; i <= N; i++) {
            const f = this.framePoints[i];
            positions.push(f.leftEdge.x, f.leftEdge.y + 0.05, f.leftEdge.z);
            positions.push(f.rightEdge.x, f.rightEdge.y + 0.05, f.rightEdge.z);
            normals.push(f.normal.x, f.normal.y, f.normal.z);
            normals.push(f.normal.x, f.normal.y, f.normal.z);
            uvs.push(0, f.t * 30);
            uvs.push(1, f.t * 30);
        }
        for (let i = 0; i < N; i++) {
            indices.push(i*2, (i+1)*2, i*2+1);
            indices.push(i*2+1, (i+1)*2, (i+1)*2+1);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const tex = this.createTrackTexture();
        const mat = new THREE.MeshStandardMaterial({
            map: tex,
            color: 0x334466,
            metalness: 0.5,
            roughness: 0.5,
            side: THREE.DoubleSide,
            emissive: 0x0a0a22,
            emissiveIntensity: 0.3,
        });

        this.meshGroup.add(new THREE.Mesh(geo, mat));
    }

    createTrackTexture() {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 256;
        const ctx = c.getContext('2d');

        // Base surface — medium dark blue-gray (not black!)
        ctx.fillStyle = '#2a2a44';
        ctx.fillRect(0, 0, 256, 256);

        // Grid lines — visible
        ctx.strokeStyle = '#3a3a60';
        ctx.lineWidth = 1;
        for (let i = 0; i < 256; i += 32) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
        }

        // Center dashes — bright
        ctx.strokeStyle = '#5566aa';
        ctx.lineWidth = 3;
        ctx.setLineDash([24, 24]);
        ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(128, 256); ctx.stroke();
        ctx.setLineDash([]);

        // Edge markers — cyan glow
        ctx.fillStyle = '#2266aa';
        ctx.fillRect(0, 0, 12, 256);
        ctx.fillRect(244, 0, 12, 256);

        // Chevron markers
        ctx.fillStyle = '#445588';
        for (let y = 0; y < 256; y += 64) {
            ctx.beginPath();
            ctx.moveTo(50, y); ctx.lineTo(128, y + 20); ctx.lineTo(206, y); ctx.lineTo(128, y + 10);
            ctx.closePath(); ctx.fill();
        }

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    // =========================== EDGE LINES (NEON) ===========================
    buildEdgeLines() {
        const halfW = CONFIG.TRACK_WIDTH / 2;
        const N = this.framePoints.length - 1;
        const step = 2;

        const leftPts = [], rightPts = [];
        for (let i = 0; i <= N; i += step) {
            const f = this.framePoints[i];
            const elev = f.normal.clone().multiplyScalar(0.25);
            leftPts.push(f.leftEdge.clone().add(elev));
            rightPts.push(f.rightEdge.clone().add(elev));
        }

        // Primary edge tubes — bright cyan
        const edgeMat = new THREE.MeshBasicMaterial({
            color: CONFIG.TRACK_EDGE_COLOR,
            transparent: true,
            opacity: 1.0,
        });

        const leftCurve = new THREE.CatmullRomCurve3(leftPts, true);
        const rightCurve = new THREE.CatmullRomCurve3(rightPts, true);

        this.meshGroup.add(new THREE.Mesh(
            new THREE.TubeGeometry(leftCurve, N/step, 0.18, 6, true), edgeMat
        ));
        this.meshGroup.add(new THREE.Mesh(
            new THREE.TubeGeometry(rightCurve, N/step, 0.18, 6, true), edgeMat.clone()
        ));

        // Secondary inner edge glow (smaller, offset inward)
        const innerLeftPts = [], innerRightPts = [];
        for (let i = 0; i <= N; i += step) {
            const f = this.framePoints[i];
            const offset = f.binormal.clone().multiplyScalar(-1);
            innerLeftPts.push(f.leftEdge.clone().add(offset).add(f.normal.clone().multiplyScalar(0.15)));
            innerRightPts.push(f.rightEdge.clone().sub(offset).add(f.normal.clone().multiplyScalar(0.15)));
        }

        const innerMat = new THREE.MeshBasicMaterial({
            color: CONFIG.TRACK_EDGE_COLOR,
            transparent: true,
            opacity: 0.4,
        });

        this.meshGroup.add(new THREE.Mesh(
            new THREE.TubeGeometry(new THREE.CatmullRomCurve3(innerLeftPts, true), N/step, 0.06, 4, true), innerMat
        ));
        this.meshGroup.add(new THREE.Mesh(
            new THREE.TubeGeometry(new THREE.CatmullRomCurve3(innerRightPts, true), N/step, 0.06, 4, true), innerMat.clone()
        ));
    }

    // =========================== BARRIERS ===========================
    buildBarriers() {
        const halfW = CONFIG.TRACK_WIDTH / 2 + 0.4;
        const wallH = CONFIG.WALL_HEIGHT;
        const N = this.framePoints.length - 1;
        const step = 3;

        ['left', 'right'].forEach(side => {
            const wallPos = [], wallNorm = [], wallUVs = [], wallIdx = [];
            const sign = side === 'left' ? 1 : -1;

            for (let i = 0; i <= N; i += step) {
                const f = this.framePoints[i];
                const off = f.binormal.clone().multiplyScalar(sign * halfW);
                const base = f.point.clone().add(off);
                const top = base.clone().add(f.normal.clone().multiplyScalar(wallH));

                wallPos.push(base.x, base.y, base.z, top.x, top.y, top.z);
                wallNorm.push(sign*f.binormal.x, sign*f.binormal.y, sign*f.binormal.z,
                              f.normal.x, f.normal.y, f.normal.z);
                wallUVs.push(0, f.t*8, 1, f.t*8);
            }

            const segN = Math.floor(N / step);
            for (let i = 0; i < segN; i++) {
                const a = i*2, b = i*2+1, c = (i+1)*2, d = (i+1)*2+1;
                if (side === 'left') { wallIdx.push(a,c,b, b,c,d); }
                else { wallIdx.push(a,b,c, b,d,c); }
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3));
            geo.setAttribute('normal', new THREE.Float32BufferAttribute(wallNorm, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(wallUVs, 2));
            geo.setIndex(wallIdx);
            geo.computeVertexNormals();

            // Brighter wall material with emissive edge feel
            const mat = new THREE.MeshStandardMaterial({
                color: 0x222244,
                metalness: 0.6,
                roughness: 0.4,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide,
                emissive: 0x0a0a33,
                emissiveIntensity: 0.4,
            });

            this.meshGroup.add(new THREE.Mesh(geo, mat));
        });
    }

    // =========================== PADS ===========================
    buildPads() {
        const boostTs = [0.07, 0.20, 0.38, 0.55, 0.72, 0.88];
        const weaponTs = [0.04, 0.14, 0.30, 0.48, 0.63, 0.80, 0.92];

        const padGeo = new THREE.PlaneGeometry(4, 7);

        boostTs.forEach(t => this.createPad(t, 'boost', CONFIG.BOOST_PAD_COLOR, padGeo));
        weaponTs.forEach(t => this.createPad(t, 'weapon', CONFIG.WEAPON_PAD_COLOR, padGeo));
    }

    createPad(t, type, color, geo) {
        const frame = this.getFrameDataAt(t);
        const pos = frame.point.clone().add(frame.normal.clone().multiplyScalar(0.2));

        const mat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        const m4 = new THREE.Matrix4().makeBasis(frame.binormal, frame.normal, frame.tangent.clone().negate());
        mesh.quaternion.setFromRotationMatrix(m4);
        this.meshGroup.add(mesh);

        // Light above pad
        const light = new THREE.PointLight(color, 6, 25);
        light.position.copy(pos).add(frame.normal.clone().multiplyScalar(3));
        this.meshGroup.add(light);

        // Vertical light beam
        const beamGeo = new THREE.CylinderGeometry(0.05, 1.5, 10, 6, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.15, side: THREE.DoubleSide,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.copy(pos).add(frame.normal.clone().multiplyScalar(5));
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), frame.normal);
        this.meshGroup.add(beam);

        this.padData.push({
            type, t, position: pos.clone(), frame,
            mesh, light, mat, beam,
            active: true, timer: 0, respawnTime: type === 'boost' ? 5 : 8,
        });
    }

    // =========================== START LINE ===========================
    buildStartLine() {
        const frame = this.getFrameDataAt(0);

        const lineGeo = new THREE.PlaneGeometry(CONFIG.TRACK_WIDTH, 4);
        const lineCanvas = document.createElement('canvas');
        lineCanvas.width = 256; lineCanvas.height = 64;
        const ctx = lineCanvas.getContext('2d');

        for (let y = 0; y < 64; y += 8) {
            for (let x = 0; x < 256; x += 8) {
                ctx.fillStyle = ((x/8 + y/8) % 2 === 0) ? '#ffffff' : '#111111';
                ctx.fillRect(x, y, 8, 8);
            }
        }

        const lineTex = new THREE.CanvasTexture(lineCanvas);
        const line = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({
            map: lineTex, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
        }));
        line.position.copy(frame.point).add(frame.normal.clone().multiplyScalar(0.2));
        const m4 = new THREE.Matrix4().makeBasis(frame.binormal, frame.normal, frame.tangent.clone().negate());
        line.quaternion.setFromRotationMatrix(m4);
        this.meshGroup.add(line);

        // Arch
        const archGeo = new THREE.TorusGeometry(CONFIG.TRACK_WIDTH / 2 + 2, 0.3, 8, 24, Math.PI);
        const arch = new THREE.Mesh(archGeo, new THREE.MeshBasicMaterial({
            color: 0x00eeff, transparent: true, opacity: 0.7,
        }));
        arch.position.copy(frame.point).add(frame.normal.clone().multiplyScalar(7));
        const am = new THREE.Matrix4().makeBasis(frame.binormal, frame.normal, frame.tangent.clone().negate());
        arch.quaternion.setFromRotationMatrix(am);
        this.meshGroup.add(arch);
    }

    // =========================== GROUND PLANE ===========================
    buildGround() {
        // Large ground plane beneath the track
        const groundGeo = new THREE.PlaneGeometry(4000, 4000);
        const groundCanvas = document.createElement('canvas');
        groundCanvas.width = 512; groundCanvas.height = 512;
        const ctx = groundCanvas.getContext('2d');

        // Dark ground with grid
        ctx.fillStyle = '#080818';
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#121230';
        ctx.lineWidth = 1;
        for (let i = 0; i < 512; i += 32) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
        }

        const groundTex = new THREE.CanvasTexture(groundCanvas);
        groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
        groundTex.repeat.set(20, 20);

        const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({
            map: groundTex,
            color: 0x0a0a20,
            metalness: 0.3,
            roughness: 0.8,
        }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -15;
        this.scene.add(ground);
    }

    // =========================== ENVIRONMENT ===========================
    buildEnvironment() {
        // Sky / Fog
        this.scene.background = new THREE.Color(0x040020);
        this.scene.fog = new THREE.FogExp2(0x040020, 0.0006);

        // Stars
        const starGeo = new THREE.BufferGeometry();
        const sPos = [], sCol = [];
        for (let i = 0; i < 3000; i++) {
            const r = 900 + Math.random() * 1100;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.8; // upper hemisphere
            sPos.push(r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(theta));
            const b = 0.5 + Math.random() * 0.5;
            sCol.push(b*0.85, b*0.85, b);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
        starGeo.setAttribute('color', new THREE.Float32BufferAttribute(sCol, 3));
        this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
            size: 2.5, vertexColors: true, transparent: true, opacity: 0.8,
        })));

        // Buildings
        this.buildCityscape();

        // Track-side lamp posts
        this.buildTrackLights();

        // Floating particles
        this.buildAmbientParticles();
    }

    buildCityscape() {
        const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
        const colors = [0x151528, 0x1a1530, 0x151a28, 0x201530, 0x152030];
        const accentColors = [0x00ccff, 0xff0066, 0x00ff88, 0xffaa00, 0x8844ff, 0xff44aa];

        for (let i = 0; i < 40; i++) {
            const t = Math.random();
            const frame = this.getFrameDataAt(t);
            const side = Math.random() > 0.5 ? 1 : -1;
            const dist = CONFIG.TRACK_WIDTH / 2 + 15 + Math.random() * 60;

            const pos = frame.point.clone().add(frame.binormal.clone().multiplyScalar(side * dist));

            const w = 6 + Math.random() * 20;
            const h = 20 + Math.random() * 100;
            const d = 6 + Math.random() * 15;

            const bMat = new THREE.MeshStandardMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                metalness: 0.4,
                roughness: 0.8,
                emissive: 0x050515,
                emissiveIntensity: 0.3,
            });

            const building = new THREE.Mesh(buildingGeo, bMat);
            building.scale.set(w, h, d);
            building.position.copy(pos);
            building.position.y += h / 2 - 10;
            this.scene.add(building);

            // Windows matrix (emissive strips)
            if (h > 30) {
                const windowRows = Math.floor(h / 15);
                const windowCols = Math.max(1, Math.floor(w / 8));
                const winGeo = new THREE.PlaneGeometry(w * 0.9, 2);
                const accent = accentColors[Math.floor(Math.random() * accentColors.length)];
                const winMat = new THREE.MeshBasicMaterial({
                    color: accent, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
                });

                for (let row = 0; row < windowRows; row++) {
                    const strip = new THREE.Mesh(winGeo, winMat);
                    strip.position.copy(pos);
                    strip.position.y = building.position.y - h/2 + 8 + row * 15;
                    strip.rotation.y = Math.random() * Math.PI;
                    this.scene.add(strip);
                }

                // Building top light
                const pl = new THREE.PointLight(accent, 5, 50);
                pl.position.copy(pos);
                pl.position.y += h * 0.4;
                this.scene.add(pl);
            }
        }
    }

    buildTrackLights() {
        // Lamp posts along the track edges with bright lights
        const halfW = CONFIG.TRACK_WIDTH / 2 + 1;
        const N = this.framePoints.length - 1;

        for (let i = 0; i < N; i += 30) {
            const f = this.framePoints[i];
            const side = i % 60 === 0 ? 1 : -1;

            const pos = f.point.clone().add(f.binormal.clone().multiplyScalar(side * halfW));
            pos.y += 8;

            // Pole
            const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 8, 4);
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x333355, metalness: 0.7, roughness: 0.3 });
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.copy(f.point).add(f.binormal.clone().multiplyScalar(side * halfW));
            pole.position.y += 4;
            this.scene.add(pole);

            // Bright light on top
            const lightColor = i % 60 === 0 ? 0x00aaff : 0x4488ff;
            const light = new THREE.PointLight(lightColor, 8, 60);
            light.position.copy(pos);
            this.scene.add(light);
            this.decorations.push(light);

            // Glowing sphere on lamp
            const bulb = new THREE.Mesh(
                new THREE.SphereGeometry(0.4, 6, 6),
                new THREE.MeshBasicMaterial({ color: lightColor })
            );
            bulb.position.copy(pos);
            this.scene.add(bulb);
        }
    }

    buildAmbientParticles() {
        const count = 300;
        const geo = new THREE.BufferGeometry();
        const positions = [], colors = [];

        for (let i = 0; i < count; i++) {
            const t = Math.random();
            const f = this.getFrameDataAt(t);
            const lateral = (Math.random() - 0.5) * CONFIG.TRACK_WIDTH * 0.8;
            const pos = f.point.clone()
                .add(f.binormal.clone().multiplyScalar(lateral))
                .add(f.normal.clone().multiplyScalar(1 + Math.random() * 5));
            positions.push(pos.x, pos.y, pos.z);

            const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.8, 0.5 + Math.random() * 0.3);
            colors.push(c.r, c.g, c.b);
        }

        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
            size: 0.4, vertexColors: true, transparent: true, opacity: 0.6,
            blending: THREE.AdditiveBlending, depthWrite: false,
        })));
    }

    // =========================== QUERY METHODS ===========================
    getFrameDataAt(t) {
        const idx = Math.round(t * CONFIG.TRACK_SEGMENTS) % (CONFIG.TRACK_SEGMENTS + 1);
        return this.framePoints[Math.min(Math.abs(idx), this.framePoints.length - 1)];
    }

    getPointAt(t) {
        return this.curve.getPointAt(((t % 1) + 1) % 1);
    }

    getTangentAt(t) {
        return this.curve.getTangentAt(((t % 1) + 1) % 1).normalize();
    }

    getNearestFrameIndex(position, hintIdx = null) {
        let bestIdx = 0, bestDist = Infinity;

        const start = hintIdx !== null ? Math.max(0, hintIdx - 30) : 0;
        const end = hintIdx !== null ? Math.min(this.framePoints.length, hintIdx + 30) : this.framePoints.length;

        for (let i = start; i < end; i++) {
            const fp = this.framePoints[i];
            const dx = position.x - fp.point.x;
            const dy = position.y - fp.point.y;
            const dz = position.z - fp.point.z;
            const dist = dx*dx + dy*dy + dz*dz;
            if (dist < bestDist) { bestDist = dist; bestIdx = i; }
        }

        // If hint didn't find anything close, full search
        if (hintIdx !== null && bestDist > 2500) {
            return this.getNearestFrameIndex(position, null);
        }

        return bestIdx;
    }

    checkPads(position, t, hasWeapon = false) {
        const results = { boost: false, weapon: false };
        this.padData.forEach(pad => {
            if (!pad.active) return;
            let tDist = Math.abs(t - pad.t);
            if (tDist > 0.5) tDist = 1 - tDist;
            if (tDist < 0.01) {
                const posDist = position.distanceTo(pad.position);
                if (posDist < 10) {
                    if (pad.type === 'boost') { results.boost = true; this.deactivatePad(pad); }
                    if (pad.type === 'weapon' && !hasWeapon) { results.weapon = true; this.deactivatePad(pad); }
                }
            }
        });
        return results;
    }

    update(dt) {
        const time = performance.now() * 0.001;
        this.padData.forEach(pad => {
            if (pad.active) {
                pad.mat.opacity = 0.6 + Math.sin(time * 5 + pad.t * 20) * 0.3;
                pad.light.intensity = 4 + Math.sin(time * 3 + pad.t * 15) * 3;
            } else {
                pad.mat.opacity = 0.08;
                pad.light.intensity = 0.3;
                pad.timer -= dt;
                if (pad.timer <= 0) {
                    pad.active = true;
                    pad.mesh.visible = true;
                    if (pad.beam) pad.beam.visible = true;
                }
            }
        });
    }

    deactivatePad(pad) {
        pad.active = false;
        pad.mesh.visible = false;
        if (pad.beam) pad.beam.visible = false;
        pad.timer = pad.respawnTime;
    }
}