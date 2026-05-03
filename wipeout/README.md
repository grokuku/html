# 🚀 WIPEOUT Clone - HTML5

Un clone complet du jeu Wipeout en 3D utilisant Three.js, avec sons procéduraux et musique électronique.

## Fonctionnalités

### 🏎️ Course
- **Piste 3D procédurale** avec virages, bosses, tunnels et sections rapides
- **6 vaisseaux** (1 joueur + 5 IA) avec modèles 3D générés
- **3 tours** par course
- **3 niveaux de difficulté**: Novice, Venom, Raptor
- **Physique anti-gravité** avec hover et inclinaison dans les virages

### ⚔️ Armes & Bonus
- **Missiles** - projectile à tête chercheuse
- **Mines** - posées derrière le vaisseau
- **Éclairs** - tir multiple
- **Turbo** - boost de vitesse
- **Bouclier** - protection temporaire
- **Pads de boost** (vert) sur la piste
- **Pads d'armes** (orange) sur la piste

### 🎵 Audio
- **Musique électronique** procédurale (kick, hi-hat, basse, arpèges, pad)
- **Sons moteur** réactifs à la vitesse
- **Effets sonores**: boost, missile, explosion, bouclier, collision, tour complété
- **Compte à rebours** sonore

### 🎨 Visuels
- **Three.js** avec post-processing Bloom
- **Piste avec bordures néon** lumineuses
- **Bâtiments** décoratifs avec lumières
- **Ciel étoilé** avec nébuleuse
- **Effets de particules** (trails moteur, explosions, lignes de vitesse)
- **HUD futuriste** avec minimap

### 🕹️ Contrôles
| Touche | Action |
|--------|--------|
| ↑ / W | Accélérer |
| ↓ / S | Freiner |
| ← / A | Tourner à gauche |
| → / D | Tourner à droite |
| Espace | Boost (quand chargé) |
| X | Tirer l'arme |
| C | Activer le bouclier |

## Installation & Lancement

### Méthode 1: Python
```bash
cd Wipeout
python3 -m http.server 8080
# Ouvrir http://localhost:8080
```

### Méthode 2: Node.js
```bash
npx http-server Wipeout -p 8080 -c-1
# Ouvrir http://localhost:8080
```

### Méthode 3: Script inclus
```bash
cd Wipeout
./serve.sh 8080
```

⚠️ **Important**: Le jeu doit être servi via HTTP (pas file://) pour que les modules ES fonctionnent.

## Structure des fichiers

```
Wipeout/
├── index.html          # Page principale HTML
├── serve.sh            # Script de lancement serveur
├── css/
│   └── style.css       # Styles HUD, menu, résultats
└── js/
    ├── main.js         # Point d'entrée
    ├── game.js         # Boucle principale, état du jeu
    ├── track.js        # Génération de piste 3D
    ├── ship.js         # Physique & modèle des vaisseaux
    ├── ai.js           # Contrôleurs IA
    ├── weapons.js      # Système d'armes
    ├── effects.js      # Particules & effets visuels
    ├── audio.js        # Musique & sons procéduraux
    ├── hud.js          # Interface tête haute
    └── constants.js     # Configuration du jeu
```

## Technologies

- **Three.js** (r160) - Rendu 3D via CDN
- **Web Audio API** - Sons et musique procéduraux
- **ES Modules** - Architecture modulaire
- **Post-processing** - Bloom (UnrealBloomPass)

## Navigateurs supportés

- Chrome 89+ ✅
- Firefox 108+ ✅
- Safari 16.4+ ✅
- Edge 89+ ✅

## Performances

Le jeu est optimisé pour les navigateurs modernes. Si vous rencontrez des ralentissements:
- Réduisez la taille du navigateur
- Fermez les autres onglets
- Désactivez le bloom en modifiant `this.composer = null;` dans game.js