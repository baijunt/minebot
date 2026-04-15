const COLS = 6;
const ROWS = 8;
const TOTAL_LEVELS = 32;
const TOTAL_SCANNERS = 5;
const MAX_DENSITY = 0.42;
const MAX_ATTEMPTS = 300;
const AD_INTERVAL_MS = 5 * 60 * 1000;
const SAVE_KEY = "minebot-save-v2";
const LEGACY_SAVE_KEYS = ["minebot-run-test-mode-save-v1"];

const fieldWrap = document.querySelector(".field-wrap");
const field = document.querySelector("#field");
const stageText = document.querySelector("#stageText");
const movesText = document.querySelector("#movesText");
const minesText = document.querySelector("#minesText");
const timerText = document.querySelector("#timerText");
const signalTitle = document.querySelector("#signalTitle");
const messageText = document.querySelector("#messageText");
const hintText = document.querySelector("#hintText");
const messagePanel = document.querySelector("#messagePanel");
const scanButton = document.querySelector("#scanButton");
const tryAgainButton = document.querySelector("#tryAgainButton");
const nextLevelButton = document.querySelector("#nextLevelButton");
const newRunButton = document.querySelector("#newRunButton");
const soundButton = document.querySelector("#soundButton");
const pauseButton = document.querySelector("#pauseButton");
const pauseOverlay = document.querySelector("#pauseOverlay");
const resumeButton = document.querySelector("#resumeButton");
const scoreOverlay = document.querySelector("#scoreOverlay");
const scoreTotalTime = document.querySelector("#scoreTotalTime");
const scoreAverageTime = document.querySelector("#scoreAverageTime");
const scoreFailures = document.querySelector("#scoreFailures");
const scoreMoves = document.querySelector("#scoreMoves");
const scoreScannersUsed = document.querySelector("#scoreScannersUsed");
const scoreMinesRevealed = document.querySelector("#scoreMinesRevealed");
const scoreBestStreak = document.querySelector("#scoreBestStreak");
const scoreRank = document.querySelector("#scoreRank");
const scoreRestartButton = document.querySelector("#scoreRestartButton");

let tiles = [];
let audioContext = null;
let timerHandle = null;
let moveLock = false;
let paused = false;
let runClockStartedAt = 0;
let runElapsedMs = 0;
let scannerFlashKeys = new Set();
let appBackgroundPaused = false;

let state = createFreshState();

function createFreshState() {
  return {
    stage: 1,
    moves: 0,
    totalMoves: 0,
    totalFailures: 0,
    scannersUsed: 0,
    totalMinesRevealed: 0,
    currentCleanStreak: 0,
    bestCleanStreak: 0,
    player: { x: 0, y: ROWS - 1 },
    reward: { x: COLS - 1, y: 0 },
    mines: [],
    visited: [],
    scannedMines: [],
    state: "playing",
    scannersLeft: TOTAL_SCANNERS,
    revealMines: false,
    soundLevel: 2,
    lastAwardedBand: "Easy",
    gameCompleted: false,
    nextAdAtMs: AD_INTERVAL_MS,
    signalTitle: "Mission Signal",
    message: "Clear Signal: No warning.",
    hint: "",
    signalLevel: "clear",
    landingRobot: false,
    stageIntro: true
  };
}

function difficultyForStage(stage) {
  if (stage <= 6) return "Easy";
  if (stage <= 15) return "Medium";
  if (stage <= 24) return "Hard";
  if (stage <= 30) return "Expert";
  return "God";
}

function densityForStage(stage) {
  if (stage <= 3) return 0.11;
  if (stage <= 6) return 0.15;
  if (stage <= 15) return 0.22;
  if (stage <= 24) return 0.31;
  if (stage <= 30) return Math.min(MAX_DENSITY, 0.38 + (stage - 25) * 0.008);
  return Math.min(0.74, 0.62 + (stage - 31) * 0.08);
}

