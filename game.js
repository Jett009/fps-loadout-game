import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const weaponCatalog = [
  {
    id: 'pistol',
    name: 'Pistol',
    description: 'Fast sidearm with accurate shots.',
    damage: 24,
    cooldown: 0.18,
    spread: 0.012,
    accent: '#78e8ff',
    badge: 'P',
  },
  {
    id: 'smg',
    name: 'SMG',
    description: 'Rapid-fire spray for close fights.',
    damage: 14,
    cooldown: 0.085,
    spread: 0.06,
    accent: '#9ae65d',
    badge: 'S',
  },
  {
    id: 'shotgun',
    name: 'Shotgun',
    description: 'Heavy burst damage in a tight cone.',
    damage: 18,
    cooldown: 0.55,
    spread: 0.2,
    pellets: 6,
    accent: '#f8b84f',
    badge: 'SH',
  },
  {
    id: 'rifle',
    name: 'Rifle',
    description: 'Precision rifle with longer reach.',
    damage: 30,
    cooldown: 0.22,
    spread: 0.03,
    accent: '#e38cfb',
    badge: 'R',
  },
];

const weaponMap = Object.fromEntries(weaponCatalog.map((weapon) => [weapon.id, weapon]));

const menuOverlay = document.getElementById('menuOverlay');
const weaponGrid = document.getElementById('weaponGrid');
const selectedList = document.getElementById('selectedList');
const startButton = document.getElementById('startButton');
const gameHud = document.getElementById('gameHud');
const healthValue = document.getElementById('healthValue');
const weaponValue = document.getElementById('weaponValue');
const loadoutValue = document.getElementById('loadoutValue');

const state = {
  selectedWeapons: new Set(['pistol', 'smg']),
  inventory: ['pistol', 'smg'],
  currentWeaponIndex: 0,
  started: false,
  health: 100,
  canFire: true,
  fireCooldown: 0,
  yaw: 0,
  pitch: 0,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x09111b);
scene.fog = new THREE.Fog(0x09111b, 10, 42);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 200);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const keys = {};
const raycaster = new THREE.Raycaster();

const floorSize = 40;
const tileSize = 5;

const player = {
  height: 1.7,
  speed: 8.8,
  position: new THREE.Vector3(-6, 1.7, -10),
};

const enemies = [];
const enemyMeshes = [];
const environment = new THREE.Group();
scene.add(environment);

const mapRows = [
  '####################',
  '#..................#',
  '#.###.##....##.##.#',
  '#.....#....#....#.#',
  '#.##.#.##.#.##.#.#',
  '#....#....#....#.#',
  '#.##.#.##.#.##.#.#',
  '#....#....#....#.#',
  '#.##....##....#.#',
  '#................#',
  '#.##.##..##.##....#',
  '#....#.....#..##.#',
  '#.##.#.###.#..#..#',
  '#.....#...#....#.#',
  '#.###.#.#.#.##.#.#',
  '#......#.....#....#',
  '####################',
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateLoadoutSummary() {
  const selected = [...state.selectedWeapons];
  selectedList.textContent = selected.length
    ? selected.map((id) => weaponMap[id].name).join(' • ')
    : 'Pistol';
}

function buildWeaponCards() {
  weaponGrid.innerHTML = '';

  weaponCatalog.forEach((weapon) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'weapon-card';
    if (state.selectedWeapons.has(weapon.id)) {
      button.classList.add('selected');
    }

    button.innerHTML = `
      <div class="weapon-card-header">
        <h2>${weapon.name}</h2>
        <span class="weapon-badge" style="color:${weapon.accent}; border:1px solid ${weapon.accent}; background: rgba(255,255,255,0.03);">${weapon.badge}</span>
      </div>
      <p>${weapon.description}</p>
    `;

    button.addEventListener('click', () => {
      if (state.selectedWeapons.has(weapon.id)) {
        state.selectedWeapons.delete(weapon.id);
      } else {
        if (state.selectedWeapons.size >= 3) {
          const [first] = state.selectedWeapons;
          state.selectedWeapons.delete(first);
        }
        state.selectedWeapons.add(weapon.id);
      }
      updateLoadoutSummary();
      renderWeaponCards();
    });

    weaponGrid.appendChild(button);
  });
}

function renderWeaponCards() {
  buildWeaponCards();
}

function getPlayerSpawn() {
  return new THREE.Vector3(-7, player.height, -12);
}

function makeWall(x, z) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(tileSize, 3.8, tileSize),
    new THREE.MeshStandardMaterial({
      color: 0x24364d,
      roughness: 0.74,
      metalness: 0.18,
      emissive: 0x0a1220,
    }),
  );

  wall.position.set(x, 1.9, z);
  environment.add(wall);
}

