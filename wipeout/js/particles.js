// ============================================
// PARTICLE SYSTEM
// ============================================
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  reset() {
    this.particles = [];
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.size *= p.shrink || 0.98;

      if (p.life <= 0 || p.size < 0.2) {
        this.particles.splice(i, 1);
      }
    }
  }

  add(particle) {
    this.particles.push(particle);
  }

  emitDriftSparks(x, y, angle, turboLevel) {
    const color = turboLevel > 70 ? '#FF4400' : turboLevel > 40 ? '#FFD700' : '#888';
    for (let i = 0; i < 2; i++) {
      this.add({
        x: x + Math.cos(angle + Math.PI) * 10 + (Math.random() - 0.5) * 10,
        y: y + Math.sin(angle + Math.PI) * 10 + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 2 + Math.cos(angle + Math.PI) * 1,
        vy: (Math.random() - 0.5) * 2 + Math.sin(angle + Math.PI) * 1,
        size: 2 + Math.random() * 2,
        life: 0.3 + Math.random() * 0.2,
        color: color,
        gravity: 0,
        shrink: 0.95,
        type: 'spark'
      });
    }
  }

  emitExplosion(x, y) {
    const colors = ['#FF4400', '#FFD700', '#FF0000', '#FF8800'];
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.add({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        life: 0.5 + Math.random() * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: 0,
        shrink: 0.96,
        type: 'explosion'
      });
    }
  }

  emitSplash(x, y) {
    for (let i = 0; i < 5; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 2,
        size: 2 + Math.random() * 2,
        life: 0.3 + Math.random() * 0.2,
        color: '#80C0FF',
        gravity: 3,
        shrink: 0.95,
        type: 'splash'
      });
    }
  }

  emitBoost(x, y, angle) {
    for (let i = 0; i < 3; i++) {
      this.add({
        x: x + Math.cos(angle + Math.PI) * 15,
        y: y + Math.sin(angle + Math.PI) * 15,
        vx: Math.cos(angle + Math.PI) * (2 + Math.random() * 2),
        vy: Math.sin(angle + Math.PI) * (2 + Math.random() * 2),
        size: 4 + Math.random() * 3,
        life: 0.2 + Math.random() * 0.2,
        color: '#FFD700',
        gravity: 0,
        shrink: 0.92,
        type: 'boost'
      });
    }
  }

  emitStar(x, y) {
    const angle = Math.random() * Math.PI * 2;
    this.add({
      x: x + Math.cos(angle) * 15,
      y: y + Math.sin(angle) * 15,
      vx: Math.cos(angle) * 1,
      vy: Math.sin(angle) * 1 - 1,
      size: 3 + Math.random() * 3,
      life: 0.5,
      color: '#FFD700',
      gravity: -0.5,
      shrink: 0.97,
      type: 'star'
    });
  }

  emitDust(x, y, angle) {
    for (let i = 0; i < 2; i++) {
      this.add({
        x: x + Math.cos(angle + Math.PI) * 8,
        y: y + Math.sin(angle + Math.PI) * 8,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: 3 + Math.random() * 3,
        life: 0.3 + Math.random() * 0.2,
        color: '#C8B080',
        gravity: -0.3,
        shrink: 0.97,
        type: 'dust'
      });
    }
  }

  // Render particles projected onto screen
  render(ctx, renderer, camX, camY, camAngle) {
    for (const p of this.particles) {
      const proj = renderer.projectToScreen(p.x, p.y, camX, camY, camAngle);
      if (!proj) continue;

      const alpha = Math.max(0, p.life * 2);
      const size = p.size * Math.max(0.5, proj.scale * 0.08);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}