# MineBot Documentation Pack

This folder documents the current MineBot web game so it can be:

- tested more safely on phones
- maintained with less guesswork
- reused as a blueprint for similar games

Files in this folder:

- `GAME-ARCHITECTURE.md`
- `GAMEPLAY-SYSTEMS.md`
- `MOBILE-TEST-CHECKLIST.md`
- `REUSABLE-GAME-TEMPLATE.md`
- `KNOWN-ISSUES-AND-RISKS.md`

Project source files:

- `../index.html`
- `../styles.css`
- `../game.js`

Current game summary:

- grid-based 2D puzzle game
- 6x8 field
- 32 total levels
- difficulty bands: Easy, Medium, Hard, Expert, God
- hidden mines with scanner mechanic
- persistent save state
- timed ad trigger every 5 minutes of active gameplay
- final scorecard with a score out of 100

Use this folder as the starting point before:

- refactoring systems
- packaging as Android
- building similar games
- changing monetization or progression
