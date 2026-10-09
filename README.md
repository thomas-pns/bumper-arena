# Bumper Arena

Jeu d'arène arcade 3D cartoon en Three.js. Le dépôt contient une première version jouable en local contre un bot ; aucun compte ni serveur n'est requis pour cette version.

## Lancer en local

Prérequis : Node.js 20 ou supérieur.

```bash
npm install
npm run dev
```

Ouvre l'adresse Vite indiquée dans le terminal. Commandes : WASD ou flèches pour conduire, Espace pour le dash, R pour recommencer. Évite le bot et ramasse les étoiles.

## Build

```bash
npm run build
npm run preview
```

## Structure

- `client/src/` : rendu Three.js, boucle de jeu et styles.
- `shared/` : physique et règles destinées à être partagées avec un futur serveur.

## État

Le mode local constitue la base jouable. Le multijoueur en ligne, comptes, ELO, chat, persistance PostgreSQL, tests automatisés et configuration de déploiement Render ne sont pas encore implémentés. Les seules dépendances de rendu sont Three.js et Vite ; aucune ressource graphique tierce n'est utilisée.
