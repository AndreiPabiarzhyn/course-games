/**
 * Fix Wiring — детская игра (6–7 лет)
 * Перетаскивание проводов за явную «медную» ручку
 */

const WIRE_DEFS = [
  { id: "yellow", color: "#FFCA28", dark: "#F9A825", light: "#FFEB3B", symbol: "★" },
  { id: "blue",   color: "#42A5F5", dark: "#1565C0", light: "#64B5F6", symbol: "▲" },
  { id: "pink",   color: "#EC407A", dark: "#AD1457", light: "#F48FB1", symbol: "✕" },
  { id: "red",    color: "#EF5350", dark: "#C62828", light: "#EF9A9A", symbol: "●" },
];

const LEVELS = [
  ["pink", "yellow", "blue", "red"],
  ["blue", "red", "pink", "yellow"],
  ["red", "pink", "yellow", "blue"],
];

const LEFT_ORDER = ["yellow", "blue", "pink", "red"];
const TOTAL_LEVELS = LEVELS.length;

// --- DOM ---
const screenStart = document.getElementById("screen-start");
const screenGame  = document.getElementById("screen-game");
const screenWin   = document.getElementById("screen-win");
const btnStart    = document.getElementById("btn-start");
const btnRestart  = document.getElementById("btn-restart");
const levelBadge  = document.getElementById("level-badge");
const levelPopup  = document.getElementById("level-popup");
const gameBoard   = document.getElementById("game-board");
const panel       = document.getElementById("panel");
const canvas      = document.getElementById("wire-canvas");
const ctx         = canvas.getContext("2d");
const terminalsLeftEl  = document.getElementById("terminals-left");
const terminalsRightEl = document.getElementById("terminals-right");
const dragHandlesEl    = document.getElementById("drag-handles");
const confettiEl  = document.getElementById("confetti");

// --- State ---
let currentLevel = 0;
let wires = [];
let dragging = null;
let dragPointer = null;
let leftTerminals = [];
let rightTerminals = [];
let dragHandles = [];
let animFrame = null;

const audioCtx = typeof AudioContext !== "undefined" ? new AudioContext() : null;

function playTone(freq, duration = 0.15, type = "sine", volume = 0.18) {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function soundConnect()  { playTone(660, 0.12); setTimeout(() => playTone(880, 0.15), 80); }
function soundWrong()    { playTone(220, 0.2, "square", 0.1); }
function soundLevelUp()  { [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.18), i * 120)); }
function soundWin()      { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.22), i * 150)); }
function soundStart()    { playTone(440, 0.1); setTimeout(() => playTone(554, 0.12), 100); }

function showScreen(screen) {
  [screenStart, screenGame, screenWin].forEach((s) => {
    s.classList.toggle("screen--active", s === screen);
  });
}

function getSnapRadius() {
  return Math.max(44, getInnerPanel().clientWidth * 0.11);
}

function getWireWidth() {
  return Math.max(10, getInnerPanel().clientWidth * 0.028);
}

// --- Terminals & drag handles ---
function createTerminal(wireId, side) {
  const def = WIRE_DEFS.find((w) => w.id === wireId);
  const row = document.createElement("div");
  row.className = "terminal-row";

  const el = document.createElement("div");
  el.className = `terminal terminal--${wireId}`;
  el.dataset.wire = wireId;
  el.dataset.side = side;
  el.innerHTML = `<span>${def.symbol}</span><div class="terminal__plug"></div>`;
  el.setAttribute("aria-label", `${def.id} ${side === "left" ? "старт" : "финиш"}`);

  row.appendChild(el);
  return { row, el };
}

function createDragHandle(wireId) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `drag-handle drag-handle--${wireId}`;
  btn.dataset.wire = wireId;
  btn.setAttribute("aria-label", `Потянуть ${wireId} провод`);
  btn.innerHTML = `
    <span class="drag-handle__wire"></span>
    <span class="drag-handle__ring"></span>
    <span class="drag-handle__copper"></span>
  `;
  btn.addEventListener("pointerdown", (e) => startDragWire(wireId, e));
  return btn;
}

function buildTerminals() {
  terminalsLeftEl.innerHTML = "";
  terminalsRightEl.innerHTML = "";
  dragHandlesEl.innerHTML = "";

  const rightOrder = LEVELS[currentLevel];

  leftTerminals = LEFT_ORDER.map((id) => {
    const { row, el } = createTerminal(id, "left");
    terminalsLeftEl.appendChild(row);
    return { id, el, row };
  });

  rightTerminals = rightOrder.map((id) => {
    const { row, el } = createTerminal(id, "right");
    terminalsRightEl.appendChild(row);
    return { id, el, row };
  });

  dragHandles = LEFT_ORDER.map((id) => {
    const btn = createDragHandle(id);
    dragHandlesEl.appendChild(btn);
    return { id, el: btn };
  });
}

