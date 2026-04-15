# Known Issues And Risks

This file tracks notable risks and lessons from development.

## 1. Animation complexity can break the board

During development, clone-based robot movement caused:

- duplicate robots
- ghost rendering
- broken input

Lesson:

- keep one visual owner for the player character whenever possible
- avoid layered duplicates unless absolutely necessary

## 2. Timer fairness is easy to break

The timer previously reset or undercounted on:

- fail state
- win state
- app backgrounding

Lesson:

- bank elapsed time before stopping the clock
- save on lifecycle changes

## 3. Ad integration can deadlock progression

An awaited ad call can hang the player between levels if the SDK stalls.

Mitigation:

- add timeout fallback
- only show ads at natural breaks

## 4. Save-state restore can feel like a glitch

A paused state restored without the pause overlay can make the board appear dead.

Mitigation:

- restore both state and visible overlay together

## 5. Short Android screens are a real constraint

The board and controls can compete for vertical space on smaller phones.

Mitigation:

- add height-based media queries
- reduce spacing and tile minimums on short screens

## 6. Audio UX differs from desktop

Mobile browsers often delay audio until the first user gesture.

Mitigation:

- initialize/resume audio on pointer interaction

## 7. Score formulas are easy to miscalibrate

If the scoring baseline is too strict, clean runs can feel unfairly punished.

Lesson:

- tune score around expected strong play, not idealized perfection

## 8. Web preview is not Android reality

Desktop browser success does not guarantee:

- WebView behavior
- Android lifecycle safety
- AdMob integration behavior
- viewport fit on short devices

Always do device testing before publishing.
