// Physique déterministe partagée par le client et le serveur.
// Le monde utilise le plan X/Z ; l'axe Y est réservé au rendu 3D.
export const PHYSICS = Object.freeze({
  arenaRadius: 24,
  carRadius: 1.15,
  acceleration: 18,
  reverseAcceleration: 11,
  maxSpeed: 13,
  reverseMaxSpeed: 5,
  friction: 5.5,
  turnSpeed: 2.8,
  collisionRestitution: 0.72
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finiteOr = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

/** Avance un véhicule d'un pas. angle=0 pointe vers +Z. */
export function stepCar(car, input = {}, dt, config = PHYSICS) {
  const delta = clamp(finiteOr(dt), 0, 0.05);
  const throttle = clamp(finiteOr(input.throttle), -1, 1);
  const steering = clamp(finiteOr(input.steering), -1, 1);
  let speed = finiteOr(car.speed);

  if (throttle > 0) speed += throttle * config.acceleration * delta;
  else if (throttle < 0) speed += throttle * config.reverseAcceleration * delta;
  else {
    const loss = config.friction * delta;
    speed = Math.abs(speed) <= loss ? 0 : speed - Math.sign(speed) * loss;
  }

  speed = clamp(speed, -config.reverseMaxSpeed, config.maxSpeed);
  const angle = finiteOr(car.angle);
  const direction = speed < -0.1 ? -1 : 1;
  const nextAngle = angle + steering * config.turnSpeed * direction * delta;
  return {
    ...car,
    speed,
    angle: nextAngle,
    x: finiteOr(car.x) + Math.sin(nextAngle) * speed * delta,
    z: finiteOr(car.z) + Math.cos(nextAngle) * speed * delta
  };
}

/** Garde le véhicule dans l'arène et le freine contre le bord. */
export function keepInsideArena(car, config = PHYSICS) {
  const limit = config.arenaRadius - config.carRadius;
  const x = finiteOr(car.x);
  const z = finiteOr(car.z);
  const distance = Math.hypot(x, z);
  if (distance <= limit) return { ...car, x, z, speed: finiteOr(car.speed) };
  const scale = limit / (distance || 1);
  return { ...car, x: x * scale, z: z * scale, speed: Math.min(0, finiteOr(car.speed)) };
}

/** Sépare deux véhicules qui se chevauchent et applique une impulsion simple. */
export function resolveCarCollision(a, b, config = PHYSICS) {
  const dx = finiteOr(b.x) - finiteOr(a.x);
  const dz = finiteOr(b.z) - finiteOr(a.z);
  const distance = Math.hypot(dx, dz);
  const minDistance = config.carRadius * 2;
  if (distance >= minDistance) return [a, b];

  const nx = distance > 1e-8 ? dx / distance : 1;
  const nz = distance > 1e-8 ? dz / distance : 0;
  const separation = (minDistance - distance) / 2;
  const impulse = (finiteOr(a.speed) - finiteOr(b.speed)) * (1 + config.collisionRestitution) / 2;
  return [
    { ...a, x: finiteOr(a.x) - nx * separation, z: finiteOr(a.z) - nz * separation, speed: finiteOr(a.speed) - impulse },
    { ...b, x: finiteOr(b.x) + nx * separation, z: finiteOr(b.z) + nz * separation, speed: finiteOr(b.speed) + impulse }
  ];
}
