// HUD Overlay Management
import * as THREE from 'three';
import { CONFIG } from './constants.js';

export class HUD {
    constructor() {
        this.speedEl = document.getElementById('hudSpeed');
        this.positionEl = document.getElementById('hudPosition');
        this.lapEl = document.getElementById('hudLap');
        this.timeEl = document.getElementById('hudTime');
        this.shieldBar = document.getElementById('hudShield');
        this.boostBar = document.getElementById('hudBoost');
        this.weaponName = document.getElementById('hudWeaponName');
        this.weaponEl = document.getElementById('hudWeapon');
        this.minimapCanvas = document.getElementById('minimap');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
    }

    update(player, allShips, track) {
        if (!player || !this.speedEl) return;

        // Speed (display in KM/H)
        const speedKmh = Math.round(player.speed * 3.6); // Convert to km/h feel
        this.speedEl.textContent = speedKmh;

        // Position
        const position = this.calculatePosition(player, allShips, track);
        this.positionEl.textContent = `${position}/${allShips.length}`;

        // Lap
        const currentLap = Math.min(player.lap + 1, CONFIG.NUM_LAPS);
        this.lapEl.textContent = `${currentLap}/${CONFIG.NUM_LAPS}`;

        // Time
        const minutes = Math.floor(player.totalTime / 60);
        const seconds = Math.floor(player.totalTime % 60);
        const ms = Math.floor((player.totalTime % 1) * 1000);
        this.timeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;

        // Shield bar
        const shieldPct = (player.shield / CONFIG.SHIELD_MAX) * 100;
        this.shieldBar.style.width = `${shieldPct}%`;
        // Color changes with shield level
        if (shieldPct > 60) {
            this.shieldBar.style.background = 'linear-gradient(90deg, #00aa44, #00ff88)';
        } else if (shieldPct > 30) {
            this.shieldBar.style.background = 'linear-gradient(90deg, #aa8800, #ffcc00)';
        } else {
            this.shieldBar.style.background = 'linear-gradient(90deg, #aa2200, #ff4400)';
        }

        // Boost bar
        const boostPct = player.boostEnergy * 100;
        this.boostBar.style.width = `${boostPct}%`;

        // Weapon
        if (player.currentWeapon) {
            this.weaponName.textContent = player.currentWeapon.toUpperCase();
            this.weaponEl.style.borderColor = '#ff8800';
        } else {
            this.weaponName.textContent = '---';
            this.weaponEl.style.borderColor = '#333';
        }

        // Minimap
        this.drawMinimap(player, allShips, track);
    }

    calculatePosition(player, allShips, track) {
        // Sort ships by progress (lap * trackLength + trackT * trackLength)
        const sorted = [...allShips].sort((a, b) => {
            const aProgress = a.lap + a.trackT;
            const bProgress = b.lap + b.trackT;
            return bProgress - aProgress; // Descending
        });

        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i] === player) return i + 1;
        }
        return allShips.length;
    }

    drawMinimap(player, allShips, track) {
        const ctx = this.minimapCtx;
        const w = this.minimapCanvas.width;
        const h = this.minimapCanvas.height;
        const cx = w / 2;
        const cy = h / 2;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Draw track outline
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.5)';
        ctx.lineWidth = 3;

        // Find bounds of track
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        track.framePoints.forEach(fp => {
            minX = Math.min(minX, fp.point.x);
            maxX = Math.max(maxX, fp.point.x);
            minZ = Math.min(minZ, fp.point.z);
            maxZ = Math.max(maxZ, fp.point.z);
        });

        const rangeX = maxX - minX || 1;
        const rangeZ = maxZ - minZ || 1;
        const scale = Math.min((w - 30) / rangeX, (h - 30) / rangeZ);

        track.framePoints.forEach((fp, i) => {
            const sx = cx + (fp.point.x - (minX + maxX) / 2) * scale;
            const sy = cy + (fp.point.z - (minZ + maxZ) / 2) * scale;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        });
        ctx.closePath();
        ctx.stroke();

        // Draw pad markers
        track.padData.forEach(pad => {
            if (!pad.active) return;
            const sx = cx + (pad.position.x - (minX + maxX) / 2) * scale;
            const sy = cy + (pad.position.z - (minZ + maxZ) / 2) * scale;
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fillStyle = pad.type === 'boost' ? '#00ff88' : '#ff8800';
            ctx.fill();
        });

        // Draw ships
        allShips.forEach((ship, i) => {
            const sx = cx + (ship.position.x - (minX + maxX) / 2) * scale;
            const sy = cy + (ship.position.z - (minZ + maxZ) / 2) * scale;

            ctx.beginPath();
            ctx.arc(sx, sy, ship.isPlayer ? 5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = '#' + new THREE.Color(CONFIG.TEAM_COLORS[i]).getHexString();
            ctx.fill();

            if (ship.isPlayer) {
                ctx.beginPath();
                ctx.arc(sx, sy, 7, 0, Math.PI * 2);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Direction indicator
                const dirX = Math.sin(ship.rotation) * 10;
                const dirZ = Math.cos(ship.rotation) * 10;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + dirX, sy + dirZ);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    }

    showNotification(text, type = '') {
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.textContent = text;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 1500);
    }
}