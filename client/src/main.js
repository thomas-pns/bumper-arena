import * as THREE from 'three';

// ==================== CONFIGURATION ====================
const CONFIG = {
  GAME_WIDTH: 1024,
  GAME_HEIGHT: 768,
  VEHICLE_SPEED: 0.3,
  VEHICLE_ROTATION_SPEED: 0.1,
  FIRE_RATE: 500, // ms
  MAX_HP: 100,
  ROUNDS_TO_WIN: 3,
  MAP_RADIUS: 50,
  BOT_DIFFICULTIES: {
    easy: { reaction: 0.3, accuracy: 0.6, dashFreq: 0.1 },
    medium: { reaction: 0.15, accuracy: 0.8, dashFreq: 0.2 },
    hard: { reaction: 0.05, accuracy: 0.95, dashFreq: 0.35 }
  }
};

// ==================== ÉTAT GLOBAL ====================
const gameState = {
  scene: null,
  camera: null,
  renderer: null,
  currentScreen: 'menu', // menu, gameMode, game, roomCode, gameOverRound, gameOverMatch
  gameMode: null, // 'bot' ou 'online'
  botDifficulty: 'medium',
  roomCode: null,
  
  players: {
    local: null,
    remote: null,
    bot: null
  },
  
  rounds: {
    local: 0,
    remote: 0
  },
  
  projectiles: [],
  obstacles: [],
  currentMap: 0,
  
  input: {
    keys: {},
    touchJoystick: { x: 0, y: 0 },
    touchFire: false,
    mouseX: 0,
    mouseY: 0
  },
  
  lastFireTime: 0,
  gameActive: false,
  websocket: null
};

// ==================== CLASSE VEHICLE ====================
class Vehicle {
  constructor(x, y, color, isBot = false) {
    this.x = x;
    this.y = y;
    this.z = 0.5;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.hp = CONFIG.MAX_HP;
    this.color = color;
    this.isBot = isBot;
    this.isDead = false;
    this.invulnerable = false;
    this.lastFireTime = 0;
    
    // Création du modèle 3D
    const geometry = new THREE.BoxGeometry(1, 0.5, 1.5);
    const material = new THREE.MeshStandardMaterial({ color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.set(x, this.z, y);
    gameState.scene.add(this.mesh);
    
    // Canon sur le véhicule
    const cannonGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8);
    const cannonMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    this.cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    this.cannon.castShadow = true;
    this.cannon.position.z = 0.7;
    this.mesh.add(this.cannon);
    
    // IA Bot
    if (isBot) {
      this.difficulty = CONFIG.BOT_DIFFICULTIES[gameState.botDifficulty];
      this.botTimer = 0;
    }
  }
  
  update(deltaTime) {
    if (this.isDead) return;
    
    let moveX = 0, moveY = 0;
    
    if (this.isBot) {
      this.updateBotAI(deltaTime);
    } else {
      // Entrées clavier/tactile
      if (gameState.input.keys['w'] || gameState.input.keys['z'] || gameState.input.touchJoystick.y > 0.2) {
        moveY += CONFIG.VEHICLE_SPEED;
      }
      if (gameState.input.keys['s'] || gameState.input.touchJoystick.y < -0.2) {
        moveY -= CONFIG.VEHICLE_SPEED;
      }
      if (gameState.input.keys['a'] || gameState.input.keys['q'] || gameState.input.touchJoystick.x < -0.2) {
        moveX -= CONFIG.VEHICLE_SPEED;
      }
      if (gameState.input.keys['d'] || gameState.input.touchJoystick.x > 0.2) {
        moveX += CONFIG.VEHICLE_SPEED;
      }
      
      // Tir
      if ((gameState.input.keys[' '] || gameState.input.touchFire) && Date.now() - this.lastFireTime > CONFIG.FIRE_RATE) {
        this.fire();
        this.lastFireTime = Date.now();
      }
    }
    
    // Application du mouvement
    if (moveX !== 0 || moveY !== 0) {
      this.angle = Math.atan2(moveX, moveY);
      this.vx = Math.cos(this.angle) * CONFIG.VEHICLE_SPEED;
      this.vy = Math.sin(this.angle) * CONFIG.VEHICLE_SPEED;
    } else {
      this.vx *= 0.9;
      this.vy *= 0.9;
    }
    
    // Mouvement avec friction
    this.x += this.vx;
    this.y += this.vy;
    
    // Limite de l'arène
    const distance = Math.sqrt(this.x ** 2 + this.y ** 2);
    if (distance > CONFIG.MAP_RADIUS) {
      const angle = Math.atan2(this.y, this.x);
      this.x = Math.cos(angle) * CONFIG.MAP_RADIUS;
      this.y = Math.sin(angle) * CONFIG.MAP_RADIUS;
      this.vx = 0;
      this.vy = 0;
    }
    
    // Mise à jour du mesh
    this.mesh.position.set(this.x, this.z, this.y);
    this.mesh.rotation.y = this.angle;
    
    // Rotation du canon
    this.cannon.rotation.x = -0.3;
  }
  
  updateBotAI(deltaTime) {
    const target = gameState.players.local;
    if (!target) return;
    
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    this.botTimer += deltaTime;
    
    // Orientation vers la cible
    this.angle = Math.atan2(dx, dy);
    
    // Mouvement vers la cible avec aléatoire
    if (distance > 5 && Math.random() < 0.7) {
      this.vx = (dx / distance) * CONFIG.VEHICLE_SPEED;
      this.vy = (dy / distance) * CONFIG.VEHICLE_SPEED;
    } else {
      this.vx *= 0.9;
      this.vy *= 0.9;
    }
    
    this.x += this.vx;
    this.y += this.vy;
    
    // Tir selon la difficulté
    if (distance < 30 && Math.random() < this.difficulty.accuracy * 0.01 && 
        Date.now() - this.lastFireTime > CONFIG.FIRE_RATE) {
      this.fire();
      this.lastFireTime = Date.now();
    }
    
    // Mise à jour du mesh
    this.mesh.position.set(this.x, this.z, this.y);
    this.mesh.rotation.y = this.angle;
  }
  
  fire() {
    const projectile = new Projectile(
      this.x + Math.cos(this.angle) * 1,
      this.y + Math.sin(this.angle) * 1,
      this.angle,
      this.color
    );
    gameState.projectiles.push(projectile);
  }
  
  takeDamage(damage) {
    if (this.invulnerable) return;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.mesh.visible = false;
    }
  }
  
