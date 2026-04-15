# Mobile Test Checklist

Use this checklist before packaging or publishing.

## Layout

- verify board fits on short Android screens
- verify no control is pushed below the fold unexpectedly
- verify top header does not clip
- verify scorecard fits on smaller screens
- verify pause overlay fits and remains readable

## Input

- verify taps register on all adjacent tiles
- verify no accidental double-move occurs
- verify scanner button always responds
- verify next-level and retry buttons do not dead-click

## State / Lifecycle

- start a run, background the app, reopen it
- pause manually, close app, reopen it
- fail a level, close app, reopen it
- win a level, wait before next level, pause and reopen
- verify timer does not reset incorrectly

## Audio

- verify high / medium / mute are distinguishable
- verify first tap does not silently fail after fresh launch
- verify mute persists after restart

## Timer Fairness

- verify timer pauses during ads
- verify timer pauses on manual pause
- verify timer pauses on app background
- verify timer resumes correctly

## Ads

- verify ad appears only at natural level breaks
- verify ad timeout fallback works if ad bridge fails
- verify next level still starts if ad SDK does not respond

## Progression

- verify stage count updates correctly
- verify difficulty label is correct
- verify scanner pool carries forward correctly
- verify scorecard appears only after final level

## Visual Review

- verify robot stays above reward tile on win
- verify mine reveal is visually clear
- verify signal colors are distinct
- verify logo remains readable on phone brightness levels

## Performance

- verify no obvious lag on repeated moves
- verify no flicker during rerender
- verify no duplicated robot visuals

## Suggested Android device matrix

At minimum test:

- small Android phone
- medium Android phone
- tall modern Android phone
- older/slower Android device

If possible also test:

- Samsung device
- Pixel device
- OnePlus/Xiaomi/Oppo style device

These often expose WebView differences.
