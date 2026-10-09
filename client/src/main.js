import * as THREE from 'three';
import { PHYSICS, updateVehiclePhysics, resolveWallCollisions, checkVehicleCollision, resolveVehicleCollision, checkProjectileHit, lerp, clamp } from '../../shared/physics.js';
import { MAPS } from './maps.js';
import { RULES } from '../../shared/rules.js';

// === Configuration et État ===
const GAME_STATE = {
  menu: true,
  gameRunning: false,
  selectedMap: 0,
  isMobile: () => window.innerWidth < 768 || window.matchMedia('(hover: none)').matches,
};

const INPUT = {
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false,
  // Joystick tactile
  touchInput: { x: 0, y: 0 },
};

const CAMERA_CONFIG = {
  distance: 35,
  height: 22,
  lerpFactor: 0.08, // Plus élevé = suivi plus rapide
};

// === Initialisation Three.js ===
const canvas = document.getElementById('game-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });

// Responsive - pixel ratio et taille
const pixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;

// Fog et arrière-plan
scene.fog = new THREE.Fog(0x87CEEB, 60, 100);
scene.background = new THREE.Color(0x87CEEB);

// === Éclairage enrichi ===
// Lumière hémisphérique
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
scene.add(hemiLight);

// Soleil directionnel avec ombres
const sunLight = new THREE.DirectionalLight(0xffffff, 0.9);
sunLight.position.set(30, 40, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.far = 100;
sunLight.shadow.camera.left = -50;
sunLight.shadow.camera.right = 50;
sunLight.shadow.camera.top = 50;
sunLight.shadow.camera.bottom = -50;
sunLight.shadow.bias = -0.001;
scene.add(sunLight);

// Lumière ambiante pour plus de douceur
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// === Objets du jeu ===
const gameObjects = {
  vehicles: [],
  projectiles: [],
  walls: [],
  particles: [],
  meshes: {
    vehicles: [],
    projectiles: [],
    walls: [],
  },
};

const matchState = {
  p1Score: 0,
  p2Score: 0,
  p1Health: 100,
  p2Health: 100,
  gameTime: 0,
};

// === Classes ===
class Vehicle {
  constructor(id, position, color) {
    this.id = id;
    this.position = { x: position.x, y: position.y };
    this.velocity = { x: 0, y: 0 };
    this.rotation = 0;
    this.health = 100;
    this.color = color;
    this.canShoot = true;
    this.shootCooldown = 0;
    this.mesh = null;
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Corps du véhicule
    const bodyGeom = new THREE.BoxGeometry(1.2, 0.7, 1.8);
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: this.color,
      metalness: 0.3,
      roughness: 0.6,
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.z = 0.35;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Tourelle/Canon
    const turretGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16);
    const turretMat = new THREE.MeshStandardMaterial({ 
      color: this.color,
      metalness: 0.5,
      roughness: 0.4,
    });
    const turret = new THREE.Mesh(turretGeom, turretMat);
    turret.position.set(0, 0, 0.7);
    turret.castShadow = true;
    turret.receiveShadow = true;
    group.add(turret);

    // Canon (tube)
    const cannonGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
    const cannonMat = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      metalness: 0.8,
      roughness: 0.2,
    });
    const cannon = new THREE.Mesh(cannonGeom, cannonMat);
    cannon.position.set(0, 0, 1.1);
    cannon.rotation.x = Math.PI / 2;
    cannon.castShadow = true;
    cannon.receiveShadow = true;
    group.add(cannon);

    // Roues (3D stylisé)
    for (let i = 0; i < 4; i++) {
      const wheelGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 16);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.5 });
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      wheel.receiveShadow = true;
      
      const offsetX = i < 2 ? -0.5 : 0.5;
      const offsetZ = i % 2 === 0 ? -0.6 : 0.6;
      wheel.position.set(offsetX, 0, offsetZ);
      group.add(wheel);
    }

    // Yeux (expression)
    for (let i = 0; i < 2; i++) {
      const eyeGeom = new THREE.SphereGeometry(0.15, 8, 8);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const eye = new THREE.Mesh(eyeGeom, eyeMat);
      eye.position.set(i === 0 ? -0.25 : 0.25, 0.35, 0.9);
      eye.scale.z = 0.5;
      group.add(eye);

      // Pupille
      const pupilGeom = new THREE.SphereGeometry(0.08, 8, 8);
      const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
      const pupil = new THREE.Mesh(pupilGeom, pupilMat);
      pupil.position.set(i === 0 ? -0.25 : 0.25, 0.35, 0.96);
      group.add(pupil);
    }

    group.position.set(this.position.x, 0.5, this.position.y);
    group.rotation.y = this.rotation;
    group.castShadow = true;
    group.receiveShadow = true;

    this.mesh = group;
    return group;
  }

  update(input, deltaTime) {
    // Mise à jour physique
    updateVehiclePhysics(this, input, deltaTime);
    resolveWallCollisions(this, gameObjects.walls);

    // Tir
    this.shootCooldown -= deltaTime;
    if (input.shoot && this.shootCooldown <= 0 && this.health > 0) {
      this.shoot();
      this.shootCooldown = 0.5;
    }

    // Mise à jour du mesh
    if (this.mesh) {
      this.mesh.position.x = this.position.x;
      this.mesh.position.z = this.position.y;
      this.mesh.rotation.y = this.rotation;
    }

    // Dégâts progressifs si santé basse
    if (this.health <= 0) {
      this.health = 0;
    }
  }

  shoot() {
    const projectile = new Projectile(
      { x: this.position.x, y: this.position.y },
      { x: Math.cos(this.rotation), y: Math.sin(this.rotation) },
      this.id
    );
    gameObjects.projectiles.push(projectile);
    gameObjects.meshes.projectiles.push(projectile.createMesh());
    scene.add(projectile.mesh);

    // Particule de tir
    createFireEffect(this.position.x, this.position.y, this.rotation);
  }

  takeDamage(amount) {
    this.health = clamp(this.health - amount, 0, 100);
  }

  heal(amount) {
    this.health = clamp(this.health + amount, 0, 100);
  }
}

