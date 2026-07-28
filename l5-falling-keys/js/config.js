window.FALLING_KEYS_CONFIG = {
  stageWidth: 480,
  stageHeight: 360,
  renderScale: 2,
  lineY: -175,
  spawnY: 150,
  spawnXMin: -200,
  spawnXMax: 150,
  fallSpeedStart: -0.4,
  fallSpeedMin: -4,
  fallSpeedStep: -0.05,
  spawnIntervalStart: 4,
  spawnIntervalMin: 0.5,
  spawnIntervalStep: -0.1,
  gameDuration: 60,
  scratchFps: 30,
  keyDrawSize: 38,
  readyTime: 1.5,
  wrongMsgDuration: 0.9,
  smileCount: 5,
  bonusSpawnChance: 0.28,
  bonusScore: 1,
  backdropGame: "portal.svg",
  backdropMeta: {
    "portal.svg": { rcx: 370.926, rcy: 180 },
    "meadow.svg": { rcx: 240, rcy: 180 },
    "ivy.svg": { rcx: 328.5, rcy: 184 },
    "trees.svg": { rcx: 267.122, rcy: 183.181 }
  },
  backdropLose: "ivy.svg",
  soundVolume: {
    correct: 0.85, wrong: 0.8, pop: 0.7, smile: 0.5, win: 0.9,
    boing: 0.95, boom: 0.9, yay: 0.85, oops: 0.9
  }
};
