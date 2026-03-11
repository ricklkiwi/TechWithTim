// ============================================================
// PIXEL ASSAULT — Top-Down Shooter
// ============================================================

const CANVAS_W = 800;
const CANVAS_H = 600;
const PLAYER_SPEED = 2.5;
const PLAYER_SHOOT_RATE = 15;
const BULLET_SPEED = 7;
const BULLET_DAMAGE = 10;
const PLAYER_MAX_HP = 100;
const ENEMY_CONTACT_DAMAGE = 10;
const PLAYER_INVINCIBLE_FRAMES = 60;
const TRANSITION_DURATION = 150; // frames (~2.5s at 60fps)

// ============================================================
// LEVEL CONFIGS
// ============================================================
const LEVELS = [
  {
    name: "SECTOR 1",
    enemySpeedMult: 1.0,
    enemyHpMult: 1.0,
    waves: [
      { enemies: [{ type: "basic", count: 5 }], spawnInterval: 90 },
    ],
  },
  {
    name: "SECTOR 2",
    enemySpeedMult: 1.1,
    enemyHpMult: 1.2,
    waves: [
      { enemies: [{ type: "basic", count: 5 }], spawnInterval: 80 },
      { enemies: [{ type: "fast", count: 4 }, { type: "basic", count: 3 }], spawnInterval: 70 },
    ],
  },
  {
    name: "SECTOR 3",
    enemySpeedMult: 1.2,
    enemyHpMult: 1.4,
    waves: [
      { enemies: [{ type: "basic", count: 6 }, { type: "fast", count: 3 }], spawnInterval: 70 },
      { enemies: [{ type: "tank", count: 1 }, { type: "basic", count: 4 }], spawnInterval: 90 },
      { enemies: [{ type: "fast", count: 5 }, { type: "tank", count: 1 }], spawnInterval: 70 },
    ],
  },
  {
    name: "SECTOR 4",
    enemySpeedMult: 1.35,
    enemyHpMult: 1.7,
    waves: [
      { enemies: [{ type: "basic", count: 10 }], spawnInterval: 50 },
      { enemies: [{ type: "fast", count: 7 }, { type: "basic", count: 5 }], spawnInterval: 50 },
      { enemies: [{ type: "tank", count: 2 }, { type: "basic", count: 8 }], spawnInterval: 60 },
    ],
  },
  {
    name: "SECTOR 5",
    enemySpeedMult: 1.5,
    enemyHpMult: 2.0,
    waves: [
      { enemies: [{ type: "fast", count: 6 }, { type: "basic", count: 6 }], spawnInterval: 50 },
      { enemies: [{ type: "tank", count: 2 }, { type: "fast", count: 5 }], spawnInterval: 60 },
      { enemies: [{ type: "basic", count: 10 }, { type: "fast", count: 4 }], spawnInterval: 45 },
      { enemies: [{ type: "tank", count: 3 }, { type: "fast", count: 6 }], spawnInterval: 55 },
    ],
  },
];

// ============================================================
// GAME STATE
// ============================================================
const GameState = {
  state: "MENU", // MENU | PLAYING | LEVEL_TRANSITION | GAME_OVER
  levelIndex: 0,
  score: 0,
  victory: false,
  transitionTimer: 0,

  reset() {
    this.state = "MENU";
    this.levelIndex = 0;
    this.score = 0;
    this.victory = false;
    this.transitionTimer = 0;
  },

  startGame() {
    this.levelIndex = 0;
    this.score = 0;
    this.victory = false;
    this.state = "PLAYING";
    initLevel();
  },

  nextLevel() {
    this.levelIndex++;
    if (this.levelIndex >= LEVELS.length) {
      this.state = "GAME_OVER";
      this.victory = true;
    } else {
      this.state = "LEVEL_TRANSITION";
      this.transitionTimer = TRANSITION_DURATION;
    }
  },

  finishTransition() {
    this.state = "PLAYING";
    initLevel();
  },

  gameOver() {
    this.state = "GAME_OVER";
    this.victory = false;
  },
};