function buildArena() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(floorSize, floorSize),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 1, metalness: 0.1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  environment.add(floor);

  const gridHelper = new THREE.GridHelper(floorSize, floorSize, 0x2dd4bf, 0x1f2937);
  gridHelper.position.y = 0.02;
  environment.add(gridHelper);

  const light = new THREE.DirectionalLight(0xcfe7ff, 1.2);
  light.position.set(10, 18, 8);
  scene.add(light);

  const ambient = new THREE.HemisphereLight(0x93c5fd, 0x0b1020, 0.9);
  scene.add(ambient);

  mapRows.forEach((row, rowIndex) => {
    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      if (row[colIndex] === '#') {
        const x = colIndex * tileSize - (row.length * tileSize) / 2 + tileSize / 2;
        const z = rowIndex * tileSize - (mapRows.length * tileSize) / 2 + tileSize / 2;
        makeWall(x, z);
      }
    }
  });
}

function createEnemy(x, z) {
  const enemy = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 2, 1.3),
    new THREE.MeshStandardMaterial({ color: 0xff5b73, emissive: 0x36010f, metalness: 0.2, roughness: 0.7 }),
  );

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf7d9d9, emissive: 0x211212, roughness: 0.7 }),
  );
  head.position.y = 1.55;
  body.position.y = 1;

  enemy.add(body);
  enemy.add(head);
  enemy.position.set(x, 0, z);

  enemy.userData.health = 88;
  enemy.userData.speed = 1.8 + Math.random() * 1.6;
  enemy.userData.cooldown = 0;

  body.userData.enemy = enemy;
  head.userData.enemy = enemy;

  enemyMeshes.push(body, head);
  enemies.push(enemy);
  scene.add(enemy);
}

function spawnEnemies() {
  const spawnPoints = [
    [-8, 12],
    [10, 10],
    [12, -8],
    [-12, 4],
    [3, -11],
    [7, 6],
    [-2, 10],
    [15, 0],
  ];

  spawnPoints.forEach(([x, z]) => createEnemy(x * 1.2, z * 1.2));
}

function positionInMap(x, z) {
  const column = Math.floor((x + floorSize / 2) / tileSize);
  const row = Math.floor((z + floorSize / 2) / tileSize);

  if (row < 0 || row >= mapRows.length || column < 0 || column >= mapRows[0].length) {
    return true;
  }

  return mapRows[row][column] === '#';
}

function tryMovePlayer(moveX, moveZ) {
  const nextX = player.position.x + moveX;
  const nextZ = player.position.z + moveZ;

  const stepX = positionInMap(nextX, player.position.z) ? 0 : moveX;
  const stepZ = positionInMap(player.position.x, nextZ) ? 0 : moveZ;

  player.position.x += stepX;
  player.position.z += stepZ;

  player.position.x = clamp(player.position.x, -floorSize / 2 + 1.5, floorSize / 2 - 1.5);
  player.position.z = clamp(player.position.z, -floorSize / 2 + 1.5, floorSize / 2 - 1.5);
}

function updatePlayer(delta) {
  const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
  const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  const move = new THREE.Vector3();

  if (keys.KeyW) move.add(forward);
  if (keys.KeyS) move.sub(forward);
  if (keys.KeyA) move.sub(right);
  if (keys.KeyD) move.add(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(player.speed * delta);
    tryMovePlayer(move.x, move.z);
  }

  camera.position.set(player.position.x, player.position.y, player.position.z);
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;
}

function getWeapon() {
  return weaponMap[state.inventory[state.currentWeaponIndex]] ?? weaponMap.pistol;
}

function setWeapon(index) {
  if (!state.inventory.length) return;
  state.currentWeaponIndex = ((index % state.inventory.length) + state.inventory.length) % state.inventory.length;
  const weapon = getWeapon();
  weaponValue.textContent = weapon.name;
}

function updateHud() {
  const weapon = getWeapon();
  healthValue.textContent = String(Math.max(0, Math.round(state.health)));
  weaponValue.textContent = weapon.name;
  loadoutValue.textContent = state.inventory.map((id) => weaponMap[id].name).join(' • ');
}

