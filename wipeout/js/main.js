// Main entry point
import { Game } from './game.js';

// Show loading progress
const progressBar = document.getElementById('loadingProgress');
const loadingScreen = document.getElementById('loadingScreen');

function updateProgress(pct) {
    if (progressBar) {
        progressBar.style.width = pct + '%';
    }
}

// Wait for DOM and fonts
updateProgress(10);

window.addEventListener('DOMContentLoaded', () => {
    updateProgress(30);

    // Wait for fonts to load
    document.fonts.ready.then(() => {
        updateProgress(50);

        // Small delay to ensure everything is ready
        setTimeout(() => {
            updateProgress(80);

            try {
                const game = new Game();
                updateProgress(100);

                // Hide loading screen
                setTimeout(() => {
                    if (loadingScreen) {
                        loadingScreen.classList.add('hidden');
                        setTimeout(() => loadingScreen.remove(), 600);
                    }
                }, 500);
            } catch (e) {
                console.error('Failed to initialize game:', e);
                if (loadingScreen) {
                    loadingScreen.querySelector('.loading-text').textContent =
                        'Erreur de chargement. Rafraîchissez la page.';
                }
            }
        }, 200);
    });
});

// Prevent default on arrow keys to avoid scrolling
window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

console.log('%c🚀 WIPEOUT Clone - HTML5', 'color: #00ccff; font-size: 20px; font-weight: bold; text-shadow: 0 0 10px rgba(0,200,255,0.5)');
console.log('%cAnti-Gravity Racing', 'color: #8888aa; font-size: 14px;');