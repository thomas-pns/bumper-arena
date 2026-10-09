import * as THREE from 'three';
import './style.css';
import { ARENAS, createMatch, stepMatch, damagePlayer } from '../../shared/rules.js';

const app = document.querySelector('#app');
const keys = new Set();
let renderer, scene, camera, arenaRoot, players = [], bullets = [], decor = [];
let match = null;
let selectedArena = 0;
let running = false;
let lastFrame = 0;
let roundDelay = 0;
let uiClock = 0;

const COLORS = [0x38d9ff, 0xff526b];
const arenaNames = ['Néon District', 'Canyon Rouge', 'Usine Zéro'];

function menu() {
  running = false;
  app.innerHTML = `
    <main class="menu-screen">
      <div class="menu-grid"></div><div class="menu-glow"></div>
      <header class="brand"><span class="brand-mark">BA</span><span>BUMPER<span class="brand-accent"> ARENA</span></span><span class="beta">ARCADE // 01</span></header>
      <section class="hero">
        <div class="hero-copy"><p class="eyebrow"><i></i> COMBAT D'ARÈNE · EN LOCAL</p><h1>DEUX PILOTES.<br><em>UNE ARÈNE.</em></h1><p class="hero-sub">Choisis ton terrain, charge tes canons et décroche trois éliminations pour remporter le duel.</p>
          <div class="controls"><span class="keycap">ZQSD</span><span class="keycap">WASD</span><span class="control-label">DÉPLACEMENT</span><span class="keycap fire-key">ESPACE</span><span class="control-label">TIR</span></div>
          <div class="player-controls"><span><b class="dot cyan"></b> PILOTE 1 · ZQSD / WASD + ESPACE</span><span><b class="dot red"></b> PILOTE 2 · FLÈCHES + ENTRÉE</span></div>
        </div>
        <div class="hero-art"><div class="ring ring-one"></div><div class="ring ring-two"></div><div class="art-label">ARENA <b>01</b></div><div class="car car-cyan"><span></span></div><div class="car car-red"><span></span></div><div class="art-cross">×</div><div class="art-coord">X: 04.82<br>Y: 19.07</div></div>
      </section>
      <section class="bottom-panel"><div class="arena-select"><div class="section-heading"><div><p class="eyebrow">SÉLECTION DU TERRAIN</p><h2>Choisis ton arène</h2></div><span class="arena-count">0${selectedArena + 1} <small>/ 03</small></span></div>
      <div class="arena-cards">${ARENAS.map((arena, i) => `<button class="arena-card ${i === selectedArena ? 'selected' : ''}" data-arena="${i}"><span class="arena-thumb thumb-${i}"><i></i><b></b><em></em></span><span class="card-info"><b>${arenaNames[i]}</b><small>${['RUELLES · COUVERTURES', 'OUVERT · OBSTACLES', 'INDUSTRIEL · COULOIRS'][i]}</small></span><span class="card-arrow">↗</span></button>`).join('')}</div></div>
      <aside class="launch"><div class="launch-top"><span class="status"><i></i> PRÊT AU COMBAT</span><span class="match-format">PREMIER À 3</span></div><p>Une barre de vie. Des murs pour se couvrir.<br><strong>Pas de chrono. Pas de pitié.</strong></p><button id="play" class="play-button"><span>LANCER LE DUEL</span><b>→</b></button><small class="local-note">⌨ CLAVIER · 2 JOUEURS · ÉCRAN PARTAGÉ</small></aside></section>
      <footer class="menu-footer"><span>BUMPER ARENA <b>© 2026</b></span><span>CONSTRUIT POUR LES PILOTES, PAS LES TOURISTES.</span><span>V.0.2 <b>LOCAL BUILD</b></span></footer>
    </main>`;
  app.querySelectorAll('[data-arena]').forEach(button => button.addEventListener('click', () => { selectedArena = Number(button.dataset.arena); menu(); }));
  document.querySelector('#play').addEventListener('click', startGame);
}

function setupThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#101627');
  scene.fog = new THREE.Fog('#101627', 30, 75);
  camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 120);
  camera.position.set(0, 19, 21);
  camera.lookAt(0, 0, 0);
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.querySelector('#game-canvas').appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xaacbff, 0x182033, 2));
  const key = new THREE.DirectionalLight(0xffe2bd, 3.4); key.position.set(-8, 15, 8); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
  const rim = new THREE.PointLight(0x4b78ff, 45, 45); rim.position.set(8, 8, -8); scene.add(rim);
  window.addEventListener('resize', resize);
}
function resize() { if (!renderer || !camera) return; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }
function mat(color, roughness = .62, metalness = .12) { return new THREE.MeshStandardMaterial({ color, roughness, metalness }); }
function box(parent, x, y, z, sx, sy, sz, material, cast = true) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material); mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh; }