  reset() {
    this.hp = CONFIG.MAX_HP;
    this.isDead = false;
    this.invulnerable = true;
    this.x = (this.color === 0xff0000) ? -20 : 20;
    this.y = 0;
    this.mesh.visible = true;
    setTimeout(() => { this.invulnerable = false; }, 2000);
  }
}

// ==================== CLASSE PROJECTILE ====================
class Projectile {
  constructor(x, y, angle, color) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * 0.8;
    this.vy = Math.sin(angle) * 0.8;
    this.lifetime = 5000; // ms
    this.createdAt = Date.now();
    this.damage = 20;
    this.color = color;
    
    const geometry = new THREE.SphereGeometry(0.3, 8, 8);
    const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.position.set(x, 0.3, y);
    gameState.scene.add(this.mesh);
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.mesh.position.set(this.x, 0.3, this.y);
    
    // Limite de l'arène
    const distance = Math.sqrt(this.x ** 2 + this.y ** 2);
    return distance < CONFIG.MAP_RADIUS && Date.now() - this.createdAt < this.lifetime;
  }
  
  checkCollision(vehicle) {
    if (vehicle.isDead || vehicle.invulnerable) return false;
    const dx = this.x - vehicle.x;
    const dy = this.y - vehicle.y;
    return Math.sqrt(dx * dx + dy * dy) < 1.5;
  }
}

