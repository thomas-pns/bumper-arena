// Physique partagée pour le jeu Bumper Arena (mode véhicule)
// Accélération fluide, collisions avec glissement, interpolation

export const PHYSICS = {
  // Configuration des véhicules
  VEHICLE: {
    radius: 0.6,
    maxSpeed: 15,
    acceleration: 35,       // Accélération progressive (m/s²)
    friction: 0.92,         // Damping du mouvement (0-1, plus bas = plus fluide)
    rotationSpeed: 8,       // Vitesse de rotation vers la direction (rad/s)
    restitution: 0.3,       // Élasticité lors des collisions
    mass: 1,
  },

  // Projectiles
  PROJECTILE: {
    speed: 25,
    lifetime: 5,            // Durée de vie en secondes
    radius: 0.3,
    damage: 10,
  },

  // Arène
  ARENA: {
    radius: 25,
    height: 3,
  },

  // Bonus
  BONUS: {
    radius: 0.5,
    spawnInterval: 8000,    // Millisecondes
    maxOnArena: 3,
  },
};

/**
 * Calcule la nouvelle position et vitesse d'un véhicule avec friction
 */
export function updateVehiclePhysics(vehicle, input, deltaTime) {
  const config = PHYSICS.VEHICLE;

  // Calcul de la direction souhaitée
  let dirX = 0, dirY = 0;
  if (input.up) dirY += 1;
  if (input.down) dirY -= 1;
  if (input.left) dirX -= 1;
  if (input.right) dirX += 1;

  // Normalisation
  const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
  if (dirLen > 0) {
    dirX /= dirLen;
    dirY /= dirLen;
  }

  // Accélération progressive
  const accelX = dirX * config.acceleration;
  const accelY = dirY * config.acceleration;

  vehicle.velocity.x += accelX * deltaTime;
  vehicle.velocity.y += accelY * deltaTime;

  // Friction (damping)
  vehicle.velocity.x *= config.friction;
  vehicle.velocity.y *= config.friction;

  // Limite de vitesse
  const speed = Math.sqrt(vehicle.velocity.x ** 2 + vehicle.velocity.y ** 2);
  if (speed > config.maxSpeed) {
    const scale = config.maxSpeed / speed;
    vehicle.velocity.x *= scale;
    vehicle.velocity.y *= scale;
  }

  // Nouvelle position
  vehicle.position.x += vehicle.velocity.x * deltaTime;
  vehicle.position.y += vehicle.velocity.y * deltaTime;

  // Rotation vers la direction du mouvement (ou direction du regard)
  if (dirLen > 0.1) {
    const targetAngle = Math.atan2(dirY, dirX);
    let diff = targetAngle - vehicle.rotation;
    
    // Chemin le plus court
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    
    vehicle.rotation += diff * config.rotationSpeed * deltaTime;
  }
}

/**
 * Détecte et résout les collisions avec les murs
 * Glissement le long de la paroi au lieu de blocage net
 */
export function resolveWallCollisions(vehicle, walls) {
  const config = PHYSICS.VEHICLE;
  const collisionMargin = 0.05;

  walls.forEach((wall) => {
    // Vérifier distance à chaque segment
    const closest = getClosestPointOnWall(vehicle.position, wall);
    const dist = Math.sqrt(
      (closest.x - vehicle.position.x) ** 2 +
      (closest.y - vehicle.position.y) ** 2
    );

    if (dist < config.radius + collisionMargin) {
      // Vecteur de séparation
      const dx = vehicle.position.x - closest.x;
      const dy = vehicle.position.y - closest.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / len;
      const ny = dy / len;

      // Repousser le véhicule
      const overlap = config.radius + collisionMargin - dist;
      vehicle.position.x += nx * overlap;
      vehicle.position.y += ny * overlap;

      // Glissement : réduire la composante perpendiculaire de la vélocité
      const dotProduct = vehicle.velocity.x * nx + vehicle.velocity.y * ny;
      if (dotProduct < 0) {
        vehicle.velocity.x -= dotProduct * nx;
        vehicle.velocity.y -= dotProduct * ny;
        // Garder un peu de friction lors du glissement
        vehicle.velocity.x *= 0.9;
        vehicle.velocity.y *= 0.9;
      }
    }
  });
}

/**
 * Point le plus proche d'un segment mur
 */
export function getClosestPointOnWall(pos, wall) {
  const [x1, y1, x2, y2] = wall;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;

  if (len2 === 0) return { x: x1, y: y1 };

  let t = ((pos.x - x1) * dx + (pos.y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));

  return {
    x: x1 + t * dx,
    y: y1 + t * dy,
  };
}

/**
 * Vérifie si deux véhicules se chevauchent (collision)
 */
export function checkVehicleCollision(v1, v2) {
  const dx = v2.position.x - v1.position.x;
  const dy = v2.position.y - v1.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = PHYSICS.VEHICLE.radius * 2;

  return dist < minDist;
}

/**
 * Résout une collision entre deux véhicules
 * Rebond élastique simplifié
 */
export function resolveVehicleCollision(v1, v2) {
  const dx = v2.position.x - v1.position.x;
  const dy = v2.position.y - v1.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
  const nx = dx / dist;
  const ny = dy / dist;

  const minDist = PHYSICS.VEHICLE.radius * 2;
  const overlap = minDist - dist;

  // Séparer les véhicules
  v1.position.x -= nx * (overlap / 2);
  v1.position.y -= ny * (overlap / 2);
  v2.position.x += nx * (overlap / 2);
  v2.position.y += ny * (overlap / 2);

  // Rebond simplifié
  const restitution = PHYSICS.VEHICLE.restitution;
  const dvx = v2.velocity.x - v1.velocity.x;
  const dvy = v2.velocity.y - v1.velocity.y;
  const dvDot = dvx * nx + dvy * ny;

  if (dvDot < 0) {
    const impulse = (1 + restitution) * dvDot / 2;
    v1.velocity.x += impulse * nx;
    v1.velocity.y += impulse * ny;
    v2.velocity.x -= impulse * nx;
    v2.velocity.y -= impulse * ny;
  }
}

/**
 * Vérifie si un projectile touche un véhicule
 */
export function checkProjectileHit(projectile, vehicle) {
  const dx = vehicle.position.x - projectile.position.x;
  const dy = vehicle.position.y - projectile.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  return dist < PHYSICS.VEHICLE.radius + PHYSICS.PROJECTILE.radius;
}

/**
 * Clamp une valeur entre min et max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Lerp entre deux valeurs
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