function handleShot() {
  if (!state.started || !state.canFire) return;

  const weapon = getWeapon();
  state.canFire = false;
  state.fireCooldown = weapon.cooldown;

  const pelletCount = weapon.pellets ?? 1;
  const shotDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

  for (let index = 0; index < pelletCount; index += 1) {
    const shotVector = shotDirection.clone();
    const spread = weapon.spread ?? 0.02;
    shotVector.x += (Math.random() - 0.5) * spread;
    shotVector.y += (Math.random() - 0.5) * spread;
    shotVector.z += (Math.random() - 0.5) * spread;
    shotVector.normalize();

    raycaster.set(camera.position, shotVector);
    const hits = raycaster.intersectObjects(enemyMeshes, true);

    if (!hits.length) continue;

    const target = hits[0].object.userData.enemy ?? hits[0].object.parent?.userData.enemy;
    if (!target) continue;

    target.userData.health -= weapon.damage;
    if (target.userData.health <= 0) {
      target.visible = false;
      const indexToRemove = enemies.indexOf(target);
      if (indexToRemove >= 0) {
        enemies.splice(indexToRemove, 1);
      }
      for (let i = enemyMeshes.length - 1; i >= 0; i -= 1) {
        if (enemyMeshes[i].userData.enemy === target) {
          enemyMeshes.splice(i, 1);
        }
      }
      scene.remove(target);
    }
  }
}

function updateEnemies(delta) {
  for (const enemy of enemies) {
    const toPlayer = player.position.clone().sub(enemy.position);
    const distance = toPlayer.length();

    enemy.userData.cooldown = Math.max(0, enemy.userData.cooldown - delta);

    if (distance > 0.1) {
      const direction = toPlayer.normalize();
      const movement = direction.multiplyScalar(enemy.userData.speed * delta);
      const proposedX = enemy.position.x + movement.x;
      const proposedZ = enemy.position.z + movement.z;

      if (!positionInMap(proposedX, enemy.position.z)) {
        enemy.position.x = proposedX;
      }
      if (!positionInMap(enemy.position.x, proposedZ)) {
        enemy.position.z = proposedZ;
      }

      enemy.lookAt(player.position.x, enemy.position.y + 1.4, player.position.z);
    }

    if (distance < 2.2 && enemy.userData.cooldown <= 0) {
      state.health -= 8;
      enemy.userData.cooldown = 0.9;
      state.health = clamp(state.health, 0, 100);
      if (state.health <= 0) {
        endMission('Mission failed. The arena took you down.');
      }
    }
  }

  updateHud();
}

function endMission(message) {
  state.started = false;
  menuOverlay.classList.remove('hidden');
  gameHud.classList.add('hidden');
  document.exitPointerLock();
  const display = document.getElementById('selectedList');
  display.textContent = message;
  startButton.textContent = 'Restart Mission';
  if (state.inventory.length === 0) {
    state.inventory = ['pistol'];
  }
}

function startGame() {
  state.inventory = [...state.selectedWeapons];
  if (!state.inventory.length) {
    state.inventory = ['pistol'];
  }
  state.currentWeaponIndex = 0;
  state.started = true;
  state.health = 100;
  state.canFire = true;
  state.fireCooldown = 0;

  const spawn = getPlayerSpawn();
  player.position.copy(spawn);
  camera.position.copy(spawn);

  menuOverlay.classList.add('hidden');
  gameHud.classList.remove('hidden');

  const activeWeapon = getWeapon();
  weaponValue.textContent = activeWeapon.name;
  loadoutValue.textContent = state.inventory.map((id) => weaponMap[id].name).join(' • ');

  setTimeout(() => {
    renderer.domElement.requestPointerLock?.();
  }, 50);
}

startButton.addEventListener('click', () => {
  startGame();
});

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;

  if (event.code === 'Digit1') setWeapon(0);
  if (event.code === 'Digit2') setWeapon(1);
  if (event.code === 'Digit3') setWeapon(2);
  if (event.code === 'Digit4') setWeapon(3);

  if (event.code === 'Escape' && state.started) {
    document.exitPointerLock();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

window.addEventListener('mousemove', (event) => {
  if (!state.started || document.pointerLockElement !== renderer.domElement) {
    return;
  }

  state.yaw -= event.movementX * 0.0022;
  state.pitch -= event.movementY * 0.0018;
  state.pitch = clamp(state.pitch, -1.45, 1.45);
});

window.addEventListener('mousedown', (event) => {
  if (event.button !== 0 || !state.started) return;
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock?.();
    return;
  }
  handleShot();
});

window.addEventListener('wheel', (event) => {
  if (!state.started || !state.inventory.length) return;
  const delta = event.deltaY > 0 ? 1 : -1;
  setWeapon(state.currentWeaponIndex + delta);
}, { passive: true });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

buildArena();
spawnEnemies();
renderWeaponCards();
updateLoadoutSummary();
updateHud();

camera.position.copy(player.position);

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  if (state.started) {
    if (!state.canFire) {
      state.fireCooldown -= delta;
      if (state.fireCooldown <= 0) {
        state.canFire = true;
      }
    }

    updatePlayer(delta);
    updateEnemies(delta);
  }

  renderer.render(scene, camera);
}

animate();
