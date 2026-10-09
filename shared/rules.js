// Règles communes du duel. La simulation locale et une future version réseau
// peuvent s'appuyer sur ces données sans dépendre du rendu Three.js.
export const WINNING_SCORE = 3;
export const PLAYER_HEALTH = 100;
export const BULLET_DAMAGE = 20;
export const SHOT_COOLDOWN = 0.34;

// Dimensions en unités monde et obstacles rectangulaires [x, z, largeur, profondeur, hauteur].
export const ARENAS = [
  {
    id: 'neon-district', name: 'Néon District', width: 20, depth: 16,
    floor: 0x202b40, wall: 0x303b53, cover: 0x485878, accent: 0x36d9f4,
    obstacles: [[-4, -2.7, 3.4, 1.1, 1.45], [4, 2.7, 3.4, 1.1, 1.45], [-4.7, 3.3, 1.1, 2.8, 1.3], [4.7, -3.3, 1.1, 2.8, 1.3], [0, 0, 1.6, 1.6, 1.6]],
  },
  {
    id: 'red-canyon', name: 'Canyon Rouge', width: 22, depth: 16,
    floor: 0x382a32, wall: 0x60404a, cover: 0x96604e, accent: 0xff9868,
    obstacles: [[-5.1, -3, 2.5, 1.4, 1.9], [5.1, 3, 2.5, 1.4, 1.9], [-3.7, 2.5, 1.25, 3.6, 1.35], [3.7, -2.5, 1.25, 3.6, 1.35], [0, 0, 2.4, 1.1, 1.25]],
  },
  {
    id: 'zero-factory', name: 'Usine Zéro', width: 20, depth: 18,
    floor: 0x25333a, wall: 0x34494e, cover: 0x4c6866, accent: 0x70efbd,
    obstacles: [[-5.4, 0, 1.1, 5.1, 1.65], [5.4, 0, 1.1, 5.1, 1.65], [-2.3, -4, 3.4, 1.1, 1.35], [2.3, 4, 3.4, 1.1, 1.35], [0, 0, 1.2, 1.2, 1.8]],
  },
];

export function createPlayerState() {
  return { health: PLAYER_HEALTH, vx: 0, vz: 0, cooldown: 0, respawn: 0 };
}

export function createMatch(arenaIndex = 0) {
  const safeIndex = Number.isInteger(arenaIndex) ? Math.max(0, Math.min(ARENAS.length - 1, arenaIndex)) : 0;
  return { arenaIndex: safeIndex, scores: [0, 0], players: [createPlayerState(), createPlayerState()], finished: false };
}

export function damagePlayer(match, playerIndex, amount = BULLET_DAMAGE) {
  if (!match || match.finished || !match.players[playerIndex] || !Number.isFinite(amount) || amount <= 0) return 0;
  const player = match.players[playerIndex];
  if (player.respawn > 0) return player.health;
  player.health = Math.max(0, player.health - amount);
  return player.health;
}

// Avance les chronomètres partagés. Le match n'a pas de limite de temps.
export function stepMatch(match, deltaSeconds) {
  if (!match || match.finished || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return match;
  for (const player of match.players) {
    player.cooldown = Math.max(0, player.cooldown - deltaSeconds);
    player.respawn = Math.max(0, player.respawn - deltaSeconds);
  }
  match.finished = match.scores.some(score => score >= WINNING_SCORE);
  return match;
}