// ============================================================
// INPUT
// ============================================================
const Input = {
  keys: {},
  mouse: { x: CANVAS_W / 2, y: CANVAS_H / 2, down: false, clicked: false },
  _canvas: null,

  init(canvas) {
    this._canvas = canvas;
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown") {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      this.mouse.x = (e.clientX - rect.left) * scaleX;
      this.mouse.y = (e.clientY - rect.top) * scaleY;
    });
    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; }
    });
    canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouse.down = false;
    });
    // prevent context menu
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  },

  clearFrame() {
    this.mouse.clicked = false;
  },
};

// ============================================================
// PARTICLE SYSTEM
// ============================================================
const Particles = {
  list: [],

  emit(x, y, color, count = 8, speed = 3, life = 40) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = speed * (0.5 + Math.random() * 0.8);
      this.list.push({
        x, y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        life,
        maxLife: life,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  },

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  },

  draw(ctx) {
    for (const p of this.list) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  },

  clear() { this.list = []; },
};

// ============================================================
// PLAYER
// ============================================================
const Player = {
  x: CANVAS_W / 2,
  y: CANVAS_H / 2,
  radius: 14,
  hp: PLAYER_MAX_HP,
  angle: 0,
  shootCooldown: 0,
  invincibleTimer: 0,
  legFrame: 0,
  legTimer: 0,
  isMoving: false,

  reset() {
    this.x = CANVAS_W / 2;
    this.y = CANVAS_H / 2;
    this.hp = PLAYER_MAX_HP;
    this.angle = 0;
    this.shootCooldown = 0;
    this.invincibleTimer = 0;
    this.legFrame = 0;
    this.legTimer = 0;
    this.isMoving = false;
  },

  update(dt, bullets) {
    // Movement
    let dx = 0, dy = 0;
    if (Input.keys["ArrowLeft"] || Input.keys["KeyA"]) dx -= 1;
    if (Input.keys["ArrowRight"] || Input.keys["KeyD"]) dx += 1;
    if (Input.keys["ArrowUp"] || Input.keys["KeyW"]) dy -= 1;
    if (Input.keys["ArrowDown"] || Input.keys["KeyS"]) dy += 1;
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    this.isMoving = dx !== 0 || dy !== 0;
    this.x = Math.max(this.radius, Math.min(CANVAS_W - this.radius, this.x + dx * PLAYER_SPEED * dt));
    this.y = Math.max(this.radius, Math.min(CANVAS_H - this.radius, this.y + dy * PLAYER_SPEED * dt));

    // Aim toward mouse
    this.angle = Math.atan2(Input.mouse.y - this.y, Input.mouse.x - this.x);

    // Leg animation
    if (this.isMoving) {
      this.legTimer += dt;
      if (this.legTimer >= 10) { this.legTimer = 0; this.legFrame = 1 - this.legFrame; }
    }

    // Shooting
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (Input.mouse.down && this.shootCooldown <= 0) {
      this.shoot(bullets);
      this.shootCooldown = PLAYER_SHOOT_RATE;
    }

    // Invincibility
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
  },

  shoot(bullets) {
    const gunLen = 16;
    const bx = this.x + Math.cos(this.angle) * gunLen;
    const by = this.y + Math.sin(this.angle) * gunLen;
    bullets.push(new Bullet(bx, by, this.angle));
  },

  takeDamage(amount) {
    if (this.invincibleTimer > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invincibleTimer = PLAYER_INVINCIBLE_FRAMES;
    Particles.emit(this.x, this.y, "#ff4444", 10, 4, 30);
    return true;
  },

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Invincibility flicker
    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 5) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Legs
    const legSpread = this.legFrame === 0 ? 5 : -5;
    ctx.fillStyle = "#3a3a6a";
    // Left leg
    ctx.fillRect(-5, 10, 6, 12 + (this.isMoving ? legSpread : 0));
    // Right leg
    ctx.fillRect(0, 10, 6, 12 + (this.isMoving ? -legSpread : 0));

    // Torso
    ctx.fillStyle = "#555577";
    ctx.fillRect(-10, -8, 20, 20);

    // Head
    ctx.fillStyle = "#f0c896";
    ctx.beginPath();
    ctx.arc(0, -14, 8, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (simple dots relative to aim direction)
    ctx.fillStyle = "#333";
    const ex = Math.cos(this.angle) * 4;
    const ey = Math.sin(this.angle) * 4;
    ctx.beginPath();
    ctx.arc(ex + 3, ey - 14, 2, 0, Math.PI * 2);
    ctx.fill();

    // Gun arm
    ctx.rotate(this.angle);
    ctx.fillStyle = "#444466";
    ctx.fillRect(4, -3, 16, 6);
    // Gun barrel
    ctx.fillStyle = "#222233";
    ctx.fillRect(16, -2, 8, 4);

    ctx.globalAlpha = 1;
    ctx.restore();
  },
};

