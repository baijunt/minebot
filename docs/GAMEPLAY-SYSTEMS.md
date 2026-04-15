# Gameplay Systems

## Core Loop

The player:

1. reads the current signal
2. chooses a neighboring tile
3. either survives, finds a mine, or reaches the reward
4. repeats until the level is complete or failed

This is a short, readable, repeatable risk loop.

## Level Generation

Level generation must ensure:

- player start is valid
- reward tile is valid
- mines do not block all solutions
- level 1 begins in a clear-signal state

Generation rules:

- random start
- random reward
- random mine placement
- solvability check using path search
- extra protection around the first stage start

## Signals

Signal system is based on nearby hidden mines.

States:

- `Clear Signal: No warning.`
- `Faint Signal: Mine nearby.`
- `High Risk Signal: Multiple mines.`
- `Mine triggered.`
- `Reward Claimed.`

Signal UI also changes color by severity.

## Scanner

Scanner behavior:

- uses shared scanner pool
- reveals adjacent mines only
- if multiple adjacent mines exist, reveals all adjacent mines
- does not reveal safe tiles
- revealed mines remain visible for the level

Scanner economy:

- base scanner pool starts at 5
- gifts are awarded at new difficulty bands

## Timer

Timer tracks active gameplay time, not wall-clock time.

Timer pauses when:

- game is paused
- ad is shown
- app backgrounds
- scorecard is shown

This makes timing fairer for mobile users.

## Win / Fail Flow

### Fail

- mine is revealed
- level enters failed state
- timer is paused
- player sees retry option

### Win

- reward tile becomes claimed/gold
- level enters won state
- timer pauses until next step
- player can proceed to next level

### Final completion

At the last level:

- scorecard appears
- restart option is shown

## Scoring

Current scorecard includes:

- total time
- average per level
- total failures
- total moves
- scanners used
- mines revealed
- best clean streak
- run score / 100

Score formula currently penalizes:

- overtime relative to baseline
- failures
- scanner use
- extra moves

## Audio

Current sound system is generated in code using Web Audio:

- move sound
- scanner sound
- fail sound
- restart sound
- win sound

Volume states:

- high
- medium
- mute

## Ads

Current ad strategy:

- timed interval
- threshold every 5 minutes of active gameplay
- ad shown only after a level win when moving forward

This avoids interrupting active play.
