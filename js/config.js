/* ============================================================
   CONFIG — Constants, data definitions
   ============================================================ */

const GRID_PRESETS = {
  small:   { cols: 5,  rows: 5,  total: 25,  label: 'Small',   desc: '5×5' },
  medium:  { cols: 8,  rows: 8,  total: 64,  label: 'Medium',  desc: '8×8' },
  large:   { cols: 10, rows: 8,  total: 80,  label: 'Large',   desc: '8×10' },
  classic: { cols: 10, rows: 10, total: 100, label: 'Classic', desc: '10×10' },
};

const THEMES = {
  jungle: {
    label: 'Jungle',
    emoji: '🌿',
    bodyClass: 'theme-jungle',
    boardBg: ['#1b5e20','#2e7d32'],
    cellEven: '#c8e6c9',
    cellOdd: '#f1f8e9',
    tilePalette: ['#58C478', '#F9C74F', '#F4845F', '#90D4A0', '#FFBA49'],
    cellBorder: '#4caf50',
    snakeBody: '#2e7d32',
    snakeHead: '#1b5e20',
    ladderRail: '#8d6e63',
    ladderRung: '#bcaaa4',
    headerGrad: ['#1a5c2a','#2ecc71'],
    bgMusic: 'jungle',
    boardPatternColors: ['#1b5e20','#2e7d32'],  // dark green grid border
  },
  space: {
    label: 'Space',
    emoji: '🚀',
    bodyClass: 'theme-space',
    boardBg: ['#0d0020','#1a0040'],
    cellEven: '#1a1045',
    cellOdd: '#100830',
    tilePalette: ['#8B5CF6', '#3B82F6', '#06B6D4', '#7C3AED', '#2563EB'],
    cellBorder: '#4a2080',
    snakeBody: '#D46BFF',
    snakeHead: '#9B1DCC',
    ladderRail: '#7dd3fc',
    ladderRung: '#38bdf8',
    headerGrad: ['#0a0015','#4a2080'],
    bgMusic: 'space',
    boardPatternColors: ['#0d0020','#1a003a'],  // near-black deep purple grid border
  },
  ocean: {
    label: 'Ocean',
    emoji: '🌊',
    bodyClass: 'theme-ocean',
    boardBg: ['#006994','#01579b'],
    cellEven: '#80cfe9',
    cellOdd: '#b3ecf7',
    tilePalette: ['#0EA5E9', '#22D3EE', '#F87171', '#0284C7', '#6EE7B7'],
    cellBorder: '#0288d1',
    snakeBody: '#00838f',
    snakeHead: '#006064',
    ladderRail: '#f48fb1',
    ladderRung: '#f8bbd0',
    headerGrad: ['#006994','#00a8cc'],
    bgMusic: 'ocean',
    boardPatternColors: ['#01579b','#006994'],  // deep ocean blue grid border
  },
  fantasy: {
    label: 'Fantasy',
    emoji: '✨',
    bodyClass: 'theme-fantasy',
    boardBg: ['#4a0e8f','#6a1b9a'],
    cellEven: '#e1bee7',
    cellOdd: '#fce4ec',
    tilePalette: ['#A855F7', '#F59E0B', '#10B981', '#EC4899', '#6366F1'],
    cellBorder: '#ab47bc',
    snakeBody: '#7b1fa2',
    snakeHead: '#4a148c',
    ladderRail: '#ffd700',
    ladderRung: '#ffeb3b',
    headerGrad: ['#2d1b69','#6c3483'],
    bgMusic: 'fantasy',
    boardPatternColors: ['#4a0e8f','#6a1b9a'],  // deep mystical purple grid border
  },
  cartoon: {
    label: 'Cartoon',
    emoji: '🎨',
    bodyClass: 'theme-cartoon',
    boardBg: ['#FF4D6D','#7C3AED'],
    cellEven: '#fff9c4',
    cellOdd: '#ffffff',
    tilePalette: ['#EF4444', '#F59E0B', '#3B82F6', '#22C55E', '#F97316'],
    cellBorder: '#ff80ab',
    snakeBody: '#ff4757',
    snakeHead: '#c0392b',
    ladderRail: '#ff6348',
    ladderRung: '#ffa502',
    headerGrad: ['#ff6b81','#ffeaa7'],
    bgMusic: 'cartoon',
    boardPatternColors: ['#FF4D6D','#7C3AED'],  // rose-to-purple grid border
  },
};