// ============================================================
// BULLET
// ============================================================
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * BULLET_SPEED;
    this.vy = Math.sin(angle) * BULLET_SPEED;
    this.radius = 5;
    this.life = 120;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (
      this.life <= 0 ||
      this.x < -10 || this.x > CANVAS_W + 10 ||
      this.y < -10 || this.y > CANVAS_H + 10
    ) {
      this.dead = true;
    }
  }

  draw(ctx) {
    // Glow ring
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,220,50,0.4)";
    ctx.fill();
    // Core
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,220,50,0.9)";
    ctx.fill();
    // Center dot
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
}

// ============================================================
// ENEMY BASE + TYPES
// ============================================================
class Enemy {
  constructor(x, y, type, speedMult, hpMult) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.dead = false;
    this.legFrame = 0;
    this.legTimer = 0;

    switch (type) {
      case "basic":
        this.speed = 0.8 * speedMult;
        this.hp = Math.round(30 * hpMult);
        this.maxHp = this.hp;
        this.radius = 14;
        this.scoreValue = 10;
        this.color = "#e05252";
        this.eyeColor = "#ff9999";
        break;
      case "fast":
        this.speed = 1.8 * speedMult;
        this.hp = Math.round(15 * hpMult);
        this.maxHp = this.hp;
        this.radius = 10;
        this.scoreValue = 20;
        this.color = "#52b0e0";
        this.eyeColor = "#aaddff";
        break;
      case "tank":
        this.speed = 0.4 * speedMult;
        this.hp = Math.round(120 * hpMult);
        this.maxHp = this.hp;
        this.radius = 22;
        this.scoreValue = 50;
        this.color = "#a852e0";
        this.eyeColor = "#dd99ff";
        this.treadOffset = 0;
        break;
    }
  }

  update(dt) {
    const dx = Player.x - this.x;
    const dy = Player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }

    // Leg / tread animation
    this.legTimer += dt;
    if (this.legTimer >= (this.type === "fast" ? 7 : 12)) {
      this.legTimer = 0;
      this.legFrame = 1 - this.legFrame;
    }
    if (this.type === "tank") {
      this.treadOffset = (this.treadOffset + this.speed * dt * 0.5) % 8;
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dead = true;
      Particles.emit(this.x, this.y, this.color, 14, 3.5, 50);
      return true;
    }
    Particles.emit(this.x, this.y, "#ffffff", 4, 2, 20);
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.type === "tank") {
      this._drawTank(ctx);
    } else if (this.type === "fast") {
      this._drawFast(ctx);
    } else {
      this._drawBasic(ctx);
    }

    // HP bar (only if damaged)
    if (this.hp < this.maxHp) {
      const barW = this.radius * 2.4;
      const barH = 4;
      const bx = -barW / 2;
      const by = -this.radius - 10;
      ctx.fillStyle = "#333";
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = "#55ee55";
      ctx.fillRect(bx, by, barW * (this.hp / this.maxHp), barH);
    }

    ctx.restore();
  }

  _drawBasic(ctx) {
    const leg = this.legFrame === 0 ? 4 : -4;
    // Legs
    ctx.fillStyle = "#aa3333";
    ctx.fillRect(-8, 8, 7, 10 + leg);
    ctx.fillRect(2, 8, 7, 10 - leg);
    // Body
    ctx.fillStyle = this.color;
    ctx.fillRect(-10, -8, 20, 18);
    // Head
    ctx.fillStyle = "#c04040";
    ctx.fillRect(-8, -16, 16, 10);
    // Eyes
    ctx.fillStyle = this.eyeColor;
    ctx.fillRect(-6, -14, 4, 4);
    ctx.fillRect(3, -14, 4, 4);
  }

  _drawFast(ctx) {
    const leg = this.legFrame === 0 ? 7 : -7;
    // Slim legs with exaggerated swing
    ctx.fillStyle = "#2277aa";
    ctx.fillRect(-5, 6, 4, 10 + leg);
    ctx.fillRect(2, 6, 4, 10 - leg);
    // Slim body
    ctx.fillStyle = this.color;
    ctx.fillRect(-7, -6, 14, 14);
    // Head
    ctx.fillStyle = "#3a8ab0";
    ctx.fillRect(-5, -13, 10, 8);
    // Eyes
    ctx.fillStyle = this.eyeColor;
    ctx.fillRect(-3, -11, 2, 3);
    ctx.fillRect(2, -11, 2, 3);
  }

  _drawTank(ctx) {
    const r = this.radius;
    // Treads (animated horizontal bands)
    const treadColors = ["#5a2a7a", "#7a3a9a"];
    for (let i = 0; i < 4; i++) {
      const ty = -r + i * 12 + (this.treadOffset % 12);
      if (ty < -r - 2 || ty > r + 2) continue;
      ctx.fillStyle = treadColors[i % 2];
      ctx.fillRect(-r, ty - r + 4, r * 2, 10);
    }
    // Main hull
    ctx.fillStyle = this.color;
    ctx.fillRect(-r + 4, -r + 6, (r - 4) * 2, (r - 6) * 2);
    // Turret base
    ctx.fillStyle = "#8838c0";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    // Cannon (points toward player)
    const dx = Player.x - this.x;
    const dy = Player.y - this.y;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = "#5a1a8a";
    ctx.fillRect(r * 0.3, -4, r * 0.7, 8);
    ctx.restore();
    // Eyes / sensor dots
    ctx.fillStyle = this.eyeColor;
    ctx.beginPath();
    ctx.arc(-5, -3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -3, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================
// WAVE MANAGER
// ============================================================
const WaveManager = {
  waveIndex: 0,
  spawnQueue: [],
  spawnTimer: 0,
  enemies: [],
  levelConfig: null,
  allSpawned: false,

  init(levelConfig) {
    this.levelConfig = levelConfig;
    this.waveIndex = 0;
    this.enemies = [];
    this.allSpawned = false;
    this._loadWave();
  },

  _loadWave() {
    const wave = this.levelConfig.waves[this.waveIndex];
    this.spawnQueue = [];
    for (const group of wave.enemies) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push(group.type);
      }
    }
    // Shuffle spawn queue
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
    this.spawnTimer = 0;
    this.allSpawned = false;
  },

  _spawnEnemy(type) {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    const margin = 30;
    if (edge === 0) { x = Math.random() * CANVAS_W; y = -margin; }
    else if (edge === 1) { x = CANVAS_W + margin; y = Math.random() * CANVAS_H; }
    else if (edge === 2) { x = Math.random() * CANVAS_W; y = CANVAS_H + margin; }
    else { x = -margin; y = Math.random() * CANVAS_H; }

    const lc = this.levelConfig;
    this.enemies.push(new Enemy(x, y, type, lc.enemySpeedMult, lc.enemyHpMult));
  },

  get currentWave() { return this.waveIndex; },
  get totalWaves() { return this.levelConfig.waves.length; },

  isLevelComplete() {
    return this.waveIndex >= this.totalWaves && this.enemies.length === 0;
  },

  update(dt) {
    // Spawn next enemy from queue
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const type = this.spawnQueue.shift();
        this._spawnEnemy(type);
        this.spawnTimer = this.levelConfig.waves[this.waveIndex].spawnInterval;
      }
    } else if (!this.allSpawned) {
      this.allSpawned = true;
    }

    // Advance wave when current wave is clear
    if (this.allSpawned && this.enemies.length === 0) {
      this.waveIndex++;
      if (this.waveIndex < this.totalWaves) {
        this._loadWave();
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].update(dt);
      if (this.enemies[i].dead) this.enemies.splice(i, 1);
    }
  },
};