function buildArena(index) {
  if (arenaRoot) scene.remove(arenaRoot);
  arenaRoot = new THREE.Group(); scene.add(arenaRoot); decor = [];
  const data = ARENAS[index];
  const floor = new THREE.Mesh(new THREE.BoxGeometry(data.width, .5, data.depth), mat(data.floor, .9, .08)); floor.position.y = -.3; floor.receiveShadow = true; arenaRoot.add(floor);
  // Lignes de sol discrètes pour donner une échelle sans gêner le combat.
  const lineMat = new THREE.MeshBasicMaterial({ color: data.accent, transparent: true, opacity: .16 });
  for (let x = -data.width / 2 + 1; x < data.width / 2; x += 2) { const line = new THREE.Mesh(new THREE.BoxGeometry(.025, .012, data.depth - .6), lineMat); line.position.set(x, -.035, 0); arenaRoot.add(line); }
  const wallMat = mat(data.wall, .62, .2), coverMat = mat(data.cover, .54, .28), trimMat = new THREE.MeshStandardMaterial({ color: data.accent, emissive: data.accent, emissiveIntensity: .55, metalness: .5, roughness: .4 });
  const w = data.width / 2, d = data.depth / 2;
  // Murs périphériques : limites solides plutôt qu'une chute hors arène.
  box(arenaRoot, 0, 1.1, -d, data.width, 2.2, .45, wallMat); box(arenaRoot, 0, 1.1, d, data.width, 2.2, .45, wallMat);
  box(arenaRoot, -w, 1.1, 0, .45, 2.2, data.depth, wallMat); box(arenaRoot, w, 1.1, 0, .45, 2.2, data.depth, wallMat);
  // Bande lumineuse décorative au sommet de chaque mur.
  box(arenaRoot, 0, 2.23, -d, data.width, .07, .5, trimMat, false); box(arenaRoot, 0, 2.23, d, data.width, .07, .5, trimMat, false);
  box(arenaRoot, -w, 2.23, 0, .5, .07, data.depth, trimMat, false); box(arenaRoot, w, 2.23, 0, .5, .07, data.depth, trimMat, false);
  for (const obstacle of data.obstacles) {
    const [x, z, sx, sz, sy = 1.45] = obstacle;
    const cover = box(arenaRoot, x, sy / 2, z, sx, sy, sz, coverMat);
    box(arenaRoot, x, sy + .035, z, sx + .04, .07, sz + .04, trimMat, false);
    cover.userData.collider = true;
  }
  // Poteaux lumineux flottants hors du terrain jouable.
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, x = Math.cos(a) * (w + 2), z = Math.sin(a) * (d + 2); const orb = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 8), new THREE.MeshBasicMaterial({ color: data.accent })); orb.position.set(x, .4 + (i % 2) * .25, z); arenaRoot.add(orb); decor.push(orb); }
}

function makeCar(color, label) {
  const group = new THREE.Group();
  const bodyMat = mat(color, .3, .45), dark = mat(0x111827, .32, .35), glass = new THREE.MeshStandardMaterial({ color: 0x9ceaff, metalness: .5, roughness: .18, emissive: color, emissiveIntensity: .15 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, .48, 1.8), bodyMat); body.position.y = .5; body.castShadow = true; group.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.16, .18, .56), bodyMat); hood.position.set(0, .78, -.47); hood.castShadow = true; group.add(hood);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(.85, .42, .78), glass); cabin.position.set(0, .86, .34); cabin.castShadow = true; group.add(cabin);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.32, .15, .18), dark); bumper.position.set(0, .36, -.94); group.add(bumper);
  for (const x of [-.69, .69]) for (const z of [-.56, .58]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.23, .23, .16, 16), dark); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, .27, z); wheel.castShadow = true; group.add(wheel); }
  for (const x of [-.42, .42]) { const lamp = new THREE.Mesh(new THREE.BoxGeometry(.22, .1, .06), new THREE.MeshBasicMaterial({ color: 0xc8f7ff })); lamp.position.set(x, .52, -.92); group.add(lamp); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.93, .035, 8, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .7 })); ring.rotation.x = Math.PI / 2; ring.position.y = .08; group.add(ring);
  group.userData = { label, ring };
  return group;
}

