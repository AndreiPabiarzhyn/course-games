let currentLevel = 0;
let slots = Array(SLOT_COUNT).fill(null);
let grid = [];
let startPos = { x: 0, y: 0 };
let goalPos = { x: 0, y: 0 };
let robotPos = { x: 0, y: 0 };
let isRunning = false;
let dragState = null;

function parseLevel(levelDef) {
  grid = levelDef.map.map((row) => row.split(""));
  startPos = { x: 0, y: 0 };
  goalPos = { x: 0, y: 0 };
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === "S") { startPos = { x, y }; grid[y][x] = "."; }
      else if (grid[y][x] === "G") { goalPos = { x, y }; grid[y][x] = "."; }
    }
  }
  robotPos = { ...startPos };
}

function sizeGridCells() {
  const cols = grid[0]?.length || 6;
  const rows = grid.length || 6;
  const pad = 20;
  const w = gridWrapEl.clientWidth - pad;
  const h = gridWrapEl.clientHeight - pad;
  if (w <= 0 || h <= 0) return;
  const gap = 3;
  const cell = Math.floor(Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows));
  const size = Math.max(40, Math.min(cell, 96));
  document.documentElement.style.setProperty("--cell-size", `${size}px`);
}

function buildGrid() {
  const levelDef = LEVELS[currentLevel];
  parseLevel(levelDef);
  gridWrapEl.style.backgroundImage = `url("${levelDef.bg}")`;
  gridBoardEl.innerHTML = "";
  gridBoardEl.style.gridTemplateColumns = `repeat(${grid[0].length}, var(--cell-size, 48px))`;
  gridBoardEl.style.gridTemplateRows = `repeat(${grid.length}, var(--cell-size, 48px))`;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = document.createElement("div");
      const tile = grid[y][x];
      cell.className = "grid-cell";
      if (tile === "#") cell.classList.add("grid-cell--wall");
      else if (x === goalPos.x && y === goalPos.y) cell.classList.add("grid-cell--goal");
      else cell.classList.add("grid-cell--floor");
      cell.dataset.x = x;
      cell.dataset.y = y;
      gridBoardEl.appendChild(cell);
    }
  }
  requestAnimationFrame(() => {
    sizeGridCells();
    positionRobot(false);
  });
}

function getCellCenter(x, y) {
  const cell = gridBoardEl.querySelector(`[data-x="${x}"][data-y="${y}"]`);
  if (!cell) return { left: 0, top: 0 };
  const wrapRect = gridWrapEl.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  return {
    left: cellRect.left - wrapRect.left + cellRect.width / 2,
    top: cellRect.top - wrapRect.top + cellRect.height / 2,
  };
}

function positionRobot(animate) {
  const { left, top } = getCellCenter(robotPos.x, robotPos.y);
  const size = robotWrapEl.offsetWidth || 48;
  robotWrapEl.style.left = `${left - size / 2}px`;
  robotWrapEl.style.top = `${top - size / 2}px`;
  robotWrapEl.style.transition = animate ? "" : "none";
}

function setRobotAngle(angle, animate) {
  robotEl.style.transition = animate ? "transform 0.2s ease" : "none";
  robotEl.style.transform = `rotate(${angle}deg)`;
}

function isWall(x, y) {
  return y < 0 || y >= grid.length || x < 0 || x >= grid[0].length || grid[y][x] === "#";
}

async function executeCommand(cmdId) {
  const move = MOVE[cmdId];
  if (!move) return false;

  setRobotAngle(move.angle, true);
  Sounds.turn();
  await sleep(180);

  const nx = robotPos.x + move.dx;
  const ny = robotPos.y + move.dy;
  if (isWall(nx, ny)) {
    gridWrapEl.classList.add("grid-wrap--shake");
    Sounds.wrong();
    setTimeout(() => gridWrapEl.classList.remove("grid-wrap--shake"), 400);
    return false;
  }

  robotPos = { x: nx, y: ny };
  Sounds.move();
  positionRobot(true);
  robotWrapEl.classList.add("robot-wrap--bounce");
  setTimeout(() => robotWrapEl.classList.remove("robot-wrap--bounce"), 350);
  await sleep(420);
  return true;
}

async function runAlgorithm() {
  if (isRunning) return;
  const program = slots.filter(Boolean);
  if (program.length === 0) return;
  isRunning = true;
  btnRun.disabled = true;
  robotPos = { ...startPos };
  setRobotAngle(MOVE.right.angle, false);
  positionRobot(false);

  for (const cmdId of program) {
    const ok = await executeCommand(cmdId);
    if (!ok) {
      isRunning = false;
      btnRun.disabled = false;
      await sleep(600);
      robotPos = { ...startPos };
      setRobotAngle(MOVE.right.angle, false);
      positionRobot(true);
      return;
    }
    if (robotPos.x === goalPos.x && robotPos.y === goalPos.y) break;
  }

  if (robotPos.x === goalPos.x && robotPos.y === goalPos.y) {
    gridWrapEl.classList.add("grid-wrap--success");
    Sounds.levelUp();
    await sleep(900);
    gridWrapEl.classList.remove("grid-wrap--success");
    if (currentLevel < TOTAL_LEVELS - 1) {
      levelPopup.hidden = false;
      await sleep(1400);
      levelPopup.hidden = true;
      currentLevel++;
      slots = Array(SLOT_COUNT).fill(null);
      refreshUI();
    } else {
      spawnConfetti(confettiEl);
      Sounds.win();
      showScreen(screenWin);
    }
  } else {
    Sounds.wrong();
    gridWrapEl.classList.add("grid-wrap--shake");
    setTimeout(() => gridWrapEl.classList.remove("grid-wrap--shake"), 400);
    await sleep(700);
    robotPos = { ...startPos };
    setRobotAngle(MOVE.right.angle, false);
    positionRobot(true);
  }

  isRunning = false;
  btnRun.disabled = false;
}

function startGame() {
  Sounds.start();
  currentLevel = 0;
  slots = Array(SLOT_COUNT).fill(null);
  isRunning = false;
  showScreen(screenGame);
  refreshUI();
}

function restartGame() {
  confettiEl.innerHTML = "";
  startGame();
}