// ============================================================
// COLLISIONS
// ============================================================
function circleCircle(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y) < a.radius + b.radius;
}

function checkCollisions(bullets) {
  const enemies = WaveManager.enemies;

  // Bullets vs Enemies
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    if (b.dead) continue;
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (circleCircle(b, e)) {
        b.dead = true;
        Particles.emit(b.x, b.y, "#ffdd44", 5, 2, 20);
        const killed = e.takeDamage(BULLET_DAMAGE);
        if (killed) {
          GameState.score += e.scoreValue;
        }
        break;
      }
    }
  }

  // Enemies vs Player
  for (const e of enemies) {
    if (circleCircle(e, Player)) {
      Player.takeDamage(ENEMY_CONTACT_DAMAGE);
    }
  }
}

// ============================================================
// HUD
// ============================================================
function drawHUD(ctx) {
  // Health bar
  const barX = 15, barY = 15, barW = 150, barH = 18;
  ctx.fillStyle = "#111";
  ctx.fillRect(barX, barY, barW, barH);
  const hpPct = Player.hp / PLAYER_MAX_HP;
  // Color lerp: green → yellow → red
  let r, g;
  if (hpPct > 0.5) {
    r = Math.round(255 * (1 - hpPct) * 2);
    g = 220;
  } else {
    r = 220;
    g = Math.round(220 * hpPct * 2);
  }
  ctx.fillStyle = `rgb(${r},${g},30)`;
  ctx.fillRect(barX, barY, barW * hpPct, barH);
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
  ctx.fillStyle = "#eee";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`HP  ${Player.hp}/${PLAYER_MAX_HP}`, barX + 4, barY + 13);

  // Score (top right)
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`SCORE  ${GameState.score}`, CANVAS_W - 15, 30);

  // Level + wave (top center)
  const lc = LEVELS[GameState.levelIndex];
  const wm = WaveManager;
  const displayWave = Math.min(wm.currentWave + 1, wm.totalWaves);
  ctx.textAlign = "center";
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "#ccccff";
  ctx.fillText(`${lc.name}   WAVE ${displayWave}/${wm.totalWaves}`, CANVAS_W / 2, 28);

  // Wave pip squares
  const pipSize = 10;
  const pipGap = 4;
  const totalPips = wm.totalWaves;
  const pipsW = totalPips * (pipSize + pipGap) - pipGap;
  const pipX = CANVAS_W / 2 - pipsW / 2;
  for (let i = 0; i < totalPips; i++) {
    ctx.fillStyle = i < displayWave ? "#8888ff" : "#333355";
    ctx.fillRect(pipX + i * (pipSize + pipGap), 34, pipSize, pipSize);
  }
}

