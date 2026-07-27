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

const Sounds = {
  start() { playTone(440, 0.1); setTimeout(() => playTone(554, 0.12), 100); },
  drop() { playTone(520, 0.08); },
  move() { playTone(330, 0.06, "triangle", 0.12); },
  turn() { playTone(480, 0.08, "square", 0.1); },
  wrong() { playTone(180, 0.25, "sawtooth", 0.08); },
  levelUp() { [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.18), i * 120)); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.22), i * 150)); },
};

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function showScreen(active) {
  [screenStart, screenGame, screenWin].forEach((s) => s.classList.toggle("screen--active", s === active));
}

function spawnConfetti(container) {
  container.innerHTML = "";
  const colors = ["#ff6f00", "#ffd54f", "#66bb6a", "#42a5f5", "#ec407a", "#ab47bc"];
  for (let i = 0; i < 48; i++) {
    const p = document.createElement("div");
    p.className = "confetti-piece";
    p.style.left = `${Math.random() * 100}%`;
    p.style.width = `${6 + Math.random() * 8}px`;
    p.style.height = `${6 + Math.random() * 8}px`;
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = `${2 + Math.random() * 2}s`;
    p.style.animationDelay = `${Math.random() * 0.8}s`;
    container.appendChild(p);
  }
}