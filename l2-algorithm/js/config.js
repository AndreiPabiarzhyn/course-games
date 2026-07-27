const COMMANDS = {
  forward: { id: "forward", label: "\u0412\u043f\u0435\u0440\u0451\u0434",  icon: "assets/icon-forward.svg", class: "cmd-block--forward" },
  right:   { id: "right",   label: "\u041d\u0430\u043f\u0440\u0430\u0432\u043e", icon: "assets/icon-right.svg",   class: "cmd-block--right" },
  up:      { id: "up",      label: "\u0412\u0432\u0435\u0440\u0445",   icon: "assets/icon-up.svg",      class: "cmd-block--up" },
  down:    { id: "down",    label: "\u0412\u043d\u0438\u0437",    icon: "assets/icon-down.svg",    class: "cmd-block--down" },
};

const PALETTE_ORDER = ["forward", "right", "up", "down"];
const SLOT_COUNT = 7;
const TOTAL_LEVELS = 2;

const LEVELS = [
  {
    bg: "assets/bg-level1.svg",
    map: [
      "########",
      "#S.....#",
      "#..##..#",
      "#..##..#",
      "#...G..#",
      "########",
    ],
  },
  {
    bg: "assets/bg-level2.svg",
    map: [
      "#######",
      "#S....#",
      "#.##..#",
      "#.....#",
      "#.##..#",
      "#..G..#",
      "#######",
    ],
  },
];

const DIRS = [
  { dx: 1, dy: 0, angle: 0 },
  { dx: 0, dy: 1, angle: 90 },
  { dx: -1, dy: 0, angle: 180 },
  { dx: 0, dy: -1, angle: -90 },
];