// ============================================================
// CROSSHAIR
// ============================================================
function drawCrosshair(ctx) {
  const { x, y } = Input.mouse;
  const gap = 6, len = 10;
  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Top
  ctx.moveTo(x, y - gap); ctx.lineTo(x, y - gap - len);
  // Bottom
  ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + len);
  // Left
  ctx.moveTo(x - gap, y); ctx.lineTo(x - gap - len, y);
  // Right
  ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + len, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,255,136,0.7)";
  ctx.stroke();
}

// ============================================================
// FLOOR GRID
// ============================================================
function drawFloor(ctx) {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= CANVAS_W; gx += 32) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CANVAS_H); ctx.stroke();
  }
  for (let gy = 0; gy <= CANVAS_H; gy += 32) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CANVAS_W, gy); ctx.stroke();
  }
}

// ============================================================
// SCREEN: MENU
// ============================================================
let menuAngle = 0;

function drawMenu(ctx, dt) {
  drawFloor(ctx);
  menuAngle += 0.02 * dt;

  // Animated player preview (bottom center)
  ctx.save();
  ctx.translate(CANVAS_W / 2 + 80, CANVAS_H / 2 + 60);
  // Legs
  ctx.fillStyle = "#3a3a6a";
  ctx.fillRect(-5, 10, 6, 14);
  ctx.fillRect(0, 10, 6, 14);
  // Torso
  ctx.fillStyle = "#555577";
  ctx.fillRect(-10, -8, 20, 20);
  // Head
  ctx.fillStyle = "#f0c896";
  ctx.beginPath();
  ctx.arc(0, -14, 8, 0, Math.PI * 2);
  ctx.fill();
  // Spinning gun arm
  ctx.rotate(menuAngle);
  ctx.fillStyle = "#444466";
  ctx.fillRect(4, -3, 16, 6);
  ctx.fillStyle = "#222233";
  ctx.fillRect(16, -2, 8, 4);
  ctx.restore();

  // Title drop shadow
  ctx.textAlign = "center";
  ctx.font = "bold 64px monospace";
  ctx.fillStyle = "#220022";
  ctx.fillText("PIXEL ASSAULT", CANVAS_W / 2 + 3, CANVAS_H / 2 - 77);
  ctx.fillStyle = "#cc44ff";
  ctx.fillText("PIXEL ASSAULT", CANVAS_W / 2, CANVAS_H / 2 - 80);

  // Subtitle
  ctx.font = "20px monospace";
  ctx.fillStyle = "#8888aa";
  ctx.fillText("TOP-DOWN SHOOTER", CANVAS_W / 2, CANVAS_H / 2 - 50);

  // Blinking prompt
  const blink = Math.floor(Date.now() / 500) % 2 === 0;
  if (blink) {
    ctx.font = "bold 18px monospace";
    ctx.fillStyle = "#00ff88";
    ctx.fillText("PRESS  ENTER  TO  START", CANVAS_W / 2, CANVAS_H / 2 + 20);
  }

  // Controls hint
  ctx.font = "13px monospace";
  ctx.fillStyle = "#555577";
  ctx.fillText("WASD / ARROWS to move   MOUSE to aim   CLICK to shoot", CANVAS_W / 2, CANVAS_H / 2 + 55);
}

