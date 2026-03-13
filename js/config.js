/* ============================================================
   CONFIG — Constants, data definitions
   ============================================================ */

const GRID_PRESETS = {
  small:   { cols: 10, rows: 5,  total: 50,  label: 'Small',   desc: '5×10' },
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
    snakeBody: '#9e9e9e',
    snakeHead: '#616161',
    ladderRail: '#b0bec5',
    ladderRung: '#90a4ae',
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
