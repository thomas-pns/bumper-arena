# 🚗 Bumper Arena - Vehicle Combat Edition

Jeu web 3D compétitif 1v1 : deux véhicules armés se tirent dessus dans des arènes fermées avec obstacles.

## 🎮 Concept

- **Deux véhicules** se battent dans une arène fermée avec murs et couvertures.
- **Combat jusqu'à la victoire** : premier à 3 éliminations gagne.
- **Barre de vie réaliste** : les dégâts s'accumulent, le K.O. réinitialise la santé.
- **Trois cartes** avec agencements de murs différents.
- **Entièrement jouable au clavier** : aucune souris requise pendant le match.
- **Mobile/Tablette** : joystick virtuel et bouton de tir tactiles.

---

## 🕹️ Contrôles

### 🖥️ **Clavier (Desktop)**
| Action | Touches |
|--------|---------|
| **Haut** | `W` ou `Z` |
| **Bas** | `S` |
| **Gauche** | `A` ou `Q` |
| **Droite** | `D` |
| **Tirer** | `Espace` |

### 📱 **Tactile (Mobile/Tablette)**
- **Joystick gauche** : gestion du déplacement en 4 directions
- **Gros bouton droit** : tirer
- Les boutons apparaissent automatiquement sur écrans tactiles (< 768px)

---

## 🚀 Installation et Lancement

### Prérequis
- Node.js (LTS)
- npm ou yarn

### Étapes
```bash
# 1. Cloner le dépôt
git clone https://github.com/thomas-pns/bumper-arena.git
cd bumper-arena

# 2. Récupérer la branche vehicle-arena
git checkout vehicle-arena

# 3. Installer les dépendances
npm install

# 4. Lancer en développement
npm run dev

# 5. Ouvrir dans le navigateur
# http://localhost:5173
```

### Build pour production
```bash
npm run build
```

---

## 🎨 Améliorations Principales

### 1️⃣ **Physique Fluide**
✅ Accélération/décélération progressive (pas de vitesse instantanée)
✅ Friction réaliste avec système de damping
✅ Glissement le long des murs au lieu de blocage net
✅ Rotation lissée du véhicule vers sa direction
✅ Collisions élastiques entre véhicules

**Fichier** : `shared/physics.js`

### 2️⃣ **Rendu 3D Enrichi**
✅ Éclairage avancé :
  - Lumière hémisphérique douce
  - Soleil directionnel avec ombres portées
  - Lumière ambiante pour profondeur
✅ Matériaux toon stylisés (metalness, roughness)
✅ Véhicules détaillés : corps, tourelle, canon, roues, yeux
✅ Particules de tir et d'impact
✅ Fond en dégradé avec brume (fog) pour profondeur
✅ Texture du sol quadrillée

**Fichier** : `client/src/main.js` (classe `Vehicle` et fonctions de rendu)

