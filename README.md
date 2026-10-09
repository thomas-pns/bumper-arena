# 🚗 VEHICLE ARENA

Un jeu web 3D arcade compétitif où deux véhicules cartoondesques se tirent dessus dans une arène fermée.

## 🎮 Gameplay

- **Mode Bot** : Jouer contre une IA (3 niveaux de difficulté)
- **Mode Salon Privé** : Jouer en ligne contre un autre joueur (en développement)
- **Caméra 3ème personne** : Vue dynamique suivant le véhicule du joueur
- **Système de manches** : Premier à 3 points gagne le match
- **Arènes multiples** : 3 cartes avec murs et couvertures différentes

## 🕹️ Contrôles

### Clavier (Bureau)
- **Z / W** : Avancer
- **S** : Reculer
- **Q / A** : Aller à gauche
- **D** : Aller à droite
- **ESPACE** : Tirer

### Tactile (Téléphone / Tablette)
- **Joystick gauche** : Déplacement 4 directions
- **Bouton de tir (droite)** : Tirer

## 📋 Modifications Récentes

### ✅ Caméra 3ème Personne
- Positionée derrière et au-dessus du véhicule
- Suit dynamiquement le joueur
- Meilleure perception de la profondeur

### ✅ Suppression du Mode Local 2 Joueurs
- Plus de "Joueur 1 vs Joueur 2" sur un clavier
- Focus sur le Bot et le Multijoueur

### ✅ Mode Bot avec IA
- **Facile** : Temps de réaction lent, tirs peu précis
- **Moyen** : Équilibre bon / mauvais
- **Difficile** : IA quasi-parfaite, réactions rapides

### ✅ Contrôles Tactiles Améliorés
- Joystick circulaire 4 directions
- Bouton de tir circulaire large
- Positionnés en bas de l'écran
- Responsif pour téléphones ET tablettes

### ✅ Design Responsif
- Adaptation automatique à tous les écrans
- Menus agrandis sur mobile
- Boutons tactiles bien espacés
- Caméra figée sur desktop

## 🏗️ Architecture

```
/client
  /src
    main.js       → Logique de jeu + 3D Three.js
    style.css     → Styles + responsive design
  index.html
/server
  (en développement)
/shared
  (logique partagée à venir)
package.json
```

## 🚀 Installation & Lancement

### Pré-requis
- Node.js >= 16
- npm ou yarn

### Développement Local

```bash
# Cloner la branche
git clone -b vehicle-arena https://github.com/thomas-pns/bumper-arena.git
cd bumper-arena

# Installer dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Ouvre `http://localhost:5173` dans le navigateur.

## 📦 Build Production

```bash
npm run build
```

## 🎨 Caractéristiques Techniques

- **Moteur 3D** : Three.js
- **Physique** : Maison (collisions simple, mouvements fluides)
- **Rendu** : MeshStandardMaterial avec ombres
- **Caméra** : Perspective 3ème personne avec lerp
- **Responsive** : Adapté mobile/tablette/desktop

## 🔄 Prochaines Étapes

1. **Mode Salon Privé** (WebSocket)
   - Code à 5 caractères pour rejoindre
   - Synchronisation temps réel serveur

2. **Bonus & Power-ups**
   - Bouclier temporaire
   - Tir puissant
   - Réparation
   - Accélération

3. **Système de Classement**
   - Comptes utilisateurs
   - ELO ranking
   - Top 50 global

4. **Améliorations Visuelles**
   - Particules à l'impact
   - Effets visuels des tirs
   - Meilleure détection des obstacles

## 🐛 Problèmes Connus

- Aucun pour l'instant (rapporter les bugs sur GitHub Issues)

## 📝 Licences des Assets

- **Three.js** : MIT
- **Fredoka Font** : Open Font License

## 👤 Auteur

Thomas Chassanis Pons (thomas-pns)