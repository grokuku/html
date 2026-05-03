# Bomberman SS — Saturn Remake

Un remake complet de Bomberman SS (Sega Saturn) en HTML5/Canvas.

## Comment jouer

Ouvrez `index.html` dans un navigateur moderne (Chrome, Firefox, Edge).

### Contrôles

| Action | Touche (Joueur 1) |
|--------|-------------------|
| Déplacer | Flèches directionnelles |
| Poser bombe | Espace |
| Coup de pied | Ctrl gauche |
| Coup de poing | Shift gauche |
| Pause | Échap |
| Menu | Flèches + Entrée |

### Modes de jeu

1. **Normal Game** — Mode solo : 5 mondes de 8 stages + boss
2. **Battle Game** — Bataille : 1-10 joueurs (1 humain + IA)
3. **Master Game** — Survie : vagues d'ennemis de plus en plus difficiles

### 10 Personnages

White Bomber, Black Bomber, Red Bomber, Blue Bomber, Green Bomber, Pretty Bomber, Metal Bomber, Golden Bomber, Honey, Kotetsu

Chacun a des stats différents (Bombes, Feu, Vitesse).

### 10 Terrains de bataille

Classic, Forêt Enchantée, Glacier Éternel, Volcan Ardent, Désert Scintillant, Station Spatiale, Usine Automatisée, Château Fantôme, Plage Paradisiaque, Égouts Maudits

Chaque terrain a un danger environnemental unique !

### 13 Power-ups

- B+ (Bombes), F+ (Feu), S (Vitesse), F! (Feu Max), K (Kick), P (Punch)
- R (Remote), W (Wall Pass), BP (Bomb Pass), V (Vest/Invincible)
- ☠ (Skull/Maladie), T (Timer), C+ (Cross Bomb)

### Architecture des fichiers

```
├── index.html          — Point d'entrée
├── css/
│   └── style.css       — Styles CSS (menus, HUD, overlays)
└── js/
    ├── engine.js       — Boucle de jeu, constantes, utilitaires
    ├── input.js        — Gestion clavier/gamepad
    ├── audio.js        — Effets sonores Web Audio + musique chiptune
    ├── sprites.js      — Dessin pixel-art (personnages, bombes, tiles...)
    ├── data.js         — Données de jeu (persos, terrains, ennemis, boss...)
    ├── entities.js     — Classes Player, Bomb, Explosion, Enemy, PowerUp, Boss
    ├── game.js         — Logique de jeu, états, collisions, modes
    ├── renderer.js     — Pipeline de rendu Canvas 2D
    ├── menus.js        — Système de menus (titre, sélection, config...)
    └── main.js         — Initialisation, chargement, démarrage
```

### Technologies

- HTML5 Canvas pour le rendu
- Web Audio API pour le son / musique
- Classes ES6 pour les entités
- Design pixel-art généré procéduralement (pas d'images externes)
- Police "Press Start 2P" (Google Fonts)