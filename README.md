# Bumper Arena — duel de véhicules

Prototype arcade 3D jouable en local : deux pilotes s'affrontent dans une arène fermée, se déplacent librement dans les quatre directions et tirent dans la direction de leur véhicule. Les obstacles bloquent les voitures et les projectiles et servent de couverture.

## Jouer en local

Prérequis : Node.js LTS et npm.

```bash
npm install
npm run dev
```

Ouvrir l'URL Vite affichée dans le terminal. Choisir une carte, puis lancer le duel. Le premier pilote à marquer **3 éliminations** gagne. Chaque pilote a 100 points de vie ; un tir inflige 20 dégâts. Après une élimination, le joueur réapparaît avec sa vie restaurée. Les manches n'ont pas de limite de temps.

### Contrôles

- Pilote 1 : ZQSD ou WASD pour se déplacer, Espace pour tirer.
- Pilote 2 : flèches pour se déplacer, Entrée pour tirer.
- La direction du véhicule suit le déplacement ; le tir part vers l'avant.

## Cartes

- **Néon District** : ruelles, couvertures latérales et obstacle central.
- **Canyon Rouge** : arène ouverte ponctuée de rochers et de barrières.
- **Usine Zéro** : couloirs industriels et blocs centraux.

Les dimensions, matériaux et obstacles sont définis dans `shared/rules.js`. Le rendu est construit avec Three.js ; les collisions locales sont traitées dans `client/src/main.js`.

## État du projet

Cette branche remplace l'ancien prototype de bumper par une première version locale jouable. Le combat en réseau, comptes, bot, bonus et classement ne sont pas encore implémentés. Les menus et le HUD sont déjà adaptés au nouveau thème. Les sons et effets restent à ajouter.

## Dépendances et lancement

Vite sert le client et Three.js fournit le rendu 3D. Les scripts npm sont dans `package.json`. Les polices Barlow Condensed et Inter sont chargées depuis Google Fonts ; en cas d'absence de connexion, une police système de remplacement est utilisée.
