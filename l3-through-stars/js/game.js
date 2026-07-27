(function () {
  "use strict";

  var CFG = window.STARS_CONFIG;
  var RENDER = CFG.renderScale || 1;
  var screens = {
    start: document.getElementById("screen-start"),
    game: document.getElementById("screen-game"),
    win: document.getElementById("screen-win"),
    lose: document.getElementById("screen-lose"),
  };
  var canvas = document.getElementById("game-canvas");
  var ctx = canvas.getContext("2d");
  var timeEl = document.getElementById("time-value");
  var winScoreEl = document.getElementById("win-score");

  canvas.width = CFG.stageWidth * RENDER;
  canvas.height = CFG.stageHeight * RENDER;

  var keys = Object.create(null);
  var state = null;
  var rafId = 0;
  var assets = { ready: false, backdrops: [], rocket: [], asteroid: [] };
  var sounds = {};
  var audioUnlocked = false;

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

  function pad3(n) {
    return n < 10 ? "00" + n : n < 100 ? "0" + n : String(n);
  }

  function scratchToCanvas(x, y) {
    return {
      x: x + CFG.stageWidth / 2,
      y: CFG.stageHeight / 2 - y,
    };
  }

  function canvasToScratch(cx, cy) {
    return {
      x: cx - CFG.stageWidth / 2,
      y: CFG.stageHeight / 2 - cy,
    };
  }

  function loadAssets() {
    var tasks = [];
    var i;
    for (i = 1; i <= CFG.backdropCount; i++) {
      (function (idx) {
        tasks.push(loadImage("assets/backdrops/" + pad3(idx) + ".png").then(function (img) {
          assets.backdrops[idx - 1] = img;
        }));
      })(i);
    }
    tasks.push(loadImage("assets/rocket-1.svg").then(function (img) { assets.rocket[0] = img; }));
    tasks.push(loadImage("assets/rocket-2.svg").then(function (img) { assets.rocket[1] = img; }));
    tasks.push(loadImage("assets/asteroid-1.svg?v=3").then(function (img) { assets.asteroid[0] = img; }));
    tasks.push(loadImage("assets/asteroid-2.svg?v=3").then(function (img) { assets.asteroid[1] = img; }));
    sounds.win = loadAudio("assets/sounds/win.wav");
    sounds.explosion = loadAudio("assets/sounds/explosion.wav");
    sounds.pew = loadAudio("assets/sounds/pew.wav");
    sounds.oops = loadAudio("assets/sounds/oops.wav");
    return Promise.all(tasks).then(function () { assets.ready = true; });
  }

  function createState() {
    return {
      phase: "playing",
      elapsed: 0,
      rocket: {
        x: CFG.rocketStart.x,
        y: CFG.rocketStart.y,
        vx: 0,
        vy: 0,
        drawX: CFG.rocketStart.x,
        drawY: CFG.rocketStart.y,
        costume: 0,
        costumePhase: 0,
      },
      asteroids: [],
      spawnTimer: 1.2,
      backdropIndex: 0,
      backdropPrev: 0,
      backdropTimer: 0,
      winFlying: false,
      finalTime: 0,
      effects: [],
      flash: null,
      shake: 0,
      exhaustTimer: 0,
      explodeTimer: 0,
    };
  }

  function spawnSparks(x, y, count, speed, colors) {
    var i;
    for (i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var spd = speed * (0.45 + Math.random() * 0.75);
      state.effects.push({
        kind: "spark",
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.35 + Math.random() * 0.35,
        size: 1.5 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function spawnMeteorBurst(x, y) {
    spawnSparks(x, y, 14, 95, ["#ffeb3b", "#ff9800", "#ff5722", "#fff59d"]);
    spawnSparks(x, y, 6, 55, ["#bcaaa4", "#8d6e63", "#ffe082"]);
  }

  function spawnCollisionExplosion(x, y) {
    spawnSparks(x, y, 28, 140, ["#fff9c4", "#ff9800", "#ff5722", "#ffeb3b", "#ffffff"]);
    spawnSparks(x, y, 10, 75, ["#90caf9", "#ef5350", "#ff7043"]);
    state.flash = { life: 0.42, max: 0.42 };
    state.shake = 0.42;
  }

  function spawnExhaustParticle(x, y) {
    state.effects.push({
      kind: "exhaust",
      x: x + (Math.random() - 0.5) * 8,
      y: y,
      vx: (Math.random() - 0.5) * 18,
      vy: -35 - Math.random() * 45,
      life: 0.22 + Math.random() * 0.18,
      size: 2 + Math.random() * 2.5,
      color: Math.random() < 0.55 ? "#ffeb3b" : "#ff9800",
    });
  }

  function updateEffects(dt) {
    var i;
    for (i = state.effects.length - 1; i >= 0; i--) {
      var p = state.effects[i];
      p.life -= dt;
      if (p.life <= 0) {
        state.effects.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "spark") {
        p.vy -= 40 * dt;
        p.vx *= 1 - 2.5 * dt;
      }
      if (p.kind === "exhaust") {
        p.size *= 1 - 1.8 * dt;
      }
    }
    if (state.flash) {
      state.flash.life -= dt;
      if (state.flash.life <= 0) state.flash = null;
    }
    if (state.shake > 0) {
      state.shake -= dt;
      if (state.shake < 0) state.shake = 0;
    }
  }

  function drawEffects() {
    var i;
    for (i = 0; i < state.effects.length; i++) {
      var p = state.effects[i];
      var alpha = clamp(p.life / 0.35, 0, 1);
      var pt = scratchToCanvas(p.x, p.y);
      ctx.globalAlpha = alpha * (p.kind === "exhaust" ? 0.75 : 0.95);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFlashOverlay() {
    if (!state.flash) return;
    var t = state.flash.life / state.flash.max;
    ctx.fillStyle = "rgba(255, 180, 80, " + (t * 0.45) + ")";
    ctx.fillRect(0, 0, CFG.stageWidth, CFG.stageHeight);
    ctx.fillStyle = "rgba(255, 255, 255, " + (t * 0.18) + ")";
    ctx.fillRect(0, 0, CFG.stageWidth, CFG.stageHeight);
  }

  function drawInvulnShield(rocket) {
    if (state.elapsed >= CFG.invulnTime || state.phase !== "playing") return;
    var remain = CFG.invulnTime - state.elapsed;
    var pulse = 0.55 + 0.45 * Math.sin(state.elapsed * 14);
    var p = scratchToCanvas(rocket.drawX, rocket.drawY);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = clamp(remain / 0.4, 0.25, 0.7) * pulse;
    ctx.strokeStyle = "#64b5f6";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 52, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha *= 0.35;
    ctx.fillStyle = "#42a5f5";
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawRocketExhaust(rocket, dt) {
    if (state.phase !== "playing" && !state.winFlying) return;
    var moving = Math.abs(rocket.vx) > 15 || Math.abs(rocket.vy) > 15 ||
      keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight;
    if (!moving && !state.winFlying) return;

    state.exhaustTimer -= dt;
    if (state.exhaustTimer > 0) return;
    state.exhaustTimer = state.winFlying ? 0.025 : 0.04;
    var backY = rocket.drawY - 42;
    spawnExhaustParticle(rocket.drawX, backY);
    if (state.winFlying) spawnExhaustParticle(rocket.drawX, backY);
  }

  function randomSpawnWait() {
    return CFG.asteroidSpawnWaitMin +
      Math.random() * (CFG.asteroidSpawnWaitMax - CFG.asteroidSpawnWaitMin);
  }

  function spawnAsteroid() {
    var x = CFG.asteroidSpawnXMin +
      Math.random() * (CFG.asteroidSpawnXMax - CFG.asteroidSpawnXMin);
    state.asteroids.push({
      x: x,
      y: CFG.asteroidSpawnY,
      drawY: CFG.asteroidSpawnY,
      rot: (Math.random() - 0.5) * 0.35,
      costume: Math.random() < 0.5 ? 0 : 1,
    });
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function ellipseOverlap(x1, y1, rx1, ry1, x2, y2, rx2, ry2) {
    var dx = x1 - x2;
    var dy = y1 - y2;
    var nx = dx / (rx1 + rx2);
    var ny = dy / (ry1 + ry2);
    return nx * nx + ny * ny < 1;
  }

  function pointInEllipse(px, py, cx, cy, rx, ry) {
    var nx = (px - cx) / rx;
    var ny = (py - cy) / ry;
    return nx * nx + ny * ny <= 1;
  }

  function rocketHitsAsteroid(rocket, ast) {
    var rh = CFG.rocketHitbox;
    var ah = CFG.asteroidHitbox;
    var rocketOy = rh.oy || 0;
    var astOy = ah.oy || 0;
    return ellipseOverlap(
      rocket.drawX, rocket.drawY + rocketOy, rh.rx, rh.ry,
      ast.x, ast.drawY + astOy, ah.rx, ah.ry
    );
  }

  function drawBackdropFrame(index, alpha) {
    var bd = assets.backdrops[index];
    if (!bd || alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(bd, 0, 0, CFG.stageWidth, CFG.stageHeight);
    ctx.globalAlpha = 1;
  }

  function drawBackdrop(dt) {
    var frameDur = 1 / CFG.backdropFps;
    state.backdropTimer += dt;

    while (state.backdropTimer >= frameDur) {
      state.backdropTimer -= frameDur;
      state.backdropPrev = state.backdropIndex;
      state.backdropIndex = (state.backdropIndex + 1) % CFG.backdropCount;
    }

    var blend = clamp(state.backdropTimer / frameDur, 0, 1);
    drawBackdropFrame(state.backdropPrev, 1);
    if (blend > 0.02) {
      drawBackdropFrame(state.backdropIndex, blend);
    }
  }

  function drawVignette() {
    var g = ctx.createRadialGradient(
      CFG.stageWidth * 0.5, CFG.stageHeight * 0.5, CFG.stageHeight * 0.2,
      CFG.stageWidth * 0.5, CFG.stageHeight * 0.5, CFG.stageHeight * 0.78
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(4,8,24,0.28)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CFG.stageWidth, CFG.stageHeight);
  }

  function drawSprite(img, scratchX, scratchY, scale, rotation) {
    if (!img) return;
    var p = scratchToCanvas(scratchX, scratchY);
    var w = img.width * scale;
    var h = img.height * scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (rotation) ctx.rotate(rotation);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function drawMeteor(img, scratchX, scratchY, scale, rotation) {
    if (!img) return;
    var p = scratchToCanvas(scratchX, scratchY);
    var w = img.width * scale;
    var h = img.height * scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (rotation) ctx.rotate(rotation);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(2, h * 0.18, w * 0.3, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function updateRocket(dt) {
    var r = state.rocket;
    var targetVx = 0;
    var targetVy = 0;

    if (keys.ArrowRight) targetVx += CFG.rocketSpeed;
    if (keys.ArrowLeft) targetVx -= CFG.rocketSpeed;
    if (keys.ArrowUp) targetVy += CFG.rocketSpeed;
    if (keys.ArrowDown) targetVy -= CFG.rocketSpeed;

    var accel = 1 - Math.exp(-CFG.rocketAccel * dt);
    r.vx += (targetVx - r.vx) * accel;
    r.vy += (targetVy - r.vy) * accel;

    if (!keys.ArrowLeft && !keys.ArrowRight && Math.abs(r.vx) < 8) r.vx = 0;
    if (!keys.ArrowUp && !keys.ArrowDown && Math.abs(r.vy) < 8) r.vy = 0;

    r.x = clamp(r.x + r.vx * dt, CFG.rocketBounds.xMin, CFG.rocketBounds.xMax);
    r.y = clamp(r.y + r.vy * dt, CFG.rocketBounds.yMin, CFG.rocketBounds.yMax);

    var smooth = 1 - Math.exp(-18 * dt);
    r.drawX += (r.x - r.drawX) * smooth;
    r.drawY += (r.y - r.drawY) * smooth;

    r.costumePhase += dt * CFG.costumeFps;
    if (r.costumePhase >= 1) {
      r.costumePhase -= 1;
      r.costume = 1 - r.costume;
    }
  }

  function updateAsteroids(dt) {
    var i;
    for (i = state.asteroids.length - 1; i >= 0; i--) {
      var ast = state.asteroids[i];
      ast.y -= CFG.asteroidFallSpeed * dt;
      ast.drawY += (ast.y - ast.drawY) * (1 - Math.exp(-22 * dt));
      if (ast.y < CFG.asteroidDespawnY) {
        state.asteroids.splice(i, 1);
      }
    }
  }

  function drawFrame(dt) {
    if (!assets.ready || !state) return;

    dt = Math.min(dt, 0.033);

    state.elapsed += dt;
    var seconds = state.elapsed;
    timeEl.textContent = String(Math.min(CFG.winTime, Math.round(seconds)));

    ctx.setTransform(RENDER, 0, 0, RENDER, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, CFG.stageWidth, CFG.stageHeight);

    if (state.shake > 0) {
      var shakeAmt = state.shake * 18;
      ctx.translate(
        (Math.random() - 0.5) * shakeAmt,
        (Math.random() - 0.5) * shakeAmt
      );
    }

    drawBackdrop(dt);

    if (state.phase === "playing" && !state.winFlying) {
      updateRocket(dt);
      drawRocketExhaust(state.rocket, dt);

      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnAsteroid();
        state.spawnTimer = randomSpawnWait();
      }

      updateAsteroids(dt);

      if (state.elapsed >= CFG.invulnTime) {
        var i;
        for (i = 0; i < state.asteroids.length; i++) {
          if (rocketHitsAsteroid(state.rocket, state.asteroids[i])) {
            loseGame();
            break;
          }
        }
      }

      if (seconds >= CFG.winTime) {
        startWinSequence();
      }
    }

    if (state.winFlying) {
      state.rocket.y += CFG.rocketWinFlySpeed * dt;
      state.rocket.drawY += (state.rocket.y - state.rocket.drawY) * (1 - Math.exp(-14 * dt));
      drawRocketExhaust(state.rocket, dt);
      if (state.rocket.y > CFG.rocketWinFlyY + 40) {
        finishWin();
        return;
      }
    }

    if (state.phase === "exploding") {
      state.explodeTimer -= dt;
      if (state.explodeTimer <= 0) {
        state.phase = "lost";
        stopLoop();
        showScreen("lose");
        return;
      }
    }

    updateEffects(dt);

    var j;
    for (j = 0; j < state.asteroids.length; j++) {
      var a = state.asteroids[j];
      drawMeteor(assets.asteroid[a.costume], a.x, a.drawY, CFG.asteroidSize, a.rot);
    }

    var rocket = state.rocket;
    if (state.phase !== "exploding") {
      drawInvulnShield(rocket);
      drawSprite(
        assets.rocket[rocket.costume],
        rocket.drawX,
        rocket.drawY,
        CFG.rocketSize,
        rocket.vx * 0.0012
      );
    }

    drawEffects();
    drawFlashOverlay();
    drawVignette();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function startWinSequence() {
    if (state.winFlying) return;
    state.winFlying = true;
    state.finalTime = Math.round(state.elapsed);
    state.rocket.costume = 1;
    state.asteroids = [];
    spawnSparks(state.rocket.drawX, state.rocket.drawY, 16, 80, ["#fff59d", "#81d4fa", "#ffffff", "#ffeb3b"]);
    playSound("win");
  }

  function finishWin() {
    stopLoop();
    winScoreEl.textContent = String(state.finalTime);
    showScreen("win");
  }

  function loseGame() {
    if (state.phase !== "playing") return;
    state.phase = "exploding";
    state.explodeTimer = CFG.loseExplosionTime || 0.65;
    state.asteroids = [];
    spawnCollisionExplosion(state.rocket.drawX, state.rocket.drawY);
    playSound("explosion");
  }

  function loop(ts) {
    if (!state || state.phase === "lost") return;
    if (!loop.lastTs) loop.lastTs = ts;
    var dt = (ts - loop.lastTs) / 1000;
    loop.lastTs = ts;
    drawFrame(dt);
    if (state.phase === "playing" || state.winFlying || state.phase === "exploding") {
      rafId = requestAnimationFrame(loop);
    }
  }

  function stopLoop() {
    cancelAnimationFrame(rafId);
    loop.lastTs = 0;
    rafId = 0;
  }

  function startGame() {
    if (!assets.ready) return;
    unlockAudio();
    stopLoop();
    state = createState();
    showScreen("game");
    loop.lastTs = 0;
    rafId = requestAnimationFrame(loop);
  }

  function onCanvasClick(ev) {
    if (!state || state.phase !== "playing" || state.winFlying) return;
    unlockAudio();
    var rect = canvas.getBoundingClientRect();
    var scaleX = CFG.stageWidth / rect.width;
    var scaleY = CFG.stageHeight / rect.height;
    var cx = (ev.clientX - rect.left) * scaleX;
    var cy = (ev.clientY - rect.top) * scaleY;
    var sc = canvasToScratch(cx, cy);
    var ch = CFG.asteroidClickHitbox;
    var clickOy = ch.oy || (CFG.asteroidHitbox.oy || 0);

    for (var i = state.asteroids.length - 1; i >= 0; i--) {
      var ast = state.asteroids[i];
      if (pointInEllipse(sc.x, sc.y, ast.x, ast.drawY + clickOy, ch.rx, ch.ry)) {
        var bx = ast.x;
        var by = ast.drawY + (CFG.asteroidHitbox.oy || 0);
        state.asteroids.splice(i, 1);
        spawnMeteorBurst(bx, by);
        playSound(Math.random() < 0.65 ? "pew" : "oops");
        break;
      }
    }
  }

  var btnStart = document.getElementById("btn-start");
  btnStart.disabled = true;
  btnStart.textContent = "Загрузка…";

  document.getElementById("btn-start").addEventListener("click", startGame);
  document.getElementById("btn-restart-win").addEventListener("click", startGame);
  document.getElementById("btn-restart-lose").addEventListener("click", startGame);

  window.addEventListener("keydown", function (e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) >= 0) {
      unlockAudio();
      keys[e.key] = true;
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", function (e) {
    if (keys[e.key]) keys[e.key] = false;
  });

  canvas.addEventListener("pointerdown", onCanvasClick);

  loadAssets().then(function () {
    btnStart.disabled = false;
    btnStart.textContent = "Играть!";
  }).catch(function () {
    console.error("Failed to load game assets");
    btnStart.textContent = "Ошибка загрузки";
  });
})();