// ==================== INITIALISATION 3D ====================
function initThreeJS() {
  // Scene
  gameState.scene = new THREE.Scene();
  gameState.scene.background = new THREE.Color(0x87CEEB);
  gameState.scene.fog = new THREE.Fog(0x87CEEB, 200, 300);
  
  // Camera 3ème personne (sera mise à jour chaque frame)
  gameState.camera = new THREE.PerspectiveCamera(
    75,
    CONFIG.GAME_WIDTH / CONFIG.GAME_HEIGHT,
    0.1,
    1000
  );
  
  // Renderer
  gameState.renderer = new THREE.WebGLRenderer({ antialias: true });
  gameState.renderer.setSize(CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
  gameState.renderer.shadowMap.enabled = true;
  gameState.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
  
  const canvas = document.getElementById('gameCanvas');
  if (canvas) canvas.replaceWith(gameState.renderer.domElement);
  else document.body.appendChild(gameState.renderer.domElement);
  
  // Lumière
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  gameState.scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(20, 20, 20);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  gameState.scene.add(directionalLight);
  
  // Sol
  const groundGeometry = new THREE.CircleGeometry(CONFIG.MAP_RADIUS, 64);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  gameState.scene.add(ground);
  
  // Bord de l'arène
  const borderGeometry = new THREE.BufferGeometry();
  const borderPoints = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    const x = Math.cos(angle) * CONFIG.MAP_RADIUS;
    const z = Math.sin(angle) * CONFIG.MAP_RADIUS;
    borderPoints.push(new THREE.Vector3(x, 0, z));
  }
  borderGeometry.setFromPoints(borderPoints);
  const borderMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
  const borderLine = new THREE.Line(borderGeometry, borderMaterial);
  gameState.scene.add(borderLine);
  
  // Murs selon la carte
  createMapObstacles(gameState.currentMap);
}

function createMapObstacles(mapIndex) {
  // Effacer les anciens obstacles
  gameState.obstacles.forEach(obs => gameState.scene.remove(obs.mesh));
  gameState.obstacles = [];
  
  const maps = [
    // Map 0 : 4 piliers centraux
    [
      { x: -10, y: -10, w: 2, h: 2 },
      { x: 10, y: -10, w: 2, h: 2 },
      { x: -10, y: 10, w: 2, h: 2 },
      { x: 10, y: 10, w: 2, h: 2 }
    ],
    // Map 1 : Labyrinthe
    [
      { x: 0, y: -20, w: 40, h: 2 },
      { x: -20, y: 0, w: 2, h: 40 },
      { x: 20, y: 0, w: 2, h: 40 },
      { x: 0, y: 20, w: 40, h: 2 },
      { x: -10, y: -5, w: 2, h: 10 },
      { x: 10, y: 5, w: 2, h: 10 }
    ],
    // Map 2 : Allées
    [
      { x: -15, y: 0, w: 2, h: 50 },
      { x: 15, y: 0, w: 2, h: 50 },
      { x: 0, y: -15, w: 50, h: 2 },
      { x: 0, y: 15, w: 50, h: 2 }
    ]
  ];
  
  const obstacles = maps[mapIndex % maps.length];
  
  obstacles.forEach(obs => {
    const geometry = new THREE.BoxGeometry(obs.w, 2, obs.h);
    const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(obs.x, 1, obs.y);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    gameState.scene.add(mesh);
    gameState.obstacles.push({ mesh, x: obs.x, y: obs.y, w: obs.w, h: obs.h });
  });
}

// ==================== BOUCLE DE JEU ====================
function updateCamera() {
  const player = gameState.players.local;
  if (!player) return;
  
  // Caméra 3ème personne : derrière et au-dessus du véhicule
  const cameraDistance = 12;
  const cameraHeight = 6;
  const cameraX = player.x - Math.cos(player.angle) * cameraDistance;
  const cameraY = player.y - Math.sin(player.angle) * cameraDistance;
  
  gameState.camera.position.lerp(
    new THREE.Vector3(cameraX, cameraHeight, cameraY),
    0.1
  );
  
  gameState.camera.lookAt(player.x, 1, player.y);
}

