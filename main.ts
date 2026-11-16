// Emberlight — Keep the Beacon Lit: entry program for make.fun best-game-01.
//
// The game itself is the game/ folder beside this file: plain static files
// (game/index.html plus its ES modules) that a desktop browser loads fully
// offline — no library, no build step, no network request. This program is
// the hand-in. Before copying anything it checks the entry is complete and
// self-contained (see verifyEntry), then it copies game/ and screenshots/
// into the output directory, writes dossier.json there with the vendored
// make.fun library, and finally writes manifest.json — a sha256 inventory of
// every file handed in — and prints a short build summary.
//
// Serve the game locally with `node serve.ts`, then open
// http://localhost:8080. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');
const shotsPlanPath = join(here, 'shots.json');

// The scorer's caps, mirrored here so a local build refuses what the scorer
// would refuse instead of handing in a dossier that cannot score.
const SCREENSHOT_MAX = 4;
const SCREENSHOT_MAX_BYTES = 262144;

// Stop the build with a message the person running it can act on.
function fail(message) {
  console.error(`emberlight: cannot build the dossier — ${message}`);
  process.exit(1);
}

function requireFile(path, what) {
  if (!existsSync(path)) fail(`${what} is missing (expected ${relative(here, path)})`);
  if (!statSync(path).isFile()) fail(`${what} is not a file (${relative(here, path)})`);
  if (statSync(path).size === 0) fail(`${what} is empty (${relative(here, path)})`);
}

// ---------------------------------------------------------------------------
// Pre-flight checks. The game must play offline from static files, so every
// file it names — the page's scripts and styles, and each module those
// modules import in turn — has to be here on disk, and nothing it loads may
// come from the network.
// ---------------------------------------------------------------------------

// src=/href= targets of the page's <script> and <link> tags, in page order.
function pageReferences(html) {
  const refs = [];
  const tagPattern = /<(script|link)\b[^>]*>/gi;
  let tag;
  while ((tag = tagPattern.exec(html)) !== null) {
    const attr = /\b(?:src|href)\s*=\s*"([^"]+)"/i.exec(tag[0]);
    if (attr) refs.push(attr[1]);
  }
  return refs;
}

// Static module specifiers: `import ... from 'x'`, `import 'x'`,
// `export ... from 'x'`. Dynamic import() is deliberately not matched: the
// game loads its whole module graph up front.
function moduleSpecifiers(source) {
  const specs = [];
  const pattern = /\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = pattern.exec(source)) !== null) specs.push(match[1]);
  return specs;
}

function isExternal(ref) {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(ref) || /^[a-z][a-z0-9+.-]*:/i.test(ref);
}

// Walk the module graph from the page's own references; fail on the first
// reference that is external or points at a file that is not here.
function verifyModuleGraph(entryRefs) {
  const queue = [];
  for (const ref of entryRefs) {
    if (isExternal(ref)) fail(`game/index.html loads ${ref} from outside the entry; the game must be self-contained`);
    queue.push(resolve(gameDir, ref));
  }
  const seen = new Set();
  while (queue.length > 0) {
    const file = queue.pop();
    requireFile(file, 'a file the game loads');
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.m?js$/i.test(file)) continue;
    for (const spec of moduleSpecifiers(readFileSync(file, 'utf8'))) {
      if (!spec.startsWith('./') && !spec.startsWith('../')) {
        fail(`${relative(here, file)} imports '${spec}', which is not a file inside game/`);
      }
      queue.push(resolve(dirname(file), spec));
    }
  }
  return seen.size;
}

