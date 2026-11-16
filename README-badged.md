[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/tonero12/emberlight-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/tonero12/emberlight-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# Emberlight — make.fun "Make the best game" entry

**Bounty:** Make the best game — $1,000, top 10 paid (1st $400, 2nd $200, 3rd $120,
4th–10th $40). Ends **Wed 18 Nov 2026, 6:00 PM UTC (7:00 PM Lagos)**.
Competition page: https://make.fun/bounty/best-game-01

## The game

**Emberlight — Keep the Beacon Lit.** An original 2D arcade game, built from scratch
on the kit's starter scaffold (its Block Dodger was explicitly "a starting point,
not a winner", so none of its gameplay remains).

Guide a little lantern through a dusk valley. Catch falling embers to build a combo
multiplier (up to x5), dodge dark ash storms that cost a heart and reset the combo,
grab rare golden sunshards (+50 points and mend a heart). Reach **800 points** and
the beacon on the hill lights — that is the win. Lose all 3 hearts and the light
goes out. Levels rise every 15 seconds: faster falls, more storms.

- Controls: arrows / WASD to fly, or steer with the mouse. Space or click to
  start / restart, P pause, M mute.
- Original art, all drawn in code (gradient dusk sky, twinkling stars, moon, hill
  ridges, sweeping beacon beam), and original sounds synthesised live with WebAudio
  (catch chime climbs with the combo). No files loaded over the network, no library.
- Best score saved in the browser. Screen-reader status announcements.

## Files

- `game/` — the playable game, plain static files (`index.html` + `src/*.js`).
  Open it with `node serve.ts` then http://localhost:8080, no build step.
- `main.ts` — the entry program (kit starter, unchanged): copies `game/` and
  `screenshots/` to the output dir and writes `dossier.json` with the vendored
  `vendor/makefun-game.ts` (kit copy, unchanged, hash verified).
- `screenshots/` — 4 real renders of the game's own code: `1-start.jpg` (cover),
  `2-play.jpg`, `3-win.jpg`, `4-end.jpg`, all under the 256 KiB cap.
  They were rendered headlessly with the game's own code on a Canvas 2d context
  (see `tests/shot.mjs`), **not** in desktop Chrome. If a Chrome screenshot run is
  possible before submitting, re-take them with the kit's flow
  (`shots.json` stages each scene at `?shot=start|play|win|end&seed=1`) and replace
  these files; the scenes are deterministic, so the frames will match.
- `shots.json` — the four staged scenes, seed 1.
- `LICENSE` — MIT, Agbe Anthony (TeamTony World).

## Verified in this build (2026-11-16)

- `node --check` passes on every `game/src/*.js`.
- Headless test suite `tests/ember-test.mjs`: **all checks pass** — embers score,
  combo builds, levels rise, win reachable at 800, storm hit costs a heart and
  resets the combo, and all four screenshot scenes stage and draw without error
  (start = title/0, play = 410 with 1 heart, win = 820 on the win screen,
  end = 180 on the game-over screen).
- Balance was fixed from testing: the first version was winnable in ~15 seconds
  and the screenshot autopilot froze on close embers; both were caught and fixed
  here (win line 800, 15-second levels, continuous chase autopilot).
- `MAKEFUN_OUTPUT_DIR=out node main.ts` exits 0 and writes `dossier.json`
  (14 files, 544 KiB total, no external references).

## What is still needed before submitting

1. **Anthony's choice** — this is the Best Game entry, the one Muse recommended
   as the best first shot. Say go and it is the entry.
2. **A GitHub account** — the entry must live in a **public repo owned by his own
   GitHub account, created after the competition opened (15 Nov 2026, 16:59 UTC)**,
   under an OSI-approved licence, with this folder's contents at its root
   (`main.ts`, `game/`, `screenshots/`, `vendor/makefun-game.ts`, `LICENSE`).
   Do you have a GitHub account, and what is the username?
3. **Agent connect approval** — entries go in under @teamtony-world. From the kit
   (`curl -sSL "https://make.fun/c/best-game-01/kit" | tar xz`, then inside
   `best-game-01-kit/`): `node cli/makefun.mjs login` prints an approval link and
   code; Anthony approves it signed in to make.fun. That also lets the kit bundle
   the build transcripts (`node cli/makefun.mjs bundle`, then `check`, then
   `submit`). Run `bundle --dry-run` first: if this harness's sessions are not
   found, the entry cannot be submitted with recorded transcripts and the
   fallback is a handed-over session, which is ranked but takes no paid place.
4. **Solana wallet** — link one on the make.fun profile before any winnings can
   pay out in USDC (skipped as "Not now" at account creation).

No win is guaranteed — an AI judge ranks entries pairwise by screenshot and source
outline, top 10 share the $1,000. Nothing above has been submitted anywhere.