function mineCountForStage(stage) {
  const count = Math.round(COLS * ROWS * densityForStage(stage));
  const maxMines = stage > 30 ? 30 : 20;
  return Math.max(5, Math.min(count, maxMines));
}

function keyOf(x, y) {
  return `${x},${y}`;
}

function inBounds(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

function neighborsOf(x, y) {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y }
  ].filter((pos) => inBounds(pos.x, pos.y));
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function adjacentMineCount(x, y, mineSet = new Set(state.mines)) {
  return neighborsOf(x, y).filter((pos) => mineSet.has(keyOf(pos.x, pos.y))).length;
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function sanitizeLegacySaves() {
  for (const key of LEGACY_SAVE_KEYS) {
    localStorage.removeItem(key);
  }
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, runElapsedMs, paused }));
}

function updateTimer() {
  const total = runElapsedMs + (timerHandle ? performance.now() - runClockStartedAt : 0);
  timerText.textContent = formatTime(total);
}

function stopRunClock() {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}

function startRunClock() {
  stopRunClock();
  runClockStartedAt = performance.now();
  timerHandle = window.setInterval(updateTimer, 250);
  updateTimer();
}

function pauseRunClock() {
  if (!timerHandle) return;
  runElapsedMs += performance.now() - runClockStartedAt;
  stopRunClock();
  updateTimer();
}

function resumeRunClock() {
  if (paused || state.state !== "playing") return;
  startRunClock();
}