function startGame() {
  app.innerHTML = `<main class="game-screen"><div id="game-canvas"></div><div class="game-vignette"></div><header class="game-top"><button id="back" class="back-button">← MENU</button><div class="game-title"><span>BA</span> BUMPER ARENA <small>// ${arenaNames[selectedArena].toUpperCase()}</small></div><div class="round-label">PREMIER À 3 <b>·</b> SANS CHRONO</div></header><section class="hud"><div class="player-hud p1"><div class="hud-head"><span class="pilot-tag"><i></i> PILOTE 01</span><span class="score" id="score-0">0</span></div><div class="health-track"><i id="health-0"></i></div><div class="health-caption"><span>INTÉGRITÉ</span><b id="hp-0">100</b></div></div><div class="score-center"><span>ROUND</span><b id="round-num">01</b><i>VS</i></div><div class="player-hud p2"><div class="hud-head"><span class="pilot-tag"><i></i> PILOTE 02</span><span class="score" id="score-1">0</span></div><div class="health-track"><i id="health-1"></i></div><div class="health-caption"><span>INTÉGRITÉ</span><b id="hp-1">100</b></div></div></section><div id="round-toast" class="round-toast"><span>ROUND 01</span><b>PRÉPAREZ-VOUS</b><small>3 éliminations pour gagner</small></div><div class="game-bottom"><span>⌨ P1&nbsp; ZQSD / WASD · ESPACE TIR</span><span class="cover-hint">UTILISE LES MURS COMME COUVERTURE</span><span>⌨ P2&nbsp; FLÈCHES · ENTRÉE TIR</span></div><div id="result" class="result-overlay hidden"></div></main>`;
  setupThree(); buildArena(selectedArena);
  match = createMatch(selectedArena);
  players = [makeCar(COLORS[0], 'PILOTE 01'), makeCar(COLORS[1], 'PILOTE 02')];
  players.forEach((p, i) => { p.position.set(i ? 3 : -3, 0, 0); p.rotation.y = i ? Math.PI : 0; scene.add(p); });
  bullets = []; roundDelay = 1.2; running = true; lastFrame = performance.now();
  document.querySelector('#back').addEventListener('click', () => { running = false; window.removeEventListener('resize', resize); menu(); });
  animate();
}

