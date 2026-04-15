# Game Architecture

## File Roles

### `index.html`
Defines:

- app shell
- header
- stats
- board container
- signal panel
- action buttons
- score overlay
- pause overlay

It is intentionally small and mostly declarative.

### `styles.css`
Defines:

- overall visual theme
- responsive layout
- grid/tile appearance
- robot appearance
- signal color states
- overlays
- button styling
- animation timing

### `game.js`
Contains almost all runtime logic:

- state creation and persistence
- level generation
- rendering
- move handling
- scanner behavior
- timer
- pause/resume
- ad timing
- score calculation
- win/fail flow

## Runtime Model

The game is a single-page app with a single shared state object.

Important state fields:

- `stage`
- `moves`
- `totalMoves`
- `totalFailures`
- `scannersUsed`
- `totalMinesRevealed`
- `currentCleanStreak`
- `bestCleanStreak`
- `player`
- `reward`
- `mines`
- `visited`
- `scannedMines`
- `state` (`playing`, `won`, `failed`)
- `scannersLeft`
- `soundLevel`
- `gameCompleted`
- `nextAdAtMs`
- `signalTitle`
- `message`
- `hint`

## Render Flow

High-level render loop:

1. state changes
2. `render()` updates top-level UI
3. `renderField()` rebuilds the 6x8 board
4. interactive classes and robot state are applied

This code uses full board rerendering instead of fine-grained DOM patching. That keeps the logic simpler, but means animation/state timing must be handled carefully.

## Input Flow

1. player taps a neighboring tile
2. `onTileClick()` validates adjacency and lock state
3. `movePlayerTo()` applies the move
4. state is updated
5. win/fail/normal continuation is evaluated
6. UI rerenders

## Persistence

The game uses `localStorage` with:

- save key: `minebot-save-v2`

What is persisted:

- run progress
- timer progress
- board state
- scanner pool
- score metrics
- pause state
- ad timing threshold

## Difficulty Model

Difficulty is stage-based:

- 1-6: Easy
- 7-15: Medium
- 16-24: Hard
- 25-30: Expert
- 31-32: God

Mine density and score expectations scale from this.

## Ad Model

The game no longer uses level-triggered ads.

Current model:

- active gameplay timer based
- ad threshold every 5 minutes
- ad only appears at a natural level break
- ad time does not count toward gameplay time

## Why this architecture is reusable

This structure can be reused for similar games where:

- the board is tile-based
- game state is local and deterministic
- progression is stage-driven
- the player moves one step at a time
- hazards are hidden or semi-hidden

Only these parts usually need replacement:

- generation logic
- signal logic
- scoring formula
- art/theme
- special abilities