function gameLoop(deltaTime) {
  if (!gameState.gameActive) return;
  
  // Update véhicules
  gameState.players.local?.update(deltaTime);
  gameState.players.bot?.update(deltaTime);
  gameState.players.remote?.update(deltaTime);
  
  // Update projectiles
  gameState.projectiles = gameState.projectiles.filter(proj => proj.update());
  
  // Collisions projectiles <> véhicules
  gameState.projectiles.forEach((proj, idx) => {
    [gameState.players.local, gameState.players.bot, gameState.players.remote]
      .filter(v => v && !v.isDead)
      .forEach(vehicle => {
        if (proj.checkCollision(vehicle)) {
          vehicle.takeDamage(proj.damage);
          gameState.scene.remove(proj.mesh);
          gameState.projectiles.splice(idx, 1);
        }
      });
  });
  
  // Vérifier éliminations
  if (gameState.players.local?.hp <= 0 && !gameState.players.local.isDead) {
    gameState.players.local.isDead = true;
    gameState.players.remote?.rounds ? gameState.rounds.remote++ : gameState.rounds.remote++;
    showGameOverRound();
  }
  
  if (gameState.players.bot?.hp <= 0 && !gameState.players.bot.isDead) {
    gameState.players.bot.isDead = true;
    gameState.rounds.local++;
    showGameOverRound();
  }
  
  updateCamera();
  gameState.renderer.render(gameState.scene, gameState.camera);
}

// ==================== ÉCRANS UI ====================
function showMenu() {
  gameState.currentScreen = 'menu';
  gameState.gameActive = false;
  const html = `
    <div class="menu-container">
      <h1 class="game-title">🚗 VEHICLE ARENA</h1>
      <div class="menu-buttons">
        <button class="menu-btn" onclick="startBotGame()">JOUER CONTRE BOT</button>
        <button class="menu-btn" onclick="showGameMode()">MODE SALON PRIVÉ</button>
        <button class="menu-btn" onclick="showSettings()">RÉGLAGES</button>
      </div>
    </div>
  `;
  updateUI(html);
}

function showGameMode() {
  gameState.currentScreen = 'gameMode';
  const html = `
    <div class="menu-container">
      <h2>Choisir la difficulté du BOT</h2>
      <div class="menu-buttons">
        <button class="menu-btn" onclick="setDifficulty('easy')">FACILE</button>
        <button class="menu-btn" onclick="setDifficulty('medium')">NORMAL</button>
        <button class="menu-btn" onclick="setDifficulty('hard')">DIFFICILE</button>
      </div>
      <button class="menu-btn back-btn" onclick="showMenu()">RETOUR</button>
    </div>
  `;
  updateUI(html);
}

function setDifficulty(difficulty) {
  gameState.botDifficulty = difficulty;
  startBotGame();
}

function startBotGame() {
  gameState.gameMode = 'bot';
  gameState.gameActive = true;
  gameState.currentScreen = 'game';
  gameState.rounds = { local: 0, remote: 0 };
  
  // Réinitialiser la scène
  gameState.scene.clear();
  gameState.projectiles = [];
  
  // Créer les véhicules
  gameState.players.local = new Vehicle(-20, 0, 0xff0000);
  gameState.players.bot = new Vehicle(20, 0, 0x0000ff, true);
  gameState.players.remote = null;
  
  createMapObstacles(gameState.currentMap);
  updateHUD();
}

function showGameOverRound() {
  if (gameState.rounds.local >= CONFIG.ROUNDS_TO_WIN || gameState.rounds.remote >= CONFIG.ROUNDS_TO_WIN) {
    showGameOverMatch();
  } else {
    gameState.gameActive = false;
    const winner = gameState.players.local?.isDead ? gameState.players.bot : gameState.players.local;
    const html = `
      <div class="hud-overlay">
        <h2>${winner.isBot ? 'BOT GAGNE!' : 'VOUS GAGNEZ!'}</h2>
        <p>Score: ${gameState.rounds.local} - ${gameState.rounds.remote}</p>
        <button class="menu-btn" onclick="resumeRound()">MANCHE SUIVANTE</button>
      </div>
    `;
    updateUI(html);
  }
}

function showGameOverMatch() {
  gameState.gameActive = false;
  const winner = gameState.rounds.local > gameState.rounds.remote ? 'VICTOIRE!' : 'DÉFAITE!';
  const html = `
    <div class="hud-overlay">
      <h2>${winner}</h2>
      <p>Score final: ${gameState.rounds.local} - ${gameState.rounds.remote}</p>
      <button class="menu-btn" onclick="showMenu()">RETOUR AU MENU</button>
    </div>
  `;
  updateUI(html);
}

function resumeRound() {
  gameState.players.local.reset();
  gameState.players.bot.reset();
  gameState.gameActive = true;
  updateHUD();
}