function readInput(player) {
  if (player === 0) return { x: Number(keys.has('d') || keys.has('ArrowRight') && false) - Number(keys.has('a') || keys.has('q')), z: Number(keys.has('s')) - Number(keys.has('w') || keys.has('z')), fire: keys.has(' ') };
  return { x: Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')), z: Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp')), fire: keys.has('Enter') };
}
function createBullet(owner) {
  const car = players[owner], forward = new THREE.Vector3(0, 0, -1).applyQuaternion(car.quaternion);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 10), new THREE.MeshBasicMaterial({ color: COLORS[owner] }));
  mesh.position.copy(car.position).addScaledVector(forward, 1.12); mesh.position.y = .55; scene.add(mesh);
  const glow = new THREE.PointLight(COLORS[owner], 2.2, 3); mesh.add(glow);
  bullets.push({ mesh, owner, velocity: forward.multiplyScalar(17), life: 1.5 });
}
function movePlayer(i, input, dt) {
  const state = match.players[i]; if (state.respawn > 0) { state.respawn -= dt; players[i].visible = Math.floor(state.respawn * 10) % 2 === 0; if (state.respawn <= 0) players[i].visible = true; return; }
  const len = Math.hypot(input.x, input.z);
  if (len > 0) {
    const dx = input.x / len, dz = input.z / len;
    const targetAngle = Math.atan2(-dx, -dz); let diff = ((targetAngle - players[i].rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    players[i].rotation.y += diff * Math.min(1, dt * 10);
    const speed = 7.5;
    state.vx += dx * speed * dt * 5; state.vz += dz * speed * dt * 5;
  }
  const damping = Math.exp(-5.5 * dt); state.vx *= damping; state.vz *= damping;
  const cap = 7.3, velocity = Math.hypot(state.vx, state.vz); if (velocity > cap) { state.vx *= cap / velocity; state.vz *= cap / velocity; }
  const nx = players[i].position.x + state.vx * dt, nz = players[i].position.z + state.vz * dt;
  const arena = ARENAS[selectedArena], bx = arena.width / 2 - .9, bz = arena.depth / 2 - .9;
  players[i].position.x = THREE.MathUtils.clamp(nx, -bx, bx); players[i].position.z = THREE.MathUtils.clamp(nz, -bz, bz);
  // Collision véhicule/couvertures avec recul léger, les murs restent infranchissables.
  for (const o of arena.obstacles) { const [x, z, sx, sz] = o; const px = players[i].position.x, pz = players[i].position.z; const cx = THREE.MathUtils.clamp(px, x - sx / 2 - .62, x + sx / 2 + .62), cz = THREE.MathUtils.clamp(pz, z - sz / 2 - .82, z + sz / 2 + .82); const ox = px - cx, oz = pz - cz; if (ox * ox + oz * oz < .0001) { const ax = px - x, az = pz - z; if (Math.abs(ax / (sx / 2 + .62)) > Math.abs(az / (sz / 2 + .82))) players[i].position.x = x + Math.sign(ax || 1) * (sx / 2 + .63); else players[i].position.z = z + Math.sign(az || 1) * (sz / 2 + .83); state.vx *= -.25; state.vz *= -.25; } }
  if (input.fire && state.cooldown <= 0) { createBullet(i); state.cooldown = .34; }
  state.cooldown = Math.max(0, state.cooldown - dt);
}
function moveBullets(dt) {
  for (let b = bullets.length - 1; b >= 0; b--) {
    const shot = bullets[b]; shot.life -= dt; shot.mesh.position.addScaledVector(shot.velocity, dt);
    const arena = ARENAS[selectedArena]; let hit = shot.life <= 0 || Math.abs(shot.mesh.position.x) > arena.width / 2 - .35 || Math.abs(shot.mesh.position.z) > arena.depth / 2 - .35;
    for (const [x, z, sx, sz] of arena.obstacles) if (Math.abs(shot.mesh.position.x - x) < sx / 2 + .12 && Math.abs(shot.mesh.position.z - z) < sz / 2 + .12) hit = true;
    const other = 1 - shot.owner, target = players[other];
    if (target.visible && Math.hypot(shot.mesh.position.x - target.position.x, shot.mesh.position.z - target.position.z) < .82) {
      damagePlayer(match, other, 20); match.players[other].vx += shot.velocity.x * .27; match.players[other].vz += shot.velocity.z * .27; hit = true;
      if (match.players[other].health <= 0) { match.scores[shot.owner]++; match.players[other].health = 100; match.players[other].respawn = 1.1; match.players[other].vx = match.players[other].vz = 0; roundDelay = 1.1; }
    }
    if (hit) { scene.remove(shot.mesh); bullets.splice(b, 1); }
  }
}
function updateHud() {
  match.players.forEach((player, i) => { const health = Math.max(0, player.health); document.querySelector(`#health-${i}`).style.width = `${health}%`; document.querySelector(`#hp-${i}`).textContent = String(Math.ceil(health)); document.querySelector(`#score-${i}`).textContent = match.scores[i]; });
  document.querySelector('#round-num').textContent = String(match.scores[0] + match.scores[1] + 1).padStart(2, '0');
  const toast = document.querySelector('#round-toast');
  if (roundDelay > 0 && Math.max(...match.scores) < 3) { toast.classList.add('show'); toast.querySelector('span').textContent = `ROUND ${String(match.scores[0] + match.scores[1] + 1).padStart(2, '0')}`; toast.querySelector('b').textContent = 'PRÉPAREZ-VOUS'; } else toast.classList.remove('show');
  if (Math.max(...match.scores) >= 3) { running = false; const winner = match.scores[0] >= 3 ? 0 : 1; const result = document.querySelector('#result'); result.innerHTML = `<div class="result-card"><p class="eyebrow">DUEL TERMINÉ</p><h2>VICTOIRE<br><em>PILOTE 0${winner + 1}</em></h2><p class="result-score">${match.scores[0]} <span>—</span> ${match.scores[1]}</p><button id="again" class="play-button"><span>REJOUER</span><b>↻</b></button><button id="result-menu" class="result-menu">RETOUR AU MENU</button></div>`; result.classList.remove('hidden'); document.querySelector('#again').onclick = startGame; document.querySelector('#result-menu').onclick = () => { window.removeEventListener('resize', resize); menu(); }; }
}
function animate(now = performance.now()) {
  if (!running) return;
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastFrame) / 1000, .04); lastFrame = now; uiClock += dt;
  roundDelay = Math.max(0, roundDelay - dt);
  if (roundDelay <= 0) {
    for (let i = 0; i < 2; i++) movePlayer(i, readInput(i), dt);
    moveBullets(dt);
    stepMatch(match, dt);
  }
  // Caméra fixe légèrement inclinée : lisibilité et vue complète de l'arène.
  const midpoint = players[0].position.clone().add(players[1].position).multiplyScalar(.5);
  camera.position.x += (midpoint.x * .23 - camera.position.x) * Math.min(1, dt * 1.6);
  camera.position.z += ((21 + midpoint.z * .18) - camera.position.z) * Math.min(1, dt * 1.6);
  camera.lookAt(midpoint.x * .2, 0, midpoint.z * .2);
  players.forEach((p, i) => { p.userData.ring.material.opacity = .52 + Math.sin(uiClock * 4 + i) * .13; });
  decor.forEach((obj, i) => { obj.position.y = .45 + Math.sin(uiClock * 2 + i) * .18; });
  if (uiClock > .08) { updateHud(); uiClock = 0; }
  renderer.render(scene, camera);
}

window.addEventListener('keydown', event => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault(); keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key); });
window.addEventListener('keyup', event => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
menu();