// Generic fallback (not used in the UI; THEME_CHARACTERS is used instead)
const CHARACTERS = [
  { id: 'frog',    emoji: '🐸', name: 'Froggy' },
  { id: 'rocket',  emoji: '🚀', name: 'Rocket' },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn' },
  { id: 'robot',   emoji: '🤖', name: 'Robo' },
  { id: 'tiger',   emoji: '🐯', name: 'Tiger' },
  { id: 'dragon',  emoji: '🐲', name: 'Dragon' },
];

// Theme-specific characters — 6 per theme, sound matches the character
const THEME_CHARACTERS = {
  jungle: [
    { id: 'lion',     emoji: '🦁', name: 'Lion',     sound: 'lion' },
    { id: 'elephant', emoji: '🐘', name: 'Elephant', sound: 'elephant' },
    { id: 'monkey',   emoji: '🐒', name: 'Monkey',   sound: 'monkey' },
    { id: 'parrot',   emoji: '🦜', name: 'Parrot',   sound: 'parrot' },
    { id: 'frog',     emoji: '🐸', name: 'Frog',     sound: 'frog_j' },
    { id: 'croc',     emoji: '🐊', name: 'Croc',     sound: 'croc' },
  ],
  space: [
    { id: 'rocket',    emoji: '🚀', name: 'Rocket',    sound: 'rocket_s' },
    { id: 'alien',     emoji: '👽', name: 'Alien',     sound: 'alien' },
    { id: 'robot',     emoji: '🤖', name: 'Robot',     sound: 'computer' },
    { id: 'ufo',       emoji: '🛸', name: 'UFO',       sound: 'warp' },
    { id: 'astronaut', emoji: '🧑‍🚀', name: 'Astronaut', sound: 'laser' },
    { id: 'planet',    emoji: '🪐', name: 'Planet',    sound: 'warp' },
  ],
  ocean: [
    { id: 'whale',   emoji: '🐋', name: 'Whale',   sound: 'whale' },
    { id: 'dolphin', emoji: '🐬', name: 'Dolphin', sound: 'dolphin' },
    { id: 'shark',   emoji: '🦈', name: 'Shark',   sound: 'sonar' },
    { id: 'octopus', emoji: '🐙', name: 'Octopus', sound: 'splash' },
    { id: 'fish',    emoji: '🐠', name: 'Fish',    sound: 'bubble' },
    { id: 'crab',    emoji: '🦀', name: 'Crab',    sound: 'splash' },
  ],
  fantasy: [
    { id: 'unicorn', emoji: '🦄', name: 'Unicorn', sound: 'magic' },
    { id: 'dragon',  emoji: '🐉', name: 'Dragon',  sound: 'dragon' },
    { id: 'fairy',   emoji: '🧚', name: 'Fairy',   sound: 'fairy' },
    { id: 'wizard',  emoji: '🧙', name: 'Wizard',  sound: 'horn' },
    { id: 'phoenix', emoji: '🦅', name: 'Phoenix', sound: 'magic' },
    { id: 'gem',     emoji: '💎', name: 'Gem',     sound: 'crystal' },
  ],
  cartoon: [
    { id: 'frog',    emoji: '🐸', name: 'Froggy',  sound: 'boing' },
    { id: 'tiger',   emoji: '🐯', name: 'Tiger',   sound: 'roar_c' },
    { id: 'panda',   emoji: '🐼', name: 'Panda',   sound: 'munch_c' },
    { id: 'fox',     emoji: '🦊', name: 'Fox',     sound: 'yip_c' },
    { id: 'penguin', emoji: '🐧', name: 'Penguin', sound: 'squeak_c' },
    { id: 'bunny',   emoji: '🐰', name: 'Bunny',   sound: 'boing' },
  ],
};