function updateHUD() {
  const html = `
    <div class="hud">
      <div class="score-board">
        <div class="player-score">
          <span>VOUS</span>
          <span class="hp-bar" style="width: ${gameState.players.local?.hp || 0}%"></span>
          <span>${gameState.players.local?.hp.toFixed(0) || 0} HP</span>
        </div>
        <div class="rounds">
          <span>${gameState.rounds.local}</span>
          <span>-</span>
          <span>${gameState.rounds.remote}</span>
        </div>
        <div class="enemy-score">
          <span>${gameState.players.bot?.hp.toFixed(0) || 0} HP</span>
          <span class="hp-bar" style="width: ${gameState.players.bot?.hp || 0}%"></span>
          <span>BOT</span>
        </div>
      </div>
      
      ${createTouchControls()}
    </div>
  `;
  updateUI(html);
}

function createTouchControls() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) return '';
  
  return `
    <div class="touch-controls">
      <div class="joystick" id="joystick">
        <div class="joystick-thumb"></div>
      </div>
      <button class="fire-btn" id="fireBtn">TIRER</button>
    </div>
  `;
}

function showSettings() {
  const html = `
    <div class="menu-container">
      <h2>RÉGLAGES</h2>
      <div class="settings-panel">
        <label>Volume Musique: <input type="range" min="0" max="100" value="50"></label>
        <label>Volume Effets: <input type="range" min="0" max="100" value="50"></label>
        <h3>Touches Clavier:</h3>
        <p>Z/W: Avant | S: Arrière | Q/A: Gauche | D: Droite | ESPACE: Tirer</p>
      </div>
      <button class="menu-btn back-btn" onclick="showMenu()">RETOUR</button>
    </div>
  `;
  updateUI(html);
}

function updateUI(html) {
  const ui = document.getElementById('ui-container');
  if (ui) ui.innerHTML = html;
  
  // Réattacher les gestionnaires tactiles
  setupTouchControls();
}

// ==================== CONTRÔLES TACTILES ====================
function setupTouchControls() {
  const joystick = document.getElementById('joystick');
  const fireBtn = document.getElementById('fireBtn');
  
  if (joystick) {
    joystick.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const rect = joystick.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const x = (touch.clientX - centerX) / (rect.width / 2);
      const y = (touch.clientY - centerY) / (rect.height / 2);
      
      gameState.input.touchJoystick.x = Math.max(-1, Math.min(1, x));
      gameState.input.touchJoystick.y = Math.max(-1, Math.min(1, -y));
      
      const thumb = joystick.querySelector('.joystick-thumb');
      thumb.style.transform = `translate(${gameState.input.touchJoystick.x * 20}px, ${-gameState.input.touchJoystick.y * 20}px)`;
    });
    
    joystick.addEventListener('touchend', () => {
      gameState.input.touchJoystick = { x: 0, y: 0 };
      const thumb = joystick.querySelector('.joystick-thumb');
      thumb.style.transform = 'translate(0, 0)';
    });
  }
  
  if (fireBtn) {
    fireBtn.addEventListener('touchstart', () => {
      gameState.input.touchFire = true;
    });
    fireBtn.addEventListener('touchend', () => {
      gameState.input.touchFire = false;
    });
  }
}

// ==================== ENTRÉES CLAVIER ====================
document.addEventListener('keydown', (e) => {
  gameState.input.keys[e.key.toLowerCase()] = true;
  gameState.input.keys[e.code.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
  gameState.input.keys[e.key.toLowerCase()] = false;
  gameState.input.keys[e.code.toLowerCase()] = false;
});

// ==================== LANCEMENT ====================
window.addEventListener('load', () => {
  initThreeJS();
  showMenu();
  
  let lastTime = Date.now();
  function mainLoop() {
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;
    
    if (gameState.gameActive) {
      gameLoop(deltaTime);
    }
    
    if (gameState.currentScreen === 'game' && gameState.gameActive) {
      updateHUD();
    }
    
    requestAnimationFrame(mainLoop);
  }
  mainLoop();
});

// Fonctions globales pour les boutons
window.showMenu = showMenu;
window.showGameMode = showGameMode;
window.setDifficulty = setDifficulty;
window.startBotGame = startBotGame;
window.resumeRound = resumeRound;
window.showSettings = showSettings;
window.updateUI = updateUI;