### 3️⃣ **Responsive Mobile/Tablette**
✅ Joystick virtuel adaptatif (s'affiche seulement sur écran tactile)
✅ Bouton de tir tactile grand et facile à toucher
✅ Zones de sécurité iPhone notch (`safe-area-inset`)
✅ Media queries optimisées (portrait/paysage, petit/grand écran)
✅ Textes redimensionnés avec `clamp()` (min, préféré, max)
✅ Pixels ratio adapté aux écrans haute densité
✅ Canvas responsive via `requestAnimationFrame` + resize handler

**Fichier** : `client/src/style.css`

---

## 📊 Architecture

```
bumper-arena/
├── client/
│   ├── src/
│   │   ├── main.js          (boucle principale, rendus, joystick)
│   │   ├── maps.js          (définition des cartes)
│   │   ├── style.css        (UI + responsive)
│   │   └── index.html
│   └── ...
├── shared/
│   ├── physics.js           (moteur physique partagé)
│   └── rules.js             (règles du jeu)
├── vite.config.js
├── package.json
└── README.md
```

### Flux de Données
1. **Input** → Clavier ou joystick tactile
2. **Physique** → `updateVehiclePhysics()` + collisions
3. **État du jeu** → scores, santé, projectiles
4. **Rendu** → Three.js camera + meshes
5. **Loop** → `requestAnimationFrame` ≈ 60 FPS

---

## 🎯 Gameplay

### Objets

| Élément | Descriptif |
|---------|-----------|
| **Véhicule** | Boîte 3D avec tourelle, canon et roues |
| **Projectile** | Sphère orangée qui inflige 10 dégâts |
| **Mur** | Obstacle bloquant (gris/marron) |
| **Sol** | Plateforme verte quadrillée |

### Mécanique

1. **Déplacement** : 4 directions fluides avec friction
2. **Tir** : visée automatique vers l'avant du véhicule
3. **Dégâts** : chaque impact enlève 10 PV (max 100)
4. **K.O.** : à 0 PV, réapparition après 1 sec, score +1
5. **Victoire** : premier à 3 éliminations gagne

### Cartes (3)

- **Carte 1** : Arène simple, murs centraux
- **Carte 2** : Labyrinth avec couloirs et couvertures
- **Carte 3** : Multiple îlots et obstacles circulaires

---

## 🐛 Optimisations Perf

- **Pixel ratio limité** à 2 (évite surcharge GPU)
- **Ombres activées** mais optimisées (PCFShadowMap)
- **Fog** pour réduire la portée de rendu
- **WebGL toneMappingExposure** ajusté pour performance
- **Interpolation caméra** lissée (lerp factor 0.08)
- **Particules limitées** et supprimées après expiration

**FPS cible** : 60 FPS sur laptop moyen

---

## 📱 Support Mobile

| Appareil | Statut |
|----------|--------|
| iOS (Safari) | ✅ Joystick + bouton de tir |
| Android (Chrome) | ✅ Joystick + bouton de tir |
| iPad (Landscape) | ✅ Clavier USB + souris optionnelle |
| Notch/Encoche | ✅ `safe-area-inset` appliqué |

### Notes
- Le joystick n'apparaît QUE sur écrans tactiles (< 768px)
- Sur desktop, clavier uniquement (plus rapide)
- Le canvas s'adapte à la rotation écran et au redimensionnement

---

## 🔧 Dépendances

```json
{
  "dependencies": {
    "three": "latest"
  },
  "devDependencies": {
    "vite": "latest"
  }
}
```

---

## 🎵 Sons et Musique

🔊 **À ajouter dans les prochaines étapes**
- Effets : tir, impact, K.O., réapparition
- Musique d'ambiance (boucle)
- Réglages mute/volume (localStorage)

---

## 🌐 Modes de Jeu (Roadmap)

| Mode | État | Déscription |
|------|------|-----------|
| **Local** | ✅ Fait | 2 joueurs, 1 clavier |
| **Bot** | 🔜 Prévu | IA 3 niveaux |
| **En ligne** | 🔜 Prévu | Multijoueur WebSocket + Matchmaking |
| **Classement** | 🔜 Prévu | Système ELO + leaderboard |

---

## 📝 Notes de Développement

### Physique
- Les murs sont définis comme segments `[x1, y1, x2, y2]` dans `maps.js`
- Collisions résolues par projection du véhicule perpendiculaire + friction de glissement
- Vitesse maximale limitée à 15 m/s

### Rendu
- Caméra suit la moyenne des deux véhicules (lerp lissé)
- Meshes actualisés à chaque frame
- Ombres portées en temps réel (peut être expensive sur mobile)

### Mobile
- `clamp(min, préféré, max)` pour scalabilité
- `safe-area-inset` pour notch iPhone/Android
- Touch events non-bubbling (stop propagation)
- Pixel ratio vérifié et limité

---

## 🤝 Contribuer

Les contributions sont bienvenues ! Ouvre une issue ou propose une PR.

---

## 📜 Licence

Projet étudiant, open-source.  
Three.js : [MIT](https://github.com/mrdoob/three.js/blob/dev/LICENSE)  
Vite : [MIT](https://github.com/vitejs/vite/blob/main/LICENSE)

---

## 🎓 Crédits

**Développement** : Branche `vehicle-arena`  
**Concept** : Arènes fermées, combat véhicules, responsive tactile

---

**Prêt à jouer ?** → `npm run dev` 🚗💨
