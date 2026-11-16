// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the
// backdrop colour. A dusk valley: gradient sky, twinkling stars, a moon, two hill
// ridges, and a beacon tower whose light grows as the score nears the win. The
// lantern-keeper glows, embers burn orange, storms hang dark purple, sunshards shine
// gold. Text that holds a number is rebuilt only when the number changes.
import { FIELD, FONT, LIVES, PALETTE, WIN_SCORE } from './config.js';
import { KIND_EMBER, KIND_SHARD, KIND_STORM } from './world.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 150, line: 34, bottom: 76 };
const HEART_R = 11;
const HEART_GAP = 10;
const BEACON_X = 1150;
const BEACON_TOP = 470;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const levelLabel = cachedLabel('Level ');
  const comboLabel = cachedLabel('Combo x');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  let skyGradient = null;

  // Stars and hill ridges are fixed at boot, so every frame draws the same valley.
  const starRandom = createRandom(7);
  const stars = [];
  for (let index = 0; index < 130; index += 1) {
    stars.push({
      x: starRandom() * FIELD.width,
      y: starRandom() * 380,
      r: 0.6 + starRandom() * 1.6,
      phase: starRandom() * Math.PI * 2,
      speed: 0.6 + starRandom() * 1.8,
    });
  }
  function ridge(base, amp, seed) {
    const rnd = createRandom(seed);
    const points = [];
    for (let x = 0; x <= FIELD.width; x += 40) {
      points.push({ x, y: base - amp * (0.4 + rnd() * 0.6) });
    }
    return points;
  }
  const hillFar = ridge(FIELD.groundY - 40, 110, 11);
  const hillNear = ridge(FIELD.groundY - 6, 60, 23);

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
    skyGradient = null;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function sky(elapsed) {
    if (skyGradient === null) {
      skyGradient = context.createLinearGradient(0, 0, 0, FIELD.height);
      skyGradient.addColorStop(0, PALETTE.skyTop);
      skyGradient.addColorStop(0.55, PALETTE.skyMid);
      skyGradient.addColorStop(0.85, PALETTE.skyLow);
      skyGradient.addColorStop(1, PALETTE.horizon);
    }
    context.fillStyle = skyGradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of stars) {
      context.globalAlpha = 0.25 + 0.65 * Math.abs(Math.sin(elapsed * star.speed + star.phase));
      context.fillStyle = '#fff8e0';
      context.beginPath();
      context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // Moon, top left, with a soft halo.
    context.fillStyle = 'rgba(255, 244, 200, 0.16)';
    context.beginPath();
    context.arc(150, 110, 54, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffedb8';
    context.beginPath();
    context.arc(150, 110, 38, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(214, 182, 120, 0.7)';
    context.beginPath();
    context.arc(138, 100, 7, 0, Math.PI * 2);
    context.arc(162, 122, 5, 0, Math.PI * 2);
    context.fill();
  }

  function hills() {
    context.fillStyle = PALETTE.hillFar;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (const point of hillFar) context.lineTo(point.x, point.y);
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.hillNear;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (const point of hillNear) context.lineTo(point.x, point.y);
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
  }

  function beacon(state, elapsed) {
    const progress = Math.min(1, state.score / WIN_SCORE);
    const glow = 0.14 + progress * 0.86;
    // Sweeping beam, stronger as the beacon fills.
    context.save();
    context.globalAlpha = 0.1 + glow * 0.22;
    context.fillStyle = PALETTE.beaconLight;
    const angle = -Math.PI / 2 + Math.sin(elapsed * 0.45) * 0.9;
    context.translate(BEACON_X, BEACON_TOP);
    context.rotate(angle);
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(-70, -520);
    context.lineTo(70, -520);
    context.closePath();
    context.fill();
    context.restore();
    // Tower.
    context.fillStyle = PALETTE.beaconStone;
    context.fillRect(BEACON_X - 22, BEACON_TOP, 44, FIELD.groundY - BEACON_TOP);
    context.fillStyle = '#2a2350';
    context.fillRect(BEACON_X - 28, BEACON_TOP - 8, 56, 12);
    // Lamp.
    context.globalAlpha = 0.25 + glow * 0.45;
    context.fillStyle = PALETTE.beaconLight;
    context.beginPath();
    context.arc(BEACON_X, BEACON_TOP - 16, 26 + progress * 14, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = progress > 0.85 ? '#fff3c4' : PALETTE.beaconLight;
    context.beginPath();
    context.arc(BEACON_X, BEACON_TOP - 16, 13, 0, Math.PI * 2);
    context.fill();
  }

  function glowCircle(x, y, radius, color, alpha) {
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  function drawEmber(item, elapsed) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const flicker = 1 + Math.sin(elapsed * 7 + item.phase) * 0.12;
    glowCircle(cx, cy, item.width * 0.95 * flicker, PALETTE.ember, 0.28);
    context.fillStyle = PALETTE.ember;
    context.beginPath();
    context.arc(cx, cy, item.width / 2 * flicker, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.emberCore;
    context.beginPath();
    context.arc(cx, cy - 2, item.width / 4, 0, Math.PI * 2);
    context.fill();
  }

  function drawStorm(item, elapsed) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    context.fillStyle = PALETTE.stormDark;
    context.beginPath();
    context.arc(cx - 18, cy + 6, 20, 0, Math.PI * 2);
    context.arc(cx + 18, cy + 6, 20, 0, Math.PI * 2);
    context.arc(cx, cy - 8, 24, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.storm;
    context.beginPath();
    context.arc(cx - 14, cy, 17, 0, Math.PI * 2);
    context.arc(cx + 14, cy, 17, 0, Math.PI * 2);
    context.arc(cx, cy - 12, 19, 0, Math.PI * 2);
    context.fill();
    // Lightning flicker inside the cloud, on a slow cycle.
    if (Math.floor(elapsed * 2 + item.phase) % 5 === 0) {
      context.strokeStyle = '#d9c8ff';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(cx - 4, cy - 4);
      context.lineTo(cx + 2, cy + 8);
      context.lineTo(cx - 3, cy + 10);
      context.lineTo(cx + 5, cy + 22);
      context.stroke();
    }
    // Ash rain under the cloud.
    context.fillStyle = 'rgba(180, 165, 210, 0.5)';
    for (let drop = 0; drop < 3; drop += 1) {
      const dx = cx - 20 + drop * 18 + Math.sin(elapsed * 3 + item.phase + drop) * 4;
      context.fillRect(dx, cy + 22 + ((elapsed * 60 + drop * 17) % 26), 2, 9);
    }
  }

  function drawShard(item, elapsed) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const pulse = 1 + Math.sin(elapsed * 5 + item.phase) * 0.15;
    glowCircle(cx, cy, item.width * 1.1 * pulse, PALETTE.shard, 0.3);
    context.save();
    context.translate(cx, cy);
    context.rotate(Math.PI / 4);
    context.fillStyle = PALETTE.shard;
    const half = item.width / 2 * pulse;
    context.fillRect(-half, -half, half * 2, half * 2);
    context.fillStyle = PALETTE.shardCore;
    context.fillRect(-half / 2, -half / 2, half, half);
    context.restore();
  }

  function drawParticles(state) {
    for (const spark of state.particles) {
      if (!spark.active) continue;
      context.globalAlpha = Math.max(0, spark.life / spark.maxLife);
      context.fillStyle = spark.color;
      context.fillRect(spark.x - spark.size / 2, spark.y - spark.size / 2, spark.size, spark.size);
    }
    context.globalAlpha = 1;
  }

  function drawPlayer(state, elapsed) {
    const player = state.player;
    // Blink while invulnerable after a hit: drawn faint on every other tenth of
    // a second, never fully hidden, so the lantern stays visible in screenshots.
    const faint = player.invulnerable > 0 && Math.floor(player.invulnerable * 10) % 2 === 0;
    context.save();
    if (faint) context.globalAlpha = 0.35;
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const flicker = 1 + Math.sin(elapsed * 9) * 0.08;
    glowCircle(cx, cy, 52 * flicker, PALETTE.flame, 0.22);
    glowCircle(cx, cy, 34 * flicker, PALETTE.flame, 0.3);
    // Handle.
    context.strokeStyle = '#c9a86a';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(cx, player.y + 8, 12, Math.PI, 0);
    context.stroke();
    // Body: warm glass with a dark frame.
    context.fillStyle = '#3a2c14';
    context.fillRect(player.x + 4, player.y + 14, player.width - 8, player.height - 18);
    context.fillStyle = '#ffcf7a';
    context.fillRect(player.x + 8, player.y + 18, player.width - 16, player.height - 26);
    // Flame.
    context.fillStyle = PALETTE.flame;
    context.beginPath();
    context.ellipse(cx, cy + 4, 7 * flicker, 12 * flicker, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fff3c4';
    context.beginPath();
    context.ellipse(cx, cy + 7, 3.5, 6, 0, 0, Math.PI * 2);
    context.fill();
    // Base.
    context.fillStyle = '#2a2110';
    context.fillRect(player.x + 2, player.y + player.height - 6, player.width - 4, 6);
    context.restore();
  }

  function drawField(state) {
    sky(state.elapsed);
    hills();
    beacon(state, state.elapsed);
    for (const item of state.items) {
      if (!item.active) continue;
      if (item.kind === KIND_EMBER) drawEmber(item, state.elapsed);
      else if (item.kind === KIND_STORM) drawStorm(item, state.elapsed);
      else if (item.kind === KIND_SHARD) drawShard(item, state.elapsed);
    }
    drawParticles(state);
    drawPlayer(state, state.elapsed);
  }

  function drawHeart(x, y, alive) {
    context.fillStyle = alive ? PALETTE.ember : 'rgba(120, 110, 150, 0.4)';
    context.beginPath();
    context.arc(x, y, HEART_R, 0, Math.PI * 2);
    context.fill();
    if (alive) {
      context.fillStyle = PALETTE.emberCore;
      context.beginPath();
      context.arc(x, y + 1, 5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 28, PALETTE.text, 'left');
    if (state.combo >= 2) {
      text(comboLabel(state.combo), 24, 52, 22, PALETTE.ember, 'left');
    }
    text(levelLabel(state.level), FIELD.width / 2 - 130, 18, 28, PALETTE.text, 'center');
    // Beacon progress bar, centre top.
    const barX = FIELD.width / 2 - 40;
    const barY = 24;
    const barW = 220;
    const progress = Math.min(1, state.score / WIN_SCORE);
    context.fillStyle = 'rgba(20, 16, 40, 0.7)';
    context.fillRect(barX, barY, barW, 16);
    context.fillStyle = PALETTE.beaconLight;
    context.fillRect(barX, barY, barW * progress, 16);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(barX, barY, barW, 16);
    text('BEACON', barX + barW + 10, 20, 20, PALETTE.muted, 'left');
    // Hearts, top right.
    const firstHeart = FIELD.width - 24 - LIVES * (HEART_R * 2 + HEART_GAP) + HEART_GAP;
    for (let life = 0; life < LIVES; life += 1) {
      drawHeart(firstHeart + life * (HEART_R * 2 + HEART_GAP) + HEART_R, 32, life < state.lives);
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 48, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 40, 24, PALETTE.ember, 'center');
  }

  const TITLE_LINES = [
    'Guide the lantern through the dusk valley.',
    'Catch embers to build your combo. Dodge the ash storms.',
    'Golden sunshards are worth 50 and mend a heart.',
    'Reach ' + WIN_SCORE + ' points and the beacon lights. That is the win.',
    'Move with arrows, WASD or the mouse.',
    'P pauses, M mutes.',
    '',
  ];
  const PAUSED_LINES = ['The embers will wait for you.'];
  const OVER_LINES = ['', ''];
  const WIN_LINES = ['The valley is lit again.', '', ''];

  /** Paint one frame: the valley, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, muted = false) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[6] = bestLabel(best);
      drawPanel('EMBERLIGHT', TITLE_LINES, 'Press Space or click to start');
      return;
    }
    drawHud(state);
    if (muted) text('Muted (M)', FIELD.width - 24, FIELD.height - 34, 18, PALETTE.muted, 'right');
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('The light went out', OVER_LINES, 'Press Space or click to play again');
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[1] = finalLabel(state.score);
      WIN_LINES[2] = bestLabel(best);
      drawPanel('The beacon is lit!', WIN_LINES, 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