function isReachablePath(start, reward, mineSet) {
  const queue = [start];
  const seen = new Set([keyOf(start.x, start.y)]);
  while (queue.length) {
    const node = queue.shift();
    if (node.x === reward.x && node.y === reward.y) return true;
    for (const next of neighborsOf(node.x, node.y)) {
      const key = keyOf(next.x, next.y);
      if (seen.has(key) || mineSet.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return false;
}

function randomCell() {
  return { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
}

function randomStartAndReward() {
  let start = randomCell();
  let reward = randomCell();
  let attempts = 0;
  while ((start.x === reward.x && start.y === reward.y) || manhattan(start, reward) < 5) {
    if (attempts++ > 40) break;
    start = randomCell();
    reward = randomCell();
  }
  return { start, reward };
}

function generateBoard(stage) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const { start, reward } = randomStartAndReward();
    const forbidden = new Set([keyOf(start.x, start.y), keyOf(reward.x, reward.y)]);
    if (stage === 1) {
      for (const pos of neighborsOf(start.x, start.y)) forbidden.add(keyOf(pos.x, pos.y));
    }
    const mineSet = new Set();
    while (mineSet.size < mineCountForStage(stage)) {
      const pos = randomCell();
      const key = keyOf(pos.x, pos.y);
      if (forbidden.has(key)) continue;
      mineSet.add(key);
    }
    if (stage === 1 && adjacentMineCount(start.x, start.y, mineSet) !== 0) continue;
    if (!isReachablePath(start, reward, mineSet)) continue;
    state.player = start;
    state.reward = reward;
    state.mines = [...mineSet];
    state.visited = [keyOf(start.x, start.y)];
    return;
  }
}

function awardScannerGift(stage) {
  const band = difficultyForStage(stage);
  if (band !== state.lastAwardedBand) {
    state.scannersLeft += 2;
    state.lastAwardedBand = band;
  }
}

function clearPendingTravel() {
  moveLock = false;
}

function syncPauseOverlay() {
  pauseOverlay.hidden = !paused;
}

function clearScannerFlashSoon() {
  window.setTimeout(() => {
    if (scannerFlashKeys.size) {
      scannerFlashKeys.clear();
      render();
    }
  }, 620);
}

function startStage(stage, isNewRun = false) {
  clearPendingTravel();
  state.stage = stage;
  state.moves = 0;
  state.state = "playing";
  state.revealMines = false;
  state.visited = [];
  state.scannedMines = [];
  state.signalTitle = "Mission Signal";
  state.message = "Clear Signal: No warning.";
  state.hint = `Level: ${difficultyForStage(stage)}`;
  state.signalLevel = "clear";
  state.landingRobot = false;
  state.stageIntro = true;
  scannerFlashKeys.clear();

  if (isNewRun) {
    state.scannersLeft = TOTAL_SCANNERS;
    state.lastAwardedBand = "Easy";
    state.totalMoves = 0;
    state.totalFailures = 0;
    state.scannersUsed = 0;
    state.totalMinesRevealed = 0;
    state.currentCleanStreak = 0;
    state.bestCleanStreak = 0;
    state.nextAdAtMs = AD_INTERVAL_MS;
  } else {
    awardScannerGift(stage);
  }

  generateBoard(stage);
  updateSignalFromBoard();
  render();
  startRunClock();
  saveGame();
}

function startNewRun() {
  stopRunClock();
  paused = false;
  appBackgroundPaused = false;
  runElapsedMs = 0;
  state = createFreshState();
  syncPauseOverlay();
  scoreOverlay.hidden = true;
  startStage(1, true);
}

function loadGame() {
  sanitizeLegacySaves();
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    startNewRun();
    return;
  }
  try {
    const loaded = JSON.parse(raw);
    if (loaded.gameCompleted) {
      localStorage.removeItem(SAVE_KEY);
      startNewRun();
      return;
    }
    state = { ...createFreshState(), ...loaded };
    if (typeof loaded.soundLevel !== "number" && typeof loaded.soundOn === "boolean") {
      state.soundLevel = loaded.soundOn ? 2 : 0;
    }
    runElapsedMs = Number(loaded.runElapsedMs || 0);
    paused = Boolean(loaded.paused);
    if (state.state === "failed") {
      state.signalTitle = "Mine triggered.";
      state.message = `Level ${state.stage} failed. Retry.`;
      state.signalLevel = "fail";
      state.hint = "";
    }
    syncPauseOverlay();
    render();
    if (!paused && state.state === "playing") startRunClock();
  } catch {
    localStorage.removeItem(SAVE_KEY);
    startNewRun();
  }
}

function signalClass(level) {
  switch (level) {
    case "clear": return "signal-clear";
    case "warn": return "signal-warn";
    case "danger": return "signal-danger";
    case "fail": return "signal-fail";
    case "win": return "signal-win";
    default: return "signal-neutral";
  }
}

function robotMood() {
  if (state.state === "failed") return "sad";
  if (state.state === "won") return "cheer";
  const count = adjacentMineCount(state.player.x, state.player.y);
  if (count >= 2) return "alert";
  if (count === 1) return "curious";
  return "";
}

function reachableTiles() {
  return neighborsOf(state.player.x, state.player.y);
}

function shouldShowTutorialArrows() {
  return state.stage === 1 && state.moves < 3 && state.state === "playing";
}

function arrowClassForDirection(dx, dy) {
  if (dx === 1) return "arrow-right";
  if (dx === -1) return "arrow-left";
  if (dy === 1) return "arrow-down";
  return "arrow-up";
}

function buildRobot(mood = "") {
  const robot = document.createElement("div");
  robot.className = `robot ${mood}`.trim();
  robot.innerHTML = `
    <div class="antenna"></div>
    <div class="head">
      <div class="visor">
        <span class="eye left"></span>
        <span class="eye right"></span>
      </div>
      <div class="mouth"></div>
    </div>
    <div class="body">
      <div class="panel-light"></div>
    </div>
    <div class="arm left"></div>
    <div class="arm right"></div>
    <div class="leg left"></div>
    <div class="leg right"></div>
  `;
  if (mood === "curious") {
    const question = document.createElement("div");
    question.className = "question";
    question.textContent = "?";
    robot.appendChild(question);
  }
  return robot;
}

function getTileElement(x, y) {
  return tiles[y * COLS + x] || null;
}

function renderField() {
  field.innerHTML = "";
  tiles = [];
  const mineSet = new Set(state.mines);
  const visitedSet = new Set(state.visited);
  const scannedSet = new Set(state.scannedMines);
  const reachable = new Set(reachableTiles().map((pos) => keyOf(pos.x, pos.y)));
  const mood = robotMood();

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      const key = keyOf(x, y);

      if (visitedSet.has(key)) tile.classList.add("visited");
      if (reachable.has(key) && state.state === "playing") tile.classList.add("reachable");
      if (x === state.reward.x && y === state.reward.y && !visitedSet.has(key)) tile.classList.add("reward");
      if (x === state.reward.x && y === state.reward.y && state.state === "won") tile.classList.add("reward-hit");
      if (scannedSet.has(key)) tile.classList.add("scanned-mine");
      if (scannerFlashKeys.has(key)) tile.classList.add("scanner-flash");
      if (state.revealMines && mineSet.has(key)) tile.classList.add("reveal-mine");
      if (state.revealMines && key === keyOf(state.player.x, state.player.y) && mineSet.has(key)) tile.classList.add("exploded");

      if (x === state.player.x && y === state.player.y) {
        const anchor = document.createElement("div");
        anchor.className = "robot-anchor";
        const robot = buildRobot(mood);
        if (state.state === "playing" && state.landingRobot) robot.classList.add("robot-landing");
        anchor.appendChild(robot);
        tile.appendChild(anchor);
      }

      if (shouldShowTutorialArrows() && reachable.has(key)) {
        const arrow = document.createElement("div");
        arrow.className = `tutorial-arrow ${arrowClassForDirection(x - state.player.x, y - state.player.y)}`;
        arrow.textContent = "▲";
        tile.appendChild(arrow);
      }

      tile.addEventListener("pointerdown", () => tile.classList.add("tile-press"));
      tile.addEventListener("pointerup", () => tile.classList.remove("tile-press"));
      tile.addEventListener("pointerleave", () => tile.classList.remove("tile-press"));
      tile.addEventListener("pointercancel", () => tile.classList.remove("tile-press"));
      tile.addEventListener("click", () => onTileClick(x, y));
      field.appendChild(tile);
      tiles.push(tile);
    }
  }
}

