/* ========================================
   BOMBERMAN SS — Main Entry Point
   Initialization, loading, game start
   ======================================== */

(function() {
    'use strict';

    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');
    const loadingScreen = document.getElementById('loading-screen');
    const gameContainer = document.getElementById('game-container');

    function updateLoading(progress, text) {
        if (loadingBar) loadingBar.style.width = progress + '%';
        if (loadingText) loadingText.textContent = text;
    }

    async function init() {
        try {
            updateLoading(5, 'Initialisation du moteur...');
            B.Engine.init();
            B.Renderer.init();

            updateLoading(15, 'Configuration des entrées...');
            B.Input.init();

            updateLoading(20, 'Système audio...');
            B.Audio.init();

            updateLoading(30, 'Génération des sprites...');
            await delay(100);

            updateLoading(50, 'Chargement des données...');
            await delay(100);

            updateLoading(65, 'Initialisation des menus...');
            B.Menus.init();
            B.Game.init();

            updateLoading(80, 'Démarrage du moteur...');
            B.Engine.start();

            updateLoading(90, 'Presque prêt...');
            await delay(300);

            updateLoading(100, 'C\'est parti!');
            await delay(400);

            // Show game
            loadingScreen.classList.add('hidden');
            gameContainer.classList.add('active');

            // Ensure the retro font is loaded before showing menus
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            // Show title menu
            B.Menus.show('title');

            // Resume audio on first interaction
            const resumeAudio = () => {
                B.Audio.resume();
                document.removeEventListener('keydown', resumeAudio);
                document.removeEventListener('click', resumeAudio);
            };
            document.addEventListener('keydown', resumeAudio);
            document.addEventListener('click', resumeAudio);

            // Default: hide scanlines
            document.getElementById('scanlines').style.display = 'none';

        } catch (e) {
            console.error('Initialization error:', e);
            updateLoading(0, 'Erreur: ' + e.message);
        }
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Prevent context menu
    window.addEventListener('contextmenu', e => e.preventDefault());

    // Auto-pause on window blur
    window.addEventListener('blur', () => {
        if (B.Game.state === B.C.STATE.PLAYING || B.Game.state === B.C.STATE.COUNTDOWN) {
            B.Game.togglePause();
        }
    });

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();