// ============================================================
// SCREEN: LEVEL TRANSITION
// ============================================================
function drawTransition(ctx, dt) {
  drawFloor(ctx);

  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const nextLevel = LEVELS[GameState.levelIndex];
  ctx.textAlign = "center";
  ctx.font = "bold 28px monospace";
  ctx.fillStyle = "#00ff88";
  ctx.fillText("WAVE CLEAR!", CANVAS_W / 2, CANVAS_H / 2 - 50);

  ctx.font = "bold 44px monospace";
  ctx.fillStyle = "#cc44ff";
  ctx.fillText(nextLevel.name, CANVAS_W / 2, CANVAS_H / 2 + 10);

  ctx.font = "16px monospace";
  ctx.fillStyle = "#aaaacc";
  ctx.fillText(`${nextLevel.waves.length} WAVES   ${nextLevel.enemies ? "" : ""}`, CANVAS_W / 2, CANVAS_H / 2 + 45);

  ctx.font = "14px monospace";
  ctx.fillStyle = "#666688";
  ctx.fillText("PRESS SPACE TO SKIP", CANVAS_W / 2, CANVAS_H / 2 + 75);

  // Countdown bar
  const progress = GameState.transitionTimer / TRANSITION_DURATION;
  const barW = 300, barH = 8;
  const bx = CANVAS_W / 2 - barW / 2;
  const by = CANVAS_H / 2 + 95;
  ctx.fillStyle = "#222233";
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = "#8844ff";
  ctx.fillRect(bx, by, barW * progress, barH);
}

// ============================================================
// SCREEN: GAME OVER / VICTORY
// ============================================================
let gameOverAlpha = 0;

