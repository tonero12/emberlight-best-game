// The game's rules and state, with no drawing and no browser in it: the lantern-keeper,
// the pool of falling embers, storms and sunshards, the sparks they throw off, spawning,
// collisions, score, combo, hearts, level and the beacon. step() advances one fixed step
// and returns what happened as bit flags, so the caller can react without the world
// knowing about screens or sound. Nothing here allocates after createWorld returns.
import {
  COMBO_MAX,
  EMBER,
  FIELD,
  LEVEL,
  LIVES,
  PARTICLE_POOL,
  PLAYER,
  POOL_SIZE,
  SHARD,
  STORM,
  WIN_SCORE,
} from './config.js';

export const KIND_EMBER = 0;
export const KIND_STORM = 1;
export const KIND_SHARD = 2;

export const EVENT_HIT = 1;
export const EVENT_EMBER = 2;
export const EVENT_SHARD = 4;
export const EVENT_OVER = 8;
export const EVENT_WIN = 16;
export const EVENT_LEVEL = 32;

function circleHit(px, py, pr, item) {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  const dx = px - cx;
  const dy = py - cy;
  const r = pr + item.width / 2;
  return dx * dx + dy * dy < r * r;
}

export function createWorld(random) {
  const player = {
    x: 0,
    y: 0,
    width: PLAYER.width,
    height: PLAYER.height,
    invulnerable: 0,
    vx: 0,
    vy: 0,
  };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({
      active: false, kind: KIND_EMBER, x: 0, y: 0, width: 0, height: 0,
      speed: 0, drift: 0, phase: 0,
    });
  }
  const particles = [];
  for (let index = 0; index < PARTICLE_POOL; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#ff9e2c' });
  }
  const state = {
    player, items, particles,
    score: 0, lives: LIVES, level: 1, elapsed: 0, combo: 0,
    emberTimer: 0, stormTimer: 0, shardTimer: 0, won: false, over: false,
  };

  function reset() {
    player.x = (FIELD.width - player.width) / 2;
    player.y = FIELD.groundY - 140;
    player.invulnerable = 0;
    player.vx = 0;
    player.vy = 0;
    for (const item of items) item.active = false;
    for (const spark of particles) spark.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.combo = 0;
    state.emberTimer = 0.4;
    state.stormTimer = 2.2;
    state.shardTimer = SHARD.interval;
    state.won = false;
    state.over = false;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function spawn(kind) {
    const item = freeItem();
    if (item === null) return;
    const size = kind === KIND_EMBER ? EMBER.size : kind === KIND_STORM ? STORM.size : SHARD.size;
    item.active = true;
    item.kind = kind;
    item.width = size;
    item.height = size;
    item.x = random() * (FIELD.width - size);
    item.y = -size;
    item.phase = random() * Math.PI * 2;
    if (kind === KIND_EMBER) {
      item.speed = EMBER.fallSpeed + EMBER.fallSpeedPerLevel * (state.level - 1);
      item.drift = EMBER.drift;
    } else if (kind === KIND_STORM) {
      item.speed = STORM.fallSpeed + STORM.fallSpeedPerLevel * (state.level - 1);
      item.drift = STORM.drift;
    } else {
      item.speed = SHARD.fallSpeed;
      item.drift = 30;
    }
  }

  function burst(x, y, color, count, speed) {
    let made = 0;
    for (let index = 0; index < particles.length && made < count; index += 1) {
      const spark = particles[index];
      if (spark.active) continue;
      const angle = random() * Math.PI * 2;
      const power = speed * (0.4 + random() * 0.8);
      spark.active = true;
      spark.x = x;
      spark.y = y;
      spark.vx = Math.cos(angle) * power;
      spark.vy = Math.sin(angle) * power - 40;
      spark.maxLife = 0.45 + random() * 0.4;
      spark.life = spark.maxLife;
      spark.size = 2 + random() * 3;
      spark.color = color;
      made += 1;
    }
  }

  function emberInterval() {
    return Math.max(EMBER.minInterval, EMBER.interval * EMBER.intervalScale ** (state.level - 1));
  }

  function stormInterval() {
    return Math.max(STORM.minInterval, STORM.interval * STORM.intervalScale ** (state.level - 1));
  }

  /**
   * One fixed step. `dx`/`dy` are -1, 0 or 1 (or a unit-ish steering vector) for the
   * lantern's movement. With `harmless` set (the title screen's backdrop) things fall
   * but nothing touches the player and nothing scores.
   */
  function step(dt, dx, dy, harmless) {
    let events = 0;
    state.elapsed += dt;
    const level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    if (level !== state.level) {
      state.level = level;
      events |= EVENT_LEVEL;
    }

    const len = Math.hypot(dx, dy);
    const nx = len > 0 ? dx / len : 0;
    const ny = len > 0 ? dy / len : 0;
    player.vx = nx * PLAYER.speed;
    player.vy = ny * PLAYER.speed;
    player.x = Math.min(FIELD.width - player.width, Math.max(0, player.x + player.vx * dt));
    player.y = Math.min(FIELD.groundY - player.height, Math.max(70, player.y + player.vy * dt));
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);

    for (const spark of particles) {
      if (!spark.active) continue;
      spark.life -= dt;
      if (spark.life <= 0) { spark.active = false; continue; }
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vy += 160 * dt;
    }

    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      spawn(KIND_EMBER);
      state.emberTimer += emberInterval();
    }
    state.stormTimer -= dt;
    if (state.stormTimer <= 0) {
      spawn(KIND_STORM);
      state.stormTimer += stormInterval();
    }
    state.shardTimer -= dt;
    if (state.shardTimer <= 0) {
      spawn(KIND_SHARD);
      state.shardTimer += SHARD.interval + random() * SHARD.intervalJitter;
    }

    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.y += item.speed * dt;
      item.x += Math.sin(state.elapsed * 1.4 + item.phase) * item.drift * dt;
      item.x = Math.min(FIELD.width - item.width, Math.max(0, item.x));
      if (item.y > FIELD.groundY + 40) {
        item.active = false;
        continue;
      }
      if (harmless || !circleHit(px, py, 20, item)) continue;
      if (item.kind === KIND_EMBER) {
        item.active = false;
        state.combo = Math.min(COMBO_MAX, state.combo + 1);
        state.score += EMBER.points * state.combo;
        burst(px, py, '#ff9e2c', 10, 190);
        events |= EVENT_EMBER;
      } else if (item.kind === KIND_SHARD) {
        item.active = false;
        state.score += SHARD.points;
        if (state.lives < LIVES) state.lives += 1;
        burst(px, py, '#ffd166', 16, 260);
        events |= EVENT_SHARD;
      } else if (player.invulnerable === 0) {
        item.active = false;
        state.lives -= 1;
        state.combo = 0;
        player.invulnerable = PLAYER.invulnerable;
        burst(px, py, '#8b7fb8', 14, 220);
        events |= EVENT_HIT;
        if (state.lives === 0) {
          state.over = true;
          events |= EVENT_OVER;
          break;
        }
      }
    }

    if (!state.won && !harmless && state.score >= WIN_SCORE) {
      state.won = true;
      burst(px, py, '#ffd166', 24, 320);
      events |= EVENT_WIN;
    }
    return events;
  }

  /** Set up a near-win for the win screenshot: the real rules still have to catch the ember. */
  function stageNearWin() {
    reset();
    state.score = WIN_SCORE - EMBER.points;
    state.combo = 2;
    state.emberTimer = 99;
    state.stormTimer = 99;
    state.shardTimer = 99;
    const item = freeItem();
    if (item !== null) {
      item.active = true;
      item.kind = KIND_EMBER;
      item.width = EMBER.size;
      item.height = EMBER.size;
      item.x = player.x + player.width / 2 - EMBER.size / 2;
      item.y = player.y - 130;
      item.speed = EMBER.fallSpeed;
      item.drift = 0;
      item.phase = 0;
    }
  }

  /** Set up a near-end for the game-over screenshot: one heart left, a modest score
   *  below the win line, and a storm already falling onto the lantern. */
  function stageNearEnd() {
    reset();
    state.score = 180;
    state.lives = 1;
    state.combo = 1;
    const storm = freeItem();
    if (storm !== null) {
      storm.active = true;
      storm.kind = KIND_STORM;
      storm.width = STORM.size;
      storm.height = STORM.size;
      storm.x = player.x + player.width / 2 - STORM.size / 2;
      storm.y = player.y - 260;
      storm.speed = STORM.fallSpeed;
      storm.drift = 0;
      storm.phase = 0;
    }
    const ember = freeItem();
    if (ember !== null) {
      ember.active = true;
      ember.kind = KIND_EMBER;
      ember.width = EMBER.size;
      ember.height = EMBER.size;
      ember.x = player.x - 160;
      ember.y = player.y - 120;
      ember.speed = EMBER.fallSpeed;
      ember.drift = EMBER.drift;
      ember.phase = 0;
    }
  }

  reset();
  return { state, reset, step, stageNearWin, stageNearEnd };
}
