# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

Open `index.html` directly in a browser — no build step, no server required:

```bash
open index.html
```

## Repository Structure

This is a two-file vanilla JS browser game — no framework, no bundler, no dependencies.

- `index.html` — Canvas shell (800×600), CSS (`cursor: none`, dark bg), loads `game.js`
- `game.js` — All game logic: constants, state machine, all classes and modules

## Architecture (`game.js`)

### State Machine
`GameState.state` drives the entire loop: `MENU → PLAYING → LEVEL_TRANSITION → PLAYING → … → GAME_OVER`

Transitions:
- `GameState.startGame()` — resets and enters PLAYING
- `GameState.nextLevel()` — advances level index; enters LEVEL_TRANSITION or GAME_OVER (victory)
- `GameState.finishTransition()` — enters PLAYING and calls `initLevel()`
- `GameState.reset()` — returns to MENU

### Game Loop (`loop()`)
Single `requestAnimationFrame` loop. Delta time is computed and capped at 100ms, then normalized to 60fps units (`dt = rawDt / (1000/60)`). All movement/timer logic multiplies by `dt`.

Order each frame: update input → update state-specific logic → render.

### Key Globals
- `bullets` — array of `Bullet` instances, reset on `initLevel()`
- `WaveManager` — singleton managing enemy spawning and wave progression
- `Particles` — singleton flat-array particle system
- `Player` — singleton player object
- `Input` — singleton tracking keyboard and mouse state; call `Input.clearFrame()` each tick to reset one-shot events

### Level Data
`LEVELS[]` is a plain array of config objects. Each entry has `enemySpeedMult`, `enemyHpMult`, and `waves[]`. Each wave has an `enemies[]` array of `{ type, count }` and a `spawnInterval` (frames between spawns). `GameState.levelIndex` indexes into this array.

### Enemy Types
Defined via a `type` string passed to the `Enemy` constructor: `"basic"`, `"fast"`, `"tank"`. Stats (speed, hp, radius, score) are set in the constructor switch. Draw methods are `_drawBasic`, `_drawFast`, `_drawTank` — all procedural canvas shapes, no image assets.

### Collision Detection
`circleCircle(a, b)` — `Math.hypot` distance check against `a.radius + b.radius`. Called in `checkCollisions()` for bullets↔enemies and enemies↔player.

## GitHub Integration

A Claude Code GitHub Actions workflow (`.github/workflows/claude.yml`) is configured. Mention `@claude` in any issue, PR, or comment to trigger it. Requires `ANTHROPIC_API_KEY` set as a repository secret.

## Commit Convention

- First line: concise imperative summary (what + why at a glance)
- Body: bullet list of specific changes grouped by concern
- Always include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` trailer
- Push to `origin master` after each meaningful change
