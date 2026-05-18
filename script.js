/* ============================================
   WERRIBEE RIVER ECOSYSTEM - GAME LOGIC
   ============================================ */

const canvas = document.getElementById('ecosystem');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const PIXEL_SIZE = 8;
const GRID_W = Math.floor(canvas.width / PIXEL_SIZE);
const GRID_H = Math.floor(canvas.height / PIXEL_SIZE);

let gameState = {
  creatures: [],
  robots: [],
  paused: false,
  robotCode: [],
  gameTime: 0
};

/* ============ Creature Class ============ */
class Creature {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.5;
    this.age = 0;
    this.alive = true;

    this.colors = {
      frog: '#2ecc71',
      fish: '#3498db',
      egg: '#f4d03f',
      mosquito: '#e74c3c'
    };
  }

  update() {
    // Movement
    this.x += this.vx;
    this.y += this.vy;
    this.age++;

    // Boundary wrapping
    if (this.x < 0 || this.x >= GRID_W) this.vx *= -1;
    if (this.y < 0 || this.y >= GRID_H) this.vy *= -1;
    this.x = Math.max(0, Math.min(GRID_W - 1, this.x));
    this.y = Math.max(0, Math.min(GRID_H - 1, this.y));

    // Mosquito fish lifespan
    if (this.type === 'mosquito' && this.age > 1200) return false;

    // Eggs hatch into frogs
    if (this.type === 'egg' && this.age > 300) {
      gameState.creatures.push(new Creature('frog', this.x, this.y));
      return false;
    }

    // Random egg laying by frogs
    if (this.type === 'frog' && Math.random() < 0.001 && gameState.creatures.filter(c => c.type === 'egg').length < 5) {
      gameState.creatures.push(new Creature('egg', this.x + (Math.random() - 0.5) * 10, this.y + (Math.random() - 0.5) * 10));
    }

    return this.alive;
  }

  render() {
    ctx.fillStyle = this.colors[this.type] || '#fff';
    const px = Math.floor(this.x) * PIXEL_SIZE;
    const py = Math.floor(this.y) * PIXEL_SIZE;

    if (this.type === 'egg') {
      ctx.fillRect(px + 2, py + 2, 4, 4);
    } else {
      ctx.fillRect(px, py, PIXEL_SIZE, PIXEL_SIZE);
    }
  }

  distance(other) {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }
}

/* ============ Robot Class ============ */
class Robot {
  constructor(x, y, code) {
    this.x = x;
    this.y = y;
    this.code = code;
    this.age = 0;
  }

  update() {
    this.age++;

    // Find mosquito fish in range
    const mosquitoInRange = gameState.creatures.filter(
      c => c.type === 'mosquito' && this.distance(c) < 120
    );

    // Execute code logic
    if (mosquitoInRange.length > 0 && this.code.includes('mosquito')) {
      const target = mosquitoInRange[0];
      if (this.code.includes('rotate')) {
        gameState.creatures = gameState.creatures.filter(c => c !== target);
      }
    }

    return this.age < 2500;
  }

  render() {
    ctx.fillStyle = '#f39c12';
    const px = Math.floor(this.x) * PIXEL_SIZE;
    const py = Math.floor(this.y) * PIXEL_SIZE;

    // Draw robot body
    ctx.fillRect(px, py, PIXEL_SIZE + 2, PIXEL_SIZE + 2);

    // Draw sensor outline
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1, py + 1, PIXEL_SIZE, PIXEL_SIZE);

    // Draw antenna
    ctx.strokeStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(px + PIXEL_SIZE, py);
    ctx.lineTo(px + PIXEL_SIZE + 4, py - 4);
    ctx.stroke();
  }

  distance(other) {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }
}

/* ============ Game Functions ============ */
function initEcosystem() {
  gameState.creatures = [];
  gameState.robots = [];
  gameState.paused = false;
  gameState.robotCode = [];
  gameState.gameTime = 0;

  // Create initial population
  for (let i = 0; i < 5; i++) {
    gameState.creatures.push(new Creature('frog', Math.random() * GRID_W, Math.random() * GRID_H));
  }
  for (let i = 0; i < 3; i++) {
    gameState.creatures.push(new Creature('fish', Math.random() * GRID_W, Math.random() * GRID_H));
  }
  for (let i = 0; i < 2; i++) {
    gameState.creatures.push(new Creature('egg', Math.random() * GRID_W, Math.random() * GRID_H));
  }
}

function addMosquitoFish() {
  for (let i = 0; i < 3; i++) {
    gameState.creatures.push(new Creature('mosquito', Math.random() * GRID_W, Math.random() * GRID_H));
  }
}

function addCodeBlock(block) {
  gameState.robotCode.push(block);
  updateRobotCodeDisplay();
}

function clearRobotCode() {
  gameState.robotCode = [];
  updateRobotCodeDisplay();
}

function updateRobotCodeDisplay() {
  const codeEl = document.getElementById('robot-code');
  if (gameState.robotCode.length === 0) {
    codeEl.innerHTML = '<span style="color: #555;">Click blocks to build your program...</span>';
  } else {
    codeEl.innerHTML = gameState.robotCode.map((block, i) => {
      const indent = block.startsWith('  >') ? '  ' : '';
      return `<div style="margin: 4px 0;">${indent}${block}</div>`;
    }).join('');
  }
}

function deployRobot() {
  if (gameState.robotCode.length === 0) {
    alert('Add at least one code block to your robot!');
    return;
  }

  const robot = new Robot(
    Math.random() * GRID_W,
    Math.random() * GRID_H,
    gameState.robotCode.slice()
  );
  gameState.robots.push(robot);
  gameState.robotCode = [];
  updateRobotCodeDisplay();
}

function updateStats() {
  document.getElementById('frog-count').textContent = gameState.creatures.filter(c => c.type === 'frog').length;
  document.getElementById('fish-count').textContent = gameState.creatures.filter(c => c.type === 'fish').length;
  document.getElementById('mosq-count').textContent = gameState.creatures.filter(c => c.type === 'mosquito').length;
  document.getElementById('robot-count').textContent = gameState.robots.length;
}

/* ============ Main Game Loop ============ */
function gameLoop() {
  // Clear and paint background
  ctx.fillStyle = '#e0f6ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!gameState.paused) {
    gameState.gameTime++;

    // Update creatures
    gameState.creatures = gameState.creatures.filter(c => c.update());

    // Update robots
    gameState.robots = gameState.robots.filter(r => r.update());

    // Mosquito fish attack nearby creatures
    gameState.creatures.forEach(mosquito => {
      if (mosquito.type === 'mosquito') {
        gameState.creatures.forEach(target => {
          if (['frog', 'fish', 'egg'].includes(target.type) && mosquito.distance(target) < 20) {
            target.alive = false;
          }
        });
      }
    });

    // Remove dead creatures
    gameState.creatures = gameState.creatures.filter(c => c.alive !== false);
  }

  // Render all creatures
  gameState.creatures.forEach(c => c.render());

  // Render all robots
  gameState.robots.forEach(r => r.render());

  // Update UI stats
  updateStats();

  // Continue loop
  requestAnimationFrame(gameLoop);
}

/* ============ UI Functions ============ */
function showModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function togglePause() {
  gameState.paused = !gameState.paused;
  document.getElementById('pause-btn').textContent = gameState.paused ? '▶ Resume' : '⏸ Pause';
}

function resetEcosystem() {
  initEcosystem();
  document.getElementById('pause-btn').textContent = '⏸ Pause';
}

/* ============ Initialize ============ */
initEcosystem();
gameLoop();