// shots.json stages each screenshot scene; every staged name must exist as a
// real, non-empty screenshot, and the folder must stay within the caps.
function verifyScreenshots() {
  if (!existsSync(shotsDir)) fail('the screenshots/ folder is missing');
  let planned = [];
  if (existsSync(shotsPlanPath)) {
    try {
      planned = JSON.parse(readFileSync(shotsPlanPath, 'utf8'));
    } catch {
      fail('shots.json is not valid JSON');
    }
    if (!Array.isArray(planned) || planned.some((s) => typeof s?.name !== 'string')) {
      fail('shots.json must be a list of { name, query } entries');
    }
  }
  const onDisk = readdirSync(shotsDir).filter((name) => /\.(?:png|jpe?g)$/i.test(name)).sort();
  if (onDisk.length === 0) fail('screenshots/ holds no PNG or JPEG screenshots');
  if (onDisk.length > SCREENSHOT_MAX) fail(`screenshots/ holds ${onDisk.length} screenshots; at most ${SCREENSHOT_MAX} are allowed`);
  for (const name of onDisk) {
    const path = join(shotsDir, name);
    requireFile(path, `screenshot ${name}`);
    const size = statSync(path).size;
    if (size > SCREENSHOT_MAX_BYTES) {
      fail(`screenshot ${name} is ${size} bytes; the cap is ${SCREENSHOT_MAX_BYTES}`);
    }
  }
  for (const shot of planned) {
    if (!onDisk.includes(shot.name)) {
      fail(`shots.json stages ${shot.name}, but screenshots/${shot.name} is not there`);
    }
  }
  return onDisk;
}

// Facts for the summary, read from the game itself rather than restated
// here, so this output cannot drift away from the game as shipped.
function gameFacts(indexHtml) {
  const title = /<title>([^<]+)<\/title>/i.exec(indexHtml)?.[1]?.trim() ?? 'untitled game';
  const facts = { title };
  const configPath = join(gameDir, 'src', 'config.js');
  if (existsSync(configPath)) {
    const config = readFileSync(configPath, 'utf8');
    for (const key of ['WIN_SCORE', 'LIVES', 'COMBO_MAX']) {
      const value = new RegExp(`export const ${key} = (\\d+)`).exec(config);
      if (value) facts[key.toLowerCase()] = Number(value[1]);
    }
  }
  return facts;
}

function verifyEntry() {
  if (!existsSync(gameDir)) fail('the game/ folder is missing');
  requireFile(join(gameDir, 'index.html'), 'game/index.html');
  const indexHtml = readFileSync(join(gameDir, 'index.html'), 'utf8');
  const moduleCount = verifyModuleGraph(pageReferences(indexHtml));
  const screenshots = verifyScreenshots();
  return { facts: gameFacts(indexHtml), moduleCount, screenshots };
}

// ---------------------------------------------------------------------------
// Manifest: every file in the finished dossier, with its size and sha256,
// so the hand-in can be verified byte for byte after the fact.
// ---------------------------------------------------------------------------

function listFiles(root) {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) found.push(path);
    }
  };
  walk(root);
  return found.sort();
}

function buildManifest(root, facts) {
  const files = [];
  let totalBytes = 0;
  for (const path of listFiles(root)) {
    const rel = relative(root, path).split(sep).join('/');
    if (rel === 'manifest.json') continue; // the manifest does not list itself
    const bytes = statSync(path).size;
    const sha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
    files.push({ path: rel, bytes, sha256 });
    totalBytes += bytes;
  }
  return {
    game: facts.title,
    entrypoint: 'main.ts',
    files,
    file_count: files.length,
    total_bytes: totalBytes,
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

// ---------------------------------------------------------------------------
// Build: verify, copy, dossier, manifest, summary.
// ---------------------------------------------------------------------------

const { facts, moduleCount, screenshots } = verifyEntry();

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// Only text_max_bytes shapes the bytes; the other caps refuse an entry the
// scorer would refuse (screenshot count and size, game file count and total
// size, and the length of any path under game/).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: SCREENSHOT_MAX, max_bytes: SCREENSHOT_MAX_BYTES },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

const manifest = buildManifest(out, facts);
writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Emberlight dossier built in ${out}`);
console.log(`  game:        ${facts.title}`);
if (facts.win_score !== undefined) {
  console.log(`  win at ${facts.win_score} points, ${facts.lives} hearts, combo to x${facts.combo_max}`);
}
console.log(`  game files:  ${moduleCount} modules verified self-contained, ${screenshots.length} screenshots (${screenshots.join(', ')})`);
console.log(`  handed in:   ${manifest.file_count} files, ${formatBytes(manifest.total_bytes)} total (manifest.json lists each file's sha256)`);
