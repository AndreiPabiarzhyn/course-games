window.TYPING_CONFIG = {
  stageWidth: 600,
  stageHeight: 360,
  renderScale: 1.75,
  rocketStart: { x: -220, y: 138 },
  rocketEnd: { x: 245, y: 138 },
  rocketLoseX: 235,
  enemyStart: { x: -255, y: -112 },
  enemyCelebrate: { x: 0, y: -48 },
  backdropDimAmount: 0.38,
  enemyAnimInterval: 0.45,
  enemyMoveSmooth: 3.2,
  wrongKeyRocketBoost: 0.012,
  readyTime: 1.2,
  cheerDuration: 1.2,
  transitionAnnounce: 1,
  countdownStep: 1,
  rocketSize: { w: 200, h: 200 },
  enemySize: { w: 72, h: 90 },
  keySize: { w: 30, h: 34 },
  keySpaceSize: { w: 46, h: 34 },
  showPath: false,
  soundVolume: { pop: 0.85, pluck: 0.75, cheer: 0.85, win: 0.9 },
  keyPositions: [
    [-250, -35], [-185, 15], [-120, 55], [-55, 20],
    [10, -20], [75, -60], [140, -30], [205, 10], [260, -35]
  ],
  levels: [
    {
      backdrop: "level1.svg",
      timeLimit: 120,
      en: { sequence: ["r", "a", "s", " ", " ", "q", " ", " ", " "] },
      ru: { sequence: ["\u0440", "\u0430", "\u0441", " ", " ", "\u0439", " ", " ", " "] }
    },
    {
      backdrop: "level2.svg",
      timeLimit: 100,
      en: { sequence: ["w", "e", "r", " ", "t", "y", " ", "u", "i"] },
      ru: { sequence: ["\u0446", "\u0443", "\u043a", " ", "\u0435", "\u043d", " ", "\u0433", "\u0448"] }
    },
    {
      backdrop: "level3.svg",
      timeLimit: 85,
      en: { sequence: ["t", "h", "e", " ", "c", "a", "t", " ", "s"] },
      ru: { sequence: ["\u043a", "\u043e", "\u0442", " ", "\u0438", " ", "\u043c", " ", "\u044f"] }
    }
  ]
};