class Projectile {
  constructor(position, direction, playerId) {
    this.position = { x: position.x, y: position.y };
    this.direction = direction;
    this.playerId = playerId;
    this.lifetime = PHYSICS.PROJECTILE.lifetime;
    this.speed = PHYSICS.PROJECTILE.speed;
    this.mesh = null;
  }

  createMesh() {
    const geom = new THREE.SphereGeometry(0.3, 12, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff6600,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(this.position.x, 0.5, this.position.y);
    mesh.castShadow = true;
    this.mesh = mesh;
    return mesh;
  }

  update(deltaTime) {
    this.position.x += this.direction.x * this.speed * deltaTime;
    this.position.y += this.direction.y * this.speed * deltaTime;
    this.lifetime -= deltaTime;

    if (this.mesh) {
      this.mesh.position.x = this.position.x;
      this.mesh.position.z = this.position.y;
      this.mesh.rotation.x += 0.1;
      this.mesh.rotation.y += 0.1;
    }
  }
}

// === Fonctions utilitaires ===
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createFireEffect(x, y, angle) {
  // Particules simples
  const particleCount = 8;
  for (let i = 0; i < particleCount; i++) {
    const angle2 = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
    const particle = {
      position: { x, y },
      velocity: { x: Math.cos(angle2) * speed, y: Math.sin(angle2) * speed },
      lifetime: 0.5,
      maxLifetime: 0.5,
      mesh: null,
    };

    const geom = new THREE.SphereGeometry(0.2, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.1, 1, 0.5),
      emissive: 0xff6600,
      emissiveIntensity: 1,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, 0.5, y);
    scene.add(mesh);
    particle.mesh = mesh;

    gameObjects.particles.push(particle);
  }
}

function updateParticles(deltaTime) {
  for (let i = gameObjects.particles.length - 1; i >= 0; i--) {
    const p = gameObjects.particles[i];
    p.position.x += p.velocity.x * deltaTime;
    p.position.y += p.velocity.y * deltaTime;
    p.lifetime -= deltaTime;

    if (p.mesh) {
      p.mesh.position.x = p.position.x;
      p.mesh.position.z = p.position.y;
      const alpha = p.lifetime / p.maxLifetime;
      p.mesh.material.opacity = alpha;
    }

    if (p.lifetime <= 0) {
      scene.remove(p.mesh);
      gameObjects.particles.splice(i, 1);
    }
  }
}

function setupMap(mapIndex) {
  // Nettoyer l'ancienne map
  gameObjects.walls = [];
  gameObjects.meshes.walls.forEach(m => scene.remove(m));
  gameObjects.meshes.walls = [];

  const map = MAPS[mapIndex % MAPS.length];

  // Créer le sol
  const floorGeom = new THREE.PlaneGeometry(map.floorSize, map.floorSize);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x228B22,
    metalness: 0.1,
    roughness: 0.8,
    map: createGridTexture(),
  });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Créer les murs
  map.walls.forEach(wall => {
    gameObjects.walls.push(wall);

    const [x1, y1, x2, y2] = wall;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const wallGeom = new THREE.BoxGeometry(length, 2, 0.2);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      metalness: 0.2,
      roughness: 0.7,
    });
    const wallMesh = new THREE.Mesh(wallGeom, wallMat);
    wallMesh.position.set((x1 + x2) / 2, 1, (y1 + y2) / 2);
    wallMesh.rotation.y = angle;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);
    gameObjects.meshes.walls.push(wallMesh);
  });
}

function createGridTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#1a6b1a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 128; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.repeat.set(4, 4);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// === Gestion de l'interface ===
function showMenu() {
  document.getElementById('menu').style.display = 'flex';
  document.getElementById('game-container').style.display = 'none';
  GAME_STATE.menu = true;
}

function hideMenu() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';
  GAME_STATE.menu = false;
}

function updateHUD() {
  const p1HealthBar = document.getElementById('p1-health-bar');
  const p2HealthBar = document.getElementById('p2-health-bar');
  const scoreDisplay = document.getElementById('score');

  if (p1HealthBar) p1HealthBar.style.width = Math.max(0, matchState.p1Health) + '%';
  if (p2HealthBar) p2HealthBar.style.width = Math.max(0, matchState.p2Health) + '%';
  if (scoreDisplay) scoreDisplay.textContent = `${matchState.p1Score} - ${matchState.p2Score}`;
}

// === Gestion du clavier ===
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'w' || key === 'z') INPUT.up = true;
  if (key === 's') INPUT.down = true;
  if (key === 'a' || key === 'q') INPUT.left = true;
  if (key === 'd') INPUT.right = true;
  if (key === ' ') INPUT.shoot = true;
});

window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'w' || key === 'z') INPUT.up = false;
  if (key === 's') INPUT.down = false;
  if (key === 'a' || key === 'q') INPUT.left = false;
  if (key === 'd') INPUT.right = false;
  if (key === ' ') INPUT.shoot = false;
});

// === Gestion du tactile (joystick virtuel) ===
const joystickContainer = document.getElementById('joystick-container');
const joystickHandle = document.getElementById('joystick-handle');
const fireButton = document.getElementById('fire-button');

if (joystickContainer && GAME_STATE.isMobile()) {
  joystickContainer.style.display = 'flex';

  joystickContainer.addEventListener('touchstart', handleJoystickStart, false);
  joystickContainer.addEventListener('touchmove', handleJoystickMove, false);
  joystickContainer.addEventListener('touchend', handleJoystickEnd, false);
}

if (fireButton && GAME_STATE.isMobile()) {
  fireButton.style.display = 'block';
  fireButton.addEventListener('touchstart', () => { INPUT.shoot = true; }, false);
  fireButton.addEventListener('touchend', () => { INPUT.shoot = false; }, false);
}

function handleJoystickStart(e) {
  const touch = e.touches[0];
  updateJoystickPosition(touch);
}

function handleJoystickMove(e) {
  const touch = e.touches[0];
  updateJoystickPosition(touch);
}

function handleJoystickEnd(e) {
  INPUT.touchInput = { x: 0, y: 0 };
  if (joystickHandle) {
    joystickHandle.style.transform = 'translate(0, 0)';
  }
}

function updateJoystickPosition(touch) {
  const rect = joystickContainer.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const x = touch.clientX - rect.left - centerX;
  const y = touch.clientY - rect.top - centerY;

  const distance = Math.sqrt(x * x + y * y);
  const maxDistance = Math.min(rect.width, rect.height) / 3;

  if (distance > 0) {
    const ratio = Math.min(distance, maxDistance) / maxDistance;
    INPUT.touchInput.x = (x / distance) * ratio;
    INPUT.touchInput.y = (y / distance) * ratio;

    if (joystickHandle) {
      joystickHandle.style.transform = `translate(${INPUT.touchInput.x * maxDistance}px, ${INPUT.touchInput.y * maxDistance}px)`;
    }
  }
}

// === Boucle principale ===
let lastTime = performance.now();

