// Emberlight — tuning numbers and colours in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 648 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The lantern-keeper: a small glowing lantern that flies freely in two dimensions. */
export const PLAYER = {
  width: 46,
  height: 56,
  speed: 420,
  invulnerable: 1.6,
};

/** Hearts. A storm hit costs one; a sunshard restores one, up to this many. */
export const LIVES = 3;

/** Score that lights the beacon and wins the game. */
export const WIN_SCORE = 800;

/** Combo: each ember caught in a row without a storm hit raises the multiplier, to this cap. */
export const COMBO_MAX = 5;

export const EMBER = {
  size: 22,
  points: 10,
  fallSpeed: 120,
  fallSpeedPerLevel: 12,
  drift: 46,
  interval: 1.0,
  intervalScale: 0.9,
  minInterval: 0.4,
};

export const STORM = {
  size: 74,
  fallSpeed: 150,
  fallSpeedPerLevel: 16,
  drift: 70,
  interval: 1.9,
  intervalScale: 0.88,
  minInterval: 0.7,
};

export const SHARD = {
  size: 30,
  points: 50,
  fallSpeed: 95,
  interval: 11,
  intervalJitter: 5,
};

/** Seconds of play per level, and the last level: speeds and spawn rates stop growing there. */
export const LEVEL = { seconds: 15, max: 8 };

/** How many falling things can exist at once; the pool is allocated once, at boot. */
export const POOL_SIZE = 72;
/** Visual sparks; also allocated once, at boot. */
export const PARTICLE_POOL = 160;

export const PALETTE = {
  backdrop: '#0b0d1a',
  skyTop: '#1a1440',
  skyMid: '#3b2358',
  skyLow: '#a34a2a',
  horizon: '#e07b39',
  hillFar: '#241a3d',
  hillNear: '#17122e',
  ground: '#120e24',
  beaconStone: '#3a3358',
  beaconLight: '#ffd166',
  ember: '#ff9e2c',
  emberCore: '#ffe9a8',
  storm: '#4a4460',
  stormDark: '#2e2942',
  shard: '#ffd166',
  shardCore: '#fff6d8',
  flame: '#ffb347',
  text: '#f5efe4',
  muted: '#b9aec9',
  panel: '#1c1730',
  panelEdge: '#4a3f6e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberlight.best';