function render() {
  stageText.textContent = `${state.stage}/${TOTAL_LEVELS}`;
  movesText.textContent = String(state.moves);
  minesText.textContent = String(state.mines.length);
  updateTimer();
  scanButton.textContent = `Mine Scanner: ${state.scannersLeft} left`;
  scanButton.disabled = paused || state.state !== "playing" || state.scannersLeft <= 0;
  tryAgainButton.hidden = state.state !== "failed";
  nextLevelButton.hidden = !(state.state === "won" && state.stage < TOTAL_LEVELS);
  messagePanel.className = `message-panel ${signalClass(state.signalLevel)}${state.stageIntro ? " message-intro" : ""}`;
  signalTitle.textContent = state.signalTitle;
  messageText.textContent = state.message;
  hintText.hidden = !state.hint;
  hintText.textContent = state.hint;
  pauseButton.textContent = paused ? "Paused" : "Pause";
  pauseButton.setAttribute("aria-pressed", paused ? "true" : "false");
  soundButton.classList.remove("sound-high", "sound-medium", "sound-mute");
  soundButton.classList.add(state.soundLevel === 2 ? "sound-high" : state.soundLevel === 1 ? "sound-medium" : "sound-mute");
  soundButton.setAttribute("aria-label", state.soundLevel === 2 ? "Sound high" : state.soundLevel === 1 ? "Sound medium" : "Sound mute");
  soundButton.setAttribute("aria-pressed", state.soundLevel === 0 ? "false" : "true");
  soundButton.title = state.soundLevel === 2 ? "Sound: High" : state.soundLevel === 1 ? "Sound: Medium" : "Sound: Mute";
  syncPauseOverlay();
  renderField();
}