function gameLoop(currentTime) {
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  if (!GAME_STATE.menu && GAME_STATE.gameRunning) {
    // Mettre à jour les véhicules
    gameObjects.vehicles.forEach((vehicle, idx) => {
      const input = idx === 0 ? {
        up: INPUT.up || INPUT.touchInput.y < 0,
        down: INPUT.down || INPUT.touchInput.y > 0,
        left: INPUT.left || INPUT.touchInput.x < 0,
        right: INPUT.right || INPUT.touchInput.x > 0,
        shoot: INPUT.shoot,
      } : {
        up: false, down: false, left: false, right: false, shoot: false,
      };

      vehicle.update(input, deltaTime);
      if (idx === 0) matchState.p1Health = vehicle.health;
      else matchState.p2Health = vehicle.health;
    });

    // Collisions entre véhicules
    if (gameObjects.vehicles.length === 2) {
      if (checkVehicleCollision(gameObjects.vehicles[0], gameObjects.vehicles[1])) {
        resolveVehicleCollision(gameObjects.vehicles[0], gameObjects.vehicles[1]);
      }
    }

    // Mettre à jour les projectiles
    for (let i = gameObjects.projectiles.length - 1; i >= 0; i--) {
      const proj = gameObjects.projectiles[i];
      proj.update(deltaTime);

      // Vérifier les collisions avec les véhicules
      gameObjects.vehicles.forEach((vehicle) => {
        if (proj.playerId !== vehicle.id && checkProjectileHit(proj, vehicle)) {
          vehicle.takeDamage(PHYSICS.PROJECTILE.damage);
          createFireEffect(proj.position.x, proj.position.y, 0);
          scene.remove(proj.mesh);
          gameObjects.projectiles.splice(i, 1);

          // Mise à jour du score si K.O.
          if (vehicle.health <= 0) {
            if (proj.playerId === 1) matchState.p1Score++;
            else matchState.p2Score++;
          }
        }
      });

      if (proj.lifetime <= 0) {
        scene.remove(proj.mesh);
        gameObjects.projectiles.splice(i, 1);
      }
    }

    // Mettre à jour les particules
    updateParticles(deltaTime);

    // Vérifier la fin de manche
    if (gameObjects.vehicles.some(v => v.health <= 0)) {
      setTimeout(() => {
        resetRound();
      }, 1000);
    }

    updateHUD();
  }

  // Mise à jour de la caméra
  if (gameObjects.vehicles.length === 2) {
    const avgX = (gameObjects.vehicles[0].position.x + gameObjects.vehicles[1].position.x) / 2;
    const avgY = (gameObjects.vehicles[0].position.y + gameObjects.vehicles[1].position.y) / 2;
    const targetX = avgX + Math.cos(Math.PI * 0.7) * CAMERA_CONFIG.distance;
    const targetZ = avgY + Math.sin(Math.PI * 0.7) * CAMERA_CONFIG.distance;

    camera.position.x = lerp(camera.position.x, targetX, CAMERA_CONFIG.lerpFactor);
    camera.position.z = lerp(camera.position.z, targetZ, CAMERA_CONFIG.lerpFactor);
    camera.position.y = CAMERA_CONFIG.height;
    camera.lookAt(avgX, 2, avgY);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(gameLoop);
}

function startGame(mapIndex = 0) {
  GAME_STATE.selectedMap = mapIndex;
  hideMenu();

  // Nettoyer la scène
  gameObjects.vehicles.forEach(v => scene.remove(v.mesh));
  gameObjects.projectiles.forEach(p => scene.remove(p.mesh));
  gameObjects.particles.forEach(p => scene.remove(p.mesh));
  gameObjects.vehicles = [];
  gameObjects.projectiles = [];
  gameObjects.particles = [];

  // Setup
  setupMap(mapIndex);

  // Créer les véhicules
  const v1 = new Vehicle(1, { x: -10, y: -10 }, 0xFF6B6B);
  const v2 = new Vehicle(2, { x: 10, y: 10 }, 0x4ECDC4);

  gameObjects.vehicles.push(v1, v2);
  scene.add(v1.createMesh());
  scene.add(v2.createMesh());

  matchState.p1Health = 100;
  matchState.p2Health = 100;
  matchState.gameTime = 0;

  GAME_STATE.gameRunning = true;
  gameLoop(performance.now());
}

function resetRound() {
  gameObjects.vehicles.forEach((v) => {
    v.health = 100;
    if (v.id === 1) {
      v.position = { x: -10, y: -10 };
      v.velocity = { x: 0, y: 0 };
    } else {
      v.position = { x: 10, y: 10 };
      v.velocity = { x: 0, y: 0 };
    }
  });
}

// === Événements UI ===
document.getElementById('btn-local')?.addEventListener('click', () => startGame(0));
document.getElementById('btn-map-1')?.addEventListener('click', () => startGame(1));
document.getElementById('btn-map-2')?.addEventListener('click', () => startGame(2));
document.getElementById('btn-menu')?.addEventListener('click', showMenu);
document.getElementById('btn-settings')?.addEventListener('click', () => {
  alert('Réglages (volume, touches) - À implémenter');
});

// === Responsive ===
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Afficher le menu au démarrage
showMenu();
