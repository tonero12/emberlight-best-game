// The screenshot scenes behind ?shot=start|play|win|end. Each one plays the real rules
// forward from a fresh world, steered by a pilot that chases the lowest ember and
// sidesteps any storm in its path. The win scene starts one ember from the beacon;
// the end scene starts one heart from the end, with a storm already falling on a
// lantern that does not move. The same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN, KIND_EMBER, KIND_STORM } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 14;
const WIN_LIMIT_SECONDS = 30;

/**
 * Steering for one step: chase the lowest ember, sidestepping any storm in the way.
 * Returns a continuous { x, y } vector; the world normalises it.
 */
function autopilot(state) {
  const player = state.player;
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  let ember = null;
  for (const item of state.items) {
    if (!item.active || item.kind !== KIND_EMBER) continue;
    if (ember === null || item.y > ember.y) ember = item;
  }
  const targetX = ember === null ? FIELD.width / 2 : ember.x + ember.width / 2;
  const targetY = ember === null ? FIELD.height / 2 : ember.y + ember.height / 2;
  let dx = targetX - px;
  let dy = targetY - py;
  {
    // Sidestep a storm that is close and roughly in the way: turn perpendicular,
    // away from the storm's centre.
    for (const item of state.items) {
      if (!item.active || item.kind !== KIND_STORM) continue;
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      const ox = px - cx;
      const oy = py - cy;
      const dist = Math.hypot(ox, oy);
      if (dist > 150) continue;
      const ahead = (dx * -ox + dy * -oy) / (Math.hypot(dx, dy) || 1);
      if (ahead < 40) continue;
      const side = ox * dy - oy * dx >= 0 ? 1 : -1;
      // Perpendicular to the chase direction, away from the storm.
      const chaseLen = Math.hypot(targetX - px, targetY - py) || 1;
      const ux = (targetX - px) / chaseLen;
      const uy = (targetY - py) / chaseLen;
      const perpX = -uy * side;
      const perpY = ux * side;
      dx = ux * 0.4 + perpX;
      dy = uy * 0.4 + perpY;
      break;
    }
  }
  return { x: dx, y: dy };
}

/**
 * Set `world` to the named scene (start, play, win or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'win') {
    world.stageNearWin();
    for (let index = 0; index < WIN_LIMIT_SECONDS / STEP; index += 1) {
      const dir = autopilot(world.state);
      if (world.step(STEP, dir.x, dir.y, false) & EVENT_WIN) break;
    }
    return { screen: world.state.won ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  }
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, 0, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    world.stageNearEnd();
    // The lantern does not move: the staged storm lands on it, as a player who
    // froze would be caught. The frame is the real rules, played badly on purpose.
    for (let index = 0; index < 60 / STEP; index += 1) {
      if (world.step(STEP, 0, 0, false) & EVENT_OVER) break;
    }
    const over = world.state.lives === 0;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  const limit = PLAY_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    const dir = autopilot(world.state);
    if (world.step(STEP, dir.x, dir.y, false) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