function safestDirection() {
  const neighbors = neighborsOf(state.player.x, state.player.y).filter((pos) => !state.mines.includes(keyOf(pos.x, pos.y)));
  if (!neighbors.length) return "up";
  neighbors.sort((a, b) => adjacentMineCount(a.x, a.y) - adjacentMineCount(b.x, b.y) || manhattan(a, state.reward) - manhattan(b, state.reward));
  const best = neighbors[0];
  if (best.x > state.player.x) return "right";
  if (best.x < state.player.x) return "left";
  if (best.y > state.player.y) return "down";
  return "up";
}

function buildDirectionalHint() {
  const safer = safestDirection();
  const map = {
    up: { clock: "12 o'clock", arc: "forward arc", body: "straight ahead", bearing: "000", edge: "upper lane" },
    right: { clock: "3 o'clock", arc: "right arc", body: "right shoulder", bearing: "090", edge: "right edge" },
    down: { clock: "6 o'clock", arc: "rear arc", body: "back trail", bearing: "180", edge: "lower lane" },
    left: { clock: "9 o'clock", arc: "left arc", body: "left shoulder", bearing: "270", edge: "left edge" }
  }[safer];
  const opposite = { up: "6 o'clock", right: "9 o'clock", down: "12 o'clock", left: "3 o'clock" }[safer];
  const families = [
    [`favor ${map.clock}.`, `avoid ${opposite}.`],
    [`favor the ${map.arc}.`, `stay clear of the opposite arc.`],
    [`safer vector off ${map.body}.`, `reject the opposite vector.`],
    [`probe the cleaner lane.`, `do not push the direct trap line.`],
    [`interference drops near ${map.clock}.`, `signal clutter spikes away from ${map.clock}.`],
    [`favor bearing ${map.bearing}.`, `avoid the reverse bearing.`],
    [`go near ${map.clock}.`, `never ${opposite}.`],
    [`angle off your ${map.body}.`, `leave the opposite shoulder alone.`],
    [`veer toward the clearer lane.`, `do not hold the crowded line.`],
    [`take the softer diagonal bias.`, `avoid the crowded ${map.edge}.`],
    [`swing clockwise.`, `do not keep the current line.`]
  ];
  const pair = families[Math.floor(Math.random() * families.length)];
  return pair[Math.floor(Math.random() * pair.length)];
}

function updateSignalFromBoard() {
  if (state.state !== "playing") return;
  const nearby = adjacentMineCount(state.player.x, state.player.y);
  state.signalTitle = "Mission Signal";
  if (nearby === 0) {
    state.message = "Clear Signal: No warning.";
    state.hint = state.stageIntro ? `Level: ${difficultyForStage(state.stage)}` : "";
    state.signalLevel = "clear";
  } else if (nearby === 1) {
    state.message = "Faint Signal: Mine nearby.";
    state.hint = state.stageIntro ? `Level: ${difficultyForStage(state.stage)}` : "";
    state.signalLevel = "warn";
  } else {
    state.message = "High Risk Signal: Multiple mines.";
    state.hint = `Hint: ${buildDirectionalHint()}`;
    state.signalLevel = "danger";
  }
}

function onTileClick(x, y) {
  if (paused || state.state !== "playing" || moveLock) return;
  const isAdjacent = neighborsOf(state.player.x, state.player.y).some((pos) => pos.x === x && pos.y === y);
  if (!isAdjacent) return;
  movePlayerTo(x, y);
}

function movePlayerTo(x, y) {
  moveLock = true;
  state.stageIntro = false;
  state.player = { x, y };
  state.landingRobot = true;
  state.moves += 1;
  state.totalMoves += 1;
  const stepKey = keyOf(x, y);
  if (!state.visited.includes(stepKey)) {
    state.visited.push(stepKey);
    state.currentCleanStreak += 1;
    state.bestCleanStreak = Math.max(state.bestCleanStreak, state.currentCleanStreak);
  }
  playStepSound();
  render();
  window.setTimeout(() => {
    state.landingRobot = false;
    clearPendingTravel();
    if (state.mines.includes(stepKey)) {
      failLevel();
      return;
    }
    if (x === state.reward.x && y === state.reward.y) {
      winLevel();
      return;
    }
    updateSignalFromBoard();
    render();
    saveGame();
  }, 170);
}

