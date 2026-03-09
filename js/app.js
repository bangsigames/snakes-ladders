/* ============================================================
   APP — Screen management, navigation, designer & setup UI
   ============================================================ */

const App = (() => {

  let currentBoard = null; // board config selected for play

  // ============================================================
  // SCREEN MANAGEMENT
  // ============================================================

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  // ============================================================
  // HOME
  // ============================================================

  function showHome() {
    showScreen('screen-home');
    applyTheme('cartoon');
    Sounds.stopMusic();
  }

  // ============================================================
  // SAVED BOARDS
  // ============================================================

  function showBoardSelect() {
    Sounds.button();
    const boards = Storage.loadBoards();
    const list = document.getElementById('saved-boards-list');
    const empty = document.getElementById('saved-boards-empty');

    if (boards.length === 0) {
      list.style.display = 'none';
      empty.style.display = 'flex';
    } else {
      list.style.display = 'grid';
      empty.style.display = 'none';
      list.innerHTML = boards.map(b => {
        const T = THEMES[b.theme] || THEMES.cartoon;
        return `
          <div class="saved-board-card" style="border-color:transparent">
            <div class="board-card-header">
              <span class="board-card-theme-icon">${T.emoji}</span>
              <span class="board-card-name">${escHtml(b.name || 'Unnamed Board')}</span>
            </div>
            <div class="board-card-meta">
              ${b.cols}×${b.rows} · ${b.snakes.length} snakes · ${b.ladders.length} ladders
            </div>
            <div class="board-card-actions">
              <button class="btn-board-play" onclick="App.selectBoard('${b.id}')">🎮 Play</button>
              <button class="btn-board-delete" onclick="App.deleteBoard('${b.id}')">🗑</button>
            </div>
          </div>`;
      }).join('');
    }

    showScreen('screen-saved-boards');
  }

  function selectBoard(id) {
    const boards = Storage.loadBoards();
    const board = boards.find(b => b.id === id);
    if (!board) return;
    Sounds.button();
    currentBoard = board;
    applyTheme(board.theme);
    showPlayerSetup();
  }

  function deleteBoard(id) {
    if (!confirm('Delete this board?')) return;
    Storage.deleteBoard(id);
    showBoardSelect();
  }

  // ============================================================
  // BOARD DESIGNER
  // ============================================================

  let designerStep = 1;

  function showDesigner(existingBoard) {
    Sounds.button();
    designerStep = 1;
    updateDesignerStep(1);
    showScreen('screen-designer');
  }

  function updateDesignerStep(step) {
    designerStep = step;
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`designer-step-${i}`);
      if (el) el.classList.toggle('hidden', i !== step);
    }
    document.querySelectorAll('.step-dot').forEach((d, i) => {
      d.classList.toggle('active', i + 1 === step);
      d.classList.toggle('done', i + 1 < step);
    });
    if (step === 3) {
      goToStep3();
    } else if (step === 4) {
      goToStep4();
    }
  }

  function goToStep3() {
    const canvas = document.getElementById('designer-canvas');
    Board.designer.init(canvas);
    Board.designer.setPreset(getSelectedPreset());
    Board.designer.setTheme(getSelectedTheme());
    updateDesignerUI();
    updatePlacementHint('Click "Add Snake" or "Add Ladder" then click squares on the board');
  }

  function goToStep4() {
    const config = Board.designer.getBoardConfig();
    document.getElementById('board-summary').innerHTML = `
      <div class="summary-item"><div class="summary-value">${config.cols}×${config.rows}</div><div class="summary-label">Grid</div></div>
      <div class="summary-item"><div class="summary-value">${config.snakes.length}</div><div class="summary-label">Snakes 🐍</div></div>
      <div class="summary-item"><div class="summary-value">${config.ladders.length}</div><div class="summary-label">Ladders 🪜</div></div>
      <div class="summary-item"><div class="summary-value">${THEMES[config.theme]?.emoji || '🎨'}</div><div class="summary-label">Theme</div></div>
    `;
    const nameInput = document.getElementById('board-name-input');
    if (nameInput && !nameInput.value) nameInput.value = generateBoardName();
  }

  function generateBoardName() {
    const adjectives = ['Super','Wild','Crazy','Epic','Mega','Rainbow'];
    const nouns = ['Snake Mountain','Ladder Land','Jungle Jam','Space Race','Adventure'];
    return adjectives[randomInt(0, adjectives.length-1)] + ' ' + nouns[randomInt(0, nouns.length-1)];
  }

  function getSelectedPreset() {
    const el = document.querySelector('.size-card.selected');
    return el ? el.dataset.size : 'classic';
  }

  function getSelectedTheme() {
    const el = document.querySelector('.theme-card.selected');
    return el ? el.dataset.theme : 'cartoon';
  }

  function saveBoard() {
    const config = Board.designer.getBoardConfig();
    const name = document.getElementById('board-name-input').value.trim() || generateBoardName();

    if (config.snakes.length === 0 && config.ladders.length === 0) {
      showToast('Add at least one snake and one ladder!');
      return null;
    }

    const board = {
      ...config,
      id: Storage.generateId(),
      name,
      createdAt: Date.now(),
    };
    Storage.saveBoard(board);
    showToast(`"${name}" saved! 🎉`);
    return board;
  }

  // ============================================================
  // PLAYER SETUP
  // ============================================================

  let playerCount = 2;
  let playerSetups = [];

  function getThemeCharacters() {
    const theme = currentBoard ? (currentBoard.theme || 'cartoon') : 'cartoon';
    return THEME_CHARACTERS[theme] || THEME_CHARACTERS.cartoon;
  }

  // Sync any names the user typed in the DOM back into playerSetups before re-rendering
  function syncNamesFromDOM() {
    for (let i = 0; i < playerSetups.length; i++) {
      const inp = document.getElementById(`pname-${i}`);
      if (inp && !playerSetups[i].isBot) {
        playerSetups[i].name = inp.value.trim() || playerSetups[i].name;
      }
    }
  }

  function showPlayerSetup() {
    playerCount = 2;
    playerSetups = [];
    renderPlayerCountBtns();
    renderPlayerCards();
    showScreen('screen-player-setup');
    applyTheme(currentBoard?.theme || 'cartoon');
  }

  function renderPlayerCountBtns() {
    const container = document.querySelector('.player-count-btns');
    if (!container) return;
    container.innerHTML = [1, 2, 3, 4].map(n => `
      <button class="pcount-btn ${n === playerCount ? 'active' : ''}" data-count="${n}">${n}</button>
    `).join('');
    container.querySelectorAll('.pcount-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        syncNamesFromDOM(); // preserve typed names before re-render
        playerCount = parseInt(btn.dataset.count);
        Sounds.button();
        renderPlayerCountBtns();
        renderPlayerCards();
      });
    });
  }

  function renderPlayerCards() {
    const grid = document.getElementById('players-setup-grid');
    if (!grid) return;

    const themeChars = getThemeCharacters();
    const displayCount = playerCount === 1 ? 2 : playerCount;

    playerSetups = Array.from({ length: displayCount }, (_, i) => {
      const existing = playerSetups[i];
      const forceBot = (playerCount === 1 && i === 1);
      const defaultChar = themeChars[i % themeChars.length];
      return existing ? {
        ...existing,
        isBot: forceBot ? true : (existing.isBot || false),
        sound: existing.sound || defaultChar.sound,
      } : {
        name: i === 0 ? `Player 1` : forceBot ? `Bot 1` : `Player ${i + 1}`,
        character: defaultChar.emoji,
        color: PLAYER_COLORS[i],
        sound: defaultChar.sound,
        isBot: forceBot || (i > 0 && playerCount === 1),
      };
    });

    grid.innerHTML = playerSetups.map((p, i) => {
      const isPlayer1 = i === 0;
      const forceBot = (playerCount === 1 && i === 1);
      const isBot = p.isBot;

      return `
      <div class="player-card" style="--player-color: ${PLAYER_COLORS[i]}; animation-delay: ${i * 0.1}s">
        <div class="player-card-header">
          <div class="player-num-badge" style="background:${PLAYER_COLORS[i]}">${i + 1}</div>
          <div class="player-card-title">Player ${i + 1}</div>
          ${!isPlayer1 ? `
            <button class="bot-toggle ${isBot ? 'is-bot' : ''}" id="bot-toggle-${i}"
                    onclick="App.toggleBot(${i})" ${forceBot ? 'disabled' : ''}>
              ${isBot ? '🤖 CPU' : '👤 Human'}
            </button>
          ` : '<span class="bot-toggle-placeholder">👤 Human</span>'}
        </div>
        <input type="text" class="player-name-input ${isBot ? 'input-disabled' : ''}"
               id="pname-${i}"
               value="${escHtml(isBot ? (p.name.startsWith('Bot') ? p.name : `Bot ${i}`) : p.name)}"
               maxlength="15" placeholder="Enter name"
               ${isBot ? 'disabled' : ''}>

        <div class="setup-section-label">Character</div>
        <div class="char-picker">
          ${themeChars.map(c => `
            <button class="char-btn ${p.character === c.emoji ? 'selected' : ''}"
                    onclick="App.selectChar(${i}, '${c.emoji}', '${c.sound}')"
                    title="${c.name}">${c.emoji}</button>
          `).join('')}
        </div>

        <div class="setup-section-label">Colour</div>
        <div class="color-picker">
          ${PLAYER_COLORS.map(col => `
            <button class="color-btn ${p.color === col ? 'selected' : ''}"
                    style="background:${col}"
                    onclick="App.selectColor(${i}, '${col}')"></button>
          `).join('')}
          ${['#FF6B9D','#C96BFF','#6BBAFF','#FF9A3C'].map(col => `
            <button class="color-btn ${p.color === col ? 'selected' : ''}"
                    style="background:${col}"
                    onclick="App.selectColor(${i}, '${col}')"></button>
          `).join('')}
        </div>
      </div>
    `;
    }).join('');

    // Sync count button active state
    document.querySelectorAll('.pcount-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.count) === playerCount);
    });
  }

  function toggleBot(playerIndex) {
    if (!playerSetups[playerIndex]) return;
    if (playerCount === 1 && playerIndex === 1) return; // forced bot
    syncNamesFromDOM(); // preserve names before re-render
    Sounds.button();
    playerSetups[playerIndex].isBot = !playerSetups[playerIndex].isBot;
    if (playerSetups[playerIndex].isBot) {
      playerSetups[playerIndex].name = `Bot ${playerIndex}`;
    } else {
      playerSetups[playerIndex].name = `Player ${playerIndex + 1}`;
    }
    renderPlayerCards();
  }

  function selectChar(playerIndex, emoji, sound) {
    playerSetups[playerIndex].character = emoji;
    if (sound) playerSetups[playerIndex].sound = sound;
    // Play the character's sound as a preview
    const theme = currentBoard ? (currentBoard.theme || 'cartoon') : 'cartoon';
    if (sound) Sounds.playThemedSound(theme, sound);
    const card = document.querySelectorAll('#players-setup-grid .player-card')[playerIndex];
    if (card) {
      card.querySelectorAll('.char-btn').forEach(b => {
        b.classList.toggle('selected', b.textContent.trim() === emoji);
      });
    }
  }

  function selectColor(playerIndex, color) {
    Sounds.button();
    playerSetups[playerIndex].color = color;
    const card = document.querySelectorAll('#players-setup-grid .player-card')[playerIndex];
    if (card) {
      card.querySelectorAll('.color-btn').forEach(b => {
        b.classList.toggle('selected', b.style.background === color || b.style.backgroundColor === color);
      });
    }
  }

  function startGame() {
    if (!currentBoard) {
      showToast('No board selected!');
      return;
    }
    Sounds.button();
    syncNamesFromDOM(); // capture any final edits

    const displayCount = playerCount === 1 ? 2 : playerCount;

    // Collect player data
    const players = playerSetups.slice(0, displayCount).map((p, i) => {
      const nameInput = document.getElementById(`pname-${i}`);
      const rawName = (nameInput ? nameInput.value.trim() : '') || (p.isBot ? `Bot ${i}` : `Player ${i+1}`);
      return {
        name: rawName,
        character: p.character,
        color: p.color,
        sound: p.sound,
        isBot: p.isBot || false,
      };
    });

    applyTheme(currentBoard.theme);
    showScreen('screen-game');

    // Update theme background art
    updateThemeBgArt(currentBoard.theme);

    setTimeout(() => {
      Game.init(currentBoard, players);
    }, 100);
  }

  function updateThemeBgArt(theme) {
    const el = document.getElementById('theme-bg-art');
    if (!el) return;
    el.className = 'theme-bg-art theme-bg-' + theme;
  }

  // ============================================================
  // MUSIC MUTE BUTTON
  // ============================================================

  let lastTheme = 'cartoon';

  function toggleMusicMute() {
    const muted = Sounds.toggleMusic();
    const btn = document.getElementById('btn-music-toggle');
    if (btn) btn.textContent = muted ? '🔇' : '🔊';
    if (!muted && currentBoard) {
      Sounds.startMusic(currentBoard.theme || 'cartoon');
    }
  }

  // ============================================================
  // WINNER SCREEN
  // ============================================================

  function showWinner(gameState) {
    const winner = gameState.winner;
    const players = gameState.players;

    // Sort by finish turn
    const sorted = [...players].sort((a, b) => {
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      if (a.finished && b.finished) return a.finishTurn - b.finishTurn;
      return b.position - a.position;
    });

    document.getElementById('winner-avatar').textContent = winner.character;
    document.getElementById('winner-name').textContent = winner.name;

    document.getElementById('winner-stats').innerHTML = `
      <div class="stat-box"><div class="stat-value">${winner.turns}</div><div class="stat-label">Turns</div></div>
      <div class="stat-box"><div class="stat-value">${winner.laddersClimbed}</div><div class="stat-label">Ladders 🪜</div></div>
      <div class="stat-box"><div class="stat-value">${winner.snakeBites}</div><div class="stat-label">Snake Bites 🐍</div></div>
    `;

    const medals = ['🥇','🥈','🥉','4️⃣'];
    document.getElementById('final-scoreboard').innerHTML = sorted.map((p, i) => `
      <div class="score-row">
        <div class="score-rank ${i===0?'gold':''}">${medals[i]||i+1}</div>
        <div class="score-avatar">${p.character}</div>
        <div class="score-name">${escHtml(p.name)}${p.isBot ? ' 🤖' : ''}</div>
        <div class="score-moves">${p.turns} turns</div>
      </div>
    `).join('');

    showScreen('screen-winner');
    Particles.start(document.getElementById('confetti-canvas'));
  }

  // ============================================================
  // SCORES
  // ============================================================

  function showScores() {
    Sounds.button();
    const scores = Storage.loadScores();
    const list = document.getElementById('scores-list');
    const medals = ['🥇','🥈','🥉'];

    if (scores.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:white;padding:40px;font-size:1.2rem;font-weight:700;opacity:0.8">No scores yet! Play a game first 🎮</div>';
    } else {
      list.innerHTML = scores.map((s, i) => `
        <div class="score-entry">
          <div class="score-entry-rank">${medals[i] || (i+1)}</div>
          <div class="score-entry-avatar">${s.character || '🎮'}</div>
          <div class="score-entry-info">
            <div class="score-entry-name">${escHtml(s.playerName)}</div>
            <div class="score-entry-meta">${s.boardName || 'Unknown Board'} · ${new Date(s.date).toLocaleDateString()}</div>
          </div>
          <div class="score-entry-turns">${s.turns}<span style="font-size:0.7rem;opacity:0.7"> turns</span></div>
        </div>
      `).join('');
    }

    showScreen('screen-scores');
  }

  // ============================================================
  // THEME
  // ============================================================

  function applyTheme(theme) {
    const T = THEMES[theme] || THEMES.cartoon;
    document.body.className = T.bodyClass;
  }

  // ============================================================
  // INIT — Wire up all event listeners
  // ============================================================

  function init() {
    // Home buttons
    document.getElementById('btn-home-play').addEventListener('click', () => showBoardSelect());
    document.getElementById('btn-home-design').addEventListener('click', () => showDesigner());
    document.getElementById('btn-home-scores').addEventListener('click', () => showScores());

    // Saved boards
    document.getElementById('btn-saved-back').addEventListener('click', () => { showHome(); });
    document.getElementById('btn-go-design').addEventListener('click', () => showDesigner());

    // Board designer navigation
    document.getElementById('btn-designer-back').addEventListener('click', () => {
      if (designerStep === 1) showHome();
      else updateDesignerStep(designerStep - 1);
    });
    document.getElementById('btn-step1-next').addEventListener('click', () => { Sounds.button(); updateDesignerStep(2); });
    document.getElementById('btn-step2-back').addEventListener('click', () => updateDesignerStep(1));
    document.getElementById('btn-step2-next').addEventListener('click', () => { Sounds.button(); updateDesignerStep(3); });
    document.getElementById('btn-step3-back').addEventListener('click', () => updateDesignerStep(2));
    document.getElementById('btn-step3-next').addEventListener('click', () => {
      const config = Board.designer.getBoardConfig();
      if (config.snakes.length === 0 || config.ladders.length === 0) {
        showToast('Add at least one snake and one ladder!');
        return;
      }
      Sounds.button();
      updateDesignerStep(4);
    });
    document.getElementById('btn-step4-back').addEventListener('click', () => updateDesignerStep(3));

    document.getElementById('btn-save-board').addEventListener('click', () => {
      Sounds.button();
      saveBoard();
    });
    document.getElementById('btn-play-now').addEventListener('click', () => {
      Sounds.button();
      const board = saveBoard() || Board.designer.getBoardConfig();
      if (!board) return;
      currentBoard = board;
      if (!currentBoard.id) currentBoard.id = Storage.generateId();
      applyTheme(currentBoard.theme);
      showPlayerSetup();
    });

    // Grid size picker
    document.querySelectorAll('.size-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.size-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        Sounds.button();
      });
    });

    // Theme picker
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        applyTheme(card.dataset.theme);
        Sounds.button();
      });
    });

    // Designer step 3 controls
    document.getElementById('snake-inc').addEventListener('click', () => {
      Board.designer.targetSnakeCount = Math.min(25, Board.designer.targetSnakeCount + 1);
      document.getElementById('snake-count').textContent = Board.designer.targetSnakeCount;
    });
    document.getElementById('snake-dec').addEventListener('click', () => {
      Board.designer.targetSnakeCount = Math.max(1, Board.designer.targetSnakeCount - 1);
      document.getElementById('snake-count').textContent = Board.designer.targetSnakeCount;
    });
    document.getElementById('ladder-inc').addEventListener('click', () => {
      Board.designer.targetLadderCount = Math.min(25, Board.designer.targetLadderCount + 1);
      document.getElementById('ladder-count').textContent = Board.designer.targetLadderCount;
    });
    document.getElementById('ladder-dec').addEventListener('click', () => {
      Board.designer.targetLadderCount = Math.max(1, Board.designer.targetLadderCount - 1);
      document.getElementById('ladder-count').textContent = Board.designer.targetLadderCount;
    });

    document.getElementById('btn-add-snake').addEventListener('click', () => {
      Sounds.button();
      Board.designer.setMode('snake-head');
      updatePlacementHint('Click the HEAD square (top of snake — higher number)');
      document.getElementById('btn-add-snake').classList.add('active-place');
      document.getElementById('btn-add-ladder').classList.remove('active-place');
    });

    document.getElementById('btn-add-ladder').addEventListener('click', () => {
      Sounds.button();
      Board.designer.setMode('ladder-bottom');
      updatePlacementHint('Click the BOTTOM square of the ladder (lower number)');
      document.getElementById('btn-add-ladder').classList.add('active-place');
      document.getElementById('btn-add-snake').classList.remove('active-place');
    });

    document.getElementById('btn-randomize').addEventListener('click', () => {
      Sounds.button();
      Board.designer.autoPlace();
    });

    // Player setup
    document.getElementById('btn-setup-back').addEventListener('click', () => showBoardSelect());
    // Player count buttons are rendered dynamically in renderPlayerCountBtns()
    document.getElementById('btn-lets-play').addEventListener('click', () => startGame());

    // Game screen
    document.getElementById('btn-roll').addEventListener('click', () => {
      Sounds.button();
      Game.rollDice();
    });

    document.getElementById('btn-game-menu').addEventListener('click', () => {
      document.getElementById('game-menu-overlay').classList.remove('hidden');
    });

    // Music mute button
    const musicBtn = document.getElementById('btn-music-toggle');
    if (musicBtn) {
      musicBtn.addEventListener('click', () => toggleMusicMute());
    }

    document.getElementById('btn-resume').addEventListener('click', () => {
      document.getElementById('game-menu-overlay').classList.add('hidden');
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      document.getElementById('game-menu-overlay').classList.add('hidden');
      Game.cleanup();
      showPlayerSetup();
    });
    document.getElementById('btn-quit').addEventListener('click', () => {
      document.getElementById('game-menu-overlay').classList.add('hidden');
      Game.cleanup();
      Particles.stop();
      showHome();
    });

    // Winner screen
    document.getElementById('btn-play-again').addEventListener('click', () => {
      Particles.stop();
      Game.cleanup();
      showPlayerSetup();
    });
    document.getElementById('btn-home-from-win').addEventListener('click', () => {
      Particles.stop();
      Game.cleanup();
      showHome();
    });

    // Scores
    document.getElementById('btn-scores-back').addEventListener('click', () => showHome());
    document.getElementById('btn-clear-scores').addEventListener('click', () => {
      Storage.clearScores();
      showScores();
    });

    // Init default saved boards with a demo board
    if (Storage.loadBoards().length === 0) {
      createDemoBoards();
    }

    // Create one demo board for first run
    function createDemoBoards() {
      const demo = {
        id: Storage.generateId(),
        name: 'Classic Adventure',
        preset: 'classic', cols: 10, rows: 10, total: 100,
        theme: 'cartoon',
        snakes: [
          {head:99,tail:41},{head:87,tail:24},{head:54,tail:34},
          {head:62,tail:19},{head:17,tail:7},{head:46,tail:25},
        ],
        ladders: [
          {bottom:4,top:14},{bottom:9,top:31},{bottom:20,top:38},
          {bottom:28,top:84},{bottom:40,top:59},{bottom:51,top:67},
          {bottom:63,top:81},{bottom:71,top:91},
        ],
        createdAt: Date.now(),
      };
      demo.ladders = demo.ladders.map(l => ({ bottom: l.bottom, top: l.top || l.tail }));
      Storage.saveBoard(demo);
    }

    // Show home
    showHome();
  }

  return {
    init, showHome, showBoardSelect, showDesigner,
    showPlayerSetup, showWinner, showScores,
    selectBoard, deleteBoard,
    selectChar, selectColor,
    toggleBot, toggleMusicMute,
  };
})();

