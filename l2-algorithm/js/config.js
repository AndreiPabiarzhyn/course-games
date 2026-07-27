const COMMANDS = {
  up:    { id: "up",    label: "\u0412\u0432\u0435\u0440\u0445",   icon: "assets/icon-up.svg",    class: "cmd-block--up" },
  down:  { id: "down",  label: "\u0412\u043d\u0438\u0437",    icon: "assets/icon-down.svg",  class: "cmd-block--down" },
  left:  { id: "left",  label: "\u0412\u043b\u0435\u0432\u043e",   icon: "assets/icon-left.svg",  class: "cmd-block--left" },
  right: { id: "right", label: "\u0412\u043f\u0440\u0430\u0432\u043e",  icon: "assets/icon-right.svg", class: "cmd-block--right" },
};

const PALETTE_ORDER = ["up", "down", "left", "right"];
const SLOT_COUNT = 7;
const TOTAL_LEVELS = 2;

const MOVE = {
  up:    { dx: 0, dy: -1, angle: -90 },
  down:  { dx: 0, dy: 1, angle: 90 },
  left:  { dx: -1, dy: 0, angle: 180 },
  right: { dx: 1, dy: 0, angle: 0 },
};

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