function getInnerPanel() {
  return panel.querySelector(".panel__inner");
}

function getInnerRect() {
  return getInnerPanel().getBoundingClientRect();
}

function positionDragHandles() {
  dragHandles.forEach(({ id, el }) => {
    const wire = wires.find((w) => w.id === id);
    if (wire?.connected) {
      el.classList.add("drag-handle--hidden");
      return;
    }
    el.classList.remove("drag-handle--hidden");

    const term = leftTerminals.find((t) => t.id === id);
    if (!term) return;

    const innerRect = getInnerRect();
    const termRect = term.el.getBoundingClientRect();
    const x = termRect.right - innerRect.left + innerRect.width * 0.055;
    const y = termRect.top + termRect.height / 2 - innerRect.top;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });
}

function getHandleCenter(handleEl) {
  const innerRect = getInnerRect();
  const rect = handleEl.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - innerRect.left,
    y: rect.top + rect.height / 2 - innerRect.top,
  };
}

function getTerminalConnectPoint(el, side) {
  const innerRect = getInnerRect();
  const rect = el.getBoundingClientRect();
  const x = side === "left"
    ? rect.right - innerRect.left - 2
    : rect.left - innerRect.left + 2;
  return {
    x,
    y: rect.top + rect.height / 2 - innerRect.top,
  };
}

function initWires() {
  wires = LEFT_ORDER.map((id) => ({ id, connected: false }));
}

function resizeCanvas() {
  const inner = getInnerPanel();
  const rect = inner.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  positionDragHandles();
  drawWires();
}

// --- Wire drawing (толще, ближе к Scratch) ---
function buildWirePath(start, end, seed) {
  const points = [start];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const segments = 4 + (currentLevel % 2);
  const amplitude = 14 + currentLevel * 5;

  for (let i = 1; i <= segments; i++) {
    const t = i / (segments + 1);
    const wave = Math.sin(t * Math.PI * 2 + seed) * amplitude;
    points.push({
      x: start.x + dx * t + wave * 0.25,
      y: start.y + dy * t + (i % 2 === 0 ? wave * 0.65 : -wave * 0.45),
    });
  }
  points.push(end);
  return points;
}

function drawWireSegment(points, def, lineWidth, active) {
  if (points.length < 2) return;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Тень провода
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = lineWidth + 4;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y + 2);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y + 2);
  ctx.stroke();

  if (active) {
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = lineWidth + 8;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }

  // Тёмная подложка
  ctx.strokeStyle = def.dark;
  ctx.lineWidth = lineWidth + 3;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  // Основной цвет с «текстурой»
  ctx.strokeStyle = def.color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([lineWidth * 1.1, lineWidth * 0.45]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  ctx.strokeStyle = def.light;
  ctx.lineWidth = lineWidth * 0.35;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y - lineWidth * 0.15);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y - lineWidth * 0.15);
  }
  ctx.stroke();

  // Медный наконечник на конце
  const last = points[points.length - 1];
  const r = lineWidth * 0.85;
  const grad = ctx.createRadialGradient(last.x - r * 0.3, last.y - r * 0.3, 0, last.x, last.y, r);
  grad.addColorStop(0, "#d7ccc8");
  grad.addColorStop(0.5, "#a1887f");
  grad.addColorStop(1, "#5d4037");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(last.x, last.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4e342e";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawWires() {
  const inner = getInnerPanel();
  const w = inner.clientWidth;
  const h = inner.clientHeight;
  ctx.clearRect(0, 0, w, h);

  const lineWidth = getWireWidth();

  wires.forEach((wire, index) => {
    const handle = dragHandles.find((d) => d.id === wire.id);
    const leftEl = leftTerminals.find((t) => t.id === wire.id)?.el;
    if (!leftEl || !handle) return;

    const anchor = getTerminalConnectPoint(leftEl, "left");
    const start = wire.connected || dragging !== wire.id
      ? getHandleCenter(handle.el)
      : anchor;

    let end;
    if (wire.connected) {
      const rightEl = rightTerminals.find((t) => t.id === wire.id)?.el;
      if (rightEl) end = getTerminalConnectPoint(rightEl, "right");
    } else if (dragging === wire.id && dragPointer) {
      end = { ...dragPointer };
    } else {
      end = { x: start.x + lineWidth * 2.5, y: start.y };
    }

    const def = WIRE_DEFS.find((d) => d.id === wire.id);
    const seed = index * 1.7 + currentLevel;
    const points = buildWirePath(anchor, end, seed);
    drawWireSegment(points, def, lineWidth, wire.connected || dragging === wire.id);
  });
}

