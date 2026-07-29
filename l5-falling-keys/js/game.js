(function () {

  "use strict";



  var CFG = window.FALLING_KEYS_CONFIG;

  var RENDER = CFG.renderScale || 1;

  var SCRATCH_FPS = CFG.scratchFps || 30;



  var EN_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");

  var RU_CHARS = "абвгдежзийклмнопрстуфхцчшщъыьэюя0123456789".split("");

  var RU_VKBD_ROWS = [

    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],

    ["й", "ц", "у", "к", "е", "н", "г", "ш", "щ", "з", "х", "ъ"],

    ["ф", "ы", "в", "а", "п", "р", "о", "л", "д", "ж", "э"],

    ["я", "ч", "с", "м", "и", "т", "ь", "б", "ю"]

  ];

  var EN_VKBD_ROWS = [

    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],

    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],

    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],

    ["z", "x", "c", "v", "b", "n", "m"]

  ];

  var FUNNY_ITEMS = [
    "\uD83C\uDF55", "\uD83E\uDD84", "\uD83D\uDC4A", "\uD83E\uDD21", "\uD83C\uDF89",
    "\uD83D\uDC7B", "\uD83C\uDF4C", "\uD83D\uDC38", "\uD83C\uDF88", "\u2B50",
    "\uD83C\uDF69", "\uD83D\uDE80", "\uD83D\uDC31", "\uD83C\uDF2E", "\uD83C\uDFAE",
    "\uD83E\uDD73", "\uD83D\uDC49", "\uD83D\uDCA9", "\uD83E\uDD16", "\uD83C\uDF0A"
  ];
  var FUNNY_SOUND_NAMES = ["boing", "boom", "yay", "oops"];

  var screens = {

    start: document.getElementById("screen-start"),

    game: document.getElementById("screen-game"),

    win: document.getElementById("screen-win"),

    lose: document.getElementById("screen-lose")

  };

  var canvas = document.getElementById("game-canvas");

  var ctx = canvas.getContext("2d");

  var scoreEl = document.getElementById("score-value");

  var timeEl = document.getElementById("time-value");
  var livesEl = document.getElementById("lives-value");

  var readyMsg = document.getElementById("ready-msg");

  var wrongMsg = document.getElementById("wrong-msg");

  var winScoreEl = document.getElementById("win-score");
  var winStarsEl = document.getElementById("win-stars");
  var winSubtitleEl = document.getElementById("win-subtitle");
  var timeCardEl = document.querySelector(".stat-card--time");

  var loseScoreEl = document.getElementById("lose-score");

  var winConfettiEl = document.getElementById("win-confetti");

  var virtualKeyboard = document.getElementById("virtual-keyboard");



  canvas.width = CFG.stageWidth * RENDER;

  canvas.height = CFG.stageHeight * RENDER;

  ctx.scale(RENDER, RENDER);



  var lang = "ru";

  var state = null;

  var rafId = 0;

  var nextKeyId = 1;
  var nextBonusId = 1;

  var vkbdButtons = Object.create(null);

  var assets = { ready: false, backdrops: {}, keys: {}, line: null, smile: null };

  var sounds = {};
  var funnySounds = {};

  var audioUnlocked = false;

  function starsText(count) {
    var out = "";
    var i;
    for (i = 0; i < 3; i++) out += i < count ? "\u2605" : "\u2606";
    return out;
  }

  function calcWinStars(score) {
    if (score >= 42) return 3;
    if (score >= 24) return 2;
    return 1;
  }

  function winSubtitleForStars(stars, score) {
    var sec = CFG.gameDuration || 60;
    if (stars >= 3) return "\u0421\u0443\u043f\u0435\u0440! " + score + " \u043e\u0447\u043a\u043e\u0432 \u0437\u0430 " + sec + " \u0441\u0435\u043a\u0443\u043d\u0434";
    if (stars >= 2) return "\u041e\u0442\u043b\u0438\u0447\u043d\u0430\u044f \u0440\u0435\u0430\u043a\u0446\u0438\u044f!";
    return sec + " \u0441\u0435\u043a\u0443\u043d\u0434 \u2014 \u0442\u044b \u0443\u0434\u0435\u0440\u0436\u0430\u043b \u043b\u0438\u043d\u0438\u044e!";
  }




  function charPool() {

    return lang === "ru" ? RU_CHARS : EN_CHARS;

  }



  function randomChar() {

    var pool = charPool();

    return pool[Math.floor(Math.random() * pool.length)];

  }



  function scratchToCanvas(x, y) {

    return {

      x: x + CFG.stageWidth / 2,

      y: CFG.stageHeight / 2 - y

    };

  }



  function keyAssetName(ch) {

    if (lang === "en" && EN_CHARS.indexOf(ch) >= 0) return ch;

    if (/\d/.test(ch)) return ch;

    return null;

  }



  function setInputLang(next) {

    lang = next;

    document.getElementById("btn-lang-en").classList.toggle("btn--lang-active", lang === "en");

    document.getElementById("btn-lang-ru").classList.toggle("btn--lang-active", lang === "ru");

    buildVirtualKeyboard();

  }



  function vkbdDisplayChar(ch) {

    return ch.length === 1 ? ch.toLocaleUpperCase(lang === "ru" ? "ru" : "en") : ch;

  }



  function buildVirtualKeyboard() {

    if (!virtualKeyboard) return;

    virtualKeyboard.innerHTML = "";

    vkbdButtons = Object.create(null);

    var rows = lang === "ru" ? RU_VKBD_ROWS : EN_VKBD_ROWS;

    rows.forEach(function (row) {

      var rowEl = document.createElement("div");

      rowEl.className = "vkbd__row";

      row.forEach(function (ch) {

        var keyEl = document.createElement("span");

        keyEl.className = "vkbd__key";

        keyEl.textContent = vkbdDisplayChar(ch);

        keyEl.dataset.char = ch;

        rowEl.appendChild(keyEl);

        vkbdButtons[ch] = keyEl;

      });

      virtualKeyboard.appendChild(rowEl);

    });

    updateVirtualKeyboard();

    resizeStage();

  }



  function updateVirtualKeyboard() {

    if (!virtualKeyboard || !state) return;

    var active = Object.create(null);

    if (state.phase === "playing") {

      state.falling.forEach(function (k) {

        active[k.char] = true;

      });

    }

    Object.keys(vkbdButtons).forEach(function (code) {

      var btn = vkbdButtons[code];

      btn.classList.remove("vkbd__key--active", "vkbd__key--dim", "vkbd__key--hit-ok", "vkbd__key--hit-bad");

      if (state.phase !== "playing") return;

      if (active[code]) btn.classList.add("vkbd__key--active");

      else btn.classList.add("vkbd__key--dim");

    });

  }



  function flashVirtualKey(ch, ok) {

    var btn = vkbdButtons[ch];

    if (!btn) return;

    btn.classList.remove("vkbd__key--hit-ok", "vkbd__key--hit-bad");

    btn.classList.add(ok ? "vkbd__key--hit-ok" : "vkbd__key--hit-bad");

    window.setTimeout(function () {

      btn.classList.remove("vkbd__key--hit-ok", "vkbd__key--hit-bad");

    }, 180);

  }



  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    [sounds, funnySounds].forEach(function (pool) {
      Object.keys(pool).forEach(function (key) {
        var clip = pool[key];
        if (!clip) return;
        var probe = clip.cloneNode();
        probe.volume = 0.001;
        var playPromise = probe.play();
        if (playPromise && playPromise.then) {
          playPromise.then(function () {
            probe.pause();
            probe.currentTime = 0;
          }).catch(function () {});
        }
      });
    });
  }

  function playClip(clip, vol) {
    if (!clip) return false;
    unlockAudio();
    try {
      var inst = clip.cloneNode();
      inst.volume = vol;
      var playPromise = inst.play();
      if (playPromise && playPromise.catch) playPromise.catch(function () {});
      return true;
    } catch (err) {
      return false;
    }
  }

  function playFunnySound() {
    var names = FUNNY_SOUND_NAMES.slice();
    var i;
    for (i = 0; i < names.length; i++) {
      var idx = Math.floor(Math.random() * names.length);
      var name = names.splice(idx, 1)[0];
      var clip = funnySounds[name];
      var vol = (CFG.soundVolume && CFG.soundVolume[name]) || 0.9;
      if (playClip(clip, vol)) return;
    }
    playSound("smile");
  }

  function playSound(name) {
    var clip = sounds[name];
    var vol = (CFG.soundVolume && CFG.soundVolume[name]) || 0.85;
    playClip(clip, vol);
  }



  function showScreen(name) {

    Object.keys(screens).forEach(function (k) {

      screens[k].classList.toggle("screen--active", k === name);

    });

    if (name === "game") {

      requestAnimationFrame(function () {

        resizeStage();

        requestAnimationFrame(resizeStage);

      });

    }

  }



  function resizeStage() {

    var wrap = canvas && canvas.parentElement;

    var stack = wrap && wrap.closest(".game-stack");

    var layout = stack && stack.closest(".game-layout");

    if (!wrap || !stack || !layout) return;

    var layoutStyle = window.getComputedStyle(layout);

    var padX = parseFloat(layoutStyle.paddingLeft) + parseFloat(layoutStyle.paddingRight);

    var padY = parseFloat(layoutStyle.paddingTop) + parseFloat(layoutStyle.paddingBottom);

    var bottom = stack.querySelector(".game-bottom");

    var bottomH = bottom ? bottom.offsetHeight : 0;

    var availW = Math.max(0, layout.clientWidth - padX);

    var availH = Math.max(0, layout.clientHeight - padY - bottomH);

    var ratio = CFG.stageWidth / CFG.stageHeight;

    var h = availH;

    var w = h * ratio;

    if (w > availW) {

      w = availW;

      h = w / ratio;

    }

    w = Math.max(0, Math.floor(w));

    h = Math.max(0, Math.floor(h));

    canvas.style.width = w + "px";

    canvas.style.height = h + "px";

    stack.style.width = w + "px";

  }



  function bindStageResize() {
    resizeStage();
    var gameScreen = document.getElementById("screen-game");
    var layout = document.querySelector(".game-layout");
    var stack = document.querySelector(".game-stack");
    var wrap = document.querySelector(".game-stage-wrap");
    var bottom = document.querySelector(".game-bottom");
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(resizeStage);
      if (gameScreen) ro.observe(gameScreen);
      if (layout) ro.observe(layout);
      if (stack) ro.observe(stack);
      if (wrap) ro.observe(wrap);
      if (bottom) ro.observe(bottom);
      ro.observe(document.getElementById("app"));
    } else {
      window.addEventListener("resize", resizeStage);
    }
  }



  function loadImage(src) {

    return new Promise(function (resolve, reject) {

      var img = new Image();

      img.onload = function () { resolve(img); };

      img.onerror = reject;

      img.src = src;

    });

  }



  function loadAudio(src) {
    return new Promise(function (resolve) {
      var a = new Audio();
      var settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        resolve(a);
      }
      a.preload = "auto";
      a.addEventListener("canplaythrough", finish, { once: true });
      a.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, 3000);
      a.src = src;
      a.load();
    });
  }



  function loadAssets() {

    var tasks = [];

    ["portal.svg", "ivy.svg", "meadow.svg"].forEach(function (name) {

      tasks.push(loadImage("assets/backdrops/" + name).then(function (img) {

        assets.backdrops[name] = img;

      }));

    });

    EN_CHARS.forEach(function (ch) {

      tasks.push(loadImage("assets/keys/" + ch + ".svg").then(function (img) {

        assets.keys[ch] = img;

      }).catch(function () {}));

    });

    tasks.push(loadImage("assets/line.svg").then(function (img) { assets.line = img; }));

    tasks.push(loadImage("assets/smile.svg").then(function (img) { assets.smile = img; }));

    tasks.push(loadAudio("assets/sounds/correct.wav").then(function (a) { sounds.correct = a; }));
    tasks.push(loadAudio("assets/sounds/wrong.wav").then(function (a) { sounds.wrong = a; }));
    tasks.push(loadAudio("assets/sounds/pop.wav").then(function (a) { sounds.pop = a; }));
    tasks.push(loadAudio("assets/sounds/smile.wav").then(function (a) { sounds.smile = a; }));
    tasks.push(loadAudio("assets/sounds/win.wav").then(function (a) { sounds.win = a; }));
    FUNNY_SOUND_NAMES.forEach(function (name) {
      tasks.push(loadAudio("assets/sounds/funny/" + name + ".wav").then(function (a) {
        funnySounds[name] = a;
      }));
    });

    return Promise.all(tasks).then(function () { assets.ready = true; });

  }



  function spawnSmiles(x, y) {

    var i;

    for (i = 0; i < (CFG.smileCount || 5); i++) {

      state.smiles.push({

        x: x + (Math.random() - 0.5) * 80,

        y: y,

        movage: 5 + Math.random() * 15,

        dy: 2 + Math.random() * 3,

        drift: (Math.random() - 0.5) * 2,

        alpha: 1,

        spin: Math.random() * 0.2 - 0.1

      });

    }

    playSound("smile");

  }



  function canvasToScratch(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var lx = (clientX - rect.left) / rect.width * CFG.stageWidth;
    var ly = (clientY - rect.top) / rect.height * CFG.stageHeight;
    return { x: lx - CFG.stageWidth / 2, y: CFG.stageHeight / 2 - ly };
  }

  function randomFunnyEmoji() {
    return FUNNY_ITEMS[Math.floor(Math.random() * FUNNY_ITEMS.length)];
  }

  function spawnBonus() {
    state.bonuses.push({
      id: nextBonusId++,
      emoji: randomFunnyEmoji(),
      x: CFG.spawnXMin + Math.random() * (CFG.spawnXMax - CFG.spawnXMin),
      y: CFG.spawnY + Math.random() * 30,
      speedMul: 0.5 + Math.random() * 0.2,
      wobble: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.08,
      scale: 0.95 + Math.random() * 0.15,
      exploding: false,
      explodeT: 0
    });
  }

  function spawnBurst(x, y, emoji) {
    var i;
    var colors = ["#ff7043", "#ffca28", "#66bb6a", "#42a5f5", "#ec407a", "#ab47bc", "#fff176"];
    for (i = 0; i < 22; i++) {
      var ang = Math.random() * Math.PI * 2;
      var spd = 2 + Math.random() * 7;
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        size: 3 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        emoji: i < 4 ? emoji : null
      });
    }
  }

  function explodeBonus(b) {
    if (b.exploding) return;
    b.exploding = true;
    b.explodeT = 0;
    spawnBurst(b.x, b.y, b.emoji);
    playFunnySound();
    state.score += CFG.bonusScore || 1;
    scoreEl.textContent = String(state.score);
    state.shake = Math.min(0.35, state.shake + 0.12);
  }

  function hitBonusAt(sx, sy) {
    var hitR = 24;
    var i;
    for (i = state.bonuses.length - 1; i >= 0; i--) {
      var b = state.bonuses[i];
      if (b.exploding) continue;
      var dx = b.x - sx;
      var dy = b.y - sy;
      if (dx * dx + dy * dy <= hitR * hitR) {
        explodeBonus(b);
        return true;
      }
    }
    return false;
  }

  function onCanvasPointer(e) {
    if (!state || state.phase !== "playing") return;
    unlockAudio();
    var sc = canvasToScratch(e.clientX, e.clientY);
    hitBonusAt(sc.x, sc.y);
  }

  function drawBonus(b) {
    var pos = scratchToCanvas(b.x, b.y);
    var size = (CFG.keyDrawSize || 38) * 1.05 * (b.scale || 1);
    ctx.save();
    if (b.exploding) {
      var t = b.explodeT || 0;
      ctx.globalAlpha = Math.max(0, 1 - t * 2.2);
      size *= 1 + t * 2.5;
    }
    ctx.translate(pos.x, pos.y);
    ctx.rotate(b.wobble || 0);
    ctx.font = "900 " + Math.floor(size) + "px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 6;
    ctx.fillText(b.emoji, 0, 1);
    ctx.restore();
  }

  function drawParticle(p) {
    var pos = scratchToCanvas(p.x, p.y);
    ctx.save();
    ctx.globalAlpha = p.life;
    if (p.emoji) {
      ctx.font = Math.floor(p.size * 2.2) + "px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.emoji, pos.x, pos.y);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function spawnKey() {

    state.falling.push({

      id: nextKeyId++,

      char: randomChar(),

      x: CFG.spawnXMin + Math.random() * (CFG.spawnXMax - CFG.spawnXMin),

      y: CFG.spawnY,

      hue: Math.random() * 100,

      ghost: 0,

      removing: false

    });

  }



  function createGameState() {

    return {

      phase: "ready",

      readyLeft: CFG.readyTime || 1.5,

      falling: [],
      bonuses: [],
      particles: [],

      smiles: [],

      score: 0,

      timeLeft: CFG.gameDuration,

      timerTick: 0,

      fallSpeed: CFG.fallSpeedStart,

      spawnInterval: CFG.spawnIntervalStart,

      spawnTimer: 0,

      wrongMsgLeft: 0,

      shake: 0,

      lives: CFG.lives != null ? CFG.lives : 1

    };

  }

  function updateLivesDisplay() {
    if (livesEl && state) livesEl.textContent = String(Math.max(0, state.lives));
  }

  function handleKeyHitLine(index) {
    state.falling.splice(index, 1);
    state.shake = 0.35;
    playSound("wrong");
    updateVirtualKeyboard();
    if (state.lives > 0) {
      state.lives -= 1;
      updateLivesDisplay();
      wrongMsg.textContent = "\u0416\u0438\u0437\u043d\u044c \u043f\u043e\u0442\u0435\u0440\u044f\u043d\u0430!";
      wrongMsg.hidden = false;
      state.wrongMsgLeft = CFG.wrongMsgDuration || 0.9;
      return;
    }
    endLose();
  }



  function startGame() {

    state = createGameState();

    readyMsg.hidden = false;

    wrongMsg.hidden = true;
    wrongMsg.textContent = "\u041d\u0435 \u0442\u0430 \u043a\u043b\u0430\u0432\u0438\u0448\u0430!";

    scoreEl.textContent = "0";
    updateLivesDisplay();
    if (timeCardEl) timeCardEl.classList.remove("stat-card--urgent");

    timeEl.textContent = String(CFG.gameDuration);

    canvas.style.cursor = "pointer";
    showScreen("game");

    buildVirtualKeyboard();

    if (rafId) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(tick);

  }



  function endWin() {
    var score = state.score;
    var stars = calcWinStars(score);
    state.phase = "won";
    if (winScoreEl) winScoreEl.textContent = String(score);
    if (winStarsEl) winStarsEl.textContent = starsText(stars);
    if (winSubtitleEl) winSubtitleEl.textContent = winSubtitleForStars(stars, score);
    playSound("win");
    spawnWinConfetti();
    showScreen("win");
    state = null;
  }



  function endLose() {

    state.phase = "lost";

    loseScoreEl.textContent = "Очки: " + state.score + " — клавиша упала на линию";

    playSound("wrong");

    showScreen("lose");

    state = null;

  }



  function spawnWinConfetti() {

    if (!winConfettiEl) return;

    winConfettiEl.innerHTML = "";

    var colors = ["#ffc107", "#ef5350", "#42a5f5", "#66bb6a", "#ff7043", "#ffeb3b"];

    var i;

    for (i = 0; i < 70; i++) {

      var piece = document.createElement("div");

      piece.className = "win-confetti-piece";

      piece.style.left = Math.random() * 100 + "%";

      piece.style.background = colors[Math.floor(Math.random() * colors.length)];

      piece.style.animationDuration = 2 + Math.random() * 2 + "s";

      piece.style.animationDelay = Math.random() * 1.2 + "s";

      piece.style.width = 6 + Math.random() * 8 + "px";

      piece.style.height = 6 + Math.random() * 8 + "px";

      winConfettiEl.appendChild(piece);

    }

  }



  function normalizeInputChar(key, code) {
    var ch = null;
    if (code && /^Digit[0-9]$/.test(code)) ch = code.slice(-1);
    else if (code && /^Numpad[0-9]$/.test(code)) ch = code.slice(-1);
    else if (key && key.length === 1) ch = key.toLowerCase();
    if (!ch) return null;
    if (/^[0-9]$/.test(ch)) return ch;
    if (lang === "ru" && RU_CHARS.indexOf(ch) >= 0) return ch;
    if (lang === "en" && EN_CHARS.indexOf(ch) >= 0) return ch;
    return null;
  }



  function handleKeyInput(ch) {

    if (!state || state.phase !== "playing") return;

    var matches = state.falling.filter(function (k) { return k.char === ch && !k.removing; });

    if (!matches.length) {

      state.wrongMsgLeft = CFG.wrongMsgDuration || 0.9;

      state.shake = 0.25;

      wrongMsg.hidden = false;

      flashVirtualKey(ch, false);

      playSound("pop");

      return;

    }

    matches.forEach(function (k) {

      k.removing = true;

      k.ghost = 1;

      spawnSmiles(k.x, k.y);

    });

    state.score += matches.length;

    scoreEl.textContent = String(state.score);

    state.fallSpeed = Math.max(CFG.fallSpeedMin, state.fallSpeed + CFG.fallSpeedStep);

    state.spawnInterval = Math.max(CFG.spawnIntervalMin, state.spawnInterval + CFG.spawnIntervalStep);

    flashVirtualKey(ch, true);

    playSound("correct");

    window.setTimeout(function () {

      if (!state) return;

      state.falling = state.falling.filter(function (k) { return !k.removing; });

      updateVirtualKeyboard();

    }, 280);

    updateVirtualKeyboard();

  }



  function onKeyDown(e) {

    if (e.repeat) return;

    unlockAudio();

    if (!state) return;

    if (state.phase === "ready" || state.phase === "playing") {

      var ch = normalizeInputChar(e.key, e.code);

      if (ch) {

        e.preventDefault();

        handleKeyInput(ch);

      }

    }

  }



  function drawBackdrop(name) {
    var img = assets.backdrops[name];
    if (!img) return;
    var meta = (CFG.backdropMeta && CFG.backdropMeta[name]) || { rcx: img.width / 2, rcy: img.height / 2 };
    var rcx = meta.rcx;
    var rcy = meta.rcy;
    var dx = CFG.stageWidth / 2 - rcx;
    var dy = CFG.stageHeight / 2 - rcy;
    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, CFG.stageWidth, CFG.stageHeight);
    ctx.drawImage(img, dx, dy, img.width, img.height);
  }



  function drawLine() {

    if (!assets.line) return;

    var pos = scratchToCanvas(-1, CFG.lineY);

    var w = assets.line.width * 0.55;

    var h = assets.line.height * 0.55;

    ctx.drawImage(assets.line, pos.x - w / 2, pos.y - h / 2, w, h);

  }



  function drawKeyLabel(ch) {
    if (!ch || ch.length !== 1) return ch || "";
    return ch.toLocaleUpperCase(lang === "ru" ? "ru" : "en");
  }

  function drawKeyItem(k) {
    var pos = scratchToCanvas(k.x, k.y);
    var size = CFG.keyDrawSize || 38;
    ctx.save();
    ctx.globalAlpha = 1 - k.ghost * 0.85;
    ctx.fillStyle = "hsl(" + (k.hue || 0) + ", 72%, 62%)";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    roundRect(ctx, pos.x - size / 2, pos.y - size / 2, size, size, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = "900 " + Math.floor(size * 0.52) + "px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(drawKeyLabel(k.char), pos.x, pos.y + 1);
    ctx.restore();
  }



  function roundRect(c, x, y, w, h, r) {

    c.beginPath();

    c.moveTo(x + r, y);

    c.arcTo(x + w, y, x + w, y + h, r);

    c.arcTo(x + w, y + h, x, y + h, r);

    c.arcTo(x, y + h, x, y, r);

    c.arcTo(x, y, x + w, y, r);

    c.closePath();

  }



  function drawSmile(s) {

    if (!assets.smile) return;

    var pos = scratchToCanvas(s.x, s.y);

    var size = 28;

    ctx.save();

    ctx.globalAlpha = s.alpha;

    ctx.drawImage(assets.smile, pos.x - size / 2, pos.y - size / 2, size, size);

    ctx.restore();

  }



  function render() {

    if (!state) return;

    ctx.save();

    if (state.shake > 0) {

      ctx.translate((Math.random() - 0.5) * state.shake * 12, (Math.random() - 0.5) * state.shake * 8);

    }

    drawBackdrop(CFG.backdropGame);

    drawLine();

    state.falling.forEach(drawKeyItem);
    state.bonuses.forEach(drawBonus);
    state.particles.forEach(drawParticle);
    state.smiles.forEach(drawSmile);

    ctx.restore();

  }



  function tick(now) {

    if (!state) return;

    if (!tick.last) tick.last = now;

    var dt = Math.min(0.05, (now - tick.last) / 1000);

    tick.last = now;

    var frameScale = dt * SCRATCH_FPS;



    if (state.phase === "ready") {

      state.readyLeft -= dt;

      if (state.readyLeft <= 0) {

        state.phase = "playing";

        readyMsg.hidden = true;

        spawnKey();
        if (Math.random() < (CFG.bonusSpawnChance || 0.28)) spawnBonus();
        state.spawnTimer = state.spawnInterval;
        updateVirtualKeyboard();

      }

    }



    if (state.phase === "playing") {

      state.timerTick += dt;

      if (state.timerTick >= 1) {

        state.timerTick -= 1;

        state.timeLeft -= 1;

        timeEl.textContent = String(Math.max(0, state.timeLeft));
        if (timeCardEl) {
          timeCardEl.classList.toggle("stat-card--urgent", state.timeLeft <= 10);
        }

        if (state.timeLeft <= 0) {

          endWin();

          return;

        }

      }



      state.spawnTimer -= dt;

      if (state.spawnTimer <= 0) {

        spawnKey();
        if (Math.random() < (CFG.bonusSpawnChance || 0.28)) spawnBonus();

        state.spawnTimer = state.spawnInterval;

        updateVirtualKeyboard();

      }



      var i;

      for (i = state.falling.length - 1; i >= 0; i--) {

        var k = state.falling[i];

        if (k.removing) {

          k.ghost = Math.min(1, k.ghost + frameScale * 0.15);

          continue;

        }

        k.y += state.fallSpeed * frameScale;

        if (k.y <= CFG.lineY + 8) {
          handleKeyHitLine(i);
          break;
        }

      }



      for (i = state.bonuses.length - 1; i >= 0; i--) {
        var b = state.bonuses[i];
        if (b.exploding) {
          b.explodeT = (b.explodeT || 0) + dt * 3.5;
          if (b.explodeT >= 0.55) state.bonuses.splice(i, 1);
          continue;
        }
        b.wobble = (b.wobble || 0) + (b.spin || 0) * frameScale;
        b.y += state.fallSpeed * (b.speedMul || 0.6) * frameScale;
        if (b.y <= CFG.lineY - 5) state.bonuses.splice(i, 1);
      }

      for (i = state.particles.length - 1; i >= 0; i--) {
        var p = state.particles[i];
        p.x += p.vx * frameScale;
        p.y += p.vy * frameScale;
        p.vy -= 0.08 * frameScale;
        p.life -= 0.035 * frameScale;
        if (p.life <= 0) state.particles.splice(i, 1);
      }

      for (i = state.smiles.length - 1; i >= 0; i--) {

        var s = state.smiles[i];

        s.x += s.drift * frameScale;

        s.y += s.movage * 0.08 * frameScale;

        s.movage *= Math.pow(0.9, frameScale);

        s.alpha -= 0.02 * frameScale;

        if (s.alpha <= 0 || s.y > CFG.stageHeight) state.smiles.splice(i, 1);

      }



      if (state.wrongMsgLeft > 0) {

        state.wrongMsgLeft -= dt;

        if (state.wrongMsgLeft <= 0) wrongMsg.hidden = true;

      }

      if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);

    }



    render();

    rafId = requestAnimationFrame(tick);

  }



  function bindUi() {

    document.getElementById("btn-start").addEventListener("click", function () {

      unlockAudio();

      startGame();

    });

    document.getElementById("btn-restart-win").addEventListener("click", function () {

      if (winConfettiEl) winConfettiEl.innerHTML = "";

      showScreen("start");

    });

    document.getElementById("btn-restart-lose").addEventListener("click", function () {

      showScreen("start");

    });

    document.getElementById("btn-lang-en").addEventListener("click", function () { setInputLang("en"); });

    document.getElementById("btn-lang-ru").addEventListener("click", function () { setInputLang("ru"); });

    canvas.addEventListener("pointerdown", unlockAudio);
    canvas.addEventListener("click", onCanvasPointer);
    canvas.addEventListener("touchstart", function (e) {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      e.preventDefault();
      onCanvasPointer(e.changedTouches[0]);
    }, { passive: false });
    window.addEventListener("keydown", onKeyDown);

  }



  loadAssets().then(function () {

    bindUi();

    bindStageResize();

    buildVirtualKeyboard();

    showScreen("start");

  }).catch(function (err) {

    console.error(err);

  });

})();

