# Reusable Game Template

Use MineBot as a base for similar games with:

- tile movement
- hidden hazards
- puzzle/risk progression
- short replay loops

## What to keep

Keep these systems mostly as-is:

- save/load system
- timer system
- pause/resume system
- scorecard system
- ad-timing system
- mobile layout shell

## What to replace for a new game

### Theme

Replace:

- logo
- palette
- robot art
- text copy
- sounds

### Hazard logic

Replace:

- mine placement
- signal logic
- scanner logic

Examples:

- lasers
- traps
- enemies
- collapsing tiles
- poison tiles

### Win condition

Replace reward logic with:

- key pickup
- exit tile
- rescue target
- treasure collection
- multi-step objective

## Minimal clone workflow

1. duplicate `MineBotRunWeb`
2. rename game text and assets
3. change board theme in CSS
4. replace generation logic in `game.js`
5. replace signal messages
6. tune score formula for the new game
7. retest mobile lifecycle

## Systems worth extracting later

If building many similar games, consider extracting:

- grid board utility
- save manager
- timer manager
- score manager
- ad scheduler
- overlay manager

That would reduce duplication across projects.

## Good future variants

- ice field with cracking tiles
- stealth bot avoiding sensors
- toxic maze with temporary safe routes
- energy routing puzzle with overload nodes
- alien ruins with hidden traps

All of these can reuse the same shell with different rules.
