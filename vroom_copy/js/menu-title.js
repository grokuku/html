/* ============================================================
   VROOMIIIES — menu-title.js
   Écran titre (lot 3) : fond animé — caméra qui survole le
   circuit Prairie (caméra qui avance le long de la ligne,
   scintillement d'étoiles), panneau logo + boutons
   Championnat / Course libre / Son.
   ============================================================ */
'use strict';

const MenuTitle = (function () {
  const LETTER_COLORS = ['#FF6FAE', '#FFB03A', '#5FB4FF', '#7FE0BE', '#C79BFF', '#FF8F8F', '#8AD6FF', '#FFD93D', '#9BE15D', '#FF9FD4'];

  let bgTrack = null;
  let stars = null;
  let bgStarted = false;

  function buildLogo() {
    const word = 'VROOMIIIES';
    let html = '';
    for (let i = 0; i < word.length; i++) {
      html += '<span style="color:' + LETTER_COLORS[i % LETTER_COLORS.length] + '">' + word[i] + '</span>';
    }
    return html;
  }

  function refreshSoundButton(btn) {
    const opts = Storage.loadOptions();
    btn.textContent = opts.son ? '🔊 Son : oui' : '🔇 Son : non';
    btn.setAttribute('aria-pressed', opts.son ? 'true' : 'false');
  }

  /* ---------- fond animé : survol de la Prairie ---------- */
  function startBackground() {
    if (bgStarted) return;
    bgStarted = true;
    const cv = document.getElementById('menuBg');
    if (!cv) return;
    try {
      bgTrack = buildTrack(TRACKS.prairie);
    } catch (e) {
      console.warn('[title] fond animé indisponible', e);
      return;
    }
    stars = [];
    for (let i = 0; i < 120; i++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.62, r: 0.6 + Math.random() * 1.7, ph: Math.random() * Math.PI * 2, sp: 0.8 + Math.random() * 1.6 });
    }
    const ctx = cv.getContext('2d');

    const frame = function (now) {
      requestAnimationFrame(frame);
      const screen = document.getElementById('screen-title');
      if (!screen || !screen.classList.contains('active')) return; // économie : rien à faire
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth, h = window.innerHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* caméra qui avance le long du circuit, zoom doux qui respire */
      const t = now / 1000;
      const s = (t * 150) % bgTrack.totalLen;
      const p = bgTrack.pointAt(s);
      const zoom = clamp(Math.min(w, h) / 620, 0.85, 1.35) * (1 + 0.05 * Math.sin(t * 0.5));
      const cam = { x: p.x, y: p.y, zoom: zoom };
      ctx.fillStyle = bgTrack.def.theme.bg;
      ctx.fillRect(0, 0, w, h);
      Render.renderWorld(ctx, cam, { x: 0, y: 0, w: w, h: h }, bgTrack);

      /* voile doux pour la lisibilité du panneau */
      const g = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.25, w / 2, h * 0.5, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(43,35,80,0)');
      g.addColorStop(1, 'rgba(43,35,80,0.42)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      /* étoiles scintillantes (haut du ciel) */
      for (const st of stars) {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph));
        ctx.globalAlpha = a;
        ctx.fillStyle = '#FFF9D8';
        ctx.beginPath();
        ctx.arc(st.x * w, st.y * h, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    requestAnimationFrame(frame);
  }

  function init() {
    const logo = document.getElementById('logoLetters');
    if (logo) logo.innerHTML = buildLogo();

    const btnCup = document.getElementById('btnChampionship');
    if (btnCup) btnCup.addEventListener('click', function () {
      AudioSys.init(); AudioSys.sfx.click();
      if (typeof MenuCup !== 'undefined') MenuCup.open();
    });

    const btnFree = document.getElementById('btnFreeRace');
    if (btnFree) btnFree.addEventListener('click', function () {
      AudioSys.init(); AudioSys.sfx.click();
      if (typeof MenuLibre !== 'undefined') MenuLibre.open();
    });

    const btnSound = document.getElementById('btnSound');
    if (btnSound) {
      refreshSoundButton(btnSound);
      btnSound.addEventListener('click', function () {
        const opts = Storage.loadOptions();
        opts.son = !opts.son;
        Storage.saveOptions(opts);
        AudioSys.setEnabled(opts.son);
        refreshSoundButton(btnSound);
        AudioSys.sfx.click();
      });
    }

    startBackground();
  }

  return { init: init, refreshSoundButton: refreshSoundButton };
})();