function useScanner() {
  if (paused || state.state !== "playing" || state.scannersLeft <= 0) return;
  state.stageIntro = false;
  const adjacent = neighborsOf(state.player.x, state.player.y)
    .filter((pos) => state.mines.includes(keyOf(pos.x, pos.y)) && !state.scannedMines.includes(keyOf(pos.x, pos.y)));
  state.scannersLeft -= 1;
  state.scannersUsed += 1;
  if (!adjacent.length) {
    state.signalTitle = "Mission Signal";
    state.message = "Mine Scanner found no adjacent mine.";
    state.hint = "";
    state.signalLevel = "clear";
    playScanSound();
    render();
    saveGame();
    return;
  }
  const revealList = adjacent.length >= 2 ? adjacent : [adjacent[0]];
  for (const pos of revealList) {
    const key = keyOf(pos.x, pos.y);
    if (!state.scannedMines.includes(key)) {
      state.scannedMines.push(key);
      state.totalMinesRevealed += 1;
    }
    scannerFlashKeys.add(key);
  }
  playScanSound();
  updateSignalFromBoard();
  render();
  saveGame();
  clearScannerFlashSoon();
}

function failLevel() {
  state.state = "failed";
  state.revealMines = true;
  state.totalFailures += 1;
  state.currentCleanStreak = 0;
  state.signalTitle = "Mine triggered.";
  state.message = `Level ${state.stage} failed. Retry.`;
  state.hint = "";
  state.signalLevel = "fail";
  pauseRunClock();
  playFailSound();
  render();
  saveGame();
}

