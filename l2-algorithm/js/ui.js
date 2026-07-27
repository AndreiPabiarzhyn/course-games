function iconHtml(cmdId) {
  const def = COMMANDS[cmdId];
  return `<span class="cmd-block__icon" aria-hidden="true"><img src="${def.icon}" alt=""></span>`;
}

function createCmdBlock(cmdId, source) {
  const def = COMMANDS[cmdId];
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `cmd-block ${def.class} ${source === "palette" ? "cmd-block--palette" : "cmd-block--in-slot"}`;
  btn.dataset.cmd = cmdId;
  btn.innerHTML = `${iconHtml(cmdId)}<span class="cmd-block__label">${def.label}</span>`;
  btn.addEventListener("pointerdown", (e) => startDrag(e, cmdId, source, btn));
  return btn;
}

function showGhost(cmdId, x, y) {
  const def = COMMANDS[cmdId];
  dragGhostEl.hidden = false;
  dragGhostEl.className = `drag-ghost ${def.class}`;
  dragGhostEl.innerHTML = `${iconHtml(cmdId)}<span class="cmd-block__label">${def.label}</span>`;
  moveGhost(x, y);
}

function hideGhost() {
  dragGhostEl.hidden = true;
  dragGhostEl.innerHTML = "";
}

function buildPalette() {
  commandPaletteEl.innerHTML = "";
  PALETTE_ORDER.forEach((id) => commandPaletteEl.appendChild(createCmdBlock(id, "palette")));
}

function buildSlots() {
  algorithmSlotsEl.innerHTML = "";
  for (let i = 0; i < SLOT_COUNT; i++) {
    const li = document.createElement("li");
    li.className = "algorithm-slot";
    li.dataset.index = i;
    const num = document.createElement("span");
    num.className = "algorithm-slot__num";
    num.textContent = i + 1;
    const content = document.createElement("div");
    content.className = "algorithm-slot__content";
    if (slots[i]) content.appendChild(createCmdBlock(slots[i], "slot"));
    else {
      const ph = document.createElement("span");
      ph.className = "algorithm-slot__placeholder";
      ph.textContent = "\u0441\u044e\u0434\u0430";
      content.appendChild(ph);
    }
    li.appendChild(num);
    li.appendChild(content);
    algorithmSlotsEl.appendChild(li);
  }
}

function refreshUI() {
  levelBadge.textContent = `\u0423\u0440\u043e\u0432\u0435\u043d\u044c ${currentLevel + 1} \u0438\u0437 ${TOTAL_LEVELS}`;
  buildGrid();
  buildSlots();
  btnRun.disabled = isRunning;
}

function findSlotIndex(el) {
  const slot = el.closest(".algorithm-slot");
  return slot ? Number(slot.dataset.index) : null;
}

function moveGhost(x, y) {
  const w = dragGhostEl.offsetWidth || 120;
  const h = dragGhostEl.offsetHeight || 44;
  dragGhostEl.style.left = `${x - w / 2}px`;
  dragGhostEl.style.top = `${y - h / 2}px`;
}

function onDragMove(e) {
  moveGhost(e.clientX, e.clientY);
  document.querySelectorAll(".algorithm-slot").forEach((s) => s.classList.remove("algorithm-slot--over"));
  const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest(".algorithm-slot");
  if (slot) slot.classList.add("algorithm-slot--over");
}

function onDragEnd(e) {
  document.removeEventListener("pointermove", onDragMove);
  document.removeEventListener("pointerup", onDragEnd);
  document.removeEventListener("pointercancel", onDragEnd);
  document.querySelectorAll(".algorithm-slot").forEach((s) => s.classList.remove("algorithm-slot--over"));
  hideGhost();
  if (!dragState) return;
  const { cmdId, source, slotIndex } = dragState;
  const slotEl = document.elementFromPoint(e.clientX, e.clientY)?.closest(".algorithm-slot");
  if (slotEl) {
    const idx = Number(slotEl.dataset.index);
    const prev = slots[idx];
    slots[idx] = cmdId;
    if (source === "slot" && slotIndex !== null && slotIndex !== idx) slots[slotIndex] = prev;
    Sounds.drop();
    buildSlots();
  } else if (source === "slot" && slotIndex !== null) {
    slots[slotIndex] = null;
    buildSlots();
  }
  dragState = null;
}

function startDrag(e, cmdId, source, el) {
  if (isRunning) return;
  e.preventDefault();
  el.setPointerCapture(e.pointerId);
  dragState = { cmdId, source, slotIndex: source === "slot" ? findSlotIndex(el) : null };
  showGhost(cmdId, e.clientX, e.clientY);
  document.addEventListener("pointermove", onDragMove);
  document.addEventListener("pointerup", onDragEnd);
  document.addEventListener("pointercancel", onDragEnd);
}

function clearSlots() {
  if (isRunning) return;
  slots = Array(SLOT_COUNT).fill(null);
  buildSlots();
}

const screenStart = document.getElementById("screen-start");
const screenGame = document.getElementById("screen-game");
const screenWin = document.getElementById("screen-win");
const btnStart = document.getElementById("btn-start");
const btnRestart = document.getElementById("btn-restart");
const btnRun = document.getElementById("btn-run");
const btnClear = document.getElementById("btn-clear");
const levelBadge = document.getElementById("level-badge");
const levelPopup = document.getElementById("level-popup");
const algorithmSlotsEl = document.getElementById("algorithm-slots");
const commandPaletteEl = document.getElementById("command-palette");
const gridBoardEl = document.getElementById("grid-board");
const gridWrapEl = document.querySelector(".grid-wrap");
const robotWrapEl = document.getElementById("robot-wrap");
const robotEl = document.getElementById("robot");
const confettiEl = document.getElementById("confetti");
const dragGhostEl = document.getElementById("drag-ghost");

btnStart.addEventListener("click", startGame);
btnRestart.addEventListener("click", restartGame);
btnRun.addEventListener("click", runAlgorithm);
btnClear.addEventListener("click", clearSlots);
window.addEventListener("resize", () => { sizeGridCells(); positionRobot(false); });
buildPalette();