const PLAYER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#A8E6CF', // Green
];

const PLAYER_COLORS_DARK = [
  '#c0392b',
  '#16a085',
  '#f39c12',
  '#27ae60',
];

const PLAYER_SOUNDS = [
  { id: 'boop',   label: '🔵 Boop',   emoji: '🔵' },
  { id: 'pop',    label: '🟡 Pop',    emoji: '🟡' },
  { id: 'ding',   label: '🔔 Ding',   emoji: '🔔' },
  { id: 'beep',   label: '📟 Beep',   emoji: '📟' },
  { id: 'squeak', label: '🐭 Squeak', emoji: '🐭' },
  { id: 'chord',  label: '🎵 Chord',  emoji: '🎵' },
];

const THEME_SOUNDS = {
  jungle: [
    { id: 'lion',     label: '🦁 Lion',     emoji: '🦁' },
    { id: 'elephant', label: '🐘 Elephant', emoji: '🐘' },
    { id: 'monkey',   label: '🐒 Monkey',   emoji: '🐒' },
    { id: 'parrot',   label: '🦜 Parrot',   emoji: '🦜' },
    { id: 'frog_j',   label: '🐸 Frog',     emoji: '🐸' },
  ],
  space: [
    { id: 'laser',    label: '⚡ Laser',    emoji: '⚡' },
    { id: 'rocket_s', label: '🚀 Rocket',   emoji: '🚀' },
    { id: 'alien',    label: '👾 Alien',    emoji: '👾' },
    { id: 'warp',     label: '💫 Warp',     emoji: '💫' },
    { id: 'computer', label: '🤖 Robot',    emoji: '🤖' },
  ],
  ocean: [
    { id: 'whale',    label: '🐋 Whale',    emoji: '🐋' },
    { id: 'dolphin',  label: '🐬 Dolphin',  emoji: '🐬' },
    { id: 'splash',   label: '💧 Splash',   emoji: '💧' },
    { id: 'bubble',   label: '🫧 Bubble',   emoji: '🫧' },
    { id: 'sonar',    label: '🔊 Sonar',    emoji: '🔊' },
  ],
  fantasy: [
    { id: 'magic',    label: '✨ Magic',    emoji: '✨' },
    { id: 'dragon',   label: '🐉 Dragon',   emoji: '🐉' },
    { id: 'fairy',    label: '🧚 Fairy',    emoji: '🧚' },
    { id: 'horn',     label: '📯 Horn',     emoji: '📯' },
    { id: 'crystal',  label: '💎 Crystal',  emoji: '💎' },
  ],
  cartoon: [
    { id: 'boing',    label: '🎈 Boing',    emoji: '🎈' },
    { id: 'pop_c',    label: '💥 Pop',      emoji: '💥' },
    { id: 'honk',     label: '📯 Honk',     emoji: '📯' },
    { id: 'spring',   label: '🌀 Spring',   emoji: '🌀' },
    { id: 'zap',      label: '⚡ Zap',      emoji: '⚡' },
  ],
};

// ---- Built-in starter boards (always available, never deleted) ----