function winLevel() {
  state.state = "won";
  state.signalTitle = "Reward Claimed.";
  state.message = `Level ${state.stage} completed.`;
  state.hint = "";
  state.signalLevel = "win";
  pauseRunClock();
  playWinSound();
  render();
  saveGame();
  if (state.stage === TOTAL_LEVELS) finishRun();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function computeRunScore(elapsed) {
  const elapsedSeconds = elapsed / 1000;
  const targetSeconds = TOTAL_LEVELS * 12;
  const timeOver = Math.max(0, elapsedSeconds - targetSeconds);
  const timePenalty = clamp(timeOver / 18, 0, 15);

  const failurePenalty = clamp(state.totalFailures * 10, 0, 40);
  const scannerPenalty = clamp(state.scannersUsed * 2, 0, 14);

  const idealMoves = TOTAL_LEVELS * 8;
  const extraMoves = Math.max(0, state.totalMoves - idealMoves);
  const movePenalty = clamp(extraMoves / 14, 0, 15);

  const rawScore = 100 - timePenalty - failurePenalty - scannerPenalty - movePenalty;
  return Math.round(clamp(rawScore, 0, 100));
}

function finishRun() {
  pauseRunClock();
  state.gameCompleted = true;
  scoreTotalTime.textContent = formatTime(runElapsedMs);
  scoreAverageTime.textContent = formatTime(runElapsedMs / TOTAL_LEVELS);
  scoreFailures.textContent = String(state.totalFailures);
  scoreMoves.textContent = String(state.totalMoves);
  scoreScannersUsed.textContent = String(state.scannersUsed);
  scoreMinesRevealed.textContent = String(state.totalMinesRevealed);
  scoreBestStreak.textContent = String(state.bestCleanStreak);
  scoreRank.textContent = `${computeRunScore(runElapsedMs)}/100`;
  scoreOverlay.hidden = false;
  saveGame();
}

async function showTimedAd() {
  const timeoutMs = 8000;
  const withTimeout = (promise) => Promise.race([
    promise,
    new Promise((resolve) => window.setTimeout(resolve, timeoutMs))
  ]);
  try {
    if (window.MineBotAds && typeof window.MineBotAds.showCheckpointAd === "function") {
      await withTimeout(window.MineBotAds.showCheckpointAd({ trigger: "time", elapsedMs: runElapsedMs }));
      return;
    }
    if (window.Capacitor?.Plugins?.AdMob?.showInterstitial) {
      await withTimeout(window.Capacitor.Plugins.AdMob.showInterstitial());
    }
  } catch {
    // Continue seamlessly if no ad bridge exists.
  }
}

async function maybeShowTimedAd() {
  if (runElapsedMs < state.nextAdAtMs) return;
  await showTimedAd();
  while (runElapsedMs >= state.nextAdAtMs) {
    state.nextAdAtMs += AD_INTERVAL_MS;
  }
  saveGame();
}

async function goToNextLevel() {
  if (state.state !== "won" || state.stage >= TOTAL_LEVELS) return;
  const upcomingStage = state.stage + 1;
  pauseRunClock();
  await maybeShowTimedAd();
  if (!paused) startStage(upcomingStage);
}

function canPause() {
  return !moveLock && !state.gameCompleted && (state.state === "playing" || state.state === "won");
}

function pauseGame() {
  if (!canPause()) return;
  paused = true;
  appBackgroundPaused = false;
  pauseRunClock();
  render();
  saveGame();
}

function resumeGame() {
  paused = false;
  appBackgroundPaused = false;
  resumeRunClock();
  render();
  saveGame();
}

function autoPauseForBackground() {
  if (state.gameCompleted || paused || moveLock) return;
  if (state.state !== "playing" && state.state !== "won") return;
  appBackgroundPaused = true;
  paused = true;
  pauseRunClock();
  render();
  saveGame();
}

function toggleSound() {
  state.soundLevel = (state.soundLevel + 2) % 3;
  render();
  saveGame();
}

function ensureAudioContext() {
  if (state.soundLevel === 0) return null;
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function playTone(frequency, duration, type = "sine", gainValue = 0.04, when = 0) {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const volumeMultiplier = state.soundLevel === 2 ? 1.15 : 0.48;
  const scaledGain = gainValue * volumeMultiplier;
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = scaledGain;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const start = ctx.currentTime + when;
  osc.start(start);
  gain.gain.setValueAtTime(scaledGain, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.stop(start + duration);
}

function playStepSound() {
  playTone(250, 0.08, "triangle", 0.024);
  playTone(380, 0.05, "sine", 0.012, 0.012);
}

function playScanSound() {
  playTone(520, 0.11, "triangle", 0.028);
  playTone(720, 0.16, "sine", 0.02, 0.03);
}

function playFailSound() {
  playTone(170, 0.2, "sawtooth", 0.03);
  playTone(118, 0.26, "triangle", 0.024, 0.04);
}

function playRestartSound() {
  playTone(340, 0.08, "triangle", 0.028);
  playTone(470, 0.12, "triangle", 0.025, 0.05);
}

function playWinSound() {
  playTone(520, 0.12, "triangle", 0.026);
  playTone(660, 0.14, "triangle", 0.024, 0.04);
  playTone(820, 0.22, "sine", 0.022, 0.09);
}

scanButton.addEventListener("click", useScanner);
tryAgainButton.addEventListener("click", () => startStage(state.stage));
nextLevelButton.addEventListener("click", goToNextLevel);
newRunButton.addEventListener("click", () => {
  playRestartSound();
  localStorage.removeItem(SAVE_KEY);
  startNewRun();
});
scoreRestartButton.addEventListener("click", () => {
  playRestartSound();
  localStorage.removeItem(SAVE_KEY);
  startNewRun();
});
soundButton.addEventListener("click", toggleSound);
pauseButton.addEventListener("click", pauseGame);
resumeButton.addEventListener("click", resumeGame);

document.addEventListener("pointerdown", () => {
  ensureAudioContext();
}, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    autoPauseForBackground();
  }
});

window.addEventListener("pagehide", () => {
  autoPauseForBackground();
});

loadGame();
