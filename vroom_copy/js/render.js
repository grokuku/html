/* ============================================================
   VROOMIIIES — render.js
   Rendu canvas : monde pré-rendu + particules + karts.
   renderWorld(ctx, cam, viewport) est paramétré pour le futur
   split-screen 2P (lot 5).
   ============================================================ */
'use strict';

const Render = {
  canvas: null,
  ctx: null,
  vw: 0, vh: 0,

  attach: function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
  },

  resize: function () {
    if (!this.canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.vw = window.innerWidth; this.vh = window.innerHeight;
    this.canvas.width = Math.floor(this.vw * dpr);
    this.canvas.height = Math.floor(this.vh * dpr);
    this.canvas.style.width = this.vw + 'px';
    this.canvas.style.height = this.vh + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  /* Dessine le monde tel que vu depuis cam (coords monde).
     viewport = { x, y, w, h } en pixels CSS (x/y = origine).
     trackOverride : piste à dessiner (menu titre) ; sinon Engine.track. */
  renderWorld: function (ctx, cam, viewport, trackOverride) {
    const track = trackOverride || Engine.track;
    if (!track) return;
    const vx = viewport.x || 0, vy = viewport.y || 0;
    ctx.save();
    ctx.translate(vx, vy);
    ctx.beginPath(); ctx.rect(0, 0, viewport.w, viewport.h); ctx.clip();
    ctx.translate(viewport.w / 2, viewport.h / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    drawTrackWorld(ctx, track);
    /* chevrons de boost animés (pulsation) — au-dessus de la piste, sous les karts */
    if (track.boosts && track.boosts.length) this.drawBoostChevrons(ctx, track, performance.now() / 1000);

    /* particules (sous les karts) */
    for (const p of Engine.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      if (p.shape === 'star') {
        /* étoile filante dorée */
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        const r = p.size * (0.7 + 0.6 * a);
        ctx.fillStyle = 'rgb(' + p.color + ')';
        ctx.shadowColor = 'rgba(255, 215, 90, 0.9)';
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.quadraticCurveTo(0, 0, 0, r);
        ctx.quadraticCurveTo(0, 0, -r, 0);
        ctx.quadraticCurveTo(0, 0, 0, -r);
        ctx.fill();
        ctx.restore();
      } else if (p.shape === 'text') {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = 'bold ' + p.size + 'px "Comic Sans MS", "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(43,32,8,0.9)';
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = 'rgb(' + p.color + ')';
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
      } else {
        ctx.globalAlpha = a * 0.85;
        ctx.fillStyle = 'rgb(' + p.color + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - a * 0.6), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    /* karts triés par y pour un léger effet de profondeur */
    const draw = Engine.karts.slice().sort(function (a, b) { return a.y - b.y; });
    for (const k of draw) this.drawKart(ctx, k);

    ctx.restore();
  },

  /* Chevrons de boost : pulsation + vague lumineuse qui balaie les 3 chevrons */
  drawBoostChevrons: function (ctx, track, t) {
    const theme = track.def.theme;
    const colA = theme.boostA || '#FFE066';
    const colB = theme.boostB || '#FF9F2E';
    for (const b of track.boosts) {
      const pulse = 0.86 + 0.18 * Math.sin(t * 5.2 + b.s * 0.011);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.scale(pulse, pulse);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = colB;
      ctx.shadowBlur = 13;
      for (let c = -1; c <= 1; c++) {
        const wave = 0.5 + 0.5 * Math.sin(t * 6 - c * 1.05 + b.s * 0.011);
        ctx.globalAlpha = 0.45 + 0.55 * wave;
        ctx.strokeStyle = c === 0 ? colA : colB;
        ctx.lineWidth = 10 - Math.abs(c) * 2;
        ctx.beginPath();
        ctx.moveTo(-10 + c * 24, -20);
        ctx.lineTo(8 + c * 24, 0);
        ctx.lineTo(-10 + c * 24, 20);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  },

  draw: function () {
    if (!this.ctx || !Engine.track) return;
    const ctx = this.ctx;
    /* fond (visible si la caméra sort du monde) */
    ctx.fillStyle = Engine.track.def.theme.bg;
    ctx.fillRect(0, 0, this.vw, this.vh);
    const two = Engine.config && Engine.config.joueurs === 2 && Engine.karts[1] && Engine.karts[1].isPlayer;
    if (!two) {
      this.renderWorld(ctx, Engine.camera, { x: 0, y: 0, w: this.vw, h: this.vh });
      return;
    }
    /* split-screen haut/bas : chaque joueur voit sa moitié, zoom réduit */
    const half = Math.floor(this.vh / 2);
    const zoomFix = half < 480 ? 0.72 : 1;   // viewport < 480px → zoom réduit
    const cam1 = { x: Engine.camera.x, y: Engine.camera.y, zoom: Engine.camera.zoom * zoomFix };
    const cam2 = { x: Engine.camera2.x, y: Engine.camera2.y, zoom: Engine.camera2.zoom * zoomFix };
    this.renderWorld(ctx, cam1, { x: 0, y: 0, w: this.vw, h: half });
    this.renderWorld(ctx, cam2, { x: 0, y: half, w: this.vw, h: this.vh - half });
    /* séparateur central */
    ctx.fillStyle = 'rgba(20,16,40,0.85)';
    ctx.fillRect(0, half - 2, this.vw, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillRect(0, half - 1, this.vw, 1);
  },

  drawKart: function (ctx, k) {
    /* ombre portée : halo doux + contact plus dense (double ellipse) */
    ctx.save();
    ctx.fillStyle = 'rgba(30, 30, 55, 0.18)';
    ctx.beginPath(); ctx.ellipse(k.x + 4, k.y + 7, 25, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(30, 30, 55, 0.32)';
    ctx.beginPath(); ctx.ellipse(k.x + 3, k.y + 6, 19, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.rotate(k.angle);

    /* anneau du joueur (repère visuel) */
    if (k.isPlayer) {
      ctx.save();
      ctx.rotate(-k.angle);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 7]);
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    /* flammes de boost / mini-turbo */
    if (k.miniTurbo > 0 || k.boostTime > 0) {
      const fl = 14 + Math.random() * 12;
      ctx.fillStyle = k.boostTime > 0 ? '#FFB03A' : '#FF7A3C';
      ctx.beginPath();
      ctx.moveTo(-19, -6); ctx.lineTo(-19 - fl, 0); ctx.lineTo(-19, 6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFE066';
      ctx.beginPath();
      ctx.moveTo(-19, -3); ctx.lineTo(-19 - fl * 0.6, 0); ctx.lineTo(-19, 3);
      ctx.closePath(); ctx.fill();
    }

    /* roues */
    ctx.fillStyle = '#2B2B33';
    const wr = [[-13, -13], [9, -13], [-13, 7], [9, 7]];
    for (const wpos of wr) {
      ctx.beginPath(); ctx.roundRect(wpos[0], wpos[1], 12, 6, 3); ctx.fill();
    }
    /* carrosserie */
    ctx.fillStyle = k.color;
    ctx.strokeStyle = k.dark;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-20, -11, 40, 22, 9); ctx.fill(); ctx.stroke();
    /* museau */
    ctx.fillStyle = k.dark;
    ctx.beginPath(); ctx.roundRect(12, -7, 7, 14, 3); ctx.fill();
    /* cockpit */
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.roundRect(-6, -8, 14, 16, 6); ctx.fill();
    /* yeux kawaii sur le cockpit */
    ctx.fillStyle = '#2B2B33';
    ctx.beginPath(); ctx.arc(2, -3.5, 1.9, 0, Math.PI * 2); ctx.arc(2, 3.5, 1.9, 0, Math.PI * 2); ctx.fill();

    this.drawAccessory(ctx, k.charId || 'mimi', k.dark);
    ctx.restore();
  },

  drawAccessory: function (ctx, charId, dark) {
    ctx.fillStyle = dark;
    ctx.strokeStyle = dark;
    switch (charId) {
      case 'mimi': /* nœud */
        ctx.beginPath();
        ctx.moveTo(-14, 0); ctx.lineTo(-23, -8); ctx.lineTo(-23, 8); ctx.closePath();
        ctx.moveTo(-14, 0); ctx.lineTo(-5, -8); ctx.lineTo(-5, 8); ctx.closePath();
        ctx.fill();
        ctx.beginPath(); ctx.arc(-14, 0, 3.4, 0, Math.PI * 2); ctx.fill();
        break;
      case 'pixel': /* éclair */
        ctx.fillStyle = '#FFE93C';
        ctx.beginPath();
        ctx.moveTo(-16, -2); ctx.lineTo(-9, -8); ctx.lineTo(-11, -1); ctx.lineTo(-5, -2); ctx.lineTo(-13, 9); ctx.lineTo(-11, 1); ctx.lineTo(-17, 2);
        ctx.closePath(); ctx.fill();
        break;
      case 'boubou': /* oreilles d'ourson */
        ctx.beginPath(); ctx.arc(-10, -9, 4.6, 0, Math.PI * 2); ctx.arc(-10, 9, 4.6, 0, Math.PI * 2); ctx.fill();
        break;
      case 'ziggy': /* crête de poussin */
        ctx.beginPath();
        ctx.moveTo(-8, -5); ctx.lineTo(-5, -11); ctx.lineTo(-2, -5);
        ctx.moveTo(-8, 5); ctx.lineTo(-5, 11); ctx.lineTo(-2, 5);
        ctx.fill();
        break;
      case 'louna': /* étoile */
        ctx.fillStyle = '#FFF3A0';
        ctx.save(); ctx.translate(-12, 0);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
          const a2 = a + Math.PI / 5;
          ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
          ctx.lineTo(Math.cos(a2) * 3.1, Math.sin(a2) * 3.1);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      case 'coco': /* feuille de menthe */
        ctx.fillStyle = '#3E9E6E';
        ctx.save(); ctx.translate(-13, 0); ctx.rotate(0.6);
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        break;
    }
  }
};