const DEFAULT_BOARDS = [
  {
    id:        'default-small',
    name:      'Cartoon Starter',
    preset:    'small',
    cols:      5,
    rows:      5,
    total:     25,
    theme:     'cartoon',
    isDefault: true,
    createdAt: 0,
    // 3 snakes: head > tail   |   3 ladders: bottom < top
    // 5×5 boustrophedon: row1(bottom)=1–5 L→R, row2=6–10 R→L, row3=11–15 L→R, row4=16–20 R→L, row5=21–25 L→R
    snakes:  [ { head: 17, tail: 4 }, { head: 22, tail: 9 }, { head: 13, tail: 7 } ],
    ladders: [ { bottom: 2, top: 16 }, { bottom: 8, top: 20 }, { bottom: 11, top: 23 } ],
  },
  {
    id:        'default-medium',
    name:      'Cosmic Quest',
    preset:    'medium',
    cols:      8,
    rows:      8,
    total:     64,
    theme:     'space',
    isDefault: true,
    createdAt: 0,
    // 5 snakes  |  5 ladders
    // 8×8 boustrophedon: row1=1–8 L→R, row2=9–16 R→L, row3=17–24 L→R, row4=25–32 R→L,
    //                    row5=33–40 L→R, row6=41–48 R→L, row7=49–56 L→R, row8=57–64 R→L
    snakes:  [
      { head: 16, tail:  3 },
      { head: 29, tail: 11 },
      { head: 43, tail: 23 },
      { head: 51, tail: 32 },
      { head: 57, tail: 36 },
    ],
    ladders: [
      { bottom:  4, top: 22 },
      { bottom: 13, top: 37 },
      { bottom: 26, top: 45 },
      { bottom: 39, top: 54 },
      { bottom: 48, top: 62 },
    ],
  },
  {
    id:        'default-large',
    name:      'Ocean Adventure',
    preset:    'large',
    cols:      10,
    rows:      8,
    total:     80,
    theme:     'ocean',
    isDefault: true,
    createdAt: 0,
    // 7 snakes  |  7 ladders
    // 10×8 boustrophedon: row1=1–10 L→R, row2=11–20 R→L, row3=21–30 L→R, row4=31–40 R→L,
    //                     row5=41–50 L→R, row6=51–60 R→L, row7=61–70 L→R, row8=71–80 R→L
    snakes:  [
      { head: 17, tail:  5 },
      { head: 35, tail: 13 },
      { head: 44, tail: 26 },
      { head: 55, tail: 37 },
      { head: 63, tail: 47 },
      { head: 72, tail: 58 },
      { head: 79, tail: 61 },
    ],
    ladders: [
      { bottom:  3, top: 24 },
      { bottom: 12, top: 33 },
      { bottom: 22, top: 48 },
      { bottom: 32, top: 52 },
      { bottom: 43, top: 65 },
      { bottom: 54, top: 74 },
      { bottom: 66, top: 77 },
    ],
  },
];

const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];

const DICE_DOT_PATTERNS = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

// ---- Utility functions ----

/**
 * Get cell position (top-left corner) for a given cell number on the canvas.
 * Boustrophedon layout: row 1 is bottom, alternating L-R / R-L.
 */
function getCellRect(cellNum, cols, rows, canvasW, canvasH) {
  const cellW = canvasW / cols;
  const cellH = canvasH / rows;
  const idx = cellNum - 1;
  const rowFromBottom = Math.floor(idx / cols);
  const posInRow = idx % cols;
  const col = rowFromBottom % 2 === 0 ? posInRow : (cols - 1 - posInRow);
  const row = rows - 1 - rowFromBottom;
  return {
    x: col * cellW,
    y: row * cellH,
    w: cellW,
    h: cellH,
    cx: col * cellW + cellW / 2,
    cy: row * cellH + cellH / 2,
  };
}

function getCellFromPoint(px, py, cols, rows, canvasW, canvasH) {
  const cellW = canvasW / cols;
  const cellH = canvasH / rows;
  const col = Math.floor(px / cellW);
  const row = Math.floor(py / cellH);
  if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
  const rowFromBottom = rows - 1 - row;
  const posInRow = rowFromBottom % 2 === 0 ? col : (cols - 1 - col);
  return rowFromBottom * cols + posInRow + 1;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