function drawGameOver(ctx, dt) {
  gameOverAlpha = Math.min(1, gameOverAlpha + 0.02 * dt);
  ctx.fillStyle = `rgba(0,0,0,${gameOverAlpha * 0.85})`;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (gameOverAlpha < 0.4) return;

  ctx.textAlign = "center";

  if (GameState.victory) {
    ctx.font = "bold 72px monospace";
    ctx.fillStyle = "#ffdd00";
    ctx.fillText("YOU WIN!", CANVAS_W / 2 + 3, CANVAS_H / 2 - 53);
    ctx.fillStyle = "#ffff88";
    ctx.fillText("YOU WIN!", CANVAS_W / 2, CANVAS_H / 2 - 56);

    ctx.font = "20px monospace";
    ctx.fillStyle = "#cccc44";
    ctx.fillText("ALL SECTORS CLEARED", CANVAS_W / 2, CANVAS_H / 2 - 15);
  } else {
    ctx.font = "bold 72px monospace";
    ctx.fillStyle = "#660000";
    ctx.fillText("GAME OVER", CANVAS_W / 2 + 3, CANVAS_H / 2 - 53);
    ctx.fillStyle = "#ff3333";
    ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 56);
  }

  ctx.font = "bold 26px monospace";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`SCORE:  ${GameState.score}`, CANVAS_W / 2, CANVAS_H / 2 + 25);

  const blink = Math.floor(Date.now() / 600) % 2 === 0;
  if (blink) {
    ctx.font = "bold 18px monospace";
    ctx.fillStyle = "#00ff88";
    ctx.fillText("PRESS  R  TO  RESTART", CANVAS_W / 2, CANVAS_H / 2 + 65);
  }
}

// ============================================================
// INIT LEVEL
// ============================================================
let bullets = [];

function initLevel() {
  bullets = [];
  Particles.clear();
  Player.reset();
  WaveManager.init(LEVELS[GameState.levelIndex]);
}

// ============================================================
// MAIN GAME LOOP
// ============================================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

Input.init(canvas);

let lastTime = 0;

function loop(timestamp) {
  const rawDt = Math.min(timestamp - lastTime, 100);
  const dt = rawDt / (1000 / 60); // normalize to 60fps units
  lastTime = timestamp;

  Input.clearFrame();

  const state = GameState.state;

  // ——— UPDATE ———
  if (state === "MENU") {
    if (Input.keys["Enter"]) {
      GameState.startGame();
    }
  } else if (state === "PLAYING") {
    Player.update(dt, bullets);
    WaveManager.update(dt);

    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].update(dt);
      if (bullets[i].dead) bullets.splice(i, 1);
    }

    checkCollisions(bullets);
    Particles.update(dt);

    if (Player.hp <= 0) {
      GameState.gameOver();
      gameOverAlpha = 0;
    } else if (WaveManager.isLevelComplete()) {
      GameState.nextLevel();
      if (GameState.state === "LEVEL_TRANSITION") {
        gameOverAlpha = 0;
      }
    }
  } else if (state === "LEVEL_TRANSITION") {
    GameState.transitionTimer -= dt;
    if (GameState.transitionTimer <= 0 || Input.keys["Space"]) {
      GameState.finishTransition();
    }
  } else if (state === "GAME_OVER") {
    if (Input.keys["KeyR"]) {
      GameState.reset();
    }
  }

  // ——— RENDER ———
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  if (state === "MENU") {
    drawMenu(ctx, dt);
  } else if (state === "PLAYING") {
    drawFloor(ctx);
    Particles.draw(ctx);
    for (const e of WaveManager.enemies) e.draw(ctx);
    Player.draw(ctx);
    for (const b of bullets) b.draw(ctx);
    drawHUD(ctx);
    drawCrosshair(ctx);
  } else if (state === "LEVEL_TRANSITION") {
    drawTransition(ctx, dt);
  } else if (state === "GAME_OVER") {
    // Show last game state underneath
    drawFloor(ctx);
    for (const e of WaveManager.enemies) e.draw(ctx);
    Player.draw(ctx);
    drawHUD(ctx);
    drawGameOver(ctx, dt);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
