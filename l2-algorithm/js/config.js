const COMMANDS = {
  forward:  { id: "forward",  label: "\u0412\u043f\u0435\u0440\u0451\u0434",   icon: "\u25b6",  class: "cmd-block--forward" },
  forward2: { id: "forward2", label: "\u0412\u043f\u0435\u0440\u0451\u0434 x2", icon: "\u25b6\u25b6", class: "cmd-block--forward2" },
  right:    { id: "right",    label: "\u041d\u0430\u043f\u0440\u0430\u0432\u043e",  icon: "\u21b7",  class: "cmd-block--right" },
  up:       { id: "up",       label: "\u0412\u0432\u0435\u0440\u0445",    icon: "\u25b2",  class: "cmd-block--up" },
  down:     { id: "down",     label: "\u0412\u043d\u0438\u0437",     icon: "\u25bc",  class: "cmd-block--down" },
};

const PALETTE_ORDER = ["forward", "forward2", "right", "up", "down"];
const SLOT_COUNT = 5;
const TOTAL_LEVELS = 2;

const LEVELS = [
  { bg: "assets/bg-level1.svg", map: ["######", "#S...#", "#.#..#", "#.#..#", "#...G#", "######"] },
  { bg: "assets/bg-level2.svg", map: ["#######", "#S....#", "###.#.#", "#...#.#", "#.###.#", "#...G.#", "#######"] },
];

const DIRS = [
  { dx: 1, dy: 0, angle: 0 },
  { dx: 0, dy: 1, angle: 90 },
  { dx: -1, dy: 0, angle: 180 },
  { dx: 0, dy: -1, angle: -90 },
];