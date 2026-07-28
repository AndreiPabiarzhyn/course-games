(function () {
  "use strict";

  var CFG = window.TYPING_CONFIG;
  var RENDER = CFG.renderScale || 1;
  var ROCKET_SIZE = CFG.rocketSize || { w: 200, h: 200 };
  var ENEMY_SIZE = CFG.enemySize || { w: 72, h: 90 };
  var ENEMY_MOVE_SMOOTH = CFG.enemyMoveSmooth || 3.2;
  var KEY_SIZE = CFG.keySize || { w: 30, h: 34 };
  var KEY_SPACE_SIZE = CFG.keySpaceSize || { w: 46, h: 34 };
  var screens = {
    start: document.getElementById("screen-start"),
    game: document.getElementById("screen-game"),
    win: document.getElementById("screen-win"),
    lose: document.getElementById("screen-lose"),
  };
  var canvas = document.getElementById("game-canvas");
  var ctx = canvas.getContext("2d");
  var levelEl = document.getElementById("level-value");
  var progressEl = document.getElementById("progress-value");
  var timeEl = document.getElementById("time-value");
  var readyMsg = document.getElementById("ready-msg");
  var cheerMsg = document.getElementById("cheer-msg");
  var transitionMsg = document.getElementById("transition-msg");
  var wrongMsg = document.getElementById("wrong-msg");
  var winStarsEl = document.getElementById("win-stars");
  var winConfettiEl = document.getElementById("win-confetti");
  var virtualKeyboard = document.getElementById("virtual-keyboard");
  var lang = "ru";
  var runStars = [];
  var vkbdButtons = Object.create(null);
  var VKBD_ROWS = {
    en: [
      ["1", "2", "3", "4", "5", "6"],
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
      ["z", "x", "c", "v", "b", "n", "m"],
      ["space"]
    ],
    ru: [
      ["1", "2", "3", "4", "5", "6"],
      ["й", "ц", "у", "к", "е", "н", "г", "ш", "щ", "з"],
      ["ф", "ы", "в", "а", "п", "р", "о", "л", "д"],
      ["я", "ч", "с", "м", "и", "т", "ь", "б", "ю"],
      ["space"]
    ]
  };

  canvas.width = CFG.stageWidth * RENDER;
  canvas.height = CFG.stageHeight * RENDER;
  ctx.scale(RENDER, RENDER);

  var state = null;
  var rafId = 0;
  var assets = { ready: false, backdrops: {}, keys: {}, enemy: [], rocket: null };
  var sounds = {};
  var audioUnlocked = false;

  function starsText(count) {
    var out = "";
    var i;
    for (i = 0; i < 3; i++) out += i < count ? "\u2605" : "\u2606";
    return out;
  }

  function calcStars(timeLeft, timeLimit) {
    var ratio = timeLeft / timeLimit;
    if (ratio > 0.6) return 3;
    if (ratio > 0.3) return 2;
    return 1;
  }

  function hideOverlayMsgs() {
    readyMsg.hidden = true;
    cheerMsg.hidden = true;
    transitionMsg.hidden = true;
    wrongMsg.hidden = true;
  }

  function renderWinStars() {
    if (!winStarsEl) return;
    winStarsEl.innerHTML = runStars.map(function (stars, i) {
      return "\u0423\u0440\u043e\u0432\u0435\u043d\u044c " + (i + 1) + " \u2014 " + starsText(stars);
    }).join("<br>");
  }

  function spawnWinConfetti() {
    if (!winConfettiEl) return;
    winConfettiEl.innerHTML = "";
    var colors = ["#ffc107", "#ef5350", "#42a5f5", "#ec407a", "#66bb6a", "#ff7043", "#ffeb3b"];
    var i;
    for (i = 0; i < 50; i++) {
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

  function clearWinConfetti() {
    if (winConfettiEl) winConfettiEl.innerHTML = "";
  }

  function showWinScreen() {
    renderWinStars();
    playSound("win");
    spawnWinConfetti();
    showScreen("win");
    state = null;
  }

  function beginLevelTransition(stars) {
    runStars.push(stars);
    state.phase = "levelComplete";
    state.transitionStep = "cheer";
    state.transitionLeft = CFG.cheerDuration || 1.2;
    var celebrate = CFG.enemyCelebrate || { x: 0, y: -48 };
    glideEnemyTo(celebrate.x, celebrate.y);
    cheerMsg.textContent = "\u041c\u043e\u043b\u043e\u0434\u0435\u0446! " + starsText(stars);
    transitionMsg.hidden = true;
    cheerMsg.hidden = false;
  }

  function setInputLang(next) {
    lang = next;
    document.getElementById("btn-lang-en").classList.toggle("btn--lang-active", lang === "en");
    document.getElementById("btn-lang-ru").classList.toggle("btn--lang-active", lang === "ru");
    buildVirtualKeyboard();
  }

  function vkbdDisplayChar(ch) {
    if (ch === "space") return "Пробел";
    return ch.length === 1 ? ch.toLocaleUpperCase(lang === "ru" ? "ru" : "en") : ch;
  }

  function buildVirtualKeyboard() {
    if (!virtualKeyboard) return;
    virtualKeyboard.innerHTML = "";
    vkbdButtons = Object.create(null);
    var rows = VKBD_ROWS[lang] || VKBD_ROWS.en;
    rows.forEach(function (row) {
      var rowEl = document.createElement("div");
      rowEl.className = "vkbd__row";
      row.forEach(function (ch) {
        var code = ch === "space" ? " " : ch;
        var keyEl = document.createElement("span");
        keyEl.className = "vkbd__key" + (ch === "space" ? " vkbd__key--space" : "");
        keyEl.textContent = vkbdDisplayChar(ch);
        keyEl.dataset.char = code;
        rowEl.appendChild(keyEl);
        vkbdButtons[code] = keyEl;
      });
      virtualKeyboard.appendChild(rowEl);
    });
    updateVirtualKeyboard();
    resizeStage();
  }

  function updateVirtualKeyboard() {
    if (!virtualKeyboard) return;
    var needed = Object.create(null);
    var expected = state && state.phase === "playing" ? state.sequence[state.currentIndex] : null;
    if (state) {
      state.sequence.forEach(function (ch, i) {
        if (i >= state.currentIndex) needed[ch] = true;
      });
    }
    Object.keys(vkbdButtons).forEach(function (code) {
      var btn = vkbdButtons[code];
      btn.classList.remove("vkbd__key--current", "vkbd__key--dim", "vkbd__key--hit-ok", "vkbd__key--hit-bad");
      if (!state || state.phase !== "playing") return;
      if (code === expected) btn.classList.add("vkbd__key--current");
      else if (!needed[code]) btn.classList.add("vkbd__key--dim");
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
    Object.keys(sounds).forEach(function (key) {
      var clip = sounds[key];
      if (!clip) return;
      var probe = clip.cloneNode();
      probe.volume = 0.001;
      probe.play().then(function () {
        probe.pause();
        probe.currentTime = 0;
      }).catch(function () {});
    });
  }

  function playSound(name) {
    unlockAudio();
    var clip = sounds[name];
    if (!clip) return;
    var vol = (CFG.soundVolume && CFG.soundVolume[name]) || 0.85;
    var inst = clip.cloneNode();
    inst.volume = vol;
    inst.play().catch(function () {});
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
    var a = new Audio(src);
    a.preload = "auto";
    return a;
  }

  function scratchToCanvas(x, y) {
    return {
      x: x + CFG.stageWidth / 2,
      y: CFG.stageHeight / 2 - y,
    };
  }

  function keyAssetName(ch) {
    return ch === " " ? "space" : ch;
  }

  function getLevelDef(levelIndex) {
    var base = CFG.levels[levelIndex];
    var pack = base[lang] || base.en;
    return {
      backdrop: base.backdrop,
      timeLimit: base.timeLimit,
      sequence: pack.sequence.slice(),
      keyPositions: CFG.keyPositions,
    };
  }

  function loadAssets() {
    var tasks = [];
    var letters = new Set(["space"]);
    CFG.levels.forEach(function (lvl) {
      ["en", "ru"].forEach(function (code) {
        if (!lvl[code]) return;
        lvl[code].sequence.forEach(function (ch) {
          if (ch !== " ") letters.add(keyAssetName(ch));
        });
      });
      if (!assets.backdrops[lvl.backdrop]) {
        tasks.push(loadImage("assets/backdrops/" + lvl.backdrop).then(function (img) {
          assets.backdrops[lvl.backdrop] = img;
        }));
      }
    });
    if (!assets.backdrops["lose.svg"]) {
      tasks.push(loadImage("assets/backdrops/lose.svg").then(function (img) {
        assets.backdrops["lose.svg"] = img;
      }));
    }

    letters.forEach(function (name) {
      tasks.push(loadImage("assets/keys/" + name + ".svg").then(function (img) {
        assets.keys[name] = img;
      }).catch(function () {}));
    });

    for (var i = 1; i <= 6; i++) {
      (function (idx) {
        tasks.push(loadImage("assets/enemy/" + idx + ".png").then(function (img) {
          assets.enemy[idx - 1] = img;
        }));
      })(i);
    }

    tasks.push(loadImage("assets/rocket.svg").then(function (img) { assets.rocket = img; }));
    sounds.pop = loadAudio("assets/sounds/pop.wav");
    sounds.pluck = loadAudio("assets/sounds/pluck.wav");
    sounds.cheer = loadAudio("assets/sounds/goal-cheer.wav");
    sounds.win = loadAudio("assets/sounds/win.wav");

    return Promise.all(tasks).then(function () { assets.ready = true; });
  }

  function createLevelState(levelIndex) {
    var lvl = getLevelDef(levelIndex);
    var keys = lvl.sequence.map(function (ch, i) {
      var pos = lvl.keyPositions[i];
      return {
        char: ch,
        sx: pos[0],
        sy: pos[1],
        cleared: false,
        pop: 0,
      };
    });

    return {
      phase: "ready",
      levelIndex: levelIndex,
      readyLeft: CFG.readyTime,
      rocketT: 0,
      rocketBoost: 0,
      rocket: { x: CFG.rocketStart.x, y: CFG.rocketStart.y },
      enemy: {
        x: CFG.enemyStart.x,
        y: CFG.enemyStart.y,
        drawX: CFG.enemyStart.x,
        drawY: CFG.enemyStart.y,
        targetX: CFG.enemyStart.x,
        targetY: CFG.enemyStart.y,
        frame: 0,
        anim: 0,
      },
      keys: keys,
      currentIndex: 0,
      shake: 0,
      flash: 0,
      wrongMsgLeft: 0,
      backdropDim: 0,
      particles: [],
      backdrop: lvl.backdrop,
      sequence: lvl.sequence.slice(),
      timeLimit: lvl.timeLimit,
      timeLeft: lvl.timeLimit,
    };
  }

  function updateTimeDisplay() {
    if (!state) return;
    timeEl.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
  }

  function spawnParticles(x, y) {
    var i;
    for (i = 0; i < 10; i++) {
      state.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 140,
        vy: (Math.random() - 0.5) * 140 - 40,
        life: 0.45 + Math.random() * 0.25,
        max: 0.7,
        color: Math.random() > 0.5 ? "#81d4fa" : "#ffca28",
      });
    }
  }

  function glideEnemyTo(sx, sy) {
    state.enemy.targetX = sx;
    state.enemy.targetY = sy;
  }

  function eventToChar(e) {
    if (e.code === "Space" || e.key === " ") return " ";
    if (!e.key || e.key.length !== 1) return null;
    var ch = e.key;
    if (lang === "ru") {
      return ch.toLowerCase();
    }
    if (/^[a-zA-Z0-9]$/.test(ch)) return ch.toLowerCase();
    return null;
  }

  function submitChar(ch) {
    if (!state || state.phase !== "playing") return;
    var expected = state.sequence[state.currentIndex];
    if (ch === expected) {
      var keySlot = state.keys[state.currentIndex];
      keySlot.cleared = true;
      keySlot.pop = 0.35;
      state.currentIndex += 1;
      playSound("pop");
      flashVirtualKey(ch, true);
      glideEnemyTo(keySlot.sx, keySlot.sy);
      var c = scratchToCanvas(keySlot.sx, keySlot.sy);
      spawnParticles(c.x, c.y);
      state.flash = 0.12;
      progressEl.textContent = String(state.currentIndex);
      updateVirtualKeyboard();

      if (state.currentIndex >= state.sequence.length) {
        playSound("cheer");
        beginLevelTransition(calcStars(state.timeLeft, state.timeLimit));
      }
    } else {
      playSound("pluck");
      flashVirtualKey(ch, false);
      state.shake = 0.25;
      state.wrongMsgLeft = 0.5;
      wrongMsg.hidden = false;
      state.rocketBoost = Math.min(0.18, state.rocketBoost + CFG.wrongKeyRocketBoost);
    }
  }

  function handleKeyDown(e) {
    if (!state || state.phase !== "playing") return;
    var ch = eventToChar(e);
    if (ch === null) return;
    e.preventDefault();
    submitChar(ch);
  }

  function startLevel(levelIndex) {
    state = createLevelState(levelIndex);
    levelEl.textContent = String(levelIndex + 1);
    progressEl.textContent = "0";
    updateTimeDisplay();
    hideOverlayMsgs();
    readyMsg.hidden = false;
    updateVirtualKeyboard();
    showScreen("game");
  }

  function startGame() {
    unlockAudio();
    runStars = [];
    startLevel(0);
  }

  function advanceLevelTransition() {
    var nextLevel = state.levelIndex + 1;
    if (state.transitionStep === "cheer") {
      if (nextLevel >= CFG.levels.length) {
        hideOverlayMsgs();
        showWinScreen();
        return;
      }
      state.transitionStep = "announce";
      state.transitionLeft = CFG.transitionAnnounce || 1;
      cheerMsg.hidden = true;
      transitionMsg.hidden = false;
      transitionMsg.textContent = "\u0423\u0440\u043e\u0432\u0435\u043d\u044c " + (nextLevel + 1) + " \u2014 \u043f\u043e\u0435\u0445\u0430\u043b\u0438!";
      return;
    }
    if (state.transitionStep === "announce") {
      state.transitionStep = "countdown";
      state.countdownNum = 3;
      transitionMsg.textContent = "3";
      state.transitionLeft = CFG.countdownStep || 1;
      return;
    }
    state.countdownNum -= 1;
    if (state.countdownNum <= 0) {
      hideOverlayMsgs();
      startLevel(nextLevel);
      return;
    }
    transitionMsg.textContent = String(state.countdownNum);
    state.transitionLeft = CFG.countdownStep || 1;
  }

  function triggerLose() {
    state.phase = "lost";
    showScreen("lose");
    state = null;
  }

  function update(dt) {
    if (!state) return;

    var i;
    var enemy = state.enemy;
    var rocket = state.rocket;

    if (state.phase === "ready") {
      state.readyLeft -= dt;
      if (state.readyLeft <= 0) {
        state.phase = "playing";
        readyMsg.hidden = true;
        updateVirtualKeyboard();
      }
    }

    if (state.phase === "playing") {
      var speedMul = 1 + state.rocketBoost;
      state.timeLeft -= dt * speedMul;
      if (state.timeLeft < 0) state.timeLeft = 0;
      state.rocketT = 1 - state.timeLeft / state.timeLimit;
      if (state.rocketT > 1) state.rocketT = 1;
      rocket.x = CFG.rocketStart.x + (CFG.rocketEnd.x - CFG.rocketStart.x) * state.rocketT;
      rocket.y = CFG.rocketStart.y + (CFG.rocketEnd.y - CFG.rocketStart.y) * state.rocketT;
      updateTimeDisplay();

      if (state.timeLeft <= 0 || rocket.x >= CFG.rocketLoseX) {
        triggerLose();
        return;
      }
    }

    if (state.phase === "levelComplete") {
      state.transitionLeft -= dt;
      if (state.transitionLeft <= 0) advanceLevelTransition();
    }

    if (state.wrongMsgLeft > 0) {
      state.wrongMsgLeft -= dt;
      if (state.wrongMsgLeft <= 0) wrongMsg.hidden = true;
    }

    enemy.anim += dt;
    if (enemy.anim >= CFG.enemyAnimInterval) {
      enemy.anim -= CFG.enemyAnimInterval;
      enemy.frame = (enemy.frame + 1) % 6;
    }

    var moveT = 1 - Math.exp(-dt * ENEMY_MOVE_SMOOTH);
    enemy.x += (enemy.targetX - enemy.x) * moveT;
    enemy.y += (enemy.targetY - enemy.y) * moveT;
    enemy.drawX = enemy.x;
    enemy.drawY = enemy.y;

    for (i = 0; i < state.keys.length; i++) {
      if (state.keys[i].pop > 0) state.keys[i].pop -= dt;
    }

    if (state.shake > 0) state.shake -= dt;
    if (state.flash > 0) state.flash -= dt;

    var dimTarget = state.phase === "levelComplete" ? (CFG.backdropDimAmount || 0.38) : 0;
    var dimT = 1 - Math.exp(-dt * 5);
    state.backdropDim += (dimTarget - state.backdropDim) * dimT;

    for (i = state.particles.length - 1; i >= 0; i--) {
      var p = state.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function drawSprite(img, sx, sy, w, h, alpha) {
    if (!img) return;
    var c = scratchToCanvas(sx, sy);
    var nw = img.naturalWidth || img.width;
    var nh = img.naturalHeight || img.height;
    var dw = w;
    var dh = h;
    if (nw > 0 && nh > 0) {
      var scale = Math.min(w / nw, h / nh);
      dw = nw * scale;
      dh = nh * scale;
    }
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.drawImage(img, c.x - dw / 2, c.y - dh / 2, dw, dh);
    ctx.restore();
  }

  function draw() {
    if (!state || !assets.ready) return;

    var w = CFG.stageWidth;
    var h = CFG.stageHeight;
    var shakeX = state.shake > 0 ? (Math.random() - 0.5) * 8 * state.shake * 4 : 0;
    var shakeY = state.shake > 0 ? (Math.random() - 0.5) * 6 * state.shake * 4 : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    var backdrop = assets.backdrops[state.backdrop];
    if (backdrop) ctx.drawImage(backdrop, 0, 0, w, h);

    if (state.backdropDim > 0.01) {
      ctx.fillStyle = "rgba(0, 0, 0, " + state.backdropDim + ")";
      ctx.fillRect(0, 0, w, h);
    }

    drawSprite(assets.rocket, state.rocket.x, state.rocket.y, ROCKET_SIZE.w, ROCKET_SIZE.h, 1);

    var i;
    if (CFG.showPath) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 7]);
      for (i = 0; i < state.keys.length - 1; i++) {
        var a = scratchToCanvas(state.keys[i].sx, state.keys[i].sy);
        var b = scratchToCanvas(state.keys[i + 1].sx, state.keys[i + 1].sy);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (i = 0; i < state.keys.length; i++) {
      var key = state.keys[i];
      if (key.cleared) continue;
      var name = keyAssetName(key.char);
      var img = assets.keys[name];
      var scale = 1 + (key.pop > 0 ? key.pop * 0.8 : 0);
      var isSpace = key.char === " ";
      var kw = (isSpace ? KEY_SPACE_SIZE.w : KEY_SIZE.w) * scale;
      var kh = (isSpace ? KEY_SPACE_SIZE.h : KEY_SIZE.h) * scale;
      drawSprite(img, key.sx, key.sy, kw, kh, 1);
      if (state.currentIndex === i && state.phase === "playing") {
        var c = scratchToCanvas(key.sx, key.sy);
        ctx.save();
        ctx.strokeStyle = "rgba(66, 165, 245, 0.95)";
        ctx.lineWidth = 3;
        ctx.shadowColor = "rgba(66, 165, 245, 0.8)";
        ctx.shadowBlur = 10;
        ctx.strokeRect(c.x - kw / 2 - 3, c.y - kh / 2 - 3, kw + 6, kh + 6);
        ctx.restore();
      }
    }

    var eImg = assets.enemy[state.enemy.frame];
    drawSprite(eImg, state.enemy.drawX, state.enemy.drawY, ENEMY_SIZE.w, ENEMY_SIZE.h, 1);

    for (i = 0; i < state.particles.length; i++) {
      var p = state.particles[i];
      var alpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 + alpha * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.flash > 0) {
      ctx.fillStyle = "rgba(129, 212, 250, " + (state.flash * 2.5) + ")";
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  function loop(ts) {
    if (!state) return;
    if (!loop.last) loop.last = ts;
    var dt = Math.min(0.05, (ts - loop.last) / 1000);
    loop.last = ts;
    update(dt);
    draw();
    if (state) rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    cancelAnimationFrame(rafId);
    loop.last = 0;
    rafId = requestAnimationFrame(loop);
  }

  document.getElementById("btn-lang-en").addEventListener("click", function () { setInputLang("en"); });
  document.getElementById("btn-lang-ru").addEventListener("click", function () { setInputLang("ru"); });

  document.getElementById("btn-start").addEventListener("click", function () {
    unlockAudio();
    startGame();
    startLoop();
  });

  document.getElementById("btn-restart-win").addEventListener("click", function () {
    clearWinConfetti();
    startGame();
    startLoop();
  });

  document.getElementById("btn-restart-lose").addEventListener("click", function () {
    startGame();
    startLoop();
  });

  window.addEventListener("keydown", handleKeyDown);

  setInputLang("ru");
  bindStageResize();
  loadAssets().catch(function (err) {
    console.error("Asset load failed", err);
  });
})();