// ---- updateDesignerUI (called from board.js) ----
function updateDesignerUI() {
  const config = Board.designer.getBoardConfig();
  const snakes = config.snakes;
  const ladders = config.ladders;

  document.getElementById('snake-count-badge').textContent = snakes.length;
  document.getElementById('ladder-count-badge').textContent = ladders.length;

  const list = document.getElementById('placements-list');
  if (!list) return;

  const snakeItems = snakes.map((s, i) => `
    <div class="placement-item">
      <span class="pi-icon">🐍</span>
      <span class="pi-label">${s.head} → ${s.tail}</span>
      <button class="btn-remove-placement" onclick="Board.designer.removeSnake(${i})">✕</button>
    </div>
  `);
  const ladderItems = ladders.map((l, i) => `
    <div class="placement-item">
      <span class="pi-icon">🪜</span>
      <span class="pi-label">${l.bottom} → ${l.top}</span>
      <button class="btn-remove-placement" onclick="Board.designer.removeLadder(${i})">✕</button>
    </div>
  `);

  list.innerHTML = [...snakeItems, ...ladderItems].join('');

  // Update active-place button state
  const mode = Board.designer.mode;
  document.getElementById('btn-add-snake').classList.toggle('active-place',
    mode === 'snake-head' || mode === 'snake-tail');
  document.getElementById('btn-add-ladder').classList.toggle('active-place',
    mode === 'ladder-bottom' || mode === 'ladder-top');
}

// ---- showToast ----
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ---- escHtml ----
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => App.init());