function loopDraw() {
  positionDragHandles();
  drawWires();
  animFrame = requestAnimationFrame(loopDraw);
}

function startDrawLoop() {
  if (!animFrame) animFrame = requestAnimationFrame(loopDraw);
}

function stopDrawLoop() {
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  positionDragHandles();
  drawWires();
}

function panelCoords(clientX, clientY) {
  const rect = getInnerRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function startDragWire(wireId, e) {
  const wire = wires.find((w) => w.id === wireId);
  if (!wire || wire.connected) return;

  dragging = wireId;
  dragPointer = panelCoords(e.clientX, e.clientY);

  const handle = dragHandles.find((d) => d.id === wireId);
  handle?.el.classList.add("drag-handle--dragging");

  const onMove = (ev) => {
    dragPointer = panelCoords(ev.clientX, ev.clientY);
    const snap = findSnapTarget(dragPointer.x, dragPointer.y);
    rightTerminals.forEach((t) => highlightTerminal(t, snap === t));
  };

  const onUp = (ev) => {
    finishDrag(ev);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);

  e.preventDefault();
  startDrawLoop();
}

function findSnapTarget(x, y) {
  const radius = getSnapRadius();
  for (const term of rightTerminals) {
    const point = getTerminalConnectPoint(term.el, "right");
    if (Math.hypot(x - point.x, y - point.y) < radius) return term;
  }
  return null;
}

function highlightTerminal(term, on) {
  if (term?.el) term.el.classList.toggle("terminal--highlight", on);
}

function finishDrag(e) {
  if (!dragging) return;

  const pos = panelCoords(e.clientX, e.clientY);
  const snap = findSnapTarget(pos.x, pos.y);
  const wire = wires.find((w) => w.id === dragging);
  const handle = dragHandles.find((d) => d.id === dragging);

  rightTerminals.forEach((t) => highlightTerminal(t, false));
  handle?.el.classList.remove("drag-handle--dragging");

  if (snap && snap.id === dragging) {
    wire.connected = true;
    snap.el.classList.add("terminal--connected");
    leftTerminals.find((t) => t.id === dragging)?.el.classList.add("terminal--connected");
    handle?.el.classList.add("drag-handle--hidden");
    soundConnect();
    checkLevelComplete();
  } else if (snap) {
    soundWrong();
    shakePanel();
  }

  dragging = null;
  dragPointer = null;
  stopDrawLoop();
}

function shakePanel() {
  gameBoard.classList.add("panel--shake");
  setTimeout(() => gameBoard.classList.remove("panel--shake"), 450);
}

function allConnected() {
  return wires.every((w) => w.connected);
}

function checkLevelComplete() {
  if (!allConnected()) return;

  panel.classList.add("panel--success");
  soundLevelUp();

  setTimeout(() => {
    panel.classList.remove("panel--success");
    if (currentLevel >= TOTAL_LEVELS - 1) {
      showVictory();
    } else {
      showLevelPopup();
    }
  }, 900);
}

function showLevelPopup() {
  levelPopup.hidden = false;
  setTimeout(() => {
    levelPopup.hidden = true;
    currentLevel++;
    startLevel();
  }, 1400);
}

function showVictory() {
  soundWin();
  spawnConfetti();
  showScreen(screenWin);
}

function spawnConfetti() {
  confettiEl.innerHTML = "";
  const colors = ["#ffc107", "#ef5350", "#42a5f5", "#ec407a", "#66bb6a", "#ff7043"];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${2 + Math.random() * 2}s`;
    piece.style.animationDelay = `${Math.random() * 1.5}s`;
    piece.style.width = `${6 + Math.random() * 8}px`;
    piece.style.height = `${6 + Math.random() * 8}px`;
    confettiEl.appendChild(piece);
  }
}

function startLevel() {
  levelBadge.textContent = `Уровень ${currentLevel + 1} из ${TOTAL_LEVELS}`;
  buildTerminals();
  initWires();
  requestAnimationFrame(() => {
    resizeCanvas();
  });
}

function startGame() {
  soundStart();
  currentLevel = 0;
  showScreen(screenGame);
  startLevel();
}

function restartGame() {
  confettiEl.innerHTML = "";
  startGame();
}

btnStart.addEventListener("click", startGame);
btnRestart.addEventListener("click", restartGame);

window.addEventListener("resize", () => {
  if (screenGame.classList.contains("screen--active")) resizeCanvas();
});

document.addEventListener("click", () => {
  if (audioCtx?.state === "suspended") audioCtx.resume();
}, { once: true });
